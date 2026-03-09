(function (global) {
  global.DigSidebarComponents = global.DigSidebarComponents || {};
  const ns = global.DigSidebarComponents;
  ns.components = ns.components || {};

  function createTabBar(opts = {}) {
    const tabs = opts.tabs || ['Scan', 'Knowledge', 'Draft', 'Notes', 'Settings', 'Debug'];
    const icons = opts.icons || {};
    const active = typeof opts.active === 'undefined' ? 0 : opts.active;

    const bar = document.createElement('div');
    bar.className = 'tab-bar';

    tabs.forEach((tab, i) => {
      const btn = document.createElement('button');
      btn.className = 'dig-tab tab' + (i === active ? ' active' : '');
      btn.dataset.tab = tab;

      const iconWrap = document.createElement('div');
      iconWrap.className = 'tab-icon';
      iconWrap.innerHTML = icons[tab] || '';

      const label = document.createElement('span');
      label.className = 'tab-label';
      label.textContent = tab;

      btn.appendChild(iconWrap);
      btn.appendChild(label);
      bar.appendChild(btn);
    });

    return {
      root: bar,
      setActive: (name) => {
        Array.from(bar.querySelectorAll('.dig-tab')).forEach(b => b.classList.toggle('active', b.dataset.tab === name));
      }
    };
  }

  ns.components.TabBar = ns.components.TabBar || {};
  ns.components.TabBar.create = createTabBar;
})(window);
