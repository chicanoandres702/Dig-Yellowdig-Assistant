import { extBridge } from './bridge.service.js';
import { log } from './logger.service.js';

// Collect diagnostic bundle (sidebar + background logs + recent scan state) and download as JSON
export async function collectDebugBundleAndDownload() {
    try {
        const bundle = { ts: Date.now(), userAgent: (typeof navigator !== 'undefined' ? navigator.userAgent : 'n/a'), version: (typeof APP_VERSION !== 'undefined' ? APP_VERSION : null) };

        // Sidebar logs and state
        try { bundle.sidebarLogs = (window.__ppLogs || []).slice(-2000); } catch (e) { bundle.sidebarLogs = []; }
        try { bundle.lastDetectedPosts = window._lastDetectedPosts || []; bundle.lastDetectedAt = window._lastDetectedAt || null; } catch (e) { bundle.lastDetectedPosts = []; }
        try { bundle.lastPagePosts = window._lastPagePosts || []; bundle.lastPagePostsAt = window._lastPagePostsAt || null; } catch (e) { bundle.lastPagePosts = []; }
        try { bundle.autoScan = { active: !!window._autoScanActive, lastRun: window._lastAutoScanRun || null, lastResp: window._lastAutoScanResp || null }; } catch (e) { bundle.autoScan = {}; }

        // Background/service-worker logs (use runtime message to request them)
        try {
            bundle.serviceWorkerLogs = await new Promise((resolve) => {
                try {
                    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
                        chrome.runtime.sendMessage({ type: 'GET_DEBUG_LOGS' }, (resp) => {
                            try { resolve(resp || []); } catch (e) { resolve([]); }
                        });
                    } else {
                        resolve([]);
                    }
                } catch (e) { resolve([]); }
            });
        } catch (e) { bundle.serviceWorkerLogs = []; }

        // Ping extension bridge for status
        try {
            let ping = null;
            try {
                if (extBridge) {
                    if (extBridge.sendSafe) ping = await extBridge.sendSafe('PING');
                    else ping = await extBridge.send('PING');
                } else {
                    ping = { ok: false, error: 'no_ext_bridge' };
                }
            } catch (e) { ping = { ok: false, error: (e && e.message) ? e.message : String(e) }; }
            bundle.bridgePing = ping;
        } catch (e) { bundle.bridgePing = { ok: false, error: (e && e.message) ? e.message : String(e) }; }

        // Create download
        const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `pagepilot_debug_${Date.now()}.json`; document.body.appendChild(a); a.click(); setTimeout(() => { try { URL.revokeObjectURL(a.href); a.remove(); } catch (e) {} }, 5000);
        return bundle;
    } catch (e) {
        log('[DEBUG] collect failed: ' + (e && e.message ? e.message : String(e)), 'log-err');
        return null;
    }
}

// Make available from console
try { window.collectDebugBundleAndDownload = collectDebugBundleAndDownload; } catch (e) {}

export async function checkExtensionBridgeStatus() {
    try {
        const el = document.getElementById('extStatus');

        // If no extension runtime namespace is available, treat as standalone.
        if (!extBridge || !extBridge.isActive) {
            try { if (extBridge) extBridge.isActive = false; } catch (e) {}
            if (el) el.innerHTML = '<span class="badge badge-yd">STANDALONE</span>';
            return;
        }

        // Ping the background to determine connectivity (with timeout)
        const resp = await (extBridge.sendSafe ? extBridge.sendSafe('PING') : extBridge.send('PING'));
        try { if (extBridge) extBridge.isActive = !!(resp && resp.ok); } catch (e) {}
        if (resp && resp.ok) {
            if (el) el.innerHTML = '<span class="badge badge-completed">LINKED</span>';
            log(`[BRIDGE] Connected to background (id=${resp.extensionId || 'n/a'})`, 'log-sys');
            try { if (typeof renderCoreModules === 'function') renderCoreModules(); } catch (e) {}
        } else {
            if (el) el.innerHTML = '<span class="badge badge-yd">NO RESPONSE</span>';
            log('[BRIDGE] No response from background', 'log-warn');
            try { if (typeof renderCoreModules === 'function') renderCoreModules(); } catch (e) {}
        }
    } catch (e) {
        try { const el = document.getElementById('extStatus'); if (el) el.innerHTML = '<span class="badge badge-yd">NO CONNECT</span>'; } catch (_) {}
        log('[BRIDGE] Check failed: ' + (e && e.message ? e.message : String(e)), 'log-err');
        try { if (typeof renderCoreModules === 'function') renderCoreModules(); } catch (e) {}
    }
}

// Diagnostics: report service-worker registration/ready attempts and failures back to background
export function _reportSwEvent(obj) {
    try {
        const msg = `[SW] ${obj.event || 'event'} url=${obj.url || ''} msg=${obj.message || ''}`;
        if (typeof console !== 'undefined' && console.warn) console.warn(msg);
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
            try { chrome.runtime.sendMessage({ type: 'DIG_DEBUG_LOG', log: msg }); } catch (e) { /* ignore */ }
        }
    } catch (e) { /* ignore */ }
}

try {
    if (typeof navigator !== 'undefined' && navigator.serviceWorker) {
        const sw = navigator.serviceWorker;
        const origRegister = sw.register && sw.register.bind(sw);
        if (origRegister && !origRegister._pagepilot_wrap) {
            navigator.serviceWorker.register = async function(scriptURL, options) {
                _reportSwEvent({ event: 'register_attempt', url: String(scriptURL) });
                try {
                    const reg = await origRegister(scriptURL, options);
                    _reportSwEvent({ event: 'register_success', url: String(scriptURL) });
                    return reg;
                } catch (err) {
                    _reportSwEvent({ event: 'register_error', url: String(scriptURL), message: err && err.message ? err.message : String(err) });
                    throw err;
                }
            };
            navigator.serviceWorker.register._pagepilot_wrap = true;
        }
    }
} catch (e) { /* ignore instrumentation failures */ }

// Expose report function globally as well
try { window._reportSwEvent = _reportSwEvent; } catch (e) {}

// Expose check function
try { window.checkExtensionBridgeStatus = checkExtensionBridgeStatus; } catch (e) {}
