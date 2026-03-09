/**
 * Floating Toolbar: Quick-access controls overlaid on the VitalSource reader.
 * Why: Users need Save/Scan/Navigate controls accessible without opening the sidebar
 * panel, especially during rapid auto-scan sessions.
 */

const TOOLBAR_STYLES = `
#dig-floating-toolbar {
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 2147483647;
    background: var(--glass-emerald);
    backdrop-filter: var(--glass-blur) saturate(180%);
    -webkit-backdrop-filter: var(--glass-blur) saturate(180%);
    border: var(--border-emerald);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    padding: 10px 18px;
    border-radius: 24px;
    display: flex;
    gap: 12px;
    align-items: center;
    transition: all 0.3s var(--transition-standard);
}
#dig-floating-toolbar:hover {
    background: hsla(158, 80%, 10%, 0.95);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
    bottom: 26px;
}
#dig-floating-toolbar button {
    border: none;
    border-radius: 12px;
    width: 40px;
    height: 40px;
    cursor: pointer;
    background: transparent;
    color: var(--emerald-400);
    transition: all 0.2s var(--transition-standard);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
}
#dig-floating-toolbar button:hover {
    background: hsla(158, 80%, 50%, 0.1);
    color: var(--emerald-50);
    transform: translateY(-2px);
}
#dig-floating-toolbar button.active {
    background: hsla(158, 80%, 50%, 0.2);
    color: var(--emerald-50);
}
#dig-floating-toolbar .dig-toolbar-status {
    position: absolute;
    bottom: 115%;
    left: 50%;
    transform: translateX(-50%);
    background: var(--emerald-600);
    color: white;
    padding: 6px 12px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 500;
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transition: all 0.3s var(--transition-standard);
}
#dig-floating-toolbar .dig-toolbar-status.show {
    opacity: 1;
    transform: translateX(-50%) translateY(-6px);
}
`;

function createFloatingToolbar() {
    try {
        if (document.getElementById('dig-floating-toolbar')) return;

        chrome.storage.local.get({ 'dig_show_floating_toolbar': true }, (res) => {
            if (!res.dig_show_floating_toolbar) return;
            _renderFloatingToolbar();
        });

        chrome.storage.onChanged.addListener((changes, area) => {
            if (area === 'local' && changes.dig_show_floating_toolbar) {
                if (changes.dig_show_floating_toolbar.newValue) {
                    _renderFloatingToolbar();
                } else {
                    const tb = document.getElementById('dig-floating-toolbar');
                    if (tb) tb.remove();
                }
            }
        });
    } catch (e) { console.warn('createFloatingToolbar failed', e); }
}

function _renderFloatingToolbar() {
    try {
        if (document.getElementById('dig-floating-toolbar')) return;
        _initDefaultSharedPref();
        _injectToolbarStyles();
        const toolbar = _buildToolbarContainer();
        const status = _addToolbarButtons(toolbar);
        document.body.appendChild(toolbar);
        _addToolbarDrag(toolbar);
        _bindToolbarEvents(toolbar, status);
    } catch (e) { console.warn('_renderFloatingToolbar failed', e); }
}

function _initDefaultSharedPref() {
    try {
        const cur = localStorage.getItem('dig_default_save_use_shared');
        if (cur === null || cur === undefined) localStorage.setItem('dig_default_save_use_shared', 'true');
    } catch (e) { }
}

function _injectToolbarStyles() {
    if (document.getElementById('dig-dig-toolbar-styles')) return;
    const s = document.createElement('style');
    s.id = 'dig-dig-toolbar-styles';
    s.textContent = TOOLBAR_STYLES;
    document.head.appendChild(s);
}

function _buildToolbarContainer() {
    const t = document.createElement('div');
    t.id = 'dig-floating-toolbar';
    t.setAttribute('role', 'region');
    t.setAttribute('aria-label', 'Dig assistant toolbar');
    t.tabIndex = 0;
    return t;
}
