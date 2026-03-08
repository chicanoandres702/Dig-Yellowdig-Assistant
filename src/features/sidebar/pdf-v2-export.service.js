/**
 * PDF Export: Renders saved HTML content with 1:1 page alignment.
 * Each saved page maps to exactly one PDF page.
 */
async function exportToPDF(title, contentArray, textOnly = false) {
    try {
        let jsPDF;
        if (window.jspdf && window.jspdf.jsPDF) {
            jsPDF = window.jspdf.jsPDF;
        } else if (window.jsPDF) {
            jsPDF = window.jsPDF;
        } else {
            alert('jsPDF not found. Reload extension and refresh.');
            return;
        }

        const doc = new jsPDF();
        const margin = 15;
        const pw = doc.internal.pageSize.getWidth();
        const ph = doc.internal.pageSize.getHeight();
        // Extract comprehensive metadata from the first page that has it
        let fullMeta = { author: '', isbn: '', edition: '', publisherId: '' };
        for (const page of contentArray) {
            if (page.meta && (page.meta.author || page.meta.isbn)) {
                fullMeta = page.meta;
                break;
            }
        }

        // Document Properties Metadata
        doc.setProperties({
            title: title,
            subject: 'Exported Course Material',
            author: fullMeta.author || 'Dig Assistant',
            creator: 'Dig Assistant Scanner',
            keywords: `education, textbook, notes${fullMeta.isbn ? ', ' + fullMeta.isbn : ''}`
        });

        // Sort pages by spine/section order so PDF is always in book order
        const sorted = [...contentArray].sort((a, b) => (a.order || 0) - (b.order || 0));

// Cover page (not counted in chapter page numbers)
        doc.setFontSize(20);
        doc.setTextColor(0);
        const tLines = doc.splitTextToSize(title, pw - 2 * margin);
        doc.text(tLines, pw / 2, ph / 2 - 40, { align: 'center' });

        let metaY = ph / 2 - 20 + (tLines.length * 6);
        doc.setFontSize(12);
        doc.setTextColor(80);

        if (fullMeta.author) {
            doc.text(`Author: ${fullMeta.author}`, pw / 2, metaY, { align: 'center' });
            metaY += 8;
        }
        if (fullMeta.edition) {
            doc.text(`Edition: ${fullMeta.edition}`, pw / 2, metaY, { align: 'center' });
            metaY += 8;
        }

        doc.setFontSize(10);
        doc.setTextColor(120);
        metaY += 4;
        doc.text(`${contentArray.length} pages captured`, pw / 2, metaY, { align: 'center' });

        // Extract and list chapters (metadata)
        const chapters = new Set();
        sorted.forEach(item => { if (item.chapter) chapters.add(item.chapter); });

        let chY = metaY + 15;
        doc.setFontSize(12);
        doc.setTextColor(0);
        if (chapters.size > 0) doc.text('Contents:', margin, chY);

        doc.setFontSize(10);
        doc.setTextColor(100);
        chY += 8;
        Array.from(chapters).slice(0, 20).forEach(ch => {
            const cLines = doc.splitTextToSize(`• ${ch}`, pw - 2 * margin);
            doc.text(cLines, margin, chY);
            chY += 6 * cLines.length;
        });
        if (chapters.size > 20) doc.text(`...and ${chapters.size - 20} more chapters`, margin, chY);

        for (let i = 0; i < sorted.length; i++) {
            doc.addPage();
            await renderPageToPDF(doc, sorted[i], i, margin, pw, ph, textOnly);
        // add simple footer so PDF pages can be cross‑checked with source index/order
        const pageNum = i + 1; // first content page is 1 (cover is separate)
        let footer = `Page ${pageNum}`;
        if (sorted[i].order != null) {
            footer += ` (orig ${sorted[i].order})`;
        }
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(footer, pw / 2, ph - margin / 2, { align: 'center' });    }    } catch (err) {
        console.error('exportToPDF exception', err);
        alert('An error occurred while generating the PDF: ' + (err.message || err));
        // rethrow so callers can handle fallback
        throw err;
    }
}

async function renderPageToPDF(doc, item, idx, margin, pw, ph, textOnly) {
    // start at top margin, optionally print chapter name above the content
    let y = margin;

    // chapter header
    if (item.chapter) {
        doc.setFontSize(10);
        doc.setTextColor(80);
        // put header slightly above the main content
        doc.text(`${item.chapter}`, margin, y);
        y += 8; // space reserved for header
    }

    // Render HTML if available, otherwise fall back to text
    const html = item.html || '';
    const text = item.text || '';

    if (!textOnly && html && html.length > 30) {
        await renderHTMLToDoc(doc, html, margin, y, pw, ph);
    } else {
        renderTextToDoc(doc, text, margin, y, pw, ph);
    }
}

async function renderHTMLToDoc(doc, html, margin, y, pw, ph) {
    // Render the HTML as a single bitmap and scale it to fit exactly one PDF page.
    // This avoids jsPDF.html's automatic pagination which could merge multiple
    // captured pages onto a single PDF page or split one capture across pages.

    const cw = Math.floor((pw - 2 * margin) * 3.78);
    const safeHtml = sanitizeHTMLForPDF(html);
    const docHtml = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:12px;background:#fff;color:#000;font-family:serif;font-size:11px;line-height:1.5;}</style></head><body>${safeHtml}</body></html>`;

    const iframe = document.createElement('iframe');
    iframe.style.cssText = `position:fixed;left:-9999px;top:0;width:${cw}px;height:auto;border:0;visibility:hidden;`;
    document.body.appendChild(iframe);

    try {
        iframe.srcdoc = docHtml;
    } catch (e) {
        const idoc = iframe.contentDocument || iframe.contentWindow.document;
        idoc.open(); idoc.write(docHtml); idoc.close();
    }

    await new Promise((resolve) => {
        iframe.onload = () => resolve();
        setTimeout(resolve, 50);
    });

    const targetDoc = iframe.contentDocument || iframe.contentWindow.document;

    // common ignoreElements predicate from before
    const ignoreElements = (el) => {
        try {
            if (!el || !el.tagName) return false;
            const tag = el.tagName.toLowerCase();
            if (tag === 'svg' || tag === 'object' || tag === 'embed') return true;
            if (tag === 'img' || tag === 'source' || tag === 'image') {
                const src = (el.getAttribute && (el.getAttribute('src') || el.getAttribute('data-src') || el.getAttribute('srcset'))) || '';
                if (src && /data:image\/(svg\+xml|svg)/i.test(src)) return true;
                if (src && /data%3Aimage%2Fsvg/i.test(src)) return true;
            }
            const styleAttr = el.getAttribute && el.getAttribute('style');
            if (styleAttr && /url\([^)]*(data:image\/(svg\+xml|svg)|data%3Aimage%2Fsvg)[^)]*\)/i.test(styleAttr)) return true;
            try {
                const bg = (el.ownerDocument && el.ownerDocument.defaultView && el.ownerDocument.defaultView.getComputedStyle) ?
                    el.ownerDocument.defaultView.getComputedStyle(el).getPropertyValue('background-image') : null;
                if (bg && /url\([^)]*(data:image\/(svg\+xml|svg)|data%3Aimage%2Fsvg)[^)]*\)/i.test(bg)) return true;
            } catch (er) { }
        } catch (e) { }
        return false;
    };

    try {
        const h2c = window.html2canvas || html2canvas;
        const canvas = await h2c(targetDoc.body, {
            scale: 1,
            useCORS: true,
            backgroundColor: '#ffffff',
            width: targetDoc.body.scrollWidth,
            ignoreElements: ignoreElements,
            logging: false
        });
        const imgData = canvas.toDataURL('image/png');
        const imgW = pw - 2 * margin;
        const imgH = (canvas.height * imgW) / canvas.width;
        const maxH = ph - 2 * margin;
        const scale = imgH > maxH ? maxH / imgH : 1;
        doc.addImage(imgData, 'PNG', margin, y, imgW * scale, imgH * scale);
    } catch (e) {
        digLog(`html2canvas render failed: ${e && e.message ? e.message : e}`);
        const fallback = (targetDoc && targetDoc.body && targetDoc.body.innerText) ?
            targetDoc.body.innerText : (targetDoc && targetDoc.innerText) ? targetDoc.innerText : '';
        renderTextToDoc(doc, fallback, margin, y, pw, ph);
    }

    document.body.removeChild(iframe);

}
function renderTextToDoc(doc, text, margin, y, pw, ph) {
    doc.setFontSize(11);
    doc.setTextColor(0);
    const clean = text.replace(/!\[.*?\]\(.*?\)/g, '[image]');
    const lines = doc.splitTextToSize(clean, pw - 2 * margin);
    for (const line of lines) {
        if (y > ph - margin) { doc.addPage(); y = margin; }
        doc.text(line, margin, y);
        y += 6;
    }
}

function sanitizeHTMLForPDF(html) {
    // Quick string-level removal of embedded SVG data URIs to avoid html2canvas image-loading errors
    try {
        html = html.replace(/data:image\/svg\+xml(?:;base64|;charset=[^,;]+|)[^\"')\s]*/gi, '');
    } catch (e) { }

    // Use DOM parsing to safely strip dangerous nodes and inline hiding styles
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Remove potentially problematic elements entirely
        doc.querySelectorAll('script, iframe, noscript').forEach(n => n.remove());

        // Remove style tags and external stylesheets (to avoid host CSS that hides content)
        doc.querySelectorAll('style').forEach(n => n.remove());
        doc.querySelectorAll('link[rel="stylesheet"]').forEach(n => n.remove());

        // Remove embedded SVGs/objects which html2canvas often fails to rasterize on some sites
        doc.querySelectorAll('svg, object, embed').forEach(n => n.remove());

        // Clean attributes that can hide or interfere with rendering
        const all = doc.querySelectorAll('*');
        all.forEach(el => {
            // remove inline event handlers
            [...el.attributes].forEach(attr => {
                if (/^on/i.test(attr.name)) el.removeAttribute(attr.name);
                if (attr.name === 'hidden') el.removeAttribute('hidden');
            });

            // sanitize style attribute: remove visibility:hidden, display:none, opacity:0
            if (el.hasAttribute('style')) {
                let s = el.getAttribute('style');
                s = s.replace(/visibility\s*:\s*hidden;?/gi, '');
                s = s.replace(/display\s*:\s*none;?/gi, '');
                s = s.replace(/opacity\s*:\s*0;?/gi, '');
                s = s.replace(/-webkit-user-select\s*:\s*none;?/gi, '');
                // remove background-image urls (especially data:image/svg+xml) to avoid html2canvas image loading errors
                s = s.replace(/background(-image)?\s*:\s*url\([^)]*\);?/gi, '');
                s = s.replace(/background(-image)?\s*:\s*url\([^)]*data:image\/svg\+xml[^)]*\);?/gi, '');
                s = s.trim();
                if (!s) el.removeAttribute('style'); else el.setAttribute('style', s);
            }
        });

        // Replace <img> elements that use SVG data URIs with plain placeholders
        doc.querySelectorAll('img').forEach(img => {
            try {
                const src = img.getAttribute('src') || '';
                if (/^data:image\/svg\+xml/i.test(src)) {
                    const span = doc.createElement('span');
                    span.textContent = img.getAttribute('alt') || '[svg image]';
                    span.setAttribute('style', 'color:#666;font-style:italic;');
                    img.parentNode && img.parentNode.replaceChild(span, img);
                }
            } catch (e) { }
        });

        // Return only the body inner content so we don't nest <html>/<body> tags
        return (doc.body && doc.body.innerHTML) ? doc.body.innerHTML : doc.documentElement.innerHTML;
    } catch (e) {
        // Fallback to simple regex-based stripping
        return html
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
            .replace(/<style[\s\S]*?<\/style>/gi, '')
            .replace(/on\w+=\"[^\"]*\"/gi, '');
    }
}
