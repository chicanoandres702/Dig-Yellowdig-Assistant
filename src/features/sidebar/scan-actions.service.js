/**
 * Scan Actions: Polling, picking, and full-content previews.
 */
function pollForBookContent(container, onReport) {
    const handler = (msg) => {
        if (!msg || typeof msg !== 'object') return;
        if (msg.type === 'FRAME_CONTENT_REPORT' && msg.text?.length > 20) {
            onReport(msg);
        }
    };
    chrome.runtime.onMessage.addListener(handler);
    chrome.runtime.sendMessage({
        type: 'BROADCAST_TO_FRAMES',
        customSelector: localStorage.getItem('dig_custom_reader_selector'),
        includeImages: localStorage.getItem('dig_include_images') === 'true'
    });
    setTimeout(() => chrome.runtime.onMessage.removeListener(handler), 5000);
}

function startBookPicking(container, onComplete) {
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
    if (isAutoScanning) {
        isAutoScanning = false;
        if (btn) btn.innerText = '▶️ Auto-Scan';
        return;
    }

    isAutoScanning = true;
    btn.innerText = '🛑 Stop Scan';
    digLog('Auto-scan started');

    const scanNext = async () => {
        if (!isAutoScanning) return;

        const saveBtn = document.getElementById('dig-book-save');
        if (saveBtn && !saveBtn.disabled) {
            saveBtn.click();
            digLog('Page saved');
        }

        await new Promise(r => setTimeout(r, 1000));

        // Attempt to find and click the "Next" button
        // Specific VitalSource attribute check first
        const nextBtn = document.querySelector('button[aria-label="Next"]') ||
            document.querySelector('.IconButton__button-bQttMI') ||
            document.querySelector('[aria-label="Go to next page"]');

        if (nextBtn) {
            digLog('Clicking Next button');
            nextBtn.click();
            // Wait for content shift and network idle
            setTimeout(() => {
                if (typeof refreshSidebar === 'function') refreshSidebar();
                scanNext();
            }, 3500);
        } else {
            digLog('Next button not found. Searching frames...');
            // Check frames for the button if not in top level
            let foundInFrame = false;
            document.querySelectorAll('iframe').forEach(f => {
                try {
                    const fb = f.contentDocument?.querySelector('button[aria-label="Next"]');
                    if (fb) { fb.click(); foundInFrame = true; }
                } catch (e) { }
            });
            if (foundInFrame) {
                setTimeout(() => {
                    if (typeof refreshSidebar === 'function') refreshSidebar();
                    scanNext();
                }, 3500);
            } else {
                digLog('Next button not found. Stopping.');
                isAutoScanning = false;
                btn.innerText = '▶️ Auto-Scan';
            }
        }
    };

    scanNext();
}

function viewFullBookContent(title, text) {
    if (!text) return;
    showFullPreview(title, text);
}
