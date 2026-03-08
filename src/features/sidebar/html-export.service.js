/**
 * HTML Export Service: Bundles captured HTML into a standalone document.
 */
function exportToHTML(title, contentArray) {
    if (!contentArray || contentArray.length === 0) {
        alert("No content to export.");
        return;
    }

    let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 40px auto; padding: 20px; background: #f4f7f6; }
        .page-capture { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); margin-bottom: 40px; position: relative; }
        .page-header { border-bottom: 1px solid #eee; margin-bottom: 20px; padding-bottom: 10px; color: #666; font-size: 13px; display: flex; justify-content: space-between; }
        .capture-title { color: #10b981; font-weight: bold; }
        h1 { text-align: center; color: #064e3b; margin-bottom: 50px; }
        img { max-width: 100%; height: auto; border-radius: 4px; display: block; margin: 20px 0; }
        @media print {
            body { background: white; margin: 0; padding: 0; }
            .page-capture { box-shadow: none; border: none; page-break-after: always; margin: 0; padding: 20px; }
        }
    </style>
</head>
<body>
    <h1>${escapeHtml(title)}</h1>
    <div id="content">`;

    contentArray.forEach((item, index) => {
        const timestamp = item.ts ? new Date(item.ts).toLocaleString() : 'Date Unknown';
        const chapter = item.chapter || 'Chapter Unknown';

        html += `
        <div class="page-capture">
            <div class="page-header">
                <span class="capture-title">${escapeHtml(chapter)}</span>
                <span>Captured: ${timestamp}</span>
            </div>
            <div class="capture-body">
                ${item.html || item.text.replace(/\n/g, '<br>')}
            </div>
        </div>`;
    });

    html += `
    </div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, '_')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    digLog(`Exported ${contentArray.length} pages to HTML`);
}
