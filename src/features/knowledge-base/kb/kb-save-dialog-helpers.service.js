/**
 * KB Save Dialog Helpers: Accessibility, shared checkbox, topic pickers, and close handlers.
 * Why: Separated from the dialog DOM construction to keep each file under 100 lines.
 */

function _setupSaveDialogAccessibility(overlay) {
    try {
        const prevActive = document.activeElement;
        const modal = overlay.firstElementChild;
        try { const hdr = modal.querySelector('h3'); if (hdr) hdr.id = 'dig-savebucket-title'; } catch (e) { }
        try { modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true'); modal.setAttribute('aria-labelledby', 'dig-savebucket-title'); } catch (e) { }
        overlay.tabIndex = -1;
        const focSel = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
        const getFocusable = () => Array.from(modal.querySelectorAll(focSel)).filter(el => !el.disabled && (el.offsetWidth || el.offsetHeight));
        const keyHandler = (ev) => {
            try {
                if (ev.key === 'Escape') { overlay._cleanup(); return; }
                if (ev.key === 'Tab') {
                    const nodes = getFocusable(); if (!nodes.length) return;
                    const idx = nodes.indexOf(document.activeElement);
                    if (ev.shiftKey) { if (idx === 0) { ev.preventDefault(); nodes[nodes.length - 1].focus(); } }
                    else { if (idx === nodes.length - 1) { ev.preventDefault(); nodes[0].focus(); } }
                }
            } catch (e) { }
        };
        const overlayClickHandler = (e) => { if (e.target === overlay) overlay._cleanup(); };
        overlay._cleanup = () => {
            try { overlay.removeEventListener('click', overlayClickHandler); overlay.removeEventListener('keydown', keyHandler); } catch (e) { }
            try { overlay.remove(); } catch (e) { }
            try { if (prevActive && typeof prevActive.focus === 'function') prevActive.focus(); } catch (e) { }
            try { if (window.chrome && chrome.runtime && chrome.runtime.id) chrome.runtime.sendMessage({ type: 'DIG_STOP_PICKING' }); } catch (e) { }
        };
        overlay.addEventListener('click', overlayClickHandler);
        overlay.addEventListener('keydown', keyHandler);
        setTimeout(() => { const nodes = getFocusable(); if (nodes.length) nodes[0].focus(); else overlay.focus(); }, 10);
    } catch (e) { }
}

function _insertSharedCheckbox(overlay) {
    try {
        const cancelParent = overlay.querySelector('#dig-savebucket-cancel')?.parentNode;
        if (!cancelParent) return;
        const div = document.createElement('div');
        div.style.cssText = 'display:flex;align-items:center;justify-content:flex-start;margin-bottom:12px;padding:0 4px;';
        div.innerHTML = `<label style="font-size:12px;color:var(--text-main);display:flex;align-items:center;gap:10px;margin:0;"><input type="checkbox" id="dig-savebucket-use-shared" style="width:16px;height:16px;" /> Save to shared KB (available across sites)</label>`;
        cancelParent.parentNode.insertBefore(div, cancelParent);
        try {
            const clsSelect = overlay.querySelector('#dig-savebucket-class');
            const useSharedEl = overlay.querySelector('#dig-savebucket-use-shared');
            const selectedOpt = clsSelect.options[clsSelect.selectedIndex];
            if (selectedOpt && selectedOpt.getAttribute('data-shared') === '1') useSharedEl.checked = true;
            clsSelect.addEventListener('change', () => {
                try { const opt = clsSelect.options[clsSelect.selectedIndex]; useSharedEl.checked = !!(opt && opt.getAttribute('data-shared') === '1'); } catch (e) { }
            });
        } catch (e) { }
    } catch (e) { }
}

function _wireTopicPickers(overlay, opts, defaultCls) {
    const clsSelect = overlay.querySelector('#dig-savebucket-class');
    const clsNewInput = overlay.querySelector('#dig-savebucket-class-new');
    const topicSelect = overlay.querySelector('#dig-savebucket-topic');
    const topicNewInput = overlay.querySelector('#dig-savebucket-topic-new');
    const rebuildTopics = async (cls) => {
        let optsHtml = '';
        try {
            const currentKb = JSON.parse(localStorage.getItem('digKnowledgeBase') || '{}');
            const sharedKb = (typeof getSharedKB === 'function') ? await getSharedKB() : {};
            const set = new Set();
            Object.keys(currentKb || {}).forEach(c => { Object.keys(currentKb[c] || {}).forEach(t => set.add(t)); });
            Object.keys(sharedKb || {}).forEach(c => { Object.keys(sharedKb[c] || {}).forEach(t => set.add(t)); });
            optsHtml = Array.from(set).sort().map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');
        } catch (e) { optsHtml = ''; }
        topicSelect.innerHTML = optsHtml + '<option value="__new__">-- Create new topic --</option>';
        try { if (opts.defaultTopic) { const opt = Array.from(topicSelect.options).find(o => o.value === opts.defaultTopic); if (opt) opt.selected = true; } } catch (e) { }
    };
    rebuildTopics(defaultCls);
    clsSelect.onchange = () => {
        if (clsSelect.value === '__new__') { clsNewInput.style.display = 'inline-block'; topicSelect.style.display = 'none'; topicNewInput.style.display = 'inline-block'; topicNewInput.value = ''; }
        else { clsNewInput.style.display = 'none'; topicSelect.style.display = 'inline-block'; topicNewInput.style.display = 'none'; rebuildTopics(clsSelect.value); }
    };
    topicSelect.onchange = () => { topicNewInput.style.display = topicSelect.value === '__new__' ? 'inline-block' : 'none'; };
}

function _wireSaveDialogClose(overlay) {
    const close = () => { try { overlay._cleanup ? overlay._cleanup() : overlay.remove(); } catch (e) { try { overlay.remove(); } catch (e2) { } } };
    overlay.querySelector('#dig-savebucket-close').onclick = close;
    overlay.querySelector('#dig-savebucket-cancel').onclick = close;
}
