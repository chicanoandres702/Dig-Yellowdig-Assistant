// Page-context script injected from the extension. Wraps navigator.serviceWorker.register
// to post attempts and errors back to the page (content script listens for messages).
(function(){
  try {
    if (!('serviceWorker' in navigator)) return;
    const orig = navigator.serviceWorker.register;
    if (!orig || orig._pagepilot_wrapped) return;

    navigator.serviceWorker.register = function(scriptURL, options){
      try {
        const p = orig.call(navigator.serviceWorker, scriptURL, options);
        if (p && typeof p.catch === 'function') {
          p.catch(function(err){
            try {
              window.postMessage({ type: 'PAGE_SW_REG_ERROR', url: String(scriptURL), message: err && err.message ? err.message : String(err), stack: err && err.stack ? err.stack : '' }, '*');
            } catch (e) { /* ignore */ }
          });
        }
        try { window.postMessage({ type: 'PAGE_SW_REG_ATTEMPT', url: String(scriptURL) }, '*'); } catch (e) { /* ignore */ }
        return p;
      } catch (e) {
        try { window.postMessage({ type: 'PAGE_SW_REG_ERROR', url: String(scriptURL), message: e && e.message ? e.message : String(e), stack: e && e.stack ? e.stack : '' }, '*'); } catch (__) {}
        throw e;
      }
    };

    navigator.serviceWorker.register._pagepilot_wrapped = true;
  } catch (e) { /* ignore */ }
})();
