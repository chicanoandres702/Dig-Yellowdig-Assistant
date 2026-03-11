/* Minimal agent simulator stub
   Exports runSimAgentSession(opts) used when simulation mode is requested.
*/

export async function runSimAgentSession(opts = {}) {
  console.warn('[agent.simulator] runSimAgentSession stub invoked');
  const { initialPrompt = '', sessionId } = opts || {};
  await new Promise(r => setTimeout(r, 120));
  return { ok: true, text: `Simulated (dry-run) agent output for prompt: ${String(initialPrompt).slice(0,240)}` };
}
