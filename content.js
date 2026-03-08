// Global state and buckets
let classBuckets = {};

window.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'DIG_METADATA_SNIFFED') {
    const meta = window.sniffedMetadata;
    if (e.data.url.includes('books.json')) meta.books = e.data.data;
    if (e.data.url.includes('pages.json')) meta.pages = e.data.data;
    digLog(`Metadata sniffed: ${e.data.url.split('/').pop()}`);
  }
});

// Dynamic context helper
function updateContext() {
  const result = detectClassAndWeek();
  window.detectedClass = result.detectedClass;
  window.detectedWeek = result.detectedWeek;
  return result;
}

updateContext();

function init() {
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

// Fallback for popstate
window.addEventListener('popstate', () => {
  lastUrl = location.href;
  updateContext();
  if (typeof refreshSidebar === 'function') refreshSidebar();
});

// Messaging for frame content extraction
if (chrome.runtime?.id) {
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!chrome.runtime?.id) return;
    if (msg.type === 'GET_SCAN_CONTENT' && isVitalSourcePage()) {
      getVitalSourcePageText().then(data => {
        if (chrome.runtime?.id) sendResponse(typeof data === 'object' ? data : { text: data, html: '' });
      });
      return true; // Keep channel open for async response
    }
  });
}

function injectSniffer() {
  if (!chrome.runtime?.id) return;
  const script = document.createElement('script');
  try {
    script.src = chrome.runtime.getURL('src/features/sidebar/metadata-sniffer.js');
    (document.head || document.documentElement).appendChild(script);
  } catch (e) { }
}


init();
injectSniffer();
