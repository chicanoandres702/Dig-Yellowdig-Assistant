/**
 * Utility functions for storage and page interaction.
 */
function getPageKey() {
    try {
        return 'dig_sticky_' + (window.location.origin + window.location.pathname).replace(/[#?]/g, '');
    } catch (e) {
        return 'dig_sticky_default';
    }
}

function loadSavedStickyNotes(callback) {
    const key = getPageKey();
    if (window.chrome && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['dig_sticky_notes'], (res) => {
            const map = res.dig_sticky_notes || {};
            callback(map[key] || []);
        });
    } else {
        const saved = localStorage.getItem(key);
        callback(saved ? JSON.parse(saved) : []);
    }
}

function saveStickyNotesForPage(notes, callback) {
    const key = getPageKey();
    if (window.chrome && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['dig_sticky_notes'], (res) => {
            const map = res.dig_sticky_notes || {};
            map[key] = notes;
            chrome.storage.local.set({ dig_sticky_notes: map }, () => {
                if (callback) callback();
            });
        });
    } else {
        const map = JSON.parse(localStorage.getItem('dig_sticky_notes') || '{}');
        map[key] = notes;
        localStorage.setItem('dig_sticky_notes', JSON.stringify(map));
        if (callback) callback();
    }
}
