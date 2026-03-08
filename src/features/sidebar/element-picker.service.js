/**
 * Element Picker: Coordinated cross-frame selection without blocking masks.
 */
let isPickerActive = false, hoverEl = null;

function startPickingElement(onSelect) {
    chrome.runtime.sendMessage({ type: 'DIG_START_PICKING' });
    const handler = (msg) => {
        if (!msg || typeof msg !== 'object') return;
        if (msg.type === 'DIG_ELEMENT_SELECTED') {
            chrome.runtime.onMessage.removeListener(handler);
            onSelect(msg.selector);
        }
    };
    chrome.runtime.onMessage.addListener(handler);
}

function initPickerListeners() {
    const onMsg = (msg) => {
        if (!msg || typeof msg !== 'object') return;
        if (msg.type === 'DIG_START_PICKING') activateLocalPicker();
        if (msg.type === 'DIG_STOP_PICKING') deactivateLocalPicker();
    };
    chrome.runtime.onMessage.addListener(onMsg);
    window.addEventListener('message', (e) => onMsg(e.data)); // Dual-channel sync
}

function activateLocalPicker() {
    if (isPickerActive) return;
    digLog('Local picker activated');
    isPickerActive = true; document.body.style.cursor = 'crosshair';
    document.addEventListener('mouseover', handleMove, true);
    document.addEventListener('click', handleClick, true);
}

function deactivateLocalPicker() {
    digLog('Local picker deactivated');
    isPickerActive = false; document.body.style.cursor = '';
    if (hoverEl) hoverEl.style.outline = '';
    document.removeEventListener('mouseover', handleMove, true);
    document.removeEventListener('click', handleClick, true);
}

function handleMove(e) {
    if (!isPickerActive || e.target.closest('#dig-sidebar')) return;
    if (hoverEl) hoverEl.style.outline = '';
    hoverEl = e.target;
    hoverEl.style.outline = '2px dashed #10b981';
}

function handleClick(e) {
    if (!isPickerActive || e.target.tagName === 'IFRAME') return;
    e.preventDefault(); e.stopPropagation();
    const selector = generateSelector(e.target);
    digLog(`Element selected in this frame: ${selector}`);
    chrome.runtime.sendMessage({ type: 'DIG_STOP_PICKING' });
    chrome.runtime.sendMessage({ type: 'DIG_ELEMENT_SELECTED', selector });
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
