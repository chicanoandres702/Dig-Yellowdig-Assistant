/**
 * Draft Events Service: Wires up UI events to data logic and API calls.
 */

function bindDraftTabEvents(container) {
    // keep book checkboxes hierarchical: toggle children when parent clicks, update parent when all children sync
    container.addEventListener('change', e => {
        const cb = e.target;
        if (!cb.classList.contains('dig-kb-toggle')) return;
        const cls = cb.dataset.cls;
        const topic = cb.dataset.topic;
        const hasChap = cb.dataset.chapter !== undefined;
        if (!hasChap) {
            // parent checkbox toggled -> change all chapter boxes
            container.querySelectorAll(`.dig-kb-toggle[data-cls="\${cls}"][data-topic="\${topic}"][data-chapter]`).forEach(chcb => {
                chcb.checked = cb.checked;
            });
        } else {
            // chapter toggled -> update parent based on siblings
            const parent = container.querySelector(`.dig-kb-toggle[data-cls="\${cls}"][data-topic="\${topic}"]:not([data-chapter])`);
            if (parent) {
                const siblings = container.querySelectorAll(`.dig-kb-toggle[data-cls="\${cls}"][data-topic="\${topic}"][data-chapter]`);
                const allChecked = Array.from(siblings).every(chcb => chcb.checked);
                parent.checked = allChecked;
            }
        }
    });

    // Mode Buttons
    const btnYellowdig = document.getElementById('dig-draft-btn-yellowdig');
    if (btnYellowdig) {
        btnYellowdig.onclick = async () => {
            await generateDraft('post', container);
        };
    }

    const btnReply = document.getElementById('dig-draft-btn-reply');
    if (btnReply) {
        btnReply.onclick = async () => {
            await generateDraft('response', container);
        };
    }

    const btnAcademic = document.getElementById('dig-draft-btn-academic');
    if (btnAcademic) {
        btnAcademic.onclick = async () => {
            await generateDraft('academic', container);
        };
    }

    // OCR Logic
    const extractBtn = document.getElementById('dig-draft-extractBtn');
    if (extractBtn) extractBtn.onclick = handleOCR;

    // Refinement/Humanize
    const btnRefine = document.getElementById('dig-draft-ref');
    if (btnRefine) btnRefine.onclick = handleDraftRefinement;

    const btnHumanize = document.getElementById('dig-draft-shield');
    if (btnHumanize) btnHumanize.onclick = handleDraftHumanize;

    // Send to Yellowdig
    const btnYellowdigSend = document.getElementById('dig-draft-cp');
    if (btnYellowdigSend) btnYellowdigSend.onclick = handleDraftYellowdigSend;

    // Advanced Options Toggle
    const advancedLink = document.getElementById('dig-draft-advancedLink');
    if (advancedLink) {
        advancedLink.onclick = (e) => {
            e.preventDefault();
            const adv = document.getElementById('dig-draft-advanced');
            if (adv) adv.style.display = (adv.style.display === 'none') ? 'block' : 'none';
        };
    }
}
