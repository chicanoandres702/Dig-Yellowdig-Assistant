/**
 * Draft Saved List UI: Handles rendering the collection of saved prompts and drafts.
 */

function renderSavedListUI() {
    const list = document.getElementById('dig-draft-savedList');
    if (!list) return;
    list.innerHTML = '';
    const arr = loadDraftEntries ? loadDraftEntries() : [];
    if (!arr || arr.length === 0) { list.innerHTML = '<div class="small">No saved responses.</div>'; return; }
    arr.forEach((en, idx) => {
        const d = document.createElement('div'); d.className = 'entry'; d.style.border = '1px solid #e6eef6'; d.style.padding = '8px'; d.style.marginBottom = '8px'; d.style.borderRadius = '6px'; d.style.background = 'white';
        const meta = document.createElement('div'); meta.className = 'meta'; meta.textContent = `${en.type === 'post' ? 'Yellowdig Post' : 'Peer Response'} • ${new Date(en.createdAt).toLocaleString()}` + (en.source ? ' • ' + en.source : '');
        d.appendChild(meta);
        const header = document.createElement('div'); header.style.fontWeight = '700'; header.style.marginBottom = '8px'; header.textContent = en.headerText || '';
        const headerControls = document.createElement('div'); headerControls.className = 'controls';
        const copyH = document.createElement('button'); copyH.className = 'copy-btn'; copyH.innerText = 'Click to Copy Header'; copyH.onclick = () => copyAndTryInsert(en.headerText || '', copyH);
        headerControls.appendChild(copyH);
        d.appendChild(header); d.appendChild(headerControls);
        const content = document.createElement('div'); content.style.whiteSpace = 'pre-wrap'; content.style.marginTop = '8px'; content.textContent = en.contentText || '';
        const contentControls = document.createElement('div'); contentControls.className = 'controls';
        const copyC = document.createElement('button'); copyC.className = 'copy-btn'; copyC.innerText = 'Click to Copy Response'; copyC.onclick = () => copyAndTryInsert(en.contentText || '', copyC);
        const del = document.createElement('button'); del.className = 'ghost'; del.innerText = 'Delete';
        del.onclick = () => {
            const arr = loadDraftEntries();
            arr.splice(idx, 1);
            saveDraftEntries(arr);
            renderSavedListUI();
        };
        contentControls.appendChild(copyC); contentControls.appendChild(del);
        d.appendChild(content); d.appendChild(contentControls);
        list.appendChild(d);
    });
}
