/**
 * KB Shared Storage Service: Handles interaction with chrome.storage.local.
 */

function getSharedKB() {
    return new Promise((resolve) => {
        try {
            if (window.chrome && chrome.storage && chrome.storage.local) {
                chrome.storage.local.get('digKnowledgeBase', (res) => {
                    try { resolve((res && res.digKnowledgeBase) ? res.digKnowledgeBase : {}); } catch (e) { resolve({}); }
                });
            } else resolve({});
        } catch (e) { resolve({}); }
    });
}

function saveSharedKB(kbObj) {
    return new Promise((resolve) => {
        try {
            if (window.chrome && chrome.storage && chrome.storage.local) {
                const toSet = { digKnowledgeBase: kbObj };
                chrome.storage.local.set(toSet, () => {
                    const err = chrome.runtime && chrome.runtime.lastError ? chrome.runtime.lastError : null;
                    if (err) resolve({ success: false, error: err.message || String(err) });
                    else resolve({ success: true });
                });
            } else resolve({ success: false, error: 'chrome.storage.local not available' });
        } catch (e) { resolve({ success: false, error: e && e.message ? e.message : String(e) }); }
    });
}

(function initSharedKbCache() {
    try {
        window.__dig_shared_kb = window.__dig_shared_kb || {};
        if (window.chrome && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get('digKnowledgeBase', (res) => {
                try { window.__dig_shared_kb = (res && res.digKnowledgeBase) ? res.digKnowledgeBase : {}; } catch (e) { window.__dig_shared_kb = {}; }
            });
            if (chrome.storage.onChanged && typeof chrome.storage.onChanged.addListener === 'function') {
                chrome.storage.onChanged.addListener((changes, area) => {
                    if (area === 'local' && changes.digKnowledgeBase) {
                        try { window.__dig_shared_kb = changes.digKnowledgeBase.newValue || {}; } catch (e) { window.__dig_shared_kb = {}; }
                    }
                });
            }
        }
    } catch (e) { /* ignore */ }
})();
