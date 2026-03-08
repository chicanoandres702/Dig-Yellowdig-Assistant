/**
 * PDF Export: Renders saved HTML content with 1:1 page alignment.
 * Each saved page maps to exactly one PDF page.
 */
async function exportToPDF(title, contentArray, textOnly = false) {
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

    // Cover page
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
    if (fullMeta.isbn) {
        doc.text(`ISBN: ${fullMeta.isbn}`, pw / 2, metaY, { align: 'center' });
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
    }

    doc.save(`${title.replace(/[^a-z0-9]/gi, '_')}.pdf`);
}

async function renderPageToPDF(doc, item, idx, margin, pw, ph, textOnly) {
    const y = margin;

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
    const container = document.createElement('div');
    const cw = Math.floor((pw - 2 * margin) * 3.78);
    container.style.cssText = `position:fixed;left:-9999px;top:0;width:${cw}px;font-family:serif;font-size:11px;line-height:1.5;color:#000;background:#fff;`;
    container.innerHTML = sanitizeHTMLForPDF(html);
    document.body.appendChild(container);

    try {
        await doc.html(container, {
            x: margin, y: y,
            width: pw - 2 * margin,
            windowWidth: container.offsetWidth,
            html2canvas: { scale: 0.5, useCORS: true }
        });
    } catch (e) {
        digLog(`HTML render failed, falling back to text: ${e.message}`);
        const fallback = container.innerText || '';
        renderTextToDoc(doc, fallback, margin, y, pw, ph);
    }

    document.body.removeChild(container);
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
    // Strip scripts, iframes, and dangerous tags
    return html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/on\w+="[^"]*"/gi, '');
}
