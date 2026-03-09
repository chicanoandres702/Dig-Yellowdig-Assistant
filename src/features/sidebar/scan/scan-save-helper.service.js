/**
 * Scan Save Helper: Resolves save destination (local or shared KB) and persists content.
 * Why: The auto-scan saves content to either local storage or shared KB depending on
 * user configuration. This centralizes that decision to reduce code duplication across
 * single-page and multi-slice save paths.
 */

/** Why: Reads user's preferred save destination from localStorage. */
function getSaveDestinationConfig() {
    const useDefault = localStorage.getItem('dig_use_default_save') === 'true';
    const cls = localStorage.getItem('dig_default_save_cls');
    const topic = localStorage.getItem('dig_default_save_topic');
    const useShared = localStorage.getItem('dig_default_save_use_shared') === 'true'
        || localStorage.getItem('dig_default_save_use_shared') === '1';
    return { useDefault, cls, topic, useShared };
}

/**
 * Why: Attempts to save to shared KB first. Falls back to local if shared fails.
 * This pattern is repeated extensively in scan-actions — centralizing it prevents
 * 100+ lines of duplicated try/catch/fallback blocks.
 */
function savePageContent(targetCls, targetTopic, chapter, saveObj, useShared) {
    if (useShared && typeof saveToSharedKB === 'function') {
        try {
            saveToSharedKB(targetCls, targetTopic, saveObj.text || '', {
                html: saveObj.html || '',
                type: 'book-page',
                chapter: chapter,
                force: saveObj.force || false,
                page: saveObj.page
            }).then(res => {
                if (!res || !res.success) {
                    try { saveBookPage(targetCls, targetTopic, chapter, saveObj); } catch (e) { }
                }
            }).catch(() => {
                try { saveBookPage(targetCls, targetTopic, chapter, saveObj); } catch (e) { }
            });
        } catch (e) {
            try { saveBookPage(targetCls, targetTopic, chapter, saveObj); } catch (err) { }
        }
    } else {
        saveBookPage(targetCls, targetTopic, chapter, saveObj);
    }
}

/**
 * Why: Determines the final page value using multiple fallbacks.
 * Priority: explicit page → sniffed metadata → reader input → last saved → current.
 */
function resolveFinalPageValue(page, lastPageNum, currentPageNum) {
    if (page) return page;
    const metaLabel = getPageLabelFromMetadata();
    if (metaLabel) return metaLabel;
    try {
        const ctxVal = readPageNumFromContexts();
        if (ctxVal) return ctxVal;
    } catch (e) { }
    if (lastPageNum) return lastPageNum;
    if (currentPageNum) return currentPageNum;
    return null;
}
