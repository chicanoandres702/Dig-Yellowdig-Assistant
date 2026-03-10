// KB and Patterns service for web-assistant (extracted from web-assistant.js)
// This module centralizes knowledge-base and pattern persistence/sync logic.
// Import small helpers directly so the module is self-contained when possible.
import { getKnowledgeBase, saveKnowledgeBase } from "../../../utils.js";
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc } from "../../../firebase-firestore.js";
import { showToast } from "./ui.service.js";

window._lastPatternSnapshot = window._lastPatternSnapshot || null;

export async function initKnowledgeSync() {
    const cu = (typeof currentUser !== 'undefined') ? currentUser : (window.currentUser || null);
    const theDb = (typeof db !== 'undefined') ? db : (window.db || null);
    if (!cu) return;
    if (!theDb) { log('Firestore not initialized; skipping knowledge sync.', 'log-err'); return; }
    const knowledgeCol = collection(db, 'artifacts', appId, 'users', currentUser.uid, 'knowledge');
    onSnapshot(knowledgeCol, (snap) => {
        try {
            try { window.knowledgeCache = window.knowledgeCache || []; } catch (e) { }
            window.knowledgeCache.length = 0;
            const kbUI = document.getElementById('kbHierarchy');
            const kbSelector = document.getElementById('kbContextSelector');

            if (snap.empty) {
                if (kbSelector) kbSelector.innerHTML = '<span style="font-size:0.55rem; color:var(--text-muted);">No buckets available.</span>';
                return;
            }

            let html = '';
            let selectorHtml = '';
            const buckets = {};
            snap.forEach(d => {
                const data = d.data();
                try { data.cloudId = d.id; } catch (e) { /* ignore */ }
                try { window.knowledgeCache = window.knowledgeCache || []; window.knowledgeCache.push(data); } catch (e) { }
                if (!buckets[data.classId]) buckets[data.classId] = {};
                if (!buckets[data.classId][data.week]) buckets[data.classId][data.week] = [];
                buckets[data.classId][data.week].push(data);
            });

            for (const classId in buckets) {
                html += `<span class="section-header">${classId} Bucket</span>`;
                for (const week in buckets[classId]) {
                    html += `<div style="margin-left:8px;"><div style="display:flex;justify-content:space-between;align-items:center;"><span class="sub-header">${week}</span><div style="display:flex;gap:6px;"><button class="action-btn" data-action="kb-view-bucket" data-class="${classId}" data-week="${week}">View</button><button class="action-btn" data-action="kb-rename-bucket" data-class="${classId}" data-week="${week}">Rename</button><button class="action-btn" data-action="kb-delete-bucket" data-class="${classId}" data-week="${week}">Delete</button></div></div>`;
                    selectorHtml += `<div class="kb-checkbox-label" data-bucket="${classId}|${week}">${classId} ${week}</div>`;

                    const items = buckets[classId][week] || [];
                    items.forEach((item, idx) => {
                        const itemId = item.timestamp || ('local_' + idx + '_' + Math.random().toString(36).slice(2,8));
                        const safeTitle = encodeURIComponent(item.title || '');
                        html += `<div class="item-card" data-bucket="${classId}|${week}" data-cloudid="${item.cloudId || ''}" data-ts="${item.timestamp || ''}" data-title="${safeTitle}" id="kbitem-${itemId}">`;
                        html += `<span class="item-title">${item.title || 'Untitled'}</span>`;
                        html += `<div class="item-meta"><span>/${item.bucket || ''}</span><span class="badge ${item.cloudId ? 'badge-bucket' : 'badge-offline'}">${item.cloudId ? 'Grounded' : 'Local'}</span></div>`;
                        html += `<div style="margin-top:8px; display:flex; gap:6px;"><button class="card-action-btn" data-action="kb-view-item" data-class="${classId}" data-week="${week}" data-cloudid="${item.cloudId || ''}" data-ts="${item.timestamp || ''}">View</button><button class="card-action-btn" data-action="kb-rename-item" data-class="${classId}" data-week="${week}" data-cloudid="${item.cloudId || ''}" data-ts="${item.timestamp || ''}">Rename</button><button class="card-action-btn" data-action="kb-delete-item" data-class="${classId}" data-week="${week}" data-cloudid="${item.cloudId || ''}" data-ts="${item.timestamp || ''}">Delete</button></div>`;
                        html += `</div>`;
                    });
                    html += `</div>`;
                }
            }
            if (kbUI) kbUI.innerHTML = html;
            if (kbSelector) kbSelector.innerHTML = selectorHtml;
        } catch (e) {
            log('[KB SYNC] onSnapshot handler error: ' + (e && e.message ? e.message : String(e)), 'log-warn');
        }
    });
}

export function loadLocalKnowledgeToUI() {
    try {
        const kb = getKnowledgeBase();
        try { window.knowledgeCache = window.knowledgeCache || []; window.knowledgeCache.length = 0; } catch (e) {}
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
                html += `<div style="margin-left:8px;"><div style="display:flex;justify-content:space-between;align-items:center;"><span class="sub-header">${week}</span><div style="display:flex;gap:6px;"><button class="action-btn" data-action="kb-view-bucket" data-class="${classId}" data-week="${week}">View</button><button class="action-btn" data-action="kb-rename-bucket" data-class="${classId}" data-week="${week}">Rename</button><button class="action-btn" data-action="kb-delete-bucket" data-class="${classId}" data-week="${week}">Delete</button></div></div>`;
                selectorHtml += `<div class="kb-checkbox-label" data-bucket="${classId}|${week}">${classId} ${week}</div>`;
                (kb[classId][week] || []).forEach((item, idx) => {
                    try { window.knowledgeCache = window.knowledgeCache || []; window.knowledgeCache.push(item); } catch (e) {}
                    const itemId = item.timestamp || ('local_' + idx + '_' + Math.random().toString(36).slice(2,8));
                    const safeTitle = encodeURIComponent(item.title || '');
                    html += `<div class="item-card" data-bucket="${classId}|${week}" data-cloudid="${item.cloudId || ''}" data-ts="${item.timestamp || ''}" data-title="${safeTitle}" id="kbitem-${itemId}"><span class="item-title">${item.title}</span><div class="item-meta"><span>/${item.bucket}</span><span class="badge badge-offline">Local</span></div><div style="margin-top:8px; display:flex; gap:6px;"><button class="card-action-btn" data-action="kb-view-item" data-class="${classId}" data-week="${week}" data-cloudid="${item.cloudId || ''}" data-ts="${item.timestamp || ''}">View</button><button class="card-action-btn" data-action="kb-rename-item" data-class="${classId}" data-week="${week}" data-cloudid="${item.cloudId || ''}" data-ts="${item.timestamp || ''}">Rename</button><button class="card-action-btn" data-action="kb-delete-item" data-class="${classId}" data-week="${week}" data-cloudid="${item.cloudId || ''}" data-ts="${item.timestamp || ''}">Delete</button></div></div>`;
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

export async function syncLocalKnowledgeToCloud() {
    const theDb = (typeof db !== 'undefined') ? db : (window.db || null);
    const cu = (typeof currentUser !== 'undefined') ? currentUser : (window.currentUser || null);
    if (!theDb || !cu) {
        log('[KB SYNC] No Firestore or authenticated user available; skipping local->cloud sync.', 'log-sys');
        return;
    }
    try {
        const kb = getKnowledgeBase();
        if (!kb || Object.keys(kb).length === 0) {
            log('[KB SYNC] No local knowledge base items to sync.', 'log-sys');
            return;
        }
        const knowledgeCol = collection(theDb, 'artifacts', appId, 'users', cu.uid, 'knowledge');
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
        saveKnowledgeBase(kb);
        if (syncedCount > 0) log(`[KB SYNC] Completed: ${syncedCount} item(s) synced to cloud.`, 'log-success');
    } catch (e) {
        log('[KB SYNC] Unexpected error: ' + (e && e.message ? e.message : String(e)), 'log-err');
    }
}

export async function syncLocalPatternsToCloud() {
    const theDb = (typeof db !== 'undefined') ? db : (window.db || null);
    const cu = (typeof currentUser !== 'undefined') ? currentUser : (window.currentUser || null);
    if (!theDb || !cu) {
        log('[PATTERN SYNC] No Firestore or authenticated user available; skipping local->cloud sync.', 'log-sys');
        return;
    }
    try {
        const arr = (typeof loadBucketPatterns === 'function') ? loadBucketPatterns() : (window.loadBucketPatterns ? window.loadBucketPatterns() : []);
        if (!arr || arr.length === 0) {
            log('[PATTERN SYNC] No local patterns to sync.', 'log-sys');
            return;
        }
        const patternsCol = collection(theDb, 'artifacts', appId, 'users', cu.uid, 'patterns');
        let syncedCount = 0;
        for (let i = 0; i < arr.length; i++) {
            const p = arr[i];
            if (!p || p.cloudId) continue;
            try {
                const docRef = await addDoc(patternsCol, { pattern: p.pattern, target: p.target || '', timestamp: p.timestamp || Date.now() });
                p.cloudId = docRef.id;
                syncedCount++;
                log(`[PATTERN SYNC] Uploaded pattern "${p.pattern}" => cloud id=${docRef.id}`,'log-bucket');
            } catch (err) {
                log('[PATTERN SYNC] Failed to upload pattern: ' + (err && err.message ? err.message : String(err)), 'log-warn');
            }
        }
        if (syncedCount > 0) {
            if (typeof saveBucketPatterns === 'function') saveBucketPatterns(arr);
            else if (window.saveBucketPatterns) window.saveBucketPatterns(arr);
        }
        if (syncedCount > 0) log(`[PATTERN SYNC] Completed: ${syncedCount} pattern(s) synced to cloud.`, 'log-success');
    } catch (e) {
        log('[PATTERN SYNC] Unexpected error: ' + (e && e.message ? e.message : String(e)), 'log-err');
    }
}

export function initPatternsSync() {
    const theDb = (typeof db !== 'undefined') ? db : (window.db || null);
    const cu = (typeof currentUser !== 'undefined') ? currentUser : (window.currentUser || null);
    if (!theDb || !cu) {
        log('[PATTERN SYNC] Firestore or user not available; patterns realtime sync skipped.', 'log-err');
        return;
    }
    try {
        const patternsCol = collection(theDb, 'artifacts', appId, 'users', cu.uid, 'patterns');
        onSnapshot(patternsCol, (snap) => {
            try {
                const cloud = [];
                snap.forEach(d => {
                    const data = d.data() || {};
                    cloud.push({ pattern: data.pattern || '', target: data.target || '', cloudId: d.id, timestamp: data.timestamp || data.updatedAt || Date.now() });
                });

                const local = (typeof loadBucketPatterns === 'function') ? loadBucketPatterns() : (window.loadBucketPatterns ? window.loadBucketPatterns() : []);
                const merged = [];
                const seenCloudIds = new Set();

                for (const lp of local) {
                    if (!lp) continue;
                    if (lp && lp.cloudId) {
                        const cp = cloud.find(c => c.cloudId === lp.cloudId);
                        if (cp) {
                            merged.push({ pattern: cp.pattern, target: cp.target, cloudId: cp.cloudId, timestamp: cp.timestamp });
                            seenCloudIds.add(cp.cloudId);
                            continue;
                        }
                    }
                    const match = cloud.find(c => c.pattern === (lp && lp.pattern) && c.target === (lp && lp.target));
                    if (match) {
                        merged.push({ pattern: match.pattern, target: match.target, cloudId: match.cloudId, timestamp: match.timestamp });
                        seenCloudIds.add(match.cloudId);
                        continue;
                    }
                    const patternOnly = cloud.find(c => c.pattern === (lp && lp.pattern) && c.target !== (lp && lp.target));
                    if (patternOnly) {
                        merged.push({ pattern: patternOnly.pattern, target: patternOnly.target, cloudId: patternOnly.cloudId, timestamp: patternOnly.timestamp, conflict: { localTarget: lp.target || '', cloudTarget: patternOnly.target || '' } });
                        seenCloudIds.add(patternOnly.cloudId);
                        continue;
                    }
                    merged.push(lp);
                }

                for (const cp of cloud) {
                    if (!seenCloudIds.has(cp.cloudId)) merged.push(cp);
                }

                if (typeof saveBucketPatterns === 'function') saveBucketPatterns(merged);
                else if (window.saveBucketPatterns) window.saveBucketPatterns(merged);
                try { if (typeof updatePatternListUI === 'function') updatePatternListUI(); } catch (e) { /* ignore UI update errors */ }
            } catch (e) { log('[PATTERN SYNC] onSnapshot handler error: ' + (e && e.message ? e.message : String(e)), 'log-warn'); }
        });
    } catch (e) {
        log('[PATTERN SYNC] Failed to initialize realtime sync: ' + (e && e.message ? e.message : String(e)), 'log-warn');
    }
}

export function pushPatternsSnapshot() {
    try { window._lastPatternSnapshot = JSON.stringify((typeof loadBucketPatterns === 'function') ? loadBucketPatterns() : (window.loadBucketPatterns ? window.loadBucketPatterns() : []) || []); } catch (e) { window._lastPatternSnapshot = null; }
}

export function closePatternConflictModal() {
    try {
        const modal = document.getElementById('patternConflictModal');
        if (!modal) return;
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
        delete modal.dataset.idx;
    } catch (e) { log('[KB] closeConflictModal error: ' + (e && e.message ? e.message : String(e)), 'log-err'); }
}

export function openPatternConflictModal(idx, localTarget, cloudTarget, cloudId, patternStr) {
    try {
        const modal = document.getElementById('patternConflictModal');
        if (!modal) return;
        pushPatternsSnapshot();
        modal.dataset.idx = String(Number(idx));
        const patEl = document.getElementById('conflictPatternText'); if (patEl) patEl.innerText = patternStr || '';
        const localEl = document.getElementById('conflictLocalTarget'); if (localEl) localEl.innerText = localTarget || '';
        const cloudEl = document.getElementById('conflictCloudTarget'); if (cloudEl) cloudEl.innerText = cloudTarget || '';
        const ta = document.getElementById('conflictMergedEdit'); if (ta) ta.value = (localTarget && localTarget.length) ? localTarget : (cloudTarget || '');
        modal.style.display = 'flex'; modal.setAttribute('aria-hidden', 'false');
        const undoBtn = document.getElementById('btnUndoPatternChange'); if (undoBtn) undoBtn.disabled = !window._lastPatternSnapshot;
    } catch (e) { log('[KB] openConflictModal error: ' + (e && e.message ? e.message : String(e)), 'log-err'); }
}

export async function applyResolveChoice(idx, newTarget, keepCloudId) {
    try {
        const arr = (typeof loadBucketPatterns === 'function') ? loadBucketPatterns() : (window.loadBucketPatterns ? window.loadBucketPatterns() : []) || [];
        if (!arr || idx < 0 || idx >= arr.length) { showToast('Pattern not found', 'error'); return; }
        const prev = JSON.stringify(arr);
        const p = arr[idx];
        p.target = newTarget || '';
        if (keepCloudId && p.cloudId) p.cloudId = p.cloudId;
        p.timestamp = Date.now();
        if (p.conflict) delete p.conflict;
        saveBucketPatterns(arr);
        if (typeof updatePatternListUI === 'function') updatePatternListUI();
        const theDb = (typeof db !== 'undefined') ? db : (window.db || null);
        const cu = (typeof currentUser !== 'undefined') ? currentUser : (window.currentUser || null);
        if (theDb && cu) {
            try {
                if (p.cloudId) {
                    const ref = doc(theDb, 'artifacts', appId, 'users', cu.uid, 'patterns', p.cloudId);
                    await updateDoc(ref, { pattern: p.pattern, target: p.target, timestamp: p.timestamp });
                } else {
                    const patternsCol = collection(theDb, 'artifacts', appId, 'users', cu.uid, 'patterns');
                    const docRef = await addDoc(patternsCol, { pattern: p.pattern, target: p.target, timestamp: p.timestamp });
                    p.cloudId = docRef.id;
                }
            } catch (e) { log('[KB] Cloud update/create failed during resolve: ' + (e && e.message ? e.message : String(e)), 'log-warn'); }
        }
        window._lastPatternSnapshot = prev;
    } catch (e) { log('[KB] applyResolveChoice error: ' + (e && e.message ? e.message : String(e)), 'log-err'); }
}

export function undoPatternChange() {
    try {
        if (!window._lastPatternSnapshot) { showToast('No undo available', 'warn'); return; }
        const prev = JSON.parse(window._lastPatternSnapshot || '[]');
        saveBucketPatterns(prev);
        if (typeof updatePatternListUI === 'function') updatePatternListUI();
        window._lastPatternSnapshot = null;
        showToast('Undo applied', 'success');
    } catch (e) { showToast('Undo failed', 'error'); log('[KB] undo failed: ' + (e && e.message ? e.message : String(e)), 'log-err'); }
}

// Attach modal button handlers if present
try {
    const btnClose = document.getElementById('btnCloseConflictModal'); if (btnClose) btnClose.addEventListener('click', () => closePatternConflictModal());
    const btnAcceptCloud = document.getElementById('btnAcceptCloud'); if (btnAcceptCloud) btnAcceptCloud.addEventListener('click', async () => {
        try {
            const modal = document.getElementById('patternConflictModal'); if (!modal) return;
            const idx = Number(modal.dataset.idx);
            const arr = loadBucketPatterns() || [];
            const p = arr[idx]; if (!p || !p.conflict) return;
            const cloudT = p.conflict.cloudTarget || p.target || '';
            await applyResolveChoice(idx, cloudT, true);
            closePatternConflictModal();
            showToast('Accepted cloud target', 'success');
        } catch (e) { log('[KB] Accept cloud failed: ' + (e && e.message ? e.message : String(e)), 'log-err'); }
    });

    const btnAcceptLocal = document.getElementById('btnAcceptLocal'); if (btnAcceptLocal) btnAcceptLocal.addEventListener('click', async () => {
        try {
            const modal = document.getElementById('patternConflictModal'); if (!modal) return;
            const idx = Number(modal.dataset.idx);
            const arr = loadBucketPatterns() || [];
            const p = arr[idx]; if (!p || !p.conflict) return;
            const localT = p.conflict.localTarget || p.target || '';
            await applyResolveChoice(idx, localT, false);
            closePatternConflictModal();
            showToast('Kept local target and pushed to cloud', 'success');
        } catch (e) { log('[KB] Accept local failed: ' + (e && e.message ? e.message : String(e)), 'log-err'); }
    });

    const btnMergeSave = document.getElementById('btnMergeSave'); if (btnMergeSave) btnMergeSave.addEventListener('click', async () => {
        try {
            const modal = document.getElementById('patternConflictModal'); if (!modal) return;
            const idx = Number(modal.dataset.idx);
            const ta = document.getElementById('conflictMergedEdit'); const merged = ta ? ta.value.trim() : '';
            if (!merged) return;
            await applyResolveChoice(idx, merged, false);
            closePatternConflictModal();
            showToast('Merged target saved', 'success');
        } catch (e) { log('[KB] Merge save failed: ' + (e && e.message ? e.message : String(e)), 'log-err'); }
    });

    const btnUndo = document.getElementById('btnUndoPatternChange'); if (btnUndo) btnUndo.addEventListener('click', () => undoPatternChange());
} catch (e) { /* ignore attach errors */ }

// Save to bucket: supports cloud (Firestore) when authenticated and localStorage fallback.
export async function saveToBucket(bucket, title, content) {
    // prefer window-level sessionContext so this module doesn't rely on import order
    const session = (typeof sessionContext !== 'undefined') ? sessionContext : (window.sessionContext || {});
    let targetClass = session.classId || 'Unknown Class';
    let targetWeek = session.week || 'Week 1';
    try {
        const selected = Array.from(document.querySelectorAll('.kb-checkbox-label.selected')).map(el => el.getAttribute('data-bucket'));
        if (selected && selected.length > 0) {
            const parts = (selected[0] || '').split('|');
            if (parts && parts.length >= 2) {
                targetClass = parts[0];
                targetWeek = parts[1];
            }
        }
    } catch (e) { /* ignore DOM not ready */ }

    const theDb = (typeof db !== 'undefined') ? db : (window.db || null);
    const cu = (typeof currentUser !== 'undefined') ? currentUser : (window.currentUser || null);

    // Cloud save path
    if (theDb && cu) {
        try {
            const knowledgeCol = collection(theDb, 'artifacts', appId, 'users', cu.uid, 'knowledge');
            await addDoc(knowledgeCol, { classId: targetClass, week: targetWeek, bucket, title, content, timestamp: Date.now() });
            log(`[BUCKET] Saved to Cloud: /${targetClass}/${targetWeek}/${bucket}`, "log-bucket");
            // update session context to reflect actual save location
            try { if (window.sessionContext) { window.sessionContext.classId = targetClass; window.sessionContext.week = targetWeek; } } catch (__) {}
            try { const ctxEl = document.getElementById('ctxPath'); if (ctxEl) ctxEl.innerText = `/${window.sessionContext.classId}/${window.sessionContext.week}`; } catch (__) {}
            return;
        } catch (e) {
            log('[BUCKET] Cloud save failed, falling back to local store: ' + (e && e.message ? e.message : String(e)), 'log-warn');
            // fall through to local save
        }
    }

    // Local fallback
    try {
        const kb = getKnowledgeBase();
        if (!kb[targetClass]) kb[targetClass] = {};
        if (!kb[targetClass][targetWeek]) kb[targetClass][targetWeek] = [];
        const item = { classId: targetClass, week: targetWeek, bucket, title, content, timestamp: Date.now() };
        kb[targetClass][targetWeek].push(item);
        saveKnowledgeBase(kb);
        try { window.knowledgeCache = window.knowledgeCache || []; window.knowledgeCache.push(item); } catch (e) { }
        log(`[BUCKET] Saved locally: /${targetClass}/${targetWeek}/${bucket}`, "log-bucket");

        // Update the visible KB UI if present
        try {
            const kbUI = document.getElementById('kbHierarchy');
            const kbSelector = document.getElementById('kbContextSelector');
            if (kbUI && kbSelector) {
                let html = '';
                let selectorHtml = '';
                for (const classId in kb) {
                    html += `<span class="section-header">${classId} Bucket</span>`;
                    for (const week in kb[classId]) {
                        html += `<div style="margin-left:8px;"><span class="sub-header">${week}</span>`;
                        selectorHtml += `<div class="kb-checkbox-label" data-bucket="${classId}|${week}">${classId} ${week}</div>`;
                        kb[classId][week].forEach(it => {
                            html += `<div class="item-card"><span class="item-title">${it.title}</span><div class="item-meta"><span>/${it.bucket}</span><span class="badge badge-offline">Local</span></div></div>`;
                        });
                        html += `</div>`;
                    }
                }
                kbUI.innerHTML = html;
                kbSelector.innerHTML = selectorHtml;
                try {
                    const sel = kbSelector.querySelector(`.kb-checkbox-label[data-bucket="${targetClass}|${targetWeek}"]`);
                    if (sel) {
                        sel.classList.add('kb-highlight');
                        sel.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        setTimeout(() => sel.classList.remove('kb-highlight'), 2200);
                    }
                } catch (e) { /* ignore highlight errors */ }
            }
        } catch (e) { /* non-blocking UI update */ }
    } catch (e) {
        log('[KB] Local save failed: ' + (e && e.message ? e.message : String(e)), 'log-err');
    }
}

// Expose for backward compatibility
try { if (typeof window !== 'undefined') window.saveToBucket = saveToBucket; } catch (e) {}

// Pattern helpers (moved from web-assistant.js)
function _now() { return Date.now(); }

export function normalizePatternEntry(raw) {
    try {
        if (!raw) return null;
        if (typeof raw === 'string') {
            const s = raw.trim();
            const inferredMode = s.startsWith('re:') ? 'regex' : (s.startsWith('path:') ? 'path' : 'auto');
            return { pattern: s, target: '', mode: inferredMode, caseSensitive: false, priority: 0, description: '', timestamp: _now() };
        }
        const p = {};
        p.pattern = typeof raw.pattern !== 'undefined' ? String(raw.pattern) : (typeof raw.p === 'string' ? raw.p : '');
        p.target = typeof raw.target !== 'undefined' ? String(raw.target) : (typeof raw.t === 'string' ? raw.t : '');
        if (raw.mode) p.mode = raw.mode;
        else if (p.pattern && p.pattern.startsWith('re:')) p.mode = 'regex';
        else if (p.pattern && p.pattern.startsWith('path:')) p.mode = 'path';
        else p.mode = 'auto';
        p.caseSensitive = typeof raw.caseSensitive === 'boolean' ? raw.caseSensitive : false;
        p.priority = Number.isFinite(Number(raw.priority)) ? Number(raw.priority) : 0;
        p.description = raw.description || '';
        p.cloudId = raw.cloudId || raw.id || null;
        p.timestamp = raw.timestamp || raw.updatedAt || _now();
        return p;
    } catch (e) { return null; }
}

export function loadBucketPatterns() {
    try {
        const raw = localStorage.getItem('dig_bucket_patterns') || '[]';
        const arr = JSON.parse(raw);
        if (!Array.isArray(arr)) return [];
        const normalized = [];
        for (let i = 0; i < arr.length; i++) {
            const n = normalizePatternEntry(arr[i]);
            if (n) normalized.push(n);
        }
        try {
            const canonical = JSON.stringify(normalized || []);
            if (canonical !== JSON.stringify(arr)) {
                saveBucketPatterns(normalized);
            }
        } catch (e) { /* ignore save errors */ }
        return normalized;
    } catch (e) { return []; }
}

export function saveBucketPatterns(arr) {
    try { localStorage.setItem('dig_bucket_patterns', JSON.stringify(arr || [])); } catch (e) {}
}

export function addBucketPattern(pattern, target) {
    try {
        const raw = { pattern: String(pattern), target: String(target) };
        const n = normalizePatternEntry(raw);
        const arr = loadBucketPatterns();
        arr.push(n);
        saveBucketPatterns(arr);
        return arr;
    } catch (e) { return null; }
}

export function getBucketPatterns() { return loadBucketPatterns(); }

export function parseTarget(target) {
    if (!target) return { classId: null, week: null };
    const sep = target.includes('|') ? '|' : (target.includes('/') ? '/' : '|');
    const parts = String(target).split(sep);
    return { classId: (parts[0] || '').trim(), week: (parts[1] || 'Week 1').trim() };
}

export function matchPatternAgainstUrl(url, pat) {
    try {
        if (!url || !pat || !pat.pattern) return { matched: false };
        const pstr = String(pat.pattern || '');
        const mode = pat.mode || (pstr.startsWith('re:') ? 'regex' : (pstr.startsWith('path:') ? 'path' : 'auto'));
        const caseSensitive = !!pat.caseSensitive;
        const priority = Number.isFinite(Number(pat.priority)) ? Number(pat.priority) : 0;
        const fullUrl = String(url);
        if (mode === 'regex' || pstr.startsWith('re:')) {
            let raw = pstr.startsWith('re:') ? pstr.substring(3) : pstr;
            let patternText = raw;
            let flags = '';
            if (patternText.startsWith('/')) {
                const lastSlash = patternText.lastIndexOf('/');
                if (lastSlash > 0) {
                    flags = patternText.substring(lastSlash + 1);
                    patternText = patternText.substring(1, lastSlash);
                }
            }
            try {
                const re = new RegExp(patternText, flags);
                const ok = re.test(fullUrl);
                if (ok) {
                    const score = 100 + (pstr.length / 10) + priority;
                    return { matched: true, mode: 'regex', score, matchedText: patternText, caseSensitive: !!flags.match(/i/), priority };
                }
            } catch (e) {
                return { matched: false, error: 'invalid-regex' };
            }
            return { matched: false };
        }
        if (mode === 'path' || pstr.startsWith('path:')) {
            const raw = pstr.startsWith('path:') ? pstr.substring(5) : pstr;
            try {
                const u = new URL(fullUrl);
                const segs = u.pathname.split('/').filter(Boolean);
                const patternSegs = raw.split('/').filter(Boolean);
                if (patternSegs.length === 0) return { matched: false };
                for (let i = 0; i <= segs.length - patternSegs.length; i++) {
                    let ok = true;
                    for (let j = 0; j < patternSegs.length; j++) {
                        const a = caseSensitive ? segs[i + j] : segs[i + j].toLowerCase();
                        const b = caseSensitive ? patternSegs[j] : patternSegs[j].toLowerCase();
                        if (a !== b) { ok = false; break; }
                    }
                    if (ok) {
                        const score = 50 + (pstr.length / 10) + priority;
                        return { matched: true, mode: 'path', score, matchedText: patternSegs.join('/'), caseSensitive, priority };
                    }
                }
            } catch (e) { return { matched: false }; }
            return { matched: false };
        }
        const urlToCheck = caseSensitive ? fullUrl : fullUrl.toLowerCase();
        const needle = caseSensitive ? pstr : pstr.toLowerCase();
        if (needle && urlToCheck.includes(needle)) {
            const score = 10 + (pstr.length / 10) + priority;
            return { matched: true, mode: 'substring', score, matchedText: pstr, caseSensitive, priority };
        }
        try {
            const u2 = new URL(fullUrl);
            const segs2 = u2.pathname.split('/').filter(Boolean).map(s => caseSensitive ? s : s.toLowerCase());
            const needleSeg = caseSensitive ? pstr : pstr.toLowerCase();
            if (segs2.includes(needleSeg)) {
                const score = 10 + (pstr.length / 10) + priority;
                return { matched: true, mode: 'substring', score, matchedText: needleSeg, caseSensitive, priority };
            }
        } catch (e) { }
        return { matched: false };
    } catch (e) { return { matched: false }; }
}

export function findBucketByUrl(url) {
    if (!url) return null;
    try {
        const patterns = loadBucketPatterns();
        let best = null;
        for (let i = 0; i < patterns.length; i++) {
            const p = patterns[i];
            try {
                const res = matchPatternAgainstUrl(url, p);
                if (res && res.matched) {
                    const target = parseTarget(p.target || '');
                    const candidate = Object.assign({ patternIndex: i, cloudId: p.cloudId || null }, res, { pattern: p.pattern, target: p.target, classId: target.classId, week: target.week });
                    if (!candidate.classId) {
                        // if no explicit target, skip until maybe KB fallback
                    }
                    if (!best) best = candidate;
                    else {
                        if ((candidate.score || 0) > (best.score || 0)) best = candidate;
                        else if ((candidate.score || 0) === (best.score || 0)) {
                            const pPri = Number(p.priority || 0); const bPri = Number(patterns[best.patternIndex].priority || 0);
                            if (pPri > bPri) best = candidate;
                            else {
                                const pTs = Number(p.timestamp || 0); const bTs = Number(patterns[best.patternIndex].timestamp || 0);
                                if (pTs > bTs) best = candidate;
                            }
                        }
                    }
                }
            } catch (e) { /* ignore per-pattern errors */ }
        }
        if (best && best.classId) return { classId: best.classId, week: best.week || 'Week 1', matchedPattern: best.pattern, matchMeta: { mode: best.mode, score: best.score, priority: best.priority, cloudId: best.cloudId } };
    } catch (e) { /* ignore */ }
    try {
        const u = new URL(url);
        const segs = u.pathname.split('/').filter(Boolean).map(s => decodeURIComponent(s).toLowerCase());
        const kb = getKnowledgeBase();
        if (kb && typeof kb === 'object') {
            for (const seg of segs) {
                for (const classId of Object.keys(kb)) {
                    if (!classId) continue;
                    if (classId.toLowerCase() === seg || classId.toLowerCase().includes(seg)) {
                        const weeks = Object.keys(kb[classId] || {});
                        return { classId, week: weeks && weeks.length ? weeks[0] : 'Week 1' };
                    }
                }
                for (const classId of Object.keys(kb)) {
                    const weeks = Object.keys(kb[classId] || {});
                    for (const wk of weeks) {
                        if (!wk) continue;
                        if (wk.toLowerCase() === seg || wk.toLowerCase().includes(seg)) return { classId, week: wk };
                    }
                }
            }
        }
    } catch (e) { /* ignore */ }
    return null;
}

export function selectBucketInUI(classId, week) {
    try {
        if (!classId) return false;
        const selEl = document.querySelector(`.kb-checkbox-label[data-bucket="${classId}|${week}"]`);
        if (selEl) {
            document.querySelectorAll('.kb-checkbox-label.selected').forEach(s => s.classList.remove('selected'));
            selEl.classList.add('selected');
            sessionContext.classId = classId; sessionContext.week = week || sessionContext.week;
            try { const ctxEl = document.getElementById('ctxPath'); if (ctxEl) ctxEl.innerText = `/${sessionContext.classId}/${sessionContext.week}`; } catch (e) {}
            return true;
        }
    } catch (e) {}
    return false;
}

export function updateCurrentBucketDisplay() {
    try {
        const el = document.getElementById('currentBucketDisplay');
        const ctxEl = document.getElementById('ctxPath');
        const txt = `/${sessionContext.classId}/${sessionContext.week}`;
        if (el) el.innerText = txt;
        if (ctxEl) ctxEl.innerText = txt;
    } catch (e) { /* ignore */ }
}

export function renderManualBucketControl() {
    try {
        const parent = document.getElementById('kbContextSelector');
        if (!parent) return;
        if (document.getElementById('manualBucketControl')) return;
        const wrapper = document.createElement('div');
        wrapper.id = 'manualBucketControl';
        wrapper.className = 'card';
        wrapper.innerHTML = `
            <div class="card-header"><span class="section-header">Current Bucket</span></div>
            <div class="card-body manual-bucket-body">
                <div class="flex gap-6 items-center mb-8">
                    <div id="currentBucketDisplay" class="ctx-path">/${sessionContext.classId}/${sessionContext.week}</div>
                    <input id="manualClassInput" class="form-input flex-1" placeholder="Class e.g. ARCH-202" />
                    <input id="manualWeekInput" class="form-input w-120" placeholder="Week e.g. Week 3" />
                    <button id="btnSetBucketManual" class="action-btn">Set</button>
                    <button id="btnAutoFixBucket" class="action-btn">AI Fix</button>
                </div>
            </div>
        `;
        try {
            if (parent.id === 'patternManagerContainer') parent.appendChild(wrapper);
            else parent.parentNode && parent.parentNode.insertBefore(wrapper, parent.nextSibling);
        } catch (e) { parent.parentNode && parent.parentNode.insertBefore(wrapper, parent.nextSibling); }

        const setBtn = document.getElementById('btnSetBucketManual');
        if (setBtn) setBtn.addEventListener('click', () => {
            try {
                const c = (document.getElementById('manualClassInput') && document.getElementById('manualClassInput').value || '').trim();
                const w = (document.getElementById('manualWeekInput') && document.getElementById('manualWeekInput').value || '').trim() || 'Week 1';
                if (!c) { alert('Please enter a class name (e.g. ARCH-202)'); return; }
                const kb = getKnowledgeBase();
                if (!kb[c]) kb[c] = {};
                if (!kb[c][w]) kb[c][w] = [];
                saveKnowledgeBase(kb);
                sessionContext.classId = c; sessionContext.week = w;
                try { localStorage.setItem('dig_last_class', c); localStorage.setItem('dig_last_week', w); } catch (e) {}
                updateCurrentBucketDisplay();
                selectBucketInUI(c, w);
                loadLocalKnowledgeToUI();
                log(`[KB] Manually set current bucket: /${c}/${w}`, 'log-bucket');
            } catch (e) { log('[KB] Manual set failed: ' + (e && e.message ? e.message : String(e)), 'log-err'); }
        });

        const aiBtn = document.getElementById('btnAutoFixBucket');
        if (aiBtn) aiBtn.addEventListener('click', async () => {
            try {
                const overlay = document.getElementById('thinkingOverlay'); if (overlay) overlay.style.display = 'flex';
                const hint = (typeof window !== 'undefined' && typeof window.getActiveTabClassHint === 'function') ? await window.getActiveTabClassHint().catch(() => null) : null;
                const url = hint ? (hint.url || hint.title || '') : (window.location && window.location.href ? window.location.href : '');
                const title = hint ? (hint.title || '') : (document.title || '');
                const kb = getKnowledgeBase() || {}; const known = [];
                for (const cls of Object.keys(kb)) { known.push({ classId: cls, weeks: Object.keys(kb[cls] || {}) }); }
                const header = hint ? (hint.header || '') : '';
                const meta = hint ? (hint.meta || '') : '';
                const prompt = `You are a helpful assistant that maps a webpage to a class/week bucket.\n\nPage URL: ${url}\nPage title: ${title}\nPage header: ${header}\nPage meta: ${meta}\nCurrent auto-detected: ${sessionContext.classId}/${sessionContext.week}\nKnown buckets: ${JSON.stringify(known)}\n\nSuggest the best matching classId and week. If you cannot match an existing bucket, propose a fallback bucket name and whether it should be hierarchical (class+week) or flat. Also, provide a concise directory pattern (substring or regex) that would match similar pages. Return ONLY valid JSON with keys: { "classId":string|null, "week":string|null, "pattern":string|null, "hierarchical":boolean|null, "fallbackBucket":string|null, "reason":string|null, "confidence":number }`;

                let suggestion = null;
                try {
                    const aiCall = (typeof window !== 'undefined' && typeof window.callGeminiAPI === 'function') ? window.callGeminiAPI : null;
                    if (aiCall) {
                        const aiResp = await aiCall(prompt, 'Return only valid JSON.');
                        try { suggestion = JSON.parse(aiResp); } catch (e) { suggestion = { classId: null, week: null, pattern: null, hierarchical: null, fallbackBucket: null, reason: aiResp, confidence: 0 }; }
                    } else throw new Error('AI unavailable');
                } catch (e) {
                    log('[AI] Gemini call failed or missing key; falling back to heuristics.', 'log-warn');
                    suggestion = findBucketByUrl(url) || { classId: null, week: null, pattern: null, hierarchical: null, fallbackBucket: null, reason: 'Heuristic fallback match', confidence: 0 };
                }

                if (overlay) overlay.style.display = 'none';
                try {
                    let applyAutomatically = false;
                    const conf = Number(suggestion && suggestion.confidence) || 0;
                    if (conf >= 0.75) applyAutomatically = true;
                    let finalClass = suggestion && suggestion.classId ? suggestion.classId : null;
                    let finalWeek = suggestion && suggestion.week ? suggestion.week : null;
                    if (!finalClass) {
                        if (suggestion && suggestion.fallbackBucket) {
                            const fb = String(suggestion.fallbackBucket || '').trim();
                            if (fb.includes('|')) {
                                const parts = fb.split('|'); finalClass = parts[0].trim(); finalWeek = parts[1] ? parts[1].trim() : (suggestion.hierarchical === false ? 'All' : 'Week 1');
                            } else {
                                finalClass = fb || null; finalWeek = suggestion.hierarchical === false ? 'All' : (finalWeek || 'Week 1');
                            }
                        } else {
                            try { const u = new URL(url || window.location.href); var host = u.hostname.replace(/\./g,'-'); } catch (e) { var host = 'auto'; }
                            finalClass = `Auto-${host}`; finalWeek = suggestion && suggestion.hierarchical === false ? 'All' : (finalWeek || 'Week 1');
                        }
                    }
                    if (!finalClass) { alert('AI did not propose a usable bucket. Please set it manually.'); return; }
                    const apply = applyAutomatically ? true : confirm(`AI suggests: /${finalClass}/${finalWeek}\n\nReason: ${suggestion.reason || 'n/a'}\n\nApply this suggestion?`);
                    if (!apply) { alert('Suggestion declined. You can set the bucket manually.'); return; }
                    const kb2 = getKnowledgeBase(); if (!kb2[finalClass]) kb2[finalClass] = {}; if (!kb2[finalClass][finalWeek]) kb2[finalClass][finalWeek] = []; saveKnowledgeBase(kb2);
                    sessionContext.classId = finalClass; sessionContext.week = finalWeek;
                    try { localStorage.setItem('dig_last_class', finalClass); localStorage.setItem('dig_last_week', finalWeek); } catch (e) {}
                    updateCurrentBucketDisplay(); loadLocalKnowledgeToUI(); selectBucketInUI(finalClass, finalWeek);
                    if (suggestion && suggestion.pattern) { addBucketPattern(suggestion.pattern, `${finalClass}|${finalWeek}`); log(`[KB] Added pattern '${suggestion.pattern}' -> ${finalClass}|${finalWeek}`, 'log-bucket'); }
                } catch (e) { log('[AI] Apply suggestion failed: ' + (e && e.message ? e.message : String(e)), 'log-err'); alert('Failed to apply AI suggestion.'); }

            } catch (e) { try { const overlay = document.getElementById('thinkingOverlay'); if (overlay) overlay.style.display = 'none'; } catch (_) {} log('[AI] Auto-fix failed: ' + (e && e.message ? e.message : String(e)), 'log-err'); alert('AI auto-detect failed. See logs for details.'); }
        });
    } catch (e) { /* ignore render issues */ }
}

export function renderPatternManager() {
    try {
        const parent = document.getElementById('patternManagerContainer') || document.getElementById('manualBucketControl') || document.getElementById('kbContextSelector');
        if (!parent) return;
        if (document.getElementById('patternManager')) return;
        const wrapper = document.createElement('div');
        wrapper.id = 'patternManager';
        wrapper.className = 'card-body';
        wrapper.innerHTML = `
            <div style="display:flex;gap:6px;align-items:center;">
                <input id="patternInput" placeholder="pattern or re:regex" style="padding:6px;border-radius:4px;background:var(--bg);border:1px solid rgba(255,255,255,0.06);width:240px"/>
                <input id="patternTargetInput" placeholder="target Class|Week" style="padding:6px;border-radius:4px;background:var(--bg);border:1px solid rgba(255,255,255,0.06);width:180px"/>
                <button id="btnAddPattern" class="action-btn">Add</button>
                <button id="btnTestPattern" class="action-btn">Test</button>
            </div>
            <div id="patternList" style="margin-top:8px;max-height:220px;overflow:auto;"></div>
        `;
        parent.parentNode && parent.parentNode.insertBefore(wrapper, parent.nextSibling);

        document.getElementById('btnAddPattern').addEventListener('click', () => {
            try {
                const pat = document.getElementById('patternInput').value.trim();
                let target = document.getElementById('patternTargetInput').value.trim();
                if (!pat) { alert('Enter pattern'); return; }
                if (!target) { alert('Enter target (Class|Week)'); return; }
                if (!target.includes('|') && target.includes('/')) target = target.replace('/', '|');
                if (!target.includes('|')) target = target + '|Week 1';
                addBucketPattern(pat, target);
                updatePatternListUI();
                document.getElementById('patternInput').value = '';
                document.getElementById('patternTargetInput').value = '';
                log(`[KB] Added pattern '${pat}' -> ${target}`, 'log-bucket');
            } catch (e) { log('[KB] Add pattern failed: ' + (e && e.message ? e.message : String(e)), 'log-err'); }
        });

        document.getElementById('btnTestPattern').addEventListener('click', async () => {
            try {
                const pat = document.getElementById('patternInput').value.trim();
                if (!pat) { alert('Enter pattern to test'); return; }
                const hint = (typeof window !== 'undefined' && typeof window.getActiveTabClassHint === 'function') ? await window.getActiveTabClassHint().catch(() => null) : null;
                const url = hint ? (hint.url || '') : null;
                const testUrl = url || prompt('Enter URL to test against:', window.location.href || '');
                if (!testUrl) return;
                let matched = false;
                try {
                    if (pat.startsWith('re:')) { const rx = pat.substring(3); matched = new RegExp(rx).test(testUrl); }
                    else { matched = testUrl.includes(pat); if (!matched) { try { const u = new URL(testUrl); const segs = u.pathname.split('/').filter(Boolean); matched = segs.includes(pat); } catch (e) {} } }
                } catch (e) { matched = false; }
                alert(`Pattern ${pat} ${matched ? 'matches' : 'does not match'}\n${testUrl}`);
            } catch (e) { log('[KB] Test pattern failed: ' + (e && e.message ? e.message : String(e)), 'log-err'); }
        });

        updatePatternListUI();
    } catch (e) { /* ignore UI failures */ }
}

export function updatePatternListUI() {
    try {
        const listEl = document.getElementById('patternList');
        if (!listEl) return;
        const arr = loadBucketPatterns();
        if (!arr || arr.length === 0) { listEl.innerHTML = '<div style="font-size:0.75rem;color:var(--text-muted)">No patterns defined.</div>'; return; }
        const escapeHtml = (s) => { const d = document.createElement('div'); d.textContent = String(s); return d.innerHTML; };
        const rows = arr.map((p, idx) => {
            const tgt = p.target || '';
            const conflictNote = p.conflict ? (` ⚠️ conflict: local=${escapeHtml(p.conflict.localTarget || '')} cloud=${escapeHtml(p.conflict.cloudTarget || '')}`) : '';
            const meta = `${escapeHtml(p.mode || 'auto')} · ${p.caseSensitive ? 'CS' : 'ci'} · pr:${escapeHtml(String(p.priority || 0))}${conflictNote}`;
            const resolveBtn = p.conflict ? `<button class="action-btn btn-resolve-pattern" data-idx="${idx}">Resolve</button>` : '';
            return `<div class="pattern-row" data-idx="${idx}" style="display:flex;align-items:center;justify-content:space-between;padding:6px;border-bottom:1px solid rgba(255,255,255,0.03)"><div style="flex:1"><strong>${escapeHtml(p.pattern)}</strong><div style="font-size:0.8rem;color:var(--text-muted)">${escapeHtml(tgt)}</div><div style="font-size:0.72rem;color:var(--text-muted);margin-top:4px">${meta}</div></div><div style="display:flex;gap:6px"><button class="action-btn btn-edit-pattern" data-idx="${idx}">Edit</button>${resolveBtn}<button class="action-btn btn-delete-pattern" data-idx="${idx}">Delete</button></div></div>`;
        }).join('');
        listEl.innerHTML = rows;

        Array.from(listEl.querySelectorAll('.btn-resolve-pattern')).forEach(btn => {
            btn.addEventListener('click', (e) => {
                try {
                    const idx = Number(btn.getAttribute('data-idx'));
                    const arr2 = loadBucketPatterns();
                    if (idx >= 0 && idx < arr2.length) {
                        const p = arr2[idx];
                        if (!p || !p.conflict) { showToast('No conflict to resolve for this pattern.', 'warn'); return; }
                        openPatternConflictModal(idx, p.conflict.localTarget || '', p.conflict.cloudTarget || '', p.cloudId || null, p.pattern || '');
                    }
                } catch (e) { log('[KB] Resolve click failed: ' + (e && e.message ? e.message : String(e)), 'log-err'); }
            });
        });

        Array.from(listEl.querySelectorAll('.btn-edit-pattern')).forEach(btn => {
            btn.addEventListener('click', () => {
                try {
                    const idx = Number(btn.getAttribute('data-idx'));
                    const arr2 = loadBucketPatterns();
                    if (idx < 0 || idx >= arr2.length) return;
                    const p = arr2[idx];
                    const row = btn.closest('.pattern-row');
                    if (!row) return;
                    const editPatId = `editPatternInput-${idx}`;
                    const editTgtId = `editTargetInput-${idx}`;
                    const editModeId = `editModeSelect-${idx}`;
                    const editCSId = `editCase-${idx}`;
                    const editPriId = `editPriority-${idx}`;
                    const saveBtnId = `savePatternBtn-${idx}`;
                    const cancelBtnId = `cancelPatternBtn-${idx}`;
                    row.innerHTML = `<div style="flex:1;display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
                        <input id="${editPatId}" value="${escapeHtml(p.pattern)}" style="flex:1;padding:6px;border-radius:4px;background:var(--bg);border:1px solid rgba(255,255,255,0.06)"/>
                        <input id="${editTgtId}" value="${escapeHtml(p.target)}" style="width:180px;padding:6px;border-radius:4px;background:var(--bg);border:1px solid rgba(255,255,255,0.06)"/>
                        <select id="${editModeId}" style="padding:6px;border-radius:4px;background:var(--bg);border:1px solid rgba(255,255,255,0.06);">
                            <option value="auto" ${p.mode === 'auto' ? 'selected' : ''}>auto</option>
                            <option value="substring" ${p.mode === 'substring' ? 'selected' : ''}>substring</option>
                            <option value="path" ${p.mode === 'path' ? 'selected' : ''}>path</option>
                            <option value="regex" ${p.mode === 'regex' ? 'selected' : ''}>regex</option>
                        </select>
                        <label style="display:flex;align-items:center;gap:6px;margin-left:6px;font-size:0.8rem;color:var(--text-muted)"><input type="checkbox" id="${editCSId}" ${p.caseSensitive ? 'checked' : ''}/>Case</label>
                        <input id="${editPriId}" type="number" value="${escapeHtml(String(p.priority || 0))}" style="width:70px;padding:6px;border-radius:4px;background:var(--bg);border:1px solid rgba(255,255,255,0.06)"/>
                        </div><div style="display:flex;gap:6px"><button class="action-btn" id="${saveBtnId}">Save</button><button class="action-btn" id="${cancelBtnId}">Cancel</button></div>`;

                    document.getElementById(saveBtnId).addEventListener('click', () => {
                        try {
                            const newPat = document.getElementById(editPatId).value.trim();
                            let newTgt = document.getElementById(editTgtId).value.trim();
                            const newMode = (document.getElementById(editModeId) && document.getElementById(editModeId).value) || 'auto';
                            const newCS = !!(document.getElementById(editCSId) && document.getElementById(editCSId).checked);
                            const newPri = Number(document.getElementById(editPriId) && Number(document.getElementById(editPriId).value)) || 0;
                            if (!newPat) { alert('Pattern required'); return; }
                            if (!newTgt.includes('|') && newTgt.includes('/')) newTgt = newTgt.replace('/', '|');
                            if (!newTgt.includes('|')) newTgt = newTgt + '|Week 1';
                            arr2[idx].pattern = newPat;
                            arr2[idx].target = newTgt;
                            arr2[idx].mode = newMode;
                            arr2[idx].caseSensitive = newCS;
                            arr2[idx].priority = newPri;
                            arr2[idx].timestamp = Date.now();
                            saveBucketPatterns(arr2);
                            updatePatternListUI();
                            (async () => {
                                try {
                                    if (arr2[idx] && arr2[idx].cloudId && db && currentUser) {
                                        const docRef = doc(db, 'artifacts', appId, 'users', currentUser.uid, 'patterns', arr2[idx].cloudId);
                                        await updateDoc(docRef, { pattern: newPat, target: newTgt, updatedAt: Date.now() });
                                        log('[KB] Updated cloud pattern', 'log-bucket');
                                    } else if (db && currentUser) {
                                        try {
                                            const patternsCol = collection(db, 'artifacts', appId, 'users', currentUser.uid, 'patterns');
                                            const docRef = await addDoc(patternsCol, { pattern: newPat, target: newTgt, timestamp: Date.now() });
                                            arr2[idx].cloudId = docRef.id; saveBucketPatterns(arr2);
                                        } catch (e) { /* ignore cloud add errors */ }
                                    }
                                } catch (e) { log('[KB] Cloud update failed: ' + (e && e.message ? e.message : String(e)), 'log-warn'); }
                            })();
                        } catch (e) { log('[KB] Save edit failed: ' + (e && e.message ? e.message : String(e)), 'log-err'); }
                    });

                    document.getElementById(cancelBtnId).addEventListener('click', () => { updatePatternListUI(); });

                } catch (e) { log('[KB] Edit pattern failed: ' + (e && e.message ? e.message : String(e)), 'log-err'); }
            });
        });

        Array.from(listEl.querySelectorAll('.btn-delete-pattern')).forEach(btn => {
            btn.addEventListener('click', () => {
                try {
                    const idx = Number(btn.getAttribute('data-idx'));
                    const arr2 = loadBucketPatterns();
                    if (idx >= 0 && idx < arr2.length) {
                        const removed = arr2.splice(idx, 1)[0];
                        saveBucketPatterns(arr2);
                        updatePatternListUI();
                        log(`[KB] Removed pattern ${removed.pattern} -> ${removed.target}`, 'log-bucket');
                        (async () => {
                            try {
                                if (removed && removed.cloudId && db && currentUser) {
                                    const docRef = doc(db, 'artifacts', appId, 'users', currentUser.uid, 'patterns', removed.cloudId);
                                    await deleteDoc(docRef);
                                    log('[KB] Removed cloud pattern', 'log-bucket');
                                }
                            } catch (e) { log('[KB] Cloud remove failed: ' + (e && e.message ? e.message : String(e)), 'log-warn'); }
                        })();
                    }
                } catch (e) { log('[KB] Remove pattern failed: ' + (e && e.message ? e.message : String(e)), 'log-err'); }
            });
        });
    } catch (e) { /* ignore */ }
}

// Expose new pattern helpers for backward compatibility
try {
    if (typeof window !== 'undefined') {
        window.normalizePatternEntry = normalizePatternEntry;
        window.loadBucketPatterns = loadBucketPatterns;
        window.saveBucketPatterns = saveBucketPatterns;
        window.addBucketPattern = addBucketPattern;
        window.getBucketPatterns = getBucketPatterns;
        window.parseTarget = parseTarget;
        window.matchPatternAgainstUrl = matchPatternAgainstUrl;
        window.findBucketByUrl = findBucketByUrl;
        window.selectBucketInUI = selectBucketInUI;
        window.updateCurrentBucketDisplay = updateCurrentBucketDisplay;
        window.renderManualBucketControl = renderManualBucketControl;
        window.renderPatternManager = renderPatternManager;
        window.updatePatternListUI = updatePatternListUI;
    }
} catch (e) { /* ignore */ }
