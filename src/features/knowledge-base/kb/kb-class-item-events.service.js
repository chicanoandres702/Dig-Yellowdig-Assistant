/** KB Class Item Events — click handlers for view, delete, export buttons on KB entries. */

function _wireClassItemEvents(div, kb, cls, root) {
    _wireExportButtons(div, kb);
    _wireDeleteButtons(div, kb, root);
    _wireViewButtons(div);
    _wireViewBookButtons(div);
    _wireDeleteItemButtons(div, kb, root);
}

function _wireExportButtons(div, kb) {
    div.querySelectorAll('.dig-kb-export').forEach(btn => {
        btn.onclick = async () => {
            try {
                alert('Generating PDF – this may take a minute. Please leave the page open.');
                await exportToPDF(btn.dataset.topic, kb[btn.dataset.cls][btn.dataset.topic]);
            } catch (err) {
                console.error('KB PDF export failed:', err);
                alert('PDF export failed, see console for details. Falling back to HTML export.');
                exportToHTML(btn.dataset.topic, kb[btn.dataset.cls][btn.dataset.topic]);
                alert('HTML file downloaded; open it in your browser and use File→Print→Save as PDF.');
            }
        };
    });
    div.querySelectorAll('.dig-kb-export-html').forEach(btn => {
        btn.onclick = () => exportToHTML(btn.dataset.topic, kb[btn.dataset.cls][btn.dataset.topic]);
    });
}

function _wireDeleteButtons(div, kb, root) {
    div.querySelectorAll('.dig-kb-delete-book').forEach(btn => {
        btn.onclick = () => {
            if (!confirm(`Delete book ${btn.dataset.topic}?`)) return;
            try {
                const items = kb[btn.dataset.cls][btn.dataset.topic] || [];
                const refs = items.map(it => it && it.contentRef).filter(Boolean);
                if (refs.length && window.chrome && chrome.storage && chrome.storage.local) {
                    try { chrome.storage.local.remove(refs); } catch (e) { }
                }
            } catch (e) { }
            delete kb[btn.dataset.cls][btn.dataset.topic];
            if (!Object.keys(kb[btn.dataset.cls]).length) delete kb[btn.dataset.cls];
            localStorage.setItem('digKnowledgeBase', JSON.stringify(kb));
            renderKnowledgeTab(root);
        };
    });
}

function _wireViewButtons(div) {
    div.querySelectorAll('.dig-kb-view').forEach(btn => {
        btn.onclick = async () => {
            try {
                const cls = btn.dataset.cls, topic = btn.dataset.topic, idx = parseInt(btn.dataset.idx);
                const kbStore = JSON.parse(localStorage.getItem('digKnowledgeBase') || '{}');
                const item = kbStore[cls] && kbStore[cls][topic] && kbStore[cls][topic][idx];
                if (!item) return;
                if (item.contentRef && window.chrome && chrome.storage && chrome.storage.local) {
                    try {
                        chrome.storage.local.get(item.contentRef, (res) => {
                            const got = res && res[item.contentRef] ? res[item.contentRef] : null;
                            showFullPreview(topic, got ? (got.html || got.text || item.html || item.text || '') : (item.html || item.text || ''));
                        });
                    } catch (e) { showFullPreview(topic, item.html || item.text || ''); }
                } else {
                    showFullPreview(topic, item.html || item.text || '');
                }
            } catch (e) { console.error('view item failed', e); }
        };
    });
}

function _wireViewBookButtons(div) {
    div.querySelectorAll('.dig-kb-view-book').forEach(btn => {
        btn.onclick = async () => {
            try {
                const cls = btn.dataset.cls, topic = btn.dataset.topic;
                const kbStore = JSON.parse(localStorage.getItem('digKnowledgeBase') || '{}');
                const items = kbStore[cls] && kbStore[cls][topic] ? kbStore[cls][topic] : [];
                const parts = await Promise.all(items.map(it => new Promise((resolve) => {
                    if (it && it.contentRef && window.chrome && chrome.storage && chrome.storage.local) {
                        try { chrome.storage.local.get(it.contentRef, (res) => { const got = res && res[it.contentRef] ? res[it.contentRef] : null; resolve(got ? (got.html || got.text || '') : (it.html || it.text || '')); }); } catch (e) { resolve(it.html || it.text || ''); }
                    } else resolve(it.html || it.text || '');
                })));
                showFullPreview(topic, parts.join('\n\n<hr style="border:none;border-top:1px solid #eee;margin:12px 0;">\n\n'));
            } catch (e) { console.error('view book failed', e); }
        };
    });
}
function _wireDeleteItemButtons(div, kb, root) {
    div.querySelectorAll('.dig-kb-delete').forEach(btn => {
        btn.onclick = () => {
            const idx = parseInt(btn.dataset.idx);
            const removed = kb[btn.dataset.cls][btn.dataset.topic].splice(idx, 1);
            try {
                const ref = removed && removed[0] && removed[0].contentRef;
                if (ref && window.chrome && chrome.storage && chrome.storage.local) { try { chrome.storage.local.remove(ref); } catch (e) { } }
            } catch (e) { }
            if (!kb[btn.dataset.cls][btn.dataset.topic].length) delete kb[btn.dataset.cls][btn.dataset.topic];
            localStorage.setItem('digKnowledgeBase', JSON.stringify(kb));
            renderKnowledgeTab(root);
        };
    });
}
