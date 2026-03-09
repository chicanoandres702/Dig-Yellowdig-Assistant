/**
 * KB Header & Migrate: Wires sidebar header buttons and KB migration logic.
 * Why: Header button attachment and the migrate-to-shared flow are distinct from
 * the main tab rendering, keeping each concern in its own module.
 */

function _wireHeaderButtons() {
    try {
        const tryAttach = () => {
            const hup = document.getElementById('dig-sidebar-upload');
            const hmig = document.getElementById('dig-sidebar-migrate');
            if (!hup && !hmig) { setTimeout(tryAttach, 300); return; }
            if (hup) {
                hup.onclick = () => {
                    try {
                        if (typeof toggleSidebar === 'function') toggleSidebar();
                        if (typeof switchTab === 'function') switchTab('Knowledge');
                        setTimeout(() => { const u = document.querySelector('#dig-kb-upload'); if (u) u.click(); }, 250);
                    } catch (e) { }
                };
            }
            if (hmig) {
                hmig.onclick = () => {
                    try {
                        if (typeof toggleSidebar === 'function') toggleSidebar();
                        if (typeof switchTab === 'function') switchTab('Knowledge');
                        setTimeout(() => { const m = document.querySelector('#dig-kb-migrate'); if (m) m.click(); }, 250);
                    } catch (e) { }
                };
            }
        };
        setTimeout(tryAttach, 400);
    } catch (e) { }
}

/** Why: Merges local KB entries into the extension-shared KB for cross-site access. */
function _wireMigrateButton(container) {
    try {
        const migrateBtn = container.querySelector('#dig-kb-migrate');
        if (!migrateBtn) return;
        migrateBtn.onclick = async () => {
            if (!confirm('Migrate local KB into the extension-shared KB? This will copy your local buckets into shared storage so they are available across sites. Continue?')) return;
            migrateBtn.disabled = true;
            const orig = migrateBtn.textContent;
            migrateBtn.textContent = 'Migrating...';
            try {
                let localKb = {};
                try { localKb = JSON.parse(localStorage.getItem('digKnowledgeBase') || '{}'); } catch (e) { localKb = {}; }
                const shared = (typeof getSharedKB === 'function') ? await getSharedKB() : {};
                Object.keys(localKb || {}).forEach(cls => {
                    if (!shared[cls]) shared[cls] = {};
                    Object.keys(localKb[cls] || {}).forEach(topic => {
                        if (!shared[cls][topic]) shared[cls][topic] = [];
                        const existingSigs = new Set(shared[cls][topic].map(e => (e && e.ts) ? String(e.ts) : (e && e.text) ? e.text.substring(0, 200) : JSON.stringify(e).substring(0, 200)));
                        (localKb[cls][topic] || []).forEach(entry => {
                            const sig = (entry && entry.ts) ? String(entry.ts) : (entry && entry.text) ? entry.text.substring(0, 200) : JSON.stringify(entry).substring(0, 200);
                            if (!existingSigs.has(sig)) { shared[cls][topic].push(entry); existingSigs.add(sig); }
                        });
                    });
                });
                const res = await saveSharedKB(shared);
                if (!res || !res.success) alert('Migration failed: ' + (res && res.error ? res.error : 'unknown'));
                else { alert('Migration complete. Shared buckets are now available across sites.'); try { renderKnowledgeTab(container); } catch (e) { } }
            } catch (err) { alert('Migration error: ' + (err && err.message ? err.message : err)); }
            migrateBtn.disabled = false;
            migrateBtn.textContent = orig;
        };
    } catch (e) { }
}

/** Why: Fallback export when the built-in PDF exporter fails. */
function _fallbackExportAsHtml(title, contentArray) {
    exportToHTML(title, contentArray);
    alert('Downloaded HTML; open it and use the browser\'s print dialog (File → Print) to save as a PDF.');
}
