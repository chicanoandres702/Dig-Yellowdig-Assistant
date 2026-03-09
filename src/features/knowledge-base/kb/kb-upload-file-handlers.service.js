/**
 * KB Upload File Handlers: PDF extraction and DataURL processing per file.
 * Why: Separated from the upload process loop to keep each file under 100 lines.
 */

/** Why: Attempts PDF text extraction first to save storage space vs raw DataURL. */
async function _tryPdfExtraction(entry, destCls, topicToUse, isCancelled) {
    const f = entry.file;
    if (!(f && (f.type === 'application/pdf' || /\.pdf$/i.test(f.name)) && typeof extractPdfAsHtml === 'function')) return false;
    try {
        entry.status.textContent = 'Extracting...';
        entry.progress.removeAttribute('value');
        const extracted = await extractPdfAsHtml(f);
        if (isCancelled) { entry.status.textContent = 'Cancelled'; return 'cancelled'; }
        if (!extracted || (!extracted.html && !extracted.text)) return false;
        entry.status.textContent = 'Storing...'; entry.progress.value = 10; entry.progress.max = 100;
        const key = _generateKey();
        const htmlContent = extracted.html || `<div style="padding:8px;"><pre>${typeof escapeHtml === 'function' ? escapeHtml(extracted.text || '') : String(extracted.text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;')}</pre></div>`;
        const storeRes = await _storeInChromeStorage(key, { text: extracted.text || '', html: htmlContent });
        if (!storeRes.success) {
            entry.status.textContent = 'Store failed, falling back';
            return false;
        }
        const ok = _saveKbEntry(destCls, topicToUse, f.name, key);
        if (ok) { entry.status.textContent = 'Saved'; entry.progress.value = 100; entry.elem.style.background = '#eef9f4'; }
        else { entry.status.textContent = 'Failed to index'; entry.progress.value = 0; }
        return true;
    } catch (e) {
        console.warn('PDF extraction failed, falling back to raw upload', e);
        return false;
    }
}

/** Why: Reads file as DataURL for non-PDFs or when PDF extraction fails. */
async function _uploadAsDataUrl(entry, destCls, topicToUse, isCancelled, setReader) {
    const f = entry.file;
    entry.status.textContent = 'Reading...';
    entry.progress.removeAttribute('value');
    const dataUrl = await new Promise((resolve, reject) => {
        const r = new FileReader();
        setReader(r);
        r.onprogress = (ev) => { try { if (ev.lengthComputable) { entry.progress.max = ev.total; entry.progress.value = Math.floor((ev.loaded / ev.total) * 100); } } catch (e) { } };
        r.onload = () => { setReader(null); resolve(r.result); };
        r.onerror = () => { setReader(null); reject(new Error('read_failed')); };
        r.onabort = () => { setReader(null); reject(new Error('aborted')); };
        try { r.readAsDataURL(f); } catch (e) { setReader(null); reject(e); }
    });
    if (isCancelled) { entry.status.textContent = 'Cancelled'; return; }
    entry.dataUrl = dataUrl;
    entry.status.textContent = 'Storing...'; entry.progress.value = 10; entry.progress.max = 100;
    const htmlData = `<div style="padding:8px;"><iframe src="${dataUrl}" style="width:100%;height:640px;border:0;"></iframe></div>`;
    const key = _generateKey();
    const storeRes = await _storeInChromeStorage(key, { text: '', html: htmlData });
    if (storeRes.success) {
        const ok = _saveKbEntry(destCls, topicToUse, f.name, key);
        if (ok) { entry.status.textContent = 'Saved'; entry.progress.value = 100; entry.elem.style.background = '#eef9f4'; }
        else { entry.status.textContent = 'Failed to index'; }
    } else {
        _showUploadError(entry, storeRes, f, destCls, topicToUse);
    }
}

/** Why: Shows a user-friendly error with retry and download buttons. */
function _showUploadError(entry, storeRes, f, destCls, topicToUse) {
    const errMsg = (storeRes && storeRes.error) ? String(storeRes.error) : 'unknown error';
    let friendly = errMsg;
    if (/quota/i.test(errMsg)) friendly = 'Storage quota exceeded';
    else if (/not available|not found|permission|denied/i.test(errMsg)) friendly = 'Extension storage unavailable';
    entry.status.textContent = 'Failed: ' + friendly;
    entry.progress.value = 0; entry.elem.style.color = '#b91c1c';
    try {
        const controlsDiv = entry.elem.querySelector('div:last-child') || entry.elem;
        const retryBtn = document.createElement('button'); retryBtn.textContent = 'Retry'; retryBtn.style.cssText = 'margin-left:8px;padding:4px 8px;border-radius:4px;border:1px solid #e2e8f0;background:white;cursor:pointer;';
        const dlBtn = document.createElement('button'); dlBtn.textContent = 'Download'; dlBtn.style.cssText = 'margin-left:8px;padding:4px 8px;border-radius:4px;border:1px solid #e2e8f0;background:white;cursor:pointer;';
        retryBtn.onclick = async () => {
            retryBtn.disabled = true; entry.status.textContent = 'Retrying...';
            const newKey = _generateKey();
            const res2 = await _storeInChromeStorage(newKey, { text: '', html: `<div style="padding:8px;"><iframe src="${entry.dataUrl}" style="width:100%;height:640px;border:0;"></iframe></div>` });
            if (res2.success && _saveKbEntry(destCls, topicToUse, f.name, newKey)) { entry.status.textContent = 'Saved'; entry.progress.value = 100; entry.elem.style.background = '#eef9f4'; retryBtn.remove(); dlBtn.remove(); }
            else { entry.status.textContent = 'Failed'; retryBtn.disabled = false; }
        };
        dlBtn.onclick = () => { const a = document.createElement('a'); a.href = entry.dataUrl; a.download = f.name; document.body.appendChild(a); a.click(); a.remove(); };
        controlsDiv.appendChild(retryBtn); controlsDiv.appendChild(dlBtn);
    } catch (e) { }
}
