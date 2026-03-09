/**
 * KB Tab Render: Builds the Knowledge Base tab header with class tabs and action buttons.
 * Why: Separated from the monolithic kb-ui so the initial tab rendering stays focused
 * while upload/migrate/class-items logic lives in their own modules.
 */

function renderKnowledgeTab(container) {
    let kb = {};
    try { kb = JSON.parse(localStorage.getItem('digKnowledgeBase') || '{}'); } catch (e) { kb = {}; }
    const classes = Object.keys(kb);
    let html = `<div style="display:flex;gap:4px;margin-bottom:16px;flex-wrap:wrap;align-items:center;background:var(--glass-1);padding:12px;border-radius:12px;border:var(--border-glass);backdrop-filter:blur(20px);">`;
    classes.forEach(cls => {
        const active = cls === detectedClass
            ? `background:var(--sap-700);color:var(--sap-50);font-weight:700;border:1px solid var(--sap-400);box-shadow:var(--glow-sm);`
            : 'background:var(--glass-1);color:var(--text-muted);border:var(--glass-border);';
        html += `<button class="dig-kb-class-tab" data-cls="${cls}" style="border:none;border-radius:999px;padding:6px 14px;cursor:pointer;font-size:11px;${active}transition:all 200ms var(--ease-out-quint);">${cls}</button>`;
    });
    html += `<div style="flex:1;"></div>`;
    html += `<button id="dig-kb-upload" class="save-btn" style="padding:6px 12px;font-size:10px;">📤 Upload</button>`;
    html += `<button id="dig-kb-migrate" class="save-btn" style="padding:6px 12px;font-size:10px;margin-left:6px;background:linear-gradient(135deg, hsla(40,70%,30%,0.6), hsla(40,70%,20%,0.6));border-color:hsla(40,70%,50%,0.4);">⬆️ Migrate</button>`;
    html += '</div><div id="dig-kb-items" style="display:flex;flex-direction:column;gap:12px;"></div>';
    container.innerHTML = html;
    renderKBClassItems(document.getElementById('dig-kb-items'), kb, detectedClass, container);
    container.querySelectorAll('.dig-kb-class-tab').forEach(btn => {
        btn.onclick = () => renderKBClassItems(document.getElementById('dig-kb-items'), kb, btn.dataset.cls, container);
    });
    _augmentWithSharedClasses(container, kb, classes);
    _wireUploadButton(container, kb);
    _wireHeaderButtons();
    _wireMigrateButton(container);
}

/** Why: Extension-shared classes are surfaced so users see cross-site buckets. */
function _augmentWithSharedClasses(container, kb, classes) {
    try {
        if (!window.chrome || !chrome.storage || !chrome.storage.local) return;
        chrome.storage.local.get('digKnowledgeBase', (res) => {
            try {
                const shared = res && res.digKnowledgeBase ? res.digKnowledgeBase : {};
                const clsDiv = container.querySelector('div');
                Object.keys(shared || {}).forEach(sc => {
                    if (!classes.includes(sc)) {
                        const btn = document.createElement('button');
                        btn.className = 'dig-kb-class-tab';
                        btn.dataset.cls = sc;
                        btn.style.cssText = 'border:none;border-radius:var(--radius-sm);padding:6px 12px;cursor:pointer;font-size:11px;background:var(--bg-panel);color:var(--text-main);border:1px dashed var(--primary-glow);transition:var(--transition-fast);';
                        btn.textContent = sc + ' (shared)';
                        btn.onclick = () => renderKBClassItems(document.getElementById('dig-kb-items'), Object.assign({}, kb, shared), sc, container);
                        clsDiv.insertBefore(btn, clsDiv.querySelector('#dig-kb-upload'));
                    }
                });
            } catch (e) { }
        });
    } catch (e) { }
}
