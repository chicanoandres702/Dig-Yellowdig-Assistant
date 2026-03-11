/* Vendored Ajv stub: minimal Ajv constructor used when full Ajv bundle is absent.
   The real project bundles a full Ajv in production; this lightweight stub
   prevents service-worker import failures during development or trimmed builds. */

class AjvStub {
  constructor(opts) { this.opts = opts || {}; }
  validate() { return true; }
}

// Expose constructor on global so code that checks `globalThis.Ajv` will find it.
globalThis.Ajv = AjvStub;

export default AjvStub;
