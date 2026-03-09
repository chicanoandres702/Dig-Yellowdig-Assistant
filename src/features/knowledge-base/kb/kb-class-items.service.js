/**
 * KB Class Items: Renders topics and entries for a selected class, with action buttons.
 * Why: This is the per-class detail view — view, delete, export handlers are all scoped
 * to a single class/topic and are logically separate from the tab header.
 */

function renderKBClassItems(div, kb, cls, root) {
    if (!kb[cls]) { div.innerHTML = '<div style="text-align:center;padding:32px;color:var(--text-muted);font-size:13px;background:var(--bg-panel);border-radius:var(--radius-md);border:var(--glass-border-dashed);">No items for this class.</div>'; return; }
    let html = '';
    Object.keys(kb[cls]).forEach(topic => {
        const items = kb[cls][topic], isBook = items.length > 0 && items[0].type === 'book-page';
        const badge = isBook ? ` <span style="background:var(--sap-700);color:var(--sap-50);padding:3px 8px;border-radius:999px;font-size:9px;font-weight:700;border:1px solid var(--sap-400);">📖 ${items.length} PAGES</span>` : '';
        html += `
        <div class="reflection-card" style="background:var(--glass-1);border:var(--border-glass);border-radius:16px;padding:18px;margin-bottom:16px;position:relative;overflow:hidden;backdrop-filter:blur(20px);">
            <div style="position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg, transparent, hsla(201,70%,60%,0.3), transparent);"></div>
            <h4 style="font-size:12px;font-weight:700;color:var(--sap-50);margin:0 0 14px;display:flex;align-items:center;gap:10px;text-transform:uppercase;letter-spacing:0.08em;opacity:0.9;">
                <span style="color:var(--sap-400);font-size:14px;">📁</span> ${topic}${badge}
            </h4>`;
        if (isBook) {
            html += _buildBookTopicHtml(cls, topic, items);
        } else {
            html += _buildItemListHtml(cls, topic, items);
        }
        html += `</div>`;
    });
    div.innerHTML = html;
    _wireClassItemEvents(div, kb, cls, root);
}

function _buildBookTopicHtml(cls, topic, items) {
    let html = `
    <div style="display:flex;justify-content:space-between;align-items:center;background:var(--glass-1);padding:12px;border-radius:12px;border:var(--border-glass);margin-bottom:14px;">
        <p style="font-size:10px;color:var(--sap-400);font-family:var(--font-mono);margin:0;">Book capture active</p>
        <div style="display:flex;gap:6px;align-items:center;">
            <button class="dig-kb-view-book save-btn" data-cls="${cls}" data-topic="${topic}" style="padding:4px 10px;font-size:9px;">VIEW</button>
            <button class="dig-kb-export-html save-btn" data-cls="${cls}" data-topic="${topic}" style="padding:4px 10px;font-size:9px;">HTML</button>
            <button class="dig-kb-export save-btn" data-cls="${cls}" data-topic="${topic}" style="padding:4px 10px;font-size:9px;">PDF</button>
            <button class="dig-kb-delete-book save-btn" data-cls="${cls}" data-topic="${topic}" style="padding:4px 10px;font-size:9px;background:hsla(0,70%,30%,0.3);border-color:hsla(0,70%,50%,0.4);color:hsla(0,70%,80%,0.8);">DEL</button>
        </div>
    </div>`;
    const chapters = {};
    items.forEach(item => { const ch = item.chapter || 'Unknown'; chapters[ch] = (chapters[ch] || 0) + 1; });
    Object.keys(chapters).forEach(ch => {
        html += `<div style="font-size:11px;color:var(--text-main);opacity:0.8;padding:4px 12px;margin:2px 0 2px 24px;border-left:2px solid var(--primary-glow);display:flex;justify-content:space-between;">
            <span>${ch}</span>
            <span style="font-weight:700;color:var(--text-muted);">${chapters[ch]} PGS</span>
        </div>`;
    });
    return html;
}

function _buildItemListHtml(cls, topic, items) {
    let html = '<div style="display:flex;flex-direction:column;gap:8px;padding-left:4px;">';
    items.forEach((item, idx) => {
        html += `
        <div style="display:flex;align-items:center;background:var(--glass-1);padding:12px;border-radius:12px;border:var(--border-glass);transition:all 200ms var(--ease-out-quint);">
            <p style="flex:1;font-size:12px;line-height:1.5;margin:0 14px 0 0;color:var(--sap-100);opacity:0.85;">${escapeHtml(item.text.substring(0, 80))}...</p>
            <div style="display:flex;gap:6px;">
                <button class="dig-kb-view save-btn" data-cls="${cls}" data-topic="${topic}" data-idx="${idx}" style="padding:4px 10px;font-size:9px;">VIEW</button>
                <button class="dig-kb-delete save-btn" data-cls="${cls}" data-topic="${topic}" data-idx="${idx}" style="padding:4px 6px;font-size:9px;background:hsla(0,70%,30%,0.2);border-color:hsla(0,70%,50%,0.2);color:hsla(0,70%,80%,0.6);">×</button>
            </div>
        </div>`;
    });
    html += '</div>';
    return html;
}
