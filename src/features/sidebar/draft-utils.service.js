/**
 * Draft Utilities: Helping the Draft Tab manage KB context.
 */
function getKBSources() {
    let kb = {};
    try { kb = JSON.parse(localStorage.getItem('digKnowledgeBase') || '{}'); } catch (e) { return []; }
    const sources = [];
    Object.keys(kb).forEach(cls => {
        Object.keys(kb[cls]).forEach(topic => {
            const items = kb[cls][topic];
            const isBook = items.length && items[0].type === 'book-page';
            if (isBook) {
                const chapters = {};
                items.forEach(it => {
                    const ch = it.chapter || 'Unknown';
                    chapters[ch] = (chapters[ch] || 0) + 1;
                });
                sources.push({ cls, topic, count: items.length, isBook: true, chapters });
            } else {
                sources.push({ cls, topic, count: items.length, isBook: false });
            }
        });
    });
    return sources;
}

function buildFilteredKBContext(container) {
    let kb = {};
    try { kb = JSON.parse(localStorage.getItem('digKnowledgeBase') || '{}'); } catch (e) { return ''; }
    let context = '';
    container.querySelectorAll('.dig-kb-toggle:checked').forEach(cb => {
        const cls = cb.dataset.cls;
        const topic = cb.dataset.topic;
        let items = kb[cls]?.[topic] || [];
        if (cb.dataset.chapter) {
            const want = cb.dataset.chapter;
            items = items.filter(i => (i.chapter || 'Unknown') === want);
        }
        items.forEach(item => {
            context += `[${cls}/${topic}] ${item.text.substring(0, 300)}\n`;
        });
    });
    return context || 'No sources selected.';
}
