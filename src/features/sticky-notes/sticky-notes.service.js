/**
 * Notes Tab: Sidebar-integrated sticky notes manager.
 */
function renderNotesTab(container) {
    const bucket = classBuckets[detectedClass]?.[detectedWeek];
    const notes = bucket?.stickyNotes || [];
    let html = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
    <span style="font-size:12px;color:#888;">${notes.length} note(s)</span>
    <button id="dig-notes-add" style="background:${PRIMARY_COLOR};color:white;border:none;border-radius:4px;padding:4px 10px;cursor:pointer;font-size:11px;">+ Add Note</button>
  </div>`;
    if (!notes.length) {
        html += `<div style="text-align:center;padding:30px;color:#666;">
      <div style="font-size:32px;margin-bottom:8px;">📌</div>
      <p style="font-size:12px;">No notes yet. Click "Add Note" to start.</p>
    </div>`;
    } else {
        notes.forEach((note, idx) => {
            html += `<div style="background:${note.color || '#fef08a'};border-radius:6px;padding:10px;margin-bottom:8px;position:relative;">
        <p style="font-size:13px;margin:0 0 6px;">${note.text}</p>
        <div style="display:flex;gap:4px;">
          <button class="dig-note-edit" data-idx="${idx}" style="background:white;border:1px solid #ddd;border-radius:3px;padding:2px 8px;cursor:pointer;font-size:10px;">✎ Edit</button>
          <button class="dig-note-del" data-idx="${idx}" style="background:#ef4444;color:white;border:none;border-radius:3px;padding:2px 8px;cursor:pointer;font-size:10px;">✕</button>
        </div>
      </div>`;
        });
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
