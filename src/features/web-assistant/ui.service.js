// UI helpers for web-assistant
export function showToast(text, type) {
    try {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        const el = document.createElement('div');
        el.className = 'toast ' + (type || '');
        el.innerText = text;
        container.appendChild(el);
        // Force reflow to allow transition
        void el.offsetWidth;
        el.classList.add('show');
        setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 3500);
    } catch (e) { /* ignore */ }
}

export function showRefineModal(id) {
    try { const el = document.getElementById(`refine-modal-${id}`); if (el) el.style.display = 'flex'; } catch (e) { /* ignore */ }
}
export function closeRefineModal(id) {
    try { const el = document.getElementById(`refine-modal-${id}`); if (el) el.style.display = 'none'; } catch (e) { /* ignore */ }
}

// Expose to window for backward compatibility
try {
    if (typeof window !== 'undefined') {
        window.showToast = showToast;
        window.showRefineModal = showRefineModal;
        window.closeRefineModal = closeRefineModal;
    }
} catch (e) { /* ignore */ }
