/**
 * Draft Storage Service: Manages saving, loading, clearing, and exporting draft entries.
 */

const DIG_DRAFT_LS_KEY = 'dig_response_tool_entries_v1';

function uid() {
    return 'r_' + Date.now() + '_' + Math.floor(Math.random() * 0xFFFF).toString(16);
}

function now() {
    return new Date().toISOString();
}

function loadDraftEntries() {
    try {
        return JSON.parse(localStorage.getItem(DIG_DRAFT_LS_KEY) || '[]');
    } catch (e) {
        return [];
    }
}

function saveDraftEntries(arr) {
    try {
        localStorage.setItem(DIG_DRAFT_LS_KEY, JSON.stringify(arr));
        // Note: The UI layer should listen for changes or pass a callback to re-render
    } catch (e) { }
}

function addDraftEntry(entry) {
    const arr = loadDraftEntries();
    arr.unshift(entry);
    saveDraftEntries(arr);
}

function clearDraftEntries() {
    localStorage.removeItem(DIG_DRAFT_LS_KEY);
}

// Helpers for escaping strings
function escapeHtmlForInline(s) {
    return String(s || '').replace(/'/g, "\\'").replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/\r/g, '');
}
function escapeHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Generates an HTML document string from saved drafts.
 */
function generateExportHTML(entries) {
    const htmlParts = [
        '<!doctype html>',
        '<html><head><meta charset="utf-8">',
        '<meta name="viewport" content="width=device-width,initial-scale=1">',
        '<title>Dig Response Tool Export</title>',
        '<style>body{font-family:Arial,Helvetica,sans-serif;margin:18px;background:#fff;color:#0f172a}',
        'pre{white-space:pre-wrap;font-size:14px;padding:10px;border:1px solid #e6eef6;background:#f8fafc;border-radius:8px}</style>',
        '</head><body>',
        '<h2>Dig — Exported Responses</h2>',
        '<div>Use the "Click to Copy" buttons to copy each block into Canvas.</div>'
    ];

    entries.forEach(en => {
        htmlParts.push(`<h3>${(en.type === 'post') ? 'Yellowdig Post' : 'Peer Response'} • ${new Date(en.createdAt).toLocaleString()}</h3>`);
        // Use data attributes instead of inline onclick to avoid CSP violations when this
        // HTML is rendered inside an injected sidebar on pages with strict CSP. A delegated
        // click handler (installed by the sidebar) will handle elements with [data-dig-text].
        htmlParts.push(`<div><button class="dig-copy-btn" data-dig-text="${escapeHtmlForInline(en.headerText || '')}">Click to Copy Header</button></div>`);
        htmlParts.push(`<pre>${escapeHtml(en.contentText || '')}</pre>`);
        htmlParts.push('<hr/>');
    });

    htmlParts.push('</body></html>');
    return htmlParts.join('\n');
}

/**
 * Triggers the download of the export HTML.
 */
function downloadExportHTML(htmlString) {
    const blob = new Blob([htmlString], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dig-responses.html';
    a.click();
    URL.revokeObjectURL(url);
}
