/**
 * Floating Toolbar Handlers: Click handler implementations for each toolbar button.
 * Why: Kept separate to avoid exceeding 100 lines per file.
 */

function _handleToolbarAutoScan(btn, flash) {
    try {
        const t = document.getElementById('dig-tab-content');
        if (typeof startAutoScan === 'function') {
            startAutoScan(t);
            setTimeout(() => {
                const active = !!(window.isAutoScanning);
                btn.classList.toggle('active', active);
                flash(active ? 'Auto scanning' : 'Auto stopped');
            }, 100);
        } else flash('Scanner unavailable');
    } catch (e) { flash('Auto error'); }
}

function _handleToolbarSummarize(flash) {
    try {
        if (typeof switchTab === 'function') {
            switchTab('Draft');
            // Logic to trigger summary in draft tab if available
            flash('Summarizing...');
        } else flash('Draft unavailable');
    } catch (e) { flash('Summary error'); }
}

function _handleToolbarChat(flash) {
    try {
        if (typeof switchTab === 'function') {
            switchTab('Draft'); // Assuming chat is in or near Draft/AI tab
            flash('Chat opened');
        } else flash('Chat unavailable');
    } catch (e) { flash('Chat error'); }
}

function _handleToolbarPick(flash) {
    try {
        if (typeof startBookPicking === 'function') {
            startBookPicking(document.getElementById('dig-tab-content'));
            flash('Picking...');
        } else flash('Picker unavailable');
    } catch (e) { flash('Pick failed'); }
}

function _handleToolbarKB(flash) {
    try {
        if (typeof switchTab === 'function') {
            switchTab('Knowledge');
            flash('KB open');
        } else flash('KB unavailable');
    } catch (e) { flash('KB error'); }
}
