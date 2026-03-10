/**
 * Scan Loop Helpers: Preview observer, retry logic, split-and-save, force-save.
 * Why: Extracted from scan-loop to keep each file under 100 lines.
 */

/** Why: MutationObserver on preview box provides a fast path for auto-saving. */
function _attachPreviewObserver(processData, isCaptured, isScanning, setObserver) {
    try {
        const pbox = document.getElementById('dig-scan-preview');
        if (!pbox) return;
        const check = () => {
            if (!isScanning() || isCaptured()) return;
            const txt = pbox.innerText || '';
            const flagged = pbox.dataset && pbox.dataset.digHasContent === '1';
            if (flagged || !isPreviewPlaceholder(txt)) {
                processData(txt, pbox.innerHTML || '', null, null);
            }
        };
        const observer = new MutationObserver(check);
        observer.observe(pbox, { childList: true, subtree: true, characterData: true });
        setObserver(observer);
        check();
    } catch (e) { }
}

/** Why: Re-requests frame content when first attempt times out. */
async function _retryCapture(captured, capturePromise, timeoutMs, isScanning, customSel, incImg) {
    const MAX_ATTEMPTS = 2;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS && !captured && isScanning(); attempt++) {
        await Promise.race([capturePromise, new Promise(r => setTimeout(r, timeoutMs))]);
        if (captured) break;
        if (attempt < MAX_ATTEMPTS && chrome?.runtime?.id) {
            chrome.runtime.sendMessage({ type: 'BROADCAST_TO_FRAMES', customSelector: customSel, includeImages: incImg });
            await new Promise(r => setTimeout(r, 100));
        }
    }
}

/** Why: Tries pagebreak splitting; falls back to single page save. */
async function _trySplitAndSave(text, html, url, saveObj, tCls, tTopic, chapter, useShared, finalPage) {
    try {
        const slices = await splitContentByPagebreaks(text, html, url);
        if (slices && Array.isArray(slices) && slices.length > 0) {
            for (let si = 0; si < slices.length; si++) {
                const s = slices[si];
                const sliceSave = { text: s.text || '', html: s.html || '', force: true };
                if (s.label != null) sliceSave.page = s.label;
                else if (finalPage != null) sliceSave.page = `${finalPage}${slices.length > 1 ? `.${si + 1}` : ''}`;
                savePageContent(tCls, tTopic, chapter, sliceSave, useShared);
            }
        } else {
            savePageContent(tCls, tTopic, chapter, saveObj, useShared);
        }
    } catch (e) {
        savePageContent(tCls, tTopic, chapter, saveObj, useShared);
    }
}

/** Why: Guarantees forward progress even when no content was captured. */
function _forceSaveBlank(config, currentPageNum, lastPageNum, pageCount) {
    const chapter = detectVitalSourceChapter();
    const page = currentPageNum || lastPageNum || null;
    const tCls = config.useDefault && config.cls ? config.cls : detectedClass;
    const tTopic = config.useDefault && config.topic ? config.topic : getBookTitle();
    const useShared = !!(config.useDefault && config.useShared);
    savePageContent(tCls, tTopic, chapter, { text: '', html: '', page, force: true }, useShared);
    digLog(`Page ${pageCount} force-saved blank (page ${page || 'unknown'})`);
}
