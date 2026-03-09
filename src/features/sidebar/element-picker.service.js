/**
 * Element Picker: Coordinated cross-frame selection without blocking masks.
 */
let isPickerActive = false, hoverEl = null;

function startPickingElement(onSelect) {
    if (!chrome.runtime?.id) return;
    chrome.runtime.sendMessage({ type: 'DIG_START_PICKING' });
    const handler = (msg) => {
        if (!chrome.runtime?.id || !msg || typeof msg !== 'object') return;
        if (msg.type === 'DIG_ELEMENT_SELECTED') {
            chrome.runtime.onMessage.removeListener(handler);
            try { if (typeof onSelect === 'function') onSelect(msg.selector); } catch (e) { }
        } else if (msg.type === 'DIG_STOP_PICKING') {
            // Treat a stop message as cancellation and notify caller
            chrome.runtime.onMessage.removeListener(handler);
            try { if (typeof onSelect === 'function') onSelect(null); } catch (e) { }
        }
    };
    chrome.runtime.onMessage.addListener(handler);
}

function initPickerListeners() {
    const onMsg = (msg) => {
        if (!chrome.runtime?.id || !msg || typeof msg !== 'object') return;
        if (msg.type === 'DIG_START_PICKING') activateLocalPicker();
        if (msg.type === 'DIG_STOP_PICKING') deactivateLocalPicker();
    };
    if (chrome.runtime?.id) {
        chrome.runtime.onMessage.addListener(onMsg);
    }
}

function activateLocalPicker() {
    if (isPickerActive) return;
    digLog('Local picker activated');
    isPickerActive = true; document.body.style.cursor = 'crosshair';
    document.addEventListener('mouseover', handleMove, true);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKeyDown, true);
}

function deactivateLocalPicker() {
    digLog('Local picker deactivated');
    isPickerActive = false; document.body.style.cursor = '';
    if (hoverEl) hoverEl.style.outline = '';
    document.removeEventListener('mouseover', handleMove, true);
    document.removeEventListener('click', handleClick, true);
    document.removeEventListener('keydown', handleKeyDown, true);
}

function handleKeyDown(e) {
    try {
        if (!isPickerActive) return;
        if (e.key === 'Escape') {
            // request global stop-picking which will notify all listeners
            try { if (chrome.runtime?.id) chrome.runtime.sendMessage({ type: 'DIG_STOP_PICKING' }); } catch (err) { }
            e.preventDefault();
            e.stopPropagation();
        }
    } catch (err) { }
}

function handleMove(e) {
    if (!isPickerActive || e.target.closest('#dig-sidebar')) return;
    if (hoverEl) hoverEl.style.outline = '';
    hoverEl = e.target;
    hoverEl.style.outline = '2px dashed #10b981';
}

function handleClick(e) {
    if (!isPickerActive || e.target.closest('#dig-sidebar, #dig-fab') || e.target.tagName === 'IFRAME') return;
    e.preventDefault(); e.stopPropagation();
    let el = e.target;
    if (el.tagName === 'BUTTON' || el.tagName === 'A' || el.closest('nav')) el = el.parentElement || el;
    const selector = generateSelector(el);
    digLog(`Element selected: ${selector}`);
    if (chrome.runtime?.id) {
        chrome.runtime.sendMessage({ type: 'DIG_STOP_PICKING' });
        chrome.runtime.sendMessage({ type: 'DIG_ELEMENT_SELECTED', selector });
    }
}


function generateSelector(el) {
    if (el.id) return `#${CSS.escape(el.id)}`;
    let path = [], cur = el;
    while (cur && cur.nodeType === Node.ELEMENT_NODE) {
        let name = cur.nodeName.toLowerCase();
        if (cur.id) { path.unshift(`${name}#${CSS.escape(cur.id)}`); break; }
        let sib = cur, idx = 1;
        while (sib = sib.previousElementSibling) idx++;
        path.unshift(`${name}:nth-child(${idx})`);
        cur = cur.parentElement;
    }
    return path.join(' > ');
}

initPickerListeners();
