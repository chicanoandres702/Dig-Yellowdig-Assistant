/**
 * Debug Tab: Live diagnostic logs and state reporting for troubleshooting.
 */
function renderDebugTab(container) {
    container.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:16px;height:100%;padding:4px;">
            <div style="display:flex;justify-content:space-between;align-items:center;background:var(--bg-card);padding:12px;border-radius:var(--radius-md);border:var(--glass-border);box-shadow:var(--shadow-sm);">
                <div style="display:flex;flex-direction:column;gap:2px;">
                    <h3 style="margin:0;font-size:15px;font-weight:800;color:var(--text-main);display:flex;align-items:center;gap:8px;"><span style="color:var(--danger);">⚡</span> Diagnostics</h3>
                    <span style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">Live System Stream</span>
                </div>
                <button id="dig-debug-copy" class="btn btn-primary" style="padding:6px 12px;font-size:11px;">📋 Copy Report</button>
            </div>
            
            <div id="dig-debug-terminal" style="flex:1;background:rgba(15, 23, 42, 0.95);color:#10b981;padding:16px;border-radius:var(--radius-md);font-family:'JetBrains Mono', 'Fira Code', monospace;font-size:11px;overflow-y:auto;white-space:pre-wrap;border:1px solid rgba(255,255,255,0.1);box-shadow:inset 0 4px 12px rgba(0,0,0,0.5);line-height:1.5;">
                <i style="color:var(--text-muted);opacity:0.6;">Initializing live stream...</i>
            </div>
            
            <div style="display:flex;gap:8px;">
                <button id="dig-debug-clear" style="flex:1;background:var(--bg-card);color:var(--text-muted);border:var(--glass-border);border-radius:var(--radius-sm);padding:8px;cursor:pointer;font-size:12px;font-weight:600;transition:var(--transition-fast);">🗑️ Clear View</button>
            </div>
        </div>
    `;

    const terminal = document.getElementById('dig-debug-terminal');
    const updateLogs = (logs) => {
        terminal.innerHTML = logs.map(l => `<span style="color:var(--text-muted);opacity:0.5;">[${l.ts}]</span> <span style="color:var(--accent);font-weight:600;">[${l.url.split('/').pop()}]</span> ${l.msg}`).join('\n') || '<i style="color:var(--text-muted);opacity:0.6;">No logs captured.</i>';
        terminal.scrollTop = terminal.scrollHeight;
    };

    if (chrome.runtime?.id) {
        chrome.runtime.sendMessage({ type: 'GET_DEBUG_LOGS' }, updateLogs);
    }

    const listener = (msg) => {
        if (!chrome.runtime?.id) return;
        if (msg.type === 'NEW_LOG_EVENT') {
            chrome.runtime.sendMessage({ type: 'GET_DEBUG_LOGS' }, updateLogs);
        }
    };
    if (chrome.runtime?.id) chrome.runtime.onMessage.addListener(listener);

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
