/**
 * VitalSource-specific detection logic.
 */
function detectVitalSourceClass() {
    const url = window.location.href, jigsawMatch = url.match(/books\/(\d+)/);
    const titleMatch = (document.title || '').match(/([A-Z]{2,4}[-_]?FPX?\d{4})/i);
    if (titleMatch) return titleMatch[1];
    if (jigsawMatch) return 'Book ' + jigsawMatch[1];
    return localStorage.getItem('dig_last_class') || 'Textbook';
}

function detectVitalSourceChapter() {
    const url = window.location.href;

    // Sniffed Metadata Priority
    const metadata = window.sniffedMetadata;
    if (metadata && metadata.books) {
        const toc = metadata.books.table_of_contents || [];
        const currentId = url.split('/').pop().split(/[?#]/)[0];
        const match = toc.find(item => item.id === currentId || (item.url && item.url.includes(currentId)));
        if (match) {
            digLog(`Chapter detected from sniffed books.json: ${match.title}`);
            return match.title;
        }
    }

    const chMatch = url.match(/ch[_-]?(\d+)/i);
    if (chMatch) {
        digLog(`Chapter detected from URL: ${chMatch[1]}`);
        return 'Chapter ' + chMatch[1];
    }
    const active = document.querySelector('[aria-current="true"], .active-toc-item');
    if (active?.innerText) {
        const text = active.innerText.replace(/\d+$/, '').trim().substring(0, 50);
        digLog(`Chapter detected from TOC: ${text}`);
        return text;
    }
    const reader = document.querySelector('iframe[id*="reader-frame"], #pbk-page, #pfe-content, main');
    const context = reader || document;
    const headings = context.querySelectorAll('h1, h2, h3, [class*="chapter"], [class*="title"]');
    for (const h of headings) {
        const text = h.innerText?.trim();
        if (text && text.match(/chapter|ch\.\s?\d/i)) {
            digLog(`Chapter detected from heading: ${text}`);
            return text.substring(0, 50);
        }
    }
    return getBookTitle().substring(0, 50);
}

function getBookTitle() {
    const header = document.querySelector('h3[class*="khVOMu"], .book-title-header, h1');
    const title = header?.innerText?.trim() || (document.title || '').replace(/Capella:|VitalSource:|[-|].*/gi, '').trim() || 'Textbook';
    digLog(`Detected Book Title: ${title}`);
    return title;
}
