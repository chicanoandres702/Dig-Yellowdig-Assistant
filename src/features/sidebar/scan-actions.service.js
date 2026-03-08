/**
 * Scan Actions: Polling, picking, and full-content previews.
 */
function pollForBookContent(container, onReport) {
    // try listening for the local custom event first; this avoids cross-process delay
    const localHandler = (e) => {
        const msg = e.detail || {};
        if (msg.text?.length > 20) {
            onReport(msg);
            cleanup();
        }
    };
    window.addEventListener('DIG_FRAME_CONTENT', localHandler, { once: true });

    // fallback to messaging if observer hasn't fired quickly
    let timer = setTimeout(() => {
        if (chrome.runtime?.id) {
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
            setTimeout(() => { chrome.runtime.onMessage.removeListener(msgHandler); }, 2000);
        }
    }, 40); // after 40ms, send explicit broadcast if no content yet (faster fallback)

    function cleanup() {
        clearTimeout(timer);
        window.removeEventListener('DIG_FRAME_CONTENT', localHandler);
    }
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
    if (isAutoScanning) {
        isAutoScanning = false;
        if (btn) btn.innerText = '▶️ Auto-Scan';
        try { const s = document.getElementById('dig-auto-status'); if (s) s.innerText = 'Stopped'; } catch (e) { }
        return;
    }
    isAutoScanning = true;
    let pageCount = 0;
    let navCount = 0; // number of actual navigations performed
    const bookTitle = getBookTitle();
    const incImg = localStorage.getItem('dig_include_images') === 'true';
    const customSel = localStorage.getItem('dig_custom_reader_selector');

    let _lastNavTime = 0;
    let currentPageNum = null; // shared across iterations for iframe selection
    let navInProgress = false; // guard used by navigateNext
    let preferInputNavigation = false; // switch to true once numeric page inputs are observed
    // Tunable parameters (can be overridden via localStorage for testing)
    const NAV_COOLDOWN_MS = parseInt(localStorage.getItem('dig_auto_scan_nav_cooldown') || '700', 10);
    const ATTEMPT_TIMEOUT_MS = parseInt(localStorage.getItem('dig_auto_scan_attempt_timeout') || '500', 10);

    // helper to update the Auto-Scan status UI
    const setAutoScanStatus = (s) => {
        try {
            const el = document.getElementById('dig-auto-status');
            if (el) {
                el.innerText = s || '';
                el.dataset.digStatus = s ? 'active' : 'idle';
            }
        } catch (e) { }
    };
    // initial status
    setAutoScanStatus('Starting…');

    // roman numeral helpers used when the page field shows xiii, iv, etc.
    const romanToInt = (r) => {
        const map = {I:1,V:5,X:10,L:50,C:100,D:500,M:1000};
        let total = 0;
        r = r.toUpperCase();
        for (let i = 0; i < r.length; i++) {
            const curr = map[r[i]];
            const next = map[r[i+1]];
            if (next && next > curr) {
                total += next - curr;
                i++;
            } else {
                total += curr;
            }
        }
        return total;
    };
    const intToRoman = (num) => {
        const vals = [1000,900,500,400,100,90,50,40,10,9,5,4,1];
        const syms = ["M","CM","D","CD","C","XC","L","XL","X","IX","V","IV","I"];
        let res = '';
        for (let i = 0; i < vals.length; i++) {
            while (num >= vals[i]) {
                num -= vals[i];
                res += syms[i];
            }
        }
        return res;
    };
    const bumpPageValue = (val) => {
        if (!val || typeof val !== 'string') return null;
        // if the value matches the last saved page exactly, don't increment
        if (lastPageNum && val.toLowerCase() === lastPageNum.toLowerCase()) {
            return val; // re-type same number to force navigation
        }
        if (/^\d+$/.test(val)) return (parseInt(val,10) + 1).toString();
        if (/^[ivxlcdm]+$/i.test(val)) {
            const n = romanToInt(val);
            return intToRoman(n + 1).toLowerCase();
        }
        return null;
    };

    // gather all reader-like windows along with their page-input values
    const collectReaderContexts = () => {
        const list = [];
        const checkAndPush = (win) => {
            try {
                const doc = win.document;
                if (doc) {
                    let val = null;
                    // preferred selector used by some readers
                    const inp = doc.querySelector('input[id^="text-field-"]');
                    if (inp && inp.value !== undefined) val = inp.value;
                    // fallback: try an element with dir="auto" which in some readers is the page input
                    if (!val) {
                        try {
                            const dirEl = doc.querySelector('[dir="auto"]');
                            if (dirEl) {
                                if (dirEl.value !== undefined) val = dirEl.value;
                                else if (typeof dirEl.textContent === 'string') val = dirEl.textContent.trim();
                            }
                        } catch (e) { }
                    }
                    if (val !== null && val !== undefined && String(val).trim() !== '') list.push({win, val: String(val)});
                }
            } catch (e) { }
        };
        checkAndPush(window);
        document.querySelectorAll('iframe').forEach(f => {
            try { if (f.contentWindow) checkAndPush(f.contentWindow); } catch (e) { }
        });
        return list;
    };

    const findReaderContexts = () => {
        const list = collectReaderContexts();
        if (list.length === 0) return [window];
        // try to pick one whose value equals lastPageNum or currentPageNum if available
        const match = list.find(item => item.val == lastPageNum || item.val == currentPageNum);
        if (match) return [match.win];
        // otherwise return first entry only
        return [list[0].win];
    };

    const readPageNumFromContexts = () => {
        const list = collectReaderContexts();
        if (!list || list.length === 0) {
            try {
                const el = document.querySelector('[dir="auto"]');
                if (el) {
                    if (el.value !== undefined) return el.value;
                    if (el.textContent) return el.textContent.trim();
                }
            } catch (e) { }
            return null;
        }
        // Prefer numeric page inputs when available
        const numeric = list.find(item => /^\d+$/.test(String(item.val).trim()));
        if (numeric) return numeric.val;
        for (const item of list) {
            if (item.val) return item.val;
        }
        return null;
    };

    // update the small preview box in the scan tab if visible
    const isPreviewPlaceholder = (s) => {
        try {
            if (!s) return true;
            const t = String(s).trim().toLowerCase();
            if (!t) return true;
            if (t === '...' || t === '…') return true;
            if (/^\.+$/.test(t)) return true; // only dots
            if (t.includes('searching frames')) return true;
            return false;
        } catch (e) { return true; }
    };

    const updatePreviewBox = (text) => {
        try {
            const p = document.getElementById('dig-scan-preview');
            if (p) {
                const cleaned = (text || '').replace(/![^\]]*\]\([^\)]*\)/g, '').substring(0, 160);
                p.innerHTML = `<p style="font-size:11px;color:#334155;line-height:1.4;margin:0;">${cleaned}${cleaned.length ? '...' : ''}</p>`;
                // mark preview as having meaningful content so wait loops can exit quickly
                try { p.dataset.digHasContent = isPreviewPlaceholder(cleaned) ? '' : '1'; } catch (e) { }
            }
        } catch (e) { }
    };

    const waitForPreviewContent = async () => {
        const p = document.getElementById('dig-scan-preview');
        if (!p) return;
        let tries = 0;
        while (tries < 8) {
            const txt = p.innerText || '';
            const flagged = p.dataset && p.dataset.digHasContent === '1';
            if (flagged || !isPreviewPlaceholder(txt)) break;
            await new Promise(r => setTimeout(r, 100));
            tries++;
        }
    };

    const canNavigateNow = () => {
        // preview content must be present
        const p = document.getElementById('dig-scan-preview');
        if (p) {
            const txt = p.innerText || '';
            if (txt.trim().length < 5 || txt.toLowerCase().includes('searching frames')) return false;
        }
        // saved count must be at least navCount+1
        const saved = getBookPageCount(detectedClass, bookTitle);
        if (saved < navCount + 1) return false;
        return true;
    };

    const trySetPageInput = (win) => {
        try {
            const doc = win && win.document;
            if (!doc) return false;
            // try common candidates; prefer explicit page inputs
            const candidates = ['input[id^="text-field-"]', '[dir="auto"]', 'input[type="number"]'];
            let el = null;
            for (const s of candidates) {
                try { el = doc.querySelector(s); } catch (e) { el = null; }
                if (el) break;
            }
            if (!el) return false;
            if (el.value === undefined) return false;
            const curr = String(el.value || '').trim();
            let next = bumpPageValue(curr);
            if (!next || next === curr) {
                if (/^\d+$/.test(curr)) next = (parseInt(curr, 10) + 1).toString();
            }
            if (!next) return false;
            try { el.focus && el.focus(); } catch (e) { }
            try {
                // Use native setter to ensure framework-controlled inputs (React, etc.) observe the change
                const setNativeValue = (element, value) => {
                    const valueSetter = Object.getOwnPropertyDescriptor(element, 'value')?.set;
                    const prototype = Object.getPrototypeOf(element);
                    const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
                    if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
                        prototypeValueSetter.call(element, value);
                    } else if (valueSetter) {
                        valueSetter.call(element, value);
                    } else {
                        element.value = value;
                    }
                };
                setNativeValue(el, next);
                try { el.setAttribute && el.setAttribute('value', next); } catch (e) { }
                // Dispatch an InputEvent with data/inputType when available; fallback to plain input/change events.
                try { el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, data: String(next), inputType: 'insertText' })); } catch (e) { try { el.dispatchEvent(new Event('input', { bubbles: true })); } catch (e) { } }
                try { el.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) { }
                // Some readers apply changes on blur - trigger blur to be safe
                try { el.blur && el.blur(); } catch (e) { }
                // Also dispatch input on document/window in case listeners are attached there
                try { doc && doc.dispatchEvent && doc.dispatchEvent(new Event('input', { bubbles: true })); } catch (e) { }
                try { win && win.dispatchEvent && win.dispatchEvent(new Event('input', { bubbles: true })); } catch (e) { }
            } catch (e) { /* ignore */ }
            digLog(`navigateNext: set page input to ${next} (native setter)`);
            return true;
        } catch (e) { return false; }
    };

    const navigateNext = async () => {
        // only move if conditions satisfied
        if (!canNavigateNow()) return;
        if (navInProgress) return; // prevent double presses
        navInProgress = true;
        // cooldown between arrow dispatches (tunable)
        const now = Date.now();
        const diff = now - _lastNavTime;
        if (diff < NAV_COOLDOWN_MS) {
            await new Promise(r => setTimeout(r, NAV_COOLDOWN_MS - diff));
        }

        try {
            // Prefer delegating navigation to the background script which runs across frames
            if (chrome && chrome.runtime && chrome.runtime.id) {
                try {
                    chrome.runtime.sendMessage({ type: 'NAVIGATE_TO_NEXT_PAGE', prevSavedCount: null, cls: detectedClass, bookTitle: getBookTitle() });
                } catch (err) {
                    // fallback to requesting top-window key via postMessage
                    try { window.postMessage({ type: 'DIG_NAVIGATE_NEXT' }, '*'); } catch (e) { }
                }
            } else {
                // request the top window context to dispatch ArrowRight
                try { window.postMessage({ type: 'DIG_NAVIGATE_NEXT' }, '*'); } catch (e) { }
            }
        } catch (e) { /* ignore */ }

        _lastNavTime = Date.now();
        navInProgress = false;
    };

    // parse numeric or roman page strings
    const parsePageVal = (val) => {
        if (!val) return NaN;
        if (/^\d+$/.test(val)) return parseInt(val,10);
        if (/^[ivxlcdm]+$/i.test(val)) return romanToInt(val);
        return NaN;
    };
    const areConsecutive = (a,b) => {
        const na = parsePageVal(a);
        const nb = parsePageVal(b);
        if (isNaN(na) || isNaN(nb)) return false;
        return nb - na === 1;
    };

    

    const getPageLabelFromMetadata = () => {
        try {
            const m = window.sniffedMetadata;
            const topUrl = window.top?.location?.href || window.location.href;

            try {
                const payload = m && (m.pages || m.pagebreaks || m) ? (m.pages || m.pagebreaks || m) : null;
                if (payload) {
                    const matcher = (typeof window !== 'undefined' && window.DIG_CFI && typeof window.DIG_CFI.findMatchingPagebreakEntry === 'function') ? window.DIG_CFI.findMatchingPagebreakEntry : (typeof findMatchingPagebreakEntry === 'function' ? findMatchingPagebreakEntry : null);
                    if (matcher) {
                        const res = matcher(payload, topUrl);
                        if (res && res.entry) {
                            const e = res.entry;
                            return e.label || e.page || e.page_label || e.pageLabel || e.title || null;
                        }
                    }
                }
            } catch (e) { /* ignore */ }
        } catch (e) { }
        return null;
    };

    // Split a captured page's HTML/text into multiple logical pages according to sniffed pagebreaks
    const splitContentByPagebreaks = (text, html, url) => {
        try {
            const m = window.sniffedMetadata;
            if (!m || !m.pagebreaks) return null;
            let pbList = [];
            const pb = m.pagebreaks;
            if (Array.isArray(pb)) pbList = pb;
            else if (pb && Array.isArray(pb.pages)) pbList = pb.pages;
            else if (pb && typeof pb === 'object') pbList = Object.values(pb).filter(v => v && typeof v === 'object');

            if (!pbList.length) return null;

            const topUrl = window.top?.location?.href || url || window.location.href;

            // Find pagebreak entries that match this viewer URL/resource
            const matches = pbList.filter(p => {
                try {
                    if (!p) return false;
                    if (p.absoluteURL && topUrl.includes(String(p.absoluteURL))) return true;
                    if (p.url && topUrl.includes(String(p.url))) return true;
                    if (p.href && topUrl.includes(String(p.href))) return true;
                    if (p.resource && topUrl.includes(String(p.resource))) return true;
                    if (p.path && topUrl.includes(String(p.path))) return true;
                    if (p.cfi && cfiMatchesUrl(p.cfi, topUrl)) return true;
                    if (p.cfiWithoutAssertions && cfiMatchesUrl(p.cfiWithoutAssertions, topUrl)) return true;
                    return false;
                } catch (e) { return false; }
            });

            // If no direct matches, try to find entries that belong to the same chapter/resource
            if (matches.length === 0) {
                const base = (topUrl || '').split(/[?#]/)[0];
                const fallback = pbList.filter(p => {
                    try {
                        const vals = [p.resource, p.url, p.href, p.absoluteURL, p.path].filter(Boolean).map(String);
                        // include CFI variants in fallback matching
                        if (p.cfi || p.cfiWithoutAssertions) {
                            const raw = String(p.cfiWithoutAssertions || p.cfi || '');
                            const decoded = _safeDecode(raw);
                            vals.push(raw);
                            if (decoded) vals.push(decoded);
                            const stripped = decoded.replace(/^epubcfi\(?/i, '').replace(/\)?$/, '');
                            if (stripped) vals.push(stripped);
                        }
                        return vals.some(v => base.includes(v) || v.includes(base));
                    } catch (e) { return false; }
                });
                if (fallback.length) matches.push(...fallback);
            }

            if (!matches.length) return null;

            // If entries include nested subpages arrays, expand those
            let entries = [];
            for (const mm of matches) {
                if (mm && Array.isArray(mm.subpages) && mm.subpages.length) entries.push(...mm.subpages);
                else entries.push(mm);
            }

            if (!entries.length) return null;

            // Try selector-based extraction when selectors are provided
            const allHaveSelector = entries.every(e => e && (e.selector || e.cssSelector || e.elementSelector || e.id));
            const slices = [];

            if (allHaveSelector) {
                const rootSel = window._dig_last_vst_selector || '#pbk-page' || '#pfe-content' || '.epub-content';
                const root = (document.querySelector(rootSel) || document);
                for (const e of entries) {
                    let sel = e.selector || e.cssSelector || e.elementSelector || (e.id ? `#${e.id}` : null);
                    let el = null;
                    try { if (sel && root) el = root.querySelector(sel) || document.querySelector(sel); } catch (err) { el = null; }
                    const sliceHtml = el ? el.innerHTML : '';
                    const sliceText = el ? (el.innerText || '') : '';
                    const label = e.label || e.page || e.page_label || e.title || e.pageTitle || null;
                    slices.push({ text: sliceText, html: sliceHtml, label });
                }
                return slices.length ? slices : null;
            }

            // If entries include start/end markers, slice by those markers on the HTML string
            const allHaveMarkers = entries.every(e => e && (e.start_marker || e.end_marker || e.start || e.end));
            if (allHaveMarkers && html) {
                for (const e of entries) {
                    const start = e.start_marker || e.start || null;
                    const end = e.end_marker || e.end || null;
                    let sliceHtml = '';
                    try {
                        let sidx = start ? html.indexOf(start) : 0;
                        if (sidx === -1) sidx = 0;
                        let eidx = end ? html.indexOf(end, sidx) : html.length;
                        if (eidx === -1) eidx = html.length;
                        sliceHtml = html.substring(sidx, eidx);
                    } catch (err) { sliceHtml = ''; }
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(sliceHtml || '<div></div>', 'text/html');
                    const sliceText = doc.body ? (doc.body.innerText || '') : '';
                    const label = e.label || e.page || e.page_label || e.title || e.pageTitle || null;
                    slices.push({ text: sliceText, html: sliceHtml, label });
                }
                return slices.length ? slices : null;
            }

            // Fallback: split the text into N roughly-equal chunks based on paragraph boundaries
            const paraCandidates = (text || '').split(/\n{2,}|\n/).map(p => p.trim()).filter(Boolean);
            if (!paraCandidates.length) return null;
            const N = entries.length;
            const totalLen = paraCandidates.reduce((s, p) => s + p.length, 0);
            const target = Math.max(100, Math.round(totalLen / N));
            let cur = [];
            let curLen = 0;
            let idx = 0;
            for (const p of paraCandidates) {
                cur.push(p);
                curLen += p.length;
                if (curLen >= target && idx < N - 1) {
                    const label = entries[idx] ? (entries[idx].label || entries[idx].page || entries[idx].page_label || entries[idx].title) : null;
                    slices.push({ text: cur.join('\n\n'), html: cur.map(t => `<p>${escapeHtml(t)}</p>`).join('\n'), label });
                    idx++;
                    cur = [];
                    curLen = 0;
                }
            }
            if (cur.length) {
                const label = entries[idx] ? (entries[idx].label || entries[idx].page || entries[idx].page_label || entries[idx].title) : null;
                slices.push({ text: cur.join('\n\n'), html: cur.map(t => `<p>${escapeHtml(t)}</p>`).join('\n'), label });
            }
            return slices.length ? slices : null;
        } catch (e) { return null; }
    };

    const ensureSingleStep = async (oldPage, prevSavedCount = null) => {
        try {
            // Delegate navigation to background script or request top-window ArrowRight via postMessage
            try {
                if (chrome && chrome.runtime && chrome.runtime.id) {
                    chrome.runtime.sendMessage({ type: 'NAVIGATE_TO_NEXT_PAGE', prevSavedCount: prevSavedCount, cls: detectedClass, bookTitle: getBookTitle() });
                } else {
                    try { window.postMessage({ type: 'DIG_NAVIGATE_NEXT' }, '*'); } catch (e) { }
                }
            } catch (e) { try { window.postMessage({ type: 'DIG_NAVIGATE_NEXT' }, '*'); } catch (er) { } }

            let attempts = 0;
            let current = oldPage;
            // Wait for a short period for the reader to advance by a single page
            while (attempts < 8) {
                await new Promise(r => setTimeout(r, 100));
                current = readPageNumFromContexts();
                if (areConsecutive(oldPage, current) || (current && current !== oldPage)) return current;
                attempts++;
            }
            return current;
        } catch (e) { return oldPage; }
    };

    let lastTextSig = '';
    let lastPageNum = null; // remember last saved page number

    // Turbo: request content from frames, save directly, navigate immediately
    const scanNext = async () => {
        if (!isAutoScanning) return;
        pageCount++;
        if (btn) btn.innerText = `🛑 Stop (${pageCount})`;
        try { setAutoScanStatus('Requesting content…'); } catch (e) { }

    // clear any previous preview flag so we wait for fresh content
    try { const p = document.getElementById('dig-scan-preview'); if (p) p.dataset.digHasContent = ''; } catch (e) { }

    // read visible page number input (if any), scanning through any iframes as well
    currentPageNum = readPageNumFromContexts();
    try { if (/^\d+$/.test(String(currentPageNum || '').trim())) preferInputNavigation = true; } catch (e) { }

    // record how many pages we have saved so far; we'll wait for this to increase
    const prevSavedCount = getBookPageCount(detectedClass, bookTitle);

        // each iteration has its own capture flag – avoid global pollution
        let captured = false;
        let lastSig = lastTextSig;
        let resolveCapture;
        const capturePromise = new Promise(r => { resolveCapture = r; });
        // observer handle for preview-based auto-save (per-iteration)
        let previewObserver = null;

        const processData = (text, html, page, url) => {
            if (captured || !isAutoScanning) return;
            // ignore sidebar placeholder when auto-scanning
            if (typeof text === 'string' && text.trim().toLowerCase().includes('searching frames')) {
                return;
            }
            let sig = (text||'').substring(0, 200) + '|' + (html||'').substring(0, 200);
            if (page != null) sig += '|p:' + page;
            else if (url) sig += '|u:' + url;
            if (sig !== lastSig) {
                captured = true;
                lastTextSig = sig;
                const chapter = detectVitalSourceChapter();
                const saveObj = { text, html };
                // Determine final page value using multiple fallbacks
                let finalPage = page;
                if (!finalPage) {
                    const metaLabel = getPageLabelFromMetadata();
                    if (metaLabel) finalPage = metaLabel;
                }
                if (!finalPage) {
                    try { const ctxVal = readPageNumFromContexts(); if (ctxVal) finalPage = ctxVal; } catch (e) { }
                }
                if (!finalPage && lastPageNum) finalPage = lastPageNum;
                if (!finalPage && currentPageNum) finalPage = currentPageNum;
                if (finalPage != null) saveObj.page = finalPage;
                try { setAutoScanStatus(`Saving…`); } catch (e) { }
                // If sniffed pagebreaks indicate multiple logical pages inside this viewer page,
                // split the captured content and save each slice separately.
                try {
                    const slices = splitContentByPagebreaks(text, html, url);
                    if (slices && Array.isArray(slices) && slices.length > 0) {
                        // Save each slice with its associated label (if available)
                        for (let si = 0; si < slices.length; si++) {
                            const s = slices[si];
                            const sliceSave = { text: s.text || '', html: s.html || '' };
                            if (s.label != null) sliceSave.page = s.label;
                            else if (finalPage != null) sliceSave.page = `${finalPage}${slices.length > 1 ? `.${si+1}` : ''}`;
                            sliceSave.force = true; // ensure save even for short slices
                            saveBookPage(detectedClass, bookTitle, chapter, sliceSave);
                            digLog(`Saved slice ${si+1}/${slices.length} (page ${sliceSave.page || 'unknown'}) url=${url || window.location.href}`);
                        }
                        // mirror first slice to preview for user feedback
                        updatePreviewBox((slices[0] && (slices[0].text || slices[0].html)) || text || html);
                        try { setAutoScanStatus('Saved — awaiting confirmation…'); } catch (e) { }
                    } else {
                        saveBookPage(detectedClass, bookTitle, chapter, saveObj);
                        // mirror to preview for user feedback
                        updatePreviewBox(text || html);
                        try { setAutoScanStatus('Saved — awaiting confirmation…'); } catch (e) { }
                        digLog(`Page ${pageCount} saved (page ${finalPage || page || 'unknown'}) url=${url || window.location.href}`);
                    }
                } catch (e) {
                    // fallback to single save on error
                    saveBookPage(detectedClass, bookTitle, chapter, saveObj);
                    updatePreviewBox(text || html);
                    digLog(`Page ${pageCount} saved (page ${finalPage || page || 'unknown'}) url=${url || window.location.href}`);
                }
                // resolve the capture promise (guard against multiple calls)
                if (typeof resolveCapture === 'function') { try { resolveCapture(); } catch (e) { } resolveCapture = null; }
            }
        };

        const handler = (msg) => {
            if (!isAutoScanning || captured) return;
            if (msg.type === 'FRAME_CONTENT_REPORT') {
                processData(msg.text, msg.html, msg.page, msg.url);
            }
        };

        const localHandler = (e) => {
            if (!isAutoScanning || captured) return;
            const d = e.detail || {};
            processData(d.text, d.html, d.page, d.url);
        };

        // set up listeners regardless of chrome availability
        if (chrome && chrome.runtime) chrome.runtime.onMessage.addListener(handler);
        window.addEventListener('DIG_FRAME_CONTENT', localHandler);
        if (chrome && chrome.runtime && chrome.runtime.id) {
            try { setAutoScanStatus('Requesting frames…'); } catch (e) { }
            chrome.runtime.sendMessage({ type: 'BROADCAST_TO_FRAMES', customSelector: customSel, includeImages: incImg });
        }

        // MutationObserver: watch the preview box and auto-save when it receives meaningful content.
        try {
            const pbox = document.getElementById('dig-scan-preview');
            if (pbox) {
                const checkAndMaybeSavePreview = () => {
                    if (!isAutoScanning || captured) return;
                    try {
                        const txt = pbox.innerText || '';
                        const flagged = pbox.dataset && pbox.dataset.digHasContent === '1';
                        if (flagged || !isPreviewPlaceholder(txt)) {
                            // Delegate to the same processData flow to keep deduplication and save semantics
                            processData(txt, pbox.innerHTML || '', null, null);
                            if (previewObserver) { try { previewObserver.disconnect(); } catch (e) { } previewObserver = null; }
                        }
                    } catch (e) { /* ignore */ }
                };
                previewObserver = new MutationObserver(checkAndMaybeSavePreview);
                previewObserver.observe(pbox, { childList: true, subtree: true, characterData: true });
                // immediate check in case preview already had content
                checkAndMaybeSavePreview();
            }
        } catch (e) { /* ignore */ }

        // attempt immediate capture of current page without waiting for messages
        if (typeof getVitalSourcePageText === 'function' && !captured) {
            try {
                const initialData = await getVitalSourcePageText();
                if (initialData && ((initialData.text && initialData.text.length>0) || initialData.html || initialData.page != null)) {
                    // ignore sidebar placeholder text here as well
                    const txt = (initialData.text || '').trim().toLowerCase();
                    if (!txt.includes('searching frames')) {
                        processData(initialData.text, initialData.html, initialData.page, window.location.href);
                    }
                }
            } catch (e) { /* ignore */ }
        }

        // attempt capture up to maxAttempts, abort early if page changes
        let newPageNum = currentPageNum;
        const maxAttempts = 2; // reduce attempts to improve throughput
        for (let attempt = 1; attempt <= maxAttempts && !captured && isAutoScanning; attempt++) {
            const timeoutPromise = new Promise(r => setTimeout(r, ATTEMPT_TIMEOUT_MS));
            await Promise.race([capturePromise, timeoutPromise]);

            // read page again to detect manual advance
            newPageNum = readPageNumFromContexts();

            if (captured) break;
            if (newPageNum != null && newPageNum !== currentPageNum) {
                lastPageNum = newPageNum;
                const chapter = detectVitalSourceChapter();
                saveBookPage(detectedClass, bookTitle, chapter, { text:'', html:'', page:newPageNum, force: true });
                digLog(`Page ${pageCount} manual save due to manual advance (page ${newPageNum}) url=${window.location.href}`);
                captured = true;
                break;
            }
            if (attempt < maxAttempts) {
                // ask frames again but don't reattach listeners (they are already active)
                if (chrome && chrome.runtime && chrome.runtime.id) {
                    chrome.runtime.sendMessage({ type: 'BROADCAST_TO_FRAMES', customSelector: customSel, includeImages: incImg });
                }
                await new Promise(r => setTimeout(r, 100));
            }
        }

        if (chrome && chrome.runtime) chrome.runtime.onMessage.removeListener(handler);
        window.removeEventListener('DIG_FRAME_CONTENT', localHandler);
        try { if (previewObserver) { previewObserver.disconnect(); previewObserver = null; } } catch (e) { }

        if (!captured && isAutoScanning) {
            const chapter = detectVitalSourceChapter();
            const pageToRecord = newPageNum || currentPageNum || lastPageNum || null;
            try { setAutoScanStatus('Force-saved (blank)'); } catch (e) { }
            saveBookPage(detectedClass, bookTitle, chapter, { text:'', html:'', page: pageToRecord, force: true });
            digLog(`Page ${pageCount} force-saved blank (page ${pageToRecord || 'unknown'}) after ${maxAttempts} attempts`);
            captured = true;
        }
        if (!isAutoScanning) return;

        // wait for saved count to increase (listen for event emitted by saveBookPage)
        const waitForSavedCountIncrease = (prev, cls, title, timeoutMs = 3000) => new Promise(resolve => {
            try {
                if (getBookPageCount(cls, title) > prev) return resolve(true);
            } catch (e) { }
            let resolved = false;
            const onSave = (ev) => {
                try {
                    const d = ev.detail || {};
                    if (d && d.cls === cls && d.bookTitle === title) {
                        resolved = true;
                        window.removeEventListener('DIG_BOOKPAGE_SAVED', onSave);
                        return resolve(true);
                    }
                } catch (e) { }
            };
            window.addEventListener('DIG_BOOKPAGE_SAVED', onSave);
            setTimeout(() => {
                if (!resolved) {
                    window.removeEventListener('DIG_BOOKPAGE_SAVED', onSave);
                    resolve(false);
                }
            }, timeoutMs);
        });

        try { setAutoScanStatus('Waiting for save confirmation…'); } catch (e) { }
        await waitForSavedCountIncrease(prevSavedCount, detectedClass, bookTitle, 3000);
        if (!isAutoScanning) return; // stopped mid-wait
        // verify that saves match nav count

        // wait for preview box to fill so we know page has some content
        try { setAutoScanStatus('Waiting for preview…'); } catch (e) { }
        await waitForPreviewContent();
        // navigate ensuring only a single page step
        const oldPage = currentPageNum;
        try { setAutoScanStatus('Navigating…'); } catch (e) { }
        const resulting = await ensureSingleStep(oldPage, prevSavedCount);
        // navigation happened
        navCount++;
        if (!areConsecutive(oldPage, resulting)) {
            digLog(`Warning: navigation jumped more than one page (${oldPage} -> ${resulting})`);
        }
        try { setAutoScanStatus(`Navigated: ${resulting || 'unknown'}`); } catch (e) { }

        // wait for navigation
        let navigated = false;
        const onNav = () => { navigated = true; };
        window.addEventListener('DIG_PAGE_CHANGED', onNav, { once: true });
        let navWait = 0;
        // shorten nav wait to improve throughput while still allowing SPA updates
        while (isAutoScanning && !navigated && navWait < 800) {
            await new Promise(r => setTimeout(r, 50));
            navWait += 50;
        }
        window.removeEventListener('DIG_PAGE_CHANGED', onNav);

        if (isAutoScanning) {
            await new Promise(r => setTimeout(r, 20));
            scanNext();
        }
    };

    scanNext();
}

function viewFullBookContent(title, text) {
    if (!text) return;
    showFullPreview(title, text);
}
