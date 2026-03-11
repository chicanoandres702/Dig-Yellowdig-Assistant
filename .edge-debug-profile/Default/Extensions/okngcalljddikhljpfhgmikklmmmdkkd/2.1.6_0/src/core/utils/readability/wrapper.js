{
  const t = Object.getOwnPropertyDescriptor(Node.prototype, "parentNode");
  Object.defineProperty(Node.prototype, "parentNode", {
    enumerable: !0,
    configurable: !0,
    get: function () {
      return t.get.call(this) || {
        tagName: "BODY",
        getAttribute() {}
      }
    }
  }), HTMLElement.prototype.setAttribute = new Proxy(HTMLElement.prototype.setAttribute, {
    apply(t, e, n) {
      try {
        Reflect.apply(t, e, n)
      } catch (t) {}
    }
  });
  try {
    if ("undefined" == typeof Readability) window.__READABILITY_RESULT__ = {
      error: "Readability library not available",
      fallbackContent: document.body.textContent
    };
    else {
      const t = document.cloneNode(!0),
        e = new Readability(t, {
          debug: !1
        }).parse();
      window.__READABILITY_RESULT__ = e ? {
        title: e.title || document.title,
        htmlContent: e.content || "",
        content: e.content || "",
        length: e.length || 0,
        excerpt: e.excerpt || "",
        byline: e.byline,
        dir: e.dir,
        lang: e.lang,
        siteName: e.siteName,
        url: window.location.href
      } : {
        error: "Readability parsing failed",
        fallbackContent: document.body.textContent,
        title: document.title,
        url: window.location.href
      }
    }
  } catch (t) {
    window.__READABILITY_RESULT__ = {
      error: `Readability extraction error: ${t.message||String(t)}`,
      fallbackContent: document.body.textContent,
      title: document.title,
      url: window.location.href
    }
  }
}
