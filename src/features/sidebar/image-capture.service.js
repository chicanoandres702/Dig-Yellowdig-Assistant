/**
 * Image Capture Service: High-fidelity image extraction and snapshotting.
 * Why: Centralizes image processing for cross-frame content extraction.
 */

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
                if (includeImages && (tag === 'IMG' || tag === 'SVG' || tag === 'IMAGE' || tag === 'CANVAS')) return NodeFilter.FILTER_ACCEPT;
                try {
                    const s = win.getComputedStyle(node);
                    if (s.display === 'none') return NodeFilter.FILTER_REJECT;
                } catch (e) { }
            }
            return NodeFilter.FILTER_ACCEPT;
        }
    }, false);

    let imgCount = 0, node = walker.nextNode();
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
                    if (!src && tag === 'SVG') {
                        const nested = node.querySelector('image');
                        if (nested) src = nested.getAttribute('href') || nested.getAttribute('xlink:href') || (nested.href ? (typeof nested.href === 'string' ? nested.href : nested.href.baseVal) : null);
                    }
                } else if (tag === 'CANVAS') {
                    src = 'canvas-active'; alt = 'Canvas Snapshot';
                } else {
                    try {
                        const s = win.getComputedStyle(node), bg = s.backgroundImage;
                        if (bg && bg !== 'none' && bg.includes('url(')) {
                            src = bg.match(/url\(['"]?(.*?)['"]?\)/)?.[1];
                            const r = node.getBoundingClientRect();
                            if (r.width < 50 || r.height < 50) src = null;
                        }
                    } catch (e) { }
                }

                if (src && (src.length > 5 || tag === 'CANVAS') && !src.startsWith('chrome-extension:')) {
                    imgCount++;
                    const dataUrl = await imageToDataUrl(node, src);
                    result += `\n\n![${alt}](${dataUrl || (src.startsWith('data:') ? src : new URL(src, doc.baseURI).href)})\n\n`;
                }
            }
        }
        node = walker.nextNode();
    }
    return result.replace(/\n\s*\n/g, '\n\n').replace(/ {2,}/g, ' ').trim();
}

async function imageToDataUrl(el, src) {
    if (src && src.startsWith('data:')) return src;
    let absoluteSrc = src;
    try {
        const doc = el.ownerDocument || document;
        let img;
        if (el.tagName === 'CANVAS') return el.toDataURL('image/jpeg', 0.8);

        absoluteSrc = src.startsWith('/') ? new URL(src, doc.baseURI).href : src;

        img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = absoluteSrc;

        await new Promise((res, rej) => {
            img.onload = res;
            img.onerror = () => rej(new Error('CORS Load Failed'));
            setTimeout(() => rej(new Error('Timeout')), 3000);
        });

        const canvas = doc.createElement('canvas');
        canvas.width = img.naturalWidth || img.width || (el.getBoundingClientRect ? el.getBoundingClientRect().width : 100);
        canvas.height = img.naturalHeight || img.height || (el.getBoundingClientRect ? el.getBoundingClientRect().height : 100);
        if (canvas.width < 10 || canvas.height < 10) return null;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.8);
    } catch (e) {
        if (chrome.runtime?.id && absoluteSrc && !absoluteSrc.startsWith('data:')) {
            digLog(`Canvas taint or load failure, proxying via background: ${absoluteSrc}`);
            try {
                const response = await new Promise(resolve => chrome.runtime.sendMessage({ type: 'FETCH_IMAGE_AS_BASE64', url: absoluteSrc }, resolve));
                if (response && response.dataUrl) return response.dataUrl;
            } catch (err) {
                digLog(`Background proxy failed: ${err.message}`);
            }
        }
        digLog(`DataURL capture completely failed: ${e.message}`);
        return null;
    }
}
