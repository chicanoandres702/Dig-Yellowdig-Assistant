(function () {
  // Simple POC UI to exercise extBridge and background agent flows (Option B)
  const rootId = 'pp-poc-root';
  if (document.getElementById(rootId)) return;

  const root = document.createElement('div');
  root.id = rootId;
  root.style.position = 'fixed';
  root.style.right = '16px';
  root.style.bottom = '80px';
  root.style.width = '320px';
  root.style.maxHeight = '420px';
  root.style.zIndex = 99999;
  root.style.background = 'linear-gradient(180deg,#071027,#0b1624)';
  root.style.border = '1px solid rgba(255,255,255,0.06)';
  root.style.padding = '12px';
  root.style.borderRadius = '12px';
  root.style.boxShadow = '0 8px 30px rgba(0,0,0,0.6)';
  root.style.color = '#e6f0ff';
  root.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
      <div style="font-weight:700">PagePilot POC</div>
      <button id="pp-close" style="background:transparent;border:none;color:#8ea5c4;cursor:pointer">✕</button>
    </div>
    <div style="display:flex;gap:8px;margin-bottom:8px">
      <button id="pp-scan" style="flex:1;padding:8px;border-radius:8px;background:#1b2a42;border:1px solid rgba(255,255,255,0.04);cursor:pointer">Scan</button>
      <button id="pp-pick" style="width:44px;padding:8px;border-radius:8px;background:#172338;border:1px solid rgba(255,255,255,0.04);cursor:pointer">🔍</button>
    </div>
    <div style="display:flex;gap:8px;margin-bottom:8px">
      <button id="pp-draft" style="flex:1;padding:8px;border-radius:8px;background:#1b2a42;border:1px solid rgba(255,255,255,0.04);cursor:pointer">Draft</button>
      <button id="pp-agent" style="flex:1;padding:8px;border-radius:8px;background:#2b4a7a;border:1px solid rgba(255,255,255,0.04);cursor:pointer">Start Agent</button>
    </div>
    <div style="margin-bottom:8px">
      <input id="pp-prompt" placeholder="Agent prompt" style="width:100%;padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.04);background:#031024;color:#e6f0ff;box-sizing:border-box" />
    </div>
    <div style="font-size:0.75rem;color:#8ea5c4;margin-bottom:6px">Session log</div>
    <div id="pp-log" style="font-family:monospace;background:#011026;border-radius:6px;padding:8px;max-height:180px;overflow:auto;border:1px solid rgba(255,255,255,0.03);font-size:12px"></div>
  `;
  document.body.appendChild(root);
  document.getElementById('pp-close').addEventListener('click', () => root.remove());

  const logEl = document.getElementById('pp-log');
  function appendLog(msg) {
    const d = document.createElement('div');
    d.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    logEl.appendChild(d);
    logEl.scrollTop = logEl.scrollHeight;
  }

  // Ensure extBridge exists (ext-bridge.js will create window.extBridge)
  if (!window.extBridge) {
    appendLog('extBridge not present; creating fallback.');
    window.extBridge = {
      isActive: false,
      send(action, payload = {}) { return Promise.resolve({ status: 'simulated', action, payload }); },
      onMessage(cb) { window.addEventListener('pp-ext', (e)=>cb(e.detail)); return () => {}; }
    };
  }

  const btnScan = document.getElementById('pp-scan');
  const btnPick = document.getElementById('pp-pick');
  const btnDraft = document.getElementById('pp-draft');
  const btnAgent = document.getElementById('pp-agent');
  const promptInput = document.getElementById('pp-prompt');

  btnScan.addEventListener('click', () => {
    appendLog('Dispatching do-scan event');
    document.dispatchEvent(new CustomEvent('do-scan'));
  });
  btnPick.addEventListener('click', () => {
    appendLog('Requesting START_ELEMENT_PICK');
    window.extBridge.send('START_ELEMENT_PICK').then(r => appendLog('START_ELEMENT_PICK resp: ' + JSON.stringify(r)));
  });
  btnDraft.addEventListener('click', () => {
    appendLog('Dispatching do-draft event');
    document.dispatchEvent(new CustomEvent('do-draft'));
  });
  btnAgent.addEventListener('click', async () => {
    const prompt = promptInput.value || "Summarize this page and draft an engagement";
    appendLog('Sending START_AGENT_SESSION');
    const cfg = { simulate: true, maxAgentIterations: 3 };
    try {
      const resp = await window.extBridge.send('START_AGENT_SESSION', { prompt, initialPrompt: prompt, generationConfig: cfg });
      appendLog('START_AGENT_SESSION resp: ' + JSON.stringify(resp));
      if (resp && resp.sessionId) appendLog('SessionId: ' + resp.sessionId);
    } catch (e) { appendLog('START_AGENT_SESSION error: ' + (e && e.message ? e.message : String(e)) ); }
  });

  // listen to extBridge messages for AGENT_SESSION_UPDATE etc
  const unsub = window.extBridge.onMessage((msg) => {
    try {
      if (!msg || !msg.action) return;
      if (msg.action === 'AGENT_SESSION_UPDATE') {
        appendLog('AGENT_UPDATE: ' + JSON.stringify(msg.update));
      } else if (msg.action === 'AGENT_SESSION_STARTED') {
        appendLog('AGENT_SESSION_STARTED: ' + JSON.stringify(msg));
      } else {
        appendLog('MSG: ' + JSON.stringify(msg));
      }
    } catch(e) { appendLog('onMessage err: ' + e.message); }
  });
})();
