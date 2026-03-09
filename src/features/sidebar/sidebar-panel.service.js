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

    // Inject Fonts (Sora & DM Mono)
    const fontLink = document.createElement('link');
    fontLink.rel = 'stylesheet';
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=DM+Mono:wght@400;500&display=swap';
    document.head.appendChild(fontLink);

    // Inject Theme CSS
    const themeLink = document.createElement('link');
    themeLink.id = 'dig-theme-styles';
    themeLink.rel = 'stylesheet';
    themeLink.href = chrome.runtime.getURL('src/core/styles/theme.css');
    document.head.appendChild(themeLink);

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
}

function createSidebar() {
    if (window !== window.top) return;
    ensureSidebarStyles();
    if (document.getElementById(SIDEBAR_ID)) return;

    const sidebar = document.createElement('div');
    sidebar.id = SIDEBAR_ID;
    sidebar.className = 'dig-amazing-theme';
    sidebar.style.cssText = `position:fixed;top:0;right:-${SIDEBAR_WIDTH};width:${SIDEBAR_WIDTH};height:100vh;z-index:2147483646;transition:right 0.5s var(--ease-out-quint);display:flex;flex-direction:column;`;
    sidebar.innerHTML = buildSidebarHeader() + buildTabBar() + '<div id="dig-tab-content" style="flex:1;overflow-y:auto;padding:16px;"></div>';

    // Add Aurora Backdrop
    const aurora = document.createElement('div');
    aurora.className = 'bg-aurora';
    aurora.innerHTML = '<div class="bg-orb bg-orb-1"></div><div class="bg-orb bg-orb-2"></div>';
    document.body.appendChild(aurora);

    document.body.appendChild(sidebar);
    createFAB();
    attachTabListeners();
}

function refreshSidebar() {
    const content = document.getElementById('dig-tab-content');
    if (!content) return;
    const activeBtn = document.querySelector('.dig-tab[style*="border-bottom"]');
    if (activeBtn) switchTab(activeBtn.dataset.tab);
}

function buildSidebarHeader() {
    return `<div class="dig-sidebar-header" style="padding:18px 20px 14px;display:flex;justify-content:space-between;align-items:center;position:relative;">
        <div style="display:flex;flex-direction:column;gap:4px;">
            <span style="font-size:9.5px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:var(--emerald-400);background:rgba(16, 185, 129, 0.1);border:1px solid rgba(16, 185, 129, 0.2);padding:3px 9px;border-radius:999px;width:fit-content;">Assistant</span>
            <span style="font-weight:700;font-size:17px;color:var(--emerald-50);letter-spacing:-0.02em;">Academic Hub</span>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
            <button id="dig-sidebar-close" style="width:28px;height:28px;border-radius:8px;border:var(--border-glass);background:rgba(255,255,255,0.05);display:grid;place-items:center;cursor:pointer;transition:all 180ms;color:var(--emerald-400);">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:13px;height:13px;"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
        </div>
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
    let html = '<div id="dig-tab-bar" style="display:flex;gap:4px;padding:12px 16px;border-bottom:var(--border-glass);">';
    TABS.forEach((tab, i) => {
        const activeClass = i === 0 ? 'active' : '';
        html += `<button class="dig-tab ${activeClass}" data-tab="${tab}" style="flex:1;padding:8px 4px;border-radius:12px;border:none;background:transparent;cursor:pointer;font-size:10px;font-weight:700;display:flex;flex-direction:column;align-items:center;gap:6px;text-transform:uppercase;letter-spacing:0.06em;">
            <div style="width:18px;height:18px;">${ICONS[tab] || ''}</div>
            <span>${tab}</span>
        </button>`;
    });
    return html + '</div>';
}

function attachTabListeners() {
    document.getElementById('dig-sidebar-close').onclick = toggleSidebar;
    document.querySelectorAll('.dig-tab').forEach(btn => {
        btn.onclick = () => switchTab(btn.dataset.tab);
    });
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


