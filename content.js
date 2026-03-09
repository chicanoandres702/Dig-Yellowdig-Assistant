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
  const result = detectClassAndWeek();
  window.detectedClass = result.detectedClass;
  window.detectedWeek = result.detectedWeek;

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
  initContextMenuHandler();
  updateContext();
  if (!classBuckets[window.detectedClass]) classBuckets[window.detectedClass] = {};
  if (!classBuckets[window.detectedClass][window.detectedWeek]) {
    classBuckets[window.detectedClass][window.detectedWeek] = {
      posts: [], homework: [], notes: [], stickyNotes: []
    };
  }

  // Initialize the sidebar panel (replaces old toolbar)
  createSidebar();

  // Persist class for Yellowdig cross-reference
  if (detectedClass && detectedClass !== 'Unknown Class') {
    localStorage.setItem('dig_last_class', detectedClass);
  }


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

// VitalSource page content observer – automatically report text when reader DOM mutates
if (isVitalSourcePage()) {
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

// Messaging for frame content extraction
withChrome(() => {
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!chrome.runtime?.id) return;
    if (msg.type === 'GET_SCAN_CONTENT' && isVitalSourcePage()) {
      getVitalSourcePageText().then(data => {
        if (chrome.runtime?.id) sendResponse(typeof data === 'object' ? data : { text: data, html: '' });
      });
      return true; // Keep channel open for async response
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
      if (typeof toggleSidebar === 'function') {
        toggleSidebar();
      }
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


init();
injectSniffer();
