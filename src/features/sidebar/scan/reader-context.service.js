/**
 * Reader Context Service: Discovers page input fields across iframes.
 * Why: VitalSource renders content in nested iframes — we must scan all
 * window contexts to locate the page-number input used for navigation.
 */

function collectReaderContexts() {
    const list = [];
    const checkAndPush = (win) => {
        try {
            const doc = win.document;
            if (!doc) return;
            let val = null;
            const inp = doc.querySelector('input[id^="text-field-"]');
            if (inp && inp.value !== undefined) val = inp.value;
            if (!val) {
                try {
                    const dirEl = doc.querySelector('[dir="auto"]');
                    if (dirEl) {
                        if (dirEl.value !== undefined) val = dirEl.value;
                        else if (typeof dirEl.textContent === 'string') val = dirEl.textContent.trim();
                    }
                } catch (e) { }
            }
            if (val !== null && val !== undefined && String(val).trim() !== '') {
                list.push({ win, val: String(val) });
            }
        } catch (e) { }
    };
    checkAndPush(window);
    document.querySelectorAll('iframe').forEach(f => {
        try { if (f.contentWindow) checkAndPush(f.contentWindow); } catch (e) { }
    });
    return list;
}

function findReaderContexts(lastPageNum, currentPageNum) {
    const list = collectReaderContexts();
    if (list.length === 0) return [window];
    const match = list.find(item => item.val == lastPageNum || item.val == currentPageNum);
    if (match) return [match.win];
    return [list[0].win];
}

/** Why: Reads the visible page-number from any available reader input. */
function readPageNumFromContexts() {
    const list = collectReaderContexts();
    if (!list || list.length === 0) {
        try {
            const el = document.querySelector('[dir="auto"]');
            if (el) {
                if (el.value !== undefined) return el.value;
                if (el.textContent) return el.textContent.trim();
            }
        } catch (e) { }
        return null;
    }
    const numeric = list.find(item => /^\d+$/.test(String(item.val).trim()));
    if (numeric) return numeric.val;
    for (const item of list) { if (item.val) return item.val; }
    return null;
}

/** Why: Combined local + shared KB count prevents duplicate saves. */
function combinedBookPageCount(cls, topic) {
    try {
        let localCount = 0;
        if (typeof getBookPageCount === 'function') localCount = getBookPageCount(cls, topic) || 0;
        let sharedCount = 0;
        try {
            const shared = window.__dig_shared_kb || {};
            if (shared[cls] && shared[cls][topic]) sharedCount = (shared[cls][topic].length || 0);
        } catch (e) { sharedCount = 0; }
        return (localCount || 0) + (sharedCount || 0);
    } catch (e) { return 0; }
}
