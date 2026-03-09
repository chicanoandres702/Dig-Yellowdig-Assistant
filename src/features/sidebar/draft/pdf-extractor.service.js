/**
 * PDF Extractor Service: Utility for extracting text from PDFs using pdf.js.
 */

async function extractTextFromPdf(file) {
    const arrayBuffer = await (file.arrayBuffer ? file.arrayBuffer() : new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result);
        r.onerror = rej;
        r.readAsArrayBuffer(file);
    }));

    let module = null;
    try {
        module = await import(chrome.runtime.getURL('pdf.min.mjs'));
    } catch (e) {
        try {
            module = await import(chrome.runtime.getURL('pdf.js'));
        } catch (e2) {
            module = null;
        }
    }

    const pdfjsLib = module && (module.default || module.pdfjsLib || module.PDFJS || module);
    if (!pdfjsLib || typeof pdfjsLib.getDocument !== 'function') {
        throw new Error('pdf.js not available in this context');
    }

    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = loadingTask && loadingTask.promise ? await loadingTask.promise : await loadingTask;
    const n = pdf.numPages || 0;
    const pages = [];

    for (let p = 1; p <= n; p++) {
        try {
            const page = await pdf.getPage(p);
            const txt = await page.getTextContent();
            const items = txt && txt.items ? txt.items : [];
            const pageText = items.map(it => (it && (it.str || it.unicode)) ? (it.str || it.unicode) : '').join(' ');
            pages.push(pageText.trim());
        } catch (e) {
            pages.push('');
        }
    }
    return pages.join('\n\n---PAGE BREAK---\n\n');
}
