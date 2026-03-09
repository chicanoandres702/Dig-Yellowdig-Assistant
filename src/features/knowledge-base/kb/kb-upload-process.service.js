/**
 * KB Upload Process: Handles the actual file upload loop — PDF extraction, DataURL fallback,
 * chrome.storage persistence, retry, and download buttons.
 * Why: The processing logic is large and distinct from the overlay construction.
 */

function _wireUploadOverlayEvents(overlay, fileInput, entries, kb, container) {
    const clsSelect = overlay.querySelector('#dig-upload-class');
    const clsNewInput = overlay.querySelector('#dig-upload-class-new');
    const topicInput = overlay.querySelector('#dig-upload-topic');
    const perFileCheckbox = overlay.querySelector('#dig-upload-new-topic-per-file');
    let isUploading = false, isCancelled = false, currentReader = null;

    clsSelect.onchange = () => { clsNewInput.style.display = clsSelect.value === '__new__' ? 'inline-block' : 'none'; };
    overlay.querySelector('#dig-upload-close').onclick = () => { if (!isUploading) { overlay.remove(); fileInput.remove(); } else { isCancelled = true; try { if (currentReader) currentReader.abort(); } catch (e) { } } };
    overlay.querySelector('#dig-upload-cancel').onclick = () => { if (!isUploading) { overlay.remove(); fileInput.remove(); } else { isCancelled = true; overlay.querySelector('#dig-upload-cancel').textContent = 'Cancelling...'; try { if (currentReader) currentReader.abort(); } catch (e) { } } };

    overlay.querySelector('#dig-upload-confirm').onclick = async () => {
        const destCls = clsSelect.value === '__new__' ? (clsNewInput.value.trim() || 'Default') : clsSelect.value;
        const newTopicPerFile = !!perFileCheckbox.checked;
        const commonTopic = (topicInput.value && topicInput.value.trim()) ? topicInput.value.trim() : 'Uploaded PDFs';
        isUploading = true;
        overlay.querySelector('#dig-upload-confirm').disabled = true;
        overlay.querySelector('#dig-upload-cancel').textContent = 'Cancel Upload';

        for (let i = 0; i < entries.length; i++) {
            if (isCancelled) break;
            const entry = entries[i];
            const topicToUse = newTopicPerFile ? (entry.file.name.replace(/\.[^/.]+$/, '') || commonTopic) : commonTopic;
            try {
                const done = await _tryPdfExtraction(entry, destCls, topicToUse, isCancelled);
                if (done === 'cancelled') break;
                if (done) continue;
                await _uploadAsDataUrl(entry, destCls, topicToUse, isCancelled, (r) => { currentReader = r; });
            } catch (err) {
                if (err && err.message === 'aborted') { entry.status.textContent = 'Cancelled'; entry.elem.style.opacity = '0.6'; }
                else { console.error('upload pdf failed', err); entry.status.textContent = 'Error'; entry.elem.style.color = '#b91c1c'; }
            }
        }
        isUploading = false;
        overlay.querySelector('#dig-upload-confirm').disabled = false;
        overlay.querySelector('#dig-upload-cancel').textContent = 'Close';
        try { renderKnowledgeTab(container); } catch (e) { }
        if (!isCancelled) alert('Upload complete.');
    };
}

/** Why: Wraps chrome.storage.local.set in a Promise for async/await usage. */
function _storeInChromeStorage(key, obj) {
    return new Promise((resolve) => {
        try {
            if (!window.chrome || !chrome.storage || !chrome.storage.local) return resolve({ success: false, error: 'chrome.storage.local not available' });
            const toSet = {}; toSet[key] = obj;
            chrome.storage.local.set(toSet, () => {
                const err = chrome.runtime && chrome.runtime.lastError ? chrome.runtime.lastError : null;
                resolve(err ? { success: false, error: err.message || String(err) } : { success: true });
            });
        } catch (e) { resolve({ success: false, error: e && e.message ? e.message : String(e) }); }
    });
}

function _generateKey() {
    return (typeof _generateContentKey === 'function') ? _generateContentKey() : `digkb_item_${Date.now()}_${Math.floor(Math.random() * 0xFFFFFF).toString(16)}`;
}

/** Why: Saves extracted text/html as a KB entry. Used by both PDF extraction and DataURL paths. */
function _saveKbEntry(destCls, topic, fileName, key) {
    let currentKb = {};
    try { currentKb = JSON.parse(localStorage.getItem('digKnowledgeBase') || '{}'); } catch (e) { currentKb = {}; }
    if (!currentKb[destCls]) currentKb[destCls] = {};
    if (!currentKb[destCls][topic]) currentKb[destCls][topic] = [];
    currentKb[destCls][topic].push({ text: fileName, html: '', type: 'book-page', ts: Date.now(), contentRef: key, url: '' });
    return safeSaveKB(currentKb);
}
