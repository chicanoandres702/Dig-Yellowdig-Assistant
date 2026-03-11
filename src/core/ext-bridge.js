// Lightweight ext-bridge wrapper for React app (uses chrome.runtime when available)
const _hasChrome = typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.sendMessage === 'function';

function send(action, payload = {}) {
  return new Promise((resolve) => {
    if (_hasChrome) {
      try {
        chrome.runtime.sendMessage(Object.assign({ action }, payload), (resp) => {
          resolve(typeof resp === 'undefined' ? null : resp);
        });
      } catch (err) { resolve({ ok: false, error: err && err.message ? err.message : String(err) }); }
    } else if (window.extBridge && typeof window.extBridge.send === 'function') {
      return resolve(window.extBridge.send(action, payload));
    } else {
      // simulated fallback for dev
      setTimeout(() => resolve({ status: 'simulated', action, payload }), 200);
    }
  });
}

function onMessage(cb) {
  if (_hasChrome && chrome.runtime && chrome.runtime.onMessage) {
    const listener = (msg, sender, sendResponse) => {
      try { cb(msg, sender, sendResponse); } catch (e) { /* swallow */ }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => { try { chrome.runtime.onMessage.removeListener(listener); } catch (e) {} };
  }

  if (window.extBridge && typeof window.extBridge.onMessage === 'function') {
    return window.extBridge.onMessage(cb);
  }

  // fallback: listen to CustomEvent on window
  const handler = (e) => { try { cb(e.detail); } catch (err) {} };
  window.addEventListener('extBridgeMessage', handler);
  return () => window.removeEventListener('extBridgeMessage', handler);
}

export default {
  isActive: _hasChrome || !!(window.extBridge && window.extBridge.isActive),
  send,
  onMessage
};
