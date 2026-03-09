/**
 * Draft UI Service: Responsible for rendering the Draft Tab HTML.
 */

function renderDraftTab(container) {
    const togglesHtml = renderKBSourceToggles();

    container.innerHTML = `<div style="display:flex;flex-direction:column;gap:12px;padding:4px;">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
        <div style="width:32px;height:32px;border-radius:50%;background:var(--primary-glow);display:flex;align-items:center;justify-content:center;font-size:18px;">✨</div>
        <p style="font-size:14px;font-weight:700;color:var(--primary-dark);margin:0;">Hi Victoria Alethia Enciso!</p>
    </div>
        ${togglesHtml}
        <div id="dig-draft-saveMsg" style="font-size:12px;color:var(--primary);font-weight:600;margin-bottom:8px;min-height:18px;"></div>

        <div style="margin:0;padding:16px;background:var(--bg-card);border:var(--glass-border);border-radius:var(--radius-lg);box-shadow:var(--shadow-md);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                <h3 style="margin:0;font-size:15px;font-weight:800;color:var(--text-main);display:flex;align-items:center;gap:8px;"><span style="color:var(--primary);">✍️</span> Create Draft</h3>
                <div id="dig-draft-postStatus" style="font-size:12px;color:var(--text-muted);font-style:italic;"></div>
            </div>

            <label style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:6px;display:block;letter-spacing:1px;">Context / Prompt</label>
            <textarea id="dig-draft-mainPrompt" rows="5" placeholder="Paste the prompt, scenario, or your initial thoughts here..." style="width:100%;margin-bottom:12px;background:rgba(0, 0, 0, 0.4);color:white;font-size:13px;border:1px solid rgba(14, 165, 233, 0.3);padding:10px;"></textarea>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;">
                <button id="dig-draft-btn-yellowdig" class="btn btn-primary" style="padding:10px; font-size:12px; background:var(--sap-600); box-shadow:0 0 10px rgba(14, 165, 233, 0.2);">🔶 Yellowdig Post</button>
                <button id="dig-draft-btn-reply" class="btn btn-primary" style="padding:10px; font-size:12px; background:var(--sap-700); box-shadow:0 0 10px rgba(14, 165, 233, 0.1);">💬 Peer Response</button>
                <button id="dig-draft-btn-academic" class="btn btn-primary" style="padding:12px; font-size:13px; background:var(--sap-900); grid-column: span 2; border:1px solid var(--sap-400); text-transform:uppercase; font-weight:700;">🎓 Academic Artifact</button>
            </div>
    
            <div id="dig-draft-advancedToggle" style="margin-bottom:8px">
                <a href="#" id="dig-draft-advancedLink" style="font-size:12px;color:#2563eb;">Advanced options (PDF, screenshot)</a>
            </div>

            <div id="dig-draft-advanced" style="display:none;margin-top:8px">
                <label style="font-size:11px;color:#64748b">PDF file (fallback)</label>
                <input id="dig-draft-pdfFile" type="file" accept="application/pdf" style="width:100%;margin-bottom:8px" />
                <label style="font-size:11px;color:#64748b">Screenshot image (OCR)</label>
                <input id="dig-draft-screenshotFile" type="file" accept="image/*" style="width:100%;margin-bottom:8px" />
                <div style="display:flex;gap:8px;align-items:center">
                    <button id="dig-draft-extractBtn" class="ghost">Extract from Screenshot</button>
                    <div id="dig-draft-ocrStatus" style="margin-left:8px;font-size:12px;color:#0f172a"></div>
                </div>
                <div id="dig-draft-ocrPreview" style="display:none;margin-top:8px;background:#f8fafc;padding:8px;border-radius:6px">
                    <label style="font-size:12px">Detected Name</label>
                    <input id="dig-detectedName" type="text" style="width:100%;margin-bottom:6px" />
                    <label style="font-size:12px">Detected Question</label>
                    <textarea id="dig-detectedQuestion" rows="3" style="width:100%;margin-bottom:6px"></textarea>
                </div>
            </div>

            <div id="dig-draft-out" style="min-height:120px;background:var(--bg-panel);border:var(--glass-border);border-radius:var(--radius-md);padding:14px;font-size:13px;line-height:1.6;overflow-y:auto;color:var(--text-main);box-shadow:inset 0 2px 4px rgba(0,0,0,0.05);margin-top:12px;">Ready for your input.</div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px;">
                <button id="dig-draft-ref" style="background:var(--accent);color:white;border:none;border-radius:var(--radius-sm);padding:8px;cursor:pointer;font-size:12px;font-weight:600;transition:var(--transition-fast);">🪄 Refine</button>
                <button id="dig-draft-shield" style="background:var(--warning);color:white;border:none;border-radius:var(--radius-sm);padding:8px;cursor:pointer;font-size:12px;font-weight:600;transition:var(--transition-fast);" title="Humanize Output">🛡️ Humanize</button>
                <button id="dig-draft-cp" style="background:var(--accent);color:white;border:none;border-radius:var(--radius-sm);padding:8px;cursor:pointer;font-size:12px;font-weight:600;grid-column: span 2;transition:var(--transition-fast);">🔶 Send to Yellowdig</button>
            </div>

            <div style="margin-top:12px;padding:10px;background:var(--primary-glow);border:1px solid rgba(16, 185, 129, 0.2);border-radius:var(--radius-sm);font-size:11px;color:var(--primary-dark);line-height:1.4;">
                <b style="display:flex;align-items:center;gap:4px;">⚠️ Academic Integrity</b> Fact-check all citations. Rewrite sections to ensure your unique perspective and voice.
            </div>
        </div>

        <div id="dig-draft-saved" style="margin-top:16px;padding:16px;background:var(--bg-card);border:var(--glass-border);border-radius:var(--radius-lg);box-shadow:var(--shadow-md);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                <h3 style="margin:0;font-size:15px;font-weight:800;color:var(--text-main);display:flex;align-items:center;gap:8px;"><span style="color:var(--accent);">📚</span> Saved Drafts</h3>
                <div id="dig-draft-saveMsg2" style="font-size:11px;color:var(--primary);font-weight:600;"></div>
            </div>
            <div style="display:flex;gap:8px;margin-bottom:12px">
                <button id="dig-draft-clearAll" style="background:var(--danger);color:white;border:none;border-radius:var(--radius-sm);padding:6px 12px;font-size:11px;font-weight:600;cursor:pointer;">Clear All</button>
                <button id="dig-draft-export" style="background:var(--accent);color:white;border:none;border-radius:var(--radius-sm);padding:6px 12px;font-size:11px;font-weight:600;cursor:pointer;">Export HTML</button>
            </div>
            <div id="dig-draft-savedList" style="max-height:250px;overflow-y:auto;display:flex;flex-direction:column;gap:10px;"></div>
        </div>
    </div>`;

    // Initialize list inside UI
    renderSavedListUI();

    // Bind events
    if (typeof bindDraftTabEvents === 'function') {
        bindDraftTabEvents(container);
    }
}

