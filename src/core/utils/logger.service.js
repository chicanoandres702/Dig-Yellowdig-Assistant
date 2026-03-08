/**
 * Logger Service: Centralized logging for cross-frame diagnostics.
 */
function digLog(msg, data = null) {
    const log = {
        ts: new Date().toLocaleTimeString(),
        url: window.location.href,
        msg,
        data: data ? JSON.parse(JSON.stringify(data)) : null
    };
    chrome.runtime.sendMessage({ type: 'DIG_DEBUG_LOG', log });
    console.log(`[Dig Assistant] ${msg}`, data || '');
}

async function getDiagnosticReport() {
    const report = {
        timestamp: new Date().toISOString(),
        topUrl: window.location.href,
        userAgent: navigator.userAgent,
        customSelector: localStorage.getItem('dig_custom_reader_selector'),
        logs: await new Promise(res => chrome.runtime.sendMessage({ type: 'GET_DEBUG_LOGS' }, res))
    };
    return JSON.stringify(report, null, 2);
}
