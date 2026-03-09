/**
 * Floating Toolbar Events: Button creation, drag support, and click handlers.
 * Why: Separated from toolbar container to keep each file under 100 lines.
 */

/** Why: Creates all toolbar buttons and returns the status element for flash messages. */
function _addToolbarButtons(toolbar) {
    const buttons = [
        { id: 'dig-floating-autoBtn', icon: '▶️', title: 'Auto-Scan' },
        { id: 'dig-floating-pickBtn', icon: '🎯', title: 'Capture Element' },
        { id: 'dig-floating-summaryBtn', icon: '📝', title: 'Summarize Viewport' },
        { id: 'dig-floating-chatBtn', icon: '💬', title: 'Quick Chat' },
        { id: 'dig-floating-kbBtn', icon: '📂', title: 'Knowledge Base' }
    ];

    buttons.forEach(b => {
        const btn = document.createElement('button');
        btn.id = b.id;
        btn.title = b.title;
        btn.setAttribute('aria-label', b.title);
        btn.innerText = b.icon;
        toolbar.appendChild(btn);
    });

    const status = document.createElement('div');
    status.className = 'dig-toolbar-status';
    toolbar.appendChild(status);
    return status;
}

function _isSharedDefault() {
    return localStorage.getItem('dig_default_save_use_shared') === 'true'
        || localStorage.getItem('dig_default_save_use_shared') === '1';
}

/** Why: Enables pointer-based dragging so users can reposition the toolbar. */
function _addToolbarDrag(toolbar) {
    let isDragging = false, startX = 0, startY = 0, startLeft = 0, startTop = 0;
    toolbar.style.cursor = 'move';
    toolbar.addEventListener('pointerdown', (ev) => {
        isDragging = true; startX = ev.clientX; startY = ev.clientY;
        const rect = toolbar.getBoundingClientRect();
        startLeft = rect.left; startTop = rect.top;
        toolbar.setPointerCapture && toolbar.setPointerCapture(ev.pointerId);
    });
    window.addEventListener('pointermove', (ev) => {
        if (!isDragging) return;
        toolbar.style.left = Math.max(8, startLeft + (ev.clientX - startX)) + 'px';
        toolbar.style.top = Math.max(8, startTop + (ev.clientY - startY)) + 'px';
        toolbar.style.right = 'auto';
    });
    window.addEventListener('pointerup', (ev) => {
        if (isDragging) { isDragging = false; try { toolbar.releasePointerCapture(ev.pointerId); } catch (e) { } }
    });
}

function _flashStatus(status, msg, ms = 2500) {
    try {
        status.innerText = msg;
        status.classList.add('show');
        setTimeout(() => {
            try {
                status.classList.remove('show');
            } catch (e) { }
        }, ms);
    } catch (e) { }
}

/** Why: Binds click handlers for all toolbar buttons to their respective actions. */
function _bindToolbarEvents(toolbar, status) {
    const flash = (msg) => _flashStatus(status, msg);
    const autoBtn = toolbar.querySelector('#dig-floating-autoBtn');
    const pickBtn = toolbar.querySelector('#dig-floating-pickBtn');
    const summaryBtn = toolbar.querySelector('#dig-floating-summaryBtn');
    const chatBtn = toolbar.querySelector('#dig-floating-chatBtn');
    const kbBtn = toolbar.querySelector('#dig-floating-kbBtn');

    if (autoBtn) autoBtn.onclick = () => { _handleToolbarAutoScan(autoBtn, flash); };
    if (pickBtn) pickBtn.onclick = () => { _handleToolbarPick(flash); };
    if (summaryBtn) summaryBtn.onclick = () => { _handleToolbarSummarize(flash); };
    if (chatBtn) chatBtn.onclick = () => { _handleToolbarChat(flash); };
    if (kbBtn) kbBtn.onclick = () => { _handleToolbarKB(flash); };
}
