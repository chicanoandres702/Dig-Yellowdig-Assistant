/*
 * components/index.js
 * Aggregates and exposes sidebar components on window.DigSidebarComponents.components
 */
(function (global) {
  global.DigSidebarComponents = global.DigSidebarComponents || {};
  const ns = global.DigSidebarComponents;
  ns.components = ns.components || {};
  if (ns.createPanel && !ns.components.Panel) ns.components.Panel = { create: ns.createPanel };
})(window);
