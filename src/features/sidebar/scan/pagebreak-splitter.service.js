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
function splitContentByPagebreaks(text, html, url) {
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

        return _splitBySelectorOrMarkers(entries, text, html)
            || _splitByParagraphs(entries, text);
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

function _splitBySelectorOrMarkers(entries, text, html) {
    const allSelector = entries.every(e => e && (e.selector || e.cssSelector || e.elementSelector || e.id));
    if (allSelector) return _splitBySelectors(entries);

    const allMarkers = entries.every(e => e && (e.start_marker || e.end_marker || e.start || e.end));
    if (allMarkers && html) return _splitByMarkers(entries, html);

    return null;
}

function _splitBySelectors(entries) {
    const rootSel = window._dig_last_vst_selector || '#pbk-page';
    const root = document.querySelector(rootSel) || document;
    const slices = [];
    for (const e of entries) {
        let sel = e.selector || e.cssSelector || e.elementSelector || (e.id ? `#${e.id}` : null);
        let el = null;
        try { if (sel && root) el = root.querySelector(sel) || document.querySelector(sel); } catch (err) { }
        slices.push({ text: el ? (el.innerText || '') : '', html: el ? el.innerHTML : '', label: _getEntryLabel(e) });
    }
    return slices.length ? slices : null;
}
