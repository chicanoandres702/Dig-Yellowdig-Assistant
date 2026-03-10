// Minimal simulator stub for agent sessions. Returns a quick simulated result.
export async function runSimAgentSession(options = {}) {
  try {
    const sessionId = options.sessionId || ('sim_' + Date.now());
    // Optionally notify background about simulated start
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ action: 'AGENT_SESSION_UPDATE', update: { sessionId, type: 'iteration_start', iteration: 0 } });
      }
    } catch (e) { /* ignore */ }
    return { ok: true, simulated: true, sessionId, final: 'Simulated agent run (simulator stub)' };
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
}
