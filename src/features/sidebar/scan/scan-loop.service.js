/**
 * Scan Loop: Core auto-scan state machine — captures, saves, navigates.
 * Why: Iterates page-by-page delegating to scan/ sub-modules.
 */

function startAutoScan(container) {
    const btn = document.getElementById('dig-book-auto');
    if (isAutoScanning) {
        isAutoScanning = false;
        if (btn) btn.innerText = '▶️ Auto-Scan';
        try { const s = document.getElementById('dig-auto-status'); if (s) s.innerText = 'Stopped'; } catch (e) { }
        return;
    }
    isAutoScanning = true;
    const state = {
        pageCount: 0, navCount: 0, bookTitle: getBookTitle(),
        incImg: localStorage.getItem('dig_include_images') === 'true',
        customSel: localStorage.getItem('dig_custom_reader_selector'),
        lastNavTime: 0, currentPageNum: null, lastPageNum: null, lastTextSig: '',
        NAV_COOLDOWN_MS: parseInt(localStorage.getItem('dig_auto_scan_nav_cooldown') || '700', 10),
        ATTEMPT_TIMEOUT_MS: parseInt(localStorage.getItem('dig_auto_scan_attempt_timeout') || '500', 10)
    };
    _setAutoScanStatus('Starting…');
    _runScanIteration(btn, state);
}

function _setAutoScanStatus(s) {
    try { const el = document.getElementById('dig-auto-status'); if (el) { el.innerText = s || ''; el.dataset.digStatus = s ? 'active' : 'idle'; } } catch (e) { }
}

async function _ensureSingleStep(oldPage) {
    try {
        sendNavigateNextMessage();
        let attempts = 0, current = oldPage;
        while (attempts < 8) {
            await new Promise(r => setTimeout(r, 100));
            current = readPageNumFromContexts();
            if (areConsecutive(oldPage, current) || (current && current !== oldPage)) return current;
            attempts++;
        }
        return current;
    } catch (e) { return oldPage; }
}

async function _waitForPageChange() {
    let navigated = false;
    const onNav = () => { navigated = true; };
    window.addEventListener('DIG_PAGE_CHANGED', onNav, { once: true });
    let wait = 0;
    while (isAutoScanning && !navigated && wait < 800) { await new Promise(r => setTimeout(r, 50)); wait += 50; }
    window.removeEventListener('DIG_PAGE_CHANGED', onNav);
}
