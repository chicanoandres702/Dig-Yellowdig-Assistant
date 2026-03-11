(() => {
  "use strict";

  function t(t) {
    if (!t || t.length < 4) return !1;
    return !!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t) || (!!(t.length > 25 && /[a-z]/i.test(t) && /[0-9]/.test(t)) || !(!/^(ember|react|vue|angular|svelte).*\d+$/i.test(t) && !/^[a-zA-Z]{1,6}\d{4,}$/.test(t)))
  }

  function e(t) {
    return "undefined" != typeof CSS && CSS.escape ? CSS.escape(t) : t.replace(/\\/g, "\\\\").replace(/['"]/g, "\\$&").replace(/[^a-zA-Z0-9_-]/g, (t => " " === t ? "\\ " : "\\" + t.charCodeAt(0).toString(16) + " "))
  }

  function n(t, e, n = document) {
    try {
      const o = n.querySelectorAll(t);
      return 1 === o.length && o[0] === e
    } catch (t) {
      return !1
    }
  }

  function o(t, e) {
    if (!t.isConnected) return null;
    const n = t.tagName.toLowerCase();
    if ("css" === e || null === e) {
      const e = t.textContent?.trim() || "";
      if (e && e.length > 0 && e.length < 80) {
        return {
          type: "xpath",
          value: `//${n}[contains(normalize-space(.), ${o=e,o.includes('"')?o.includes("'")?"concat('"+o.replace(/'/g,"', \"'\", '")+"')":`'${o}'`:`"${o}"`})]`
        }
      }
      const i = function (t) {
        const e = [];
        let n = t;
        for (; n && n.nodeType === Node.ELEMENT_NODE;) {
          const t = n;
          let o = 1,
            i = t.previousSibling;
          for (; i;) i.nodeType === Node.ELEMENT_NODE && i.tagName === t.tagName && o++, i = i.previousSibling;
          e.unshift(`${t.tagName.toLowerCase()}[${o}]`);
          const r = t.parentNode;
          if (n = r && r.nodeType === Node.DOCUMENT_FRAGMENT_NODE && r.host ? r.host : r, n === document) break
        }
        return e.length > 0 ? `/${e.join("/")}` : ""
      }(t);
      if (i) return {
        type: "xpath",
        value: i
      }
    }
    var o;
    return null
  }

  function i(i) {
    if (!(i instanceof Element && i.isConnected)) return {
      primary: null,
      fallback: null
    };
    const r = function (o) {
      if (!o.isConnected) return null;
      const i = o.getRootNode(),
        r = o.tagName.toLowerCase(),
        l = ["data-testid", "data-test", "data-qa", "data-cy", "data-test-id"];
      for (const t of l)
        if (o.hasAttribute(t)) {
          const l = o.getAttribute(t),
            a = `[${t}="${e(l)}"]`;
          if (n(a, o, i)) return {
            type: "css",
            value: a
          };
          const s = `${r}[${t}="${e(l)}"]`;
          if (n(s, o, i)) return {
            type: "css",
            value: s
          }
        } if (o.id && !t(o.id)) {
        const t = `#${e(o.id)}`;
        if (n(t, o, i)) return {
          type: "css",
          value: t
        }
      }
      if (o.hasAttribute("role") && o.hasAttribute("aria-label")) {
        const t = `${r}[role="${e(o.getAttribute("role"))}"][aria-label="${e(o.getAttribute("aria-label"))}"]`;
        if (n(t, o, i)) return {
          type: "css",
          value: t
        }
      }
      if (o.hasAttribute("name")) {
        const t = `${r}[name="${e(o.getAttribute("name"))}"]`;
        if (n(t, o, i)) return {
          type: "css",
          value: t
        }
      }
      if ("input" === r && o.hasAttribute("placeholder")) {
        const t = `input[placeholder="${e(o.getAttribute("placeholder"))}"]`;
        if (n(t, o, i)) return {
          type: "css",
          value: t
        }
      }
      if (["button", "input"].includes(r) && o.hasAttribute("type")) {
        const t = `${r}[type="${e(o.getAttribute("type"))}"]`;
        if (n(t, o, i)) return {
          type: "css",
          value: t
        }
      }
      if (o.hasAttribute("role")) {
        const t = `${r}[role="${e(o.getAttribute("role"))}"]`;
        if (n(t, o, i)) return {
          type: "css",
          value: t
        }
      }
      if (o.classList && o.classList.length > 0) {
        const l = Array.from(o.classList).filter((e => !t(e))).sort();
        if (l.length > 0) {
          const t = `${r}${l.map((t=>`.${e(t)}`)).join("")}`;
          if (n(t, o, i)) return {
            type: "css",
            value: t
          }
        }
      }
      let a = o.parentElement,
        s = 0;
      for (; a && s < 2 && "BODY" !== a.tagName;) {
        let c = !1,
          d = "";
        if (a.id && !t(a.id)) d = `#${e(a.id)}`, c = !0;
        else
          for (const t of l)
            if (a.hasAttribute(t)) {
              d = `[${t}="${e(a.getAttribute(t))}"]`, c = !0;
              break
            } if (c) {
          const t = `${d} > ${r}`;
          if (n(t, o, i)) return {
            type: "css",
            value: t
          };
          const e = Array.from(a.children).filter((t => t.tagName === o.tagName)).indexOf(o) + 1;
          if (e > 0) {
            const t = `${d} > ${r}:nth-of-type(${e})`;
            if (n(t, o, i)) return {
              type: "css",
              value: t
            }
          }
          break
        }
        a = a.parentElement, s++
      }
      if (o.parentElement) {
        const t = o.parentElement,
          e = Array.from(t.children).filter((t => t.tagName === o.tagName)).indexOf(o) + 1;
        if (e > 0) {
          const l = `${t.tagName.toLowerCase()} > ${r}:nth-of-type(${e})`;
          if (n(l, o, i)) return {
            type: "css",
            value: l
          }
        }
      }
      return null
    }(i);
    if (r) return {
      primary: r,
      fallback: o(i, "css")
    };
    {
      const t = o(i, null);
      return t ? {
        primary: t,
        fallback: null
      } : {
        primary: null,
        fallback: null
      }
    }
  }

  function r(t) {
    const e = window.getComputedStyle(t);
    if ("none" === e.display || "hidden" === e.visibility || "0" === e.opacity || 0 === parseFloat(e.opacity)) return !1;
    const n = t.getBoundingClientRect();
    if (n.width < 1 || n.height < 1) return !1;
    if (n.right < 0 || n.bottom < 0 || n.left > window.innerWidth || n.top > window.innerHeight) return !1;
    const o = n.left + n.width / 2,
      i = n.top + n.height / 2;
    if (o < 0 || i < 0 || o > window.innerWidth || i > window.innerHeight) return !0;
    try {
      const e = t.getRootNode(),
        n = e instanceof ShadowRoot ? e.elementFromPoint(o, i) : document.elementFromPoint(o, i);
      if (!n) return !1;
      let r = n;
      for (; r && r !== document.documentElement;) {
        if (r === t) return !0;
        r = r.parentElement ?? r.getRootNode()?.host
      }
      return !1
    } catch {
      return !1
    }
  }

  function l(t) {
    if (!t) return !1;
    const e = t.tagName.toLowerCase(),
      n = "a" === e && t.hasAttribute("href"),
      o = "true" === t.getAttribute("aria-hidden"),
      i = "-1" === t.getAttribute("tabindex"),
      r = t.hasAttribute("tabindex") && parseInt(t.getAttribute("tabindex") || "-1", 10) >= 0;
    if ("body" === e || "html" === e) return !1;
    if ("li" === e && "presentation" === t.getAttribute("role")) return !1;
    if (null !== t.querySelector('[tabindex]:not([tabindex="-1"])'))
      if ("div" === e && "button" === t.getAttribute("role"));
      else if (!t.hasAttribute("tabindex") || "-1" === t.getAttribute("tabindex")) return !1;
    const l = t.querySelectorAll('button, a[href], input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="link"], [role="checkbox"], [role="menuitem"], [role="option"], [role="radio"], [role="switch"], [role="tab"], [role="textbox"], [onclick], [tabindex]:not([tabindex="-1"]), [contenteditable="true"], img[role="button"]');
    if (l.length > 0) {
      if (("search" === t.getAttribute("role") || t.getAttribute("aria-label")?.toLowerCase().includes("search")) && t.querySelector("input, textarea")) return !1;
      if ("div" === e && "button" === t.getAttribute("role") && t.querySelector("img"));
      else if (1 === l.length) {
        const e = l[0].getBoundingClientRect(),
          n = t.getBoundingClientRect(),
          o = e.width * e.height / (n.width * n.height),
          i = Math.abs(e.left - n.left) + Math.abs(e.top - n.top);
        if (!(isNaN(o) || o < .75 || i > 15)) return !1
      } else if (l.length > 1) return !1
    }
    if ("disabled" in t && t.disabled || "true" === t.getAttribute("aria-disabled") || t.hasAttribute("disabled")) return !1;
    const a = t.getBoundingClientRect();
    if (("presentation" === t.getAttribute("role") || o) && (a.width < 10 || a.height < 10 || a.width * a.height < 100)) return !1;
    if (t instanceof SVGElement) return !1;
    if (o && (!n || !i)) return !1;
    const s = new Set(["button", "input", "select", "textarea", "details", "summary", "option"]),
      c = new Set(["button", "link", "checkbox", "menuitem", "option", "radio", "switch", "tab", "input", "combobox", "slider", "spinbutton", "textbox", "treeitem", "searchbox"]),
      d = (t.getAttribute("role") || "").toLowerCase();
    if (n) return !0;
    if (s.has(e)) return !0;
    if (c.has(d)) return !0;
    if (r) return !0;
    if ("true" === t.getAttribute("contenteditable")) return !0;
    if (t.onclick || t.getAttribute("onclick")) return !0;
    const u = t.getAttribute("jsaction");
    return !(!u || !u.includes("click:")) || (!("input" !== e || !t.hasAttribute("type") || ["hidden", "button", "submit", "reset"].includes(t.getAttribute("type")?.toLowerCase() || "")) || ("search" === d || (!(!e.includes("-") || !(t.hasAttribute("placeholder") || t.hasAttribute("value") || t.hasAttribute("name") || d)) || "img" === e && "button" === d)))
  }

  function a(t) {
    const e = t.tagName.toLowerCase();
    if ("img" === e) return t.getAttribute("alt") || t.getAttribute("aria-label") || "";
    if ("input" === e || "textarea" === e) return (t.getAttribute("placeholder") || t.getAttribute("value") || "").trim();
    if (t.id) {
      const e = document.querySelector(`label[for="${t.id}"]`);
      if (e) return (e.textContent || "").trim()
    }
    return (t.textContent || "").substring(0, 50).trim()
  }

  function s(t) {
    const e = {},
      n = ["aria-label", "placeholder", "title", "alt", "type"];
    for (const o of n) t.hasAttribute(o) && (e[o] = t.getAttribute(o));
    return e
  }

  // Extract visible text content from the page (limited to avoid token overflow)
  function getVisibleTextContent() {
    try {
      // Get main content areas first
      const mainSelectors = ['main', 'article', '[role="main"]', '.content', '#content', '.main-content'];
      let mainContent = null;
      for (const sel of mainSelectors) {
        const el = document.querySelector(sel);
        if (el && el.textContent && el.textContent.trim().length > 100) {
          mainContent = el;
          break;
        }
      }
      
      const targetElement = mainContent || document.body;
      
      // Get text from visible elements only
      const walker = document.createTreeWalker(
        targetElement,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: function(node) {
            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;
            
            // Skip hidden elements, scripts, styles
            const tagName = parent.tagName.toLowerCase();
            if (['script', 'style', 'noscript', 'svg', 'path'].includes(tagName)) {
              return NodeFilter.FILTER_REJECT;
            }
            
            const style = window.getComputedStyle(parent);
            if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
              return NodeFilter.FILTER_REJECT;
            }
            
            // Only accept nodes with actual content
            if (node.textContent && node.textContent.trim().length > 0) {
              return NodeFilter.FILTER_ACCEPT;
            }
            return NodeFilter.FILTER_REJECT;
          }
        }
      );
      
      const textParts = [];
      let totalLength = 0;
      const maxLength = 8000; // Limit to avoid token overflow
      
      let node;
      while ((node = walker.nextNode()) && totalLength < maxLength) {
        const text = node.textContent.trim();
        if (text.length > 0) {
          textParts.push(text);
          totalLength += text.length;
        }
      }
      
      return textParts.join(' ').replace(/\s+/g, ' ').substring(0, maxLength);
    } catch (e) {
      return '';
    }
  }

  function c() {
    const t = window.scrollY || window.pageYOffset,
      e = document.documentElement.scrollHeight || document.body.scrollHeight,
      n = document.documentElement.clientHeight || window.innerHeight,
      o = t <= 5,
      c = t + n >= e - 5,
      d = Math.round(t / (e - n) * 100) || 0,
      u = {
        url: window.location.href,
        title: document.title,
        elements: [],
        elementRefs: [],
        scrollPosition: {
          scrollY: t,
          scrollHeight: e,
          clientHeight: n,
          atTop: o,
          atBottom: c,
          percentScrolled: d
        },
        pageText: getVisibleTextContent()
      },
      h = new Set;
    ! function t(e) {
      e.querySelectorAll('a, button, input, select, textarea, [role], label[for], [tabindex], [contenteditable], [onclick], img[role="button"]').forEach((t => {
        t instanceof HTMLElement && h.add(t)
      }));
      const n = Array.from(e.querySelectorAll("*")).filter((t => null !== t.shadowRoot));
      if (e instanceof Document) {
        const t = Array.from(document.querySelectorAll("*")).filter((t => t.tagName.includes("-") && null !== t.shadowRoot));
        for (const e of t) n.includes(e) || n.push(e)
      }
      for (const e of n) e.shadowRoot && t(e.shadowRoot)
    }(document);
    let m = 0;
    return Array.from(h).filter((t => r(t) && l(t))).forEach((t => {
      const e = function (t, e) {
        if (!t) return null;
        if (!r(t)) return null;
        if (!l(t)) return null;
        const n = t.getBoundingClientRect(),
          o = {
            x: Math.round(n.left),
            y: Math.round(n.top),
            width: Math.round(n.width),
            height: Math.round(n.height),
            center: {
              x: Math.round(n.left + n.width / 2),
              y: Math.round(n.top + n.height / 2)
            }
          },
          c = Boolean("disabled" in t && t.disabled || "true" === t.getAttribute("aria-disabled") || t.hasAttribute("disabled")),
          d = t.checked || !1,
          u = t.isContentEditable;
        if (c) return null;
        const h = i(t),
          m = {
            elementNumber: e,
            tagName: t.tagName.toLowerCase(),
            id: t.id || null,
            className: t.className || null,
            role: t.getAttribute("role") || null,
            text: a(t),
            coords: o,
            attributes: s(t),
            state: {
              disabled: c,
              checked: d,
              contentEditable: u
            },
            selectors: h
          };
        return "shadowRoot" in t && t.shadowRoot && (m.hasShadowRoot = !0), m
      }(t, m);
      e && (u.elements.push(e), u.elementRefs.push(t), m++)
    })), u
  }

  function d() {
    const {
      url: t,
      title: e,
      elements: n,
      scrollPosition: o
    } = c();
    return {
      url: t,
      title: e,
      elements: n,
      scrollPosition: o
    }
  }
  const u = (() => {
    const t = {
        activeHighlights: [],
        eventListeners: new Map,
        intervalIds: [],
        frameId: null,
        labelPositions: []
      },
      e = ["#0066FF", "#FF9900", "#33CC33", "#FF3333", "#9933FF", "#00CCCC", "#FF66CC", "#FFCC00"];

    function n() {
      let t = document.getElementById("dom-tree-highlight-container");
      if (!t) {
        const e = document.createElement("style");
        e.id = "dom-tree-highlight-styles", e.textContent = "\n          .dom-tree-highlight-container {\n            position: fixed !important;\n            top: 0 !important;\n            left: 0 !important;\n            width: 100vw !important;\n            height: 100vh !important;\n            pointer-events: none !important;\n            z-index: 2147483647 !important;\n            overflow: visible !important;\n            isolation: isolate !important;\n          }\n\n          .dom-tree-highlight-overlay {\n            position: fixed !important;\n            pointer-events: none !important;\n            box-sizing: border-box !important;\n            z-index: 2147483646 !important;\n            will-change: transform !important;\n            border-width: 1px !important;\n            box-shadow: 0 0 2px rgba(0, 0, 0, 0.1) !important;\n            mix-blend-mode: normal !important;\n          }\n\n          .dom-tree-highlight-label {\n            position: fixed !important;\n            color: white !important;\n            font-weight: bold !important;\n            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;\n            font-size: 12px !important;\n            line-height: 18px !important;\n            width: 18px !important;\n            height: 18px !important;\n            text-align: center !important;\n            border-radius: 2px !important;\n            pointer-events: none !important;\n            z-index: 2147483647 !important;\n            display: flex !important;\n            align-items: center !important;\n            justify-content: center !important;\n            visibility: visible !important;\n            opacity: 1 !important;\n            will-change: transform !important;\n            transform: translateZ(0) !important;\n            box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.2), 0 1px 3px rgba(0, 0, 0, 0.3) !important;\n            transition: opacity 0.2s ease-out !important;\n          }\n          .dom-tree-offscreen, .offscreen {\n            opacity: 0 !important;\n            visibility: hidden !important;\n            display: none !important;\n            position: absolute !important;\n            top: -9999px !important;\n            left: -9999px !important;\n            pointer-events: none !important;\n            z-index: -9999 !important;\n          }\n        ", document.head.appendChild(e), t = document.createElement("div"), t.id = "dom-tree-highlight-container", t.className = "dom-tree-highlight-container", document.body.appendChild(t)
      }
      return t
    }

    function o(t) {
      const e = t.getBoundingClientRect();
      if (e.right < 0 || e.bottom < 0 || e.left > window.innerWidth || e.top > window.innerHeight) return !1;
      const n = e.left + e.width / 2,
        o = e.top + e.height / 2;
      if (n < 0 || o < 0 || n > window.innerWidth || o > window.innerHeight) return !1;
      try {
        const e = t.getRootNode(),
          i = e instanceof ShadowRoot ? e.elementFromPoint(n, o) : document.elementFromPoint(n, o);
        if (!i) return !1;
        let r = i;
        for (; r && r !== document.documentElement;) {
          if (r === t) return !0;
          r = r.parentElement ?? (r.getRootNode() instanceof ShadowRoot ? r.getRootNode().host : null)
        }
      } catch {
        return !1
      }
      return !1
    }

    function i(t, e, n = 2) {
      const o = t.left - n,
        i = t.top - n,
        r = t.right + n,
        l = t.bottom + n;
      return !(r < e.left || o > e.right || l < e.top || i > e.bottom)
    }

    function r(t, e, n = 2) {
      let o = 0;
      for (const r of e) i(t, r, n) && o++;
      return o
    }

    function l(t, e) {
      let n = 0;
      for (const o of e) {
        if (!o.overlay) continue;
        const e = o.overlay,
          i = {
            left: parseFloat(e.style.left),
            top: parseFloat(e.style.top),
            right: parseFloat(e.style.left) + parseFloat(e.style.width),
            bottom: parseFloat(e.style.top) + parseFloat(e.style.height)
          };
        t.right < i.left || t.left > i.right || t.bottom < i.top || t.top > i.bottom || n++
      }
      return n
    }

    function a(e) {
      const n = 18,
        o = 18,
        i = [{
          name: "left",
          x: e.left - n - 2,
          y: e.top
        }, {
          name: "top",
          x: e.left,
          y: e.top - o - 2
        }, {
          name: "right",
          x: e.right + 2,
          y: e.top
        }, {
          name: "bottom",
          x: e.left,
          y: e.bottom + 2
        }, {
          name: "left-middle",
          x: e.left - n - 2,
          y: e.top + e.height / 2 - 9
        }, {
          name: "left-bottom",
          x: e.left - n - 2,
          y: e.bottom - o
        }, {
          name: "right-middle",
          x: e.right + 2,
          y: e.top + e.height / 2 - 9
        }, {
          name: "right-bottom",
          x: e.right + 2,
          y: e.bottom - o
        }, {
          name: "left-offset-1",
          x: e.left - n - 2,
          y: e.top + .25 * e.height
        }, {
          name: "left-offset-2",
          x: e.left - n - 2,
          y: e.top + .75 * e.height - o
        }, {
          name: "right-offset-1",
          x: e.right + 2,
          y: e.top + .25 * e.height
        }, {
          name: "right-offset-2",
          x: e.right + 2,
          y: e.top + .75 * e.height - o
        }];
      let a = null,
        s = 1 / 0;
      for (const e of i) {
        const i = {
          left: e.x,
          top: e.y,
          right: e.x + n,
          bottom: e.y + o
        };
        if (i.left < 0 || i.top < 0 || i.right > window.innerWidth || i.bottom > window.innerHeight) continue;
        const c = 10 * r(i, t.labelPositions, 2) + l(i, t.activeHighlights);
        if (c < s && (s = c, a = {
            x: e.x,
            y: e.y
          }), 0 === c) break
      }
      return a || (a = {
        x: e.left - n - 2,
        y: e.top
      }), a.x = Math.max(5, Math.min(a.x, window.innerWidth - n - 5)), a.y = Math.max(5, Math.min(a.y, window.innerHeight - o - 5)), a
    }

    function s(o, i) {
      const r = n(),
        l = o.getBoundingClientRect(),
        s = e[i % e.length],
        c = document.createElement("div");
      c.className = "dom-tree-highlight-overlay", c.style.border = `1px solid ${s}`, c.style.backgroundColor = `${s}20`, c.style.left = `${l.left}px`, c.style.top = `${l.top}px`, c.style.width = `${l.width}px`, c.style.height = `${l.height}px`;
      const d = `highlighted-elt-${i}`;
      c.dataset.targetElement = d, o.dataset.highlightId = d, r.appendChild(c);
      const u = document.createElement("div");
      u.className = "dom-tree-highlight-label", u.textContent = String(i), u.style.backgroundColor = s;
      const h = a(l);
      u.style.left = `${h.x}px`, u.style.top = `${h.y}px`;
      const m = {
        left: h.x - 2,
        top: h.y - 2,
        right: h.x + 18 + 2,
        bottom: h.y + 18 + 2
      };
      return t.labelPositions.push(m), r.appendChild(u), t.activeHighlights.push({
        overlay: c,
        label: u,
        element: o,
        elementId: d
      }), c
    }

    function c() {
      null === t.frameId && (t.frameId = requestAnimationFrame((() => {
        t.frameId = null, t.labelPositions = [];
        for (const e of t.activeHighlights) {
          const {
            overlay: n,
            label: i,
            element: r
          } = e;
          if (!n || !i) continue;
          if (!o(r)) {
            n.classList.add("dom-tree-offscreen"), i.classList.add("dom-tree-offscreen");
            continue
          }
          n.classList.remove("dom-tree-offscreen"), i.classList.remove("dom-tree-offscreen");
          const l = r.getBoundingClientRect();
          n.style.left = `${l.left}px`, n.style.top = `${l.top}px`, n.style.width = `${l.width}px`, n.style.height = `${l.height}px`;
          const s = a(l);
          i.style.left = `${s.x}px`, i.style.top = `${s.y}px`;
          const c = 18,
            d = 18,
            u = {
              left: s.x - 2,
              top: s.y - 2,
              right: s.x + c + 2,
              bottom: s.y + d + 2
            };
          t.labelPositions.push(u)
        }
      })))
    }

    function d(e, n, o, i) {
      e.addEventListener(n, o, i);
      const r = t.eventListeners.get(e) || [];
      r.push({
        type: n,
        listener: o,
        options: i
      }), t.eventListeners.set(e, r)
    }
    return {
      highlightElements: function (e) {
        for (const [e, n] of t.eventListeners.entries())
          for (const {
              type: t,
              listener: o,
              options: i
            }
            of n) try {
            e.removeEventListener(t, o, i)
          } catch (t) {}
        for (t.eventListeners.clear(); t.intervalIds.length;) {
          const e = t.intervalIds.pop();
          clearInterval(e)
        }
        if (null !== t.frameId && (cancelAnimationFrame(t.frameId), t.frameId = null), !n()) return;
        for (const e of t.activeHighlights) try {
          e.overlay && e.overlay.remove(), e.label && e.label.remove(), e.element && e.element.dataset && delete e.element.dataset.highlightId
        } catch (t) {}
        t.activeHighlights = [], t.labelPositions = [];
        let o = 0;
        for (const t of e) s(t, o++);
        d(window, "scroll", c, {
          passive: !0
        }), d(window, "resize", c);
        const i = window.setInterval(c, 250);
        t.intervalIds.push(i)
      },
      removeHighlights: function () {
        try {
          for (const e of t.activeHighlights) try {
            e.overlay && e.overlay.remove(), e.label && e.label.remove(), e.element && e.element.dataset && delete e.element.dataset.highlightId
          } catch (t) {}
          const e = document.getElementById("dom-tree-highlight-container");
          e && e.remove();
          const n = document.getElementById("dom-tree-highlight-styles");
          n && n.remove(), document.querySelectorAll(".dom-tree-highlight-overlay, .dom-tree-highlight-label").forEach((t => {
            try {
              t.remove()
            } catch (t) {}
          }));
          for (const [e, n] of t.eventListeners.entries())
            for (const {
                type: t,
                listener: o,
                options: i
              }
              of n) try {
              e.removeEventListener(t, o, i)
            } catch (t) {}
          for (t.eventListeners.clear(); t.intervalIds.length;) {
            const e = t.intervalIds.pop();
            clearInterval(e)
          }
          null !== t.frameId && (cancelAnimationFrame(t.frameId), t.frameId = null), t.activeHighlights = [], t.labelPositions = []
        } catch (e) {
          t.activeHighlights = [], t.labelPositions = [], t.eventListeners.clear(), t.intervalIds = [], t.frameId = null
        }
      }
    }
  })();
  ! function () {
    if (!window.__domBundleReady) try {
      window.DOMCache = {
        storeSelectors: t => {
          const e = {};
          t.forEach((t => {
            void 0 !== t.elementNumber && (e[t.elementNumber] = {
              primary: t.selectors.primary,
              fallback: t.selectors.fallback
            })
          })), window.__CACHED_SELECTORS = e, window.__CACHED_DOM_TIMESTAMP = Date.now()
        },
        getSelector: t => {
          const e = window.__CACHED_SELECTORS;
          return e && e[t] ? e[t] : null
        },
        clearCache: () => {
          delete window.__CACHED_SELECTORS, delete window.__CACHED_DOM_TIMESTAMP
        }
      }, window.DOMTreeParser = {
        getDomTree: d,
        findInteractiveElements: c
      }, window.DOMTreeHighlighter = u, window.getDomTree = d, window.findInteractiveElements = c, window.highlightElements = u.highlightElements, window.removeHighlights = u.removeHighlights, window.domUtilsHealthCheck = function () {
        try {
          const t = window.DOMTreeParser && "function" == typeof window.DOMTreeParser.findInteractiveElements,
            e = window.DOMTreeHighlighter && "function" == typeof window.DOMTreeHighlighter.highlightElements;
          let n = !1;
          try {
            n = null !== document.documentElement
          } catch (t) {}
          return {
            healthy: t && e && n,
            details: {
              parserWorks: t,
              highlighterWorks: e,
              functionalTest: n,
              bundleReady: !0 === window.__domBundleReady
            }
          }
        } catch (t) {
          return {
            healthy: !1,
            error: t instanceof Error ? t.message : String(t)
          }
        }
      }, window.__domBundleReady = !0
    } catch (t) {
      window.__domBundleReady = !1
    }
  }()
})();
