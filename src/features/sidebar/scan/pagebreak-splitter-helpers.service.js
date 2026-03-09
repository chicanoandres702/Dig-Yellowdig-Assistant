/**
 * Pagebreak Splitter Helpers: Marker-based and paragraph-based splitting.
 * Why: Separated from the main splitter to stay under 100 lines per file.
 */

/** Why: Splits HTML content using start/end markers from pagebreak metadata. */
function _splitByMarkers(entries, html) {
    const slices = [];
    for (const e of entries) {
        const start = e.start_marker || e.start || null;
        const end = e.end_marker || e.end || null;
        let sliceHtml = '';
        try {
            let sidx = start ? html.indexOf(start) : 0;
            if (sidx === -1) sidx = 0;
            let eidx = end ? html.indexOf(end, sidx) : html.length;
            if (eidx === -1) eidx = html.length;
            sliceHtml = html.substring(sidx, eidx);
        } catch (err) { sliceHtml = ''; }
        const parser = new DOMParser();
        const doc = parser.parseFromString(sliceHtml || '<div></div>', 'text/html');
        const sliceText = doc.body ? (doc.body.innerText || '') : '';
        const label = _getEntryLabel(e);
        slices.push({ text: sliceText, html: sliceHtml, label });
    }
    return slices.length ? slices : null;
}

/**
 * Why: When no selectors or markers are available, we split the raw text
 * into roughly equal chunks aligned on paragraph boundaries.
 */
function _splitByParagraphs(entries, text) {
    const paras = (text || '').split(/\n{2,}|\n/).map(p => p.trim()).filter(Boolean);
    if (!paras.length) return null;

    const N = entries.length;
    const MIN_CHUNK_LENGTH = 100;
    const totalLen = paras.reduce((s, p) => s + p.length, 0);
    const target = Math.max(MIN_CHUNK_LENGTH, Math.round(totalLen / N));

    const slices = [];
    let cur = [];
    let curLen = 0;
    let idx = 0;

    for (const p of paras) {
        cur.push(p);
        curLen += p.length;
        if (curLen >= target && idx < N - 1) {
            const label = _getEntryLabel(entries[idx]);
            slices.push({
                text: cur.join('\n\n'),
                html: cur.map(t => `<p>${escapeHtml(t)}</p>`).join('\n'),
                label
            });
            idx++;
            cur = [];
            curLen = 0;
        }
    }
    if (cur.length) {
        const label = _getEntryLabel(entries[idx]);
        slices.push({
            text: cur.join('\n\n'),
            html: cur.map(t => `<p>${escapeHtml(t)}</p>`).join('\n'),
            label
        });
    }
    return slices.length ? slices : null;
}
