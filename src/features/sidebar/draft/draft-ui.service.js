/**
 * Draft UI Service: Responsible for rendering the Draft Tab HTML.
 */

function renderDraftTab(container) {
    const togglesHtml = renderKBSourceToggles();
        container.innerHTML = `
<div class="draft-root">
    <div style="display:flex;align-items:center;gap:12px;">
        <div class="draft-avatar">✨</div>
        <div style="display:flex;flex-direction:column;">
            <div style="font-size:14px;font-weight:700;color:var(--neon);">Hi</div>
            <div style="font-size:11px;color:var(--neon-dim);">Let's craft something amazing</div>
        </div>
    </div>

    ${togglesHtml}

    <div id="dig-draft-saveMsg" class="mini-msg"></div>

    <div class="panel-box">
        <div class="panel-label">CREATE DRAFT</div>
        <div class="panel-inner">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                <h3 class="todo-heading" style="margin:0;">✍️ Create Draft</h3>
                <div id="dig-draft-postStatus" style="font-size:12px;color:rgba(0,255,136,0.35);font-style:italic;"></div>
            </div>

            <label class="section-head" style="margin-bottom:6px;">Context / Prompt</label>
            <textarea id="dig-draft-mainPrompt" rows="5" placeholder="Paste the prompt, scenario, or your initial thoughts here..." class="draft-textarea"></textarea>

            <div class="draft-actions" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px;">
                <button id="dig-draft-btn-yellowdig" class="imm-btn">🔶 Yellowdig Post</button>
                <button id="dig-draft-btn-reply" class="mark-btn">💬 Peer Response</button>
                <button id="dig-draft-btn-academic" class="imm-btn" style="grid-column:span 2;">🎓 Academic Artifact</button>
            </div>

            <div id="dig-draft-advancedToggle" style="margin-top:12px;">
                <a href="#" id="dig-draft-advancedLink" class="save-btn">Advanced options (PDF, screenshot)</a>
            </div>

            <div id="dig-draft-advanced" style="display:none;margin-top:8px;">
                 <label style="font-size:11px;color:var(--neon-dim)">PDF file (fallback)</label>
                 <input id="dig-draft-pdfFile" type="file" accept="application/pdf" style="width:100%;margin-bottom:8px" />
                 <label style="font-size:11px;color:var(--neon-dim)">Screenshot image (OCR)</label>
                 <input id="dig-draft-screenshotFile" type="file" accept="image/*" style="width:100%;margin-bottom:8px" />
                 <div style="display:flex;gap:8px;align-items:center">
                        <button id="dig-draft-extractBtn" class="mark-btn">Extract from Screenshot</button>
                        <div id="dig-draft-ocrStatus" style="margin-left:8px;font-size:12px;color:var(--neon-dim)"></div>
                 </div>

                 <div id="dig-draft-ocrPreview" style="display:none;margin-top:8px;background:rgba(0,0,0,0.02);padding:8px;border-radius:6px">
                        <label style="font-size:12px;color:var(--neon-dim)">Detected Name</label>
                        <input id="dig-detectedName" type="text" style="width:100%;margin-bottom:6px" />
                        <label style="font-size:12px;color:var(--neon-dim)">Detected Question</label>
                        <textarea id="dig-detectedQuestion" rows="3" style="width:100%;margin-bottom:6px"></textarea>
                 </div>
            </div>

            <div id="dig-draft-out" class="panel-inner" style="min-height:120px;margin-top:12px;background:transparent;border:none;padding:0;">Ready for your input.</div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px;">
                 <button id="dig-draft-ref" class="mode-btn">🪄 Refine</button>
                 <button id="dig-draft-shield" class="mode-btn" title="Humanize Output">🛡️ Humanize</button>
                 <button id="dig-draft-cp" class="imm-btn" style="grid-column:span 2;">🔶 Send to Yellowdig</button>
            </div>

            <div style="margin-top:12px;padding:10px;background:rgba(0,255,136,0.03);border:1px solid rgba(0,255,136,0.06);border-radius:6px;font-size:11px;color:var(--neon-dim);line-height:1.4;">
                 <b style="display:flex;align-items:center;gap:4px;color:var(--neon);">⚠️ Academic Integrity</b> Fact-check all citations. Rewrite sections to ensure your unique perspective and voice.
            </div>
        </div>
    </div>

    <div id="dig-draft-saved" class="panel-box" style="margin-top:12px;">
        <div class="panel-inner">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                 <h3 style="margin:0;font-size:15px;font-weight:800;color:var(--neon);display:flex;align-items:center;gap:8px;"><span style="color:var(--neon);">📚</span> Saved Drafts</h3>
                 <div id="dig-draft-saveMsg2" style="font-size:11px;color:var(--neon);font-weight:600;"></div>
            </div>
            <div style="display:flex;gap:8px;margin-bottom:12px">
                 <button id="dig-draft-clearAll" class="mark-btn">Clear All</button>
                 <button id="dig-draft-export" class="save-btn">Export HTML</button>
            </div>
            <div id="dig-draft-savedList" class="draft-saved-list" style="max-height:250px;overflow-y:auto;display:flex;flex-direction:column;gap:10px;"></div>
        </div>
    </div>
</div>
`;

    // If a Draft textarea component exists, mount it in place of the raw textarea for progressive enhancement
    try {
        if (window.DigSidebarComponents && window.DigSidebarComponents.components && typeof window.DigSidebarComponents.components.Draft?.createTextarea === 'function') {
            const cur = container.querySelector('#dig-draft-mainPrompt');
            if (cur) {
                const ta = window.DigSidebarComponents.components.Draft.createTextarea({ textareaId: 'dig-draft-mainPrompt', rows: 5, placeholder: 'Paste the prompt, scenario, or your initial thoughts here...' });
                cur.parentNode.replaceChild(ta, cur);
            }
        }
    } catch (e) { /* non-breaking */ }

    // Initialize list inside UI
    renderSavedListUI();

    // Bind events
    if (typeof bindDraftTabEvents === 'function') {
        bindDraftTabEvents(container);
    }
}

