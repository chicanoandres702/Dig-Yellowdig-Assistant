import { initializeApp } from "./firebase-app.js";
// Defer loading of the firebase-auth bundle until runtime (dynamic import)
let getAuth, initializeAuth, browserLocalPersistence, browserSessionPersistence, browserPopupRedirectResolver, signInWithCustomToken, signInAnonymously, onAuthStateChanged;
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc } from "./firebase-firestore.js";
import { getKnowledgeBase, saveKnowledgeBase } from "./utils.js";

import { extBridge } from "./src/features/web-assistant/bridge.service.js";
import { log } from "./src/features/web-assistant/logger.service.js";
import { collectDebugBundleAndDownload, checkExtensionBridgeStatus, _reportSwEvent } from "./src/features/web-assistant/debug.service.js";
import { callGeminiAPI, getGeminiApiKey } from "./src/features/web-assistant/ai.service.js";
import { showToast, showRefineModal, closeRefineModal } from "./src/features/web-assistant/ui.service.js";
import { initMesh } from "./src/features/web-assistant/animation.service.js";
import { initKnowledgeSync, loadLocalKnowledgeToUI, syncLocalKnowledgeToCloud, syncLocalPatternsToCloud, initPatternsSync, pushPatternsSnapshot, closePatternConflictModal, openPatternConflictModal, applyResolveChoice, undoPatternChange, saveToBucket, normalizePatternEntry, loadBucketPatterns, saveBucketPatterns, addBucketPattern, getBucketPatterns, parseTarget, matchPatternAgainstUrl, findBucketByUrl, selectBucketInUI, updateCurrentBucketDisplay, renderManualBucketControl, renderPatternManager, updatePatternListUI } from "./src/features/web-assistant/kb.service.js";
import { populateLocalIterationsUI } from "./src/features/web-assistant/drafts.service.js";

// --- GEMINI & FIREBASE CORE ---
const apiKey = "";
// Note: Gemini helper (callGeminiAPI) and key resolution live in `src/features/web-assistant/ai.service.js`.

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
// Defer importing the firebase-auth bundle to avoid triggering service-worker
// initialization during page load. We dynamically import and initialize
// auth only when a firebaseConfig is present.
const firebaseInitPromise = (async function initFirebase() {
    if (firebaseConfig && firebaseConfig.apiKey) {
        try {
            app = initializeApp(firebaseConfig);
            try { db = getFirestore(app); } catch (e) { db = null; }
            firebaseEnabled = !!db;
            // Expose for legacy modules that currently reference globals
            try { if (typeof window !== 'undefined') { window.app = app; window.db = db; } } catch (e) {}
        } catch (e) {
            console.warn('Firebase initialization failed:', e);
        }
    }
    return app;
})();
// Pattern manager UI and list rendering were moved into
// `src/features/web-assistant/kb.service.js`. Use the imported
// `renderPatternManager` and `updatePatternListUI` functions from that module
// instead of local implementations to avoid duplication and keep logic centralized.
// Drafts/Iterations UI helper moved to `src/features/web-assistant/drafts.service.js`.
// Use imported `populateLocalIterationsUI` from that module to seed the UI when cloud data is unavailable.

// Render a compact list of core modules and their status into the FEED tab
function renderCoreModules() {
    try {
        const modules = [
            { name: 'Pattern Manager', version: 'v1.3.0', status: 'OK' },
            { name: 'Element Picker', version: 'v1.1.5', status: 'OK' },
            { name: 'KB Sync', version: 'v2.0.1', status: 'OK' },
            { name: 'Gemini API', version: (typeof window !== 'undefined' && window.GEMINI_MODEL) ? window.GEMINI_MODEL : 'v?', status: (getGeminiApiKey() ? 'OK' : 'OFFLINE') },
            { name: 'Extension Bridge', version: (typeof navigator !== 'undefined' ? 'n/a' : ''), status: (extBridge && extBridge.isActive) ? 'OK' : 'OFFLINE' }
        ];

        const container = document.getElementById('coreModulesContainer');
        if (!container) return;
        let html = '';
        modules.forEach(m => {
            const badgeCls = (m.status === 'OK') ? 'badge-completed' : (m.status === 'OFFLINE' ? 'badge-offline' : 'badge-running');
            html += `
                <div class="item-card">
                    <span class="item-title">${m.name}</span>
                    <div class="item-meta"><span>${m.version}</span><span class="badge ${badgeCls}">${m.status}</span></div>
                </div>`;
        });
        container.innerHTML = html;
    } catch (e) { console.warn('renderCoreModules error', e); }
}

// Seed local UI immediately if Firestore/authn't ready. When Firestore connects
// the onSnapshot listener in initIterationsSync will overwrite this content.
(async () => {
    try {
        const hint = await getActiveTabClassHint();
        if (hint) {
            try { if (hint.cls && hint.cls.trim()) sessionContext.classId = hint.cls.trim(); } catch (e) {}
            try { if (hint.week && hint.week.trim()) sessionContext.week = hint.week.trim(); }
            catch (e) {
                try {
                    // Try to infer week from the page title
                    const title = (hint.title || '');
                    const wm = String(title).match(/week[\s\-\/]*(\d+)/i) || String(title).match(/chapter[\s\-\/]*(\d+)/i);
                    if (wm) sessionContext.week = 'Week ' + wm[1];
                } catch (__) { }
            }
            // Try to match bucket via URL directory patterns or KB names, and fall back to AI suggestion
            try {
                const url = hint.url || hint.title || null;
                if (url) {
                    const mapped = findBucketByUrl(url);
                    if (mapped && mapped.classId) {
                        sessionContext.classId = mapped.classId;
                        sessionContext.week = mapped.week || sessionContext.week;
                        try { selectBucketInUI(mapped.classId, mapped.week || sessionContext.week); } catch (e) {}
                    } else {
                        // No local pattern matched — attempt AI suggestion (non-blocking)
                        (async () => {
                            try {
                                const kb = getKnowledgeBase() || {}; const known = [];
                                for (const cls of Object.keys(kb)) { known.push({ classId: cls, weeks: Object.keys(kb[cls] || {}) }); }
                                const header = hint.header || '';
                                const meta = hint.meta || '';
                                const prompt = `You are an assistant that maps a webpage to a class/week bucket.\n\nPage URL: ${url}\nPage title: ${hint.title || ''}\nPage header: ${header}\nPage meta: ${meta}\nKnown buckets: ${JSON.stringify(known)}\n\nReturn ONLY valid JSON: { \"classId\":string|null, \"week\":string|null, \"pattern\":string|null, \"hierarchical\":boolean|null, \"fallbackBucket\":string|null, \"confidence\":number, \"reason\":string|null }`;
                                let suggestion = null;
                                try {
                                    const aiResp = await callGeminiAPI(prompt, 'Return only JSON.');
                                    suggestion = JSON.parse(aiResp);
                                } catch (e) {
                                    suggestion = null;
                                }
                                if (suggestion && suggestion.classId) {
                                    const conf = Number(suggestion.confidence || 0);
                                    const cls = suggestion.classId;
                                    const wk = suggestion.week || (suggestion.hierarchical === false ? 'All' : 'Week 1');
                                    // Create bucket locally if missing
                                    try { const kb2 = getKnowledgeBase(); if (!kb2[cls]) kb2[cls] = {}; if (!kb2[cls][wk]) kb2[cls][wk] = []; saveKnowledgeBase(kb2); } catch (e) {}
                                    // Add suggested pattern if provided
                                    try { if (suggestion.pattern) addBucketPattern(suggestion.pattern, `${cls}|${wk}`); } catch (e) {}
                                    // If confidence is high, auto-apply and select in UI; otherwise just set as hint
                                    if (conf >= 0.8) {
                                        sessionContext.classId = cls; sessionContext.week = wk;
                                        try { localStorage.setItem('dig_last_class', cls); localStorage.setItem('dig_last_week', wk); } catch (e) {}
                                        try { selectBucketInUI(cls, wk); } catch (e) {}
                                        updateCurrentBucketDisplay();
                                    } else {
                                        // low-confidence suggestion: store last hints but don't forcibly switch UI
                                        try { localStorage.setItem('dig_last_class', cls); localStorage.setItem('dig_last_week', wk); } catch (e) {}
                                        // still surface in sessionContext so user can accept later
                                        sessionContext.classId = sessionContext.classId || cls;
                                        sessionContext.week = sessionContext.week || wk;
                                    }
                                }
                            } catch (e) { /* ignore AI suggestion errors */ }
                        })();
                    }
                }
            } catch (e) { /* ignore pattern matching errors */ }
        }
    } catch (e) { /* ignore */ }
    try { if (!db || !currentUser) populateLocalIterationsUI(); } catch (e) { /* ignore */ }
})();
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

    // Defer rendering of Pattern Manager and Manual Bucket control until their tabs are opened
    try { updateCurrentBucketDisplay(); loadLocalKnowledgeToUI(); } catch (e) { /* ignore */ }
    // Render core modules summary in the feed
    try { if (typeof renderCoreModules === 'function') renderCoreModules(); } catch (e) {}
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
