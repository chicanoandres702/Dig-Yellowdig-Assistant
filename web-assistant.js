import { initializeApp } from "./firebase-app.js";
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from "./firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc } from "./firebase-firestore.js";
import { getKnowledgeBase, saveKnowledgeBase } from "./utils.js";

// --- EXTENSION BRIDGE ---
const extBridge = {
    isActive: typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage,
    send: function(action, payload = {}) {
        return new Promise((resolve) => {
            if (this.isActive) {
                chrome.runtime.sendMessage({ action, ...payload }, response => resolve(response));
            } else {
                setTimeout(() => resolve({ status: 'simulated_success', action }), 600);
            }
        });
    }
};

// Check connectivity to the background/service worker and update UI badge
async function checkExtensionBridgeStatus() {
    try {
        const el = document.getElementById('extStatus');
        if (!extBridge || !extBridge.isActive) {
            if (el) el.innerHTML = '<span class="badge badge-yd">STANDALONE</span>';
            return;
        }
        const resp = await extBridge.send('PING');
        if (resp && resp.ok) {
            if (el) el.innerHTML = '<span class="badge badge-completed">LINKED</span>';
            log(`[BRIDGE] Connected to background (id=${resp.extensionId || 'n/a'})`, 'log-sys');
        } else {
            if (el) el.innerHTML = '<span class="badge badge-yd">NO RESPONSE</span>';
            log('[BRIDGE] No response from background', 'log-warn');
        }
    } catch (e) {
        try { const el = document.getElementById('extStatus'); if (el) el.innerHTML = '<span class="badge badge-yd">NO CONNECT</span>'; } catch (_) {}
        log('[BRIDGE] Check failed: ' + (e && e.message ? e.message : String(e)), 'log-err');
    }
}

// Run a quick check shortly after UI loads
setTimeout(() => { try { checkExtensionBridgeStatus(); } catch (e) {} }, 120);

// --- GEMINI & FIREBASE CORE ---
const apiKey = "";
// Use the smaller flash model for agent planning by default
const MODEL = "gemini-2.0-flash";
// Expose to other modules that check window.GEMINI_MODEL
if (typeof window !== 'undefined') window.GEMINI_MODEL = MODEL;

// Resolve Gemini API key from multiple fallback locations (input field, globals, localStorage)
function getGeminiApiKey() {
    try {
        if (typeof __gemini_api_key !== 'undefined' && __gemini_api_key) return __gemini_api_key;
        if (typeof window !== 'undefined' && window.__gemini_api_key) return window.__gemini_api_key;
        // Prefer the settings input if present
        if (typeof document !== 'undefined') {
            const el = document.getElementById('geminiApiKeyInput');
            if (el && el.value && el.value.trim()) return el.value.trim();
        }
        // localStorage fallbacks
        if (typeof localStorage !== 'undefined') {
            return localStorage.getItem('geminiApiKey') || localStorage.getItem('gemini_api_key') || null;
        }
    } catch (e) {
        console.warn('Error while resolving Gemini API key:', e);
    }
    return null;
}

// Resolve firebase config from multiple potential injection points.
let firebaseConfig = null;
try {
    if (typeof __firebase_config !== 'undefined' && __firebase_config) {
        firebaseConfig = JSON.parse(__firebase_config);
    } else if (typeof window !== 'undefined' && window.__firebase_config_obj) {
        firebaseConfig = window.__firebase_config_obj;
    } else {
        const stored = (typeof localStorage !== 'undefined') ? localStorage.getItem('firebase_config') : null;
        firebaseConfig = stored ? JSON.parse(stored) : null;
    }
} catch (e) {
    console.warn('Failed to parse __firebase_config or stored firebase_config:', e);
    firebaseConfig = null;
}

let app = null;
let auth = null;
let db = null;
let firebaseEnabled = false;
if (firebaseConfig && firebaseConfig.apiKey) {
    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        firebaseEnabled = true;
    } catch (e) {
        console.error('Firebase initialization failed:', e);
        app = auth = db = null;
        firebaseEnabled = false;
    }
} else {
    console.info('No Firebase configuration found; running in local/offline mode.');
    try { loadLocalKnowledgeToUI(); } catch (e) { /* ignore */ }
}

const appId = typeof __app_id !== 'undefined' ? __app_id : 'page-pilot';

let currentUser = null;
let knowledgeCache = [];
window.currentDrafts = {}; // Global Drafts Object mapped to Firestore Docs

let sessionContext = {
    classId: "ARCH-202",
    week: "Week 4",
    detectedInstructions: "Analyze Paxos vs Raft protocols.",
    detectedVitals: "Paxos ensures fault tolerance. Three phases: Prepare, Accept, Commit."
};

// --- LOGGING ---
// Buffered logger to minimize synchronous DOM writes and layout thrash (avoids UI flicker)
window._logBuffer = window._logBuffer || [];
window._logFlushScheduled = window._logFlushScheduled || false;
window.log = (msg, type = '') => {
    const timeStr = `[${new Date().toLocaleTimeString([], {hour12:false})}]`;
    const formattedMsg = `${timeStr} ${msg}`;

    // push into buffer
    window._logBuffer.push({ text: formattedMsg, type });

    if (!window._logFlushScheduled) {
        window._logFlushScheduled = true;
        requestAnimationFrame(() => {
            const mainFeed = document.getElementById('mainFeed');
            const miniFeed = document.getElementById('miniFeed');
            if (mainFeed && window._logBuffer.length) {
                const frag = document.createDocumentFragment();
                window._logBuffer.forEach(item => {
                    const entry = document.createElement('div');
                    entry.className = `log-entry ${item.type}`;
                    entry.innerText = item.text;
                    frag.appendChild(entry);
                });
                mainFeed.appendChild(frag);
                mainFeed.scrollTop = mainFeed.scrollHeight;
            }
            if (miniFeed && window._logBuffer.length) {
                if (miniFeed.innerText === 'Waiting for events...') miniFeed.innerHTML = '';
                const frag2 = document.createDocumentFragment();
                window._logBuffer.forEach(item => {
                    const miniEntry = document.createElement('div');
                    miniEntry.style.marginBottom = '4px';
                    miniEntry.style.color = item.type === 'log-yd' ? 'var(--yellowdig)' : item.type === 'log-bucket' ? 'var(--bucket-purple)' : item.type === 'log-sys' ? 'var(--accent)' : 'inherit';
                    miniEntry.innerText = item.text;
                    frag2.appendChild(miniEntry);
                });
                miniFeed.appendChild(frag2);
            }
            window._logBuffer.length = 0;
            window._logFlushScheduled = false;
        });
    }
};

// --- ANIMATED MESH ENGINE ---
const canvas = document.getElementById('meshCanvas');
const ctx = canvas.getContext('2d', { alpha: false });
let width, height, time = 0;
let mouse = { x: -1000, y: -1000 };

class Blob {
    constructor(color, radius) { this.init(); this.radius = radius; this.color = color; }
    init() { this.x = Math.random() * window.innerWidth; this.y = Math.random() * window.innerHeight; this.angle = Math.random() * Math.PI * 2; this.velocity = 0.2 + Math.random() * 0.4; }
    update() {
        this.angle += Math.sin(time * 0.001 + this.x * 0.002) * 0.02;
        this.x += Math.cos(this.angle) * this.velocity;
        this.y += Math.sin(this.angle) * this.velocity;
        const dx = this.x - mouse.x; const dy = this.y - mouse.y; const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 400) { const force = (400 - dist) / 400; this.x += (dx / dist) * force * 1.5; this.y += (dy / dist) * force * 1.5; }
        if (this.x < -this.radius) this.x = width + this.radius; if (this.x > width + this.radius) this.x = -this.radius;
        if (this.y < -this.radius) this.y = height + this.radius; if (this.y > height + this.radius) this.y = -this.radius;
    }
    draw() {
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
        gradient.addColorStop(0, this.color); gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient; ctx.globalCompositeOperation = 'screen';
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fill();
    }
}
let blobs = [];
function resize() { width = canvas.width = window.innerWidth; height = canvas.height = window.innerHeight; }
function createBlobs() {
    blobs = []; const count = width < 768 ? 4 : 6;
    const palette = ['rgba(30, 41, 59, 0.8)', 'rgba(15, 23, 42, 0.9)', 'rgba(56, 189, 248, 0.08)', 'rgba(99, 102, 241, 0.15)'];
    for (let i = 0; i < count; i++) blobs.push(new Blob(palette[i % palette.length], Math.max(width, height) * (0.6 + Math.random() * 0.3)));
}
function loop() {
    time++; ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, width, height);
    blobs.forEach(b => { b.update(); b.draw(); }); requestAnimationFrame(loop);
}

// --- AUTH & FIRESTORE SYNC LOGIC ---
const startSession = async () => {
    if (!auth) {
        log('Firebase Auth not initialized; skipping remote sign-in.', 'log-err');
        return;
    }
    try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) await signInWithCustomToken(auth, __initial_auth_token);
        else await signInAnonymously(auth);
    } catch (err) { log("Auth Error: " + err.message, "log-err"); }
};

if (auth) {
    onAuthStateChanged(auth, async (u) => {
        currentUser = u;
        if (currentUser) {
            log(`[CLOUD] Connected to session storage: ${currentUser.uid.substring(0,6)}...`, "log-sys");
            initKnowledgeSync();
            initDraftsSync();
            initIterationsSync();
            // Attempt to push any locally saved KB items to the cloud now that we have a session.
            try { await syncLocalKnowledgeToCloud(); } catch (e) { log('[KB SYNC] Background sync error: ' + (e && e.message ? e.message : String(e)), 'log-err'); }
        }
    });
} else {
    log('[CLOUD] Firebase not initialized; running in local/offline mode.', 'log-sys');
    try { loadLocalKnowledgeToUI(); } catch (e) { /* ignore */ }
}

// 1. SYNC KNOWLEDGE BASE
function initKnowledgeSync() {
    if (!currentUser) return;
    if (!db) { log('Firestore not initialized; skipping knowledge sync.', 'log-err'); return; }
    const knowledgeCol = collection(db, 'artifacts', appId, 'users', currentUser.uid, 'knowledge');
    onSnapshot(knowledgeCol, (snap) => {
        knowledgeCache = [];
        const kbUI = document.getElementById('kbHierarchy');
        const kbSelector = document.getElementById('kbContextSelector');
        
        if (snap.empty) {
            kbSelector.innerHTML = '<span style="font-size:0.55rem; color:var(--text-muted);">No buckets available.</span>';
            return;
        }
        
        let html = '';
        let selectorHtml = '';
        const buckets = {};
        snap.forEach(d => {
            const data = d.data(); knowledgeCache.push(data);
            if (!buckets[data.classId]) buckets[data.classId] = {};
            if (!buckets[data.classId][data.week]) buckets[data.classId][data.week] = [];
            buckets[data.classId][data.week].push(data);
        });
        
        for (const classId in buckets) {
            html += `<span class="section-header">${classId} Bucket</span>`;
            for (const week in buckets[classId]) {
                html += `<div style="margin-left:8px;"><span class="sub-header">${week}</span>`;
                const pillId = `${classId}-${week}`.replace(/\s+/g, '-');
                selectorHtml += `<div class="kb-checkbox-label" data-bucket="${classId}|${week}">${classId} ${week}</div>`;
                
                buckets[classId][week].forEach(item => {
                    html += `<div class="item-card"><span class="item-title">${item.title}</span><div class="item-meta"><span>/${item.bucket}</span><span class="badge badge-bucket">Grounded</span></div></div>`;
                });
                html += `</div>`;
            }
        }
        kbUI.innerHTML = html;
        kbSelector.innerHTML = selectorHtml;
    });
}

// Load local knowledge base from localStorage and render into the UI when
// Firebase/Firestore is not available or when running in offline mode.
function loadLocalKnowledgeToUI() {
    try {
        const kb = getKnowledgeBase();
        knowledgeCache = [];
        const kbUI = document.getElementById('kbHierarchy');
        const kbSelector = document.getElementById('kbContextSelector');

        if (!kbUI || !kbSelector) return;

        const classes = Object.keys(kb || {});
        if (classes.length === 0) {
            kbUI.innerHTML = '<div style="font-size:0.65rem; color:var(--text-muted); text-align:center; padding:20px;">Intelligence Buckets Empty. Run Scan to populate.</div>';
            kbSelector.innerHTML = '<span style="font-size:0.55rem; color:var(--text-muted);">No buckets available.</span>';
            return;
        }

        let html = '';
        let selectorHtml = '';
        for (const classId of Object.keys(kb)) {
            html += `<span class="section-header">${classId} Bucket</span>`;
            for (const week of Object.keys(kb[classId] || {})) {
                html += `<div style="margin-left:8px;"><span class="sub-header">${week}</span>`;
                selectorHtml += `<div class="kb-checkbox-label" data-bucket="${classId}|${week}">${classId} ${week}</div>`;
                (kb[classId][week] || []).forEach(item => {
                    knowledgeCache.push(item);
                    html += `<div class="item-card"><span class="item-title">${item.title}</span><div class="item-meta"><span>/${item.bucket}</span><span class="badge badge-offline">Local</span></div></div>`;
                });
                html += `</div>`;
            }
        }
        kbUI.innerHTML = html;
        kbSelector.innerHTML = selectorHtml;
    } catch (e) {
        log('[KB] Failed to load local knowledge base: ' + (e && e.message ? e.message : String(e)), 'log-err');
    }
}

// Sync any locally saved knowledge base items to Firestore when a cloud session becomes available.
async function syncLocalKnowledgeToCloud() {
    if (!db || !currentUser) {
        log('[KB SYNC] No Firestore or authenticated user available; skipping local->cloud sync.', 'log-sys');
        return;
    }
    try {
        const kb = getKnowledgeBase();
        if (!kb || Object.keys(kb).length === 0) {
            log('[KB SYNC] No local knowledge base items to sync.', 'log-sys');
            return;
        }
        const knowledgeCol = collection(db, 'artifacts', appId, 'users', currentUser.uid, 'knowledge');
        let syncedCount = 0;
        for (const classId of Object.keys(kb)) {
            for (const week of Object.keys(kb[classId] || {})) {
                const items = kb[classId][week] || [];
                for (let i = 0; i < items.length; i++) {
                    const item = items[i];
                    if (!item || item.cloudId || item.synced) continue;
                    try {
                        const docRef = await addDoc(knowledgeCol, {
                            classId: item.classId || classId,
                            week: item.week || week,
                            bucket: item.bucket || 'research',
                            title: item.title || 'Untitled',
                            content: item.content || '',
                            timestamp: item.timestamp || Date.now()
                        });
                        item.cloudId = docRef.id;
                        item.synced = true;
                        syncedCount++;
                        log(`[KB SYNC] Uploaded "${item.title}" => cloud id=${docRef.id}`, 'log-bucket');
                    } catch (err) {
                        log('[KB SYNC] Failed to upload item: ' + (err && err.message ? err.message : String(err)), 'log-err');
                    }
                }
            }
        }
        // Persist any cloudId markers back into local storage so we don't re-upload repeatedly.
        saveKnowledgeBase(kb);
        if (syncedCount > 0) log(`[KB SYNC] Completed: ${syncedCount} item(s) synced to cloud.`, 'log-success');
    } catch (e) {
        log('[KB SYNC] Unexpected error: ' + (e && e.message ? e.message : String(e)), 'log-err');
    }
}

// 2. SYNC RECENT DRAFTS (Realtime UI population)
function initDraftsSync() {
    if (!currentUser) return;
    if (!db) { log('Firestore not initialized; skipping drafts sync.', 'log-err'); return; }
    const draftsCol = collection(db, 'artifacts', appId, 'users', currentUser.uid, 'drafts');
    onSnapshot(draftsCol, (snap) => {
        const draftList = document.getElementById('draftList');
        window.currentDrafts = {};
        
        if (snap.empty) {
            draftList.innerHTML = '<div style="font-size:0.65rem; color:var(--text-muted); text-align:center; padding:20px;">No grounded drafts generated.</div>';
            return;
        }

        const drafts = [];
        snap.forEach(d => {
            const data = d.data();
            window.currentDrafts[d.id] = data; // map for modification functions
            drafts.push({ id: d.id, ...data });
        });
        
        // Sort by newest first
        drafts.sort((a, b) => b.timestamp - a.timestamp);

        let html = '';
        drafts.forEach(draft => {
            const badgeClass = draft.tone === 'yellowdig' ? 'badge-yd' : 'badge-running';
            const badgeText = draft.tone === 'yellowdig' ? 'YELLOWDIG' : 'ACADEMIC';
            const timeStr = new Date(draft.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            html += `
            <div class="item-card" id="${draft.id}">
                <span class="item-title">${draft.title}</span>
                <div class="item-meta"><span>${timeStr}</span><span class="badge ${badgeClass}">${badgeText}</span></div>
                
                <!-- Snippet Preview -->
                <div class="draft-content-preview">${draft.content}</div>

                <div class="card-actions">
                    <button class="card-action-btn" onclick="showRefineModal('${draft.id}')">REFINE</button>
                    <button class="card-action-btn protect" onclick="applyModification('${draft.id}', 'protect')">🛡️ PROTECT</button>
                    <button class="card-action-btn" onclick="applyModification('${draft.id}', 'shorter')">SHORTER</button>
                    ${draft.tone === 'yellowdig' ? `<button class="card-action-btn yd" onclick="log('[YD] Posting to DOM via Service...', 'log-yd')">POST YD</button>` : `<button class="card-action-btn pdf" onclick="log('[PDF] Exporting via pdf-v2-export...', 'log-sys')">PDF</button>`}
                </div>

                <!-- Refine Overlay Modal -->
                <div class="refine-modal" id="refine-modal-${draft.id}">
                    <span style="font-size:0.65rem; color:var(--text-muted); margin-bottom:8px; font-weight:700;">CUSTOM REFINEMENT</span>
                    <input type="text" id="refine-input-${draft.id}" class="refine-input-field" placeholder="e.g. Make it sound more enthusiastic...">
                    <div style="display:flex; gap:6px;">
                        <button class="action-btn" style="margin-bottom:0;" onclick="closeRefineModal('${draft.id}')">CANCEL</button>
                        <button class="action-btn primary" style="margin-bottom:0;" onclick="applyModification('${draft.id}', 'refine')">APPLY</button>
                    </div>
                </div>
            </div>`;
        });
        draftList.innerHTML = html;
    });
}

// 3. SYNC ACTIVE ITERATIONS (Realtime UI population for SCAN tab)
function initIterationsSync() {
    if (!currentUser) return;
    if (!db) { log('Firestore not initialized; skipping iterations sync.', 'log-err'); return; }
    const iterCol = collection(db, 'artifacts', appId, 'users', currentUser.uid, 'iterations');
    onSnapshot(iterCol, (snap) => {
        const container = document.getElementById('iterationsContainer');
        
        // Seed defaults if empty
        if (snap.empty) {
            addDoc(iterCol, { name: "Production Environment Scan", version: "v2.4.0", status: "RUNNING", timestamp: Date.now() - 10000 });
            addDoc(iterCol, { name: "Security Sniffer Pro", version: "v1.0.2", status: "COMPLETED", timestamp: Date.now() - 50000 });
            return;
        }

        const iters = [];
        snap.forEach(d => iters.push({ id: d.id, ...d.data() }));
        iters.sort((a, b) => b.timestamp - a.timestamp); // Sort by oldest to match screenshot layout usually

        let html = '';
        iters.forEach(iter => {
            const badgeCls = iter.status === 'RUNNING' ? 'badge-running' : 'badge-completed';
            html += `
            <div class="item-card">
                <span class="item-title">${iter.name}</span>
                <div class="item-meta"><span>${iter.version}</span><span class="badge ${badgeCls}">${iter.status}</span></div>
            </div>`;
        });
        container.innerHTML = html;
    });
}

async function saveToBucket(bucket, title, content) {
    // If Firestore is available and we have an authenticated user, prefer cloud sync
    if (db && currentUser) {
        try {
            const knowledgeCol = collection(db, 'artifacts', appId, 'users', currentUser.uid, 'knowledge');
            await addDoc(knowledgeCol, { classId: sessionContext.classId, week: sessionContext.week, bucket, title, content, timestamp: Date.now() });
            log(`[BUCKET] Saved to Cloud: /${sessionContext.classId}/${sessionContext.week}/${bucket}`, "log-bucket");
            return;
        } catch (e) {
            log('[BUCKET] Cloud save failed, falling back to local store: ' + (e && e.message ? e.message : String(e)), 'log-warn');
            // fall through to local save
        }
    }

    // Local fallback: persist into localStorage using utils helpers so KB remains available offline
    try {
        const kb = getKnowledgeBase();
        if (!kb[sessionContext.classId]) kb[sessionContext.classId] = {};
        if (!kb[sessionContext.classId][sessionContext.week]) kb[sessionContext.classId][sessionContext.week] = [];
        const item = { classId: sessionContext.classId, week: sessionContext.week, bucket, title, content, timestamp: Date.now() };
        kb[sessionContext.classId][sessionContext.week].push(item);
        saveKnowledgeBase(kb);
        knowledgeCache.push(item);
        log(`[BUCKET] Saved locally: /${sessionContext.classId}/${sessionContext.week}/${bucket}`, "log-bucket");

        // Update the visible KB UI if present
        try {
            const kbUI = document.getElementById('kbHierarchy');
            const kbSelector = document.getElementById('kbContextSelector');
            if (kbUI && kbSelector) {
                // Rebuild minimal UI fragments (mirrors initKnowledgeSync snapshot processing)
                let html = '';
                let selectorHtml = '';
                for (const classId in kb) {
                    html += `<span class="section-header">${classId} Bucket</span>`;
                    for (const week in kb[classId]) {
                        html += `<div style="margin-left:8px;"><span class="sub-header">${week}</span>`;
                        selectorHtml += `<div class="kb-checkbox-label" data-bucket="${classId}|${week}">${classId} ${week}</div>`;
                        kb[classId][week].forEach(item => {
                            html += `<div class="item-card"><span class="item-title">${item.title}</span><div class="item-meta"><span>/${item.bucket}</span><span class="badge badge-offline">Local</span></div></div>`;
                        });
                        html += `</div>`;
                    }
                }
                kbUI.innerHTML = html;
                kbSelector.innerHTML = selectorHtml;
            }
        } catch (e) { /* non-blocking UI update */ }
    } catch (e) {
        log('[KB] Local save failed: ' + (e && e.message ? e.message : String(e)), 'log-err');
    }
}

async function callGeminiAPI(query, systemPrompt) {
    const key = getGeminiApiKey();
    if (!key) {
        log('[AGENT] Gemini API key missing. Open Settings and add your API key.', 'log-err');
        throw new Error('Gemini API key missing');
    }
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(key)}`;
    const payload = { contents: [{ parts: [{ text: query }] }], systemInstruction: { parts: [{ text: systemPrompt }] } };
    const resp = await fetch(endpoint, { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } });
    if (!resp.ok) {
        let bodyText = '';
        try { bodyText = await resp.text(); } catch (e) {}
        log(`[AGENT] Gemini API request failed ${resp.status}: ${bodyText}`, 'log-err');
        throw new Error(`Gemini API request failed: ${resp.status}`);
    }
    const data = await resp.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";
}

// --- GLOBAL ACTIONS (POST PICKER & DRAFT REFINEMENT) ---
window.savePostToKB = async (title, content) => {
    log(`[KB] Storing selected post to /${sessionContext.classId}/${sessionContext.week}/research`, "log-bucket");
    await saveToBucket("research", `Post_${title.substring(0,10)}.txt`, content);
};

window.loadPostToDraft = (author, content) => {
    document.getElementById('draftPrompt').value = `Author: ${author}\nMessage: "${content}"\n\nPlease draft a reply to this post.`;
    document.getElementById('draftTone').value = 'yellowdig';
    log(`[DRAFT] Imported post from ${author}. Switching to Drafts tab...`, "log-sys");
    
    // Programmatically switch tabs to DRAFTS
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.style.display = 'none');
    const draftBtn = document.querySelector('.nav-btn[data-tab="drafts"]');
    if (draftBtn) draftBtn.classList.add('active');
    document.getElementById('pane-drafts').style.display = 'block';
};

window.showRefineModal = (id) => { document.getElementById(`refine-modal-${id}`).style.display = 'flex'; };
window.closeRefineModal = (id) => { document.getElementById(`refine-modal-${id}`).style.display = 'none'; };

window.applyModification = async (id, actionType) => {
    if(!currentUser) return;
    const draftData = window.currentDrafts[id];
    if(!draftData) return;
    
    const overlay = document.getElementById('thinkingOverlay');
    overlay.style.display = 'flex';
    
    let modifierPrompt = "";
    let suffixTitle = "";
    if (actionType === 'protect') {
        modifierPrompt = "Refactor this content to aggressively bypass AI detection models like Pangram. Make it sound extremely human, conversational, and natural. Add slight conversational imperfections.";
        suffixTitle = " (Protected)";
        log(`[AI] Applying Pangram Protection refactor to draft...`, "log-sys");
    } else if (actionType === 'shorter') {
        modifierPrompt = "Make this text significantly shorter and more concise without losing the core point.";
        suffixTitle = " (Shortened)";
        log(`[AI] Condensing draft length...`, "log-sys");
    } else if (actionType === 'refine') {
        const customInput = document.getElementById(`refine-input-${id}`).value;
        modifierPrompt = `Refine this content according to these instructions: ${customInput}`;
        suffixTitle = " (Refined)";
        log(`[AI] Applying custom refinement: "${customInput}"`, "log-sys");
        closeRefineModal(id);
    }

    try {
        // Call AI to modify the existing content
        const sysPrompt = `Original Content:\n${draftData.content}\n\nApply the requested modifications directly to the text. Return only the modified text.`;
        const result = await callGeminiAPI(modifierPrompt, sysPrompt);
        
        // Realtime Sync: Update Document in Firestore
        const draftRef = doc(db, 'artifacts', appId, 'users', currentUser.uid, 'drafts', id);
        await updateDoc(draftRef, {
            content: result,
            title: draftData.title.includes('(') ? draftData.title : draftData.title + suffixTitle,
            timestamp: Date.now()
        });
        
        overlay.style.display = 'none';
        log(`[SUCCESS] Draft ${actionType} applied and synced to Cloud.`, "log-success");
    } catch(e) {
        overlay.style.display = 'none';
        log(`[ERR] Modification failed: ${e.message}`, "log-err");
    }
};

// --- UI EVENT BINDINGS ---
document.getElementById('btnInitEnv').onclick = () => {
    document.getElementById('landingView').classList.add('hidden');
    document.getElementById('sidebar').style.transform = 'translateX(0)';
    setTimeout(() => {
        document.getElementById('consoleView').classList.add('active');
        if(extBridge.isActive) {
            log("[BRIDGE] Extension content scripts detected.", "log-sys");
            const extStatus = document.getElementById('extStatus');
            if (extStatus) extStatus.innerHTML = '<span class="badge badge-completed">LINKED</span>';
        } else {
            log("[BRIDGE] Operating in standalone dashboard mode.", "log-sys");
            const extStatus = document.getElementById('extStatus');
            if (extStatus) extStatus.innerHTML = '<span class="badge badge-yd">STANDALONE</span>';
        }
    }, 600);
};

// POST PICKER Action
document.getElementById('btnPickPosts').onclick = async () => {
    log('[BRIDGE] Requesting interactive element picker in page...', 'log-sys');
    const overlay = document.getElementById('thinkingOverlay');
    overlay.style.display = 'flex';

    try {
        const resp = await extBridge.send('START_ELEMENT_PICK');
        if (!resp || !resp.ok) {
            // Fallback: request heuristic scan
            overlay.style.display = 'none';
            log('[PICKER] Content script not available; falling back to heuristic scan.', 'log-warn');
            const scanResp = await extBridge.send('GET_PAGE_POSTS');
            const posts = (scanResp && scanResp.ok && scanResp.posts) ? scanResp.posts : [];
            populateDetectedPosts((posts || []).map(p => ({ author: p.author || 'Unknown', text: p.text || '', selector: p.selector || null })));
            return;
        }

        // Wait for PICKER_RESULTS (content script will send a runtime message). Use a timeout fallback.
        if (window._pagepilotPickerTimeout) clearTimeout(window._pagepilotPickerTimeout);
        window._pagepilotPickerTimeout = setTimeout(() => {
            overlay.style.display = 'none';
            window._pagepilotPickerTimeout = null;
            log('[PICKER] No selection made within timeout (45s).', 'log-warn');
        }, 45000);
    } catch (e) {
        overlay.style.display = 'none';
        log('[PICKER] Failed to start picker: ' + (e && e.message ? e.message : String(e)), 'log-err');
    }
};

// Stop Pick button wiring
try {
    const btnStop = document.getElementById('btnStopPick');
    if (btnStop) {
        btnStop.addEventListener('click', async () => {
            try {
                btnStop.disabled = true;
                const overlay = document.getElementById('thinkingOverlay');
                overlay.style.display = 'flex';
                const resp = await extBridge.send('CANCEL_ELEMENT_PICK');
                overlay.style.display = 'none';
                if (!resp || !resp.ok) log('[PICKER] Cancel request failed or no picker active.', 'log-warn');
                btnStop.disabled = false;
            } catch (e) { btnStop.disabled = false; log('[PICKER] Cancel error: ' + (e && e.message ? e.message : String(e)), 'log-err'); }
        });
    }
} catch (e) { /* ignore */ }

 
// Auto-scan toggle wiring: sync UI state with storage and notify content script
try {
    const autoScanEl = document.getElementById('autoScanToggle');
    if (autoScanEl) {
        // initialize from persisted storage
        try {
            if (extBridge.isActive && typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.get(['dig_auto_scan_enabled'], (res) => {
                    const enabled = (res && typeof res.dig_auto_scan_enabled !== 'undefined') ? !!res.dig_auto_scan_enabled : true;
                    autoScanEl.checked = enabled;
                });
            } else {
                const s = localStorage.getItem('dig_auto_scan_enabled');
                autoScanEl.checked = (s === null) ? true : (s === 'true');
            }
        } catch (e) { /* ignore */ }

        autoScanEl.addEventListener('change', async () => {
            const enabled = !!autoScanEl.checked;
            try {
                await extBridge.send('SET_AUTO_SCAN', { enabled });
            } catch (e) {
                try { localStorage.setItem('dig_auto_scan_enabled', enabled ? 'true' : 'false'); } catch (er) {}
            }
            log(`[SYSTEM] Auto-scan ${enabled ? 'enabled' : 'disabled'}`, 'log-sys');
        });
    }
} catch (e) { /* ignore */ }

function populateDetectedPosts(posts) {
    const container = document.getElementById('detectedPostsContainer');
    if (!container) return;

    if (!posts || !Array.isArray(posts) || posts.length === 0) {
        container.style.display = 'none';
        container.innerHTML = '<div style="font-size:0.65rem; color:var(--text-muted); text-align:center; padding:12px;">No posts found.</div>';
        return;
    }
    container.style.display = 'block';
    container.innerHTML = posts.map(p => {
        const authorEsc = (p.author || 'Unknown').replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const textEsc = (p.text || '').replace(/'/g, "\\'").replace(/\n/g, ' ').replace(/"/g, '&quot;');
        const title = p.selector ? `Selector` : `Post`;
        const preview = (p.text || '').substring(0, 120) + ((p.text || '').length > 120 ? '...' : '');
        return `\n            <div class="item-card">\n                <span class="item-title">${title} (${authorEsc})</span>\n                <div class="item-meta" style="margin-bottom:8px;"><span>${preview}</span></div>\n                <div style="display:flex; gap:6px;">\n                    <button class="card-action-btn" onclick="savePostToKB('${authorEsc}','${textEsc}')">+ KB</button>\n                    <button class="card-action-btn yd" onclick="loadPostToDraft('${authorEsc}','${textEsc}')">📝 DRAFT</button>\n                </div>\n            </div>`;
    }).join('');
}

// Listen for picker results sent from the content script
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        try {
            if (!msg || !msg.action) return;
            if (msg.action === 'PICKER_RESULTS') {
                const overlay = document.getElementById('thinkingOverlay');
                overlay.style.display = 'none';
                if (window._pagepilotPickerTimeout) { clearTimeout(window._pagepilotPickerTimeout); window._pagepilotPickerTimeout = null; }
                const items = Array.isArray(msg.results) ? msg.results : [];
                const mapped = items.map(i => ({ author: i.author || 'Unknown', text: i.text || i.html || '', selector: i.selector || null }));
                populateDetectedPosts(mapped);
                sendResponse && sendResponse({ ok: true });
                return;
            }
            if (msg.action === 'PAGE_POSTS') {
                // Automatic scanning results from the content script
                try {
                    const overlay = document.getElementById('thinkingOverlay');
                    if (overlay) overlay.style.display = 'none';
                    if (window._pagepilotPickerTimeout) { clearTimeout(window._pagepilotPickerTimeout); window._pagepilotPickerTimeout = null; }
                    const items = Array.isArray(msg.posts) ? msg.posts : [];
                    const mapped = items.map(i => ({ author: i.author || 'Unknown', text: i.text || i.html || '', selector: i.selector || null }));
                    if (mapped && mapped.length) populateDetectedPosts(mapped);
                    sendResponse && sendResponse({ ok: true });
                } catch (e) { /* ignore */ }
                return;
            }
            if (msg.action === 'PICKER_CANCELLED') {
                const overlay = document.getElementById('thinkingOverlay');
                overlay.style.display = 'none';
                if (window._pagepilotPickerTimeout) { clearTimeout(window._pagepilotPickerTimeout); window._pagepilotPickerTimeout = null; }
                log('[PICKER] Selection cancelled by user.', 'log-sys');
                sendResponse && sendResponse({ ok: true });
                return;
            }
        } catch (e) { /* ignore */ }
    });
}

// SCAN Action (Adds an Iteration to Firestore)
document.getElementById('btnRunWorkflow').onclick = async () => {
    if(!currentUser) return;
    if(!db) { log('[CORE] Firestore not available; cannot run workflow.', 'log-err'); return; }
    log("[BRIDGE] Dispatching SCAN_MODULE to content-gatherer.service.js", "log-sys");
    document.getElementById('ctxPath').innerText = `/${sessionContext.classId}/${sessionContext.week}`;
    
    // Fire up Iteration Document
    const iterRef = collection(db, 'artifacts', appId, 'users', currentUser.uid, 'iterations');
    const docRef = await addDoc(iterRef, {
        name: `DOM Extraction Scan`,
        version: `v${Math.floor(Math.random()*3 + 1)}.${Math.floor(Math.random()*9)}.${Math.floor(Math.random()*9)}`,
        status: "RUNNING",
        timestamp: Date.now()
    });

    let p = 0; const bar = document.getElementById('progressBar'); const val = document.getElementById('progressVal');
    const interval = setInterval(async () => {
        p += 20; bar.style.width = `${p}%`; val.innerText = `${p}%`;
        if(p === 40) await saveToBucket("instructions", "Assignment_Instructions.txt", sessionContext.detectedInstructions);
        if(p === 80) await saveToBucket("textbook", "Vital_Concepts.vitals", sessionContext.detectedVitals);
        if(p >= 100) { 
            clearInterval(interval); 
            log("[CORE] Gathering complete.", "log-success"); 
            await updateDoc(docRef, { status: "COMPLETED" }); // Update DB
        }
    }, 500);
};

// KB Upload Action
document.getElementById('btnUploadKB').onclick = () => document.getElementById('kbFileInput').click();
document.getElementById('kbFileInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    log(`[KB] Reading uploaded file: ${file.name}...`, "log-sys");
    try {
        let content = (file.name.endsWith('.txt') || file.name.endsWith('.json')) ? await file.text() : "[PDF Extracted Text Simulation]";
        await saveToBucket("uploads", file.name, content.substring(0, 200) + (content.length > 200 ? "..." : ""));
    } catch (err) { log(`[KB] Upload failed: ${err.message}`, "log-sys"); }
    e.target.value = '';
});

// AGENT Action
document.getElementById('btnExecuteAgent').onclick = async () => {
    const prompt = document.getElementById('agentPrompt').value;
    if (!prompt) { log('[WARN] Agent prompt is empty.', 'log-warn'); return; }
    document.getElementById('thinkingOverlay').style.display = 'flex';
    log('[AGENT] Starting stateful agent session...', 'log-sys');

    // Clear session progress UI
    try {
        const prog = document.getElementById('agentProgress');
        if (prog) { prog.innerHTML = ''; const e = document.createElement('div'); e.className = 'log-entry log-sys'; e.innerText = '[AGENT] Session starting...'; prog.appendChild(e); }
    } catch (e) { }
    // Reset session id and disable cancel until background acknowledges start
    try { currentAgentSessionId = null; setCancelUi(false); } catch (e) { }

    try {
        const thinkingLevelEl = document.getElementById('agentThinkingLevel');
        const mobilePrecisionEl = document.getElementById('agentMobilePrecision');
        const thinkingLevel = thinkingLevelEl ? thinkingLevelEl.value : 'medium';
        const mobilePrecision = mobilePrecisionEl ? mobilePrecisionEl.value : 'medium';

        const simulate = (document.getElementById('agentSimulate') && document.getElementById('agentSimulate').checked) ? true : false;
        const generationConfig = {
            includeThoughts: true,
            thinkingLevel,
            mobilePrecision,
            maxAgentIterations: 12,
            simulate
        };

        const systemInstruction = `You are an autonomous browser agent. Use the declared tools (CLICK, TYPE, NAVIGATE, WAIT, SCROLL, SUBMIT, MAP, BATCH, ANSWER) by emitting function calls with JSON arguments. Do not output natural-language step lists. Preserve a thought_signature in each response. When finished, call the ANSWER tool with a final text.`;

        const apiKey = getGeminiApiKey();

        const resp = await extBridge.send('START_AGENT_SESSION', { initialPrompt: prompt, systemInstruction, apiKey, generationConfig });
        document.getElementById('thinkingOverlay').style.display = 'none';

        if (resp && resp.ok && resp.result) {
            const final = resp.result.final || '';
            log(`[AGENT] Session completed. Final output length=${(final||'').length}`, 'log-success');
            if (final) {
                // populate draft area as a quick preview
                try { document.getElementById('draftPrompt').value = final; } catch (e) { }
            }
        } else {
            log(`[AGENT] Session failed: ${resp && resp.error ? resp.error : 'Unknown error'}`, 'log-err');
        }
    } catch (e) {
        document.getElementById('thinkingOverlay').style.display = 'none';
        log(`[AGENT] Critical Fault: ${e.message}`, 'log-err');
    }
};

// DRAFT Generation Action (Saves to Firestore)
document.getElementById('btnGenerateDraft').onclick = async () => {
    if(!currentUser) return;
    if(!db) { log('[DRAFT] Firestore not initialized; cannot save drafts.', 'log-err'); return; }
    const prompt = document.getElementById('draftPrompt').value;
    const tone = document.getElementById('draftTone').value;
    if(!prompt) { log("[WARN] Prompt cannot be empty.", "log-warn"); return; }
    
    const selectedContexts = Array.from(document.querySelectorAll('.kb-checkbox-label.selected')).map(el => el.getAttribute('data-bucket'));
    
    document.getElementById('thinkingOverlay').style.display = 'flex';
    log(`[DRAFT] Grounding AI request for Tone: ${tone.toUpperCase()}`, "log-sys");
    if(selectedContexts.length > 0) log(`[DRAFT] Injected Context Buckets: ${selectedContexts.join(', ')}`, "log-bucket");
    
    let sysPrompt = `Use Context: Class ${sessionContext.classId}, Week ${sessionContext.week}. Selected Buckets: ${selectedContexts.length ? selectedContexts.join() : 'None'}. Format as ${tone}.`;
    if (tone === 'yellowdig') {
        sysPrompt += " INSTRUCTION: Return the contents of the post naturally. Do not include meta-commentary.";
    }
    
    try {
        // Call Gemini for initial draft
        const result = await callGeminiAPI(prompt, sysPrompt);
        document.getElementById('thinkingOverlay').style.display = 'none';
        log("[DRAFT] draft-generation.service.js successfully compiled content.", "log-sys");
        
        const title = tone === 'yellowdig' ? 'Engagement Post' : 'Academic Summary';
        
        // Realtime Sync: Save Document to Firestore
        const draftsCol = collection(db, 'artifacts', appId, 'users', currentUser.uid, 'drafts');
        await addDoc(draftsCol, {
            title: `${title}: ${prompt.substring(0, 15)}...`,
            tone: tone,
            content: result,
            timestamp: Date.now()
        });

        log("[CLOUD] Draft document successfully pushed to Cloud Storage.", "log-success");

    } catch (e) {
        document.getElementById('thinkingOverlay').style.display = 'none';
        log(`[DRAFT] Generation failed: ${e.message}`, "log-err");
    }
};

// EXPORT Action (Now includes everything)
document.getElementById('btnExportData').onclick = () => {
    if (!currentUser) return;
    const bundle = {
        appId, 
        user: currentUser.uid, 
        buckets: knowledgeCache, 
        drafts: Object.values(window.currentDrafts),
        timestamp: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `pagepilot_export_${Date.now()}.json`; a.click();
    log("[SYSTEM] Complete intelligence bundle exported.", "log-sys");
};

// TAB Navigation
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.onclick = () => {
        const target = document.getElementById(`pane-${btn.dataset.tab}`);
        if (target) {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => p.style.display = 'none');
            btn.classList.add('active'); target.style.display = 'block';
        }
    };
});

// Delegated listener for KB bucket selector toggles (avoid inline onclick attributes)
try {
    if (!window.__dig_kb_clicks_bound) {
        document.addEventListener('click', (e) => {
            const el = e.target && e.target.closest ? e.target.closest('.kb-checkbox-label') : null;
            if (!el) return;
            el.classList.toggle('selected');
        }, true);
        window.__dig_kb_clicks_bound = true;
    }
} catch (e) { /* ignore */ }

// Settings Gear Icon
document.getElementById('btnSettings').onclick = () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.style.display = 'none');
    const target = document.getElementById('pane-settings');
    if (target) target.style.display = 'block';
};

// API Key Storage Logic (Settings Tab)
if (extBridge.isActive && typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.get(['geminiApiKey'], (result) => {
        if (result.geminiApiKey) {
            document.getElementById('geminiApiKeyInput').value = result.geminiApiKey;
        }
    });
} else {
    const savedKey = localStorage.getItem('geminiApiKey');
    if (savedKey) document.getElementById('geminiApiKeyInput').value = savedKey;
}

document.getElementById('btnSaveSettings').onclick = () => {
    const key = document.getElementById('geminiApiKeyInput').value;
    if (extBridge.isActive && typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set({ geminiApiKey: key }, () => {
            const status = document.getElementById('settingsStatus');
            status.style.display = 'block';
            log("[SYSTEM] Gemini API Key saved to secure local extension storage.", "log-sys");
            setTimeout(() => status.style.display = 'none', 3000);
        });
    } else {
        localStorage.setItem('geminiApiKey', key);
        const status = document.getElementById('settingsStatus');
        status.style.display = 'block';
        log("[SYSTEM] Standalone mode: API Key saved to browser localStorage.", "log-sys");
        setTimeout(() => status.style.display = 'none', 3000);
    }
};

window.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
window.addEventListener('resize', () => { resize(); createBlobs(); });
resize(); createBlobs(); loop(); startSession();
// Ensure the Iterations UI never stays in a perpetual 'Syncing...' state when Firestore
// or auth are not available. Show a local/default set of iterators that will be
// replaced by the real snapshot listener if/when Firestore connects.
function populateLocalIterationsUI() {
    try {
        const container = document.getElementById('iterationsContainer');
        if (!container) return;
        const html = `
            <div class="item-card">
                <span class="item-title">Production Environment Scan</span>
                <div class="item-meta"><span>v2.4.0</span><span class="badge badge-offline">OFFLINE</span></div>
            </div>
            <div class="item-card">
                <span class="item-title">Security Sniffer Pro</span>
                <div class="item-meta"><span>v1.0.2</span><span class="badge badge-completed">COMPLETED</span></div>
            </div>
            <div style="font-size:0.65rem; color:var(--text-muted); margin-top:8px;">(Offline mode — connect Firebase to enable realtime sync)</div>
        `;
        container.innerHTML = html;
    } catch (e) { console.warn('populateLocalIterationsUI error', e); }
}

// Seed local UI immediately if Firestore/authn't ready. When Firestore connects
// the onSnapshot listener in initIterationsSync will overwrite this content.
try { if (!db || !currentUser) populateLocalIterationsUI(); } catch (e) { /* ignore */ }
/**
 * Entry point for the paper generation UI.
 */

document.addEventListener('DOMContentLoaded', () => {
  const generateBtn = document.getElementById('generatePaperBtn');
  if (generateBtn) {
    generateBtn.addEventListener('click', async () => {
      const promptInput = document.getElementById('promptInput');
      const prompt = promptInput ? promptInput.value : "";
      const apiKey = localStorage.getItem('gemini_api_key') || "";

      // generateContent is available globally
      const result = await generateContent("Victoria's SW Paper Assistant", prompt, apiKey);

      const output = document.getElementById('paperOutput');
      if (output) output.innerHTML = result;
    });
  }

  const kbBtn = document.getElementById('viewKbBtn');
  if (kbBtn) kbBtn.addEventListener('click', showKnowledgeBase);
});

// Agent session progress UI handling
const _agentProgressBuffer = [];
function appendAgentProgress(text, cls) {
    try {
        const el = document.getElementById('agentProgress');
        if (!el) { _agentProgressBuffer.push({ text, cls }); return; }
        if (el.innerText === 'No session activity yet.') el.innerHTML = '';
        const entry = document.createElement('div');
        entry.className = `log-entry ${cls || ''}`.trim();
        entry.innerText = text;
        el.appendChild(entry);
        el.scrollTop = el.scrollHeight;
    } catch (e) { console.warn('appendAgentProgress error', e); }
}

// Flush any buffered updates once UI is ready
document.addEventListener('readystatechange', () => {
    if (document.readyState === 'complete') {
        while (_agentProgressBuffer.length) {
            const it = _agentProgressBuffer.shift(); appendAgentProgress(it.text, it.cls);
        }
    }
});

// Listen for progress events from background/service-worker agent engine
let currentAgentSessionId = null;
const setCancelUi = (enabled) => { try { const b = document.getElementById('btnCancelAgent'); if (b) b.disabled = !enabled; } catch (e) { } };
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {

    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        try {
            if (!msg || !msg.action) return;

            // session started notification
            if (msg.action === 'AGENT_SESSION_STARTED') {
                const sid = msg.sessionId;
                currentAgentSessionId = sid || null;
                setCancelUi(!!sid);
                appendAgentProgress(`[SESSION STARTED] ${sid}`, 'log-sys');
                return;
            }

            if (msg.action !== 'AGENT_SESSION_UPDATE') return;
            const u = msg.update || {};
            let text = '';
            let cls = 'log-sys';
            switch ((u.type || '').toString()) {
                case 'iteration_start':
                    text = `[ITER ${u.iteration}] starting...`;
                    cls = 'log-sys';
                    break;
                case 'model_response':
                    text = `[MODEL] thought=${u.summary && u.summary.thought ? u.summary.thought : 'n/a'}; text=${u.summary && u.summary.text ? (u.summary.text.length > 200 ? u.summary.text.substring(0,200)+"..." : u.summary.text) : '[no-text]'}; fn=${u.summary && u.summary.functionCall ? (u.summary.functionCall.name || u.summary.functionCall.tool || '[fn]') : '[none]'}`;
                    cls = 'log-bucket';
                    break;
                case 'tool_call':
                    text = `[TOOL CALL] ${u.tool} ${u.step ? JSON.stringify(u.step) : ''}`;
                    cls = 'log-yd';
                    break;
                case 'tool_result':
                    const isOk = !!(u.result && (u.result.ok || u.result.status === 'ok' || u.result.status === 'success'));
                    text = `[TOOL RESULT] ${u.tool} ${isOk ? 'OK' : 'ERROR'} ${u.result ? JSON.stringify(u.result) : ''}`;
                    cls = isOk ? 'log-success' : 'log-err';
                    break;
                case 'batch_start':
                    text = `[BATCH] ${u.operations ? u.operations.length + ' ops' : ''}`;
                    cls = 'log-sys';
                    break;
                case 'complete':
                    text = `[COMPLETE] ${u.final ? (u.final.length > 500 ? u.final.substring(0,500)+"..." : u.final) : '[empty]'}`;
                    cls = 'log-success';
                    // if this matches current session, clear UI state
                    if (u.sessionId && u.sessionId === currentAgentSessionId) { currentAgentSessionId = null; setCancelUi(false); }
                    break;
                case 'cancelled':
                    text = `[CANCELLED] ${u.reason || ''}`;
                    cls = 'log-err';
                    if (u.sessionId && u.sessionId === currentAgentSessionId) { currentAgentSessionId = null; setCancelUi(false); }
                    break;
                case 'cancel_ack':
                    text = `[CANCEL] ack ${u.sessionId || ''}`;
                    cls = 'log-sys';
                    break;
                case 'error':
                    text = `[ERROR] ${u.error || JSON.stringify(u)}`;
                    cls = 'log-err';
                    if (u.sessionId && u.sessionId === currentAgentSessionId) { currentAgentSessionId = null; setCancelUi(false); }
                    break;
                default:
                    text = `[UPDATE] ${JSON.stringify(u)}`;
                    cls = 'log-sys';
            }
            appendAgentProgress(text, cls);
        } catch (e) { console.warn('AGENT_SESSION_UPDATE handler error', e); }
    });
}

// Cancel button wiring
try {
    const btnCancel = document.getElementById('btnCancelAgent');
    if (btnCancel) {
        btnCancel.addEventListener('click', async () => {
            try {
                if (!currentAgentSessionId) return;
                setCancelUi(false);
                appendAgentProgress(`[CANCEL] requesting cancel for ${currentAgentSessionId}`, 'log-yd');
                const resp = await extBridge.send('CANCEL_AGENT_SESSION', { sessionId: currentAgentSessionId });
                if (!resp || !resp.ok) appendAgentProgress(`[CANCEL] failed: ${resp && resp.error ? resp.error : 'unknown'}`, 'log-err');
            } catch (e) { appendAgentProgress(`[CANCEL] exception: ${e.message}`, 'log-err'); }
        });
    }
} catch (e) { }

// Replay UI wiring
try {
    const inputSid = document.getElementById('replaySessionId');
    const btnLoadHistory = document.getElementById('btnLoadHistory');
    const btnReplayHistory = document.getElementById('btnReplayHistory');
    const replaySpeed = document.getElementById('replaySpeed');
    const replayDryRunEl = document.getElementById('replayDryRun');

    if (btnLoadHistory) {
        btnLoadHistory.addEventListener('click', async () => {
            try {
                const sid = inputSid && inputSid.value && inputSid.value.trim() ? inputSid.value.trim() : (currentAgentSessionId || null);
                if (!sid) { appendAgentProgress('[REPLAY] No session id provided and no active session.', 'log-err'); return; }
                appendAgentProgress(`[REPLAY] Loading history for ${sid}...`, 'log-sys');
                const resp = await extBridge.send('GET_AGENT_HISTORY', { sessionId: sid });
                if (!resp || !resp.ok) { appendAgentProgress(`[REPLAY] failed to load: ${resp && resp.error ? resp.error : 'unknown'}`, 'log-err'); return; }
                const hist = resp.history || [];
                appendAgentProgress(`[REPLAY] Loaded ${hist.length} history entries for ${sid}`, 'log-sys');
                // Dump a compact summary of recent tool calls
                let shown = 0;
                for (const u of hist.slice(-100)) {
                    if (!u || !u.type) continue;
                    if (u.type === 'tool_call' && u.step) {
                        appendAgentProgress(`[HIST] ${u.tool} ${JSON.stringify(u.step)}`, 'log-yd');
                        shown++;
                    } else if (u.type === 'batch_start' && Array.isArray(u.operations)) {
                        appendAgentProgress(`[HIST] BATCH ${u.operations.length} ops`, 'log-sys');
                    }
                    if (shown >= 25) break;
                }
            } catch (err) { appendAgentProgress(`[REPLAY] load exception: ${err && err.message ? err.message : String(err)}`, 'log-err'); }
        });
    }

    if (btnReplayHistory) {
        btnReplayHistory.addEventListener('click', async () => {
            try {
                const sid = inputSid && inputSid.value && inputSid.value.trim() ? inputSid.value.trim() : (currentAgentSessionId || null);
                if (!sid) { appendAgentProgress('[REPLAY] No session id provided and no active session.', 'log-err'); return; }
                const speed = parseInt(replaySpeed && replaySpeed.value ? replaySpeed.value : 300, 10) || 300;
                const dryRun = !!(replayDryRunEl && replayDryRunEl.checked);
                appendAgentProgress(`[REPLAY] Replaying ${sid} (speed=${speed}ms dryRun=${dryRun})`, 'log-sys');
                const resp = await extBridge.send('REPLAY_AGENT_HISTORY', { sessionId: sid, dryRun, speedMs: speed });
                if (!resp || !resp.ok) { appendAgentProgress(`[REPLAY] failed: ${resp && resp.error ? resp.error : 'unknown'}`, 'log-err'); return; }
                const results = resp.results || [];
                appendAgentProgress(`[REPLAY] Completed; ${results.length} steps executed.`, 'log-success');
                for (let i = 0; i < Math.min(results.length, 20); i++) {
                    const r = results[i];
                    if (r && (r.ok || r.status === 'ok' || r.status === 'success')) appendAgentProgress(`[REPLAY-STEP ${i+1}] OK ${JSON.stringify(r)}`, 'log-success');
                    else appendAgentProgress(`[REPLAY-STEP ${i+1}] ERR ${r && r.error ? r.error : JSON.stringify(r)}`, 'log-err');
                }
            } catch (err) { appendAgentProgress(`[REPLAY] exception: ${err && err.message ? err.message : String(err)}`, 'log-err'); }
        });
    }

    // Export archived session JSON as a downloadable file
    const btnExportHistory = document.getElementById('btnExportHistory');
    if (btnExportHistory) {
        btnExportHistory.addEventListener('click', async () => {
            try {
                const sid = inputSid && inputSid.value && inputSid.value.trim() ? inputSid.value.trim() : (currentAgentSessionId || null);
                if (!sid) { appendAgentProgress('[EXPORT] No session id provided and no active session.', 'log-err'); return; }
                appendAgentProgress(`[EXPORT] Fetching history for ${sid}...`, 'log-sys');
                const resp = await extBridge.send('GET_AGENT_HISTORY', { sessionId: sid });
                if (!resp || !resp.ok) { appendAgentProgress(`[EXPORT] failed to load: ${resp && resp.error ? resp.error : 'unknown'}`, 'log-err'); return; }
                const hist = resp.history || [];
                const payload = { sessionId: sid, history: hist, exportedAt: new Date().toISOString() };
                const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
                const filename = `pagepilot_session_${sid}_${Date.now()}.json`;
                const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click(); a.remove();
                appendAgentProgress('[EXPORT] Download initiated.', 'log-success');
            } catch (err) { appendAgentProgress(`[EXPORT] exception: ${err && err.message ? err.message : String(err)}`, 'log-err'); }
        });
    }
} catch (e) { console.warn('replay UI wiring error', e); }
