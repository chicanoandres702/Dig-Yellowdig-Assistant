"use strict";
(self.webpackChunkagentic_browser_v2 = self.webpackChunkagentic_browser_v2 || []).push([
  [1],
  [, (e, s, t) => {
    t.r(s), t.d(s, {
      BrowserWebSocketTransport: () => n
    });
    class n {
      static create(e) {
        return new Promise(((s, t) => {
          const r = new WebSocket(e);
          r.addEventListener("open", (() => s(new n(r)))), r.addEventListener("error", t)
        }))
      }
      #e;
      onmessage;
      onclose;
      constructor(e) {
        this.#e = e, this.#e.addEventListener("message", (e => {
          this.onmessage && this.onmessage.call(null, e.data)
        })), this.#e.addEventListener("close", (() => {
          this.onclose && this.onclose.call(null)
        })), this.#e.addEventListener("error", (() => {}))
      }
      send(e) {
        this.#e.send(e)
      }
      close() {
        this.#e.close()
      }
    }
  }]
]);
