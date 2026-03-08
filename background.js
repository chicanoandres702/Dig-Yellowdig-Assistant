/**
 * Background script: MV3 relay for cross-domain frames and diagnostic logging.
 */
let logBuffer = [];

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const tabId = sender.tab?.id;

    if (request.type === 'DIG_DEBUG_LOG') {
        logBuffer.push(request.log);
        if (logBuffer.length > 50) logBuffer.shift();
        chrome.tabs.sendMessage(tabId, { type: 'NEW_LOG_EVENT', log: request.log });
    }

    if (request.type === 'GET_DEBUG_LOGS') {
        sendResponse(logBuffer);
        return true;
    }

    if (request.type === 'BROADCAST_TO_FRAMES') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tid = tabs[0]?.id;
            if (!tid) return;
            chrome.scripting.executeScript({
                target: { tabId: tid, allFrames: true },
                func: (sel) => {
                    if (typeof getVitalSourcePageText === 'function') {
                        const data = getVitalSourcePageText(sel);
                        if (data) {
                            const text = typeof data === 'object' ? data.text : data;
                            const html = typeof data === 'object' ? data.html : '';
                            if (text && text.length >= 20) {
                                chrome.runtime.sendMessage({ type: 'FRAME_CONTENT_REPORT', text, html });
                            }
                        }
                    }
                },
                args: [request.customSelector]
            });
        });
    }

    if (request.type === 'DIG_START_PICKING' || request.type === 'DIG_STOP_PICKING') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tid = tabs[0]?.id;
            if (!tid) return;
            chrome.tabs.sendMessage(tid, request);
            chrome.scripting.executeScript({
                target: { tabId: tid, allFrames: true },
                func: (type) => window.postMessage({ type }, '*'),
                args: [request.type]
            });
        });
    }

    if (request.type === 'DIG_ELEMENT_SELECTED' || request.type === 'FRAME_CONTENT_REPORT') {
        chrome.tabs.sendMessage(tabId, request);
    }

    return true;
});
