/**
 * Scan Tab: UI for page scanning and VitalSource book capture.
 */
let isRawMode = false;

async function renderScanTab(container) {
  try { if (typeof createFloatingToolbar === 'function') createFloatingToolbar(); } catch (e) { }
  if (isVitalSourcePage()) { renderBookScanTab(container); return; }
  const blocks = await scanPageContent(isRawMode);
  const toggleBtn = `<button id="dig-raw-toggle" style="background:${isRawMode ? 'var(--em-700)' : 'var(--glass-1)'};color:var(--em-100);border:var(--border-glass);border-radius:99px;padding:6px 14px;cursor:pointer;font-size:11px;font-weight:600;transition:all 200ms var(--ease-out-quint);">${isRawMode ? 'Disable Raw' : '🔍 Raw Scan'}</button>`;

  const currentSel = localStorage.getItem('dig_custom_reader_selector') || '';
  const useDefault = localStorage.getItem('dig_use_default_save') === 'true';
  const pickControls = `<div style="display:flex;align-items:center;gap:8px;">
      <button id="dig-scan-pick" style="background:var(--accent);color:white;border:none;border-radius:var(--radius-sm);padding:6px 10px;cursor:pointer;font-size:11px;font-weight:600;transition:var(--transition-fast);">🎯 Pick</button>
      <button id="dig-scan-set-default" style="background:var(--warning);color:white;border:none;border-radius:var(--radius-sm);padding:6px 10px;cursor:pointer;font-size:11px;font-weight:600;transition:var(--transition-fast);">⭐ Default</button>
      <button id="dig-scan-reset" style="background:var(--danger);color:white;border:none;border-radius:var(--radius-sm);padding:6px 10px;cursor:pointer;font-size:11px;font-weight:600;${currentSel ? '' : 'display:none;'}">🗑️ Reset</button>
      <label style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text-muted);cursor:pointer;"> <input type="checkbox" id="dig-use-default-save" ${useDefault ? 'checked' : ''} style="accent-color:var(--primary);" /> Use default</label>
    </div>`;

  if (!blocks.length) {
    container.innerHTML = `<div class="scan-feed"><div style="text-align:center;padding:18px 0;">${toggleBtn}<div style="margin-top:12px;">${pickControls}</div><p style="color:var(--text-muted);font-size:13px;margin-top:18px;">No content detected.</p>${currentSel ? `<div style="margin-top:12px;font-size:12px;color:var(--text-muted);">Selector: <code style="background:var(--bg-card);padding:4px 8px;border-radius:var(--radius-sm);border:var(--glass-border);">${escapeHtml(currentSel)}</code></div>` : ''}</div></div>`;
    document.getElementById('dig-raw-toggle').onclick = () => { isRawMode = !isRawMode; renderScanTab(container); };
    // wire pick/set-default/reset and use-default checkbox
    try {
      const pick = document.getElementById('dig-scan-pick'); if (pick) pick.onclick = () => startPickingElement((sel) => { if (sel) localStorage.setItem('dig_custom_reader_selector', sel); renderScanTab(container); });
      const setDef = document.getElementById('dig-scan-set-default'); if (setDef) setDef.onclick = () => {
        try {
          showSaveToBucketDialog('', { defaultCls: detectedClass, defaultTopic: 'Quick-Saves', isBook: false }, (cls, topic) => {
            if (cls) localStorage.setItem('dig_default_save_cls', cls);
            if (topic) localStorage.setItem('dig_default_save_topic', topic);
            localStorage.setItem('dig_use_default_save', 'true');
            alert('Default destination set to ' + cls + ' / ' + topic);
            renderScanTab(container);
          });
        } catch (e) { console.error('set default failed', e); }
      };
      const reset = document.getElementById('dig-scan-reset'); if (reset) reset.onclick = () => { localStorage.removeItem('dig_custom_reader_selector'); renderScanTab(container); };
      const useChk = document.getElementById('dig-use-default-save'); if (useChk) useChk.onchange = (e) => { localStorage.setItem('dig_use_default_save', e.target.checked ? 'true' : 'false'); };
    } catch (e) { }
    return;
  }
  const headerHtml = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding:12px 8px;border-bottom:var(--border-dim);">${toggleBtn}<div style="display:flex;align-items:center;gap:12px;"><p style="font-size:11px;color:var(--em-400);font-family:var(--font-mono);margin:0;">Found ${blocks.length}</p></div></div><div style="margin-bottom:12px;">${pickControls}</div>`;

  // Clear container and add header
  container.innerHTML = '';
  const headerWrap = document.createElement('div');
  headerWrap.innerHTML = headerHtml;
  container.appendChild(headerWrap);

  // Use Feed + ScanBlock components when available for cleaner DOM composition
  let feedInstance = null;
  if (window.DigSidebarComponents && window.DigSidebarComponents.components && typeof window.DigSidebarComponents.components.Feed?.create === 'function') {
    feedInstance = window.DigSidebarComponents.components.Feed.create();
    container.appendChild(feedInstance.root);
    blocks.forEach((block, i) => {
      const idLabel = `BLK::${String(i+1).padStart(3,'0')} // CONFIDENCE: ${((block.confidence||0)*1).toFixed(2)}`;
      let blockEl = null;
      if (window.DigSidebarComponents.components.ScanBlock && typeof window.DigSidebarComponents.components.ScanBlock.create === 'function') {
        blockEl = window.DigSidebarComponents.components.ScanBlock.create({ id: idLabel, text: (block.text || '').substring(0, 220) + '...' });
      } else {
        blockEl = document.createElement('div');
        blockEl.className = 'scan-block';
        blockEl.innerHTML = `<div class="scan-id">${idLabel}</div><p class="scan-text">${escapeHtml((block.text||'').substring(0,220))}...</p>`;
      }

      // append save button (keeps existing save wiring intact)
      const saveBtn = document.createElement('button');
      saveBtn.className = 'dig-scan-save save-btn';
      saveBtn.dataset.idx = i;
      saveBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px;"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17,21 17,13 7,13 7,21"/><polyline points="7,3 7,8 15,8"/></svg> Save Block';
      blockEl.appendChild(saveBtn);
      feedInstance.addBlock(blockEl);
    });
  } else {
    // fallback to previous DOM-building strategy
    container.innerHTML = `<div class="scan-feed">${headerHtml}${blocks.map((b, i) => '').join('')}</div>`;
    const feed = container.querySelector('.scan-feed');
    if (feed) {
      blocks.forEach((block, i) => {
        const node = document.createElement('div');
        node.className = 'scan-block';
        node.innerHTML = `<div class="scan-id">BLK::${String(i+1).padStart(3,'0')} // CONFIDENCE: ${((block.confidence||0)*1).toFixed(2)}</div><p class="scan-text">${escapeHtml(block.text.substring(0, 220))}...</p><button class="dig-scan-save save-btn" data-idx="${i}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px;"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17,21 17,13 7,13 7,21"/><polyline points="7,3 7,8 15,8"/></svg> Save Block</button>`;
        feed.appendChild(node);
      });
    }
  }
  document.getElementById('dig-raw-toggle').onclick = () => { isRawMode = !isRawMode; renderScanTab(container); };
  // wire pick/set-default/reset and use-default checkbox
  try {
    const pick = document.getElementById('dig-scan-pick'); if (pick) pick.onclick = () => startPickingElement((sel) => { if (sel) localStorage.setItem('dig_custom_reader_selector', sel); renderScanTab(container); });
    const setDef = document.getElementById('dig-scan-set-default'); if (setDef) setDef.onclick = () => {
      try {
        showSaveToBucketDialog('', { defaultCls: detectedClass, defaultTopic: 'Quick-Saves', isBook: false }, (cls, topic) => {
          if (cls) localStorage.setItem('dig_default_save_cls', cls);
          if (topic) localStorage.setItem('dig_default_save_topic', topic);
          localStorage.setItem('dig_use_default_save', 'true');
          alert('Default destination set to ' + cls + ' / ' + topic);
          renderScanTab(container);
        });
      } catch (e) { console.error('set default failed', e); }
    };
    const reset = document.getElementById('dig-scan-reset'); if (reset) reset.onclick = () => { localStorage.removeItem('dig_custom_reader_selector'); renderScanTab(container); };
    const useChk = document.getElementById('dig-use-default-save'); if (useChk) useChk.onchange = (e) => { localStorage.setItem('dig_use_default_save', e.target.checked ? 'true' : 'false'); };
  } catch (e) { }
  container.querySelectorAll('.dig-scan-save').forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.dataset.idx);
      const text = blocks[idx].text;
      const useDefaultSave = localStorage.getItem('dig_use_default_save') === 'true';
      const defCls = localStorage.getItem('dig_default_save_cls');
      const defTopic = localStorage.getItem('dig_default_save_topic');
      const defUseShared = (localStorage.getItem('dig_default_save_use_shared') === 'true' || localStorage.getItem('dig_default_save_use_shared') === '1');
      if (useDefaultSave && defCls && defTopic) {
        try {
          if (defUseShared && typeof saveToSharedKB === 'function') {
            // attempt to save to the extension-shared KB first
            saveToSharedKB(defCls, defTopic, text, { type: 'knowledge', html: '', force: false }).then(res => {
              if (!res || !res.success) {
                try { saveToBucket(defCls, defTopic, text, { type: 'knowledge', html: '', force: false }); } catch (e) { }
              }
            }).catch(() => { try { saveToBucket(defCls, defTopic, text, { type: 'knowledge', html: '', force: false }); } catch (e) { } });
          } else {
            saveToBucket(defCls, defTopic, text, { type: 'knowledge', html: '', force: false });
          }
          btn.innerText = '✅ Saved'; btn.disabled = true;
          return;
        } catch (e) { console.error('default save failed', e); }
      }
      // show dialog to pick class/topic
      try {
        showSaveToBucketDialog(text, { defaultCls: detectedClass, defaultTopic: 'Quick-Saves', isBook: false }, () => {
          btn.innerText = '✅ Saved'; btn.disabled = true;
        });
      } catch (e) {
        // fallback
        saveToKnowledgeBase(text, detectedClass);
        btn.innerText = '✅ Saved'; btn.disabled = true;
      }
    };
  });
}

function renderBookScanTab(container) {
  try { if (typeof createFloatingToolbar === 'function') createFloatingToolbar(); } catch (e) { }
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
      try { preview.dataset.digHasContent = textPreview.trim().length ? '1' : ''; } catch (e) { }
    }
    const saveBtn = document.getElementById('dig-book-save');
    if (saveBtn) { saveBtn.disabled = false; saveBtn.activeData = data; }
  });

  container.innerHTML = `
    <div style="background:var(--primary-glow);border:var(--glass-border);border-radius:var(--radius-md);padding:16px;margin-bottom:16px;box-shadow:var(--shadow-sm);">
      <p style="font-size:14px;font-weight:700;color:var(--primary-dark);margin:0 0 4px;">📖 ${escapeHtml(bookTitle)}</p>
      <p style="font-size:12px;color:var(--text-muted);margin:0;opacity:0.8;">${escapeHtml(chapter)} · ${savedCount} pages</p>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
      <span style="font-size:11px;font-weight:700;color:var(--text-muted);letter-spacing:0.05em;text-transform:uppercase;">Preview</span>
      <button id="dig-view-full" style="background:none;border:none;color:var(--primary);cursor:pointer;font-size:11px;font-weight:600;padding:0;transition:var(--transition-fast);">🔍 Full Content</button>
    </div>
    <div id="dig-scan-preview" style="background:var(--bg-card);border:var(--glass-border);border-radius:var(--radius-sm);padding:12px;margin-bottom:16px;max-height:100px;overflow:hidden;box-shadow:var(--shadow-sm);">
      <p style="font-size:12px;color:var(--text-main);line-height:1.6;margin:0;">${isEmpty ? '<i>Searching academic frames...</i>' : escapeHtml(pageText.replace(/!\[.*?\]\(.*?\)/g, '').substring(0, 200) + '...')}</p>
    </div>
    <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:16px;">
      <label style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text-main);cursor:pointer;">
        <input type="checkbox" id="dig-include-images" ${localStorage.getItem('dig_include_images') === 'true' ? 'checked' : ''} style="accent-color:var(--primary);">
        Include Images in Scan
      </label>
      <label style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text-main);cursor:pointer;">
        <input type="checkbox" id="dig-auto-advance" ${localStorage.getItem('dig_auto_advance') === 'true' ? 'checked' : ''} style="accent-color:var(--primary);">
        Auto-advance after Save
      </label>
    </div>
    <div style="display:flex;flex-direction:column;gap:12px;">
      <button id="dig-book-save" class="btn btn-primary" style="padding:12px;font-size:14px;" ${isEmpty ? 'disabled' : ''}>💾 Save Page</button>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <button id="dig-book-auto" style="background:var(--accent);color:white;border:none;border-radius:var(--radius-sm);padding:8px;cursor:pointer;font-size:12px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:6px;">▶️ Auto-Scan</button>
        <div style="display:flex;align-items:center;justify-content:center;background:var(--bg-card);border-radius:var(--radius-sm);border:var(--glass-border);"><span id="dig-auto-status" style="font-size:11px;color:var(--text-muted);font-weight:500;">Idle</span></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <button id="dig-book-pick" style="background:var(--accent);color:white;border:none;border-radius:var(--radius-sm);padding:8px;cursor:pointer;font-size:12px;font-weight:600;">🎯 Reader</button>
        <button id="dig-book-set-default" style="background:var(--warning);color:white;border:none;border-radius:var(--radius-sm);padding:8px;cursor:pointer;font-size:12px;font-weight:600;">⭐ Destination</button>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px;background:rgba(0,0,0,0.02);border-radius:var(--radius-sm);">
        <button id="dig-book-refresh" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:11px;font-weight:600;display:flex;align-items:center;gap:4px;">🔄 Refresh Preview</button>
        <label style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--text-muted);cursor:pointer;"><input type="checkbox" id="dig-use-default-save" ${localStorage.getItem('dig_use_default_save') === 'true' ? 'checked' : ''} style="accent-color:var(--primary);"/> Use default</label>
      </div>
    </div>`;

  // mark preview dataset based on whether we have initial content
  setTimeout(() => {
    try {
      const previewInit = document.getElementById('dig-scan-preview');
      if (previewInit) { previewInit.dataset.digHasContent = isEmpty ? '' : '1'; }
    } catch (e) { }
  }, 0);

  document.getElementById('dig-book-refresh').onclick = () => renderBookScanTab(container);
  document.getElementById('dig-include-images').onchange = (e) => localStorage.setItem('dig_include_images', e.target.checked);
  const autoAdvanceCheckbox = document.getElementById('dig-auto-advance');
  if (autoAdvanceCheckbox) autoAdvanceCheckbox.onchange = (e) => localStorage.setItem('dig_auto_advance', e.target.checked);
  document.getElementById('dig-book-pick').onclick = () => startBookPicking(container, () => renderBookScanTab(container));
  // Set Default wiring for book scan
  try {
    const setDef = document.getElementById('dig-book-set-default');
    if (setDef) setDef.onclick = () => {
      try {
        showSaveToBucketDialog('', { defaultCls: detectedClass, defaultTopic: bookTitle, isBook: true }, (cls, topic) => {
          if (cls) localStorage.setItem('dig_default_save_cls', cls);
          if (topic) localStorage.setItem('dig_default_save_topic', topic);
          localStorage.setItem('dig_use_default_save', 'true');
          alert('Default destination set to ' + cls + ' / ' + topic);
          renderBookScanTab(container);
        });
      } catch (e) { console.error('set default failed', e); }
    };
    const useChk = document.getElementById('dig-use-default-save'); if (useChk) useChk.onchange = (e) => { localStorage.setItem('dig_use_default_save', e.target.checked ? 'true' : 'false'); };
  } catch (e) { }
  document.getElementById('dig-book-auto').onclick = () => startAutoScan(container);
  document.getElementById('dig-view-full').onclick = () => {
    const btn = document.getElementById('dig-book-save');
    const text = btn.activeData ? btn.activeData.text : pageText;
    viewFullBookContent(chapter, text);
  };

  // keep save button disabled until the preview contains real content
  const preview = document.getElementById('dig-scan-preview');
  const saveBtn = document.getElementById('dig-book-save');
  const updateSaveState = () => {
    if (!preview || !saveBtn) return;
    const txt = preview.innerText || '';
    // placeholder text should not count as real content
    if (txt.includes('Searching frames')) {
      saveBtn.disabled = true;
    } else if (txt.trim().length < 5) {
      saveBtn.disabled = true;
    } else {
      saveBtn.disabled = false;
    }
  };
  if (preview) {
    const obs = new MutationObserver(updateSaveState);
    obs.observe(preview, { childList: true, subtree: true, characterData: true });
    // initial state
    updateSaveState();
  }
  // Quick attempt: try to fetch content immediately (no images) to populate preview faster
  if (isEmpty) {
    (async () => {
      try {
        const timeout = parseInt(localStorage.getItem('dig_preview_quick_timeout') || '300', 10);
        let data = null;
        try {
          const p = getVitalSourcePageText(undefined, false); // no images for speed
          data = (p instanceof Promise) ? await Promise.race([p, new Promise(r => setTimeout(() => r(null), timeout))]) : p;
        } catch (e) { data = null; }
        if (data && ((data.text && data.text.length >= 5) || data.html || data.page != null)) {
          const previewEl = document.getElementById('dig-scan-preview');
          const saveBtn = document.getElementById('dig-book-save');
          const text = (typeof data === 'object' ? data.text : data) || '';
          if (previewEl) {
            const hasImages = text.includes('![');
            const textPreview = escapeHtml(text.replace(/!\[.*?\]\(.*?\)/g, '').substring(0, 160));
            previewEl.innerHTML = `<p style="font-size:11px;color:#334155;">${textPreview}${hasImages ? ' <b style="color:#10b981;">[+Images]</b>' : ''}...</p>`;
            try { previewEl.dataset.digHasContent = textPreview.trim().length ? '1' : ''; } catch (e) { }
          }
          if (saveBtn) { saveBtn.disabled = false; saveBtn.activeData = data; }
        }
      } catch (e) { }
    })();
  }
  if (document.getElementById('dig-book-reset')) document.getElementById('dig-book-reset').onclick = () => { localStorage.removeItem('dig_custom_reader_selector'); renderBookScanTab(container); };

  document.getElementById('dig-book-save').onclick = async () => {
    const btn = document.getElementById('dig-book-save');
    const prevSavedCount = getBookPageCount(detectedClass, bookTitle);
    // Ensure manual save forces a record even for short pages (user pressed Save)
    const saveObj = btn.activeData ? Object.assign({}, btn.activeData) : { text: pageText, html: '' };
    if (!saveObj.text || saveObj.text.length < 20) saveObj.force = true;
    // Check if user enabled default destination; if so, save directly there
    try {
      const useDefaultSave = localStorage.getItem('dig_use_default_save') === 'true';
      const defCls = localStorage.getItem('dig_default_save_cls');
      const defTopic = localStorage.getItem('dig_default_save_topic');
      const defUseShared = (localStorage.getItem('dig_default_save_use_shared') === 'true' || localStorage.getItem('dig_default_save_use_shared') === '1');
      if (useDefaultSave && defCls && defTopic) {
        // prefer extension-shared KB when configured
        if (defUseShared && typeof saveToSharedKB === 'function') {
          try {
            await saveToSharedKB(defCls, defTopic, saveObj.text || '', { html: saveObj.html || '', type: 'book-page', chapter, force: saveObj.force || false });
            btn.innerText = '✅ Saved!';
          } catch (e) {
            try { saveBookPage(defCls, defTopic, chapter, saveObj); btn.innerText = '✅ Saved!'; } catch (err) { console.error(err); }
          }
        } else {
          saveBookPage(defCls, defTopic, chapter, saveObj);
          btn.innerText = '✅ Saved!';
        }
      } else {
        // Prompt user for destination bucket (allow saving to other class/topic)
        try {
          showSaveToBucketDialog(saveObj.text || saveObj, { defaultCls: detectedClass, defaultTopic: bookTitle, isBook: true, chapter, pageData: saveObj, html: saveObj.html, force: saveObj.force }, () => {
            btn.innerText = '✅ Saved!';
          });
        } catch (e) {
          // fallback
          saveBookPage(detectedClass, bookTitle, chapter, saveObj);
          btn.innerText = '✅ Saved!';
        }
      }
    } catch (e) { console.error('book save failed', e); }

    // persist auto-advance preference
    const autoAdvance = localStorage.getItem('dig_auto_advance') === 'true';
    if (autoAdvance) {
      // wait up to 5s for saved count to increase
      const start = Date.now();
      let newCount = getBookPageCount(detectedClass, bookTitle);
      while (newCount <= prevSavedCount && Date.now() - start < 5000) {
        await new Promise(r => setTimeout(r, 200));
        newCount = getBookPageCount(detectedClass, bookTitle);
      }
      // if count increased, navigate to next page via background scripting
      if (newCount > prevSavedCount) {
        try {
          if (chrome && chrome.runtime && chrome.runtime.id) {
            chrome.runtime.sendMessage({ type: 'NAVIGATE_TO_NEXT_PAGE', prevSavedCount, cls: detectedClass, bookTitle });
          } else {
            // fallback: dispatch ArrowRight to the top window if possible (better for SPA readers)
            try {
              const topDoc = (window.top && window.top.document) ? (window.top.document.body || window.top.document) : (document.body || document);
              topDoc.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39, which: 39, bubbles: true }));
            } catch (e) { }
          }
        } catch (e) { }
      }
    }

    // refresh UI
    setTimeout(() => renderBookScanTab(container), 300);
  };
}
