(self.webpackChunkagentic_browser_v2 = self.webpackChunkagentic_browser_v2 || []).push([
  [833], {
    585: e => {
      var n = 1e3,
        r = 60 * n,
        t = 60 * r,
        s = 24 * t,
        o = 7 * s,
        a = 365.25 * s;

      function c(e, n, r, t) {
        var s = n >= 1.5 * r;
        return Math.round(e / r) + " " + t + (s ? "s" : "")
      }
      e.exports = function (e, i) {
        i = i || {};
        var u = typeof e;
        if ("string" === u && e.length > 0) return function (e) {
          if ((e = String(e)).length > 100) return;
          var c = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(e);
          if (!c) return;
          var i = parseFloat(c[1]);
          switch ((c[2] || "ms").toLowerCase()) {
          case "years":
          case "year":
          case "yrs":
          case "yr":
          case "y":
            return i * a;
          case "weeks":
          case "week":
          case "w":
            return i * o;
          case "days":
          case "day":
          case "d":
            return i * s;
          case "hours":
          case "hour":
          case "hrs":
          case "hr":
          case "h":
            return i * t;
          case "minutes":
          case "minute":
          case "mins":
          case "min":
          case "m":
            return i * r;
          case "seconds":
          case "second":
          case "secs":
          case "sec":
          case "s":
            return i * n;
          case "milliseconds":
          case "millisecond":
          case "msecs":
          case "msec":
          case "ms":
            return i;
          default:
            return
          }
        }(e);
        if ("number" === u && isFinite(e)) return i.long ? function (e) {
          var o = Math.abs(e);
          if (o >= s) return c(e, o, s, "day");
          if (o >= t) return c(e, o, t, "hour");
          if (o >= r) return c(e, o, r, "minute");
          if (o >= n) return c(e, o, n, "second");
          return e + " ms"
        }(e) : function (e) {
          var o = Math.abs(e);
          if (o >= s) return Math.round(e / s) + "d";
          if (o >= t) return Math.round(e / t) + "h";
          if (o >= r) return Math.round(e / r) + "m";
          if (o >= n) return Math.round(e / n) + "s";
          return e + "ms"
        }(e);
        throw new Error("val is not a non-empty string or a valid number. val=" + JSON.stringify(e))
      }
    },
    736: (e, n, r) => {
      e.exports = function (e) {
        function n(e) {
          let r, s, o, a = null;

          function c(...e) {
            if (!c.enabled) return;
            const t = c,
              s = Number(new Date),
              o = s - (r || s);
            t.diff = o, t.prev = r, t.curr = s, r = s, e[0] = n.coerce(e[0]), "string" != typeof e[0] && e.unshift("%O");
            let a = 0;
            e[0] = e[0].replace(/%([a-zA-Z%])/g, ((r, s) => {
              if ("%%" === r) return "%";
              a++;
              const o = n.formatters[s];
              if ("function" == typeof o) {
                const n = e[a];
                r = o.call(t, n), e.splice(a, 1), a--
              }
              return r
            })), n.formatArgs.call(t, e);
            (t.log || n.log).apply(t, e)
          }
          return c.namespace = e, c.useColors = n.useColors(), c.color = n.selectColor(e), c.extend = t, c.destroy = n.destroy, Object.defineProperty(c, "enabled", {
            enumerable: !0,
            configurable: !1,
            get: () => null !== a ? a : (s !== n.namespaces && (s = n.namespaces, o = n.enabled(e)), o),
            set: e => {
              a = e
            }
          }), "function" == typeof n.init && n.init(c), c
        }

        function t(e, r) {
          const t = n(this.namespace + (void 0 === r ? ":" : r) + e);
          return t.log = this.log, t
        }

        function s(e, n) {
          let r = 0,
            t = 0,
            s = -1,
            o = 0;
          for (; r < e.length;)
            if (t < n.length && (n[t] === e[r] || "*" === n[t])) "*" === n[t] ? (s = t, o = r, t++) : (r++, t++);
            else {
              if (-1 === s) return !1;
              t = s + 1, o++, r = o
            } for (; t < n.length && "*" === n[t];) t++;
          return t === n.length
        }
        return n.debug = n, n.default = n, n.coerce = function (e) {
          if (e instanceof Error) return e.stack || e.message;
          return e
        }, n.disable = function () {
          const e = [...n.names, ...n.skips.map((e => "-" + e))].join(",");
          return n.enable(""), e
        }, n.enable = function (e) {
          n.save(e), n.namespaces = e, n.names = [], n.skips = [];
          const r = ("string" == typeof e ? e : "").trim().replace(" ", ",").split(",").filter(Boolean);
          for (const e of r) "-" === e[0] ? n.skips.push(e.slice(1)) : n.names.push(e)
        }, n.enabled = function (e) {
          for (const r of n.skips)
            if (s(e, r)) return !1;
          for (const r of n.names)
            if (s(e, r)) return !0;
          return !1
        }, n.humanize = r(585), n.destroy = function () {}, Object.keys(e).forEach((r => {
          n[r] = e[r]
        })), n.names = [], n.skips = [], n.formatters = {}, n.selectColor = function (e) {
          let r = 0;
          for (let n = 0; n < e.length; n++) r = (r << 5) - r + e.charCodeAt(n), r |= 0;
          return n.colors[Math.abs(r) % n.colors.length]
        }, n.enable(n.load()), n
      }
    },
    833: (e, n, r) => {
      var t = r(606);
      n.formatArgs = function (n) {
        if (n[0] = (this.useColors ? "%c" : "") + this.namespace + (this.useColors ? " %c" : " ") + n[0] + (this.useColors ? "%c " : " ") + "+" + e.exports.humanize(this.diff), !this.useColors) return;
        const r = "color: " + this.color;
        n.splice(1, 0, r, "color: inherit");
        let t = 0,
          s = 0;
        n[0].replace(/%[a-zA-Z%]/g, (e => {
          "%%" !== e && (t++, "%c" === e && (s = t))
        })), n.splice(s, 0, r)
      }, n.save = function (e) {
        try {
          e ? n.storage.setItem("debug", e) : n.storage.removeItem("debug")
        } catch (e) {}
      }, n.load = function () {
        let e;
        try {
          e = n.storage.getItem("debug")
        } catch (e) {}!e && void 0 !== t && "env" in t && (e = t.env.DEBUG);
        return e
      }, n.useColors = function () {
        if ("undefined" != typeof window && window.process && ("renderer" === window.process.type || window.process.__nwjs)) return !0;
        if ("undefined" != typeof navigator && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) return !1;
        let e;
        return "undefined" != typeof document && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || "undefined" != typeof window && window.console && (window.console.firebug || window.console.exception && window.console.table) || "undefined" != typeof navigator && navigator.userAgent && (e = navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/)) && parseInt(e[1], 10) >= 31 || "undefined" != typeof navigator && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/)
      }, n.storage = function () {
        try {
          return localStorage
        } catch (e) {}
      }(), n.destroy = (() => {
        let e = !1;
        return () => {
          e || (e = !0)
        }
      })(), n.colors = ["#0000CC", "#0000FF", "#0033CC", "#0033FF", "#0066CC", "#0066FF", "#0099CC", "#0099FF", "#00CC00", "#00CC33", "#00CC66", "#00CC99", "#00CCCC", "#00CCFF", "#3300CC", "#3300FF", "#3333CC", "#3333FF", "#3366CC", "#3366FF", "#3399CC", "#3399FF", "#33CC00", "#33CC33", "#33CC66", "#33CC99", "#33CCCC", "#33CCFF", "#6600CC", "#6600FF", "#6633CC", "#6633FF", "#66CC00", "#66CC33", "#9900CC", "#9900FF", "#9933CC", "#9933FF", "#99CC00", "#99CC33", "#CC0000", "#CC0033", "#CC0066", "#CC0099", "#CC00CC", "#CC00FF", "#CC3300", "#CC3333", "#CC3366", "#CC3399", "#CC33CC", "#CC33FF", "#CC6600", "#CC6633", "#CC9900", "#CC9933", "#CCCC00", "#CCCC33", "#FF0000", "#FF0033", "#FF0066", "#FF0099", "#FF00CC", "#FF00FF", "#FF3300", "#FF3333", "#FF3366", "#FF3399", "#FF33CC", "#FF33FF", "#FF6600", "#FF6633", "#FF9900", "#FF9933", "#FFCC00", "#FFCC33"], n.log = console.debug || console.log || (() => {}), e.exports = r(736)(n);
      const {
        formatters: s
      } = e.exports;
      s.j = function (e) {
        try {
          return JSON.stringify(e)
        } catch (e) {
          return "[UnexpectedJSONParseError]: " + e.message
        }
      }
    }
  }
]);
