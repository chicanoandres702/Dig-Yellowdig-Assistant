/**
 * Notes Tab: Sidebar-integrated sticky notes manager.
 */
function renderNotesTab(container) {
    const bucket = classBuckets[detectedClass]?.[detectedWeek];
    const notes = bucket?.stickyNotes || [];
    let html = `
    <div style="display:flex;justify-content:space-between;align-items:center;background:var(--bg-card);padding:12px;border-radius:var(--radius-md);border:var(--glass-border);margin-bottom:16px;">
        <div style="display:flex;flex-direction:column;gap:2px;">
            <p style="font-size:14px;font-weight:800;color:var(--text-main);margin:0;">📌 Sticky Notes</p>
            <span style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">${notes.length} Active Note(s)</span>
        </div>
        <button id="dig-notes-add" class="btn btn-primary" style="padding:6px 12px;font-size:11px;">+ Add Note</button>
    </div>`;

    if (!notes.length) {
        html += `<div style="text-align:center;padding:40px 20px;background:var(--bg-panel);border-radius:var(--radius-lg);border:var(--glass-border-dashed);opacity:0.6;">
            <div style="font-size:32px;margin-bottom:12px;filter:drop-shadow(0 0 10px var(--primary-glow));">📍</div>
            <p style="font-size:13px;color:var(--text-muted);margin:0;">No notes found for this category.</p>
            <p style="font-size:11px;color:var(--text-muted);opacity:0.8;margin-top:4px;">Capture ideas or reminders for later.</p>
        </div>`;
    } else {
        html += `<div style="display:flex;flex-direction:column;gap:12px;">`;
        notes.forEach((note, idx) => {
            const noteColor = note.color || '#fef08a';
            // Use a semi-transparent version of the note color for a glass effect
            html += `<div style="background:var(--bg-panel);border-left:4px solid ${noteColor};border-radius:var(--radius-md);padding:14px;position:relative;box-shadow:var(--shadow-sm);border:var(--glass-border);">
                <p style="font-size:13px;line-height:1.6;margin:0 0 12px;color:var(--text-main);">${escapeHtml(note.text)}</p>
                <div style="display:flex;gap:8px;justify-content:flex-end;">
                    <button class="dig-note-edit" data-idx="${idx}" style="background:transparent;border:1px solid var(--glass-border-color);border-radius:var(--radius-sm);padding:4px 10px;cursor:pointer;font-size:10px;color:var(--text-muted);font-weight:700;">EDIT</button>
                    <button class="dig-note-del" data-idx="${idx}" style="background:rgba(239, 68, 68, 0.1);border:1px solid rgba(239, 68, 68, 0.2);color:#ef4444;border-radius:var(--radius-sm);padding:4px 10px;cursor:pointer;font-size:10px;font-weight:700;">DELETE</button>
                </div>
            </div>`;
        });
        html += `</div>`;
    }
    container.innerHTML = html;
    document.getElementById('dig-notes-add').onclick = () => {
        const text = prompt('Enter note text:');
        if (!text) return;
        if (!bucket.stickyNotes) bucket.stickyNotes = [];
        bucket.stickyNotes.push({ text, color: '#fef08a', x: 100, y: 100 });
        saveStickyNotesForPage(bucket.stickyNotes, () => renderNotesTab(container));
    };
    container.querySelectorAll('.dig-note-edit').forEach(btn => {
        btn.onclick = () => {
            const idx = parseInt(btn.dataset.idx);
            const note = notes[idx];
            const newText = prompt('Edit note:', note.text);
            if (newText !== null) note.text = newText;
            saveStickyNotesForPage(notes, () => renderNotesTab(container));
        };
    });
    container.querySelectorAll('.dig-note-del').forEach(btn => {
        btn.onclick = () => {
            notes.splice(parseInt(btn.dataset.idx), 1);
            saveStickyNotesForPage(notes, () => renderNotesTab(container));
        };
    });
}
