/**
 * Context Menu Handler: Listens for context menu events and populates Draft UI.
 */
function initContextMenuHandler() {
    window.addEventListener('message', async (e) => {
        if (e.data && e.data.type === 'DIG_CONTEXT_REPLY') {
            const { author, text } = e.data.payload;

            // Switch to Draft Tab
            if (typeof switchTab === 'function') {
                switchTab('Draft');
            }

            // Populate fields
            const nameInp = document.getElementById('dig-detectedName');
            const promptArea = document.getElementById('dig-draft-mainPrompt');
            const advanced = document.getElementById('dig-draft-advanced');

            if (nameInp) nameInp.value = author;
            if (promptArea) promptArea.value = text;

            // Show advanced if needed (to see detected name)
            if (advanced) advanced.style.display = 'block';

            // Visual feedback
            const status = document.getElementById('dig-draft-postStatus');
            if (status) {
                status.innerText = 'Content captured from peer...';
                setTimeout(() => status.innerText = '', 3000);
            }
        }
    });
}
