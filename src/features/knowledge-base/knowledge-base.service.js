/**
 * Knowledge Base: Multi-class with book support.
 */
// renderKnowledgeTab and renderKBClassItems moved to kb-ui.service.js

// Attempt to persist knowledge-base; if we hit quota, prune oldest book pages until it fits.
function safeSaveKB(kb) {
    try {
        localStorage.setItem('digKnowledgeBase', JSON.stringify(kb));
        return true;
    } catch (e) {
        if (e && e.name === 'QuotaExceededError') {
            // gather all book-page entries with timestamps
            const entries = [];
            Object.keys(kb).forEach(cls => {
                Object.keys(kb[cls]).forEach(topic => {
                    const arr = kb[cls][topic];
                    if (Array.isArray(arr)) {
                        arr.forEach((it, idx) => {
                            if (it && it.ts) entries.push({ cls, topic, idx, ts: it.ts });
                        });
                    }
                });
            });
            // sort oldest first
            entries.sort((a, b) => a.ts - b.ts);
            while (entries.length) {
                const rem = entries.shift();
                const arr = kb[rem.cls][rem.topic];
                if (arr && arr[rem.idx]) {
                    arr.splice(rem.idx, 1);
                    // also clean up empty topic/class
                    if (arr.length === 0) delete kb[rem.cls][rem.topic];
                    if (kb[rem.cls] && Object.keys(kb[rem.cls]).length === 0) delete kb[rem.cls];
                }
                try {
                    localStorage.setItem('digKnowledgeBase', JSON.stringify(kb));
                    digLog('Pruned old KB entries to free storage');
                    return true;
                } catch (e2) {
                    // keep pruning until success or empty
                }
            }
        }
        // if we get here, writing failed even after pruning
        console.warn('Failed to save knowledge base after pruning', e);
        return false;
    }
}

function saveToKnowledgeBase(text, cls) {
    let kb = {};
    try { kb = JSON.parse(localStorage.getItem('digKnowledgeBase') || '{}'); } catch (e) { kb = {}; }
    if (!kb[cls]) kb[cls] = {};
    if (!kb[cls]['Quick-Saves']) kb[cls]['Quick-Saves'] = [];
    kb[cls]['Quick-Saves'].push({ text, confirmed: true, type: 'knowledge' });
    safeSaveKB(kb);
}

function saveBookPage(cls, bookTitle, chapter, pageData) {
    let kb = {};
    try { kb = JSON.parse(localStorage.getItem('digKnowledgeBase') || '{}'); } catch (e) { kb = {}; }
    if (!kb[cls]) kb[cls] = {};
    if (!kb[cls][bookTitle]) kb[cls][bookTitle] = [];

    let { text, html, force } = typeof pageData === 'object' ? pageData : { text: pageData, html: '', force: false };
    // allow forced saves (eg. page number only) even if text is short/empty
    if ((!text || text.length < 20) && !force) return;
    // ensure stored content includes explicit page-break markers
    if (html && !html.includes('dig-page-break')) {
        html += '<div class="dig-page-break" style="page-break-after:always;"></div>';
    }
    if (text && !text.includes('---PAGE BREAK---')) {
        text += '\n\n---PAGE BREAK---\n\n';
    }

    // De-duplication: check against all existing entries
    const entries = kb[cls][bookTitle];
    const sig = text.substring(0, 200);
    if (entries.some(e => e.text.substring(0, 200) === sig)) {
        digLog('Duplicate content detected, skipping save.');
        return;
    }

    // Extract spine/section order from URL for sorting
    const url = window.top?.location?.href || window.location.href;
    const spineMatch = url.match(/epubcfi\/6\/(\d+)/);
    const sectMatch = url.match(/sect[_-]?(\d+)[_-]?(\d+)/);
    let order = Date.now(); // fallback: timestamp order
    if (spineMatch) order = parseInt(spineMatch[1]);
    else if (sectMatch) order = parseInt(sectMatch[1]) * 100 + parseInt(sectMatch[2]);

    let meta = {};
    if (typeof getBookMetadata === 'function') meta = getBookMetadata();

    kb[cls][bookTitle].push({ text, html, type: 'book-page', chapter, ts: Date.now(), order, meta });
    const ok = safeSaveKB(kb);
    if (!ok) {
        alert('Knowledge base storage full – some pages may have been discarded.');
    }
}

function getBookPageCount(cls, bookTitle) {
    try {
        const kb = JSON.parse(localStorage.getItem('digKnowledgeBase') || '{}');
        return kb[cls]?.[bookTitle]?.length || 0;
    } catch (e) { return 0; }
}
