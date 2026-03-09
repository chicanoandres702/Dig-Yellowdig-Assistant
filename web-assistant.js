import { initializeApp } from "./firebase-app.js";
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from "./firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc } from "./firebase-firestore.js";

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
    onAuthStateChanged(auth, (u) => {
        currentUser = u;
        if (currentUser) {
            log(`[CLOUD] Connected to session storage: ${currentUser.uid.substring(0,6)}...`, "log-sys");
            initKnowledgeSync();
            initDraftsSync();
            initIterationsSync();
        }
    });
} else {
    log('[CLOUD] Firebase not initialized; running in local/offline mode.', 'log-sys');
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
                selectorHtml += `<div class="kb-checkbox-label" onclick="this.classList.toggle('selected')" data-bucket="${classId}|${week}">${classId} ${week}</div>`;
                
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
    if (!currentUser) return;
    if (!db) { log('Firestore not initialized; cannot save to bucket.', 'log-err'); return; }
    const knowledgeCol = collection(db, 'artifacts', appId, 'users', currentUser.uid, 'knowledge');
    await addDoc(knowledgeCol, { classId: sessionContext.classId, week: sessionContext.week, bucket, title, content, timestamp: Date.now() });
    log(`[BUCKET] Saved: /${sessionContext.classId}/${sessionContext.week}/${bucket}`, "log-bucket");
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
    log("[BRIDGE] Invoking element-picker.service.js to scan DOM...", "log-sys");
    document.getElementById('thinkingOverlay').style.display = 'flex';
    
    await new Promise(r => setTimeout(r, 1200)); 
    document.getElementById('thinkingOverlay').style.display = 'none';
    
    const posts = [
        { type: 'Instructor Prompt', author: 'Dr. Aris', text: 'Please review the Paxos protocol and provide your thoughts on its latency in multi-region environments.' },
        { type: 'Student Reply', author: 'John D.', text: 'I think Paxos is great but Raft is easier to understand. What do you guys think?' },
        { type: 'Student Reply', author: 'Sarah K.', text: 'Latencies in Paxos are a known issue due to the multiple round trips required for consensus.' },
        { type: 'Student Reply', author: 'Mike T.', text: 'Can someone explain the Commit phase in more detail? Im confused about partitioned networks.' },
        { type: 'Student Reply', author: 'Emily R.', text: 'To add to Sarahs point, Multi-Paxos tries to solve the latency by electing a stable leader, skipping the prepare phase.' }
    ];

    log(`[PICKER] Iteration complete. Found ${posts.length} compatible Yellowdig elements.`, "log-success");
    
    const container = document.getElementById('detectedPostsContainer');
    container.style.display = 'block';
    
    container.innerHTML = posts.map(p => `
        <div class="item-card" ${p.type === 'Instructor Prompt' ? 'style="background: rgba(96, 165, 250, 0.05); border-color: rgba(96, 165, 250, 0.3);"' : ''}>
            <span class="item-title" ${p.type === 'Instructor Prompt' ? 'style="color:var(--accent);"' : ''}>${p.type} (${p.author})</span>
            <div class="item-meta" style="margin-bottom:8px;"><span>${p.text.substring(0, 50)}...</span></div>
            <div style="display:flex; gap:6px;">
                <button class="card-action-btn" onclick="savePostToKB('${p.author.replace(' ', '')}', '${p.text.replace(/'/g, "\\'")}')">+ KB</button>
                <button class="card-action-btn yd" onclick="loadPostToDraft('${p.author.replace(/'/g, "\\'")}', '${p.text.replace(/'/g, "\\'")}')">📝 DRAFT</button>
            </div>
        </div>
    `).join('');
};

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
    if(!prompt) { log("[WARN] Agent prompt is empty.", "log-warn"); return; }
    document.getElementById('thinkingOverlay').style.display = 'flex';
    log(`[AGENT] Routing reasoning request to ai-assistant.service.js...`, "log-sys");

    // System instruction: force strictly-formatted JSON array of steps
    const agentSystemPrompt = `You are an autonomous browser action planner. Output ONLY a valid JSON array (no commentary).
Each array element must be an object with fields:
- type: one of [\"NAVIGATE\", \"CLICK\", \"TYPE\", \"WAIT\", \"SCROLL\", \"SUBMIT\", \"MAP\"]
- selector: CSS selector (when applicable)
- index: 0-based index when multiple elements match (optional)
- text: text to type for TYPE
- url: for NAVIGATE
- ms: milliseconds to wait for WAIT
- key/value: for MAP
Return only the JSON array. Example:\n[ {"type":"NAVIGATE","url":"https://yellowdig.com"}, {"type":"CLICK","selector":"button.create-post"} ]`;

    try {
        const raw = await callGeminiAPI(prompt, agentSystemPrompt);
        document.getElementById('thinkingOverlay').style.display = 'none';

        let steps = null;
        try { steps = JSON.parse(raw); } catch (parseErr) {
            // fallback: extract first JSON array found in text
            const s = raw.indexOf('[');
            const e = raw.lastIndexOf(']');
            if (s >= 0 && e > s) {
                try { steps = JSON.parse(raw.substring(s, e+1)); } catch (_) { steps = null; }
            }
        }

        if (!Array.isArray(steps)) {
            log(`[AGENT] Invalid plan received from model. Expected JSON array.`, 'log-err');
            log(`[AGENT RAW] ${raw}`, 'log-err');
            return;
        }

        log("[AGENT] MISSION PLAN COMPILED: sending steps to extension bridge...", "log-sys");
        for (let i = 0; i < steps.length; i++) {
            const step = steps[i] || {};
            try {
                if (extBridge.isActive) {
                    // send step directly; background should forward to content script
                    await extBridge.send('AGENT_ACTION', step);
                    log(`AGENT >> Sent step ${i+1}/${steps.length}: ${step.type} ${step.selector||step.url||''}`, 'log-sys');
                } else {
                    // simulation mode
                    log(`AGENT >> (SIM) ${JSON.stringify(step)}`, 'log-bucket');
                }
                // small settle time (use step.ms if provided)
                await new Promise(r => setTimeout(r, (step.ms && Number(step.ms)) || 300));
            } catch (err) {
                log(`[AGENT] Failed to send/execute step ${i+1}: ${err.message}`, 'log-err');
            }
        }
    } catch (e) {
        document.getElementById('thinkingOverlay').style.display = 'none';
        log(`[AGENT] Critical Fault: ${e.message}`, "log-err");
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
