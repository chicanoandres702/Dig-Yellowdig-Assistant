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
            .no-print { display: none !important; }
        }
    </style>
</head>
<body>
    <button onclick="window.print()" class="no-print" style="position:fixed;top:20px;right:20px;padding:10px 20px;background:#10b981;color:white;border:none;border-radius:4px;cursor:pointer;font-weight:bold;box-shadow:0 2px 4px rgba(0,0,0,0.1);z-index:9999;">Export to PDF</button>
    <h1>${escapeHtml(title)}</h1>
    <div id="content">`;

    // Sort by spine/section order
    const sorted = [...contentArray].sort((a, b) => (a.order || 0) - (b.order || 0));

    sorted.forEach((item, index) => {
        const timestamp = item.ts ? new Date(item.ts).toLocaleString() : 'Date Unknown';
        const chapter = item.chapter || 'Chapter Unknown';

        // Clean the HTML: Remove VitalSource anti-view garbage
        let cleanHtml = item.html || item.text.replace(/\n/g, '<br>');
        if (item.html) {
            // Remove the body{visibility:hidden} style
            cleanHtml = cleanHtml.replace(/<style.*?body\{visibility:hidden.*?<\/style>/gi, '');
            // Remove the eval scripts that often handle DRM or hiding
            cleanHtml = cleanHtml.replace(/<script.*?>eval\(.*?<\/script>/gi, '');
            // Remove other VitalSource specific scripts
            cleanHtml = cleanHtml.replace(/<script.*?vst.js.*?<\/script>/gi, '');
        }

        html += `
        <div class="page-capture">
            <div class="page-header">
                <span class="capture-title">${escapeHtml(chapter)}</span>
                <span>Captured: ${timestamp}</span>
            </div>
            <div class="capture-body">
                ${cleanHtml}
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
