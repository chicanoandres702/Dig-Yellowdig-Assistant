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
    }

    if (request.type === 'GET_DEBUG_LOGS') {
        sendResponse(logBuffer);
        return true;
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
                                if (text && text.length >= 20) {
                                    chrome.runtime.sendMessage({ type: 'FRAME_CONTENT_REPORT', text, html });
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
