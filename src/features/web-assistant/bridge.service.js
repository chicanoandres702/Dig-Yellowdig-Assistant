// Cross-browser extension bridge service
// Exports: extBridge

const _EXT_API = (function() {
    try { if (typeof browser !== 'undefined' && browser.runtime && browser.runtime.sendMessage) return { ns: 'browser', api: browser }; } catch (e) {}
    try { if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) return { ns: 'chrome', api: chrome }; } catch (e) {}
    return null;
})();

export const extBridge = {
    isActive: !!_EXT_API,
    isEdge: (typeof navigator !== 'undefined') ? (/\bEdg\//i.test(navigator.userAgent)) : false,

    send: function(action, payload = {}, timeoutMs = 2000) {
        return new Promise((resolve) => {
            const tms = Number(timeoutMs) || 2000;
            if (!_EXT_API) {
                // Simulated offline response for standalone mode
                return setTimeout(() => resolve({ ok: false, error: 'no_runtime' }), 150);
            }

            let completed = false;

            // Safe send wrapper: retry once on transient timeout/error (useful for Edge/offline flakiness)
            extBridge.sendSafe = async function(action, payload = {}, timeoutMs = 2000, attempts = 2) {
                let lastErr = null;
                for (let i = 0; i < (attempts || 1); i++) {
                    try {
                        const resp = await this.send(action, payload, timeoutMs * (1 + i));
                        if (resp && resp.ok) return resp;
                        lastErr = resp;
                    } catch (e) { lastErr = e; }
                    // small backoff before retrying
                    await new Promise(r => setTimeout(r, 120 * (i+1)));
                }
                return (lastErr && lastErr.ok === false) ? lastErr : { ok: false, error: (lastErr && (lastErr.error || lastErr.message)) || 'send_failed' };
            };

            const timer = setTimeout(() => {
                if (completed) return;
                completed = true;
                try { this.isActive = false; } catch (e) {}
                resolve({ ok: false, error: 'timeout' });
            }, tms);

            try {
                if (_EXT_API.ns === 'browser') {
                    _EXT_API.api.runtime.sendMessage({ action, ...payload }).then((response) => {
                        if (completed) return;
                        completed = true; clearTimeout(timer);
                        try { this.isActive = true; } catch (e) {}
                        resolve(response || { ok: true, extensionId: (_EXT_API.api.runtime && _EXT_API.api.runtime.id) ? _EXT_API.api.runtime.id : null });
                    }).catch((err) => {
                        if (completed) return;
                        completed = true; clearTimeout(timer);
                        try { this.isActive = false; } catch (e) {}
                        resolve({ ok: false, error: err && err.message ? err.message : String(err) });
                    });
                } else {
                    _EXT_API.api.runtime.sendMessage({ action, ...payload }, (response) => {
                        if (completed) return;
                        completed = true; clearTimeout(timer);
                        try {
                            const err = _EXT_API.api.runtime.lastError;
                            if (err) { try { this.isActive = false; } catch (e) {} ; return resolve({ ok: false, error: err.message }); }
                        } catch (e) { /* ignore */ }
                        try { this.isActive = true; } catch (e) {}
                        resolve(response || { ok: true, extensionId: (_EXT_API.api.runtime && _EXT_API.api.runtime.id) ? _EXT_API.api.runtime.id : null });
                    });
                }
            } catch (e) {
                if (!completed) { completed = true; clearTimeout(timer); try { this.isActive = false; } catch (er) {} resolve({ ok: false, error: e && e.message ? e.message : String(e) }); }
            }
        });
    }
};
