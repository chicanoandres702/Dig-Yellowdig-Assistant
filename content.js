// Global state and buckets
let classBuckets = {};

// helper to call chrome APIs without crashing if context is invalidated
function withChrome(fn) {
  try {
    if (chrome && chrome.runtime && chrome.runtime.id) {
      fn();
    }
  } catch (e) {
    console.warn('chrome API unavailable:', e);
  }
}

// Normalize pagebreaks payloads into pages entries the rest of the app expects
function normalizePagebreaksToPages(pb) {
  const pages = [];
  try {
    if (!pb) return pages;
    let entries = [];
    if (Array.isArray(pb)) entries = pb;
    else if (pb && Array.isArray(pb.pages)) entries = pb.pages;
    else if (pb && typeof pb === 'object') entries = Object.values(pb);

    entries.forEach(entry => {
      if (!entry) return;
      // If entry itself is a collection, flatten
      if (Array.isArray(entry)) {
        entry.forEach(e => entries.push(e));
        return;
      }
      const label = entry.label || entry.page || entry.page_label || entry.pageLabel || entry.title || entry.pageTitle || null;
      const obj = {};
      if (label != null) obj.label = String(label);
      if (entry.absoluteURL) obj.absoluteURL = entry.absoluteURL;
      if (entry.url) obj.url = entry.url;
      if (entry.href) obj.href = entry.href;
      if (entry.resource) obj.resource = entry.resource;
      if (entry.cfi) obj.cfi = entry.cfi;
      if (entry.path) obj.path = entry.path;
      if (entry.chapterTitle) obj.chapterTitle = entry.chapterTitle;
      if (Object.keys(obj).length) pages.push(obj);

      // handle nested subpages/breaks
      if (entry.subpages && Array.isArray(entry.subpages)) {
        entry.subpages.forEach(sp => {
          const splabel = sp.label || sp.page || sp.page_label || sp.pageLabel || sp.title || null;
          const spObj = {};
          if (splabel != null) spObj.label = String(splabel);
          if (sp.absoluteURL) spObj.absoluteURL = sp.absoluteURL;
          if (sp.url) spObj.url = sp.url;
          if (sp.href) spObj.href = sp.href;
          if (sp.resource) spObj.resource = sp.resource;
          if (sp.cfi) spObj.cfi = sp.cfi;
          if (sp.path) spObj.path = sp.path;
          if (sp.chapterTitle) spObj.chapterTitle = sp.chapterTitle || entry.chapterTitle;
          if (Object.keys(spObj).length) pages.push(spObj);
        });
      }
    });
  } catch (e) { /* ignore */ }
  return pages;
}

// Execute a single agent step coming from the planner UI/background.
// Supports NAVIGATE, CLICK, TYPE, WAIT, SCROLL, SUBMIT, MAP.
async function executeAgentStep(step) {
  if (!step || !step.type) throw new Error('Invalid agent step');
  const type = (step.type || '').toString().toUpperCase();
  const index = Number(step.index || 0);
  const selector = step.selector;
  const text = step.text || step.value || '';
  const ms = Number(step.ms || step.delay || 0);

  const findEl = (sel) => {
    if (!sel) return null;
    const list = document.querySelectorAll(sel);
    return (list && list.length > 0) ? (list[index] || list[0]) : null;
  };

  switch (type) {
    case 'NAVIGATE':
      if (!step.url) throw new Error('NAVIGATE missing url');
      window.location.href = step.url;
      return { status: 'navigated', url: step.url };

    case 'WAIT':
      await new Promise(r => setTimeout(r, ms || 500));
      return { status: 'waited', ms: ms || 500 };

    case 'CLICK': {
      const el = findEl(selector);
      if (!el) throw new Error('CLICK: selector not found: ' + selector);
      try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (_) {}
      try { el.click(); } catch (e) {
        // fallback dispatch synthetic mouse events
        ['mouseover','mousedown','mouseup','click'].forEach(t => el.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true })));
      }
      return { status: 'clicked', selector };
    }

    case 'TYPE': {
      const target = findEl(selector) || document.activeElement;
      if (!target) throw new Error('TYPE: target not found');
      try {
        if (target.tagName && (target.tagName.toLowerCase() === 'input' || target.tagName.toLowerCase() === 'textarea')) {
          target.focus(); target.value = text; target.dispatchEvent(new Event('input', { bubbles: true })); target.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (target.isContentEditable) {
          target.focus(); target.innerText = text; target.dispatchEvent(new InputEvent('input', { bubbles: true }));
        } else {
          try { target.value = text; } catch (_) {}
        }
      } catch (e) { /* ignore typing errors */ }
      return { status: 'typed', selector, text };
    }

    case 'SUBMIT': {
      const form = findEl(selector) || document.querySelector('form');
      if (!form) throw new Error('SUBMIT: form not found');
      try { form.submit(); } catch (e) { /* ignore */ }
      return { status: 'submitted', selector };
    }

    case 'SCROLL': {
      const el = findEl(selector) || document.body;
      try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (_) {}
      return { status: 'scrolled', selector };
    }

    case 'MAP': {
      let value = step.value;
      if (selector) {
        const mEl = findEl(selector);
        if (mEl) value = mEl.value || mEl.innerText || mEl.textContent || null;
      }
      if (step.key) localStorage.setItem(step.key, value);
      try {
        if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage({ action: 'AGENT_ACTION_RESULT', key: step.key || null, value });
        }
      } catch (_) {}
      return { status: 'mapped', key: step.key, value };
    }

    default:
      throw new Error('Unknown step type: ' + type);
  }
}
window.addEventListener('message', (e) => {
  // Forward any page-level service worker registration attempts/errors to the background for diagnostics
  try {
    if (e.data && typeof e.data.type === 'string' && e.data.type.indexOf('PAGE_SW_') === 0) {
      try {
        const payload = e.data || {};
        const log = `[PAGE SW] ${payload.type} url=${payload.url || ''} msg=${payload.message || ''} stack=${(payload.stack||'').toString().slice(0,1000)}`;
        withChrome(() => { try { chrome.runtime.sendMessage({ type: 'DIG_DEBUG_LOG', log }); } catch (err) { /* ignore */ } });
      } catch (err) { /* ignore */ }
      return;
    }
  } catch (err) { /* ignore */ }
  if (e.data && e.data.type === 'DIG_METADATA_SNIFFED') {
    const meta = window.sniffedMetadata;
    if (e.data.url.includes('books.json')) meta.books = e.data.data;
    if (e.data.url.includes('pages.json')) meta.pages = e.data.data;
    if (e.data.url.includes('pagebreaks')) {
      meta.pagebreaks = e.data.data;
      try {
        const norm = normalizePagebreaksToPages(e.data.data);
        if (norm && norm.length) {
          // prefer pagebreaks-derived pages first so they drive labels/navigation
          meta.pages = (Array.isArray(meta.pages) ? meta.pages : []).concat(norm);
          digLog(`Normalized ${norm.length} pagebreak entries into pages`);
        }
      } catch (err) { }
    }
    digLog(`Metadata sniffed: ${e.data.url.split('/').pop()}`);
  }

  // postMessage-based navigation fallback: dispatch ArrowRight in top window
  if (e.data && e.data.type === 'DIG_NAVIGATE_NEXT') {
    try {
      const topDoc = (window.top && window.top.document) ? (window.top.document.body || window.top.document) : (document.body || document);
      topDoc.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39, which: 39, bubbles: true, cancelable: true }));
    } catch (err) {
      try { (document.body || document).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39, which: 39, bubbles: true, cancelable: true })); } catch (e) { }
    }
  }
});

// Dynamic context helper
function updateContext() {
  // Prefer calling the shared detector when available; otherwise use a lightweight
  // fallback to avoid ReferenceError on pages where the detector script hasn't
  // been injected yet.
  let result = { detectedClass: localStorage.getItem('dig_last_class') || 'Unknown Class', detectedWeek: 'Week 1' };
  try {
    if (typeof detectClassAndWeek === 'function') {
      result = detectClassAndWeek();
    } else {
      // Minimal heuristics (best-effort): inspect URL and title for class/week hints
      const url = (window.location && window.location.href) ? window.location.href : '';
      if (url.includes('vitalsource.com')) {
        result.detectedClass = 'VitalSource';
        const ch = url.match(/chapter[\-_\/]?(\d+)/i) || url.match(/chap(?:ter)?[\-_]?(\d+)/i);
        result.detectedWeek = ch ? ('Chapter ' + ch[1]) : 'Chapter 1';
      } else if (url.includes('capella.edu')) {
        const cm = url.match(/([A-Z]{2,4}[\-_]?FPX?\d{4})/i);
        result.detectedClass = cm ? cm[1] : 'Capella';
        const wm = url.match(/week[\-_\/]?(\d+)/i);
        result.detectedWeek = wm ? ('Week ' + wm[1]) : 'Week 1';
      } else if (url.includes('yellowdig')) {
        result.detectedClass = 'Yellowdig';
        result.detectedWeek = 'Discussion';
      } else {
        const titleMatch = (document.title || '').match(/([A-Z]{2,4}[\-_]?FPX?\d{4})/i);
        result.detectedClass = titleMatch ? titleMatch[1] : (localStorage.getItem('dig_last_class') || 'Unknown Class');
        result.detectedWeek = 'Week 1';
      }
    }
  } catch (e) {
    // Swallow errors and fall back to safe defaults
    result = { detectedClass: localStorage.getItem('dig_last_class') || 'Unknown Class', detectedWeek: 'Week 1' };
  }

  window.detectedClass = result.detectedClass || 'Unknown Class';
  window.detectedWeek = result.detectedWeek || 'Week 1';

  // Sync API keys from extension storage to page localStorage for sidebar access
  withChrome(() => {
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['gemini_api_key'], (res) => {
        if (res && res.gemini_api_key) localStorage.setItem('gemini_api_key', res.gemini_api_key);
      });
    }
  });

  return result;
}

updateContext();

function init() {
  // initContextMenuHandler is defined in an optional injected file.
  // Guard the call so pages that don't have that script won't throw.
  if (typeof initContextMenuHandler === 'function') {
    try { initContextMenuHandler(); } catch (e) { /* ignore init errors */ }
  }
  updateContext();
  if (!classBuckets[window.detectedClass]) classBuckets[window.detectedClass] = {};
  if (!classBuckets[window.detectedClass][window.detectedWeek]) {
    classBuckets[window.detectedClass][window.detectedWeek] = {
      posts: [], homework: [], notes: [], stickyNotes: []
    };
  }

  // Initialize the sidebar panel (replaces old toolbar)
  // Prefer an existing `createSidebar` in-page helper. If it's not present,
  // inject the sidebar panel service into the page and call it after a short delay.
  try {
    // Prefer a page-defined createSidebar (attached to window). Accessing via
    // window.createSidebar avoids ReferenceError in cases where the identifier
    // isn't declared in the content script's scope.
    if (typeof window.createSidebar === 'function') {
      try { window.createSidebar(); } catch (e) { /* ignore page-side errors */ }
    } else {
      // Inject the panel service into the page context so it can define createSidebar
      injectSidebarPanelService();
      setTimeout(() => {
        try { if (typeof window.createSidebar === 'function') window.createSidebar(); } catch (e) { /* ignore */ }
      }, 400);
    }
  } catch (e) { console.warn('createSidebar invocation failed', e); }

  // Persist class for Yellowdig cross-reference
  if (detectedClass && detectedClass !== 'Unknown Class') {
    localStorage.setItem('dig_last_class', detectedClass);
  }

  // Install page-level service worker logger to capture registration attempts/errors
  try { injectServiceWorkerLogger(); } catch (e) { /* ignore */ }


  // Highlight shortcut preserved
  document.addEventListener('keydown', (e) => {
    if (e.altKey && e.key === 'h') highlightText();
  });
}

// Simple text highlighter (preserved from annotation service)
function highlightText(color = '#fef08a') {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  const range = selection.getRangeAt(0);
  const span = document.createElement('span');
  span.style.backgroundColor = color;
  span.className = 'dig-highlight';
  try { range.surroundContents(span); } catch (e) { /* multi-node */ }
}

// Robust SPA navigation detection
let lastUrl = location.href;
new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    digLog('Navigation detected: ' + lastUrl);
    updateContext();
    if (typeof refreshSidebar === 'function') refreshSidebar();
    // Dispatch event for auto-scan loop
    window.dispatchEvent(new CustomEvent('DIG_PAGE_CHANGED', { detail: { url: lastUrl } }));
  }
}).observe(document, { subtree: true, childList: true });

// Safe wrapper for VitalSource detection — the real `isVitalSourcePage`
// may live in another injected script. Use a best-effort heuristic when
// the function isn't available to avoid ReferenceError.
function isVitalSourcePageSafe() {
  try {
    if (typeof isVitalSourcePage === 'function') return isVitalSourcePage();
  } catch (e) { /* fall through to heuristic */ }
  try { return !!(window.location && window.location.href && window.location.href.includes('vitalsource.com')); } catch (e) { return false; }
}

// VitalSource page content observer – automatically report text when reader DOM mutates
if (isVitalSourcePageSafe()) {
  const readerSel = '#pbk-page, #pfe-content, #vst-content-display, main article, .epub-content';
  const readerEl = document.querySelector(readerSel);
  if (readerEl) {
    // keep fingerprint to ignore spurious mutations
    let _lastFrameSig = '';
    const throttled = debounce(async () => {
      try {
        if (typeof getVitalSourcePageText === 'function') {
          const data = await getVitalSourcePageText();
          if (data && ((data.text && data.text.length > 0) || data.html || data.page != null)) {
            const sig = `${data.page || ''}|${(data.text || '').substring(0, 200)}`;
            if (sig === _lastFrameSig) return;
            _lastFrameSig = sig;
            // fire both local event and background message (for auto-scan)
            window.dispatchEvent(new CustomEvent('DIG_FRAME_CONTENT', { detail: data }));
            if (chrome.runtime?.id) {
              chrome.runtime.sendMessage({ type: 'FRAME_CONTENT_REPORT', text: data.text, html: data.html || '', page: data.page, url: window.location.href });
            }
          }
        }
      } catch (e) { /* ignore */ }
    }, 80);
    const mo2 = new MutationObserver(throttled);
    mo2.observe(readerEl, { childList: true, subtree: true, characterData: true });

    // attach input-value listener whenever a page-number input exists
    function attachInputListener(win) {
      try {
        const inp = win.document.querySelector('input[id^="text-field-"]');
        if (inp && !inp._digListener) {
          inp._digListener = true;
          inp.addEventListener('input', () => {
            const val = inp.value;
            if (val) window.dispatchEvent(new CustomEvent('DIG_FRAME_CONTENT', { detail: { page: val, url: window.location.href } }));
          });
        }
      } catch (e) { }
    }
    attachInputListener(window);
    document.querySelectorAll('iframe').forEach(f => {
      try { if (f.contentWindow) attachInputListener(f.contentWindow); } catch (e) { }
    });

    // watch for new inputs dynamically added (e.g., when reader reloads)
    const bodyObserver = new MutationObserver(muts => {
      muts.forEach(m => {
        m.addedNodes.forEach(node => {
          if (node.nodeType === 1) {
            if (node.matches && node.matches('input[id^="text-field-"]')) {
              attachInputListener({ document: node.ownerDocument });
            }
            // also search inside subtree
            try {
              node.querySelectorAll && node.querySelectorAll('input[id^="text-field-"]').forEach(i => attachInputListener({ document: i.ownerDocument }));
            } catch (_) { }
          }
        });
      });
    });
    bodyObserver.observe(document.body, { childList: true, subtree: true });
  }
}

// simple debounce helper
function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// Fallback for popstate
window.addEventListener('popstate', () => {
  lastUrl = location.href;
  updateContext();
  if (typeof refreshSidebar === 'function') refreshSidebar();
});

// --- Injected iframe panel helpers (fallback when in-page sidebar not working) ---
const PAGEPILOT_IFRAME_ID = 'pagepilot-panel-iframe';
const PAGEPILOT_CLOSE_ID = 'pagepilot-panel-close';
const PAGEPILOT_WIDTH = 360; // px

function createInjectedPanel() {
  if (document.getElementById(PAGEPILOT_IFRAME_ID)) return document.getElementById(PAGEPILOT_IFRAME_ID);
  const iframe = document.createElement('iframe');
  iframe.id = PAGEPILOT_IFRAME_ID;
  try { iframe.src = chrome.runtime.getURL('web-assistant.html'); } catch (e) { iframe.src = 'web-assistant.html'; }
  iframe.style.cssText = `position:fixed;top:0;right:0;height:100vh;width:${PAGEPILOT_WIDTH}px;border:none;z-index:2147483647;box-shadow:-10px 0 30px rgba(0,0,0,0.25);transform:translateX(${PAGEPILOT_WIDTH}px);transition:transform 0.32s ease;`;
  iframe.setAttribute('title', 'PagePilot Sidebar');
  document.documentElement.appendChild(iframe);

  const close = document.createElement('button');
  close.id = PAGEPILOT_CLOSE_ID;
  close.innerText = '×';
  close.title = 'Close PagePilot';
  close.style.cssText = `position:fixed;top:12px;right:${PAGEPILOT_WIDTH + 12}px;z-index:2147483648;background:rgba(0,0,0,0.5);border:none;color:white;width:36px;height:36px;border-radius:6px;cursor:pointer;font-size:18px;line-height:18px;`;
  close.onclick = hideInjectedPanel;
  document.documentElement.appendChild(close);

  return iframe;
}

function showInjectedPanel() {
  const iframe = createInjectedPanel();
  requestAnimationFrame(() => { iframe.style.transform = 'translateX(0)'; });
  document.body.style.transition = 'padding-right 0.32s';
  document.body.style.paddingRight = PAGEPILOT_WIDTH + 'px';
  document.documentElement.classList.add('pagepilot-panel-open');
}

function hideInjectedPanel() {
  const iframe = document.getElementById(PAGEPILOT_IFRAME_ID);
  if (iframe) {
    iframe.style.transform = `translateX(${PAGEPILOT_WIDTH}px)`;
    setTimeout(() => { try { iframe.remove(); } catch (e) {} }, 350);
  }
  const close = document.getElementById(PAGEPILOT_CLOSE_ID);
  if (close) close.remove();
  document.body.style.paddingRight = '';
  document.documentElement.classList.remove('pagepilot-panel-open');
}

function toggleInjectedPanel() {
  if (document.getElementById(PAGEPILOT_IFRAME_ID)) hideInjectedPanel(); else showInjectedPanel();
}

// -------- Element Picker (interactive) --------
// Lightweight in-page element picker: hover to highlight, click to pick.
let _pickerActive = false;
let _pickerHovered = null;
let _pickerHighlightEl = null;
let _pickerInfoEl = null;
let _pickerMouseMove = null;
let _pickerClick = null;
let _pickerKey = null;

function getUniqueSelector(el) {
  if (!el || el.nodeType !== 1) return null;
  if (el.id) return `#${el.id}`;
  const parts = [];
  let node = el;
  while (node && node.nodeType === 1 && node.tagName.toLowerCase() !== 'html') {
    let part = node.tagName.toLowerCase();
    if (node.className) {
      const cls = String(node.className).split(/\s+/).filter(Boolean)[0];
      if (cls) part += `.${cls}`;
    }
    const parent = node.parentNode;
    if (parent) {
      const children = Array.from(parent.children).filter(ch => ch.tagName === node.tagName);
      if (children.length > 1) {
        const idx = Array.prototype.indexOf.call(parent.children, node) + 1;
        part += `:nth-child(${idx})`;
      }
    }
    parts.unshift(part);
    node = node.parentNode;
    if (parts.length > 8) break; // keep selector reasonably short
  }
  return parts.join(' > ');
}

function detectAuthor(el) {
  try {
    if (!el) return 'Unknown';
    const authorSelectors = ['.author', '.user', '.username', '.display-name', '.yd-user', '.name', '.handle', '.poster', 'a[rel="author"]', 'a[href*="/user/"]'];
    for (const s of authorSelectors) {
      try {
        const found = (el.querySelector && el.querySelector(s)) || el.closest && el.closest(s);
        if (found && found.textContent && found.textContent.trim()) return found.textContent.trim().substring(0, 120);
      } catch (e) { /* ignore */ }
    }
    // try previous sibling or ancestor hints
    if (el.previousElementSibling && el.previousElementSibling.textContent) return el.previousElementSibling.textContent.trim().substring(0,120);
    let anc = el.parentElement;
    while (anc) {
      for (const s of authorSelectors) {
        try { const f = anc.querySelector && anc.querySelector(s); if (f && f.textContent) return f.textContent.trim().substring(0,120); } catch (e) {}
      }
      anc = anc.parentElement;
    }
  } catch (e) {}
  return 'Unknown';
}

function sendPickerResults(items) {
  try {
    if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ action: 'PICKER_RESULTS', results: items });
    }
  } catch (e) { }
}

function sendPickerCancelled() {
  try {
    if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ action: 'PICKER_CANCELLED' });
    }
  } catch (e) { }
}

function startElementPicker() {
  if (_pickerActive) return;
  _pickerActive = true;

  // Highlight element box
  _pickerHighlightEl = document.createElement('div');
  _pickerHighlightEl.id = 'pagepilot-picker-highlight';
  _pickerHighlightEl.style.cssText = 'position:fixed;pointer-events:none;z-index:2147483647;border:2px solid rgba(96,165,250,0.95);background:rgba(96,165,250,0.06);border-radius:6px;transition:all 0.06s linear;box-sizing:border-box;';
  document.documentElement.appendChild(_pickerHighlightEl);

  _pickerInfoEl = document.createElement('div');
  _pickerInfoEl.id = 'pagepilot-picker-info';
  _pickerInfoEl.style.cssText = 'position:fixed;z-index:2147483648;right:12px;top:12px;background:rgba(0,0,0,0.6);color:white;padding:8px 10px;border-radius:8px;font-size:12px;font-weight:600;pointer-events:none;';
  _pickerInfoEl.innerText = 'Click an element to select it • Esc to cancel';
  document.documentElement.appendChild(_pickerInfoEl);

  _pickerMouseMove = (e) => {
    try {
      let target = e.target;
      // avoid highlighting our own highlight/info
      if (!target) return;
      if (target === _pickerHighlightEl || target === _pickerInfoEl) return;
      // prefer a nearby article/post container
      const candidate = target.closest && (target.closest('article, [role="article"], .post, .comment, .reply, .discussion, [data-post]'));
      if (candidate) target = candidate;
      _pickerHovered = target;
      const r = target.getBoundingClientRect();
      _pickerHighlightEl.style.left = `${Math.max(0, r.left)}px`;
      _pickerHighlightEl.style.top = `${Math.max(0, r.top)}px`;
      _pickerHighlightEl.style.width = `${Math.max(4, r.width)}px`;
      _pickerHighlightEl.style.height = `${Math.max(4, r.height)}px`;
    } catch (e) { }
  };

  _pickerClick = (e) => {
    try {
      e.preventDefault(); e.stopPropagation();
      const el = _pickerHovered || e.target;
      if (!el) { stopElementPicker(true); return; }
      const text = (el.innerText || el.textContent || '').trim();
      const html = (el.outerHTML || '').trim();
      const selector = getUniqueSelector(el) || null;
      const author = detectAuthor(el) || 'Unknown';
      const item = { selector, text: text.substring(0, 2000), html: html.substring(0,2000), author, tag: el.tagName };
      sendPickerResults([item]);
      stopElementPicker(false);
    } catch (err) { stopElementPicker(true); }
  };

  _pickerKey = (e) => {
    if (e.key === 'Escape') {
      stopElementPicker(true);
    }
  };

  // capture events early so we can prevent native actions
  document.addEventListener('mousemove', _pickerMouseMove, true);
  document.addEventListener('click', _pickerClick, true);
  document.addEventListener('keydown', _pickerKey, true);
}

function stopElementPicker(cancelled = false) {
  if (!_pickerActive) return;
  _pickerActive = false;
  try { document.removeEventListener('mousemove', _pickerMouseMove, true); } catch (e) {}
  try { document.removeEventListener('click', _pickerClick, true); } catch (e) {}
  try { document.removeEventListener('keydown', _pickerKey, true); } catch (e) {}
  try { if (_pickerHighlightEl && _pickerHighlightEl.parentNode) _pickerHighlightEl.parentNode.removeChild(_pickerHighlightEl); } catch (e) {}
  try { if (_pickerInfoEl && _pickerInfoEl.parentNode) _pickerInfoEl.parentNode.removeChild(_pickerInfoEl); } catch (e) {}
  _pickerHighlightEl = null; _pickerInfoEl = null; _pickerHovered = null; _pickerMouseMove = null; _pickerClick = null; _pickerKey = null;
  if (cancelled) sendPickerCancelled();
}

// Heuristic DOM scan fallback: returns array of candidate post-like elements
function scanForCandidatePosts(limit = 12) {
  const out = [];
  try {
    const selectors = ['article', '[role="article"]', '.post', '.comment', '.reply', '.discussion', '[data-post]', '.yd-post', '.thread'];
    const found = new Set();
    selectors.forEach(s => {
      try { document.querySelectorAll(s).forEach(n => found.add(n)); } catch (e) {}
    });
    // Also look for long text blocks
    document.querySelectorAll('div, p, li').forEach(n => { if ((n.innerText||'').trim().length > 120) found.add(n); });
    const arr = Array.from(found).filter(n => n && n.offsetParent !== null).slice(0, limit);
    arr.forEach(el => {
      try {
        const text = (el.innerText || el.textContent || '').trim();
        if (!text || text.length < 30) return;
        const selector = getUniqueSelector(el);
        const author = detectAuthor(el);
        out.push({ selector, text: text.substring(0, 2000), author });
      } catch (e) { }
    });
  } catch (e) {}
  return out;
}

// Messaging for frame content extraction
withChrome(() => {
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!chrome.runtime?.id) return;
    if (msg.type === 'GET_SCAN_CONTENT' && isVitalSourcePageSafe()) {
      try {
        if (typeof getVitalSourcePageText === 'function') {
          getVitalSourcePageText().then(data => {
            if (chrome.runtime?.id) sendResponse(typeof data === 'object' ? data : { text: data, html: '' });
          }).catch(() => sendResponse({ text: '', html: '' }));
          return true; // Keep channel open for async response
        } else {
          // No page extractor available — respond with empty content
          sendResponse({ text: '', html: '' });
          return false;
        }
      } catch (e) {
        sendResponse({ text: '', html: '' });
        return false;
      }
    }

    // Start/Cancel element picker or request heuristic page posts
    if (msg.action === 'START_ELEMENT_PICK' || msg.type === 'START_ELEMENT_PICK') {
      try {
        startElementPicker();
        sendResponse({ ok: true });
      } catch (e) { sendResponse({ ok: false, error: e && e.message ? e.message : String(e) }); }
      return true;
    }

    if (msg.action === 'CANCEL_ELEMENT_PICK' || msg.type === 'CANCEL_ELEMENT_PICK') {
      try { stopElementPicker(true); sendResponse({ ok: true }); } catch (e) { sendResponse({ ok: false }); }
      return false;
    }

    if (msg.action === 'GET_PAGE_POSTS' || msg.type === 'GET_PAGE_POSTS') {
      try { const posts = scanForCandidatePosts(12); sendResponse({ ok: true, posts }); } catch (e) { sendResponse({ ok: false, posts: [] }); }
      return false;
    }

    // AGENT action: execute a single planner step pushed from UI (ext bridge)
    if (msg.action === 'AGENT_ACTION') {
      const step = msg.step || (() => { const copy = Object.assign({}, msg); delete copy.action; return copy; })();
      (async () => {
        try {
          const res = await executeAgentStep(step);
          sendResponse({ status: 'ok', result: res });
        } catch (err) {
          sendResponse({ status: 'error', message: err.message });
        }
      })();
      return true; // keep channel open for async response
    }

    // Return a diagnostic report collected from the page (includes stored logs via background)
    if (msg.type === 'GET_DIAGNOSTIC_REPORT') {
      if (typeof getDiagnosticReport === 'function') {
        getDiagnosticReport().then(report => {
          if (chrome.runtime?.id) sendResponse(report);
        }).catch(() => sendResponse(null));
        return true;
      } else {
        sendResponse(null);
        return false;
      }
    }

    if (msg.type === 'TOGGLE_SIDEBAR') {
      try {
        // Try to toggle the content-script injected iframe (guaranteed in this scope).
        // If that fails, gracefully try any page-exposed toggles attached to window.
        try {
          toggleInjectedPanel();
        } catch (err) {
          if (typeof window.toggleSidebar === 'function') {
            try { window.toggleSidebar(); } catch (e) { /* ignore */ }
          } else if (typeof window.toggleInjectedPanel === 'function') {
            try { window.toggleInjectedPanel(); } catch (e) { /* ignore */ }
          }
        }
      } catch (e) { /* ignore */ }
    }

      // Agent-driven browser step execution forwarded from the dashboard/sidebar
      if (msg.type === 'AGENT_ACTION') {
        const step = msg.step || {};
        (async () => {
          try {
            const action = (step.type || step.action || '').toUpperCase();
            if (action === 'CLICK') {
              const els = Array.from(document.querySelectorAll(step.selector || ''));
              const el = els.length ? (typeof step.index !== 'undefined' ? els[Number(step.index)] : els[0]) : null;
              if (!el) { sendResponse({ ok: false, error: 'Selector not found', selector: step.selector }); return; }
              try { el.click(); } catch (e) { el.dispatchEvent(new MouseEvent('click', { bubbles: true })); }
              sendResponse({ ok: true });
              return;
            }
            if (action === 'TYPE') {
              const el = document.querySelector(step.selector || '');
              if (!el) { sendResponse({ ok: false, error: 'Selector not found', selector: step.selector }); return; }
              el.focus();
              // set value and emit input/change events
              if ('value' in el) el.value = step.text || step.value || '';
              el.dispatchEvent(new InputEvent('input', { bubbles: true }));
              el.dispatchEvent(new Event('change', { bubbles: true }));
              sendResponse({ ok: true });
              return;
            }
            if (action === 'WAIT') {
              const ms = Number(step.ms) || 300;
              await new Promise(r => setTimeout(r, ms));
              sendResponse({ ok: true });
              return;
            }
            if (action === 'NAVIGATE') {
              if (step.url) {
                window.location.href = step.url;
                sendResponse({ ok: true });
                return;
              }
              sendResponse({ ok: false, error: 'NAVIGATE missing url' });
              return;
            }
            if (action === 'SCROLL') {
              const y = Number(step.y) || (step.percent ? window.innerHeight * (Number(step.percent) / 100) : window.innerHeight);
              window.scrollBy({ top: y, behavior: 'smooth' });
              sendResponse({ ok: true });
              return;
            }
            if (action === 'SUBMIT') {
              const el = document.querySelector(step.selector || '');
              if (!el) { sendResponse({ ok: false, error: 'Selector not found', selector: step.selector }); return; }
              try { if (typeof el.submit === 'function') el.submit(); else el.click(); } catch (e) { try { el.click(); } catch (_) {} }
              sendResponse({ ok: true });
              return;
            }
            if (action === 'MAP') {
              // Read a property from the page and return it
              const el = document.querySelector(step.selector || '');
              if (!el) { sendResponse({ ok: false, error: 'Selector not found', selector: step.selector }); return; }
              const key = step.key || 'innerText';
              const val = (key === 'value' && el.value !== undefined) ? el.value : (el.getAttribute && el.getAttribute(key)) || el[key] || el.innerText || null;
              sendResponse({ ok: true, data: val });
              return;
            }

            sendResponse({ ok: false, error: 'Unknown AGENT action: ' + action });
          } catch (err) {
            sendResponse({ ok: false, error: err && err.message ? err.message : String(err) });
          }
        })();
        return true; // async response
      }
  });
});

function injectSniffer() {
  withChrome(() => {
    const script = document.createElement('script');
    try {
      script.src = chrome.runtime.getURL('src/features/sidebar/metadata-sniffer.js');
      (document.head || document.documentElement).appendChild(script);
    } catch (e) { }
  });
}

// Inject a small page-context script that wraps navigator.serviceWorker.register to capture
// attempts and failures. The content script can't directly override page navigator, so we
// inject a real <script> into the page context that posts messages back to the page script
// listener above.
function injectServiceWorkerLogger() {
  withChrome(() => {
    try {
      if (document.getElementById('pagepilot-sw-logger')) return;
      const s = document.createElement('script');
      s.id = 'pagepilot-sw-logger';
      s.defer = true;
      try {
        s.src = chrome.runtime.getURL('src/page-scripts/pagepilot-sw-logger.js');
      } catch (e) {
        // Fallback to relative path if chrome.runtime is unavailable
        s.src = 'src/page-scripts/pagepilot-sw-logger.js';
      }
      (document.head || document.documentElement).appendChild(s);
    } catch (e) { /* ignore */ }
  });
}

function injectSidebarPanelService() {
  withChrome(() => {
    try {
      if (document.getElementById('dig-sidebar-service-script')) return;
      const script = document.createElement('script');
      script.id = 'dig-sidebar-service-script';
      try { script.src = chrome.runtime.getURL('src/features/sidebar/sidebar-panel.service.js'); } catch (e) { script.src = 'src/features/sidebar/sidebar-panel.service.js'; }
      script.defer = true;
      (document.head || document.documentElement).appendChild(script);
    } catch (e) { /* ignore */ }
  });
}


init();
injectSniffer();
