/**
 * UI Overlay Service: Reusable utility for full-screen previews and modals.
 */
function showFullPreview(title, content) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;`;

    // Process markdown-like images for display
    const htmlContent = content
        .replace(/!\[(.*?)\]\((.*?)\)/g, '<div style="margin:16px 0;text-align:center;"><img src="$2" alt="$1" style="max-width:100%;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15); display:block; margin:0 auto;"></div>')
        .replace(/\n/g, '<br>');

    overlay.innerHTML = `
        <div style="background:white;width:100%;max-width:600px;max-height:80vh;border-radius:12px;display:flex;flex-direction:column;box-shadow:0 10px 25px rgba(0,0,0,0.2);">
            <div style="padding:16px;border-bottom:1px solid #eee;display:flex;justify-content:space-between;align-items:center;background:#f8fafc;border-radius:12px 12px 0 0;">
                <h3 style="margin:0;font-size:16px;">${escapeHtml(title)}</h3>
                <button id="dig-preview-close" style="background:none;border:none;font-size:20px;cursor:pointer;">✕</button>
            </div>
            <div style="padding:20px;overflow-y:auto;flex:1;font-size:13px;line-height:1.6;color:#334155;">
                ${htmlContent}
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById('dig-preview-close').onclick = () => overlay.remove();
}
