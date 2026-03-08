document.addEventListener('DOMContentLoaded', function() {
    const keyInput = document.getElementById('apiKey');
    const apiSelect = document.getElementById('apiSelect');
    const saveBtn = document.getElementById('saveBtn');
    const streamUrlInput = document.getElementById('streamUrl');
    const toggleStreamBtn = document.getElementById('toggleStreamBtn');
    const downloadLogsBtn = document.getElementById('downloadLogsBtn');
    const getPageReportBtn = document.getElementById('getPageReportBtn');
    const copyDiagBtn = document.getElementById('copyDiagBtn');
    const clearLogsBtn = document.getElementById('clearLogsBtn');

    chrome.storage.local.get(['gemini_api_key', 'dig_ai_backend'], (result) => {
        if (result.gemini_api_key) keyInput.value = result.gemini_api_key;
        if (result.dig_ai_backend) apiSelect.value = result.dig_ai_backend;
    });

    saveBtn.onclick = () => {
        chrome.storage.local.set({
            gemini_api_key: keyInput.value,
            dig_ai_backend: apiSelect.value
        }, () => {
            saveBtn.innerText = "Saved!";
            setTimeout(() => { saveBtn.innerText = "Save Settings"; }, 2000);
        });
    };

    // Diagnostics: load current forwarding settings
    chrome.storage.local.get(['dig_log_forwarding_enabled', 'dig_log_forwarding_url'], (res) => {
        if (res && res.dig_log_forwarding_url) streamUrlInput.value = res.dig_log_forwarding_url;
        toggleStreamBtn.innerText = (res && res.dig_log_forwarding_enabled) ? 'Stop Streaming Logs' : 'Start Streaming Logs';
    });

    toggleStreamBtn.onclick = () => {
        chrome.storage.local.get(['dig_log_forwarding_enabled'], (res) => {
            const currently = res && res.dig_log_forwarding_enabled;
            const enable = !currently;
            const url = streamUrlInput.value && streamUrlInput.value.trim();
            if (enable && !url) {
                alert('Enter a Stream URL before starting streaming.');
                return;
            }
            chrome.storage.local.set({ dig_log_forwarding_enabled: enable, dig_log_forwarding_url: url }, () => {
                toggleStreamBtn.innerText = enable ? 'Stop Streaming Logs' : 'Start Streaming Logs';
            });
        });
    };

    downloadLogsBtn.onclick = () => {
        chrome.runtime.sendMessage({ type: 'GET_DEBUG_LOGS' }, (logs) => {
            const payload = { timestamp: new Date().toISOString(), logs };
            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `dig-diagnostics-${new Date().toISOString().replace(/[:.]/g,'-')}.json`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        });
    };

    copyDiagBtn.onclick = () => {
        chrome.runtime.sendMessage({ type: 'GET_DEBUG_LOGS' }, (logs) => {
            const payload = { timestamp: new Date().toISOString(), logs };
            const text = JSON.stringify(payload, null, 2);
            navigator.clipboard.writeText(text).then(() => {
                copyDiagBtn.innerText = 'Copied!';
                setTimeout(() => { copyDiagBtn.innerText = 'Copy Diagnostics'; }, 2000);
            }).catch(() => { alert('Copy failed'); });
        });
    };

    clearLogsBtn.onclick = () => {
        chrome.runtime.sendMessage({ type: 'CLEAR_DEBUG_LOGS' }, (res) => {
            clearLogsBtn.innerText = 'Cleared';
            setTimeout(() => { clearLogsBtn.innerText = 'Clear Logs'; }, 1500);
        });
    };

    getPageReportBtn && (getPageReportBtn.onclick = () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs || !tabs[0] || !tabs[0].id) return alert('No active tab');
            chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_DIAGNOSTIC_REPORT' }, (report) => {
                if (!report) return alert('No diagnostic report available for this page');
                const blob = new Blob([report], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `dig-page-report-${new Date().toISOString().replace(/[:.]/g,'-')}.json`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
            });
        });
    });
});
