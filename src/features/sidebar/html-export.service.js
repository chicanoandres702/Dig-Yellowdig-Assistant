/**
 * HTML Export Service: Bundles captured HTML into a standalone document.
 */
async function exportToHTML(title, contentArray) {
    if (!contentArray || contentArray.length === 0) {
        alert("No content to export.");
        return;
    }

    let pagebreaksJson = 'null';
    try {
        const pb = window.sniffedMetadata?.pagebreaks || null;
        if (pb) pagebreaksJson = JSON.stringify(pb).replace(/</g, '\\u003c');
    } catch (e) { }

    const sorted = [...contentArray].sort((a, b) => (a.order || 0) - (b.order || 0));
    let bodyContent = '';

    for (let index = 0; index < sorted.length; index++) {
        const item = sorted[index];
        if ((!item.html || item.html.length < 30) && (!item.text || item.text.length < 30) && item.contentRef) {
            try {
                const got = typeof fetchContentRefForExport === 'function' ? await fetchContentRefForExport(item.contentRef) : null;
                if (got) { item.html = item.html || got.html || ''; item.text = item.text || got.text || ''; }
            } catch (e) { }
        }

        const timestamp = item.ts ? new Date(item.ts).toLocaleString() : 'Date Unknown';
        const chapter = item.chapter || 'Chapter Unknown';
        const cleanHtml = typeof cleanExportedHtml === 'function' ? cleanExportedHtml(item) : (item.html || item.text);
        const displayNum = item.page != null ? item.page : (index + 1);

        bodyContent += `
        <div class="page-capture">
            <div class="page-header">
                <span class="capture-title">\${escapeHtml(chapter)}</span>
                <span>Captured: \${timestamp}</span>
            </div>
            <div class="capture-body">
                \${cleanHtml}
            </div>
            <div class="page-footer">
                <span>\${escapeHtml(chapter)}</span><span>Page \${escapeHtml(displayNum.toString())}</span>
            </div>
        </div>`;
        if (index < sorted.length - 1) {
            bodyContent += `<div style="page-break-after: always;">&nbsp;</div>`;
        }
    }

    if (typeof generateHtmlExportTemplate === 'function') {
        const finalHtml = generateHtmlExportTemplate(title, pagebreaksJson, bodyContent);
        if (typeof triggerHtmlDownload === 'function') {
            triggerHtmlDownload(finalHtml, title);
            digLog(`Exported \${contentArray.length} pages to HTML`);
        }
    }
}
