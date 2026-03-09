/**
 * KB Save Dialog: Builds the save-to-bucket modal with accessibility and shared class augmentation.
 * Why: The modal DOM is large enough to warrant its own module, separate from the topic/picker/confirm logic.
 */

function showSaveToBucketDialog(text, opts = {}, onSaved) {
    try {
        const kb = JSON.parse(localStorage.getItem('digKnowledgeBase') || '{}');
        const classes = Object.keys(kb || {});
        const defaultCls = opts.defaultCls || (classes.length ? classes[0] : detectedClass || 'Default');
        const defaultTopic = opts.defaultTopic || (opts.isBook ? (opts.bookTitle || 'Book') : 'Quick-Saves');
        const overlay = _buildSaveDialogOverlay(text, classes, defaultCls);
        document.body.appendChild(overlay);
        _augmentSaveDialogSharedClasses(overlay, defaultCls);
        _setupSaveDialogAccessibility(overlay);
        _insertSharedCheckbox(overlay);
        _wireTopicPickers(overlay, opts, defaultCls);
        _wireSaveDialogClose(overlay);
        _wireSaveDialogPicker(overlay);
        _wireSaveDialogConfirm(overlay, text, opts, onSaved);
    } catch (e) { console.error('showSaveToBucketDialog error', e); }
}

function _buildSaveDialogOverlay(text, classes, defaultCls) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;';
    const safeText = escapeHtml((typeof text === 'string') ? text.substring(0, 1000) : (text?.text || ''));
    const classOptions = classes.map(c => `<option value="${escapeHtml(c)}" ${c === defaultCls ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('');
    overlay.innerHTML = `
        <div style="background:var(--bg-panel);width:100%;max-width:640px;max-height:80vh;border-radius:var(--radius-lg);display:flex;flex-direction:column;box-shadow:var(--shadow-lg);border:var(--glass-border);backdrop-filter:var(--glass-blur);">
            <div style="padding:14px 20px;border-bottom:var(--border-dim);display:flex;justify-content:space-between;align-items:center;background:var(--glass-heavy);border-radius:var(--radius-lg) var(--radius-lg) 0 0;">
                <h3 style="margin:0;font-size:16px;font-weight:800;color:var(--text-main);display:flex;align-items:center;gap:8px;"><span>💾</span> Save to Bucket</h3>
                <button id="dig-savebucket-close" style="background:none;border:none;font-size:18px;cursor:pointer;">✕</button>
            </div>
            <div style="padding:20px;overflow:auto;flex:1;font-size:13px;color:var(--text-main);">
                <div style="margin-bottom:10px;color:var(--text-muted);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Preview</div>
                <div id="dig-savebucket-preview" style="background:rgba(0,0,0,0.3);border:var(--glass-border);border-radius:var(--radius-md);padding:12px;margin-bottom:12px;max-height:140px;overflow:auto;line-height:1.6;color:var(--sap-100);">${safeText}</div>
                <div style="display:flex;gap:8px;align-items:center;margin-bottom:14px;">
                    <button id="dig-savebucket-pick" style="background:var(--sap-600);color:white;border:none;border-radius:var(--radius-sm);padding:8px 14px;cursor:pointer;font-weight:600;font-size:12px;">🔎 Pick element</button>
                    <input id="dig-savebucket-selector" placeholder="Or paste selector (e.g. #main .content)" style="flex:1;padding:8px;background:rgba(0,0,0,0.2);border:var(--glass-border);border-radius:var(--radius-sm);color:white;font-size:12px;" />
                </div>
                <div style="display:flex;gap:12px;align-items:center;margin-bottom:10px;">
                    <label style="font-size:11px;font-weight:700;color:var(--text-muted);width:50px;">CLASS</label>
                    <select id="dig-savebucket-class" style="flex:1;padding:8px;background:rgba(0,0,0,0.2);border:var(--glass-border);border-radius:var(--radius-sm);color:white;font-size:13px;">${classOptions}<option value="__new__">-- Create new class --</option></select>
                    <input id="dig-savebucket-class-new" placeholder="New class name" style="display:none;padding:8px;background:rgba(0,0,0,0.2);border:var(--glass-border);border-radius:var(--radius-sm);color:white;" />
                </div>
                <div style="display:flex;gap:12px;align-items:center;margin-bottom:14px;">
                    <label style="font-size:11px;font-weight:700;color:var(--text-muted);width:50px;">TOPIC</label>
                    <select id="dig-savebucket-topic" style="flex:1;padding:8px;background:rgba(0,0,0,0.2);border:var(--glass-border);border-radius:var(--radius-sm);color:white;font-size:13px;"></select>
                    <input id="dig-savebucket-topic-new" placeholder="New topic name" style="display:none;padding:8px;background:rgba(0,0,0,0.2);border:var(--glass-border);border-radius:var(--radius-sm);color:white;" />
                </div>
                <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px;">
                    <label style="font-size:12px;color:var(--text-main);display:flex;align-items:center;gap:10px;margin:0;"><input type="checkbox" id="dig-savebucket-makevisible" style="width:16px;height:16px;" /> Make topic visible across all classes</label>
                </div>
                <div style="display:flex;gap:8px;align-items:center;margin-bottom:20px;">
                    <label style="font-size:12px;color:var(--text-main);display:flex;align-items:center;gap:10px;margin:0;"><input type="checkbox" id="dig-savebucket-copyall" style="width:16px;height:16px;" /> Copy this content to all classes</label>
                </div>
                <div style="display:flex;gap:12px;align-items:center;justify-content:flex-end;">
                    <button id="dig-savebucket-cancel" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:var(--radius-sm);padding:10px 20px;cursor:pointer;color:white;font-size:12px;font-weight:600;">Cancel</button>
                    <button id="dig-savebucket-confirm" style="background:var(--sap-500);color:white;border:none;border-radius:var(--radius-sm);padding:10px 24px;cursor:pointer;font-weight:800;font-size:13px;box-shadow:var(--glow-sm);text-transform:uppercase;letter-spacing:1px;">Save Entry</button>
                </div>
            </div>
        </div>`;
    return overlay;
}

/** Why: Augments class picker with shared classes from chrome.storage. */
function _augmentSaveDialogSharedClasses(overlay, defaultCls) {
    try {
        if (!window.chrome || !chrome.storage || !chrome.storage.local) return;
        chrome.storage.local.get('digKnowledgeBase', (res) => {
            try {
                const shared = res && res.digKnowledgeBase ? res.digKnowledgeBase : {};
                const clsSel = overlay.querySelector('#dig-savebucket-class');
                if (!clsSel) return;
                const existing = Array.from(clsSel.options).map(o => o.value);
                Object.keys(shared || {}).forEach(sc => {
                    if (!existing.includes(sc)) {
                        const opt = document.createElement('option'); opt.value = sc; opt.textContent = sc + ' (shared)'; opt.setAttribute('data-shared', '1');
                        clsSel.appendChild(opt);
                    }
                });
                try { if (!clsSel.value && defaultCls) clsSel.value = defaultCls; } catch (e) { }
            } catch (e) { }
        });
    } catch (e) { }
}
