/* Improved agent engine stub for development
   - Emits multiple AGENT_SESSION_UPDATE events (iteration_start, model_response,
     tool_call, tool_result, complete) so the UI can display progress.
   - Optionally attempts to execute tool steps in the active tab when a tabId is
     provided via opts.tabId.
*/

export async function runAgentSession(opts = {}) {
  console.warn('[agent.engine] runAgentSession stub invoked', opts && opts.sessionId);
  const { initialPrompt = '', sessionId, tabId, generationConfig = {}, shouldCancel } = opts || {};

  const maxIters = Number(generationConfig.maxAgentIterations || 3);

  for (let i = 1; i <= maxIters; i++) {
    try {
      if (typeof shouldCancel === 'function' && shouldCancel()) {
        try { if (sessionId) chrome.runtime.sendMessage({ action: 'AGENT_SESSION_UPDATE', update: { sessionId, type: 'cancelled', reason: 'user_cancel' } }); } catch (e) {}
        return { ok: false, cancelled: true, reason: 'user_cancel' };
      }

      // iteration start
      try { if (sessionId) chrome.runtime.sendMessage({ action: 'AGENT_SESSION_UPDATE', update: { sessionId, type: 'iteration_start', iteration: i, ts: Date.now() } }); } catch (e) {}
      await new Promise(r => setTimeout(r, 400 + Math.random() * 400));

      // model response (simulated)
      const thought = `Simulated thought #${i} — considering prompt fragment: ${String(initialPrompt).slice(0,60)}`;
      const modelText = `Simulated model text #${i}: concise reasoning step.`;
      try { if (sessionId) chrome.runtime.sendMessage({ action: 'AGENT_SESSION_UPDATE', update: { sessionId, type: 'model_response', iteration: i, summary: { thought, text: modelText } } }); } catch (e) {}
      await new Promise(r => setTimeout(r, 300 + Math.random() * 400));

      // optionally emit a tool call and execute it in the active tab if provided
      if (Math.random() < 0.9) {
        const step = { type: 'CLICK', selector: 'button.next', index: 0 };
        try { if (sessionId) chrome.runtime.sendMessage({ action: 'AGENT_SESSION_UPDATE', update: { sessionId, type: 'tool_call', tool: 'CLICK', step } }); } catch (e) {}

        if (tabId && typeof chrome?.tabs?.sendMessage === 'function') {
          try {
            const res = await new Promise((resolve) => {
              try {
                chrome.tabs.sendMessage(tabId, { type: 'AGENT_ACTION', step }, (r) => {
                  if (chrome.runtime && chrome.runtime.lastError) return resolve({ ok: false, error: chrome.runtime.lastError.message });
                  resolve(r || { ok: true });
                });
              } catch (e) { resolve({ ok: false, error: e && e.message ? e.message : String(e) }); }
            });
            try { if (sessionId) chrome.runtime.sendMessage({ action: 'AGENT_SESSION_UPDATE', update: { sessionId, type: 'tool_result', tool: 'CLICK', result: res } }); } catch (e) {}
          } catch (e) { try { if (sessionId) chrome.runtime.sendMessage({ action: 'AGENT_SESSION_UPDATE', update: { sessionId, type: 'tool_result', tool: 'CLICK', result: { ok: false, error: (e && e.message) ? e.message : String(e) } } }); } catch (_) {} }
        } else {
          try { if (sessionId) chrome.runtime.sendMessage({ action: 'AGENT_SESSION_UPDATE', update: { sessionId, type: 'tool_result', tool: 'CLICK', result: { ok: true, simulated: true } } }); } catch (e) {}
        }
      }
    } catch (e) {
      try { if (sessionId) chrome.runtime.sendMessage({ action: 'AGENT_SESSION_UPDATE', update: { sessionId, type: 'error', error: e && e.message ? e.message : String(e) } }); } catch (_) {}
      return { ok: false, error: e && e.message ? e.message : String(e) };
    }
  }

  const final = `Simulated final answer: ${String(initialPrompt).slice(0,200)}...`;
  try { if (sessionId) chrome.runtime.sendMessage({ action: 'AGENT_SESSION_UPDATE', update: { sessionId, type: 'complete', final } }); } catch (e) {}
  return { ok: true, final };
}
