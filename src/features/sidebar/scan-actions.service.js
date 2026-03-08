/**
 * Scan Actions: Polling, picking, and full-content previews.
 */
function pollForBookContent(container, onReport) {
    if (!chrome.runtime?.id) return;
    const handler = (msg) => {
        if (!chrome.runtime?.id || !msg || typeof msg !== 'object') return;
        if (msg.type === 'FRAME_CONTENT_REPORT' && msg.text?.length > 20) onReport(msg);
    };
    chrome.runtime.onMessage.addListener(handler);
    chrome.runtime.sendMessage({
        type: 'BROADCAST_TO_FRAMES',
        customSelector: localStorage.getItem('dig_custom_reader_selector'),
        includeImages: localStorage.getItem('dig_include_images') === 'true'
    });
    setTimeout(() => { if (chrome.runtime?.id) chrome.runtime.onMessage.removeListener(handler); }, 5000);
}

function startBookPicking(container, onComplete) {
    if (!chrome.runtime?.id) return;
    const btn = document.getElementById('dig-book-pick');
    if (btn) { btn.innerText = 'Click an element...'; btn.style.background = '#ef4444'; }
    startPickingElement((selector) => {
        localStorage.setItem('dig_custom_reader_selector', selector);
        onComplete();
    });
}

let isAutoScanning = false;

function startAutoScan(container) {
    const btn = document.getElementById('dig-book-auto');
    if (isAutoScanning) { isAutoScanning = false; if (btn) btn.innerText = '▶️ Auto-Scan'; return; }
    isAutoScanning = true;
    let pageCount = 0;
    const bookTitle = getBookTitle();
    const incImg = localStorage.getItem('dig_include_images') === 'true';
    const customSel = localStorage.getItem('dig_custom_reader_selector');

    const navigateNext = () => {
        const nav = (win) => {
            const target = win.document.querySelector('#pbk-page, #pfe-content, .epub-content, body') || win.document.body;
            ['keydown', 'keyup'].forEach(type => {
                target.dispatchEvent(new KeyboardEvent(type, { key: 'ArrowRight', keyCode: 39, bubbles: true, cancelable: true }));
                win.dispatchEvent(new KeyboardEvent(type, { key: 'ArrowRight', keyCode: 39, bubbles: true }));
            });
            const nextBtn = win.document.querySelector('button[aria-label*="Next"], .next-button, .vst-icon-arrow-right');
            if (nextBtn) nextBtn.click();
        };
        nav(window);
        document.querySelectorAll('iframe').forEach(f => { try { nav(f.contentWindow); } catch (e) { } });
    };

    let lastTextSig = '';

    // Turbo: request content from frames, save directly, navigate immediately
    const scanNext = async () => {
        if (!isAutoScanning || !chrome.runtime?.id) return;
        pageCount++;
        if (btn) btn.innerText = `🛑 Stop (${pageCount})`;

        // Request content from all frames repeatedly until we get NEW content
        let captured = false;

        const reqInterval = setInterval(() => {
            if (isAutoScanning && !captured && chrome.runtime?.id) {
                chrome.runtime.sendMessage({ type: 'BROADCAST_TO_FRAMES', customSelector: customSel, includeImages: incImg });
            }
        }, 100); // Ask every 100ms

        const handler = (msg) => {
            if (!isAutoScanning || captured) return;
            if (msg.type === 'FRAME_CONTENT_REPORT' && msg.text?.length > 20) {
                const sig = msg.text.substring(0, 200);
                if (sig !== lastTextSig) { // Wait for DOM to actually change!
                    captured = true;
                    lastTextSig = sig;
                    const chapter = detectVitalSourceChapter();
                    saveBookPage(detectedClass, bookTitle, chapter, { text: msg.text, html: msg.html || '' });
                    digLog(`Page ${pageCount} saved`);
                }
            }
        };

        chrome.runtime.onMessage.addListener(handler);

        // Wait max 3s for new content to appear
        let wait = 0;
        while (isAutoScanning && !captured && wait < 3000) {
            await new Promise(r => setTimeout(r, 50));
            wait += 50;
        }

        clearInterval(reqInterval);
        if (chrome.runtime?.id) chrome.runtime.onMessage.removeListener(handler);

        if (!captured && isAutoScanning) {
            digLog(`Page ${pageCount} skipped (no new content detected after 3s)`);
        }
        if (!isAutoScanning) return;

        // Navigate immediately
        navigateNext();

        // Wait for URL change or 1s max
        let navigated = false;
        const onNav = () => { navigated = true; };
        window.addEventListener('DIG_PAGE_CHANGED', onNav, { once: true });

        let navWait = 0;
        while (isAutoScanning && !navigated && navWait < 1000) {
            await new Promise(r => setTimeout(r, 50));
            navWait += 50;
        }
        window.removeEventListener('DIG_PAGE_CHANGED', onNav);

        if (isAutoScanning) {
            // A microscopic delay to allow the DOM to render the new page
            await new Promise(r => setTimeout(r, 50));
            scanNext();
        }
    };

    scanNext();
}

function viewFullBookContent(title, text) {
    if (!text) return;
    showFullPreview(title, text);
}
