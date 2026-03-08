/**
 * Draft Utilities: Helping the Draft Tab manage KB context.
 */
function getKBSources() {
    let kb = {};
    try { kb = JSON.parse(localStorage.getItem('digKnowledgeBase') || '{}'); } catch (e) { return []; }
    const sources = [];
    Object.keys(kb).forEach(cls => {
        Object.keys(kb[cls]).forEach(topic => { sources.push({ cls, topic, count: kb[cls][topic].length }); });
    });
    return sources;
}

function buildFilteredKBContext(container) {
    let kb = {};
    try { kb = JSON.parse(localStorage.getItem('digKnowledgeBase') || '{}'); } catch (e) { return ''; }
    let context = '';
    container.querySelectorAll('.dig-kb-toggle:checked').forEach(cb => {
        const items = kb[cb.dataset.cls]?.[cb.dataset.topic] || [];
        items.forEach(item => {
            context += `[${cb.dataset.cls}/${cb.dataset.topic}] ${item.text.substring(0, 300)}\n`;
        });
    });
    return context || 'No sources selected.';
}
