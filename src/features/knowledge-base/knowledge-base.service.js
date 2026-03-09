/**
 * Knowledge Base Service: Public API for saving and counting KB items.
 * Relies on kb-storage-core.service.js for persistence logic.
 */

function saveToKnowledgeBase(text, cls) {
    let kb = {};
    try { kb = JSON.parse(localStorage.getItem('digKnowledgeBase') || '{}'); } catch (e) { kb = {}; }
    if (!kb[cls]) kb[cls] = {};
    if (!kb[cls]['Quick-Saves']) kb[cls]['Quick-Saves'] = [];

    const content = (typeof text === 'string') ? text : (text && text.text) || '';
    const html = (text && text.html) || '';
    const entry = { text: String(content || '').substring(0, 300), confirmed: true, type: 'knowledge' };

    if ((content && content.length > 2000) || (html && html.length > 2000)) {
        const ref = _storeRemoteContent({ text: content, html });
        if (ref) entry.contentRef = ref;
    }
    kb[cls]['Quick-Saves'].push(entry);
    safeSaveKB(kb);
}

function saveToBucket(cls, topic, text, opts = {}) {
    let kb = {};
    try { kb = JSON.parse(localStorage.getItem('digKnowledgeBase') || '{}'); } catch (e) { kb = {}; }
    if (!kb[cls]) kb[cls] = {};
    if (!kb[cls][topic]) kb[cls][topic] = [];

    const { html = '', type = 'knowledge', chapter = null, force = false } = opts;
    if (type === 'knowledge' && (!text || text.length < 5) && !force) return false;

    const now = Date.now();
    const rawText = (typeof text === 'string') ? text : (text && text.text) || '';
    const rawHtml = opts.html || '';
    const entryBase = { text: String(rawText || '').substring(0, 300), html: '', type: type === 'book-page' ? 'book-page' : 'knowledge', ts: now, url: opts.url || (window.top?.location?.href || window.location.href) };
    if (type === 'book-page') entryBase.chapter = chapter;

    if ((rawText && rawText.length > 2000) || (rawHtml && rawHtml.length > 2000)) {
        const ref = _storeRemoteContent({ text: rawText, html: rawHtml });
        if (ref) entryBase.contentRef = ref;
    } else {
        entryBase.text = rawText;
        entryBase.html = rawHtml;
    }
    kb[cls][topic].push(entryBase);

    const ok = safeSaveKB(kb);
    if (ok) {
        try { if (typeof window !== 'undefined' && window && window.dispatchEvent) { const newCount = kb[cls] && kb[cls][topic] ? kb[cls][topic].length : 0; window.dispatchEvent(new CustomEvent('DIG_BOOKPAGE_SAVED', { detail: { cls, bookTitle: topic, count: newCount, ts: Date.now() } })); } } catch (e) { }
    }
    return ok;
}

function saveBookPage(cls, bookTitle, chapter, pageData) {
    let kb = {};
    try { kb = JSON.parse(localStorage.getItem('digKnowledgeBase') || '{}'); } catch (e) { kb = {}; }
    if (!kb[cls]) kb[cls] = {};
    if (!kb[cls][bookTitle]) kb[cls][bookTitle] = [];

    let { text, html, force, page: pageLabel } = typeof pageData === 'object' ? pageData : { text: pageData, html: '', force: false };
    if ((!text || text.length < 20) && !force) return;

    if (html && !html.includes('dig-page-break')) {
        html += '<div class="dig-page-break" style="page-break-after:always;"></div>';
    }
    if (text && !text.includes('---PAGE BREAK---')) {
        text += '\n\n---PAGE BREAK---\n\n';
    }

    const sig = text.substring(0, 200);
    if (kb[cls][bookTitle].some(e => e.text.substring(0, 200) === sig)) {
        digLog('Duplicate content detected, skipping save.');
        return;
    }

    const url = window.top?.location?.href || window.location.href;
    const spineMatch = url.match(/epubcfi\/6\/(\d+)/) || url.match(/\/6\/(\d+)/);
    const sectMatch = url.match(/sect[_-]?(\d+)[_-]?(\d+)/);
    let order = Date.now();
    if (spineMatch) order = parseInt(spineMatch[1]);
    else if (sectMatch) order = parseInt(sectMatch[1]) * 100 + parseInt(sectMatch[2]);

    let meta = {};
    if (typeof getBookMetadata === 'function') meta = getBookMetadata();

    const rawText = text || '';
    const rawHtml = html || '';
    const now = Date.now();
    const entry = { text: String(rawText).substring(0, 300), html: '', type: 'book-page', chapter, ts: now, order, meta, page: pageLabel != null ? pageLabel : null, url };

    if ((rawText && rawText.length > 2000) || (rawHtml && rawHtml.length > 2000)) {
        const ref = _storeRemoteContent({ text: rawText, html: rawHtml });
        if (ref) entry.contentRef = ref;
    } else {
        entry.text = rawText;
        entry.html = rawHtml;
    }
    kb[cls][bookTitle].push(entry);
    const ok = safeSaveKB(kb);
    if (!ok) alert('Knowledge base storage full – some pages may have been discarded.');

    if (ok) {
        try { if (typeof window !== 'undefined' && window && window.dispatchEvent) { const newCount = kb[cls][bookTitle].length; window.dispatchEvent(new CustomEvent('DIG_BOOKPAGE_SAVED', { detail: { cls, bookTitle, count: newCount, ts: Date.now() } })); } } catch (e) { }
    }
}

function getBookPageCount(cls, bookTitle) {
    try {
        const kb = JSON.parse(localStorage.getItem('digKnowledgeBase') || '{}');
        return kb[cls]?.[bookTitle]?.length || 0;
    } catch (e) { return 0; }
}
