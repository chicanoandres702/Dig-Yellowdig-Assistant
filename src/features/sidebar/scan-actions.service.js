/**
 * Scan Actions: Orchestrates polling, picking, auto-scan, and full-content previews.
 * Why: This is the top-level coordinator — all heavy logic has been extracted
 * into scan/ sub-modules to comply with the 100-Line Law.
 */

function pollForBookContent(container, onReport) {
    const localHandler = (e) => {
        const msg = e.detail || {};
        if (msg.text?.length > 20) { onReport(msg); cleanup(); }
    };
    window.addEventListener('DIG_FRAME_CONTENT', localHandler, { once: true });
    let timer = setTimeout(() => {
        if (!chrome.runtime?.id) return;
        const msgHandler = (msg) => {
            if (msg.type === 'FRAME_CONTENT_REPORT' && msg.text?.length > 20) {
                onReport(msg);
                chrome.runtime.onMessage.removeListener(msgHandler);
            }
        };
        chrome.runtime.onMessage.addListener(msgHandler);
        chrome.runtime.sendMessage({
            type: 'BROADCAST_TO_FRAMES',
            customSelector: localStorage.getItem('dig_custom_reader_selector'),
            includeImages: localStorage.getItem('dig_include_images') === 'true'
        });
        setTimeout(() => chrome.runtime.onMessage.removeListener(msgHandler), 2000);
    }, 40);
    function cleanup() { clearTimeout(timer); window.removeEventListener('DIG_FRAME_CONTENT', localHandler); }
}

function startBookPicking(container, onComplete) {
    if (!chrome.runtime?.id) return;
    const btn = document.getElementById('dig-book-pick');
    if (btn) { btn.innerText = 'Click an element...'; btn.style.background = '#ef4444'; }
    startPickingElement((selector) => {
        if (!selector) {
            if (btn) { btn.innerText = '🎯 Pick Reader'; btn.style.background = '#3b82f6'; }
            return;
        }
        try { localStorage.setItem('dig_custom_reader_selector', selector); } catch (e) { }
        if (btn) { btn.innerText = '🎯 Pick Reader'; btn.style.background = ''; }
        try { if (typeof onComplete === 'function') onComplete(); } catch (e) { }
    });
}

function viewFullBookContent(title, text) {
    if (!text) return;
    showFullPreview(title, text);
}

let isAutoScanning = false;
