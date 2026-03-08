/**
 * Knowledge Base: Multi-class with book support.
 */
function renderKnowledgeTab(container) {
    let kb = {};
    try { kb = JSON.parse(localStorage.getItem('digKnowledgeBase') || '{}'); } catch (e) { kb = {}; }
    const classes = Object.keys(kb);
    if (!classes.length) {
        container.innerHTML = `<div style="text-align:center;padding:40px;color:#666;">
      <div style="font-size:32px;margin-bottom:12px;">📚</div>
      <p>No knowledge saved yet.</p></div>`;
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

function renderKBClassItems(div, kb, cls, root) {
    if (!kb[cls]) { div.innerHTML = '<p style="color:#888;font-size:12px;">No items for this class.</p>'; return; }
    let html = '';
    Object.keys(kb[cls]).forEach(topic => {
        const items = kb[cls][topic];
        const isBook = items.length > 0 && items[0].type === 'book-page';
        const badge = isBook ? ` <span style="background:#3b82f6;color:white;padding:1px 5px;border-radius:3px;font-size:9px;">📖 ${items.length} pages</span>` : '';
        html += `<h4 style="font-size:12px;color:${PRIMARY_COLOR};margin:8px 0 4px;">${topic}${badge}</h4>`;
        if (isBook) {
            html += `<div style="display:flex;justify-content:space-between;align-items:center;padding-left:14px;margin-bottom:8px;">
                <p style="font-size:11px;color:#666;margin:0;">Captured ${items.length} pages</p>
                <div style="display:flex;gap:4px;">
                      <button class="dig-kb-export-html" data-cls="${cls}" data-topic="${topic}" style="background:#3b82f6;color:white;border:none;border-radius:4px;padding:4px 8px;font-size:10px;cursor:pointer;">📥 HTML</button>
                      <button class="dig-kb-export" data-cls="${cls}" data-topic="${topic}" style="background:${PRIMARY_COLOR};color:white;border:none;border-radius:4px;padding:4px 8px;font-size:10px;cursor:pointer;">📥 PDF</button>
                      <button class="dig-kb-delete-book" data-cls="${cls}" data-topic="${topic}" style="background:#ef4444;color:white;border:none;border-radius:4px;padding:4px 8px;font-size:10px;cursor:pointer;">🗑️ Delete</button>
                    </div>
                  </div>`;

            // Group by chapter
            const chapters = {};
            items.forEach(item => {
                const ch = item.chapter || 'Unknown Chapter';
                if (!chapters[ch]) chapters[ch] = 0;
                chapters[ch]++;
            });
            Object.keys(chapters).forEach(ch => {
                html += `<p style="font-size:11px;color:#475569;padding-left:24px;margin:2px 0;">• ${ch} (${chapters[ch]} pages)</p>`;
            });
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
        btn.onclick = () => {
            const kbData = JSON.parse(localStorage.getItem('digKnowledgeBase') || '{}');
            const content = kbData[btn.dataset.cls]?.[btn.dataset.topic] || [];
            exportToPDF(btn.dataset.topic, content);
        };
    });

    div.querySelectorAll('.dig-kb-export-html').forEach(btn => {
        btn.onclick = () => {
            const kbData = JSON.parse(localStorage.getItem('digKnowledgeBase') || '{}');
            const content = kbData[btn.dataset.cls]?.[btn.dataset.topic] || [];
            exportToHTML(btn.dataset.topic, content);
        };
    });

    div.querySelectorAll('.dig-kb-delete-book').forEach(btn => {
        btn.onclick = () => {
            const c = btn.dataset.cls, t = btn.dataset.topic;
            if (!confirm(`Delete all ${kb[c][t].length} pages for this book?`)) return;
            delete kb[c][t];
            if (!Object.keys(kb[c]).length) delete kb[c];
            localStorage.setItem('digKnowledgeBase', JSON.stringify(kb));
            renderKnowledgeTab(root);
        };
    });
    div.querySelectorAll('.dig-kb-delete').forEach(btn => {
        btn.onclick = () => {
            const c = btn.dataset.cls, t = btn.dataset.topic, i = parseInt(btn.dataset.idx);
            kb[c][t].splice(i, 1);
            if (!kb[c][t].length) delete kb[c][t];
            if (!Object.keys(kb[c]).length) delete kb[c];
            localStorage.setItem('digKnowledgeBase', JSON.stringify(kb));
            renderKnowledgeTab(root);
        };
    });
}

function saveToKnowledgeBase(text, cls) {
    let kb = {};
    try { kb = JSON.parse(localStorage.getItem('digKnowledgeBase') || '{}'); } catch (e) { kb = {}; }
    if (!kb[cls]) kb[cls] = {};
    if (!kb[cls]['Quick-Saves']) kb[cls]['Quick-Saves'] = [];
    kb[cls]['Quick-Saves'].push({ text, confirmed: true, type: 'knowledge' });
    localStorage.setItem('digKnowledgeBase', JSON.stringify(kb));
}

function saveBookPage(cls, bookTitle, chapter, pageData) {
    let kb = {};
    try { kb = JSON.parse(localStorage.getItem('digKnowledgeBase') || '{}'); } catch (e) { kb = {}; }
    if (!kb[cls]) kb[cls] = {};
    if (!kb[cls][bookTitle]) kb[cls][bookTitle] = [];

    const { text, html } = typeof pageData === 'object' ? pageData : { text: pageData, html: '' };
    kb[cls][bookTitle].push({ text, html, type: 'book-page', chapter, ts: Date.now() });

    localStorage.setItem('digKnowledgeBase', JSON.stringify(kb));
}

function getBookPageCount(cls, bookTitle) {
    try {
        const kb = JSON.parse(localStorage.getItem('digKnowledgeBase') || '{}');
        return kb[cls]?.[bookTitle]?.length || 0;
    } catch (e) { return 0; }
}
