/**
 * KB Storage Core Service: Low-level storage logic, remote content handling, and pruning.
 */

function _generateContentKey() {
    const rnd = Math.floor(Math.random() * 0xFFFFFF).toString(16);
    return `digkb_item_${Date.now()}_${rnd}`;
}

function _storeRemoteContent(obj) {
    try {
        if (window.chrome && chrome.storage && chrome.storage.local) {
            const key = _generateContentKey();
            const toSet = {};
            toSet[key] = obj;
            try {
                chrome.storage.local.set(toSet, () => { /* best-effort */ });
                return key;
            } catch (e) { return null; }
        }
    } catch (e) { }
    return null;
}

function getRemoteContent(ref) {
    return new Promise((resolve) => {
        try {
            if (window.chrome && chrome.storage && chrome.storage.local && ref) {
                chrome.storage.local.get(ref, (res) => {
                    try { resolve(res && res[ref] ? res[ref] : null); } catch (e) { resolve(null); }
                });
            } else resolve(null);
        } catch (e) { resolve(null); }
    });
}

// Attempt to persist knowledge-base; if we hit quota, prune oldest book pages until it fits.
function safeSaveKB(kb) {
    try {
        localStorage.setItem('digKnowledgeBase', JSON.stringify(kb));
        return true;
    } catch (e) {
        if (e && e.name === 'QuotaExceededError') {
            const entries = [];
            Object.keys(kb).forEach(cls => {
                Object.keys(kb[cls]).forEach(topic => {
                    const arr = kb[cls][topic];
                    if (Array.isArray(arr)) {
                        arr.forEach((it, idx) => {
                            if (it && it.ts) entries.push({ cls, topic, idx, ts: it.ts, contentRef: it.contentRef });
                        });
                    }
                });
            });
            entries.sort((a, b) => a.ts - b.ts);
            while (entries.length) {
                const rem = entries.shift();
                const arr = kb[rem.cls][rem.topic];
                if (arr && arr[rem.idx]) {
                    const removed = arr.splice(rem.idx, 1);
                    try {
                        const ref = removed && removed[0] && removed[0].contentRef;
                        if (ref && window.chrome && chrome.storage && chrome.storage.local) {
                            try { chrome.storage.local.remove(ref); } catch (er) { }
                        }
                    } catch (er) { }
                    if (arr.length === 0) delete kb[rem.cls][rem.topic];
                    if (kb[rem.cls] && Object.keys(kb[rem.cls]).length === 0) delete kb[rem.cls];
                }
                try {
                    localStorage.setItem('digKnowledgeBase', JSON.stringify(kb));
                    digLog('Pruned old KB entries to free storage');
                    return true;
                } catch (e2) { }
            }
        }
        console.warn('Failed to save knowledge base after pruning', e);
        return false;
    }
}
