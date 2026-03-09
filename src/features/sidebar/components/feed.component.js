(function (global) {
  global.DigSidebarComponents = global.DigSidebarComponents || {};
  const ns = global.DigSidebarComponents;
  ns.components = ns.components || {};

  function createFeed(opts = {}) {
    const root = document.createElement('div');
    root.className = 'scan-feed';

    function addBlock(blockOpts) {
      let blockEl;
      if (blockOpts instanceof HTMLElement) blockEl = blockOpts;
      else blockEl = (ns.components.ScanBlock && ns.components.ScanBlock.create) ? ns.components.ScanBlock.create(blockOpts) : (function(){ const d=document.createElement('div'); d.className='scan-block'; d.textContent = blockOpts.text || ''; return d; })();
      root.appendChild(blockEl);
      return blockEl;
    }

    function clear() { root.innerHTML = ''; }

    return { root, addBlock, clear };
  }

  ns.components.Feed = ns.components.Feed || {};
  ns.components.Feed.create = createFeed;
})(window);
