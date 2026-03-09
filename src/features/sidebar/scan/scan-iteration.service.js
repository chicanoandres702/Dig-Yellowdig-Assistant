/**
 * Scan Iteration: Per-page capture, process, and navigate logic.
 * Why: The actual scan loop body is large enough to need its own file.
 */

async function _runScanIteration(btn, state) {
    if (!isAutoScanning) return;
    state.pageCount++;
    if (btn) btn.innerText = `🛑 Stop (${state.pageCount})`;
    _setAutoScanStatus('Requesting content…');
    try { const p = document.getElementById('dig-scan-preview'); if (p) p.dataset.digHasContent = ''; } catch (e) { }
    state.currentPageNum = readPageNumFromContexts();
    const prevSavedCount = combinedBookPageCount(detectedClass, state.bookTitle);
    let captured = false, resolveCapture;
    const capturePromise = new Promise(r => { resolveCapture = r; });
    let previewObserver = null;
    const config = getSaveDestinationConfig();

    const processData = (text, html, page, url) => {
        if (captured || !isAutoScanning) return;
        if (typeof text === 'string' && text.trim().toLowerCase().includes('searching frames')) return;
        let sig = (text || '').substring(0, 200) + '|' + (html || '').substring(0, 200);
        if (page != null) sig += '|p:' + page; else if (url) sig += '|u:' + url;
        if (sig === state.lastTextSig) return;
        captured = true;
        state.lastTextSig = sig;
        const chapter = detectVitalSourceChapter();
        const finalPage = resolveFinalPageValue(page, state.lastPageNum, state.currentPageNum);
        const saveObj = { text, html, page: finalPage, force: false };
        const tCls = config.useDefault && config.cls ? config.cls : detectedClass;
        const tTopic = config.useDefault && config.topic ? config.topic : state.bookTitle;
        const useShared = !!(config.useDefault && config.useShared);
        _setAutoScanStatus('Saving…');
        _trySplitAndSave(text, html, url, saveObj, tCls, tTopic, chapter, useShared, finalPage);
        updatePreviewBox(text || html);
        _setAutoScanStatus('Saved — awaiting confirmation…');
        if (typeof resolveCapture === 'function') { try { resolveCapture(); } catch (e) { } resolveCapture = null; }
    };

    // Wire listeners
    const handler = (msg) => { if (!isAutoScanning || captured) return; if (msg.type === 'FRAME_CONTENT_REPORT') processData(msg.text, msg.html, msg.page, msg.url); };
    const localHandler = (e) => { if (!isAutoScanning || captured) return; const d = e.detail || {}; processData(d.text, d.html, d.page, d.url); };
    if (chrome && chrome.runtime) chrome.runtime.onMessage.addListener(handler);
    window.addEventListener('DIG_FRAME_CONTENT', localHandler);
    if (chrome?.runtime?.id) { _setAutoScanStatus('Requesting frames…'); chrome.runtime.sendMessage({ type: 'BROADCAST_TO_FRAMES', customSelector: state.customSel, includeImages: state.incImg }); }

    _attachPreviewObserver(processData, () => captured, () => isAutoScanning, (o) => { previewObserver = o; });

    // Immediate capture
    if (typeof getVitalSourcePageText === 'function' && !captured) {
        try { const d = await getVitalSourcePageText(); if (d && ((d.text?.length > 0) || d.html || d.page != null)) { if (!(d.text || '').trim().toLowerCase().includes('searching frames')) processData(d.text, d.html, d.page, window.location.href); } } catch (e) { }
    }

    await _retryCapture(captured, capturePromise, state.ATTEMPT_TIMEOUT_MS, () => isAutoScanning, state.customSel, state.incImg);
    if (chrome && chrome.runtime) chrome.runtime.onMessage.removeListener(handler);
    window.removeEventListener('DIG_FRAME_CONTENT', localHandler);
    try { if (previewObserver) previewObserver.disconnect(); } catch (e) { }

    if (!captured && isAutoScanning) { _forceSaveBlank(config, state.currentPageNum, state.lastPageNum, state.pageCount); captured = true; }
    if (!isAutoScanning) return;

    _setAutoScanStatus('Waiting for save…');
    await waitForSavedCountIncrease(prevSavedCount, detectedClass, state.bookTitle, 3000);
    if (!isAutoScanning) return;
    await waitForPreviewContent();
    _setAutoScanStatus('Navigating…');
    const resulting = await _ensureSingleStep(state.currentPageNum);
    state.navCount++;
    _setAutoScanStatus(`Navigated: ${resulting || 'unknown'}`);

    await _waitForPageChange();
    if (isAutoScanning) { await new Promise(r => setTimeout(r, 20)); _runScanIteration(btn, state); }
}
