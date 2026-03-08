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
    }, 100); // after 100ms, send explicit broadcast if no content yet

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
    if (isAutoScanning) { isAutoScanning = false; if (btn) btn.innerText = '▶️ Auto-Scan'; return; }
    isAutoScanning = true;
    let pageCount = 0;
    let navCount = 0; // number of actual navigations performed
    const bookTitle = getBookTitle();
    const incImg = localStorage.getItem('dig_include_images') === 'true';
    const customSel = localStorage.getItem('dig_custom_reader_selector');

    let _lastNavTime = 0;
    let currentPageNum = null; // shared across iterations for iframe selection
    let navInProgress = false; // guard used by navigateNext

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
                    const inp = doc.querySelector('input[id^="text-field-"]');
                    if (inp) list.push({win, val: inp.value});
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
        for (const item of list) {
            if (item.val) return item.val;
        }
        return null;
    };

    // update the small preview box in the scan tab if visible
    const updatePreviewBox = (text) => {
        try {
            const p = document.getElementById('dig-scan-preview');
            if (p) {
                const cleaned = (text || '').replace(/![^\]]*\]\([^\)]*\)/g, '').substring(0, 160);
                p.innerHTML = `<p style="font-size:11px;color:#334155;line-height:1.4;margin:0;">${cleaned}${cleaned.length ? '...' : ''}</p>`;
            }
        } catch (e) { }
    };

    const waitForPreviewContent = async () => {
        const p = document.getElementById('dig-scan-preview');
        if (!p) return;
        let tries = 0;
        while (tries < 20) {
            const txt = p.innerText || '';
            if (txt.trim().length > 5 && !txt.toLowerCase().includes('searching frames')) break;
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

    const navigateNext = async () => {
        // only move if conditions satisfied
        if (!canNavigateNow()) return;
        if (navInProgress) return; // prevent double presses
        navInProgress = true;
        // 1.5‑second cooldown between arrow dispatches
        const now = Date.now();
        const diff = now - _lastNavTime;
        if (diff < 1500) {
            await new Promise(r => setTimeout(r, 1500 - diff));
        }
        try {
            // Prefer clicking a native "next" control in the reader frame if present,
            // otherwise dispatch a keyboard event to the most-likely reader document.
            let clicked = false;
            let targetWin = null;
            try { const ctxs = findReaderContexts(); if (ctxs && ctxs.length) targetWin = ctxs[0]; } catch (e) { }

            const tryClickNext = (win) => {
                try {
                    const doc = win.document;
                    if (!doc) return false;
                    const sel = [
                        "button[aria-label*='Next']",
                        "button[aria-label*='next']",
                        "button[title*='Next']",
                        "button[title*='next']",
                        "[data-action='next']",
                        "[data-test='next']",
                        ".next-page",
                        ".reader-next",
                        ".vst-next",
                        ".next"
                    ];
                    for (const s of sel) {
                        const el = doc.querySelector(s);
                        if (el) {
                            try { el.click(); digLog('navigateNext: clicked next control', { selector: s }); } catch (e) { el.dispatchEvent(new MouseEvent('click', { bubbles: true })); digLog('navigateNext: dispatched click event', { selector: s }); }
                            return true;
                        }
                    }
                    // Fallback: click on right side of main reader area
                    const main = doc.querySelector('#pbk-page, #pfe-content, #vst-content-display, main article, .epub-content, body');
                    if (main) {
                        const r = main.getBoundingClientRect();
                        const ev = new MouseEvent('click', { bubbles: true, cancelable: true, clientX: Math.max(r.left + 10, r.right - 10), clientY: r.top + (r.height / 2) });
                        main.dispatchEvent(ev);
                        digLog('navigateNext: clicked reader area fallback');
                        return true;
                    }
                } catch (e) { }
                return false;
            };

            if (targetWin) clicked = tryClickNext(targetWin);
            if (!clicked) clicked = tryClickNext(window);

            if (!clicked) {
                // Fallback: dispatch a single ArrowRight keydown to the most-likely document
                const targetDoc = (targetWin && targetWin.document) ? targetWin.document : ((window.top && window.top.document) ? window.top.document : document);
                try { (targetDoc.body || targetDoc.documentElement).focus && (targetDoc.body || targetDoc.documentElement).focus(); } catch (e) { }
                const ev = new KeyboardEvent('keydown', { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39, which: 39, bubbles: true, cancelable: true });
                try { (targetDoc.body || targetDoc).dispatchEvent(ev); digLog('navigateNext: dispatched keydown to document'); } catch (e) { }
                await new Promise(r => setTimeout(r, 300));
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
            if (m && m.pages && Array.isArray(m.pages)) {
                const topUrl = window.top?.location?.href || window.location.href;
                const match = m.pages.find(p => {
                    const favreOk = topUrl.includes('favre=brett');
                    return favreOk && ((p.absoluteURL && topUrl.includes(p.absoluteURL)) ||
                        (p.cfi && topUrl.includes(p.cfi)) ||
                        (p.path && topUrl.includes(p.path)) ||
                        (p.url && topUrl.includes(p.url)));
                });
                if (match && match.label) return match.label;
            }
        } catch (e) { }
        return null;
    };

    const ensureSingleStep = async (oldPage) => {
        let attempts = 0;
        let current = oldPage;
        while (attempts < 3) {
            await navigateNext();
            await new Promise(r => setTimeout(r, 500));
            current = readPageNumFromContexts();
            if (areConsecutive(oldPage, current)) return current;
            attempts++;
        }
        return current;
    };

    let lastTextSig = '';
    let lastPageNum = null; // remember last saved page number

    // Turbo: request content from frames, save directly, navigate immediately
    const scanNext = async () => {
        if (!isAutoScanning) return;
        pageCount++;
        if (btn) btn.innerText = `🛑 Stop (${pageCount})`;

    // read visible page number input (if any), scanning through any iframes as well
    currentPageNum = readPageNumFromContexts();

    // record how many pages we have saved so far; we'll wait for this to increase
    const prevSavedCount = getBookPageCount(detectedClass, bookTitle);

        // each iteration has its own capture flag – avoid global pollution
        let captured = false;
        let lastSig = lastTextSig;
        let resolveCapture;
        const capturePromise = new Promise(r => { resolveCapture = r; });

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
                // prefer explicit page parameter
                let finalPage = page;
                if (!finalPage) {
                    const metaLabel = getPageLabelFromMetadata();
                    if (metaLabel) finalPage = metaLabel;
                }
                if (finalPage != null) saveObj.page = finalPage;
                saveBookPage(detectedClass, bookTitle, chapter, saveObj);
                // mirror to preview for user feedback
                updatePreviewBox(text || html);
                digLog(`Page ${pageCount} saved (page ${page || 'unknown'}) url=${url || window.location.href}`);
                if (!resolved) { resolved = true; resolveCapture(); }
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
            chrome.runtime.sendMessage({ type: 'BROADCAST_TO_FRAMES', customSelector: customSel, includeImages: incImg });
        }

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
        const maxAttempts = 3;
        for (let attempt = 1; attempt <= maxAttempts && !captured && isAutoScanning; attempt++) {
            const timeoutPromise = new Promise(r => setTimeout(r, 800));
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
                // reattach listeners and ask again
                if (chrome && chrome.runtime) chrome.runtime.onMessage.addListener(handler);
                window.addEventListener('DIG_FRAME_CONTENT', localHandler);
                if (chrome && chrome.runtime && chrome.runtime.id) {
                    chrome.runtime.sendMessage({ type: 'BROADCAST_TO_FRAMES', customSelector: customSel, includeImages: incImg });
                }
                await new Promise(r => setTimeout(r, 200));
            }
        }

        if (chrome && chrome.runtime) chrome.runtime.onMessage.removeListener(handler);
        window.removeEventListener('DIG_FRAME_CONTENT', localHandler);

        if (!captured && isAutoScanning) {
            const chapter = detectVitalSourceChapter();
            const pageToRecord = newPageNum || currentPageNum || lastPageNum || null;
            saveBookPage(detectedClass, bookTitle, chapter, { text:'', html:'', page: pageToRecord, force: true });
            digLog(`Page ${pageCount} force-saved blank (page ${pageToRecord || 'unknown'}) after ${maxAttempts} attempts`);
            captured = true;
        }
        if (!isAutoScanning) return;

        // ensure saved count increases before we navigate away
        let newCount = prevSavedCount;
        while (isAutoScanning && newCount <= prevSavedCount) {
            await new Promise(r => setTimeout(r, 100));
            newCount = getBookPageCount(detectedClass, bookTitle);
        }
        if (!isAutoScanning) return; // stopped mid-wait
        // verify that saves match nav count

        // wait for preview box to fill so we know page has some content
        await waitForPreviewContent();
        // navigate ensuring only a single page step
        const oldPage = currentPageNum;
        const resulting = await ensureSingleStep(oldPage);
        // navigation happened
        navCount++;
        if (!areConsecutive(oldPage, resulting)) {
            digLog(`Warning: navigation jumped more than one page (${oldPage} -> ${resulting})`);
        }

        // wait for navigation
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
