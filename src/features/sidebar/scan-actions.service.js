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

    const navigateNext = () => {
        digLog(`Navigating to Page ${pageCount + 1} via Arrow/Button`);
        const nav = (win) => {
            // 1. Keyboard Event
            const target = win.document.querySelector('#pbk-page, #pfe-content, .epub-content, body') || win.document.body;
            ['keydown', 'keyup'].forEach(type => {
                target.dispatchEvent(new KeyboardEvent(type, { key: 'ArrowRight', keyCode: 39, bubbles: true, cancelable: true }));
                win.dispatchEvent(new KeyboardEvent(type, { key: 'ArrowRight', keyCode: 39, bubbles: true }));
            });
            // 2. Physical Button Click (Surgical strike)
            const nextBtn = win.document.querySelector('button[aria-label*="Next"], .next-button, .vst-icon-arrow-right');
            if (nextBtn) nextBtn.click();
        };
        nav(window);
        document.querySelectorAll('iframe').forEach(f => { try { nav(f.contentWindow); } catch (e) { } });
    };

    const scanNext = async () => {
        if (!isAutoScanning || !chrome.runtime?.id) return;
        pageCount++;
        if (btn) btn.innerText = `🛑 Scanning (Page ${pageCount})...`;

        let attempts = 0, saveBtn = document.getElementById('dig-book-save');
        // Faster polling: 100ms instead of 1000ms
        while (isAutoScanning && attempts++ < 30 && (!saveBtn || saveBtn.disabled)) {
            if (btn && attempts % 5 === 0) btn.innerText = `⏳ Waiting (Page ${pageCount})... [${Math.floor(attempts / 5)}/6s]`;
            await new Promise(r => setTimeout(r, 200));
            saveBtn = document.getElementById('dig-book-save');
        }

        if (isAutoScanning && saveBtn && !saveBtn.disabled) {
            if (btn) btn.innerText = `💾 Saving (Page ${pageCount})...`;
            saveBtn.click();
            digLog(`Page ${pageCount} saved`);
            // Brief pause to let it save
            await new Promise(r => setTimeout(r, 600));
        } else if (isAutoScanning) {
            digLog(`Page ${pageCount} skipped (unready)`);
        }

        if (isAutoScanning) {
            navigateNext();

            // Wait for navigation event OR timeout (faster than fixed 4s)
            let navigated = false;
            const onNav = () => { navigated = true; };
            window.addEventListener('DIG_PAGE_CHANGED', onNav, { once: true });

            // Max wait 3s for navigation, but proceed immediately if event fires
            let navWait = 0;
            while (isAutoScanning && !navigated && navWait < 3000) {
                await new Promise(r => setTimeout(r, 200));
                navWait += 200;
            }
            window.removeEventListener('DIG_PAGE_CHANGED', onNav);

            if (isAutoScanning) {
                if (typeof refreshSidebar === 'function') refreshSidebar();
                scanNext();
            }
        }
    };
    scanNext();
}

function viewFullBookContent(title, text) {
    if (!text) return;
    showFullPreview(title, text);
}
