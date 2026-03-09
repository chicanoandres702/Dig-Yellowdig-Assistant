/**
 * Page Navigation Service: Handles VitalSource page input manipulation and navigation.
 * Why: VitalSource uses React-controlled inputs that don't respond to simple .value assignment.
 * We use native prototype setters to ensure framework state updates.
 */

/** Why: React overrides input setters — this uses the prototype setter to bypass that. */
function setNativeInputValue(element, value) {
    const valueSetter = Object.getOwnPropertyDescriptor(element, 'value')?.set;
    const prototype = Object.getPrototypeOf(element);
    const protoSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
    if (protoSetter && valueSetter !== protoSetter) {
        protoSetter.call(element, value);
    } else if (valueSetter) {
        valueSetter.call(element, value);
    } else {
        element.value = value;
    }
}

/**
 * Why: Attempts to set the page input to the next value and dispatch events
 * so the reader navigates. Returns true if a suitable input was found and set.
 */
function trySetPageInput(win, lastPageNum) {
    try {
        const doc = win && win.document;
        if (!doc) return false;
        const candidates = ['input[id^="text-field-"]', '[dir="auto"]', 'input[type="number"]'];
        let el = null;
        for (const s of candidates) {
            try { el = doc.querySelector(s); } catch (e) { el = null; }
            if (el) break;
        }
        if (!el || el.value === undefined) return false;
        const curr = String(el.value || '').trim();
        let next = bumpPageValue(curr, lastPageNum);
        if (!next || next === curr) {
            if (/^\d+$/.test(curr)) next = (parseInt(curr, 10) + 1).toString();
        }
        if (!next) return false;
        try { el.focus && el.focus(); } catch (e) { }
        try {
            setNativeInputValue(el, next);
            try { el.setAttribute && el.setAttribute('value', next); } catch (e) { }
            try {
                el.dispatchEvent(new InputEvent('input', {
                    bubbles: true, cancelable: true, data: String(next), inputType: 'insertText'
                }));
            } catch (e) {
                try { el.dispatchEvent(new Event('input', { bubbles: true })); } catch (e) { }
            }
            try { el.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) { }
            try { el.blur && el.blur(); } catch (e) { }
            try { doc && doc.dispatchEvent(new Event('input', { bubbles: true })); } catch (e) { }
            try { win && win.dispatchEvent(new Event('input', { bubbles: true })); } catch (e) { }
        } catch (e) { /* ignore */ }
        digLog(`navigateNext: set page input to ${next} (native setter)`);
        return true;
    } catch (e) { return false; }
}

/** Why: Sends navigation commands to background or top window via postMessage. */
function sendNavigateNextMessage() {
    try {
        if (chrome && chrome.runtime && chrome.runtime.id) {
            chrome.runtime.sendMessage({
                type: 'NAVIGATE_TO_NEXT_PAGE',
                prevSavedCount: null,
                cls: detectedClass,
                bookTitle: getBookTitle()
            });
        } else {
            try { window.postMessage({ type: 'DIG_NAVIGATE_NEXT' }, '*'); } catch (e) { }
        }
    } catch (e) {
        try { window.postMessage({ type: 'DIG_NAVIGATE_NEXT' }, '*'); } catch (e) { }
    }
}

/** Why: Resolves page labels from sniffed VitalSource metadata for accurate labeling. */
function getPageLabelFromMetadata() {
    try {
        const m = window.sniffedMetadata;
        const topUrl = window.top?.location?.href || window.location.href;
        try {
            const payload = m && (m.pages || m.pagebreaks || m) ? (m.pages || m.pagebreaks || m) : null;
            if (payload) {
                const matcher = (window.DIG_CFI?.findMatchingPagebreakEntry) ||
                    (typeof findMatchingPagebreakEntry === 'function' ? findMatchingPagebreakEntry : null);
                if (matcher) {
                    const res = matcher(payload, topUrl);
                    if (res?.entry) {
                        const e = res.entry;
                        return e.label || e.page || e.page_label || e.pageLabel || e.title || null;
                    }
                }
            }
        } catch (e) { /* ignore */ }
    } catch (e) { }
    return null;
}
