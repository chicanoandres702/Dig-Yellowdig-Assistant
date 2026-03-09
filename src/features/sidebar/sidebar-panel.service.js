/**
 * Sidebar panel shell with tab navigation and FAB toggle.
 */
const SIDEBAR_WIDTH = '360px';
const SIDEBAR_ID = 'dig-sidebar';
const FAB_ID = 'dig-fab';
const TABS = ['Scan', 'Knowledge', 'Draft', 'Notes', 'Settings', 'Debug'];
const TAB_ICONS = ['📡', '📚', '✍️', '📌', '⚙️', '🔧'];

function ensureSidebarStyles() {
    if (document.getElementById('dig-sidebar-styles')) return;

    // Inject Fonts (Share Tech Mono, Orbitron, Rajdhani) used by the Academic Hub theme
    const fontLink = document.createElement('link');
    fontLink.rel = 'stylesheet';
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Orbitron:wght@400;600;700;900&family=Rajdhani:wght@300;400;500;600;700&display=swap';
    document.head.appendChild(fontLink);

    // Inject base theme CSS
    const themeLink = document.createElement('link');
    themeLink.id = 'dig-theme-styles';
    themeLink.rel = 'stylesheet';
    themeLink.href = chrome.runtime.getURL('src/core/styles/theme.css');
    document.head.appendChild(themeLink);

    // Inject sidebar-specific Academic Hub theme
    const sidebarTheme = document.createElement('link');
    sidebarTheme.id = 'dig-sidebar-theme';
    sidebarTheme.rel = 'stylesheet';
    sidebarTheme.href = chrome.runtime.getURL('src/features/sidebar/sidebar-theme.css');
    document.head.appendChild(sidebarTheme);

    const style = document.createElement('style');
    style.id = 'dig-sidebar-styles';
    style.textContent = `
:root {
    --dig-sidebar-width: ${SIDEBAR_WIDTH};
}

body.dig-sidebar-open {
    padding-right: var(--dig-sidebar-width) !important;
}

body {
    transition: padding-right 0.3s var(--transition-standard) !important;
}

#\${SIDEBAR_ID} {
    box-shadow: -10px 0 30px rgba(0,0,0,0.2) !important;
    border-left: var(--border-glass);
    background: var(--bg-panel) !important;
    backdrop-filter: var(--glass-blur) saturate(180%);
    -webkit-backdrop-filter: var(--glass-blur) saturate(180%);
    color: var(--emerald-50);
    transition: right 0.4s var(--transition-standard);
    border-radius: var(--radius-lg) 0 0 var(--radius-lg);
}

.dig-sidebar-header {
    background: var(--glass-emerald-light);
    border-bottom: var(--border-glass);
    position: relative;
    overflow: hidden;
}

.dig-tab {
    transition: all 0.3s var(--transition-standard);
    color: var(--emerald-400);
    opacity: 0.7;
}

.dig-tab:hover:not(.active) {
    background: hsla(158, 80%, 50%, 0.1) !important;
    opacity: 1;
    transform: translateY(-1px);
}

.dig-tab.active {
    background: hsla(158, 80%, 50%, 0.2) !important;
    color: var(--emerald-50);
    opacity: 1;
    border-bottom: 2px solid var(--emerald-400);
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
}

.dig-tab svg {
    transition: transform 0.3s var(--transition-standard);
}

.dig-tab.active svg {
    filter: drop-shadow(0 0 2px var(--emerald-400));
}
`;
    document.head.appendChild(style);

// Inject component scripts for the sidebar if they aren't already loaded.
function ensureSidebarComponentsInjected() {
    try {
        if (window.__dig_sidebar_components_injected) return;
        const base = 'src/features/sidebar/components/';
        const files = ['panel.component.js','tab.component.js','scan-block.component.js','feed.component.js','draft.component.js','index.js'];
        files.forEach(f => {
            const id = 'dig-comp-' + f.replace(/[^a-z0-9\.\-]/gi, '-');
            if (document.getElementById(id)) return;
            const s = document.createElement('script');
            s.id = id;
            s.type = 'text/javascript';
            try { s.src = chrome.runtime.getURL(base + f); } catch (e) { s.src = base + f; }
            s.defer = true;
            document.head.appendChild(s);
        });
        window.__dig_sidebar_components_injected = true;
    } catch (e) { /* non-blocking */ }
}
// expose the injector globally to avoid ReferenceError from other snapshots that call it
try { window.ensureSidebarComponentsInjected = ensureSidebarComponentsInjected; } catch (e) { /* ignore */ }
}

function createSidebar() {
    if (window !== window.top) return;
    ensureSidebarStyles();
    // Try to ensure component scripts are injected. Prefer the globally-exposed helper when
    // available, otherwise perform a safe inline injection as fallback. Use the `window.`
    // reference to avoid calling an identifier that may not be declared in this scope
    // (which would cause a ReferenceError when invoked).
    try {
        if (typeof window !== 'undefined' && typeof window.ensureSidebarComponentsInjected === 'function') {
            try { window.ensureSidebarComponentsInjected(); } catch (e) { /* non-blocking */ }
        } else {
            // Inline fallback injector
            if (!window.__dig_sidebar_components_injected) {
                try {
                    const base = 'src/features/sidebar/components/';
                    const files = ['panel.component.js','tab.component.js','scan-block.component.js','feed.component.js','draft.component.js','index.js'];
                    files.forEach(f => {
                        const id = 'dig-comp-' + f.replace(/[^a-z0-9\.\-]/gi, '-');
                        if (document.getElementById(id)) return;
                        const s = document.createElement('script');
                        s.id = id;
                        s.type = 'text/javascript';
                        try { s.src = chrome.runtime.getURL(base + f); } catch (e) { s.src = base + f; }
                        s.defer = true;
                        document.head.appendChild(s);
                    });
                    window.__dig_sidebar_components_injected = true;
                } catch (e) { /* non-blocking */ }
            }
        }
    } catch (e) {
        // If something unexpected happens, continue without components to avoid breaking the page
        console.warn('ensureSidebarComponentsInjected failed (continuing without components):', e);
    }
    if (document.getElementById(SIDEBAR_ID)) return;
    // Prefer component-based creation when available (non-breaking)
    let sidebar;
    try {
        if (window.DigSidebarComponents && typeof window.DigSidebarComponents.createPanel === 'function') {
            const panel = window.DigSidebarComponents.createPanel({ id: SIDEBAR_ID, title: 'Academic Hub', width: SIDEBAR_WIDTH });
            sidebar = panel && panel.root ? panel.root : document.getElementById(SIDEBAR_ID);

            // ensure theme class is present
            if (sidebar && !sidebar.classList.contains('dig-amazing-theme')) sidebar.classList.add('dig-amazing-theme');

            // Apply positioning and layout styles (keep width from panel factory)
            sidebar.style.position = 'fixed';
            sidebar.style.top = '0';
            sidebar.style.right = `-${SIDEBAR_WIDTH}`;
            sidebar.style.width = SIDEBAR_WIDTH;
            sidebar.style.height = '100vh';
            sidebar.style.zIndex = '2147483646';
            sidebar.style.transition = 'right 0.5s var(--ease-out-quint)';
            sidebar.style.display = 'flex';
            sidebar.style.flexDirection = 'column';

            // Replace or inject header markup so we keep the exact header structure expected by listeners
            const existingHdr = sidebar.querySelector('.panel-hdr');
            if (existingHdr) {
                existingHdr.outerHTML = buildSidebarHeader();
            } else {
                sidebar.insertAdjacentHTML('afterbegin', buildSidebarHeader());
            }

            // Ensure we have a panel inner area and populate it with tab bar + content container
            let inner = sidebar.querySelector('.panel-inner');
            if (!inner) {
                inner = document.createElement('div');
                inner.className = 'panel-inner';
                sidebar.appendChild(inner);
            }

            // Prefer TabBar component when available
            if (window.DigSidebarComponents && window.DigSidebarComponents.components && typeof window.DigSidebarComponents.components.TabBar?.create === 'function') {
                const tabInst = window.DigSidebarComponents.components.TabBar.create({ tabs: TABS, active: 0 });
                inner.appendChild(tabInst.root);
                // store the tab instance on the sidebar element for later programmatic control
                try { sidebar.__dig_tabInst = tabInst; } catch (e) { /* non-breaking */ }
            } else {
                inner.insertAdjacentHTML('beforeend', buildTabBar());
            }

            const contentDiv = document.createElement('div');
            contentDiv.id = 'dig-tab-content';
            contentDiv.style.cssText = 'flex:1;overflow-y:auto;padding:16px;';
            inner.appendChild(contentDiv);
        } else {
            // Fallback: original behavior
            sidebar = document.createElement('div');
            sidebar.id = SIDEBAR_ID;
            sidebar.className = 'dig-amazing-theme side-panel';
            sidebar.style.cssText = `position:fixed;top:0;right:-${SIDEBAR_WIDTH};width:${SIDEBAR_WIDTH};height:100vh;z-index:2147483646;transition:right 0.5s var(--ease-out-quint);display:flex;flex-direction:column;`;
            sidebar.innerHTML = buildSidebarHeader() + buildTabBar() + '<div id="dig-tab-content" style="flex:1;overflow-y:auto;padding:16px;"></div>';
            document.body.appendChild(sidebar);
        }

        // Add Aurora Backdrop (append inside sidebar so it only covers the sidebar)
        const aurora = document.createElement('div');
        aurora.className = 'bg-aurora';
        aurora.innerHTML = '<div class="bg-orb bg-orb-1"></div><div class="bg-orb bg-orb-2"></div>';
        sidebar.appendChild(aurora);

        // If the panel factory didn't append the sidebar, ensure it's in the document
        if (!document.body.contains(sidebar)) document.body.appendChild(sidebar);

        createFAB();
        attachTabListeners();
    } catch (e) {
        // In case of any unexpected error, fallback to original creation to avoid breaking the page
        console.error('createSidebar: component-based creation failed, falling back', e);
        const fallback = document.createElement('div');
        fallback.id = SIDEBAR_ID;
        fallback.className = 'dig-amazing-theme side-panel';
        fallback.style.cssText = `position:fixed;top:0;right:-${SIDEBAR_WIDTH};width:${SIDEBAR_WIDTH};height:100vh;z-index:2147483646;transition:right 0.5s var(--ease-out-quint);display:flex;flex-direction:column;`;
        fallback.innerHTML = buildSidebarHeader() + buildTabBar() + '<div id="dig-tab-content" style="flex:1;overflow-y:auto;padding:16px;"></div>';
        const aurora = document.createElement('div');
        aurora.className = 'bg-aurora';
        aurora.innerHTML = '<div class="bg-orb bg-orb-1"></div><div class="bg-orb bg-orb-2"></div>';
        fallback.appendChild(aurora);
        document.body.appendChild(fallback);
        createFAB();
        attachTabListeners();
    }
}

function refreshSidebar() {
    const content = document.getElementById('dig-tab-content');
    if (!content) return;
    const activeBtn = document.querySelector('.dig-tab[style*="border-bottom"]');
    if (activeBtn) switchTab(activeBtn.dataset.tab);
}

function buildSidebarHeader() {
        return `<div class="panel-hdr">
            <div>
                <div class="panel-hdr-title">Academic Hub</div>
                <div class="panel-hdr-sub">// ASSISTANT SUBSYSTEM //</div>
            </div>
            <button id="dig-sidebar-close" class="panel-close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
        </div>`;
}

function buildTabBar() {
    const ICONS = {
        'Scan': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
        'Knowledge': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
        'Draft': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>',
        'Notes': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>',
        'Debug': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>'
    };
    let html = '<div id="dig-tab-bar" class="tab-bar">';
    TABS.forEach((tab, i) => {
        const activeClass = i === 0 ? 'active' : '';
        html += `<button class="dig-tab tab ${activeClass}" data-tab="${tab}">
            <div class="tab-icon">${ICONS[tab] || ''}</div>
            <span class="tab-label">${tab}</span>
        </button>`;
    });
    return html + '</div>';
}

function attachTabListeners() {
    document.getElementById('dig-sidebar-close').onclick = toggleSidebar;
    // Prefer event delegation when a TabBar component instance exists
    try {
        const sb = document.getElementById(SIDEBAR_ID);
        if (sb && sb.__dig_tabInst && sb.__dig_tabInst.root) {
            // delegate clicks from the TabBar root
            sb.__dig_tabInst.root.addEventListener('click', (e) => {
                const btn = e.target.closest && e.target.closest('.dig-tab');
                if (btn && btn.dataset && btn.dataset.tab) switchTab(btn.dataset.tab);
            });
        } else {
            document.querySelectorAll('.dig-tab').forEach(btn => {
                btn.onclick = () => switchTab(btn.dataset.tab);
            });
        }
    } catch (e) {
        // fallback to simple per-button wiring
        document.querySelectorAll('.dig-tab').forEach(btn => {
            btn.onclick = () => switchTab(btn.dataset.tab);
        });
    }
    switchTab('Scan');

    // Attach Yellowdig mode controls (select + Dig button) when present
    try {
        (function attachYellowdigControls() {
            const tryAttach = () => {
                const sel = document.getElementById('dig-yellowdig-mode');
                const digBtn = document.getElementById('dig-sidebar-dig');
                if (!sel && !digBtn) { setTimeout(tryAttach, 300); return; }
                try {
                    const current = localStorage.getItem('dig_yellowdig_mode') || 'post';
                    if (sel) { sel.value = current; sel.onchange = (e) => localStorage.setItem('dig_yellowdig_mode', e.target.value); }
                    if (digBtn) {
                        digBtn.onclick = () => {
                            const mode = (sel ? sel.value : (localStorage.getItem('dig_yellowdig_mode') || 'post'));
                            // prefer to include a class/page hint when opening the response tool
                            const clsHint = (typeof localStorage !== 'undefined' && localStorage.getItem('dig_last_class')) || (typeof window !== 'undefined' && window.detectedClass) || '';
                            const pageHint = (typeof window !== 'undefined' && window.location && window.location.href) ? window.location.href : '';
                            // Prefer asking the background to open the extension page (avoids calling chrome.runtime.getURL in page context)
                            try {
                                if (window.chrome && chrome.runtime && chrome.runtime.sendMessage) {
                                    try { chrome.runtime.sendMessage({ type: 'OPEN_RESPONSE_TOOL', mode, cls: clsHint, pageUrl: pageHint }); return; } catch (e) { /* fallthrough to fallback */ }
                                }
                            } catch (e) { /* ignore */ }

                            // Fallback: attempt to construct a URL safely and open it
                            let fallbackUrl = 'response-tool.html?mode=' + encodeURIComponent(mode) + '&cls=' + encodeURIComponent(clsHint || '') + '&pageUrl=' + encodeURIComponent(pageHint || '');
                            try {
                                if (window.chrome && chrome.runtime && chrome.runtime.getURL) {
                                    try { fallbackUrl = chrome.runtime.getURL('response-tool.html') + '?mode=' + encodeURIComponent(mode) + '&cls=' + encodeURIComponent(clsHint || '') + '&pageUrl=' + encodeURIComponent(pageHint || ''); } catch (e) { /* ignore */ }
                                }
                            } catch (err) { /* ignore */ }

                            try { window.open(fallbackUrl, '_blank'); } catch (e) { try { window.location.href = fallbackUrl; } catch (_) { /* last-resort ignore */ } }
                        };
                    }
                } catch (e) { /* ignore */ }
            };
            setTimeout(tryAttach, 300);
        })();
    } catch (e) { }
}

async function switchTab(tabName) {
    // If a TabBar component instance exists on the sidebar, prefer using its API to set the active tab
    try {
        const sb = document.getElementById(SIDEBAR_ID);
        if (sb && sb.__dig_tabInst && typeof sb.__dig_tabInst.setActive === 'function') {
            sb.__dig_tabInst.setActive(tabName);
        }
    } catch (e) { /* non-blocking */ }

    document.querySelectorAll('.dig-tab').forEach(btn => {
        const isActive = btn.dataset.tab === tabName;
        if (isActive) btn.classList.add('active');
        else btn.classList.remove('active');
    });
    const content = document.getElementById('dig-tab-content');
    if (tabName === 'Scan') await renderScanTab(content);
    else if (tabName === 'Knowledge') renderKnowledgeTab(content);
    else if (tabName === 'Draft') renderDraftTab(content);
    else if (tabName === 'Notes') renderNotesTab(content);
    else if (tabName === 'Settings') {
        if (typeof renderSettingsTab === 'function') await renderSettingsTab(content);
    }
    else if (tabName === 'Debug') renderDebugTab(content);
}

function createFAB() {
    if (window !== window.top) return;

    chrome.storage.local.get({ 'dig_show_fab': true }, (res) => {
        if (!res.dig_show_fab) return;
        _renderFAB();
    });

    // Listen for setting changes
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes.dig_show_fab) {
            if (changes.dig_show_fab.newValue) {
                _renderFAB();
            } else {
                const fab = document.getElementById(FAB_ID);
                if (fab) fab.remove();
            }
        }
    });
}

function _renderFAB() {
    if (document.getElementById(FAB_ID)) return;

    const fab = document.createElement('button');
    fab.id = FAB_ID;
    fab.className = 'dig-amazing-theme';
    fab.innerHTML = '<span style="position:relative;z-index:1;">📖</span>';
    fab.style.cssText = `position:fixed;bottom:24px;right:24px;width:56px;height:56px;border-radius:50%;background:var(--emerald-600);color:white;border:1px solid rgba(255,255,255,0.1);font-size:24px;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:2147483647;transition:all 0.3s var(--transition-standard);display:flex;align-items:center;justify-content:center;`;

    fab.onmouseenter = () => {
        fab.style.transform = 'translateY(-2px)';
        fab.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)';
    };
    fab.onmouseleave = () => {
        fab.style.transform = 'translateY(0)';
        fab.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    };
    fab.onclick = toggleSidebar;
    document.body.appendChild(fab);
}

function openSidebar() {
    const sidebar = document.getElementById(SIDEBAR_ID);
    if (!sidebar) return;
    sidebar.style.right = '0';
    document.body.classList.add('dig-sidebar-open');
    document.documentElement.classList.add('dig-sidebar-open');

    if (typeof _handleSidebarOpen === 'function') {
        _handleSidebarOpen();
    }
}

function closeSidebar() {
    const sidebar = document.getElementById(SIDEBAR_ID);
    if (!sidebar) return;
    sidebar.style.right = `-${SIDEBAR_WIDTH}`;
    document.body.classList.remove('dig-sidebar-open');
    document.documentElement.classList.remove('dig-sidebar-open');
}

function toggleSidebar() {
    const s = document.getElementById(SIDEBAR_ID);
    if (!s) return;
    const isOpen = s.style.right === '0px';
    if (!isOpen) {
        openSidebar();
    } else {
        closeSidebar();
    }
}


