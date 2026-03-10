/**
 * Background script: MV3 relay for cross-domain frames and diagnostic logging.
 */
// Ensure vendored Ajv bundle executes early in the service-worker so
// the Ajv loader (src/vendor/ajv.js) can detect a full Ajv constructor
// on the global object when imported by the agent engine.
import './src/vendor/ajv.full.js';
import { runAgentSession } from './src/features/agent/agent.engine.js';
import { runSimAgentSession } from './src/features/agent/agent.simulator.js';
let logBuffer = [];
// Track active agent sessions so they can be cancelled
const activeAgentSessions = {};
// Archive completed sessions for replay/debug (short lived)
const archivedAgentSessions = {};

// --- IndexedDB session persistence helpers ---
const DB_NAME = 'pagepilot_agent_sessions';
const DB_VERSION = 1;
let _dbPromise = null;

function openDb() {
    if (_dbPromise) return _dbPromise;
    _dbPromise = new Promise((resolve, reject) => {
        try {
            const req = indexedDB.open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('sessions')) {
                    const store = db.createObjectStore('sessions', { keyPath: 'sessionId' });
                    store.createIndex('status', 'status', { unique: false });
                    store.createIndex('updatedAt', 'updatedAt', { unique: false });
                }
            };
            req.onsuccess = (e) => resolve(e.target.result);
            req.onerror = (e) => reject(e.target.error || new Error('IndexedDB open failed'));
        } catch (err) { reject(err); }
    });
    return _dbPromise;
}

async function getSessionRecord(sessionId) {
    try {
        const db = await openDb();
        return await new Promise((resolve) => {
            const tx = db.transaction('sessions', 'readonly');
            const store = tx.objectStore('sessions');
            const req = store.get(sessionId);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => resolve(null);
        });
    } catch (e) { return null; }
}

async function putSessionRecord(rec) {
    try {
        const db = await openDb();
        return await new Promise((resolve, reject) => {
            const tx = db.transaction('sessions', 'readwrite');
            const store = tx.objectStore('sessions');
            const req = store.put(rec);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error || new Error('put failed'));
        });
    } catch (e) { /* swallow */ return null; }
}

async function appendSessionHistory(sessionId, update) {
    try {
        const existing = await getSessionRecord(sessionId);
        const rec = existing || { sessionId, history: [], cancelled: false, status: 'active', startedAt: Date.now(), updatedAt: Date.now() };
        rec.history = rec.history || [];
        rec.history.push(update);
        if (rec.history.length > 2000) rec.history.shift();
        if (update && (update.type === 'cancelled' || update.type === 'cancel_ack')) rec.cancelled = true;
        if (update && (update.type === 'complete' || update.type === 'error')) rec.status = 'archived';
        rec.updatedAt = Date.now();
        await putSessionRecord(rec);
        return rec;
    } catch (e) { return null; }
}

async function loadSessionsOnStartup() {
    try {
        const db = await openDb();
        return await new Promise((resolve) => {
            const tx = db.transaction('sessions', 'readonly');
            const store = tx.objectStore('sessions');
            const req = store.openCursor();
            req.onsuccess = (e) => {
                const cursor = e.target.result;
                if (cursor) {
                    try {
                        const rec = cursor.value;
                        if (rec.status === 'active') activeAgentSessions[rec.sessionId] = rec;
                        else archivedAgentSessions[rec.sessionId] = rec;
                    } catch (err) { }
                    cursor.continue();
                } else {
                    resolve(true);
                }
            };
            req.onerror = () => resolve(false);
        });
    } catch (e) { return false; }
}

// Attempt to populate memory from persisted sessions
loadSessionsOnStartup().then(() => { /* loaded */ }).catch(() => { /* ignore */ });

// Context Menu Setup
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: 'reply-with-dig',
        title: 'Reply to Peer with Dig',
        contexts: ['all'],
        documentUrlPatterns: ['https://*.yellowdig.app/*']
    });
    // Try to register the side panel default path for browsers that support programmatic side panel setup
    try {
        if (chrome.sidePanel && typeof chrome.sidePanel.setOptions === 'function') {
            try { chrome.sidePanel.setOptions({ path: chrome.runtime.getURL('web-assistant.html') }); } catch (e) { /* ignore */ }
        }
    } catch (e) { /* ignore */ }
});

chrome.action.onClicked.addListener((tab) => {
    // Try to open the browser side panel when available (Chrome Canary / stable supporting sidePanel API)
    try {
        // Preferred: set the side panel to our extension page and open it
        if (chrome.sidePanel && typeof chrome.sidePanel.setOptions === 'function') {
            try {
                chrome.sidePanel.setOptions({ path: chrome.runtime.getURL('web-assistant.html') }, () => {
                    try { if (typeof chrome.sidePanel.open === 'function') chrome.sidePanel.open(); } catch (e) {}
                });
                return;
            } catch (e) { /* fallthrough to other methods */ }
        }

        // Some implementations expose a simple open() - attempt it
        if (chrome.sidePanel && typeof chrome.sidePanel.open === 'function') {
            try { chrome.sidePanel.open(); return; } catch (e) { /* fallthrough */ }
        }
    } catch (e) { /* ignore feature-detection errors and fallback */ }

    // Fallback: send a toggle message to the content script so the in-page sidebar can open
    if (tab && tab.id) {
        chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_SIDEBAR' }).catch(() => { });
    }
});

// Keyboard command handler: toggle side panel (manifest command: toggle-side-panel)
try {
    chrome.commands && chrome.commands.onCommand && chrome.commands.onCommand.addListener((command) => {
        if (command !== 'toggle-side-panel') return;
        try {
            if (chrome.sidePanel && typeof chrome.sidePanel.setOptions === 'function') {
                try {
                    chrome.sidePanel.setOptions({ path: chrome.runtime.getURL('web-assistant.html') }, () => {
                        try { if (typeof chrome.sidePanel.open === 'function') chrome.sidePanel.open(); } catch (e) {}
                    });
                    return;
                } catch (e) { /* fallthrough */ }
            }
            if (chrome.sidePanel && typeof chrome.sidePanel.open === 'function') {
                try { chrome.sidePanel.open(); return; } catch (e) { /* fallthrough */ }
            }
        } catch (e) { /* ignore */ }

        // Fallback: send toggle to active tab so content script opens the in-page sidebar
        try {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                const tab = tabs && tabs[0];
                if (tab && tab.id) chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_SIDEBAR' }).catch(() => {});
            });
        } catch (e) { }
    });
} catch (e) { /* ignore if commands API not available */ }

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'reply-with-dig') {
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                // Find potential Yellowdig card/container
                const sel = document.getSelection();
                let postText = sel ? sel.toString().trim() : '';
                let author = 'Classmate';

                // Try to find author if clicking inside a card
                try {
                    const active = document.activeElement || (sel && sel.anchorNode && sel.anchorNode.parentElement);
                    const card = active ? active.closest('.v-card, .yd-feed-item, [role="article"]') : null;
                    if (card) {
                        if (!postText) postText = card.innerText.trim();
                        const authorEl = card.querySelector('.author-name, .yd-author-name, [class*="author"]');
                        if (authorEl) author = authorEl.innerText.trim();
                    }
                } catch (e) { }

                window.postMessage({
                    type: 'DIG_CONTEXT_REPLY',
                    payload: { author, text: postText }
                }, '*');
            }
        });
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const tabId = sender.tab?.id;

    if (request.type === 'DIG_DEBUG_LOG') {
        logBuffer.push(request.log);
        if (logBuffer.length > 50) logBuffer.shift();
        if (tabId) {
            chrome.tabs.sendMessage(tabId, { type: 'NEW_LOG_EVENT', log: request.log }).catch(() => { });
        }

        // Optionally forward logs to a configured remote endpoint (webhook/MCP).
        // The popup stores user preferences in chrome.storage.local under
        // 'dig_log_forwarding_enabled' and 'dig_log_forwarding_url'. If enabled,
        // POST each log as JSON to the configured URL.
        try {
            chrome.storage.local.get(['dig_log_forwarding_enabled', 'dig_log_forwarding_url'], (res) => {
                try {
                    if (res && res.dig_log_forwarding_enabled && res.dig_log_forwarding_url) {
                        fetch(res.dig_log_forwarding_url, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ log: request.log, extensionId: chrome.runtime.id, ts: new Date().toISOString() })
                        }).catch(() => { /* swallow network errors */ });
                    }
                } catch (e) { }
            });
        } catch (e) { }
    }

    if (request.type === 'GET_DEBUG_LOGS') {
        sendResponse(logBuffer);
        return true;
    }

    // Accept session update events (engine/simulator send these via runtime.sendMessage)
    if (request && request.action === 'AGENT_SESSION_UPDATE') {
        try {
            const u = request.update || {};
            const sid = u.sessionId;
            if (sid) {
                // ensure slot in memory
                if (!activeAgentSessions[sid] && !archivedAgentSessions[sid]) {
                    archivedAgentSessions[sid] = archivedAgentSessions[sid] || { sessionId: sid, history: [], startedAt: Date.now() };
                }
                const target = activeAgentSessions[sid] || archivedAgentSessions[sid];
                target.history = target.history || [];
                target.history.push(u);
                if (target.history.length > 2000) target.history.shift();

                // persist update to IndexedDB (best-effort)
                try { appendSessionHistory(sid, u).catch(() => {}); } catch (e) { /* swallow */ }
            }
        } catch (e) { /* swallow */ }
        return true;
    }

    if (request.type === 'CLEAR_DEBUG_LOGS') {
        logBuffer = [];
        sendResponse({ ok: true });
        return true;
    }

    if (request.type === 'NAVIGATE_TO_NEXT_PAGE') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tab = tabs[0];
            if (!tab || !tab.id || tab.url?.startsWith('chrome://') || tab.url?.startsWith('edge://')) return;
            const tabId = tab.id;
            const prev = (request.prevSavedCount !== undefined) ? Number(request.prevSavedCount) : null;
            const cls = request.cls;
            const bookTitle = request.bookTitle;

            (async () => {
                try {
                    // If caller provided a previous saved count, wait up to 5s for it to increment.
                    if (prev !== null && !isNaN(prev)) {
                        const timeoutMs = 5000;
                        const start = Date.now();
                        let current = 0;
                        while (Date.now() - start < timeoutMs) {
                            try {
                                const res = await chrome.scripting.executeScript({
                                    target: { tabId },
                                    func: (clsArg, bookArg) => {
                                        try {
                                            const kb = JSON.parse(localStorage.getItem('digKnowledgeBase') || '{}');
                                            return (kb[clsArg] && kb[clsArg][bookArg] && kb[clsArg][bookArg].length) || 0;
                                        } catch (e) { return 0; }
                                    },
                                    args: [cls, bookTitle]
                                });
                                current = (res && res[0] && res[0].result) ? res[0].result : 0;
                                if (current > prev) break;
                            } catch (e) { /* ignore and retry */ }
                            await new Promise(r => setTimeout(r, 200));
                        }
                        if (current <= prev) {
                            // did not detect increment within timeout — abort navigation
                            return;
                        }
                    }

                    // perform navigation across frames
                    await chrome.scripting.executeScript({
                        target: { tabId: tabId, allFrames: true },
                        func: () => {
                            try {
                                const sel = [
                                    "button[aria-label*='Next']",
                                    "button[aria-label*='next']",
                                    "button[title*='Next']",
                                    "button[title*='next']",
                                    "[data-action='next']",
                                    "[data-test='next']",
                                    ".next-page",
                                    ".reader-next",
                                    ".vst-next",
                                    ".next"
                                ];
                                for (const s of sel) {
                                    const el = document.querySelector(s);
                                    if (el) {
                                        try { el.click(); } catch (e) { el.dispatchEvent(new MouseEvent('click', { bubbles: true })); }
                                        return;
                                    }
                                }
                                const main = document.querySelector('#pbk-page, #pfe-content, #vst-content-display, main article, .epub-content, body');
                                if (main) {
                                    const r = main.getBoundingClientRect();
                                    const ev = new MouseEvent('click', { bubbles: true, cancelable: true, clientX: Math.max(r.left + 10, r.right - 10), clientY: r.top + (r.height / 2) });
                                    main.dispatchEvent(ev);
                                    return;
                                }
                                try { if (window === window.top) { (document.body || document).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39, which: 39, bubbles: true, cancelable: true })); } } catch (e) { }
                            } catch (e) { }
                        }
                    });
                } catch (e) { /* swallow */ }
            })();
        });
    }

    if (request.type === 'BROADCAST_TO_FRAMES') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tab = tabs[0];
            if (!tab || !tab.id || tab.url?.startsWith('chrome://') || tab.url?.startsWith('edge://')) return;
            chrome.scripting.executeScript({
                target: { tabId: tab.id, allFrames: true },
                func: async (sel, incImg) => {
                    try {
                        if (typeof getVitalSourcePageText === 'function') {
                            const data = await getVitalSourcePageText(sel, incImg);
                            if (data && chrome.runtime?.id) {
                                const text = typeof data === 'object' ? data.text : data;
                                const html = typeof data === 'object' ? data.html : '';
                                const page = typeof data === 'object' ? data.page : null;
                                if (text && text.length >= 20) {
                                    chrome.runtime.sendMessage({ type: 'FRAME_CONTENT_REPORT', text, html, page });
                                }
                            }
                        }
                    } catch (e) { }
                },
                args: [request.customSelector, request.includeImages]
            }).catch(() => { }); // Catch and swallow executeScript errors (e.g., protected frames)
        });
    }

    if (request.type === 'DIG_START_PICKING' || request.type === 'DIG_STOP_PICKING') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tab = tabs[0];
            if (!tab || !tab.id || tab.url?.startsWith('chrome://') || tab.url?.startsWith('edge://')) return;
            chrome.tabs.sendMessage(tab.id, request).catch(() => { });
            chrome.scripting.executeScript({
                target: { tabId: tab.id, allFrames: true },
                func: (type) => {
                    try { window.postMessage({ type }, '*'); } catch (e) { }
                },
                args: [request.type]
            }).catch(() => { });
        });
    }

    if (request.type === 'DIG_ELEMENT_SELECTED' || request.type === 'FRAME_CONTENT_REPORT') {
        if (tabId) {
            chrome.tabs.sendMessage(tabId, request).catch(() => { });
        }
    }

    if (request.type === 'FETCH_IMAGE_AS_BASE64') {
        fetch(request.url)
            .then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.blob();
            })
            .then(async (blob) => {
                const buffer = await blob.arrayBuffer();
                const bytes = new Uint8Array(buffer);

                // Chunk the conversion to avoid Maximum Call Stack Size Exceeded on large images
                const chunkSize = 8192;
                let binary = '';
                for (let i = 0; i < bytes.length; i += chunkSize) {
                    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
                }

                const b64 = btoa(binary);
                sendResponse({ dataUrl: `data:${blob.type};base64,${b64}` });
            })
            .catch(err => {
                sendResponse({ error: err.message });
            });
        return true; // Keep channel open for async response
    }

    // Open the response tool in a new tab via the background (safer than calling chrome.runtime.getURL from page)
    if (request.type === 'OPEN_RESPONSE_TOOL') {
        try {
            const mode = request.mode || 'post';
            const cls = request.cls || '';
            const pageUrl = request.pageUrl || '';
            let url = chrome.runtime.getURL('response-tool.html') + '?mode=' + encodeURIComponent(mode);
            if (cls) url += '&cls=' + encodeURIComponent(cls);
            if (pageUrl) url += '&pageUrl=' + encodeURIComponent(pageUrl);
            chrome.tabs.create({ url });
        } catch (e) {
            console.warn('OPEN_RESPONSE_TOOL failed', e);
        }
        sendResponse && sendResponse({ ok: true });
        return true;
    }

    // Return stored history for a session (active or archived)
    if (request && request.action === 'GET_AGENT_HISTORY') {
        try {
            const sid = request.sessionId;
            const session = (sid && (activeAgentSessions[sid] || archivedAgentSessions[sid]));
            const history = session && session.history ? session.history : [];
            sendResponse({ ok: true, sessionId: sid, history });
        } catch (e) { sendResponse({ ok: false, error: e && e.message ? e.message : String(e) }); }
        return true;
    }

    // Replay stored tool steps for a session into the active tab (or provided tabId)
    if (request && request.action === 'REPLAY_AGENT_HISTORY') {
        (async () => {
            try {
                const sid = request.sessionId;
                const dryRun = !!request.dryRun;
                const speedMs = Number(request.speedMs || 300);
                const tabIdOverride = request.tabId;

                const session = sid && (activeAgentSessions[sid] || archivedAgentSessions[sid]);
                if (!session || !Array.isArray(session.history)) {
                    try { sendResponse({ ok: false, error: 'session not found' }); } catch (e) { }
                    return;
                }

                // Extract steps: prefer explicit tool_call entries; also unwrap BATCH operations
                const steps = [];
                for (const u of session.history) {
                    try {
                        if (!u || !u.type) continue;
                        if (u.type === 'tool_call' && u.step) steps.push(u.step);
                        else if (u.type === 'batch_start' && Array.isArray(u.operations)) {
                            for (const op of u.operations) {
                                // Map op to step shape if it already looks like step
                                const s = op.type ? op : (op.step || null);
                                if (s) steps.push(s);
                            }
                        }
                    } catch (e) { /* ignore */ }
                }

                // determine target tab
                let tabId = tabIdOverride;
                if (!tabId) {
                    const tabs = await new Promise(res => chrome.tabs.query({ active: true, currentWindow: true }, res));
                    tabId = tabs && tabs[0] && tabs[0].id;
                }
                if (!tabId) { try { sendResponse({ ok: false, error: 'no active tab' }); } catch (e) { } ; return; }

                const results = [];
                for (const step of steps) {
                    // simple allowlist check
                    if (!step || !step.type) { results.push({ ok: false, error: 'invalid step' }); continue; }
                    if (dryRun) {
                        results.push({ ok: true, dryRun: true, step });
                        await new Promise(r => setTimeout(r, speedMs));
                        continue;
                    }
                    const res = await new Promise((resolve) => {
                        try {
                            chrome.tabs.sendMessage(tabId, { type: 'AGENT_ACTION', step }, (resp) => {
                                if (chrome.runtime.lastError) return resolve({ ok: false, error: chrome.runtime.lastError.message });
                                resolve(resp || { ok: true });
                            });
                        } catch (e) { resolve({ ok: false, error: e.message }); }
                    });
                    results.push(res);
                    await new Promise(r => setTimeout(r, speedMs));
                }

                try { sendResponse({ ok: true, results }); } catch (e) { }
            } catch (err) {
                try { sendResponse({ ok: false, error: err && err.message ? err.message : String(err) }); } catch (e) { }
            }
        })();
        return true;
    }

        // Start a stateful agent session: background will orchestrate model <-> page tool loop
        if (request && request.action === 'START_AGENT_SESSION') {
                (async () => {
                        // create session id and register (persisted)
                        const sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2,8);
                        activeAgentSessions[sessionId] = { sessionId, cancelled: false, startedAt: Date.now(), history: [], status: 'active' };

                        // persist initial session record (best-effort)
                        try { await putSessionRecord(activeAgentSessions[sessionId]); } catch (e) { /* swallow */ }

                        // notify UI that session started (so it can offer cancel)
                        try { chrome.runtime.sendMessage({ action: 'AGENT_SESSION_STARTED', sessionId, started: true }); } catch (e) { }

                    try {
                        // determine active tab if not provided
                        let tabId = request.tabId;
                        if (!tabId) {
                            const tabs = await new Promise(res => chrome.tabs.query({ active: true, currentWindow: true }, res));
                            tabId = tabs && tabs[0] && tabs[0].id;
                        }
                        const cfg = request.generationConfig || {};
                        // choose simulation if requested in request or via extension storage
                        const useSim = Boolean(cfg.simulate === true);
                        const shouldCancel = () => !!(activeAgentSessions[sessionId] && activeAgentSessions[sessionId].cancelled);
                        let result;
                        if (useSim) {
                            result = await runSimAgentSession({ initialPrompt: request.prompt || request.initialPrompt || '', systemInstruction: request.systemInstruction || '', apiKey: request.apiKey, tabId, generationConfig: cfg, sessionId, shouldCancel });
                        } else {
                            result = await runAgentSession({ initialPrompt: request.prompt || request.initialPrompt || '', systemInstruction: request.systemInstruction || '', apiKey: request.apiKey, tabId, generationConfig: cfg, sessionId, shouldCancel });
                        }
                        try { sendResponse({ ok: true, result, sessionId }); } catch (e) { /* swallow */ }
                    } catch (err) {
                        try { sendResponse({ ok: false, error: err && err.message ? err.message : String(err) }); } catch (e) { }
                    } finally {
                        try {
                            const rec = activeAgentSessions[sessionId] || archivedAgentSessions[sessionId] || { sessionId };
                            rec.endedAt = Date.now();
                            rec.status = 'archived';
                            rec.updatedAt = Date.now();
                            // move to archive in-memory
                            archivedAgentSessions[sessionId] = rec;
                            delete activeAgentSessions[sessionId];
                            // persist final record
                            try { await putSessionRecord(rec); } catch (e) { /* swallow */ }
                        } catch (e) { /* swallow */ }
                    }
                })();
                return true; // keep channel open
        }

            // Cancel a running agent session
            if (request && request.action === 'CANCEL_AGENT_SESSION') {
                const sid = request.sessionId;
                if (sid && activeAgentSessions[sid]) {
                    activeAgentSessions[sid].cancelled = true;
                    try { chrome.runtime.sendMessage({ action: 'AGENT_SESSION_UPDATE', update: { sessionId: sid, type: 'cancel_ack' } }); } catch (e) { }
                    // persist cancel ack
                    try { appendSessionHistory(sid, { sessionId: sid, type: 'cancel_ack', ts: Date.now() }).catch(() => {}); } catch (e) { }
                    try { sendResponse({ ok: true, sessionId: sid }); } catch (e) { }
                } else {
                    try { sendResponse({ ok: false, error: 'session not found' }); } catch (e) { }
                }
                return true;
            }

    // Forward structured agent actions to the active tab's content script.
    // Caller (sidebar/dashboard) sends: { action: 'AGENT_ACTION', step: { ... } }
    if (request && request.action === 'AGENT_ACTION') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tab = tabs && tabs[0];
            if (!tab || !tab.id) {
                try { sendResponse({ ok: false, error: 'No active tab' }); } catch (e) {}
                return;
            }
            // Normalize step payload: prefer explicit request.step, otherwise strip action
            const step = request.step || (() => {
                const copy = Object.assign({}, request);
                delete copy.action;
                return copy;
            })();

            chrome.tabs.sendMessage(tab.id, { type: 'AGENT_ACTION', step }, (resp) => {
                try { sendResponse(resp || { ok: true }); } catch (e) { /* swallow */ }
            });
        });
        return true; // Keep channel open for async sendResponse
    }

    return true;
});
