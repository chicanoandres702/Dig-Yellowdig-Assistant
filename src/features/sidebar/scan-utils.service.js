/**
 * Scan Utilities: Surgical content extraction for VitalSource and standard pages.
 */
function getVitalSourcePageText(overrideSelector, forceIncludeImages) {
    const custom = overrideSelector || localStorage.getItem('dig_custom_reader_selector');
    const includeImages = forceIncludeImages !== undefined ? forceIncludeImages : (localStorage.getItem('dig_include_images') === 'true');

    if (custom) {
        digLog(`Using custom selector: ${custom}`);
        try {
            const el = document.querySelector(custom);
            if (el) {
                const inner = el.tagName === 'IFRAME' ? el.contentDocument?.body : el;
                if (inner) return {
                    text: extractOrderedContent(inner, includeImages),
                    html: inner.innerHTML
                };
            }
        } catch (e) { digLog(`Selector Error: ${e.message}`); }
    }

    // Silence redundant shells
    const iframes = document.querySelectorAll('iframe');
    for (const f of iframes) {
        try {
            const r = f.getBoundingClientRect();
            if (r.width > window.innerWidth * 0.8 && r.height > window.innerHeight * 0.8) {
                const contentText = f.contentDocument?.body?.innerText || '';
                const uniqueText = Math.abs(document.body.innerText.length - contentText.length);
                if (uniqueText < 100 && !document.querySelector('img') && !custom) return '';
            }
        } catch (e) { }
    }

    if (window !== window.top || window.location.href.includes('jigsaw.vitalsource.com')) {
        const selectors = ['#pbk-page', '#pfe-content', '#vst-content-display', 'main article', '.epub-content', 'body'];
        for (const s of selectors) {
            const el = document.querySelector(s);
            if (el && el.innerText?.trim().length >= 20) {
                return {
                    text: extractOrderedContent(el, includeImages).substring(0, 15000),
                    html: el.innerHTML
                };
            }
        }
    }
    return '';
}

function extractOrderedContent(root, includeImages) {
    let result = '';
    const doc = root.ownerDocument || document;
    const blockTags = new Set(['BR', 'P', 'H1', 'H2', 'H3', 'LI', 'DIV']);
    const walker = doc.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, null, false);

    let node = walker.nextNode();
    while (node) {
        if (node.nodeType === Node.TEXT_NODE) {
            const val = node.nodeValue.trim();
            if (val) result += val + ' ';
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            const tag = node.tagName;
            if (includeImages && tag === 'IMG') {
                const src = node.src || node.getAttribute('data-src') || node.getAttribute('src');
                const isLarge = node.width >= 50 && node.height >= 50;
                if (src && isLarge) {
                    const fullSrc = src.startsWith('data:') ? src : new URL(src, doc.baseURI).href;
                    result += `\n\n$(${fullSrc})\n\n`;
                }
            } else if (blockTags.has(tag)) {
                if (!result.endsWith('\n')) result += '\n';
            }
        }
        node = walker.nextNode();
    }
    return result.replace(/\n\s*\n/g, '\n\n').replace(/ {2,}/g, ' ').trim();
}



function scanPageContent(isRaw = false) {
    const blocks = [], seen = new Set();
    document.querySelectorAll('p, li, td, blockquote, figcaption, aside').forEach(el => {
        if (!isVisible(el)) return;
        if (!isRaw && el.closest('nav, header, footer, [role="navigation"], #dig-sidebar, #dig-fab')) return;
        const text = (el.innerText || '').trim();
        if (!isRaw && (text.length < 20 || text.length > 5000)) return;
        if (isRaw && text.length < 5) return;
        const key = text.substring(0, 100);
        if (!seen.has(key)) { seen.add(key); blocks.push({ text, element: el }); }
    });
    return blocks.slice(0, isRaw ? 50 : 15);
}

function isVisible(el) {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && window.getComputedStyle(el).display !== 'none';
}

function escapeHtml(str) { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }
