(function () {
  if (window.extBridge && typeof window.extBridge.send === 'function') return;
  const isActive = typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.sendMessage === 'function';

  function send(action, payload = {}) {
    return new Promise((resolve) => {
      if (isActive) {
        try {
          chrome.runtime.sendMessage(Object.assign({ action }, payload), (resp) => {
            resolve(typeof resp === 'undefined' ? null : resp);
          });
        } catch (err) {
          resolve({ ok: false, error: err && err.message ? err.message : String(err) });
        }
      } else {
        // Simulated fallback for POC/development
        setTimeout(() => resolve({ status: 'simulated', action, payload }), 250);
      }
    });
  }

  function onMessage(cb) {
    if (isActive && chrome.runtime && chrome.runtime.onMessage) {
      const listener = function (msg, sender, sendResponse) {
        try { cb(msg, sender, sendResponse); } catch (e) { /* swallow */ }
      };
      chrome.runtime.onMessage.addListener(listener);
      return function () { try { chrome.runtime.onMessage.removeListener(listener); } catch (e) {} };
    } else {
      const handler = function (e) { try { cb(e.detail); } catch (err) { /* swallow */ } };
      window.addEventListener('extBridgeMessage', handler);
      return function () { window.removeEventListener('extBridgeMessage', handler); };
    }
  }

  function triggerLocal(msg) {
    try { window.dispatchEvent(new CustomEvent('extBridgeMessage', { detail: msg })); } catch (e) { }
  }

  window.extBridge = { isActive, send, onMessage, triggerLocal };
})();
