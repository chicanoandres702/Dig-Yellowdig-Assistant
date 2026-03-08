/**
 * Sidebar panel shell with tab navigation and FAB toggle.
 */
const SIDEBAR_WIDTH = '360px';
const SIDEBAR_ID = 'dig-sidebar';
const FAB_ID = 'dig-fab';
const TABS = ['Scan', 'Knowledge', 'Draft', 'Notes', 'Debug'];
const TAB_ICONS = ['📡', '📚', '✍️', '📌', '🔧'];

function createSidebar() {
    if (window !== window.top) return;
    if (document.getElementById(SIDEBAR_ID)) return;

    const sidebar = document.createElement('div');
    sidebar.id = SIDEBAR_ID;
    sidebar.style.cssText = `position:fixed;top:0;right:-${SIDEBAR_WIDTH};width:${SIDEBAR_WIDTH};height:100vh;background:#fff;box-shadow:-4px 0 20px rgba(0,0,0,0.08);z-index:2147483646;font-family:system-ui,-apple-system,sans-serif;transition:right 0.3s ease;display:flex;flex-direction:column;`;
    sidebar.innerHTML = buildSidebarHeader() + buildTabBar() + '<div id="dig-tab-content" style="flex:1;overflow-y:auto;padding:12px;"></div>';
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
    return `<div style="background:${DARK_COLOR};color:white;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;">
    <span style="font-weight:bold;font-size:15px;">Academic Assistant</span>
    <button id="dig-sidebar-close" style="background:none;border:none;color:white;font-size:18px;cursor:pointer;">✕</button>
  </div>`;
}

function buildTabBar() {
    let html = '<div id="dig-tab-bar" style="display:flex;border-bottom:2px solid #e2e8f0;overflow-x:auto;">';
    TABS.forEach((tab, i) => {
        const active = i === 0 ? `background:#f0fdf4;border-bottom:2px solid ${PRIMARY_COLOR};font-weight:bold;` : '';
        html += `<button class="dig-tab" data-tab="${tab}" style="flex:1;padding:10px 4px;border:none;background:white;cursor:pointer;font-size:11px;min-width:65px;${active}">${TAB_ICONS[i]} ${tab}</button>`;
    });
    return html + '</div>';
}

function attachTabListeners() {
    document.getElementById('dig-sidebar-close').onclick = toggleSidebar;
    document.querySelectorAll('.dig-tab').forEach(btn => {
        btn.onclick = () => switchTab(btn.dataset.tab);
    });
    switchTab('Scan');
}

function switchTab(tabName) {
    document.querySelectorAll('.dig-tab').forEach(btn => {
        const isActive = btn.dataset.tab === tabName;
        btn.style.background = isActive ? '#f0fdf4' : 'white';
        btn.style.borderBottom = isActive ? `2px solid ${PRIMARY_COLOR}` : 'none';
        btn.style.fontWeight = isActive ? 'bold' : 'normal';
    });
    const content = document.getElementById('dig-tab-content');
    if (tabName === 'Scan') renderScanTab(content);
    else if (tabName === 'Knowledge') renderKnowledgeTab(content);
    else if (tabName === 'Draft') renderDraftTab(content);
    else if (tabName === 'Notes') renderNotesTab(content);
    else if (tabName === 'Debug') renderDebugTab(content);
}

function createFAB() {
    if (window !== window.top) return;
    if (document.getElementById(FAB_ID)) return;

    const fab = document.createElement('button');
    fab.id = FAB_ID;
    fab.innerText = '📖';
    fab.style.cssText = `position:fixed;bottom:24px;right:24px;width:48px;height:48px;border-radius:50%;background:${PRIMARY_COLOR};color:white;border:none;font-size:22px;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:2147483647;transition:transform 0.2s;`;
    fab.onmouseenter = () => fab.style.transform = 'scale(1.1)';
    fab.onmouseleave = () => fab.style.transform = 'scale(1)';
    fab.onclick = toggleSidebar;
    document.body.appendChild(fab);
}

function toggleSidebar() {
    const s = document.getElementById(SIDEBAR_ID);
    if (!s) return;
    const isOpen = s.style.right === '0px';
    const nextOpen = !isOpen;
    s.style.right = nextOpen ? '0px' : `-${SIDEBAR_WIDTH}`;

    // Shift body for responsiveness
    document.body.style.transition = 'margin-right 0.3s ease';
    document.documentElement.style.transition = 'margin-right 0.3s ease';
    document.body.style.marginRight = nextOpen ? SIDEBAR_WIDTH : '0';
    document.documentElement.style.marginRight = nextOpen ? SIDEBAR_WIDTH : '0';
    document.documentElement.style.overflowX = nextOpen ? 'hidden' : '';
}


