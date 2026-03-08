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

    // Sniffed Metadata Priority (pages.json)
    const metadata = window.sniffedMetadata;
    // Sniffed Metadata Priority (pagebreaks) - some VitalSource installs expose pagebreaks mapping
    if (metadata && metadata.pagebreaks) {
        const topUrl = window.top?.location?.href || url;
        let pbList = [];
        const pb = metadata.pagebreaks;
        if (Array.isArray(pb)) pbList = pb;
        else if (pb && Array.isArray(pb.pages)) pbList = pb.pages;
        else if (pb && typeof pb === 'object') {
            const vals = Object.values(pb).filter(v => v && typeof v === 'object' && (v.absoluteURL || v.cfi || v.path || v.href || v.url || v.resource || v.chapterTitle || v.title || v.label));
            if (vals.length) pbList = vals;
        }

        if (pbList.length) {
            const matchedPb = pbList.find(p => {
                return (p.absoluteURL && topUrl.includes(p.absoluteURL)) ||
                    (p.cfi && topUrl.includes(p.cfi)) ||
                    (p.path && topUrl.includes(p.path)) ||
                    (p.href && topUrl.includes(p.href)) ||
                    (p.url && topUrl.includes(p.url)) ||
                    (p.resource && topUrl.includes(p.resource));
            });

            if (matchedPb && (matchedPb.chapterTitle || matchedPb.title || matchedPb.label || matchedPb.pageTitle || matchedPb.pageLabel)) {
                const ch = matchedPb.chapterTitle || matchedPb.title || matchedPb.label || matchedPb.pageTitle || matchedPb.pageLabel;
                digLog(`Chapter detected from sniffed pagebreaks: ${ch}`);
                return ch.trim();
            }
        }
    }
    if (metadata && metadata.pages && Array.isArray(metadata.pages)) {
        const topUrl = window.top?.location?.href || url;
        const matchedPage = metadata.pages.find(p => {
            return (p.absoluteURL && topUrl.includes(p.absoluteURL)) ||
                (p.cfi && topUrl.includes(p.cfi)) ||
                (p.path && topUrl.includes(p.path));
        });

        if (matchedPage && matchedPage.chapterTitle) {
            digLog(`Chapter detected from sniffed pages.json: ${matchedPage.chapterTitle}`);
            return matchedPage.chapterTitle.trim();
        }
    }

    // Sniffed Metadata Priority (books.json fallback)
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
    const metadata = window.sniffedMetadata;
    // Prefer true title from books.json if available
    if (metadata && metadata.books && metadata.books.books && metadata.books.books.length > 0) {
        return metadata.books.books[0].title;
    }

    const header = document.querySelector('h3[class*="khVOMu"], .book-title-header, h1');
    const title = header?.innerText?.trim() || (document.title || '').replace(/Capella:|VitalSource:|[-|].*/gi, '').trim() || 'Textbook';
    digLog(`Detected Book Title: ${title}`);
    return title;
}

function getBookMetadata() {
    const metadata = window.sniffedMetadata;
    if (metadata && metadata.books && metadata.books.books && metadata.books.books.length > 0) {
        const b = metadata.books.books[0];
        return {
            author: b.author || '',
            isbn: b.isbn || '',
            edition: b.edition || '',
            publisherId: b.publisherId || ''
        };
    }
    return { author: '', isbn: '', edition: '', publisherId: '' };
}
