/**
 * Scan Preview Service: Manages the preview box visuals during auto-scan.
 * Why: The preview box provides real-time content feedback during scanning
 * and its flags are used by the scan loop to determine when to navigate.
 */

/** Why: Detects if text is from a placeholder state vs real captured content. */
function isPreviewPlaceholder(s) {
    try {
        if (!s) return true;
        const t = String(s).trim().toLowerCase();
        if (!t) return true;
        if (t === '...' || t === '…') return true;
        if (/^\.+$/.test(t)) return true;
        if (t.includes('searching frames')) return true;
        return false;
    } catch (e) { return true; }
}

/** Why: Mirrors captured text into the sidebar preview element. */
function updatePreviewBox(text) {
    try {
        const p = document.getElementById('dig-scan-preview');
        if (!p) return;
        const cleaned = (text || '').replace(/!\[^\]]*\]\([^\)]*\)/g, '').substring(0, 160);
        p.innerHTML = `<p style="font-size:11px;color:#334155;line-height:1.4;margin:0;">${cleaned}${cleaned.length ? '...' : ''}</p>`;
        try { p.dataset.digHasContent = isPreviewPlaceholder(cleaned) ? '' : '1'; } catch (e) { }
    } catch (e) { }
}

/** Why: Waits for real content to appear in the preview before navigating. */
async function waitForPreviewContent() {
    const p = document.getElementById('dig-scan-preview');
    if (!p) return;
    const MAX_TRIES = 8;
    const INTERVAL_MS = 100;
    let tries = 0;
    while (tries < MAX_TRIES) {
        const txt = p.innerText || '';
        const flagged = p.dataset && p.dataset.digHasContent === '1';
        if (flagged || !isPreviewPlaceholder(txt)) break;
        await new Promise(r => setTimeout(r, INTERVAL_MS));
        tries++;
    }
}

/** Why: Checks that preview has content and save count matches before navigating. */
function canNavigateNow(navCount) {
    const p = document.getElementById('dig-scan-preview');
    if (p) {
        const txt = p.innerText || '';
        if (txt.trim().length < 5 || txt.toLowerCase().includes('searching frames')) return false;
    }
    const saved = combinedBookPageCount(detectedClass, getBookTitle());
    if (saved < navCount + 1) return false;
    return true;
}

/** Why: Waits for the save count to increase, confirming a successful page save. */
function waitForSavedCountIncrease(prev, cls, title, timeoutMs = 3000) {
    return new Promise(resolve => {
        try { if (combinedBookPageCount(cls, title) > prev) return resolve(true); } catch (e) { }
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
}
