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

    // Simple de-duplication: check against last entry
    const entries = kb[cls][bookTitle];
    if (entries.length > 0) {
        const last = entries[entries.length - 1];
        if (last.text.substring(0, 200) === text.substring(0, 200)) {
            digLog('Duplicate content detected, skipping save.');
            return;
        }
    }

    kb[cls][bookTitle].push({ text, html, type: 'book-page', chapter, ts: Date.now() });
    localStorage.setItem('digKnowledgeBase', JSON.stringify(kb));
}

function getBookPageCount(cls, bookTitle) {
    try {
        const kb = JSON.parse(localStorage.getItem('digKnowledgeBase') || '{}');
        return kb[cls]?.[bookTitle]?.length || 0;
    } catch (e) { return 0; }
}
