/**
 * Debug Tab: Live diagnostic logs and state reporting for troubleshooting.
 */
function renderDebugTab(container) {
    container.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:10px;height:100%;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <h3 style="margin:0;font-size:14px;color:${DARK_COLOR};">Diagnostic Logs</h3>
                <button id="dig-debug-copy" style="background:${PRIMARY_COLOR};color:white;border:none;border-radius:4px;padding:4px 8px;cursor:pointer;font-size:10px;">📋 Copy for AI</button>
            </div>
            <div id="dig-debug-terminal" style="flex:1;background:#1e293b;color:#38bdf8;padding:8px;border-radius:6px;font-family:monospace;font-size:10px;overflow-y:auto;white-space:pre-wrap;border:1px solid #334155;">
                <i>Initializing live stream...</i>
            </div>
            <button id="dig-debug-clear" style="background:#f1f5f9;color:#475569;border:1px solid #e2e8f0;border-radius:4px;padding:4px;cursor:pointer;font-size:10px;">🗑️ Clear Logs</button>
        </div>
    `;

    const terminal = document.getElementById('dig-debug-terminal');
    const updateLogs = (logs) => {
        terminal.innerHTML = logs.map(l => `[${l.ts}] [${l.url.split('/').pop()}] ${l.msg}`).join('\n') || '<i>No logs captured.</i>';
        terminal.scrollTop = terminal.scrollHeight;
    };

    chrome.runtime.sendMessage({ type: 'GET_DEBUG_LOGS' }, updateLogs);

    // Listen for new logs while tab is open
    const listener = (msg) => { if (msg.type === 'NEW_LOG_EVENT') chrome.runtime.sendMessage({ type: 'GET_DEBUG_LOGS' }, updateLogs); };
    chrome.runtime.onMessage.addListener(listener);

    document.getElementById('dig-debug-copy').onclick = async () => {
        const report = await getDiagnosticReport();
        navigator.clipboard.writeText(report);
        const btn = document.getElementById('dig-debug-copy');
        btn.innerText = '✅ Copied!';
        setTimeout(() => btn.innerText = '📋 Copy for AI', 2000);
    };

    document.getElementById('dig-debug-clear').onclick = () => {
        // Clearing logic would require a background msg, but for now we just clear view
        terminal.innerHTML = '<i>Logs cleared (locally).</i>';
    };
}
