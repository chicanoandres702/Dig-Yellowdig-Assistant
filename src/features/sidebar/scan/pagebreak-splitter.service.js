/**
 * Pagebreak Splitter: Splits captured content by sniffed pagebreak metadata.
 * Why: VitalSource sometimes loads multiple logical book pages into a single
 * viewer frame. Sniffed metadata tells us where the breaks are so each
 * logical page gets its own KB entry.
 */

/**
 * Why: Attempts three strategies to split content:
 * 1. CSS selectors from pagebreak entries
 * 2. Start/end HTML markers
 * 3. Fallback: even paragraph-based splitting
 */
async function splitContentByPagebreaks(text, html, url) {
    try {
        const m = window.sniffedMetadata;
        if (!m || !m.pagebreaks) return null;
        const pbList = _normalizePagebreakList(m.pagebreaks);
        if (!pbList.length) return null;

        const topUrl = window.top?.location?.href || url || window.location.href;
        const matches = _findMatchingPagebreaks(pbList, topUrl);
        if (!matches.length) return null;

        const entries = _expandSubpages(matches);
        if (!entries.length) return null;

        const bySelector = await _splitBySelectorOrMarkers(entries, text, html);
        if (bySelector && Array.isArray(bySelector) && bySelector.length) return bySelector;
        return _splitByParagraphs(entries, text);
    } catch (e) { return null; }
}

function _normalizePagebreakList(pb) {
    if (Array.isArray(pb)) return pb;
    if (pb && Array.isArray(pb.pages)) return pb.pages;
    if (pb && typeof pb === 'object') return Object.values(pb).filter(v => v && typeof v === 'object');
    return [];
}

function _findMatchingPagebreaks(pbList, topUrl) {
    const direct = pbList.filter(p => {
        try {
            if (!p) return false;
            const urlFields = [p.absoluteURL, p.url, p.href, p.resource, p.path];
            if (urlFields.some(f => f && topUrl.includes(String(f)))) return true;
            if (p.cfi && cfiMatchesUrl(p.cfi, topUrl)) return true;
            if (p.cfiWithoutAssertions && cfiMatchesUrl(p.cfiWithoutAssertions, topUrl)) return true;
            return false;
        } catch (e) { return false; }
    });
    if (direct.length) return direct;

    // Fallback: broader matching using base URL
    const base = (topUrl || '').split(/[?#]/)[0];
    return pbList.filter(p => {
        try {
            const vals = [p.resource, p.url, p.href, p.absoluteURL, p.path].filter(Boolean).map(String);
            if (p.cfi || p.cfiWithoutAssertions) {
                const raw = String(p.cfiWithoutAssertions || p.cfi || '');
                const decoded = _safeDecode(raw);
                vals.push(raw);
                if (decoded) vals.push(decoded);
                const stripped = decoded.replace(/^epubcfi\(?/i, '').replace(/\)?$/, '');
                if (stripped) vals.push(stripped);
            }
            return vals.some(v => base.includes(v) || v.includes(base));
        } catch (e) { return false; }
    });
}

function _expandSubpages(matches) {
    const entries = [];
    for (const mm of matches) {
        if (mm && Array.isArray(mm.subpages) && mm.subpages.length) entries.push(...mm.subpages);
        else entries.push(mm);
    }
    return entries;
}

function _getEntryLabel(e) {
    return e.label || e.page || e.page_label || e.title || e.pageTitle || null;
}

async function _splitBySelectorOrMarkers(entries, text, html) {
    const allSelector = entries.every(e => e && (e.selector || e.cssSelector || e.elementSelector || e.id));
    if (allSelector) {
        const res = _splitBySelectors(entries);
        // _splitBySelectors may return a Promise (cross-frame image work); await if so
        if (res && typeof res.then === 'function') return await res;
        return res;
    }

    const allMarkers = entries.every(e => e && (e.start_marker || e.end_marker || e.start || e.end));
    if (allMarkers && html) return _splitByMarkers(entries, html);

    return null;
}

function _splitBySelectors(entries) {
    // Recursive search across same-origin frames for selectors and include images
    const rootSel = window._dig_last_vst_selector || '#pbk-page';
    const slices = [];

    // helper: gather accessible docs/windows recursively
    function collectDocs(win) {
        const docs = [];
        try {
            const doc = win.document;
            docs.push({ win, doc });
            const iframes = doc.querySelectorAll ? Array.from(doc.querySelectorAll('iframe')) : [];
            for (const f of iframes) {
                try {
                    const childWin = f.contentWindow;
                    if (!childWin || childWin === win) continue;
                    // attempt to access document to ensure same-origin
                    const childDoc = childWin.document;
                    if (childDoc) {
                        docs.push(...collectDocs(childWin));
                    }
                } catch (e) { /* cross-origin or inaccessible frame */ }
            }
        } catch (e) { /* inaccessible window */ }
        return docs;
    }

    const docs = collectDocs(window);

    async function resolveElementInfo(el, doc) {
        try {
            // clone and inline images where possible
            const clone = el.cloneNode(true);
            const origImgs = Array.from(el.querySelectorAll('img, svg, image, canvas'));
            const cloneImgs = Array.from(clone.querySelectorAll('img, svg, image, canvas'));
            for (let i = 0; i < Math.min(origImgs.length, cloneImgs.length); i++) {
                try {
                    const orig = origImgs[i];
                    const cloneImg = cloneImgs[i];
                    let src = orig.src || orig.getAttribute('data-src') || orig.getAttribute('href') || orig.getAttribute('xlink:href');
                    if (src && !src.startsWith('data:') && !src.startsWith('chrome-extension:')) {
                        try { src = new URL(src, doc.baseURI).href; } catch (e) {}
                    }
                    const dataUrl = await imageToDataUrl(orig, src || '');
                    if (dataUrl) {
                        if (cloneImg.tagName === 'CANVAS') {
                            // replace canvas with img tag
                            const imgEl = doc.createElement('img'); imgEl.src = dataUrl; cloneImg.replaceWith(imgEl);
                        } else {
                            try { cloneImg.setAttribute('src', dataUrl); } catch (e) { }
                        }
                    }
                } catch (e) { /* ignore per-image errors */ }
            }
            const html = clone.innerHTML;
            const text = await extractOrderedContent(el, true).catch(() => (el.innerText || ''));
            return { text: text || '', html: html || '', label: null };
        } catch (e) { return { text: el.innerText || '', html: el.innerHTML || '', label: null }; }
    }

    // For each entry, attempt to find selector across collected docs
    const promises = entries.map(async (e) => {
        const sel = e.selector || e.cssSelector || e.elementSelector || (e.id ? `#${e.id}` : null);
        let found = null;
        if (!sel) return { text: '', html: '', label: _getEntryLabel(e) };
        for (const d of docs) {
            try {
                const root = d.doc.querySelector(rootSel) || d.doc;
                let el = null;
                try { el = root ? root.querySelector(sel) : null; } catch (err) { }
                if (!el) {
                    try { el = d.doc.querySelector(sel); } catch (err) { }
                }
                if (el) { found = { el, doc: d.doc }; break; }
            } catch (err) { /* ignore doc-level errors */ }
        }
        if (found) {
            const info = await resolveElementInfo(found.el, found.doc);
            info.label = _getEntryLabel(e);
            return info;
        }
        return { text: '', html: '', label: _getEntryLabel(e) };
    });

    return Promise.all(promises).then(results => results.length ? results : null).catch(() => null);
}
