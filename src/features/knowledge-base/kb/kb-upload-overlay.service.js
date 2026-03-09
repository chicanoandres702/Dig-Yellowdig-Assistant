
/**
 * KB Upload Overlay: Builds the file upload dialog and queues files for processing.
 * Why: The upload overlay DOM construction and file list setup is a distinct concern
 * from the actual file processing loop, which lives in kb-upload-process.
 */

function _wireUploadButton(container, kb) {
    try {
        const uploadBtn = container.querySelector('#dig-kb-upload');
        if (!uploadBtn) return;
        uploadBtn.onclick = () => {
            const input = document.createElement('input');
            input.type = 'file'; input.accept = 'application/pdf'; input.multiple = true; input.style.display = 'none';
            document.body.appendChild(input);
            input.onchange = async () => {
                const files = Array.from(input.files || []);
                if (!files.length) { input.remove(); return; }
                const overlay = _buildUploadOverlay(files, kb);
                document.body.appendChild(overlay);
                const refs = _setupFileEntries(overlay, files);
                _wireUploadOverlayEvents(overlay, input, refs, kb, container);
            };
            input.click();
        };
    } catch (e) { console.error('kb upload wiring failed', e); }
}

function _buildUploadOverlay(files, kb) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;';
    const classOptions = Object.keys(kb || {}).map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
    overlay.innerHTML = `
        <div style="background:var(--bg-panel);width:100%;max-width:720px;max-height:80vh;border-radius:var(--radius-lg);display:flex;flex-direction:column;box-shadow:var(--shadow-lg);border:var(--glass-border);backdrop-filter:var(--glass-blur);">
            <div style="padding:14px 20px;border-bottom:var(--border-dim);display:flex;justify-content:space-between;align-items:center;background:var(--glass-heavy);border-radius:var(--radius-lg) var(--radius-lg) 0 0;">
                <h3 style="margin:0;font-size:16px;font-weight:800;color:var(--text-main);display:flex;align-items:center;gap:8px;"><span>📤</span> Upload PDFs</h3>
                <button id="dig-upload-close" style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--text-muted);">✕</button>
            </div>
            <div style="padding:20px;overflow:auto;flex:1;font-size:13px;color:var(--text-main);">
                <div style="margin-bottom:10px;font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;">Files to upload (${files.length})</div>
                <div id="dig-upload-file-list" style="background:rgba(0,0,0,0.3);border:var(--glass-border);border-radius:var(--radius-md);padding:12px;margin-bottom:16px;max-height:200px;overflow:auto;">
                    ${files.map(f => `<div style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);color:var(--sap-100);">${escapeHtml(f.name)}</div>`).join('')}
                </div>
                <div style="display:flex;gap:12px;align-items:center;margin-bottom:10px;">
                    <label style="font-size:11px;font-weight:700;color:var(--text-muted);width:50px;">CLASS</label>
                    <select id="dig-upload-class" style="flex:1;padding:8px;background:rgba(0,0,0,0.2);border:var(--glass-border);border-radius:var(--radius-sm);color:white;font-size:13px;">${classOptions}<option value="__new__">-- Create new class --</option></select>
                    <input id="dig-upload-class-new" placeholder="New class name" style="display:none;padding:8px;background:rgba(0,0,0,0.2);border:var(--glass-border);border-radius:var(--radius-sm);color:white;" />
                </div>
                <div style="display:flex;gap:12px;align-items:center;margin-bottom:14px;">
                    <label style="font-size:11px;font-weight:700;color:var(--text-muted);width:50px;">TOPIC</label>
                    <input id="dig-upload-topic" placeholder="Topic name (if not creating per-file)" style="flex:1;padding:8px;background:rgba(0,0,0,0.2);border:var(--glass-border);border-radius:var(--radius-sm);color:white;font-size:13px;" />
                </div>
                <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px;">
                    <label style="font-size:12px;color:var(--text-main);display:flex;align-items:center;gap:10px;margin:0;">
                        <input type="checkbox" id="dig-upload-new-topic-per-file" checked style="width:16px;height:16px;" /> Create a topic per file (use file name)
                    </label>
                </div>
                <div style="font-size:11px;color:var(--text-muted);margin-top:12px;line-height:1.5;padding:10px;background:rgba(0,0,0,0.2);border-radius:var(--radius-sm);border:1px solid rgba(255,255,255,0.05);">
                    <b style="color:var(--accent);">Note:</b> PDFs are stored in extension storage. Very large PDFs may fail due to storage limits.
                </div>
            </div>
            <div style="padding:16px 20px;display:flex;justify-content:flex-end;gap:12px;border-top:var(--border-dim);">
                <button id="dig-upload-cancel" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:var(--radius-sm);padding:10px 20px;cursor:pointer;color:white;font-size:12px;font-weight:600;">Cancel</button>
                <button id="dig-upload-confirm" style="background:var(--sap-500);color:white;border:none;border-radius:var(--radius-sm);padding:10px 24px;cursor:pointer;font-weight:800;font-size:13px;box-shadow:var(--glow-sm);text-transform:uppercase;letter-spacing:1px;">Upload All</button>
            </div>
        </div>`;
    return overlay;
}

/** Why: Creates progress/status entries for each file so the upload loop can update them. */
function _setupFileEntries(overlay, files) {
    const fileListDiv = overlay.querySelector('#dig-upload-file-list');
    fileListDiv.innerHTML = '';
    const entries = [];
    files.forEach(f => {
        const item = document.createElement('div');
        item.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);gap:16px;';
        const nameDiv = document.createElement('div'); nameDiv.style.flex = '1'; nameDiv.style.color = 'var(--sap-100)'; nameDiv.textContent = f.name;
        const controls = document.createElement('div'); controls.style.cssText = 'width:300px;display:flex;gap:12px;align-items:center;justify-content:flex-end';
        const prog = document.createElement('progress'); prog.max = 100; prog.value = 0; prog.style.width = '140px';
        const status = document.createElement('span'); status.className = 'dig-upload-status'; status.style.cssText = 'font-size:11px;color:var(--sap-300);min-width:80px;text-align:right;font-weight:600;'; status.textContent = 'Queued';
        controls.appendChild(prog); controls.appendChild(status);
        item.appendChild(nameDiv); item.appendChild(controls);
        fileListDiv.appendChild(item);
        entries.push({ file: f, elem: item, progress: prog, status });
    });
    return entries;
}
