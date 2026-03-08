/**
 * Scan Tab: UI for page scanning and VitalSource book capture.
 */
let isRawMode = false;

function renderScanTab(container) {
  if (isVitalSourcePage()) { renderBookScanTab(container); return; }
  const blocks = scanPageContent(isRawMode);
  const toggleBtn = `<button id="dig-raw-toggle" style="background:${isRawMode ? '#ef4444' : '#f1f5f9'};color:${isRawMode ? 'white' : '#475569'};border:none;border-radius:4px;padding:4px 8px;cursor:pointer;font-size:10px;margin-bottom:8px;">${isRawMode ? 'Disable Raw' : '🔍 Raw Scan'}</button>`;

  if (!blocks.length) {
    container.innerHTML = `<div style="text-align:center;padding:20px;">${toggleBtn}<p style="color:#666;font-size:12px;">No content detected.</p></div>`;
    document.getElementById('dig-raw-toggle').onclick = () => { isRawMode = !isRawMode; renderScanTab(container); };
    return;
  }
  let html = `<div style="display:flex;justify-content:space-between;align-items:center;">${toggleBtn}<p style="font-size:11px;color:#888;">Found ${blocks.length}</p></div>`;
  blocks.forEach((block, i) => {
    html += `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px;margin-bottom:6px;">
      <p style="font-size:11px;line-height:1.4;margin:0 0 6px;color:#334155;">${escapeHtml(block.text.substring(0, 120))}...</p>
      <button class="dig-scan-save" data-idx="${i}" style="background:${PRIMARY_COLOR};color:white;border:none;border-radius:4px;padding:2px 8px;cursor:pointer;font-size:10px;">💾 Save</button></div>`;
  });
  container.innerHTML = html;
  document.getElementById('dig-raw-toggle').onclick = () => { isRawMode = !isRawMode; renderScanTab(container); };
  container.querySelectorAll('.dig-scan-save').forEach(btn => {
    btn.onclick = () => {
      saveToKnowledgeBase(blocks[parseInt(btn.dataset.idx)].text, detectedClass);
      btn.innerText = '✅ Saved'; btn.disabled = true;
    };
  });
}

function renderBookScanTab(container) {
  const bookTitle = getBookTitle(), chapter = detectVitalSourceChapter();
  const savedCount = getBookPageCount(detectedClass, bookTitle);

  // pageTextData might be a Promise now
  const result = getVitalSourcePageText();
  let pageText = '';

  // If it's a promise, it's definitely empty synchronously
  if (result instanceof Promise) {
    pageText = '';
  } else {
    pageText = typeof result === 'object' ? (result?.text || '') : (result || '');
  }

  const isEmpty = !pageText || pageText.length < 20;

  if (isEmpty) pollForBookContent(container, (data) => {
    const preview = document.getElementById('dig-scan-preview');
    const text = (typeof data === 'object' ? data.text : data) || '';
    if (preview) {
      const hasImages = text.includes('![');
      const textPreview = escapeHtml(text.replace(/!\[.*?\]\(.*?\)/g, '').substring(0, 160));
      preview.innerHTML = `<p style="font-size:11px;color:#334155;">${textPreview}${hasImages ? ' <b style="color:#10b981;">[+Images]</b>' : ''}...</p>`;
    }
    const saveBtn = document.getElementById('dig-book-save');
    if (saveBtn) { saveBtn.disabled = false; saveBtn.activeData = data; }
  });

  container.innerHTML = `
    <div style="background:#f0fdf4;border:1px solid #a7f3d0;border-radius:8px;padding:10px;margin-bottom:8px;">
      <p style="font-size:13px;font-weight:bold;color:${DARK_COLOR};margin:0 0 2px;">📖 ${escapeHtml(bookTitle)}</p>
      <p style="font-size:11px;color:#666;margin:0;">${escapeHtml(chapter)} · ${savedCount} pages</p>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
      <span style="font-size:11px;font-weight:bold;color:#64748b;">Preview</span>
      <button id="dig-view-full" style="background:none;border:none;color:${PRIMARY_COLOR};cursor:pointer;font-size:10px;padding:0;">🔍 View Full Content</button>
    </div>
    <div id="dig-scan-preview" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px;margin-bottom:8px;max-height:80px;overflow:hidden;">
      <p style="font-size:11px;color:#334155;line-height:1.4;margin:0;">${isEmpty ? '<i>Searching frames...</i>' : escapeHtml(pageText.replace(/!\[.*?\]\(.*?\)/g, '').substring(0, 200) + '...')}</p>
    </div>
    <div style="margin-bottom:8px;">
      <label style="display:flex;align-items:center;gap:6px;font-size:11px;color:#475569;cursor:pointer;">
        <input type="checkbox" id="dig-include-images" ${localStorage.getItem('dig_include_images') === 'true' ? 'checked' : ''} style="accent-color:${PRIMARY_COLOR};">
        Include Images in Scan
      </label>
    </div>
    <div style="display:flex;flex-direction:column;gap:6px;">
      <button id="dig-book-save" style="background:${PRIMARY_COLOR};color:white;border:none;border-radius:6px;padding:8px;cursor:pointer;font-size:12px;font-weight:bold;" ${isEmpty ? 'disabled' : ''}>💾 Save Page</button>
      <div style="gap:4px;display:flex;">
        <button id="dig-book-auto" style="flex:2;background:#8b5cf6;color:white;border:none;border-radius:6px;padding:6px;cursor:pointer;font-size:11px;">▶️ Auto-Scan</button>
      </div>
      <div style="gap:4px;display:flex;">
        <button id="dig-book-pick" style="flex:2;background:#3b82f6;color:white;border:none;border-radius:6px;padding:6px;cursor:pointer;font-size:11px;">🎯 Pick Reader</button>
        ${localStorage.getItem('dig_custom_reader_selector') ? `<button id="dig-book-reset" style="flex:1;background:#ef4444;color:white;border:none;border-radius:6px;padding:6px;cursor:pointer;font-size:11px;">🗑️ Reset</button>` : ''}
        <button id="dig-book-refresh" style="flex:1;background:#f1f5f9;color:#475569;border:1px solid #e2e8f0;border-radius:6px;padding:6px;cursor:pointer;font-size:11px;">🔄 Refresh</button>
      </div>
    </div>`;

  document.getElementById('dig-book-refresh').onclick = () => renderBookScanTab(container);
  document.getElementById('dig-include-images').onchange = (e) => localStorage.setItem('dig_include_images', e.target.checked);
  document.getElementById('dig-book-pick').onclick = () => startBookPicking(container, () => renderBookScanTab(container));
  document.getElementById('dig-book-auto').onclick = () => startAutoScan(container);
  document.getElementById('dig-view-full').onclick = () => {
    const btn = document.getElementById('dig-book-save');
    const text = btn.activeData ? btn.activeData.text : pageText;
    viewFullBookContent(chapter, text);
  };
  if (document.getElementById('dig-book-reset')) document.getElementById('dig-book-reset').onclick = () => { localStorage.removeItem('dig_custom_reader_selector'); renderBookScanTab(container); };

  document.getElementById('dig-book-save').onclick = () => {
    const btn = document.getElementById('dig-book-save');
    saveBookPage(detectedClass, bookTitle, chapter, btn.activeData || { text: pageText, html: '' });
    btn.innerText = '✅ Saved!';
    setTimeout(() => renderBookScanTab(container), 1500);
  };
}
