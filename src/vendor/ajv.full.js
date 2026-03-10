// Lightweight Ajv stub for development/test environments.
// The real Ajv bundle is optional for some workflows; this stub ensures
// importing './src/vendor/ajv.full.js' won't throw and provides a minimal
// Ajv constructor on the global scope so dependent code can run.
(function(global){
  class AjvStub {
    constructor(opts){ this.opts = opts || {}; }
    validate(schema, data){ return true; }
    compile(schema){ return () => true; }
    errorsText(){ return ''; }
  }
  try {
    if (typeof global !== 'undefined') {
      if (!global.Ajv) global.Ajv = AjvStub;
      if (!global.ajv) global.ajv = new global.Ajv();
    }
  } catch (e) { /* swallow */ }
})(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : {}));
