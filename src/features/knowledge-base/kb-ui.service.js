/**
 * Knowledge Base UI: Rendering logic for stored content.
 */
function renderKnowledgeTab(container) {
    let kb = {};
    try { kb = JSON.parse(localStorage.getItem('digKnowledgeBase') || '{}'); } catch (e) { kb = {}; }
    const classes = Object.keys(kb);
    if (!classes.length) {
        container.innerHTML = `<div style="text-align:center;padding:40px;color:#666;"><div style="font-size:32px;">📚</div><p>No knowledge saved yet.</p></div>`;
        return;
    }
    let html = `<div style="display:flex;gap:4px;margin-bottom:12px;flex-wrap:wrap;">`;
    classes.forEach(cls => {
        const active = cls === detectedClass ? `background:${PRIMARY_COLOR};color:white;` : 'background:#f1f5f9;color:#334155;';
        html += `<button class="dig-kb-class-tab" data-cls="${cls}" style="border:none;border-radius:4px;padding:4px 10px;cursor:pointer;font-size:11px;${active}">${cls}</button>`;
    });
    html += '</div><div id="dig-kb-items"></div>';
    container.innerHTML = html;
    renderKBClassItems(document.getElementById('dig-kb-items'), kb, detectedClass, container);
    container.querySelectorAll('.dig-kb-class-tab').forEach(btn => {
        btn.onclick = () => renderKBClassItems(document.getElementById('dig-kb-items'), kb, btn.dataset.cls, container);
    });
}


// when the built‑in PDF exporter fails we fall back to HTML -> print
function _fallbackExportAsHtml(title, contentArray) {
    exportToHTML(title, contentArray);
    alert('Downloaded HTML; open it and use the browser\'s print dialog (File → Print) to save as a PDF.');
}

function renderKBClassItems(div, kb, cls, root) {
    if (!kb[cls]) { div.innerHTML = '<p style="color:#888;font-size:12px;">No items for this class.</p>'; return; }
    let html = '';
    Object.keys(kb[cls]).forEach(topic => {
        const items = kb[cls][topic], isBook = items.length > 0 && items[0].type === 'book-page';
        const badge = isBook ? ` <span style="background:#3b82f6;color:white;padding:1px 5px;border-radius:3px;font-size:9px;">📖 ${items.length} pages</span>` : '';
        html += `<h4 style="font-size:12px;color:${PRIMARY_COLOR};margin:8px 0 4px;">${topic}${badge}</h4>`;
        if (isBook) {
            html += `<div style="display:flex;justify-content:space-between;align-items:center;padding-left:14px;margin-bottom:8px;">
                <p style="font-size:11px;color:#666;margin:0;">Captured ${items.length} pages</p>
                <div style="display:flex;gap:4px;">
                    <button class="dig-kb-export-html" data-cls="${cls}" data-topic="${topic}" style="background:#3b82f6;color:white;border:none;border-radius:4px;padding:4px 8px;font-size:10px;cursor:pointer;">📥 HTML</button>
                    <button class="dig-kb-export" data-cls="${cls}" data-topic="${topic}" style="background:${PRIMARY_COLOR};color:white;border:none;border-radius:4px;padding:4px 8px;font-size:10px;cursor:pointer;">📥 PDF</button>
                    <button class="dig-kb-delete-book" data-cls="${cls}" data-topic="${topic}" style="background:#ef4444;color:white;border:none;border-radius:4px;padding:4px 8px;font-size:10px;cursor:pointer;">🗑️ Delete</button>
                </div></div>`;
            const chapters = {};
            items.forEach(item => { const ch = item.chapter || 'Unknown'; chapters[ch] = (chapters[ch] || 0) + 1; });
            Object.keys(chapters).forEach(ch => { html += `<p style="font-size:11px;color:#475569;padding-left:24px;margin:2px 0;">• ${ch} (${chapters[ch]} pages)</p>`; });
        } else {
            html += '<ul style="padding-left:14px;margin:0;">';
            items.forEach((item, idx) => {
                html += `<li style="font-size:12px;line-height:1.4;margin-bottom:6px;color:#475569;">${item.text.substring(0, 100)}...
                <button class="dig-kb-delete" data-cls="${cls}" data-topic="${topic}" data-idx="${idx}" style="background:#ef4444;color:white;border:none;border-radius:3px;padding:1px 6px;cursor:pointer;font-size:10px;">✕</button></li>`;
            });
            html += '</ul>';
        }
    });
    div.innerHTML = html;
    div.querySelectorAll('.dig-kb-export').forEach(btn => {
        btn.onclick = async () => {
            // PDF generation can take a while for book captures; show a short notification and
            // catch any unhandled promise rejections so the user isn't left wondering why nothing
            // happened.
            try {
                alert('Generating PDF – this may take a minute.  Please leave the page open.');
                await exportToPDF(btn.dataset.topic, kb[btn.dataset.cls][btn.dataset.topic]);
            } catch (err) {
                console.error('KB PDF export failed:', err);
                alert('PDF export failed, see console for details.  Falling back to HTML export.');
                exportToHTML(btn.dataset.topic, kb[btn.dataset.cls][btn.dataset.topic]);
                alert('HTML file downloaded; open it in your browser and use File→Print→Save as PDF to get a document.');
            }
        };
    });
    div.querySelectorAll('.dig-kb-export-html').forEach(btn => {
        btn.onclick = () => exportToHTML(btn.dataset.topic, kb[btn.dataset.cls][btn.dataset.topic]);
    });
    div.querySelectorAll('.dig-kb-delete-book').forEach(btn => {
        btn.onclick = () => {
            if (!confirm(`Delete book ${btn.dataset.topic}?`)) return;
            delete kb[btn.dataset.cls][btn.dataset.topic];
            if (!Object.keys(kb[btn.dataset.cls]).length) delete kb[btn.dataset.cls];
            localStorage.setItem('digKnowledgeBase', JSON.stringify(kb)); renderKnowledgeTab(root);
        };
    });
    div.querySelectorAll('.dig-kb-delete').forEach(btn => {
        btn.onclick = () => {
            kb[btn.dataset.cls][btn.dataset.topic].splice(parseInt(btn.dataset.idx), 1);
            if (!kb[btn.dataset.cls][btn.dataset.topic].length) delete kb[btn.dataset.cls][btn.dataset.topic];
            localStorage.setItem('digKnowledgeBase', JSON.stringify(kb)); renderKnowledgeTab(root);
        };
    });
}
