/**
 * Knowledge Base: Multi-class with book support.
 */
// renderKnowledgeTab and renderKBClassItems moved to kb-ui.service.js

function saveToKnowledgeBase(text, cls) {
    let kb = {};
    try { kb = JSON.parse(localStorage.getItem('digKnowledgeBase') || '{}'); } catch (e) { kb = {}; }
    if (!kb[cls]) kb[cls] = {};
    if (!kb[cls]['Quick-Saves']) kb[cls]['Quick-Saves'] = [];
    kb[cls]['Quick-Saves'].push({ text, confirmed: true, type: 'knowledge' });
    localStorage.setItem('digKnowledgeBase', JSON.stringify(kb));
}

function saveBookPage(cls, bookTitle, chapter, pageData) {
    let kb = {};
    try { kb = JSON.parse(localStorage.getItem('digKnowledgeBase') || '{}'); } catch (e) { kb = {}; }
    if (!kb[cls]) kb[cls] = {};
    if (!kb[cls][bookTitle]) kb[cls][bookTitle] = [];

    const { text, html } = typeof pageData === 'object' ? pageData : { text: pageData, html: '' };
    if (!text || text.length < 20) return;

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
    localStorage.setItem('digKnowledgeBase', JSON.stringify(kb));
}

function getBookPageCount(cls, bookTitle) {
    try {
        const kb = JSON.parse(localStorage.getItem('digKnowledgeBase') || '{}');
        return kb[cls]?.[bookTitle]?.length || 0;
    } catch (e) { return 0; }
}
