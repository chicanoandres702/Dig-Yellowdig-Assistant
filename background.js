/**
 * Background script: MV3 relay for cross-domain frames and diagnostic logging.
 */
let logBuffer = [];

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

    return true;
});
