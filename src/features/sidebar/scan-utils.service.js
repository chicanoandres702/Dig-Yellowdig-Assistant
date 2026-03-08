/**
 * Scan Utilities: Surgical content extraction for VitalSource and standard pages.
 */
function getVitalSourcePageText(overrideSelector) {
    const custom = overrideSelector || localStorage.getItem('dig_custom_reader_selector');
    const includeImages = localStorage.getItem('dig_include_images') === 'true';
    const images = includeImages ? getImagesAsMarkdown() : '';

    let text = '', html = '';

    if (custom) {
        digLog(`Using custom selector: ${custom}`);
        try {
            const el = document.querySelector(custom);
            if (el) {
                const inner = el.tagName === 'IFRAME' ? el.contentDocument?.body : el;
                text = (inner?.innerText || '').trim();
                html = (inner?.innerHTML || '').trim();
                if (text.length > 10) return { text: text + images, html };
            }
        } catch (e) { digLog(`Selector Error: ${e.message}`); }
    }

    // Silence shells
    const iframes = document.querySelectorAll('iframe');
    for (const f of iframes) {
        try {
            const r = f.getBoundingClientRect();
            if (r.width > window.innerWidth * 0.8 && r.height > window.innerHeight * 0.8) {
                const uniqueText = document.body.innerText.length - (f.contentDocument?.body?.innerText?.length || 0);
                if (uniqueText < 100 && !document.querySelector('img') && !custom) return '';
            }
        } catch (e) { }
    }

    if (window !== window.top || window.location.href.includes('jigsaw.vitalsource.com')) {
        const selectors = ['#pbk-page', '#pfe-content', '#vst-content-display', 'main article', '.epub-content', 'body'];
        for (const s of selectors) {
            const el = document.querySelector(s);
            if (el && el.innerText?.trim().length >= 20) {
                return { text: el.innerText.trim().substring(0, 15000), html: el.innerHTML };
            }
        }
        const bodyText = document.body.innerText.split('\n').filter(l => l.trim().length > 10).join('\n').substring(0, 15000);
        return { text: bodyText + images, html: document.body.innerHTML };
    }
    return '';
}

function getImagesAsMarkdown() {
    let md = '';
    document.querySelectorAll('img').forEach(img => {
        if (img.width < 50 || img.height < 50) return;
        const src = img.src, alt = img.alt || 'Image';
        md += `\n\n![${alt}](${src})\n`;
    });
    return md;
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
