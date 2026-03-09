/**
 * Draft UI Helpers: Extracted HTML rendering helpers for the Draft Tab.
 */

function renderKBSourceToggles() {
    const kb = getKBSources();
    let html = '<div style="margin-bottom:16px;background:var(--bg-card);padding:12px;border-radius:var(--radius-md);border:var(--glass-border);"><label style="font-size:12px;font-weight:700;color:var(--primary-dark);text-transform:uppercase;letter-spacing:0.05em;">Context Sources</label><p style="font-size:11px;color:var(--text-muted);margin:4px 0 8px;">Select materials to inform your draft.</p>';

    if (kb.length === 0) {
        html += '<p style="font-size:11px;color:#888;">No KB sources yet.</p>';
    } else {
        kb.forEach(src => {
            if (!src.isBook) {
                html += `<label style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text-main);margin:6px 0;cursor:pointer;transition:var(--transition-fast);">
                    <input type="checkbox" class="dig-kb-toggle" data-cls="${escapeHtml(src.cls)}" data-topic="${escapeHtml(src.topic)}" data-shared="${src.shared ? '1' : '0'}" checked style="accent-color:var(--primary);">
                    <span style="opacity:0.9;">${escapeHtml(src.cls)}${src.shared ? ' <small>(shared)</small>' : ''} / <b>${escapeHtml(src.topic)}</b></span> <span style="font-size:10px;color:var(--text-muted);margin-left:auto;">${src.count} items</span></label>`;
            } else {
                html += `<div style="margin:4px 0;padding-left:0;">
                    <label style="display:flex;align-items:center;gap:6px;font-size:11px;color:#334155;cursor:pointer;">
                        <input type="checkbox" class="dig-kb-toggle" data-cls="${escapeHtml(src.cls)}" data-topic="${escapeHtml(src.topic)}" data-shared="${src.shared ? '1' : '0'}" checked style="accent-color:#10b981;">
                        ${escapeHtml(src.cls)}${src.shared ? ' (shared)' : ''} / ${escapeHtml(src.topic)} (book – ${src.count} pages)
                    </label>
                </div>`;
                Object.entries(src.chapters).forEach(([ch, cnt]) => {
                    html += `<label style="display:flex;align-items:center;gap:6px;font-size:11px;color:#334155;margin:2px 0 2px 20px;cursor:pointer;">
                        <input type="checkbox" class="dig-kb-toggle" data-cls="${escapeHtml(src.cls)}" data-topic="${escapeHtml(src.topic)}" data-shared="${src.shared ? '1' : '0'}" data-chapter="${escapeHtml(ch).replace(/"/g, '&quot;')}" checked style="accent-color:#10b981;">
                        ${escapeHtml(ch)} (${cnt})
                    </label>`;
                });
            }
        });
    }
    html += '</div>';
    return html;
}
