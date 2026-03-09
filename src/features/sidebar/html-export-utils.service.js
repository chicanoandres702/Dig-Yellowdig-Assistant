/**
 * HTML Export Utils: Helpers for HTML Export Service.
 */

function generateHtmlExportTemplate(title, pagebreaksJson, bodyContent) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>\${escapeHtml(title)}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 40px auto; padding: 20px; background: #f4f7f6; }
        .page-capture { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); margin-bottom: 40px; position: relative; page-break-inside: avoid; break-inside: avoid; page-break-before: always; }
        .page-capture:first-child { page-break-before: auto; }
        .page-header { border-bottom: 1px solid #eee; margin-bottom: 20px; padding-bottom: 10px; color: #666; font-size: 13px; display: flex; justify-content: space-between; }
        .capture-title { color: #10b981; font-weight: bold; }
        h1 { text-align: center; color: #064e3b; margin-bottom: 50px; }
        img { max-width: 100%; height: auto; border-radius: 4px; display: block; margin: 20px 0; }
        .page-footer { border-top:1px solid #eee; margin-top:20px; padding-top:10px; font-size:11px; color:#666; display:flex; justify-content:space-between; }
        @media print {
            body { background: white; margin: 0; padding: 0; }
            .page-capture { box-shadow: none; border: none; page-break-after: always; page-break-inside: avoid; break-inside: avoid; margin: 0; padding: 20px; }
            .page-capture:last-child { page-break-after: auto; }
            .page-footer { border-top:1px solid #eee; margin-top:20px; padding-top:10px; font-size:11px; color:#666; display:flex; justify-content:space-between; }
            .no-print { display: none !important; }
        }
    </style>
</head>
<body>
    <button onclick="window.print()" class="no-print" style="position:fixed;top:20px;right:20px;padding:10px 20px;background:#10b981;color:white;border:none;border-radius:4px;cursor:pointer;font-weight:bold;box-shadow:0 2px 4px rgba(0,0,0,0.1);z-index:9999;">Export to PDF</button>
    <h1>\${escapeHtml(title)}</h1>
    <div id="content">
        <script id="dig-sniffed-pagebreaks" type="application/json">\${pagebreaksJson}</script>
        \${bodyContent}
    </div>
</body>
</html>`;
}

function cleanExportedHtml(item) {
    let cleanHtml = item.html || item.text.replace(/\n/g, '<br>');
    cleanHtml = cleanHtml.replace(/---PAGE BREAK---/g, '');
    if (item.html) {
        cleanHtml = cleanHtml.replace(/<style.*?body\{visibility:hidden.*?<\/style>/gi, '');
        cleanHtml = cleanHtml.replace(/<script.*?>eval\(.*?<\/script>/gi, '');
        cleanHtml = cleanHtml.replace(/<script.*?vst.js.*?<\/script>/gi, '');
    }
    return cleanHtml;
}

function triggerHtmlDownload(htmlString, title) {
    const blob = new Blob([htmlString], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `\${title.replace(/[^a-z0-9]/gi, '_')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function fetchContentRefForExport(ref) {
    return new Promise((resolve) => {
        try {
            if (window.chrome && chrome.storage && chrome.storage.local && ref) {
                chrome.storage.local.get(ref, (res) => {
                    try { resolve(res && res[ref] ? res[ref] : null); } catch (e) { resolve(null); }
                });
            } else resolve(null);
        } catch (e) { resolve(null); }
    });
}
