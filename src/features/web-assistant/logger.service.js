// Logger service for web-assistant
// Exports: log

export function log(msg, type = '') {
    try {
        if (typeof window !== 'undefined' && window.log && window.log !== log) {
            try {
                // ensure local log buffer exists for diagnostics
                try { window.__ppLogs = window.__ppLogs || []; window.__ppLogs.push({ ts: Date.now(), level: type || 'info', text: String(msg) }); if (window.__ppLogs.length > 2000) window.__ppLogs.shift(); } catch (e) {}
                window.log(msg, type);
                return;
            } catch (e) { /* ignore */ }
        }
    } catch (e) { /* ignore */ }
    // store in an in-memory circular log buffer for debug capture
    try { window.__ppLogs = window.__ppLogs || []; window.__ppLogs.push({ ts: Date.now(), level: type || 'info', text: String(msg) }); if (window.__ppLogs.length > 2000) window.__ppLogs.shift(); } catch (e) {}
    if (typeof console !== 'undefined' && console.log) {
        try { console.log(`[PAGEPILOT] ${msg}`); } catch (e) { /* ignore */ }
    }
}

// Hook native console.* calls to the internal log buffer (best-effort)
(function hookConsole() {
    try {
        if (typeof console !== 'undefined') {
            ['log','info','warn','error'].forEach(level => {
                try {
                    const orig = console[level] && console[level].bind(console);
                    console[level] = function(...args) {
                        try {
                            window.__ppLogs = window.__ppLogs || [];
                            const text = args.map(a => { try { return (typeof a === 'object' ? JSON.stringify(a) : String(a)); } catch (e) { return String(a); } }).join(' ');
                            window.__ppLogs.push({ ts: Date.now(), level: level, text });
                            if (window.__ppLogs.length > 2000) window.__ppLogs.shift();
                        } catch (e) { /* ignore */ }
                        try { if (orig) orig(...args); } catch (e) { /* ignore */ }
                    };
                } catch (e) { /* ignore */ }
            });
        }
    } catch (e) { /* ignore */ }
})();

// Expose as window.log if one isn't present to avoid ReferenceErrors in other scripts
try { if (typeof window !== 'undefined' && !window.log) window.log = log; } catch (e) { /* ignore */ }
