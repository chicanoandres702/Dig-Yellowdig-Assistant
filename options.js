function showStatus(msg, transient = true) {
  const s = document.getElementById('status');
  if (!s) return;
  s.textContent = msg || '';
  if (transient) setTimeout(() => { s.textContent = ''; }, 2500);
}

async function loadKey() {
  const input = document.getElementById('apiKey');
  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['gemini_api_key'], (res) => {
        input.value = (res && res.gemini_api_key) ? res.gemini_api_key : '';
      });
      return;
    }
  } catch (e) { /* fallback */ }
  try { input.value = localStorage.getItem('gemini_api_key') || ''; } catch (e) { input.value = ''; }
}

function saveKey() {
  const v = document.getElementById('apiKey').value.trim();
  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ gemini_api_key: v }, () => {
        showStatus('Saved');
      });
      return;
    }
  } catch (e) { /* fallback */ }
  try { localStorage.setItem('gemini_api_key', v); showStatus('Saved'); } catch (e) { showStatus('Save failed'); }
}

function clearKey() {
  document.getElementById('apiKey').value = '';
  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.remove('gemini_api_key', () => { showStatus('Cleared'); });
      return;
    }
  } catch (e) { /* fallback */ }
  try { localStorage.removeItem('gemini_api_key'); showStatus('Cleared'); } catch (e) { showStatus('Clear failed'); }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('saveBtn').addEventListener('click', saveKey);
  document.getElementById('clearBtn').addEventListener('click', clearKey);
  loadKey();
});
