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

// extractOrderedContent and imageToDataUrl moved to image-capture.service.js

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
