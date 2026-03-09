/**
 * KB Save Dialog Confirm: Handles the save action with shared/local routing,
 * makeVisible, and copyAll options.
 * Why: The confirmation logic is the most complex part of the dialog and
 * justifies its own module for readability and maintenance.
 */

function _wireSaveDialogConfirm(overlay, text, opts, onSaved) {
    overlay.querySelector('#dig-savebucket-confirm').onclick = async () => {
        const clsSelect = overlay.querySelector('#dig-savebucket-class');
        const topicSelect = overlay.querySelector('#dig-savebucket-topic');
        const clsNewInput = overlay.querySelector('#dig-savebucket-class-new');
        const topicNewInput = overlay.querySelector('#dig-savebucket-topic-new');
        let destCls = clsSelect.value === '__new__' ? (clsNewInput.value.trim() || 'Default') : clsSelect.value;
        let destTopic = topicSelect.value === '__new__' ? (topicNewInput.value.trim() || 'Untitled') : topicSelect.value;
        if (clsSelect.value === '__new__' && topicNewInput.value?.trim()) destTopic = topicNewInput.value.trim();
        const makeVisible = !!overlay.querySelector('#dig-savebucket-makevisible')?.checked;
        const copyAll = !!overlay.querySelector('#dig-savebucket-copyall')?.checked;

        try {
            const picked = overlay._pickedContent;
            const saveText = picked ? (picked.text || _extractText(text)) : _extractText(text);
            const saveHtml = picked ? (picked.html || opts.html || '') : (opts.html || '');
            let localKb = {};
            try { localKb = JSON.parse(localStorage.getItem('digKnowledgeBase') || '{}'); } catch (e) { localKb = {}; }
            const sharedKb = (typeof getSharedKB === 'function') ? await getSharedKB() : {};
            const destInLocal = !!(localKb && localKb[destCls]);
            const destInShared = !!(sharedKb && sharedKb[destCls]);
            const useSharedEl = overlay.querySelector('#dig-savebucket-use-shared');
            const useShared = useSharedEl ? !!useSharedEl.checked : false;

            await _performSave(useShared, destInShared, destInLocal, destCls, destTopic, saveText, saveHtml, opts);
            await _handleMakeVisible(makeVisible, destCls, destTopic);
            await _handleCopyAll(copyAll, destCls, destTopic, saveText, saveHtml, opts, text);

            try { const tc = document.querySelector('#dig-tab-content'); if (tc) renderKnowledgeTab(tc); } catch (e) { }
            overlay.remove();
            try { if (typeof onSaved === 'function') onSaved(destCls, destTopic); } catch (e) { }
            alert('Saved to ' + destCls + ' / ' + destTopic);
        } catch (e) { console.error('showSaveToBucketDialog save failed', e); alert('Save failed: ' + (e && e.message ? e.message : e)); }
    };
}

function _extractText(text) { return (typeof text === 'string') ? text : (text?.text || ''); }

async function _performSave(useShared, destInShared, destInLocal, cls, topic, saveText, saveHtml, opts) {
    if (useShared || (destInShared && !destInLocal)) {
        const payload = { type: opts.isBook ? 'book-page' : 'knowledge', html: saveHtml, chapter: opts.chapter || null, force: opts.force || false };
        if (opts.isBook) payload.pageData = opts.pageData || { text: saveText, html: saveHtml, force: opts.force || false };
        const res = await saveToSharedKB(cls, topic, saveText, payload);
        if (!res || !res.success) console.error('Shared save failed', res);
    } else {
        if (opts.isBook) saveBookPage(cls, topic, opts.chapter || null, opts.pageData || { text: saveText, html: saveHtml, force: opts.force || false });
        else saveToBucket(cls, topic, saveText, { type: 'knowledge', html: saveHtml, force: opts.force || false });
    }
}

async function _handleMakeVisible(makeVisible, destCls, destTopic) {
    if (!makeVisible) return;
    try {
        let kbAfter = {}; try { kbAfter = JSON.parse(localStorage.getItem('digKnowledgeBase') || '{}'); } catch (e) { kbAfter = {}; }
        const sharedKb = (typeof getSharedKB === 'function') ? await getSharedKB() : {};
        const allClasses = Array.from(new Set([...Object.keys(kbAfter || {}), ...Object.keys(sharedKb || {})]));
        for (const c of allClasses) { if (!kbAfter[c]) kbAfter[c] = {}; if (!kbAfter[c][destTopic]) kbAfter[c][destTopic] = []; }
        safeSaveKB(kbAfter);
        try {
            const s2 = (typeof getSharedKB === 'function') ? await getSharedKB() : {};
            for (const c of allClasses) { if (!s2[c]) s2[c] = {}; if (!s2[c][destTopic]) s2[c][destTopic] = []; }
            await saveSharedKB(s2);
        } catch (e) { }
    } catch (e) { console.error('makeVisible failed', e); }
}

async function _handleCopyAll(copyAll, destCls, destTopic, saveText, saveHtml, opts, text) {
    if (!copyAll) return;
    try {
        let kbAfter = {}; try { kbAfter = JSON.parse(localStorage.getItem('digKnowledgeBase') || '{}'); } catch (e) { kbAfter = {}; }
        const sharedAfter = (typeof getSharedKB === 'function') ? await getSharedKB() : {};
        const allClasses = Array.from(new Set([...Object.keys(kbAfter || {}), ...Object.keys(sharedAfter || {})]));
        for (const c of allClasses) {
            if (c === destCls) continue;
            if ((sharedAfter && sharedAfter[c]) && !(kbAfter && kbAfter[c])) {
                const payload = { type: opts.isBook ? 'book-page' : 'knowledge', html: saveHtml, chapter: opts.chapter || null, force: opts.force || false };
                try { await saveToSharedKB(c, destTopic, saveText, payload); } catch (e) { }
            } else {
                if (opts.isBook) { try { saveBookPage(c, destTopic, opts.chapter || null, opts.pageData || { text: _extractText(text), html: opts.html || '', force: opts.force || false }); } catch (e) { } }
                else { try { saveToBucket(c, destTopic, _extractText(text), { type: 'knowledge', html: opts.html || '', force: opts.force || false }); } catch (e) { } }
            }
        }
    } catch (e) { console.error('copyAll failed', e); }
}
