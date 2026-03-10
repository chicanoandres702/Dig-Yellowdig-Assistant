// Drafts / Iterations UI helpers (extracted from web-assistant.js)
// Keeps a tiny, focused helper for seeding the UI when no cloud iterations are present.
export function populateLocalIterationsUI() {
    try {
        const container = document.getElementById('feedIterationsContainer');
        if (!container) return;
        const html = `
            <div class="item-card">
                <span class="item-title">Production Environment Scan</span>
                <div class="item-meta"><span>v2.4.0</span><span class="badge badge-offline">OFFLINE</span></div>
            </div>
            <div class="item-card">
                <span class="item-title">Security Sniffer Pro</span>
                <div class="item-meta"><span>v1.0.2</span><span class="badge badge-completed">COMPLETED</span></div>
            </div>
            <div style="font-size:0.65rem; color:var(--text-muted); margin-top:8px;">(Offline mode — connect Firebase to enable realtime sync)</div>
        `;
        container.innerHTML = html;
    } catch (e) { console.warn('populateLocalIterationsUI error', e); }
}

// Backwards compatibility: expose on window if present
try { if (typeof window !== 'undefined') window.populateLocalIterationsUI = populateLocalIterationsUI; } catch (e) {}
