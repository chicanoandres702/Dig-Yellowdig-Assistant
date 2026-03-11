"use strict";
(self.webpackChunkagentic_browser_v2 = self.webpackChunkagentic_browser_v2 || []).push([
  [874], {
    591: e => {
      e.exports = function () {
        throw new Error("ws does not work in the browser. Browser clients must use the native WebSocket object")
      }
    },
    874: (e, s, t) => {
      t.r(s), t.d(s, {
        NodeWebSocketTransport: () => o
      });
      var n = t(591),
        r = t(809);
      class o {
        static create(e, s) {
          return new Promise(((t, a) => {
            const c = new n(e, [], {
              followRedirects: !0,
              perMessageDeflate: !1,
              allowSynchronousEvents: !1,
              maxPayload: 268435456,
              headers: {
                "User-Agent": `Puppeteer ${r.T}`,
                ...s
              }
            });
            c.addEventListener("open", (() => t(new o(c)))), c.addEventListener("error", a)
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
    }
  }
]);
