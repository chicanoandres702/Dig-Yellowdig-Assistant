/**
 * Scan Utilities: Surgical content extraction for VitalSource and standard pages.
 */
// CFI helpers (lightweight, pragmatic helpers — not a full CFI evaluator)
function _safeDecode(s) {
    try {
        if (typeof window !== 'undefined' && window.DIG_CFI && typeof window.DIG_CFI.safeDecode === 'function') {
            return window.DIG_CFI.safeDecode(s);
        }
        return decodeURIComponent(String(s));
    } catch (e) { return String(s); }
}

function extractSpineIndex(urlOrCfi) {
    if (typeof window !== 'undefined' && window.DIG_CFI && typeof window.DIG_CFI.extractSpineIndex === 'function') {
        try { return window.DIG_CFI.extractSpineIndex(urlOrCfi); } catch (e) { /* fallback */ }
    }
    if (!urlOrCfi) return null;
    const s = _safeDecode(urlOrCfi);
    const m1 = s.match(/epubcfi\/6\/(\d+)/);
    if (m1) return parseInt(m1[1], 10);
    const m2 = s.match(/\/6\/(\d+)/);
    if (m2) return parseInt(m2[1], 10);
    const m3 = s.match(/epubcfi\([^)]*\/6\/(\d+)/);
    if (m3) return parseInt(m3[1], 10);
    return null;
}

function cfiMatchesUrl(rawCfi, url) {
    if (typeof window !== 'undefined' && window.DIG_CFI && typeof window.DIG_CFI.cfiMatchesUrl === 'function') {
        try { return window.DIG_CFI.cfiMatchesUrl(rawCfi, url); } catch (e) { /* fallback */ }
    }
    if (!rawCfi || !url) return false;
    try {
        const raw = String(rawCfi);
        const decoded = _safeDecode(raw);
        if (decoded && url.includes(decoded)) return true;
        const stripped = decoded.replace(/^epubcfi\(?/i, '').replace(/\)?$/, '');
        if (stripped && url.includes(stripped)) return true;
        if (url.includes(raw)) return true;
    } catch (e) { /* ignore */ }
    return false;
}

// Parse a minimal CFI-like string into spine index and numeric intra-document steps.
function parseCfiEntry(raw) {
    // prefer central implementation if available
    if (typeof window !== 'undefined' && window.DIG_CFI && typeof window.DIG_CFI.parseCfiEntry === 'function') {
        try { return window.DIG_CFI.parseCfiEntry(raw); } catch (e) { /* fallback */ }
    }
    try {
        const s = _safeDecode(String(raw || '')).trim();
        const norm = s.replace(/^epubcfi\(?/i, '').replace(/\)?$/, '');
        const parts = norm.split('!');
        let spine = null;
        const m = parts[0] && parts[0].match(/\/6\/(\d+)/);
        if (m) spine = parseInt(m[1], 10);
        const steps = [];
        if (parts[1]) {
            const segs = parts[1].split('/').filter(Boolean);
            for (const seg of segs) {
                const nm = String(seg).match(/^(\d+)/);
                if (nm) steps.push(parseInt(nm[1], 10));
            }
        }
        return { spine, steps, normalized: norm };
    } catch (e) { return { spine: null, steps: [], normalized: String(raw || '') }; }
}

function _compareSteps(a, b) {
    if (typeof window !== 'undefined' && window.DIG_CFI && typeof window.DIG_CFI.compareSteps === 'function') {
        try { return window.DIG_CFI.compareSteps(a, b); } catch (e) { /* fallback */ }
    }
    const A = Array.isArray(a) ? a : [];
    const B = Array.isArray(b) ? b : [];
    const L = Math.max(A.length, B.length);
    for (let i = 0; i < L; i++) {
        const ai = (typeof A[i] === 'number') ? A[i] : -1;
        const bi = (typeof B[i] === 'number') ? B[i] : -1;
        if (ai !== bi) return ai - bi;
    }
    return 0;
}

// Find the best matching pagebreak/pages entry for a given top URL
function findMatchingPagebreakEntry(pagesPayload, topUrl) {
    // prefer central implementation if present
    if (typeof window !== 'undefined' && window.DIG_CFI && typeof window.DIG_CFI.findMatchingPagebreakEntry === 'function') {
        try { return window.DIG_CFI.findMatchingPagebreakEntry(pagesPayload, topUrl); } catch (e) { /* fallback */ }
    }
    try {
        let pbList = [];
        if (!pagesPayload) return null;
        if (Array.isArray(pagesPayload)) pbList = pagesPayload;
        else if (pagesPayload && Array.isArray(pagesPayload.pages)) pbList = pagesPayload.pages;
        else if (pagesPayload && typeof pagesPayload === 'object') pbList = Object.values(pagesPayload).filter(v => v && typeof v === 'object');

        const url = topUrl || (window.top && window.top.location && window.top.location.href) || window.location.href || '';

        // 1) Exact cfiWithoutAssertions match (preferred)
        for (const p of pbList) {
            try {
                if (!p) continue;
                if (p.cfiWithoutAssertions && cfiMatchesUrl(p.cfiWithoutAssertions, url)) return { entry: p, reason: 'cfiWithoutAssertions' };
            } catch (e) { }
        }

        // 2) Exact cfi match
        for (const p of pbList) {
            try {
                if (!p) continue;
                if (p.cfi && cfiMatchesUrl(p.cfi, url)) return { entry: p, reason: 'cfi' };
            } catch (e) { }
        }

        // 3) Resource/url/path/href match
        for (const p of pbList) {
            try {
                if (!p) continue;
                if (p.absoluteURL && url.includes(String(p.absoluteURL))) return { entry: p, reason: 'absoluteURL' };
                if (p.url && url.includes(String(p.url))) return { entry: p, reason: 'url' };
                if (p.href && url.includes(String(p.href))) return { entry: p, reason: 'href' };
                if (p.resource && url.includes(String(p.resource))) return { entry: p, reason: 'resource' };
                if (p.path && url.includes(String(p.path))) return { entry: p, reason: 'path' };
            } catch (e) { }
        }

        // 4) Spine-based fallback: find entries with the same spine index
        const spine = extractSpineIndex(url) || null;
        if (spine != null) {
            const candidates = pbList.map(p => ({ p, parsed: parseCfiEntry(p.cfiWithoutAssertions || p.cfi || '') }))
                .filter(it => it.parsed && it.parsed.spine === spine);
            if (candidates.length === 1) return { entry: candidates[0].p, reason: 'spine' };
            if (candidates.length > 1) {
                // choose minimal/earliest lexicographic steps (resource-level entries usually have empty steps)
                candidates.sort((a, b) => _compareSteps(a.parsed.steps, b.parsed.steps));
                return { entry: candidates[0].p, reason: 'spine-closest', candidates: candidates.map(c => c.p) };
            }
        }

        return null;
    } catch (e) { return null; }
}

// Diagnostic helper: run matching against provided payload and optional URL
function runPagebreakDiagnostic(pagesPayload, testUrl) {
    // prefer centralized diagnostic if available
    if (typeof window !== 'undefined' && window.DIG_CFI && typeof window.DIG_CFI.runPagebreakDiagnostic === 'function') {
        try { return window.DIG_CFI.runPagebreakDiagnostic(pagesPayload, testUrl); } catch (e) { /* fallback */ }
    }
    try {
        const url = testUrl || (window.top && window.top.location && window.top.location.href) || window.location.href;
        const result = findMatchingPagebreakEntry(pagesPayload, url);
        if (!result) {
            console.info('Pagebreak diagnostic: no match found for', url);
            return null;
        }
        console.info('Pagebreak diagnostic: matched reason=', result.reason, 'entry=', result.entry);
        return result;
    } catch (e) { console.error('Diagnostic error', e); return null; }
}

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

    // helper: wait until element text grows before returning
    // wait until the element has enough text; lower timeout for speed
    async function waitForContent(el, minLength = 20, timeout = 250) {
        if (!el) return false;
        const check = () => (el.innerText || '').trim().length >= minLength;
        if (check()) return true;
        return new Promise(resolve => {
            const mo = new MutationObserver(() => {
                if (check()) {
                    mo.disconnect();
                    resolve(true);
                }
            });
            mo.observe(el, { childList: true, subtree: true, characterData: true });
            setTimeout(() => { mo.disconnect(); resolve(check()); }, timeout);
        });
    }

    if (window !== window.top || window.location.href.includes('jigsaw.vitalsource.com')) {
        const isCoverPage = window.location.href.includes('cover');
        let selectors = ['#pbk-page', '#pfe-content', '#vst-content-display', 'main article', '.epub-content', 'body'];
        // try cached selector first for speed
        if (window._dig_last_vst_selector) {
            selectors = [window._dig_last_vst_selector].concat(selectors.filter(s => s !== window._dig_last_vst_selector));
        }

        for (const s of selectors) {
            const el = document.querySelector(s);
            if (el) {
                // make sure the found element actually has text (page might still be loading)
                const ready = await waitForContent(el, isCoverPage ? 1 : 20, 250);
                if (!ready) continue;
            }
            if (el && (el.innerText?.trim().length >= 20 || isCoverPage)) {
                // remember successful selector for later
                window._dig_last_vst_selector = s;

                // Clone the element to safely mutate the HTML string for export
                let clone = el.cloneNode(true);
                if (includeImages) {
                    const imgs = clone.querySelectorAll('img, svg, image');
                    const promises = Array.from(imgs).map(async (img) => {
                        let src = img.src || img.getAttribute('data-src') || img.getAttribute('href') || img.getAttribute('xlink:href');
                        if (src && !src.startsWith('data:') && !src.startsWith('chrome-extension:')) {
                            // Convert to absolute
                            try { src = new URL(src, document.baseURI).href; } catch (e) { }

                            // Force attributes so innerHTML serialization is absolute
                            img.setAttribute('src', src);
                            if (img.tagName !== 'IMG') img.setAttribute('href', src);

                            // Attempt to get base64 data URL to embed in PDF
                            const dataUrl = await imageToDataUrl(img, src);
                            if (dataUrl) {
                                img.setAttribute('src', dataUrl);
                                if (img.tagName !== 'IMG') img.setAttribute('href', dataUrl);
                            }
                        }
                    });
                    await Promise.all(promises);
                }

                let data = {
                    text: (await extractOrderedContent(el, includeImages)).substring(0, 15000),
                    html: clone.innerHTML
                };
                // Determine page label from sniffed metadata (pagebreaks/pages) instead of reading input fields
                try {
                    const m = window.sniffedMetadata;
                    const topUrl = window.top?.location?.href || window.location.href;
                    const payload = m && (m.pages || m.pagebreaks || m) ? (m.pages || m.pagebreaks || m) : null;
                    if (payload) {
                        // prefer centralized matcher when available
                        const matcher = (typeof window !== 'undefined' && window.DIG_CFI && typeof window.DIG_CFI.findMatchingPagebreakEntry === 'function') ? window.DIG_CFI.findMatchingPagebreakEntry : findMatchingPagebreakEntry;
                        const res = matcher(payload, topUrl);
                        if (res && res.entry) {
                            const e = res.entry;
                            data.page = e.label || e.page || e.page_label || e.pageLabel || e.title || null;
                        }
                    }
                } catch (e) { }

                // IF it's a cover page and we still have no images, try a surgical strike on original DOM
                if (isCoverPage && !data.text.includes('![')) {
                    digLog('Cover page detected but no image found yet. Searching specifically for large images/backgrounds/canvas.');
                    const coverImg = document.querySelector('img[src*="cover"], [class*="cover"] img, [id*="cover"] img, .cover-image, canvas[class*="cover"], svg[class*="cover"]');
                    if (coverImg) {
                        const tag = coverImg.tagName;
                        const src = tag === 'CANVAS' ? 'canvas-cover' : (coverImg.src || coverImg.getAttribute('data-src') || coverImg.getAttribute('href') || coverImg.getAttribute('xlink:href'));
                        if (src) {
                            const dataUrl = await imageToDataUrl(coverImg, src);
                            if (dataUrl) {
                                data.text = `![Cover](${dataUrl})\n\n` + data.text;
                                data.html = `<img src="${dataUrl}" style="max-width:100%;"><br>` + data.html;
                            }
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



async function scanPageContent(isRaw = false) {
    const blocks = [], seen = new Set();
    // Allow users to specify a custom selector that limits scanning to a specific container
    const custom = localStorage.getItem('dig_custom_reader_selector');
    if (custom) {
        try {
            const roots = document.querySelectorAll(custom);
            if (roots && roots.length) {
                for (const root of roots) {
                    if (!isVisible(root)) continue;
                    // Use high-fidelity extraction for the custom root
                    const text = await extractOrderedContent(root, true);
                    if (text && text.length > 5) {
                        blocks.push({ text, element: root });
                    }
                }
                return blocks.slice(0, isRaw ? 50 : 15);
            }
        } catch (e) { digLog(`Custom Scan Error: ${e.message}`); }
    }

    // default scan across the whole document
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
