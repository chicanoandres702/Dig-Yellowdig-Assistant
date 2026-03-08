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

    const scanNext = async () => {
        if (!isAutoScanning || !chrome.runtime?.id) return;
        pageCount++;
        if (btn) btn.innerText = `🛑 Scanning (Page ${pageCount})...`;

        let attempts = 0, saveBtn = document.getElementById('dig-book-save');
        while (isAutoScanning && attempts++ < 15 && (!saveBtn || saveBtn.disabled)) {
            if (btn) btn.innerText = `⏳ Waiting (Page ${pageCount})... [${attempts}/15]`;
            await new Promise(r => setTimeout(r, 1000));
            saveBtn = document.getElementById('dig-book-save');
        }

        if (isAutoScanning && saveBtn && !saveBtn.disabled) {
            if (btn) btn.innerText = `💾 Saving (Page ${pageCount})...`;
            saveBtn.click();
            digLog(`Page ${pageCount} saved`);
            await new Promise(r => setTimeout(r, 1000));
        } else if (isAutoScanning) {
            digLog(`Page ${pageCount} skipped (unready)`);
        }

        if (isAutoScanning) {
            digLog(`Navigating to Page ${pageCount + 1} via Right Arrow`);
            const nav = (win) => {
                const target = win.document.querySelector('#pbk-page, #pfe-content, .epub-content, body') || win.document.body;
                ['keydown', 'keyup'].forEach(type => {
                    target.dispatchEvent(new KeyboardEvent(type, { key: 'ArrowRight', keyCode: 39, bubbles: true, cancelable: true }));
                    win.dispatchEvent(new KeyboardEvent(type, { key: 'ArrowRight', keyCode: 39, bubbles: true }));
                });
            };
            nav(window);
            document.querySelectorAll('iframe').forEach(f => { try { nav(f.contentWindow); } catch (e) { } });

            setTimeout(() => {
                if (!isAutoScanning) return;
                if (typeof refreshSidebar === 'function') refreshSidebar();
                scanNext();
            }, 4000);
        }
    };
    scanNext();
}

function viewFullBookContent(title, text) {
    if (!text) return;
    showFullPreview(title, text);
}
