(function (global) {
  global.DigSidebarComponents = global.DigSidebarComponents || {};
  const ns = global.DigSidebarComponents;
  ns.components = ns.components || {};

  function createScanBlock(opts = {}) {
    const id = opts.id || '';
    const text = opts.text || '';
    const meta = opts.meta || {};

    const block = document.createElement('div');
    block.className = 'scan-block';
    if (id) block.dataset.scanId = id;

    const idEl = document.createElement('div');
    idEl.className = 'scan-id';
    idEl.textContent = id || '';

    const txt = document.createElement('div');
    txt.className = 'scan-text';
    txt.textContent = text;

    block.appendChild(idEl);
    block.appendChild(txt);

    return block;
  }

  ns.components.ScanBlock = ns.components.ScanBlock || {};
  ns.components.ScanBlock.create = createScanBlock;
})(window);
