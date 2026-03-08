/**
 * Scan Utilities: Surgical content extraction for VitalSource and standard pages.
 */
async function getVitalSourcePageText(overrideSelector, forceIncludeImages) {
    const custom = overrideSelector || localStorage.getItem('dig_custom_reader_selector');
    const includeImages = forceIncludeImages !== undefined ? forceIncludeImages : (localStorage.getItem('dig_include_images') === 'true');

    if (custom) {
        digLog(`Using custom selector: ${custom}`);
        try {
            const el = document.querySelector(custom);
            if (el) {
                const inner = el.tagName === 'IFRAME' ? el.contentDocument?.body : el;
                if (inner) return {
                    text: await extractOrderedContent(inner, includeImages),
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
        const isCoverPage = window.location.href.includes('cover');
        const selectors = ['#pbk-page', '#pfe-content', '#vst-content-display', 'main article', '.epub-content', 'body'];

        for (const s of selectors) {
            const el = document.querySelector(s);
            if (el && (el.innerText?.trim().length >= 20 || isCoverPage)) {
                let data = {
                    text: (await extractOrderedContent(el, includeImages)).substring(0, 15000),
                    html: el.innerHTML
                };

                // IF it's a cover page and we still have no images, try a surgical strike
                if (isCoverPage && !data.text.includes('![')) {
                    digLog('Cover page detected but no image found yet. Searching specifically for large images/backgrounds/canvas.');
                    const coverImg = document.querySelector('img[src*="cover"], [class*="cover"] img, [id*="cover"] img, .cover-image, canvas[class*="cover"], svg[class*="cover"]');
                    if (coverImg) {
                        const tag = coverImg.tagName;
                        const src = tag === 'CANVAS' ? 'canvas-cover' : (coverImg.src || coverImg.getAttribute('data-src') || coverImg.getAttribute('href') || coverImg.getAttribute('xlink:href'));
                        if (src) {
                            const dataUrl = await imageToDataUrl(coverImg, src);
                            data.text = `![Cover](${dataUrl || src})\n\n` + data.text;
                        }
                    }
                }
                return data;
            }
        }
    }
    return '';
}

async function extractOrderedContent(root, includeImages) {
    let result = '';
    const doc = root.ownerDocument || document;
    const win = doc.defaultView || window;
    const blockTags = new Set(['BR', 'P', 'H1', 'H2', 'H3', 'LI', 'DIV', 'TR', 'BLOCKQUOTE', 'SECTION', 'ARTICLE']);

    digLog(`Extracting content from ${root.tagName}. IncludeImages: ${includeImages}`);

    const walker = doc.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
        acceptNode: (node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
                const tag = node.tagName;
                if (/SCRIPT|STYLE|NOSCRIPT|NAV|HEADER|FOOTER/.test(tag)) return NodeFilter.FILTER_REJECT;
                if (node.id?.includes('dig-') || node.className?.toString().includes('dig-')) return NodeFilter.FILTER_REJECT;

                // Be very permissive
                if (includeImages && (tag === 'IMG' || tag === 'SVG' || tag === 'IMAGE' || tag === 'CANVAS')) return NodeFilter.FILTER_ACCEPT;

                try {
                    const s = win.getComputedStyle(node);
                    if (s.display === 'none') return NodeFilter.FILTER_REJECT;
                } catch (e) { }
            }
            return NodeFilter.FILTER_ACCEPT;
        }
    }, false);

    let imgCount = 0;
    let node = walker.nextNode();
    while (node) {
        if (node.nodeType === Node.TEXT_NODE) {
            const val = node.nodeValue.trim();
            if (val && val.length > 0) result += val + ' ';
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            const tag = node.tagName;
            if (blockTags.has(tag) && !result.endsWith('\n')) result += '\n';

            if (includeImages) {
                let src = null, alt = 'Image';

                if (tag === 'IMG') {
                    src = node.src || node.getAttribute('data-src') || node.getAttribute('src');
                    alt = node.alt || 'Image';
                } else if (tag === 'SVG' || tag === 'IMAGE') {
                    src = node.getAttribute('href') || node.getAttribute('xlink:href') || (node.href ? (typeof node.href === 'string' ? node.href : node.href.baseVal) : null);
                    // Special case: nested <image> in <svg>
                    if (!src && tag === 'SVG') {
                        const nested = node.querySelector('image');
                        if (nested) src = nested.getAttribute('href') || nested.getAttribute('xlink:href') || (nested.href ? (typeof nested.href === 'string' ? nested.href : nested.href.baseVal) : null);
                    }
                } else if (tag === 'CANVAS') {
                    src = 'canvas-active'; // Sentinel to trigger imageToDataUrl for canvas
                    alt = 'Canvas Snapshot';
                } else {
                    // Check for background-image
                    try {
                        const s = win.getComputedStyle(node);
                        const bg = s.backgroundImage;
                        if (bg && bg !== 'none' && bg.includes('url(')) {
                            src = bg.match(/url\(['"]?(.*?)['"]?\)/)?.[1];
                            const r = node.getBoundingClientRect();
                            if (r.width < 50 || r.height < 50) src = null; // Ignore tiny backgrounds
                        }
                    } catch (e) { }
                }

                if (src && (src.length > 5 || tag === 'CANVAS') && !src.startsWith('chrome-extension:')) {
                    imgCount++;
                    digLog(`[${imgCount}] Found ${tag}: ${src.substring(0, 40)}...`);
                    const dataUrl = await imageToDataUrl(node, src);
                    const fullSrc = dataUrl || (src.startsWith('data:') ? src : new URL(src, doc.baseURI).href);
                    result += `\n\n![${alt}](${fullSrc})\n\n`;
                }
            }
        }
        node = walker.nextNode();
    }

    digLog(`Extraction complete. Found ${imgCount} images.`);
    return result.replace(/\n\s*\n/g, '\n\n').replace(/ {2,}/g, ' ').trim();
}

async function imageToDataUrl(el, src) {
    if (src && src.startsWith('data:')) return src;
    try {
        const doc = el.ownerDocument || document;
        let img = el;

        // Handle Canvas directly
        if (el.tagName === 'CANVAS') return el.toDataURL('image/webp', 0.8);

        // Handle SVG image or Backgrounds by creating a temporary HTML Image
        if (el.tagName !== 'IMG') {
            img = new Image();
            img.crossOrigin = 'Anonymous';
            img.src = src.startsWith('/') ? new URL(src, doc.baseURI).href : src;
            await new Promise((res, rej) => {
                img.onload = res;
                img.onerror = rej;
                setTimeout(rej, 2000);
            });
        }

        const canvas = doc.createElement('canvas');
        canvas.width = img.naturalWidth || img.width || (el.getBoundingClientRect ? el.getBoundingClientRect().width : 100);
        canvas.height = img.naturalHeight || img.height || (el.getBoundingClientRect ? el.getBoundingClientRect().height : 100);
        if (canvas.width < 10 || canvas.height < 10) return null;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/webp', 0.8);
    } catch (e) {
        digLog(`DataURL capture failed: ${e.message}`);
        return null;
    }
}

function isDataUrl(s) { return s && s.startsWith('data:'); }



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
