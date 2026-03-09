/*
 * Minimal Panel component for the sidebar.
 * Exposes: window.DigSidebarComponents.createPanel(opts)
 */
(function (global) {
  const ns = (global.DigSidebarComponents = global.DigSidebarComponents || {});

  function createPanel(options = {}) {
    const id = options.id || 'dig-sidebar';
    const title = options.title || '';
    const width = options.width || '360px';

    let root = document.getElementById(id);
    const created = !root;
    if (!root) {
      root = document.createElement('div');
      root.id = id;
      root.className = 'side-panel';
      root.style.width = width;
      document.body.appendChild(root);
    } else {
      root.classList.add('side-panel');
    }

    let header = root.querySelector('.panel-hdr');
    if (!header) {
      header = document.createElement('div');
      header.className = 'panel-hdr';

      const label = document.createElement('div');
      label.className = 'panel-label';
      label.textContent = title;

      const close = document.createElement('button');
      close.className = 'panel-close';
      close.setAttribute('aria-label', 'Close sidebar');
      close.innerHTML = '\u2715';

      header.appendChild(label);
      header.appendChild(close);
      root.appendChild(header);

      close.addEventListener('click', () => {
        // notify consumers — listener can hide/remove as desired
        root.dispatchEvent(new CustomEvent('dig:sidebar:close', { bubbles: true }));
      });
    } else {
      const label = header.querySelector('.panel-label');
      if (label) label.textContent = title;
    }

    let inner = root.querySelector('.panel-inner');
    if (!inner) {
      inner = document.createElement('div');
      inner.className = 'panel-inner';
      root.appendChild(inner);
    }

    return {
      root,
      header,
      inner,
      setTitle: (t) => { const l = header.querySelector('.panel-label'); if (l) l.textContent = t; },
      onClose: (fn) => { root.addEventListener('dig:sidebar:close', fn); },
      destroy: () => { if (created && root.parentNode) root.parentNode.removeChild(root); }
    };
  }

  ns.createPanel = createPanel;
})(window);
