(() => {
  var e, t, r, i, n = {
      191: (e, t, r) => {
        "use strict";
        r.r(t), r.d(t, {
          LLMService: () => c,
          llmService: () => l
        });
        class i {
          constructor(e, t) {
            this.id = e, this.name = t
          }
          extractJson(e) {
            try {
              try {
                return JSON.parse(e)
              } catch (e) {}
              const t = /```(?:json)?\s*([\s\S]*?)\s*```/,
                r = e.match(t);
              if (r && r[1]) try {
                return JSON.parse(r[1])
              } catch (e) {}
              const i = /\{[\s\S]*\}/,
                n = e.match(i);
              if (n && n[0]) try {
                return JSON.parse(n[0])
              } catch (e) {}
              return null
            } catch (e) {
              return null
            }
          }
        }
        class n extends i {
          constructor(e, t = "https://api.openai.com/v1") {
            super("openai", "OpenAI"), this.apiKey = e, this.baseUrl = t
          }
          async generateResponse(e, t) {
            if (!this.apiKey || "" === this.apiKey.trim()) throw new Error("OpenAI API key is not configured. Please add your API key in the settings panel.");
            const r = t?.model || "gpt-4o",
              i = t?.temperature ?? 1,
              n = t?.max_tokens || 1024,
              s = t?.system_prompt || "",
              a = t?.image_data || null,
              o = `${this.baseUrl}/chat/completions`;
            try {
              const c = [];
              if (s && c.push({
                  role: "system",
                  content: s
                }), a) {
                // Check if this is a custom provider (they typically don't support vision/multimodal)
                const isCustomProvider = this.id && this.id.startsWith('custom_');
                
                if (!isCustomProvider) {
                  // Official provider - send with vision format
                  let t = a;
                  t.startsWith("data:") || (t = `data:image/jpeg;base64,${a}`), t.split(",").length > 1 && !t.startsWith("data:image") && (t = `data:image/jpeg;base64,${t.split(",")[1]}`), c.push({
                    role: "user",
                    content: [{
                      type: "text",
                      text: e
                    }, {
                      type: "image_url",
                      image_url: {
                        url: t,
                        detail: "auto"
                      }
                    }]
                  })
                } else {
                  // Custom provider - skip image, use text-only to avoid errors
                  c.push({
                    role: "user",
                    content: e
                  })
                }
              } else c.push({
                role: "user",
                content: e
              });
              const l = await fetch(o, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                  model: r,
                  messages: c,
                  temperature: i,
                  max_tokens: n,
                  top_p: t?.top_p || 1,
                  ...t?.provider_specific
                })
              });
              if (!l.ok) {
                const e = await l.json();
                throw new Error(`OpenAI API error: ${e.error?.message||JSON.stringify(e)}`)
              }
              const d = await l.json(),
                u = d.choices[0]?.message?.content || "";
              return {
                text: u,
                parsed_json: this.extractJson(u),
                usage: {
                  prompt_tokens: d.usage?.prompt_tokens || 0,
                  completion_tokens: d.usage?.completion_tokens || 0,
                  total_tokens: d.usage?.total_tokens || 0
                },
                metadata: {
                  model: d.model
                }
              }
            } catch (e) {
              throw new Error(`OpenAI provider error: ${e.message}`)
            }
          }
        }
        class s extends i {
          constructor(e, t = "https://api.anthropic.com", r = "2023-06-01") {
            super("anthropic", "Claude"), this.apiKey = e, this.baseUrl = t, this.version = r
          }
          async generateResponse(e, t) {
            if (!this.apiKey || "" === this.apiKey.trim()) throw new Error("Anthropic API key is not configured. Please add your API key in the settings panel.");
            const r = t?.model || "claude-3-opus-20240229",
              i = t?.temperature ?? 1,
              n = t?.max_tokens || 1024,
              s = t?.system_prompt || "",
              a = t?.image_data || null,
              o = `${this.baseUrl}/v1/messages`;
            try {
              const c = [{
                role: "user",
                content: []
              }];
              if (a) {
                let e = a;
                e.startsWith("data:image") ? e = e.split(";base64,")[1] : e.includes(",") && (e = e.split(",")[1] || e), e.startsWith("data:") && (e = e.substring(e.indexOf(",") + 1));
                let t = "image/jpeg";
                if (a.startsWith("data:")) {
                  const e = a.match(/data:([^;]+);base64,/i);
                  e && e[1] && (t = e[1])
                } ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(t) || (t = "image/jpeg"), c[0].content.push({
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: t,
                    data: e
                  }
                })
              }
              c[0].content.push({
                type: "text",
                text: e
              });
              const l = await fetch(o, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "x-api-key": this.apiKey,
                  "anthropic-version": this.version,
                  "anthropic-dangerous-direct-browser-access": "true"
                },
                body: JSON.stringify({
                  model: r,
                  system: s,
                  messages: c,
                  max_tokens: n,
                  temperature: i,
                  ...t?.provider_specific
                })
              });
              if (!l.ok) {
                const e = await l.json();
                throw new Error(`Anthropic API error: ${e.error?.message||JSON.stringify(e)}`)
              }
              const d = await l.json(),
                u = d.content?.[0]?.text || "";
              return {
                text: u,
                parsed_json: this.extractJson(u),
                usage: {
                  prompt_tokens: d.usage?.input_tokens || 0,
                  completion_tokens: d.usage?.output_tokens || 0,
                  total_tokens: (d.usage?.input_tokens || 0) + (d.usage?.output_tokens || 0)
                },
                metadata: {
                  model: d.model
                }
              }
            } catch (e) {
              throw new Error(`Anthropic provider error: ${e.message}`)
            }
          }
        }
        class a extends i {
          constructor(e, t = "https://generativelanguage.googleapis.com/v1beta") {
            super("google", "Gemini"), this.apiKey = e, this.baseUrl = t
          }
          async generateResponse(e, t) {
            if (!this.apiKey || "" === this.apiKey.trim()) throw new Error("Google API key is not configured. Please add your API key in the settings panel.");
            const r = t?.model || "gemini-2.0-flash",
              i = t?.temperature ?? 1,
              n = t?.system_prompt || "",
              s = t?.image_data || null,
              a = `${this.baseUrl}/models/${r}:generateContent?key=${this.apiKey}`;
            try {
              const t = [];
              if (s) {
                let e = s;
                e.includes(",") ? e = e.split(",")[1] : e.includes(";base64,") && (e = e.split(";base64,")[1]), t.push({
                  inlineData: {
                    data: e,
                    mimeType: "image/jpeg"
                  }
                })
              }
              const o = n ? `${n}\n\n${e}` : e;
              t.push({
                text: o
              });
              const c = [{
                  role: "user",
                  parts: t
                }],
                l = await fetch(a, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json"
                  },
                  body: JSON.stringify({
                    contents: c,
                    generationConfig: {
                      temperature: i
                    }
                  })
                });
              if (!l.ok) {
                const e = await l.json();
                throw new Error(`Google API error: ${e.error?.message||JSON.stringify(e)}`)
              }
              const d = await l.json(),
                u = d.candidates?.[0]?.content?.parts?.[0]?.text || "";
              return {
                text: u,
                parsed_json: this.extractJson(u),
                usage: {
                  prompt_tokens: d.usageMetadata?.promptTokenCount || 0,
                  completion_tokens: d.usageMetadata?.candidatesTokenCount || 0,
                  total_tokens: d.usageMetadata?.totalTokenCount || 0
                },
                metadata: {
                  model: r
                }
              }
            } catch (e) {
              throw new Error(`Google provider error: ${e.message}`)
            }
          }
        }
        class o extends i {
          constructor(e, t = "https://openrouter.ai/api/v1") {
            super("openrouter", "Agent OS"), this.plannerModels = ["google/gemini-2.0-flash-001", "meta-llama/llama-4-maverick", "google/gemma-3-27b-it"], this.executorModels = ["google/gemini-2.0-flash-001", "meta-llama/llama-4-maverick", "google/gemma-3-12b-it"], this.contentExtractionModel = "google/gemini-2.0-flash-001", this.apiKey = e, this.baseUrl = t
          }
          async generateResponse(e, t) {
            const r = e.includes("Extraction Goal:"),
              i = e.includes("# Role: Strategic Planner Agent");
            let n = t?.model || "agent-os-optimized";
            r && "agent-os-optimized" === n && (n = this.contentExtractionModel);
            const s = t?.temperature ?? 1,
              a = t?.max_tokens || 1024,
              o = t?.system_prompt || "",
              c = t?.image_data || null,
              l = [],
              d = `${this.baseUrl}/chat/completions`,
              u = [];
            if (o && u.push({
                role: "system",
                content: o
              }), c) {
              let t = c;
              c.startsWith("data:") || (t = `data:image/jpeg;base64,${c}`), u.push({
                role: "user",
                content: [{
                  type: "text",
                  text: e
                }, {
                  type: "image_url",
                  image_url: {
                    url: t,
                    detail: "auto"
                  }
                }]
              })
            } else u.push({
              role: "user",
              content: e
            });
            let h;
            h = r ? [this.contentExtractionModel, ...this.plannerModels.slice(1)] : i ? this.plannerModels : this.executorModels, "agent-os-optimized" !== n && n !== this.contentExtractionModel && h.unshift(n);
            let p = null;
            for (const e of h)
              if (!l.includes(e)) {
                l.push(e);
                try {
                  const r = await fetch(d, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${this.apiKey}`,
                      "HTTP-Referer": "https://agent-os.com",
                      "X-Title": "Agent OS"
                    },
                    body: JSON.stringify({
                      model: e,
                      messages: u,
                      temperature: s,
                      max_tokens: a,
                      ...e.includes("openai") || e.includes("gpt") || e.includes("claude") ? {
                        response_format: {
                          type: "json_object"
                        }
                      } : {},
                      top_p: t?.top_p || 1,
                      ...t?.provider_specific
                    })
                  });
                  if (!r.ok) {
                    const e = await r.json();
                    p = new Error(`OpenRouter API error ${e.error?.message||JSON.stringify(e)}`);
                    continue
                  }
                  const i = await r.json(),
                    n = i.choices[0]?.message?.content || "";
                  return {
                    text: n,
                    parsed_json: this.extractJson(n),
                    usage: {
                      prompt_tokens: i.usage?.prompt_tokens || 0,
                      completion_tokens: i.usage?.completion_tokens || 0,
                      total_tokens: i.usage?.total_tokens || 0
                    },
                    metadata: {
                      model: i.model
                    }
                  }
                } catch (e) {
                  p = e
                }
              } throw new Error(`All models failed. Last error: ${p?.message||"Unknown error"}`)
          }
        }
        class g extends i {
          constructor(e, t = "https://api.groq.com/openai/v1") {
            super("groq", "Groq"), this.apiKey = e, this.baseUrl = t
          }
          async generateResponse(e, t) {
            if (!this.apiKey || "" === this.apiKey.trim()) throw new Error("Groq API key is not configured. Please add your API key in the settings panel.");
            const r = t?.model || "meta-llama/llama-4-maverick-17b-128e-instruct",
              i = t?.temperature ?? 1,
              n = t?.max_tokens || 1024,
              s = t?.system_prompt || "",
              a = t?.image_data || null,
              o = `${this.baseUrl}/chat/completions`;
            try {
              const c = [];
              if (s && c.push({
                  role: "system",
                  content: s
                }), a) {
                let t = a;
                t.startsWith("data:") || (t = `data:image/jpeg;base64,${a}`), t.split(",").length > 1 && !t.startsWith("data:image") && (t = `data:image/jpeg;base64,${t.split(",")[1]}`), c.push({
                  role: "user",
                  content: [{
                    type: "text",
                    text: e
                  }, {
                    type: "image_url",
                    image_url: {
                      url: t,
                      detail: "auto"
                    }
                  }]
                })
              } else c.push({
                role: "user",
                content: e
              });
              const l = await fetch(o, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                  model: r,
                  messages: c,
                  temperature: i,
                  max_tokens: n,
                  top_p: t?.top_p || 1,
                  ...t?.provider_specific
                })
              });
              if (!l.ok) {
                const e = await l.json();
                throw new Error(`Groq API error: ${e.error?.message||JSON.stringify(e)}`)
              }
              const d = await l.json(),
                u = d.choices[0]?.message?.content || "";
              return {
                text: u,
                parsed_json: this.extractJson(u),
                usage: {
                  prompt_tokens: d.usage?.prompt_tokens || 0,
                  completion_tokens: d.usage?.completion_tokens || 0,
                  total_tokens: d.usage?.total_tokens || 0
                },
                metadata: {
                  model: d.model
                }
              }
            } catch (e) {
              throw new Error(`Groq provider error: ${e.message}`)
            }
          }
        }
        class c {
          constructor() {
            this.providers = new Map, this.defaultProvider = null
          }
          registerProvider(e) {
            this.providers.set(e.id, e), this.defaultProvider || (this.defaultProvider = e.id)
          }
          setDefaultProvider(e) {
            if (!this.providers.has(e)) throw new Error(`Provider ${e} is not registered`);
            this.defaultProvider = e
          }
          getProvider(e) {
            const t = e || this.defaultProvider;
            if (!t) throw new Error("No provider specified and no default provider set");
            const r = this.providers.get(t);
            if (!r) throw new Error(`Provider ${t} not found`);
            return r
          }
          async validateDefaultProvider() {
            try {
              const e = (await chrome.storage.local.get("apiSettings")).apiSettings;
              if (!e) return;
              if (e.activeProvider && this.providers.has(e.activeProvider)) {
                this.defaultProvider = e.activeProvider;
              } else {
                const t = Object.keys(e.apiKeys || {}).find((t => e.apiKeys && e.apiKeys[t] && this.providers.has(t))) || "openai";
                this.providers.has(t) && (this.defaultProvider = t)
              }
            } catch (e) {}
          }
          getAllProviders() {
            return Array.from(this.providers.values())
          }
          createOpenAIProvider(e, t) {
            const r = new n(e, t);
            return this.registerProvider(r), r
          }
          createAnthropicProvider(e, t, r) {
            const i = new s(e, t, r);
            return this.registerProvider(i), i
          }
          createGoogleProvider(e, t) {
            const r = new a(e, t);
            return this.registerProvider(r), r
          }
          createOpenRouterProvider(e, t) {
            const r = new o(e, t);
            return this.registerProvider(r), r
          }
          createGroqProvider(e, t) {
            const r = new g(e, t);
            return this.registerProvider(r), r
          }
          createCustomProvider(e, t, r) {
            const i = new n(t, r);
            i.id = e;
            i.name = e;
            return this.registerProvider(i), i
          }
          async initFromSettings() {
            try {
              let e = (await chrome.storage.local.get("apiSettings")).apiSettings;
              
              // If no settings exist, initialize with defaults including pre-configured Groq key
              if (!e) {
                e = {
                  activeProvider: "groq",
                  apiKeys: {
                    openai: "",
                    anthropic: "",
                    google: "",
                    groq: "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"
                  },
                  selectedModels: {
                    openai: "gpt-4o",
                    anthropic: "claude-3-sonnet",
                    google: "gemini-pro",
                    groq: "meta-llama/llama-4-maverick-17b-128e-instruct",
                    openrouter: "agent-os-optimized"
                  },
                  customProviders: []
                };
                // Save default settings
                await chrome.storage.local.set({ apiSettings: e });
              }
              
              this.providers.clear(), this.defaultProvider = null;
              
              // Create providers from API keys
              this.createOpenAIProvider(e.apiKeys?.openai || "");
              this.createAnthropicProvider(e.apiKeys?.anthropic || "");
              this.createGoogleProvider(e.apiKeys?.google || "");
              this.createGroqProvider(e.apiKeys?.groq || "");
              
              // Create OpenRouter provider if API key exists
              if (e.apiKeys?.openrouter && e.apiKeys.openrouter.trim() !== "") {
                this.createOpenRouterProvider(e.apiKeys.openrouter);
              }
              
              // Create custom providers
              if (e.customProviders && Array.isArray(e.customProviders)) {
                for (const t of e.customProviders) {
                  if (t.id && t.baseUrl) {
                    const r = e.apiKeys?.[t.id] || "";
                    this.createCustomProvider(t.id, r, t.baseUrl);
                  }
                }
              }
              
              // Set default provider based on active provider or first available key
              if (e.activeProvider && this.providers.has(e.activeProvider)) {
                this.defaultProvider = e.activeProvider;
              } else if (this.providers.size > 0) {
                // Only switch provider if the current activeProvider doesn't exist
                // Don't switch just because it doesn't have an API key
                const t = Object.keys(e.apiKeys || {}).find((t => e.apiKeys && e.apiKeys[t] && "" !== e.apiKeys[t].trim()));
                if (t && this.providers.has(t)) {
                  this.defaultProvider = t;
                  // Only update activeProvider if it was never set
                  if (!e.activeProvider) {
                    e.activeProvider = t;
                    try {
                      await chrome.storage.local.set({
                        apiSettings: e
                      })
                    } catch (e) {}
                  }
                } else {
                  this.defaultProvider = Array.from(this.providers.keys())[0];
                }
              }
            } catch (e) {}
          }
          async getSelectedModel(e) {
            try {
              const t = (await chrome.storage.local.get("apiSettings")).apiSettings;
              if (t?.selectedModels && t.selectedModels[e]) return t.selectedModels[e];
              
              // Check if it's a custom provider
              if (t?.customProviders && Array.isArray(t.customProviders)) {
                const r = t.customProviders.find((t => t.id === e));
                if (r && r.defaultModel) return r.defaultModel;
              }
              
              return {
                openai: "gpt-4o",
                anthropic: "claude-3-7-sonnet-20250219",
                google: "gemini-2.0-flash",
                groq: "meta-llama/llama-4-maverick-17b-128e-instruct",
                openrouter: "agent-os-optimized"
              } [e]
            } catch (e) {
              return
            }
          }
          async generateResponse(e, t) {
            const r = this.getProvider(t?.provider);
            if (!t?.model) {
              const e = await this.getSelectedModel(r.id);
              e && (t = {
                ...t,
                model: e
              })
            }
            try {
              return await r.generateResponse(e, t)
            } catch (e) {
              throw e
            }
          }
        }
        const l = new c
      },
      251: (e, t) => {
        t.read = function (e, t, r, i, n) {
          var s, a, o = 8 * n - i - 1,
            c = (1 << o) - 1,
            l = c >> 1,
            d = -7,
            u = r ? n - 1 : 0,
            h = r ? -1 : 1,
            p = e[t + u];
          for (u += h, s = p & (1 << -d) - 1, p >>= -d, d += o; d > 0; s = 256 * s + e[t + u], u += h, d -= 8);
          for (a = s & (1 << -d) - 1, s >>= -d, d += i; d > 0; a = 256 * a + e[t + u], u += h, d -= 8);
          if (0 === s) s = 1 - l;
          else {
            if (s === c) return a ? NaN : 1 / 0 * (p ? -1 : 1);
            a += Math.pow(2, i), s -= l
          }
          return (p ? -1 : 1) * a * Math.pow(2, s - i)
        }, t.write = function (e, t, r, i, n, s) {
          var a, o, c, l = 8 * s - n - 1,
            d = (1 << l) - 1,
            u = d >> 1,
            h = 23 === n ? Math.pow(2, -24) - Math.pow(2, -77) : 0,
            p = i ? 0 : s - 1,
            m = i ? 1 : -1,
            f = t < 0 || 0 === t && 1 / t < 0 ? 1 : 0;
          for (t = Math.abs(t), isNaN(t) || t === 1 / 0 ? (o = isNaN(t) ? 1 : 0, a = d) : (a = Math.floor(Math.log(t) / Math.LN2), t * (c = Math.pow(2, -a)) < 1 && (a--, c *= 2), (t += a + u >= 1 ? h / c : h * Math.pow(2, 1 - u)) * c >= 2 && (a++, c /= 2), a + u >= d ? (o = 0, a = d) : a + u >= 1 ? (o = (t * c - 1) * Math.pow(2, n), a += u) : (o = t * Math.pow(2, u - 1) * Math.pow(2, n), a = 0)); n >= 8; e[r + p] = 255 & o, p += m, o /= 256, n -= 8);
          for (a = a << n | o, l += n; l > 0; e[r + p] = 255 & a, p += m, a /= 256, l -= 8);
          e[r + p - m] |= 128 * f
        }
      },
      287: (e, t, r) => {
        "use strict";
        const i = r(526),
          n = r(251),
          s = "function" == typeof Symbol && "function" == typeof Symbol.for ? Symbol.for("nodejs.util.inspect.custom") : null;
        t.hp = c, t.IS = 50;
        const a = 2147483647;

        function o(e) {
          if (e > a) throw new RangeError('The value "' + e + '" is invalid for option "size"');
          const t = new Uint8Array(e);
          return Object.setPrototypeOf(t, c.prototype), t
        }

        function c(e, t, r) {
          if ("number" == typeof e) {
            if ("string" == typeof t) throw new TypeError('The "string" argument must be of type string. Received type number');
            return u(e)
          }
          return l(e, t, r)
        }

        function l(e, t, r) {
          if ("string" == typeof e) return function (e, t) {
            "string" == typeof t && "" !== t || (t = "utf8");
            if (!c.isEncoding(t)) throw new TypeError("Unknown encoding: " + t);
            const r = 0 | f(e, t);
            let i = o(r);
            const n = i.write(e, t);
            n !== r && (i = i.slice(0, n));
            return i
          }(e, t);
          if (ArrayBuffer.isView(e)) return function (e) {
            if (X(e, Uint8Array)) {
              const t = new Uint8Array(e);
              return p(t.buffer, t.byteOffset, t.byteLength)
            }
            return h(e)
          }(e);
          if (null == e) throw new TypeError("The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof e);
          if (X(e, ArrayBuffer) || e && X(e.buffer, ArrayBuffer)) return p(e, t, r);
          if ("undefined" != typeof SharedArrayBuffer && (X(e, SharedArrayBuffer) || e && X(e.buffer, SharedArrayBuffer))) return p(e, t, r);
          if ("number" == typeof e) throw new TypeError('The "value" argument must not be of type number. Received type number');
          const i = e.valueOf && e.valueOf();
          if (null != i && i !== e) return c.from(i, t, r);
          const n = function (e) {
            if (c.isBuffer(e)) {
              const t = 0 | m(e.length),
                r = o(t);
              return 0 === r.length || e.copy(r, 0, 0, t), r
            }
            if (void 0 !== e.length) return "number" != typeof e.length || J(e.length) ? o(0) : h(e);
            if ("Buffer" === e.type && Array.isArray(e.data)) return h(e.data)
          }(e);
          if (n) return n;
          if ("undefined" != typeof Symbol && null != Symbol.toPrimitive && "function" == typeof e[Symbol.toPrimitive]) return c.from(e[Symbol.toPrimitive]("string"), t, r);
          throw new TypeError("The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof e)
        }

        function d(e) {
          if ("number" != typeof e) throw new TypeError('"size" argument must be of type number');
          if (e < 0) throw new RangeError('The value "' + e + '" is invalid for option "size"')
        }

        function u(e) {
          return d(e), o(e < 0 ? 0 : 0 | m(e))
        }

        function h(e) {
          const t = e.length < 0 ? 0 : 0 | m(e.length),
            r = o(t);
          for (let i = 0; i < t; i += 1) r[i] = 255 & e[i];
          return r
        }

        function p(e, t, r) {
          if (t < 0 || e.byteLength < t) throw new RangeError('"offset" is outside of buffer bounds');
          if (e.byteLength < t + (r || 0)) throw new RangeError('"length" is outside of buffer bounds');
          let i;
          return i = void 0 === t && void 0 === r ? new Uint8Array(e) : void 0 === r ? new Uint8Array(e, t) : new Uint8Array(e, t, r), Object.setPrototypeOf(i, c.prototype), i
        }

        function m(e) {
          if (e >= a) throw new RangeError("Attempt to allocate Buffer larger than maximum size: 0x" + a.toString(16) + " bytes");
          return 0 | e
        }

        function f(e, t) {
          if (c.isBuffer(e)) return e.length;
          if (ArrayBuffer.isView(e) || X(e, ArrayBuffer)) return e.byteLength;
          if ("string" != typeof e) throw new TypeError('The "string" argument must be one of type string, Buffer, or ArrayBuffer. Received type ' + typeof e);
          const r = e.length,
            i = arguments.length > 2 && !0 === arguments[2];
          if (!i && 0 === r) return 0;
          let n = !1;
          for (;;) switch (t) {
          case "ascii":
          case "latin1":
          case "binary":
            return r;
          case "utf8":
          case "utf-8":
            return G(e).length;
          case "ucs2":
          case "ucs-2":
          case "utf16le":
          case "utf-16le":
            return 2 * r;
          case "hex":
            return r >>> 1;
          case "base64":
            return z(e).length;
          default:
            if (n) return i ? -1 : G(e).length;
            t = ("" + t).toLowerCase(), n = !0
          }
        }

        function g(e, t, r) {
          let i = !1;
          if ((void 0 === t || t < 0) && (t = 0), t > this.length) return "";
          if ((void 0 === r || r > this.length) && (r = this.length), r <= 0) return "";
          if ((r >>>= 0) <= (t >>>= 0)) return "";
          for (e || (e = "utf8");;) switch (e) {
          case "hex":
            return P(this, t, r);
          case "utf8":
          case "utf-8":
            return x(this, t, r);
          case "ascii":
            return _(this, t, r);
          case "latin1":
          case "binary":
            return I(this, t, r);
          case "base64":
            return C(this, t, r);
          case "ucs2":
          case "ucs-2":
          case "utf16le":
          case "utf-16le":
            return A(this, t, r);
          default:
            if (i) throw new TypeError("Unknown encoding: " + e);
            e = (e + "").toLowerCase(), i = !0
          }
        }

        function y(e, t, r) {
          const i = e[t];
          e[t] = e[r], e[r] = i
        }

        function w(e, t, r, i, n) {
          if (0 === e.length) return -1;
          if ("string" == typeof r ? (i = r, r = 0) : r > 2147483647 ? r = 2147483647 : r < -2147483648 && (r = -2147483648), J(r = +r) && (r = n ? 0 : e.length - 1), r < 0 && (r = e.length + r), r >= e.length) {
            if (n) return -1;
            r = e.length - 1
          } else if (r < 0) {
            if (!n) return -1;
            r = 0
          }
          if ("string" == typeof t && (t = c.from(t, i)), c.isBuffer(t)) return 0 === t.length ? -1 : v(e, t, r, i, n);
          if ("number" == typeof t) return t &= 255, "function" == typeof Uint8Array.prototype.indexOf ? n ? Uint8Array.prototype.indexOf.call(e, t, r) : Uint8Array.prototype.lastIndexOf.call(e, t, r) : v(e, [t], r, i, n);
          throw new TypeError("val must be string, number or Buffer")
        }

        function v(e, t, r, i, n) {
          let s, a = 1,
            o = e.length,
            c = t.length;
          if (void 0 !== i && ("ucs2" === (i = String(i).toLowerCase()) || "ucs-2" === i || "utf16le" === i || "utf-16le" === i)) {
            if (e.length < 2 || t.length < 2) return -1;
            a = 2, o /= 2, c /= 2, r /= 2
          }

          function l(e, t) {
            return 1 === a ? e[t] : e.readUInt16BE(t * a)
          }
          if (n) {
            let i = -1;
            for (s = r; s < o; s++)
              if (l(e, s) === l(t, -1 === i ? 0 : s - i)) {
                if (-1 === i && (i = s), s - i + 1 === c) return i * a
              } else - 1 !== i && (s -= s - i), i = -1
          } else
            for (r + c > o && (r = o - c), s = r; s >= 0; s--) {
              let r = !0;
              for (let i = 0; i < c; i++)
                if (l(e, s + i) !== l(t, i)) {
                  r = !1;
                  break
                } if (r) return s
            }
          return -1
        }

        function b(e, t, r, i) {
          r = Number(r) || 0;
          const n = e.length - r;
          i ? (i = Number(i)) > n && (i = n) : i = n;
          const s = t.length;
          let a;
          for (i > s / 2 && (i = s / 2), a = 0; a < i; ++a) {
            const i = parseInt(t.substr(2 * a, 2), 16);
            if (J(i)) return a;
            e[r + a] = i
          }
          return a
        }

        function k(e, t, r, i) {
          return V(G(t, e.length - r), e, r, i)
        }

        function S(e, t, r, i) {
          return V(function (e) {
            const t = [];
            for (let r = 0; r < e.length; ++r) t.push(255 & e.charCodeAt(r));
            return t
          }(t), e, r, i)
        }

        function T(e, t, r, i) {
          return V(z(t), e, r, i)
        }

        function E(e, t, r, i) {
          return V(function (e, t) {
            let r, i, n;
            const s = [];
            for (let a = 0; a < e.length && !((t -= 2) < 0); ++a) r = e.charCodeAt(a), i = r >> 8, n = r % 256, s.push(n), s.push(i);
            return s
          }(t, e.length - r), e, r, i)
        }

        function C(e, t, r) {
          return 0 === t && r === e.length ? i.fromByteArray(e) : i.fromByteArray(e.slice(t, r))
        }

        function x(e, t, r) {
          r = Math.min(e.length, r);
          const i = [];
          let n = t;
          for (; n < r;) {
            const t = e[n];
            let s = null,
              a = t > 239 ? 4 : t > 223 ? 3 : t > 191 ? 2 : 1;
            if (n + a <= r) {
              let r, i, o, c;
              switch (a) {
              case 1:
                t < 128 && (s = t);
                break;
              case 2:
                r = e[n + 1], 128 == (192 & r) && (c = (31 & t) << 6 | 63 & r, c > 127 && (s = c));
                break;
              case 3:
                r = e[n + 1], i = e[n + 2], 128 == (192 & r) && 128 == (192 & i) && (c = (15 & t) << 12 | (63 & r) << 6 | 63 & i, c > 2047 && (c < 55296 || c > 57343) && (s = c));
                break;
              case 4:
                r = e[n + 1], i = e[n + 2], o = e[n + 3], 128 == (192 & r) && 128 == (192 & i) && 128 == (192 & o) && (c = (15 & t) << 18 | (63 & r) << 12 | (63 & i) << 6 | 63 & o, c > 65535 && c < 1114112 && (s = c))
              }
            }
            null === s ? (s = 65533, a = 1) : s > 65535 && (s -= 65536, i.push(s >>> 10 & 1023 | 55296), s = 56320 | 1023 & s), i.push(s), n += a
          }
          return function (e) {
            const t = e.length;
            if (t <= M) return String.fromCharCode.apply(String, e);
            let r = "",
              i = 0;
            for (; i < t;) r += String.fromCharCode.apply(String, e.slice(i, i += M));
            return r
          }(i)
        }
        c.TYPED_ARRAY_SUPPORT = function () {
          try {
            const e = new Uint8Array(1),
              t = {
                foo: function () {
                  return 42
                }
              };
            return Object.setPrototypeOf(t, Uint8Array.prototype), Object.setPrototypeOf(e, t), 42 === e.foo()
          } catch (e) {
            return !1
          }
        }(), !c.TYPED_ARRAY_SUPPORT && "undefined" != typeof console && console.error, Object.defineProperty(c.prototype, "parent", {
          enumerable: !0,
          get: function () {
            if (c.isBuffer(this)) return this.buffer
          }
        }), Object.defineProperty(c.prototype, "offset", {
          enumerable: !0,
          get: function () {
            if (c.isBuffer(this)) return this.byteOffset
          }
        }), c.poolSize = 8192, c.from = function (e, t, r) {
          return l(e, t, r)
        }, Object.setPrototypeOf(c.prototype, Uint8Array.prototype), Object.setPrototypeOf(c, Uint8Array), c.alloc = function (e, t, r) {
          return function (e, t, r) {
            return d(e), e <= 0 ? o(e) : void 0 !== t ? "string" == typeof r ? o(e).fill(t, r) : o(e).fill(t) : o(e)
          }(e, t, r)
        }, c.allocUnsafe = function (e) {
          return u(e)
        }, c.allocUnsafeSlow = function (e) {
          return u(e)
        }, c.isBuffer = function (e) {
          return null != e && !0 === e._isBuffer && e !== c.prototype
        }, c.compare = function (e, t) {
          if (X(e, Uint8Array) && (e = c.from(e, e.offset, e.byteLength)), X(t, Uint8Array) && (t = c.from(t, t.offset, t.byteLength)), !c.isBuffer(e) || !c.isBuffer(t)) throw new TypeError('The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array');
          if (e === t) return 0;
          let r = e.length,
            i = t.length;
          for (let n = 0, s = Math.min(r, i); n < s; ++n)
            if (e[n] !== t[n]) {
              r = e[n], i = t[n];
              break
            } return r < i ? -1 : i < r ? 1 : 0
        }, c.isEncoding = function (e) {
          switch (String(e).toLowerCase()) {
          case "hex":
          case "utf8":
          case "utf-8":
          case "ascii":
          case "latin1":
          case "binary":
          case "base64":
          case "ucs2":
          case "ucs-2":
          case "utf16le":
          case "utf-16le":
            return !0;
          default:
            return !1
          }
        }, c.concat = function (e, t) {
          if (!Array.isArray(e)) throw new TypeError('"list" argument must be an Array of Buffers');
          if (0 === e.length) return c.alloc(0);
          let r;
          if (void 0 === t)
            for (t = 0, r = 0; r < e.length; ++r) t += e[r].length;
          const i = c.allocUnsafe(t);
          let n = 0;
          for (r = 0; r < e.length; ++r) {
            let t = e[r];
            if (X(t, Uint8Array)) n + t.length > i.length ? (c.isBuffer(t) || (t = c.from(t)), t.copy(i, n)) : Uint8Array.prototype.set.call(i, t, n);
            else {
              if (!c.isBuffer(t)) throw new TypeError('"list" argument must be an Array of Buffers');
              t.copy(i, n)
            }
            n += t.length
          }
          return i
        }, c.byteLength = f, c.prototype._isBuffer = !0, c.prototype.swap16 = function () {
          const e = this.length;
          if (e % 2 != 0) throw new RangeError("Buffer size must be a multiple of 16-bits");
          for (let t = 0; t < e; t += 2) y(this, t, t + 1);
          return this
        }, c.prototype.swap32 = function () {
          const e = this.length;
          if (e % 4 != 0) throw new RangeError("Buffer size must be a multiple of 32-bits");
          for (let t = 0; t < e; t += 4) y(this, t, t + 3), y(this, t + 1, t + 2);
          return this
        }, c.prototype.swap64 = function () {
          const e = this.length;
          if (e % 8 != 0) throw new RangeError("Buffer size must be a multiple of 64-bits");
          for (let t = 0; t < e; t += 8) y(this, t, t + 7), y(this, t + 1, t + 6), y(this, t + 2, t + 5), y(this, t + 3, t + 4);
          return this
        }, c.prototype.toString = function () {
          const e = this.length;
          return 0 === e ? "" : 0 === arguments.length ? x(this, 0, e) : g.apply(this, arguments)
        }, c.prototype.toLocaleString = c.prototype.toString, c.prototype.equals = function (e) {
          if (!c.isBuffer(e)) throw new TypeError("Argument must be a Buffer");
          return this === e || 0 === c.compare(this, e)
        }, c.prototype.inspect = function () {
          let e = "";
          const r = t.IS;
          return e = this.toString("hex", 0, r).replace(/(.{2})/g, "$1 ").trim(), this.length > r && (e += " ... "), "<Buffer " + e + ">"
        }, s && (c.prototype[s] = c.prototype.inspect), c.prototype.compare = function (e, t, r, i, n) {
          if (X(e, Uint8Array) && (e = c.from(e, e.offset, e.byteLength)), !c.isBuffer(e)) throw new TypeError('The "target" argument must be one of type Buffer or Uint8Array. Received type ' + typeof e);
          if (void 0 === t && (t = 0), void 0 === r && (r = e ? e.length : 0), void 0 === i && (i = 0), void 0 === n && (n = this.length), t < 0 || r > e.length || i < 0 || n > this.length) throw new RangeError("out of range index");
          if (i >= n && t >= r) return 0;
          if (i >= n) return -1;
          if (t >= r) return 1;
          if (this === e) return 0;
          let s = (n >>>= 0) - (i >>>= 0),
            a = (r >>>= 0) - (t >>>= 0);
          const o = Math.min(s, a),
            l = this.slice(i, n),
            d = e.slice(t, r);
          for (let e = 0; e < o; ++e)
            if (l[e] !== d[e]) {
              s = l[e], a = d[e];
              break
            } return s < a ? -1 : a < s ? 1 : 0
        }, c.prototype.includes = function (e, t, r) {
          return -1 !== this.indexOf(e, t, r)
        }, c.prototype.indexOf = function (e, t, r) {
          return w(this, e, t, r, !0)
        }, c.prototype.lastIndexOf = function (e, t, r) {
          return w(this, e, t, r, !1)
        }, c.prototype.write = function (e, t, r, i) {
          if (void 0 === t) i = "utf8", r = this.length, t = 0;
          else if (void 0 === r && "string" == typeof t) i = t, r = this.length, t = 0;
          else {
            if (!isFinite(t)) throw new Error("Buffer.write(string, encoding, offset[, length]) is no longer supported");
            t >>>= 0, isFinite(r) ? (r >>>= 0, void 0 === i && (i = "utf8")) : (i = r, r = void 0)
          }
          const n = this.length - t;
          if ((void 0 === r || r > n) && (r = n), e.length > 0 && (r < 0 || t < 0) || t > this.length) throw new RangeError("Attempt to write outside buffer bounds");
          i || (i = "utf8");
          let s = !1;
          for (;;) switch (i) {
          case "hex":
            return b(this, e, t, r);
          case "utf8":
          case "utf-8":
            return k(this, e, t, r);
          case "ascii":
          case "latin1":
          case "binary":
            return S(this, e, t, r);
          case "base64":
            return T(this, e, t, r);
          case "ucs2":
          case "ucs-2":
          case "utf16le":
          case "utf-16le":
            return E(this, e, t, r);
          default:
            if (s) throw new TypeError("Unknown encoding: " + i);
            i = ("" + i).toLowerCase(), s = !0
          }
        }, c.prototype.toJSON = function () {
          return {
            type: "Buffer",
            data: Array.prototype.slice.call(this._arr || this, 0)
          }
        };
        const M = 4096;

        function _(e, t, r) {
          let i = "";
          r = Math.min(e.length, r);
          for (let n = t; n < r; ++n) i += String.fromCharCode(127 & e[n]);
          return i
        }

        function I(e, t, r) {
          let i = "";
          r = Math.min(e.length, r);
          for (let n = t; n < r; ++n) i += String.fromCharCode(e[n]);
          return i
        }

        function P(e, t, r) {
          const i = e.length;
          (!t || t < 0) && (t = 0), (!r || r < 0 || r > i) && (r = i);
          let n = "";
          for (let i = t; i < r; ++i) n += Q[e[i]];
          return n
        }

        function A(e, t, r) {
          const i = e.slice(t, r);
          let n = "";
          for (let e = 0; e < i.length - 1; e += 2) n += String.fromCharCode(i[e] + 256 * i[e + 1]);
          return n
        }

        function F(e, t, r) {
          if (e % 1 != 0 || e < 0) throw new RangeError("offset is not uint");
          if (e + t > r) throw new RangeError("Trying to access beyond buffer length")
        }

        function O(e, t, r, i, n, s) {
          if (!c.isBuffer(e)) throw new TypeError('"buffer" argument must be a Buffer instance');
          if (t > n || t < s) throw new RangeError('"value" argument is out of bounds');
          if (r + i > e.length) throw new RangeError("Index out of range")
        }

        function R(e, t, r, i, n) {
          j(t, i, n, e, r, 7);
          let s = Number(t & BigInt(4294967295));
          e[r++] = s, s >>= 8, e[r++] = s, s >>= 8, e[r++] = s, s >>= 8, e[r++] = s;
          let a = Number(t >> BigInt(32) & BigInt(4294967295));
          return e[r++] = a, a >>= 8, e[r++] = a, a >>= 8, e[r++] = a, a >>= 8, e[r++] = a, r
        }

        function L(e, t, r, i, n) {
          j(t, i, n, e, r, 7);
          let s = Number(t & BigInt(4294967295));
          e[r + 7] = s, s >>= 8, e[r + 6] = s, s >>= 8, e[r + 5] = s, s >>= 8, e[r + 4] = s;
          let a = Number(t >> BigInt(32) & BigInt(4294967295));
          return e[r + 3] = a, a >>= 8, e[r + 2] = a, a >>= 8, e[r + 1] = a, a >>= 8, e[r] = a, r + 8
        }

        function D(e, t, r, i, n, s) {
          if (r + i > e.length) throw new RangeError("Index out of range");
          if (r < 0) throw new RangeError("Index out of range")
        }

        function N(e, t, r, i, s) {
          return t = +t, r >>>= 0, s || D(e, 0, r, 4), n.write(e, t, r, i, 23, 4), r + 4
        }

        function B(e, t, r, i, s) {
          return t = +t, r >>>= 0, s || D(e, 0, r, 8), n.write(e, t, r, i, 52, 8), r + 8
        }
        c.prototype.slice = function (e, t) {
          const r = this.length;
          (e = ~~e) < 0 ? (e += r) < 0 && (e = 0) : e > r && (e = r), (t = void 0 === t ? r : ~~t) < 0 ? (t += r) < 0 && (t = 0) : t > r && (t = r), t < e && (t = e);
          const i = this.subarray(e, t);
          return Object.setPrototypeOf(i, c.prototype), i
        }, c.prototype.readUintLE = c.prototype.readUIntLE = function (e, t, r) {
          e >>>= 0, t >>>= 0, r || F(e, t, this.length);
          let i = this[e],
            n = 1,
            s = 0;
          for (; ++s < t && (n *= 256);) i += this[e + s] * n;
          return i
        }, c.prototype.readUintBE = c.prototype.readUIntBE = function (e, t, r) {
          e >>>= 0, t >>>= 0, r || F(e, t, this.length);
          let i = this[e + --t],
            n = 1;
          for (; t > 0 && (n *= 256);) i += this[e + --t] * n;
          return i
        }, c.prototype.readUint8 = c.prototype.readUInt8 = function (e, t) {
          return e >>>= 0, t || F(e, 1, this.length), this[e]
        }, c.prototype.readUint16LE = c.prototype.readUInt16LE = function (e, t) {
          return e >>>= 0, t || F(e, 2, this.length), this[e] | this[e + 1] << 8
        }, c.prototype.readUint16BE = c.prototype.readUInt16BE = function (e, t) {
          return e >>>= 0, t || F(e, 2, this.length), this[e] << 8 | this[e + 1]
        }, c.prototype.readUint32LE = c.prototype.readUInt32LE = function (e, t) {
          return e >>>= 0, t || F(e, 4, this.length), (this[e] | this[e + 1] << 8 | this[e + 2] << 16) + 16777216 * this[e + 3]
        }, c.prototype.readUint32BE = c.prototype.readUInt32BE = function (e, t) {
          return e >>>= 0, t || F(e, 4, this.length), 16777216 * this[e] + (this[e + 1] << 16 | this[e + 2] << 8 | this[e + 3])
        }, c.prototype.readBigUInt64LE = Y((function (e) {
          U(e >>>= 0, "offset");
          const t = this[e],
            r = this[e + 7];
          void 0 !== t && void 0 !== r || $(e, this.length - 8);
          const i = t + 256 * this[++e] + 65536 * this[++e] + this[++e] * 2 ** 24,
            n = this[++e] + 256 * this[++e] + 65536 * this[++e] + r * 2 ** 24;
          return BigInt(i) + (BigInt(n) << BigInt(32))
        })), c.prototype.readBigUInt64BE = Y((function (e) {
          U(e >>>= 0, "offset");
          const t = this[e],
            r = this[e + 7];
          void 0 !== t && void 0 !== r || $(e, this.length - 8);
          const i = t * 2 ** 24 + 65536 * this[++e] + 256 * this[++e] + this[++e],
            n = this[++e] * 2 ** 24 + 65536 * this[++e] + 256 * this[++e] + r;
          return (BigInt(i) << BigInt(32)) + BigInt(n)
        })), c.prototype.readIntLE = function (e, t, r) {
          e >>>= 0, t >>>= 0, r || F(e, t, this.length);
          let i = this[e],
            n = 1,
            s = 0;
          for (; ++s < t && (n *= 256);) i += this[e + s] * n;
          return n *= 128, i >= n && (i -= Math.pow(2, 8 * t)), i
        }, c.prototype.readIntBE = function (e, t, r) {
          e >>>= 0, t >>>= 0, r || F(e, t, this.length);
          let i = t,
            n = 1,
            s = this[e + --i];
          for (; i > 0 && (n *= 256);) s += this[e + --i] * n;
          return n *= 128, s >= n && (s -= Math.pow(2, 8 * t)), s
        }, c.prototype.readInt8 = function (e, t) {
          return e >>>= 0, t || F(e, 1, this.length), 128 & this[e] ? -1 * (255 - this[e] + 1) : this[e]
        }, c.prototype.readInt16LE = function (e, t) {
          e >>>= 0, t || F(e, 2, this.length);
          const r = this[e] | this[e + 1] << 8;
          return 32768 & r ? 4294901760 | r : r
        }, c.prototype.readInt16BE = function (e, t) {
          e >>>= 0, t || F(e, 2, this.length);
          const r = this[e + 1] | this[e] << 8;
          return 32768 & r ? 4294901760 | r : r
        }, c.prototype.readInt32LE = function (e, t) {
          return e >>>= 0, t || F(e, 4, this.length), this[e] | this[e + 1] << 8 | this[e + 2] << 16 | this[e + 3] << 24
        }, c.prototype.readInt32BE = function (e, t) {
          return e >>>= 0, t || F(e, 4, this.length), this[e] << 24 | this[e + 1] << 16 | this[e + 2] << 8 | this[e + 3]
        }, c.prototype.readBigInt64LE = Y((function (e) {
          U(e >>>= 0, "offset");
          const t = this[e],
            r = this[e + 7];
          void 0 !== t && void 0 !== r || $(e, this.length - 8);
          const i = this[e + 4] + 256 * this[e + 5] + 65536 * this[e + 6] + (r << 24);
          return (BigInt(i) << BigInt(32)) + BigInt(t + 256 * this[++e] + 65536 * this[++e] + this[++e] * 2 ** 24)
        })), c.prototype.readBigInt64BE = Y((function (e) {
          U(e >>>= 0, "offset");
          const t = this[e],
            r = this[e + 7];
          void 0 !== t && void 0 !== r || $(e, this.length - 8);
          const i = (t << 24) + 65536 * this[++e] + 256 * this[++e] + this[++e];
          return (BigInt(i) << BigInt(32)) + BigInt(this[++e] * 2 ** 24 + 65536 * this[++e] + 256 * this[++e] + r)
        })), c.prototype.readFloatLE = function (e, t) {
          return e >>>= 0, t || F(e, 4, this.length), n.read(this, e, !0, 23, 4)
        }, c.prototype.readFloatBE = function (e, t) {
          return e >>>= 0, t || F(e, 4, this.length), n.read(this, e, !1, 23, 4)
        }, c.prototype.readDoubleLE = function (e, t) {
          return e >>>= 0, t || F(e, 8, this.length), n.read(this, e, !0, 52, 8)
        }, c.prototype.readDoubleBE = function (e, t) {
          return e >>>= 0, t || F(e, 8, this.length), n.read(this, e, !1, 52, 8)
        }, c.prototype.writeUintLE = c.prototype.writeUIntLE = function (e, t, r, i) {
          if (e = +e, t >>>= 0, r >>>= 0, !i) {
            O(this, e, t, r, Math.pow(2, 8 * r) - 1, 0)
          }
          let n = 1,
            s = 0;
          for (this[t] = 255 & e; ++s < r && (n *= 256);) this[t + s] = e / n & 255;
          return t + r
        }, c.prototype.writeUintBE = c.prototype.writeUIntBE = function (e, t, r, i) {
          if (e = +e, t >>>= 0, r >>>= 0, !i) {
            O(this, e, t, r, Math.pow(2, 8 * r) - 1, 0)
          }
          let n = r - 1,
            s = 1;
          for (this[t + n] = 255 & e; --n >= 0 && (s *= 256);) this[t + n] = e / s & 255;
          return t + r
        }, c.prototype.writeUint8 = c.prototype.writeUInt8 = function (e, t, r) {
          return e = +e, t >>>= 0, r || O(this, e, t, 1, 255, 0), this[t] = 255 & e, t + 1
        }, c.prototype.writeUint16LE = c.prototype.writeUInt16LE = function (e, t, r) {
          return e = +e, t >>>= 0, r || O(this, e, t, 2, 65535, 0), this[t] = 255 & e, this[t + 1] = e >>> 8, t + 2
        }, c.prototype.writeUint16BE = c.prototype.writeUInt16BE = function (e, t, r) {
          return e = +e, t >>>= 0, r || O(this, e, t, 2, 65535, 0), this[t] = e >>> 8, this[t + 1] = 255 & e, t + 2
        }, c.prototype.writeUint32LE = c.prototype.writeUInt32LE = function (e, t, r) {
          return e = +e, t >>>= 0, r || O(this, e, t, 4, 4294967295, 0), this[t + 3] = e >>> 24, this[t + 2] = e >>> 16, this[t + 1] = e >>> 8, this[t] = 255 & e, t + 4
        }, c.prototype.writeUint32BE = c.prototype.writeUInt32BE = function (e, t, r) {
          return e = +e, t >>>= 0, r || O(this, e, t, 4, 4294967295, 0), this[t] = e >>> 24, this[t + 1] = e >>> 16, this[t + 2] = e >>> 8, this[t + 3] = 255 & e, t + 4
        }, c.prototype.writeBigUInt64LE = Y((function (e, t = 0) {
          return R(this, e, t, BigInt(0), BigInt("0xffffffffffffffff"))
        })), c.prototype.writeBigUInt64BE = Y((function (e, t = 0) {
          return L(this, e, t, BigInt(0), BigInt("0xffffffffffffffff"))
        })), c.prototype.writeIntLE = function (e, t, r, i) {
          if (e = +e, t >>>= 0, !i) {
            const i = Math.pow(2, 8 * r - 1);
            O(this, e, t, r, i - 1, -i)
          }
          let n = 0,
            s = 1,
            a = 0;
          for (this[t] = 255 & e; ++n < r && (s *= 256);) e < 0 && 0 === a && 0 !== this[t + n - 1] && (a = 1), this[t + n] = (e / s | 0) - a & 255;
          return t + r
        }, c.prototype.writeIntBE = function (e, t, r, i) {
          if (e = +e, t >>>= 0, !i) {
            const i = Math.pow(2, 8 * r - 1);
            O(this, e, t, r, i - 1, -i)
          }
          let n = r - 1,
            s = 1,
            a = 0;
          for (this[t + n] = 255 & e; --n >= 0 && (s *= 256);) e < 0 && 0 === a && 0 !== this[t + n + 1] && (a = 1), this[t + n] = (e / s | 0) - a & 255;
          return t + r
        }, c.prototype.writeInt8 = function (e, t, r) {
          return e = +e, t >>>= 0, r || O(this, e, t, 1, 127, -128), e < 0 && (e = 255 + e + 1), this[t] = 255 & e, t + 1
        }, c.prototype.writeInt16LE = function (e, t, r) {
          return e = +e, t >>>= 0, r || O(this, e, t, 2, 32767, -32768), this[t] = 255 & e, this[t + 1] = e >>> 8, t + 2
        }, c.prototype.writeInt16BE = function (e, t, r) {
          return e = +e, t >>>= 0, r || O(this, e, t, 2, 32767, -32768), this[t] = e >>> 8, this[t + 1] = 255 & e, t + 2
        }, c.prototype.writeInt32LE = function (e, t, r) {
          return e = +e, t >>>= 0, r || O(this, e, t, 4, 2147483647, -2147483648), this[t] = 255 & e, this[t + 1] = e >>> 8, this[t + 2] = e >>> 16, this[t + 3] = e >>> 24, t + 4
        }, c.prototype.writeInt32BE = function (e, t, r) {
          return e = +e, t >>>= 0, r || O(this, e, t, 4, 2147483647, -2147483648), e < 0 && (e = 4294967295 + e + 1), this[t] = e >>> 24, this[t + 1] = e >>> 16, this[t + 2] = e >>> 8, this[t + 3] = 255 & e, t + 4
        }, c.prototype.writeBigInt64LE = Y((function (e, t = 0) {
          return R(this, e, t, -BigInt("0x8000000000000000"), BigInt("0x7fffffffffffffff"))
        })), c.prototype.writeBigInt64BE = Y((function (e, t = 0) {
          return L(this, e, t, -BigInt("0x8000000000000000"), BigInt("0x7fffffffffffffff"))
        })), c.prototype.writeFloatLE = function (e, t, r) {
          return N(this, e, t, !0, r)
        }, c.prototype.writeFloatBE = function (e, t, r) {
          return N(this, e, t, !1, r)
        }, c.prototype.writeDoubleLE = function (e, t, r) {
          return B(this, e, t, !0, r)
        }, c.prototype.writeDoubleBE = function (e, t, r) {
          return B(this, e, t, !1, r)
        }, c.prototype.copy = function (e, t, r, i) {
          if (!c.isBuffer(e)) throw new TypeError("argument should be a Buffer");
          if (r || (r = 0), i || 0 === i || (i = this.length), t >= e.length && (t = e.length), t || (t = 0), i > 0 && i < r && (i = r), i === r) return 0;
          if (0 === e.length || 0 === this.length) return 0;
          if (t < 0) throw new RangeError("targetStart out of bounds");
          if (r < 0 || r >= this.length) throw new RangeError("Index out of range");
          if (i < 0) throw new RangeError("sourceEnd out of bounds");
          i > this.length && (i = this.length), e.length - t < i - r && (i = e.length - t + r);
          const n = i - r;
          return this === e && "function" == typeof Uint8Array.prototype.copyWithin ? this.copyWithin(t, r, i) : Uint8Array.prototype.set.call(e, this.subarray(r, i), t), n
        }, c.prototype.fill = function (e, t, r, i) {
          if ("string" == typeof e) {
            if ("string" == typeof t ? (i = t, t = 0, r = this.length) : "string" == typeof r && (i = r, r = this.length), void 0 !== i && "string" != typeof i) throw new TypeError("encoding must be a string");
            if ("string" == typeof i && !c.isEncoding(i)) throw new TypeError("Unknown encoding: " + i);
            if (1 === e.length) {
              const t = e.charCodeAt(0);
              ("utf8" === i && t < 128 || "latin1" === i) && (e = t)
            }
          } else "number" == typeof e ? e &= 255 : "boolean" == typeof e && (e = Number(e));
          if (t < 0 || this.length < t || this.length < r) throw new RangeError("Out of range index");
          if (r <= t) return this;
          let n;
          if (t >>>= 0, r = void 0 === r ? this.length : r >>> 0, e || (e = 0), "number" == typeof e)
            for (n = t; n < r; ++n) this[n] = e;
          else {
            const s = c.isBuffer(e) ? e : c.from(e, i),
              a = s.length;
            if (0 === a) throw new TypeError('The value "' + e + '" is invalid for argument "value"');
            for (n = 0; n < r - t; ++n) this[n + t] = s[n % a]
          }
          return this
        };
        const K = {};

        function H(e, t, r) {
          K[e] = class extends r {
            constructor() {
              super(), Object.defineProperty(this, "message", {
                value: t.apply(this, arguments),
                writable: !0,
                configurable: !0
              }), this.name = `${this.name} [${e}]`, this.stack, delete this.name
            }
            get code() {
              return e
            }
            set code(e) {
              Object.defineProperty(this, "code", {
                configurable: !0,
                enumerable: !0,
                value: e,
                writable: !0
              })
            }
            toString() {
              return `${this.name} [${e}]: ${this.message}`
            }
          }
        }

        function q(e) {
          let t = "",
            r = e.length;
          const i = "-" === e[0] ? 1 : 0;
          for (; r >= i + 4; r -= 3) t = `_${e.slice(r-3,r)}${t}`;
          return `${e.slice(0,r)}${t}`
        }

        function j(e, t, r, i, n, s) {
          if (e > r || e < t) {
            const i = "bigint" == typeof t ? "n" : "";
            let n;
            throw n = s > 3 ? 0 === t || t === BigInt(0) ? `>= 0${i} and < 2${i} ** ${8*(s+1)}${i}` : `>= -(2${i} ** ${8*(s+1)-1}${i}) and < 2 ** ${8*(s+1)-1}${i}` : `>= ${t}${i} and <= ${r}${i}`, new K.ERR_OUT_OF_RANGE("value", n, e)
          }! function (e, t, r) {
            U(t, "offset"), void 0 !== e[t] && void 0 !== e[t + r] || $(t, e.length - (r + 1))
          }(i, n, s)
        }

        function U(e, t) {
          if ("number" != typeof e) throw new K.ERR_INVALID_ARG_TYPE(t, "number", e)
        }

        function $(e, t, r) {
          if (Math.floor(e) !== e) throw U(e, r), new K.ERR_OUT_OF_RANGE(r || "offset", "an integer", e);
          if (t < 0) throw new K.ERR_BUFFER_OUT_OF_BOUNDS;
          throw new K.ERR_OUT_OF_RANGE(r || "offset", `>= ${r?1:0} and <= ${t}`, e)
        }
        H("ERR_BUFFER_OUT_OF_BOUNDS", (function (e) {
          return e ? `${e} is outside of buffer bounds` : "Attempt to access memory outside buffer bounds"
        }), RangeError), H("ERR_INVALID_ARG_TYPE", (function (e, t) {
          return `The "${e}" argument must be of type number. Received type ${typeof t}`
        }), TypeError), H("ERR_OUT_OF_RANGE", (function (e, t, r) {
          let i = `The value of "${e}" is out of range.`,
            n = r;
          return Number.isInteger(r) && Math.abs(r) > 2 ** 32 ? n = q(String(r)) : "bigint" == typeof r && (n = String(r), (r > BigInt(2) ** BigInt(32) || r < -(BigInt(2) ** BigInt(32))) && (n = q(n)), n += "n"), i += ` It must be ${t}. Received ${n}`, i
        }), RangeError);
        const W = /[^+/0-9A-Za-z-_]/g;

        function G(e, t) {
          let r;
          t = t || 1 / 0;
          const i = e.length;
          let n = null;
          const s = [];
          for (let a = 0; a < i; ++a) {
            if (r = e.charCodeAt(a), r > 55295 && r < 57344) {
              if (!n) {
                if (r > 56319) {
                  (t -= 3) > -1 && s.push(239, 191, 189);
                  continue
                }
                if (a + 1 === i) {
                  (t -= 3) > -1 && s.push(239, 191, 189);
                  continue
                }
                n = r;
                continue
              }
              if (r < 56320) {
                (t -= 3) > -1 && s.push(239, 191, 189), n = r;
                continue
              }
              r = 65536 + (n - 55296 << 10 | r - 56320)
            } else n && (t -= 3) > -1 && s.push(239, 191, 189);
            if (n = null, r < 128) {
              if ((t -= 1) < 0) break;
              s.push(r)
            } else if (r < 2048) {
              if ((t -= 2) < 0) break;
              s.push(r >> 6 | 192, 63 & r | 128)
            } else if (r < 65536) {
              if ((t -= 3) < 0) break;
              s.push(r >> 12 | 224, r >> 6 & 63 | 128, 63 & r | 128)
            } else {
              if (!(r < 1114112)) throw new Error("Invalid code point");
              if ((t -= 4) < 0) break;
              s.push(r >> 18 | 240, r >> 12 & 63 | 128, r >> 6 & 63 | 128, 63 & r | 128)
            }
          }
          return s
        }

        function z(e) {
          return i.toByteArray(function (e) {
            if ((e = (e = e.split("=")[0]).trim().replace(W, "")).length < 2) return "";
            for (; e.length % 4 != 0;) e += "=";
            return e
          }(e))
        }

        function V(e, t, r, i) {
          let n;
          for (n = 0; n < i && !(n + r >= t.length || n >= e.length); ++n) t[n + r] = e[n];
          return n
        }

        function X(e, t) {
          return e instanceof t || null != e && null != e.constructor && null != e.constructor.name && e.constructor.name === t.name
        }

        function J(e) {
          return e != e
        }
        const Q = function () {
          const e = "0123456789abcdef",
            t = new Array(256);
          for (let r = 0; r < 16; ++r) {
            const i = 16 * r;
            for (let n = 0; n < 16; ++n) t[i + n] = e[r] + e[n]
          }
          return t
        }();

        function Y(e) {
          return "undefined" == typeof BigInt ? Z : e
        }

        function Z() {
          throw new Error("BigInt not supported")
        }
      },
      526: (e, t) => {
        "use strict";
        t.byteLength = function (e) {
          var t = o(e),
            r = t[0],
            i = t[1];
          return 3 * (r + i) / 4 - i
        }, t.toByteArray = function (e) {
          var t, r, s = o(e),
            a = s[0],
            c = s[1],
            l = new n(function (e, t, r) {
              return 3 * (t + r) / 4 - r
            }(0, a, c)),
            d = 0,
            u = c > 0 ? a - 4 : a;
          for (r = 0; r < u; r += 4) t = i[e.charCodeAt(r)] << 18 | i[e.charCodeAt(r + 1)] << 12 | i[e.charCodeAt(r + 2)] << 6 | i[e.charCodeAt(r + 3)], l[d++] = t >> 16 & 255, l[d++] = t >> 8 & 255, l[d++] = 255 & t;
          2 === c && (t = i[e.charCodeAt(r)] << 2 | i[e.charCodeAt(r + 1)] >> 4, l[d++] = 255 & t);
          1 === c && (t = i[e.charCodeAt(r)] << 10 | i[e.charCodeAt(r + 1)] << 4 | i[e.charCodeAt(r + 2)] >> 2, l[d++] = t >> 8 & 255, l[d++] = 255 & t);
          return l
        }, t.fromByteArray = function (e) {
          for (var t, i = e.length, n = i % 3, s = [], a = 16383, o = 0, l = i - n; o < l; o += a) s.push(c(e, o, o + a > l ? l : o + a));
          1 === n ? (t = e[i - 1], s.push(r[t >> 2] + r[t << 4 & 63] + "==")) : 2 === n && (t = (e[i - 2] << 8) + e[i - 1], s.push(r[t >> 10] + r[t >> 4 & 63] + r[t << 2 & 63] + "="));
          return s.join("")
        };
        for (var r = [], i = [], n = "undefined" != typeof Uint8Array ? Uint8Array : Array, s = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/", a = 0; a < 64; ++a) r[a] = s[a], i[s.charCodeAt(a)] = a;

        function o(e) {
          var t = e.length;
          if (t % 4 > 0) throw new Error("Invalid string. Length must be a multiple of 4");
          var r = e.indexOf("=");
          return -1 === r && (r = t), [r, r === t ? 0 : 4 - r % 4]
        }

        function c(e, t, i) {
          for (var n, s, a = [], o = t; o < i; o += 3) n = (e[o] << 16 & 16711680) + (e[o + 1] << 8 & 65280) + (255 & e[o + 2]), a.push(r[(s = n) >> 18 & 63] + r[s >> 12 & 63] + r[s >> 6 & 63] + r[63 & s]);
          return a.join("")
        }
        i["-".charCodeAt(0)] = 62, i["_".charCodeAt(0)] = 63
      },
      606: e => {
        var t, r, i = e.exports = {};

        function n() {
          throw new Error("setTimeout has not been defined")
        }

        function s() {
          throw new Error("clearTimeout has not been defined")
        }

        function a(e) {
          if (t === setTimeout) return setTimeout(e, 0);
          if ((t === n || !t) && setTimeout) return t = setTimeout, setTimeout(e, 0);
          try {
            return t(e, 0)
          } catch (r) {
            try {
              return t.call(null, e, 0)
            } catch (r) {
              return t.call(this, e, 0)
            }
          }
        }! function () {
          try {
            t = "function" == typeof setTimeout ? setTimeout : n
          } catch (e) {
            t = n
          }
          try {
            r = "function" == typeof clearTimeout ? clearTimeout : s
          } catch (e) {
            r = s
          }
        }();
        var o, c = [],
          l = !1,
          d = -1;

        function u() {
          l && o && (l = !1, o.length ? c = o.concat(c) : d = -1, c.length && h())
        }

        function h() {
          if (!l) {
            var e = a(u);
            l = !0;
            for (var t = c.length; t;) {
              for (o = c, c = []; ++d < t;) o && o[d].run();
              d = -1, t = c.length
            }
            o = null, l = !1,
              function (e) {
                if (r === clearTimeout) return clearTimeout(e);
                if ((r === s || !r) && clearTimeout) return r = clearTimeout, clearTimeout(e);
                try {
                  return r(e)
                } catch (t) {
                  try {
                    return r.call(null, e)
                  } catch (t) {
                    return r.call(this, e)
                  }
                }
              }(e)
          }
        }

        function p(e, t) {
          this.fun = e, this.array = t
        }

        function m() {}
        i.nextTick = function (e) {
          var t = new Array(arguments.length - 1);
          if (arguments.length > 1)
            for (var r = 1; r < arguments.length; r++) t[r - 1] = arguments[r];
          c.push(new p(e, t)), 1 !== c.length || l || a(h)
        }, p.prototype.run = function () {
          this.fun.apply(null, this.array)
        }, i.title = "browser", i.browser = !0, i.env = {}, i.argv = [], i.version = "", i.versions = {}, i.on = m, i.addListener = m, i.once = m, i.off = m, i.removeListener = m, i.removeAllListeners = m, i.emit = m, i.prependListener = m, i.prependOnceListener = m, i.listeners = function (e) {
          return []
        }, i.binding = function (e) {
          throw new Error("process.binding is not supported")
        }, i.cwd = function () {
          return "/"
        }, i.chdir = function (e) {
          throw new Error("process.chdir is not supported")
        }, i.umask = function () {
          return 0
        }
      },
      809: (e, t, r) => {
        "use strict";
        r.d(t, {
          T: () => i
        });
        const i = "24.6.0"
      }
    },
    s = {};

  function a(e) {
    var t = s[e];
    if (void 0 !== t) return t.exports;
    var r = s[e] = {
      exports: {}
    };
    return n[e](r, r.exports, a), r.exports
  }
  a.m = n, t = Object.getPrototypeOf ? e => Object.getPrototypeOf(e) : e => e.__proto__, a.t = function (r, i) {
    if (1 & i && (r = this(r)), 8 & i) return r;
    if ("object" == typeof r && r) {
      if (4 & i && r.__esModule) return r;
      if (16 & i && "function" == typeof r.then) return r
    }
    var n = Object.create(null);
    a.r(n);
    var s = {};
    e = e || [null, t({}), t([]), t(t)];
    for (var o = 2 & i && r;
      "object" == typeof o && !~e.indexOf(o); o = t(o)) Object.getOwnPropertyNames(o).forEach((e => s[e] = () => r[e]));
    return s.default = () => r, a.d(n, s), n
  }, a.d = (e, t) => {
    for (var r in t) a.o(t, r) && !a.o(e, r) && Object.defineProperty(e, r, {
      enumerable: !0,
      get: t[r]
    })
  }, a.f = {}, a.e = e => Promise.all(Object.keys(a.f).reduce(((t, r) => (a.f[r](e, t), t)), [])), a.u = e => "chunks/" + e + "." + {
    1: "809752b9c15461db64f8",
    833: "690c0d2e5abffd89bcaf",
    874: "cfddeedf8bdebca691e2"
  } [e] + ".chunk.js", a.g = function () {
    if ("object" == typeof globalThis) return globalThis;
    try {
      return this || new Function("return this")()
    } catch (e) {
      if ("object" == typeof window) return window
    }
  }(), a.o = (e, t) => Object.prototype.hasOwnProperty.call(e, t), r = {}, i = "agent-os-v2:", a.l = (e, t, n, s) => {
    if (r[e]) r[e].push(t);
    else {
      var o, c;
      if (void 0 !== n)
        for (var l = document.getElementsByTagName("script"), d = 0; d < l.length; d++) {
          var u = l[d];
          if (u.getAttribute("src") == e || u.getAttribute("data-webpack") == i + n) {
            o = u;
            break
          }
        }
      o || (c = !0, (o = document.createElement("script")).charset = "utf-8", o.timeout = 120, a.nc && o.setAttribute("nonce", a.nc), o.setAttribute("data-webpack", i + n), o.src = e), r[e] = [t];
      var h = (t, i) => {
          o.onerror = o.onload = null, clearTimeout(p);
          var n = r[e];
          if (delete r[e], o.parentNode && o.parentNode.removeChild(o), n && n.forEach((e => e(i))), t) return t(i)
        },
        p = setTimeout(h.bind(null, void 0, {
          type: "timeout",
          target: o
        }), 12e4);
      o.onerror = h.bind(null, o.onerror), o.onload = h.bind(null, o.onload), c && document.head.appendChild(o)
    }
  }, a.r = e => {
    "undefined" != typeof Symbol && Symbol.toStringTag && Object.defineProperty(e, Symbol.toStringTag, {
      value: "Module"
    }), Object.defineProperty(e, "__esModule", {
      value: !0
    })
  }, (() => {
    var e;
    a.g.importScripts && (e = a.g.location + "");
    var t = a.g.document;
    if (!e && t && (t.currentScript && "SCRIPT" === t.currentScript.tagName.toUpperCase() && (e = t.currentScript.src), !e)) {
      var r = t.getElementsByTagName("script");
      if (r.length)
        for (var i = r.length - 1; i > -1 && (!e || !/^http(s?):/.test(e));) e = r[i--].src
    }
    if (!e) throw new Error("Automatic publicPath is not supported in this browser");
    e = e.replace(/^blob:/, "").replace(/#.*$/, "").replace(/\?.*$/, "").replace(/\/[^\/]+$/, "/"), a.p = e + "../"
  })(), (() => {
    var e = {
      471: 0
    };
    a.f.j = (t, r) => {
      var i = a.o(e, t) ? e[t] : void 0;
      if (0 !== i)
        if (i) r.push(i[2]);
        else {
          var n = new Promise(((r, n) => i = e[t] = [r, n]));
          r.push(i[2] = n);
          var s = a.p + a.u(t),
            o = new Error;
          a.l(s, (r => {
            if (a.o(e, t) && (0 !== (i = e[t]) && (e[t] = void 0), i)) {
              var n = r && ("load" === r.type ? "missing" : r.type),
                s = r && r.target && r.target.src;
              o.message = "Loading chunk " + t + " failed.\n(" + n + ": " + s + ")", o.name = "ChunkLoadError", o.type = n, o.request = s, i[1](o)
            }
          }), "chunk-" + t, t)
        }
    };
    var t = (t, r) => {
        var i, n, [s, o, c] = r,
          l = 0;
        if (s.some((t => 0 !== e[t]))) {
          for (i in o) a.o(o, i) && (a.m[i] = o[i]);
          if (c) c(a)
        }
        for (t && t(r); l < s.length; l++) n = s[l], a.o(e, n) && e[n] && e[n][0](), e[n] = 0
      },
      r = self.webpackChunkagentic_browser_v2 = self.webpackChunkagentic_browser_v2 || [];
    r.forEach(t.bind(null, 0)), r.push = t.bind(null, r.push.bind(r))
  })(), (() => {
    "use strict";
    var e = a(191);
    class t {
      constructor(e, t) {
        this.llmService = e, this.promptTemplates = t
      }
      buildPrompt(e, t, r = null) {
        const i = this.promptTemplates.getTemplate("planner"),
          n = new Date,
          s = {
            currentDate: n.toLocaleDateString(),
            currentTime: n.toLocaleTimeString(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            isoDate: n.toISOString()
          };
        let a = t;
        try {
          const e = JSON.parse(t);
          e._system = {
            ...e._system,
            dateTime: s
          }, a = JSON.stringify(e, null, 2)
        } catch (e) {}
        return i.replace("{{USER_REQUEST}}", e).replace("{{BRAIN_CONTEXT}}", a).replace("{{LAST_SUBTASK_RESULT}}", r ? JSON.stringify(r) : "N/A")
      }
      async getNextSubtask(e, t, r = null, i = null) {
        t.includes("data:image") || t.includes("base64") && t.length;
        const n = this.buildPrompt(e, t, r);
        try {
          const e = {
            temperature: 1,
            max_tokens: 1024,
            provider_specific: {
              response_format: {
                type: "json_object"
              }
            }
          };
          i && (e.image_data = i);
          const t = await this.llmService.generateResponse(n, e);
          let r;
          if (t.parsed_json) r = t.parsed_json;
          else try {
            r = JSON.parse(t.text)
          } catch (e) {
            throw new Error(`Failed to parse planner response: ${e instanceof Error?e.message:String(e)}`)
          }
          return this.validatePlannerDecision(r), r
        } catch (e) {
          let t = e.message;
          return {
            decision: "task_failed",
            summary: `Failed to get plan: ${t}`
          }
        }
      }
      validatePlannerDecision(e) {
        if (!e || !e.decision) throw new Error("Invalid planner decision format: missing decision field");
        switch (e.decision) {
        case "next_subtask":
          if (void 0 === e.subtask_description) throw new Error("next_subtask decision missing subtask_description");
          break;
        case "request_clarification":
          if (void 0 === e.question) throw new Error("request_clarification decision missing question");
          break;
        case "task_complete":
        case "task_failed":
          if (void 0 === e.summary) throw new Error(`${e.decision} decision missing summary`);
          break;
        default:
          throw new Error(`Unknown decision type: ${e.decision}`)
        }
      }
    }
    const r = "fileContents";
    async function i() {
      return new Promise(((e, t) => {
        const i = indexedDB.open("AgenticBrowserFiles", 1);
        i.onerror = e => {
          t(new Error("Failed to open IndexedDB"))
        }, i.onsuccess = t => {
          const r = t.target.result;
          e(r)
        }, i.onupgradeneeded = e => {
          const t = e.target.result;
          t.objectStoreNames.contains(r) || t.createObjectStore(r, {
            keyPath: "id"
          })
        }
      }))
    }
    class n {
      constructor(e, t) {
        this.brain = {
          subtask: "",
          context: {},
          actions: [],
          extractedFiles: {},
          extractedPages: {},
          progress: {
            short_term_notes: "",
            long_term_memory: "",
            counters: {},
            lastUpdated: (new Date).toISOString()
          }
        }, this.maxSubtaskHistory = 5, this.llmService = e, this.promptTemplates = t
      }
      assignSubtask(e, t = null) {
        this.brain = {
          subtask: e,
          context: t || {},
          actions: [],
          extractedFiles: {},
          extractedPages: {},
          progress: {
            short_term_notes: "Starting new subtask: " + e,
            long_term_memory: "",
            counters: {},
            lastUpdated: (new Date).toISOString()
          }
        }
      }
      recordActionOutcome(e, t, r = "", i, n, s) {
        let a, o = t.result || t.error_message;
        if (o && "object" == typeof o) {
          const {
            image_data: e,
            screenshot: t,
            ...r
          } = o;
          o = r
        }
        if (t.element) {
          const {
            element_number: e,
            ...r
          } = t.element;
          a = r
        }
        const c = {
          action: e,
          elementDetails: a,
          status: t.status,
          result: o,
          timestamp: (new Date).toISOString()
        };
        if (this.brain.actions.push(c), this.brain.actions.length > this.maxSubtaskHistory && this.brain.actions.shift(), (i || n || s) && this.updateProgress(i, n, s), "success" === t.status && void 0 !== t.result?.extracted_text && t.result?.data_name && (this.brain.context[t.result.data_name] = t.result.extracted_text), "success" === t.status && t.result?.file_id && "extract_content" === e.command && e.params.file_name && e.params.file_description) {
          const r = t.result.file_id;
          this.brain.extractedFiles[r] && (this.brain.extractedFiles[r].name === e.params.file_name && this.brain.extractedFiles[r].description === e.params.file_description || (this.brain.extractedFiles[r].name = e.params.file_name, this.brain.extractedFiles[r].description = e.params.file_description))
        }
      }
      setScreenshot(e) {}
      buildPrompt(e, t = null) {
        if (!this.brain.subtask) throw new Error("ExecutorAgent cannot build prompt without an assigned subtask");
        const r = new Date,
          i = {
            currentDate: r.toISOString().split("T")[0],
            currentTime: r.toLocaleTimeString(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
          },
          n = {
            ...this.brain.context,
            _system: i
          },
          s = this.promptTemplates.getTemplate("executor");
        let a = null;
        if (t)
          if ("object" == typeof t) {
            const {
              image_data: e,
              screenshot: r,
              ...i
            } = t;
            a = i
          } else a = t;
        const o = this.brain.actions.map((e => ({
            action: e.action,
            elementDetails: e.elementDetails,
            status: e.status,
            result: e.result,
            timestamp: e.timestamp
          }))),
          c = {
            short_term_notes: this.brain.progress.short_term_notes,
            long_term_memory: this.brain.progress.long_term_memory,
            counters: this.brain.progress.counters,
            lastUpdated: this.brain.progress.lastUpdated
          };
        if (a && o.length > 0) {
          const e = o[o.length - 1];
          e && e.result !== a && (e.result = a)
        }
        const l = Object.values(this.brain.extractedFiles).map((e => ({
          id: e.id,
          name: e.name,
          description: e.description,
          format: e.format,
          timestamp: e.timestamp
        })));
        return s.replace("{{SUBTASK_CONTEXT}}", JSON.stringify(n)).replace("{{CURRENT_PAGE_STATE}}", JSON.stringify(e)).replace("{{ACTION_HISTORY}}", JSON.stringify(o)).replace("{{PROGRESS_TRACKING}}", JSON.stringify(c)).replace("{{EXTRACTED_FILES_INFO}}", JSON.stringify(l))
      }
      async getNextAction(e, t = {}) {
        const {
          image_data: r,
          actionHistory: i,
          ...n
        } = t;
        if (!this.brain.subtask) return {
          decision: "subtask_failed",
          error_message: "Executor has no assigned subtask."
        };
        i && i.length > 0 && (this.brain.actions = [], i.forEach((e => {
          e && e.action && this.recordActionOutcome(e.action, e)
        })), this.brain.actions.length > this.maxSubtaskHistory && (this.brain.actions = this.brain.actions.slice(-this.maxSubtaskHistory)));
        const s = this.buildPrompt(e, n);
        s.includes("data:image") || s.includes("base64");
        try {
          const e = {
            temperature: 1
          };
          r && (e.image_data = r);
          const t = await this.llmService.generateResponse(s, e);
          let i;
          if (t.parsed_json) i = t.parsed_json;
          else try {
            const e = /\{[\s\S]*?\}(?=\s*$)/,
              r = t.text.match(e);
            if (r && r[0]) try {
              i = JSON.parse(r[0])
            } catch (e) {
              throw new Error(`Failed to parse extracted JSON: ${e instanceof Error?e.message:String(e)}`)
            } else {
              const e = /\{(?:[^{}]|(?:\{[^{}]*\}))*\}/g,
                r = t.text.match(e);
              if (!r) throw new Error("No JSON-like structure found in response");
              for (const e of r) try {
                if (i = JSON.parse(e), i.decision && ("next_action" !== i.decision || i.action)) break
              } catch (e) {
                continue
              }
              if (!i) throw new Error("No valid decision JSON found in matches")
            }
          } catch (e) {
            i = {
              decision: "next_action",
              action: {
                command: "extract_text",
                params: {
                  message: "Failed to parse response from LLM. Please try again."
                }
              }
            }
          }
          return this.validateExecutorDecision(i), (i.short_term_notes || i.long_term_memory || i.progress_counters) && this.updateProgress(i.short_term_notes, i.long_term_memory, i.progress_counters), i
        } catch (e) {
          return {
            decision: "subtask_failed",
            error_message: `Failed to get next action: ${e.message}`
          }
        }
      }
      validateExecutorDecision(e) {
        if (!e || !e.decision) throw new Error("Invalid executor decision format: missing decision field");
        switch (e.decision) {
        case "next_action":
          if (!e.action || !e.action.command) throw new Error("next_action decision missing or has invalid action");
          break;
        case "subtask_complete":
          break;
        case "subtask_failed":
          if (!e.error_message) throw new Error("subtask_failed decision missing error_message");
          break;
        default:
          throw new Error(`Unknown decision type: ${e.decision}`)
        }
      }
      updateProgress(e, t, r) {
        e && (this.brain.progress.short_term_notes = e), t && (this.brain.progress.long_term_memory = t), r && (this.brain.progress.counters = r), this.brain.progress.lastUpdated = (new Date).toISOString()
      }
      getBrain() {
        return this.brain
      }
      getSanitizedBrain() {
        const e = JSON.parse(JSON.stringify(this.brain));
        for (const t in e.extractedFiles) {
          const r = e.extractedFiles[t];
          e.extractedFiles[t] = {
            ...r,
            content: `[File content removed - ${r.format.toUpperCase()} format, ${new Date(r.timestamp).toLocaleString()}]`
          }
        }
        return e
      }
      async addExtractedFile(e, t, n, s, a = "json", o) {
        this.brain.extractedFiles[e] = {
          id: e,
          name: t,
          description: n,
          content: `[File content stored in IndexedDB - ${a.toUpperCase()} format]`,
          format: a,
          timestamp: (new Date).toISOString(),
          sourceUrl: o
        };
        const c = typeof s;
        "string" === c ? s.length : "object" === c && JSON.stringify(s).length;
        try {
          await async function (e, t) {
            try {
              const n = await i();
              return new Promise(((i, s) => {
                const a = n.transaction([r], "readwrite"),
                  o = a.objectStore(r),
                  c = {
                    id: e,
                    content: t,
                    timestamp: (new Date).toISOString()
                  },
                  l = o.put(c);
                l.onsuccess = () => {
                  i()
                }, l.onerror = e => {
                  s(new Error("Failed to store file content"))
                }, a.oncomplete = () => {
                  n.close()
                }
              }))
            } catch (e) {
              throw e
            }
          }(e, s)
        } catch (t) {
          this.brain.extractedFiles[e].content = `[Error storing file content in IndexedDB - ${t instanceof Error?t.message:String(t)}]`
        }
        if (o) {
          const t = this.normalizeUrl(o);
          this.brain.extractedPages[t] = {
            url: o,
            timestamp: (new Date).toISOString(),
            fileId: e
          }
        }
      }
      normalizeUrl(e) {
        try {
          const t = new URL(e);
          return t.search = "", t.hash = "", t.toString()
        } catch (t) {
          return e
        }
      }
      hasExtractedPage(e) {
        const t = this.normalizeUrl(e);
        return !!this.brain.extractedPages[t]
      }
      async getExtractedFile(e) {
        const t = this.brain.extractedFiles[e];
        if (!t) return null;
        const r = await this.getFileContent(e);
        return {
          ...t,
          content: r
        }
      }
      async getAllExtractedFiles() {
        const e = {},
          t = Object.keys(this.brain.extractedFiles);
        for (const r of t) {
          const t = this.brain.extractedFiles[r],
            i = await this.getFileContent(r);
          e[r] = {
            ...t,
            content: i
          }
        }
        return e
      }
      async getFileContent(e) {
        try {
          const t = await async function (e) {
            try {
              const t = await i();
              return new Promise(((i, n) => {
                const s = t.transaction([r], "readonly"),
                  a = s.objectStore(r).get(e);
                a.onsuccess = e => {
                  const t = e.target.result;
                  i(t ? t.content : null)
                }, a.onerror = e => {
                  n(new Error("Failed to retrieve file content"))
                }, s.oncomplete = () => {
                  t.close()
                }
              }))
            } catch (e) {
              throw e
            }
          }(e);
          return null !== t ? t : `[File content not found in IndexedDB - ${(new Date).toLocaleString()}]`
        } catch (e) {
          return `[Error retrieving file content: ${e instanceof Error?e.message:String(e)}]`
        }
      }
    }
    var s;
    ! function (e) {
      e.DOM_EXTRACT = "dom:extract", e.DOM_HIGHLIGHT = "dom:highlight", e.DOM_HIGHLIGHT_REMOVE = "dom:highlight:remove", e.ACTION_CLICK = "action:click", e.ACTION_TYPE = "action:type", e.ACTION_KEYPRESS = "action:keypress", e.ACTION_NAVIGATE = "action:navigate", e.ACTION_GO_BACK = "action:go:back", e.ACTION_GO_FORWARD = "action:go:forward", e.ACTION_SCROLL = "action:scroll", e.ACTION_WAIT = "action:wait", e.ACTION_EXTRACT_TEXT = "action:extract:text", e.ACTION_EXTRACT_CONTENT = "action:extract:content", e.ACTION_GOOGLE_SEARCH = "action:google:search", e.STATUS_UPDATE = "status:update", e.TASK_START = "task:start", e.TASK_COMPLETE = "task:complete", e.REQUEST_CLARIFICATION = "request:clarification", e.PROVIDE_CLARIFICATION = "provide:clarification", e.INJECT_CONTENT_SCRIPT = "inject:content:script", e.API_SETTINGS_CHANGED = "api:settings:changed", e.GENERATE_PLAN = "generate:plan", e.APPROVE_PLAN = "approve:plan", e.CHAT_MESSAGE = "chat:message"
    }(s || (s = {}));
    class o {
      constructor() {
        this.responseHandlers = new Map, chrome.runtime.onMessage.addListener(this.handleMessage.bind(this))
      }
      async sendMessage(e) {
        const t = this.generateRequestId(),
          r = {
            ...e,
            requestId: t
          };
        return new Promise(((i, n) => {
          try {
            this.responseHandlers.set(t, i);
            const s = setTimeout((() => {
              this.responseHandlers.delete(t), n(new Error(`Message ${e.type} timed out after 30s`))
            }), 3e4);
            e.tabId ? chrome.tabs.sendMessage(e.tabId, r, (e => {
              clearTimeout(s), this.responseHandlers.delete(t), chrome.runtime.lastError ? n(new Error(chrome.runtime.lastError.message)) : i(e)
            })) : chrome.runtime.sendMessage(r, (e => {
              clearTimeout(s), this.responseHandlers.delete(t), chrome.runtime.lastError ? n(new Error(chrome.runtime.lastError.message)) : i(e)
            }))
          } catch (e) {
            this.responseHandlers.delete(t), n(e)
          }
        }))
      }
      handleMessage(e, t, r) {
        if (e.requestId && this.responseHandlers.has(e.requestId)) {
          const t = this.responseHandlers.get(e.requestId);
          return t && (t(e), this.responseHandlers.delete(e.requestId)), !1
        }
        return !1
      }
      generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2,9)}`
      }
      async extractDOM() {
        throw new Error("Method not implemented in base class")
      }
      async highlightElements() {
        throw new Error("Method not implemented in base class")
      }
      async removeHighlights() {
        throw new Error("Method not implemented in base class")
      }
      async navigateTo(e) {
        throw new Error("Method not implemented in base class")
      }
      async clickElement(e) {
        throw new Error("Method not implemented in base class")
      }
      async typeIntoElement(e, t, r) {
        throw new Error("Method not implemented in base class")
      }
      async scroll(e, t) {
        throw new Error("Method not implemented in base class")
      }
      async keypress(e) {
        throw new Error("Method not implemented in base class")
      }
      async goBack() {
        throw new Error("Method not implemented in base class")
      }
      async goForward() {
        throw new Error("Method not implemented in base class")
      }
      async wait(e) {
        throw new Error("Method not implemented in base class")
      }
      async extractText(e, t) {
        throw new Error("Method not implemented in base class")
      }
      async extractContent(e) {
        throw new Error("Method not implemented in base class")
      }
      async googleSearch(e) {
        throw new Error("Method not implemented in base class")
      }
    }
    var c = function (e, t) {
      return (c = Object.setPrototypeOf || {
          __proto__: []
        }
        instanceof Array && function (e, t) {
          e.__proto__ = t
        } || function (e, t) {
          for (var r in t) Object.prototype.hasOwnProperty.call(t, r) && (e[r] = t[r])
        })(e, t)
    };

    function l(e, t) {
      if ("function" != typeof t && null !== t) throw new TypeError("Class extends value " + String(t) + " is not a constructor or null");

      function r() {
        this.constructor = e
      }
      c(e, t), e.prototype = null === t ? Object.create(t) : (r.prototype = t.prototype, new r)
    }

    function d(e, t, r, i) {
      return new(r || (r = Promise))((function (n, s) {
        function a(e) {
          try {
            c(i.next(e))
          } catch (e) {
            s(e)
          }
        }

        function o(e) {
          try {
            c(i.throw(e))
          } catch (e) {
            s(e)
          }
        }

        function c(e) {
          var t;
          e.done ? n(e.value) : (t = e.value, t instanceof r ? t : new r((function (e) {
            e(t)
          }))).then(a, o)
        }
        c((i = i.apply(e, t || [])).next())
      }))
    }

    function u(e, t) {
      var r, i, n, s = {
          label: 0,
          sent: function () {
            if (1 & n[0]) throw n[1];
            return n[1]
          },
          trys: [],
          ops: []
        },
        a = Object.create(("function" == typeof Iterator ? Iterator : Object).prototype);
      return a.next = o(0), a.throw = o(1), a.return = o(2), "function" == typeof Symbol && (a[Symbol.iterator] = function () {
        return this
      }), a;

      function o(o) {
        return function (c) {
          return function (o) {
            if (r) throw new TypeError("Generator is already executing.");
            for (; a && (a = 0, o[0] && (s = 0)), s;) try {
              if (r = 1, i && (n = 2 & o[0] ? i.return : o[0] ? i.throw || ((n = i.return) && n.call(i), 0) : i.next) && !(n = n.call(i, o[1])).done) return n;
              switch (i = 0, n && (o = [2 & o[0], n.value]), o[0]) {
              case 0:
              case 1:
                n = o;
                break;
              case 4:
                return s.label++, {
                  value: o[1],
                  done: !1
                };
              case 5:
                s.label++, i = o[1], o = [0];
                continue;
              case 7:
                o = s.ops.pop(), s.trys.pop();
                continue;
              default:
                if (!(n = s.trys, (n = n.length > 0 && n[n.length - 1]) || 6 !== o[0] && 2 !== o[0])) {
                  s = 0;
                  continue
                }
                if (3 === o[0] && (!n || o[1] > n[0] && o[1] < n[3])) {
                  s.label = o[1];
                  break
                }
                if (6 === o[0] && s.label < n[1]) {
                  s.label = n[1], n = o;
                  break
                }
                if (n && s.label < n[2]) {
                  s.label = n[2], s.ops.push(o);
                  break
                }
                n[2] && s.ops.pop(), s.trys.pop();
                continue
              }
              o = t.call(e, s)
            } catch (e) {
              o = [6, e], i = 0
            } finally {
              r = n = 0
            }
            if (5 & o[0]) throw o[1];
            return {
              value: o[0] ? o[1] : void 0,
              done: !0
            }
          }([o, c])
        }
      }
    }

    function h(e) {
      var t = "function" == typeof Symbol && Symbol.iterator,
        r = t && e[t],
        i = 0;
      if (r) return r.call(e);
      if (e && "number" == typeof e.length) return {
        next: function () {
          return e && i >= e.length && (e = void 0), {
            value: e && e[i++],
            done: !e
          }
        }
      };
      throw new TypeError(t ? "Object is not iterable." : "Symbol.iterator is not defined.")
    }

    function p(e, t) {
      var r = "function" == typeof Symbol && e[Symbol.iterator];
      if (!r) return e;
      var i, n, s = r.call(e),
        a = [];
      try {
        for (;
          (void 0 === t || t-- > 0) && !(i = s.next()).done;) a.push(i.value)
      } catch (e) {
        n = {
          error: e
        }
      } finally {
        try {
          i && !i.done && (r = s.return) && r.call(s)
        } finally {
          if (n) throw n.error
        }
      }
      return a
    }

    function m(e, t, r) {
      if (r || 2 === arguments.length)
        for (var i, n = 0, s = t.length; n < s; n++) !i && n in t || (i || (i = Array.prototype.slice.call(t, 0, n)), i[n] = t[n]);
      return e.concat(i || Array.prototype.slice.call(t))
    }

    function f(e) {
      return this instanceof f ? (this.v = e, this) : new f(e)
    }

    function g(e, t, r) {
      if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
      var i, n = r.apply(e, t || []),
        s = [];
      return i = Object.create(("function" == typeof AsyncIterator ? AsyncIterator : Object).prototype), a("next"), a("throw"), a("return", (function (e) {
        return function (t) {
          return Promise.resolve(t).then(e, l)
        }
      })), i[Symbol.asyncIterator] = function () {
        return this
      }, i;

      function a(e, t) {
        n[e] && (i[e] = function (t) {
          return new Promise((function (r, i) {
            s.push([e, t, r, i]) > 1 || o(e, t)
          }))
        }, t && (i[e] = t(i[e])))
      }

      function o(e, t) {
        try {
          (r = n[e](t)).value instanceof f ? Promise.resolve(r.value.v).then(c, l) : d(s[0][2], r)
        } catch (e) {
          d(s[0][3], e)
        }
        var r
      }

      function c(e) {
        o("next", e)
      }

      function l(e) {
        o("throw", e)
      }

      function d(e, t) {
        e(t), s.shift(), s.length && o(s[0][0], s[0][1])
      }
    }

    function y(e) {
      if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
      var t, r = e[Symbol.asyncIterator];
      return r ? r.call(e) : (e = h(e), t = {}, i("next"), i("throw"), i("return"), t[Symbol.asyncIterator] = function () {
        return this
      }, t);

      function i(r) {
        t[r] = e[r] && function (t) {
          return new Promise((function (i, n) {
            (function (e, t, r, i) {
              Promise.resolve(i).then((function (t) {
                e({
                  value: t,
                  done: r
                })
              }), t)
            })(i, n, (t = e[r](t)).done, t.value)
          }))
        }
      }
    }

    function w(e) {
      return "function" == typeof e
    }

    function v(e) {
      var t = e((function (e) {
        Error.call(e), e.stack = (new Error).stack
      }));
      return t.prototype = Object.create(Error.prototype), t.prototype.constructor = t, t
    }
    var b = v((function (e) {
      return function (t) {
        e(this), this.message = t ? t.length + " errors occurred during unsubscription:\n" + t.map((function (e, t) {
          return t + 1 + ") " + e.toString()
        })).join("\n  ") : "", this.name = "UnsubscriptionError", this.errors = t
      }
    }));

    function k(e, t) {
      if (e) {
        var r = e.indexOf(t);
        0 <= r && e.splice(r, 1)
      }
    }
    var S = function () {
        function e(e) {
          this.initialTeardown = e, this.closed = !1, this._parentage = null, this._finalizers = null
        }
        var t;
        return e.prototype.unsubscribe = function () {
          var e, t, r, i, n;
          if (!this.closed) {
            this.closed = !0;
            var s = this._parentage;
            if (s)
              if (this._parentage = null, Array.isArray(s)) try {
                for (var a = h(s), o = a.next(); !o.done; o = a.next()) {
                  o.value.remove(this)
                }
              } catch (t) {
                e = {
                  error: t
                }
              } finally {
                try {
                  o && !o.done && (t = a.return) && t.call(a)
                } finally {
                  if (e) throw e.error
                }
              } else s.remove(this);
            var c = this.initialTeardown;
            if (w(c)) try {
              c()
            } catch (e) {
              n = e instanceof b ? e.errors : [e]
            }
            var l = this._finalizers;
            if (l) {
              this._finalizers = null;
              try {
                for (var d = h(l), u = d.next(); !u.done; u = d.next()) {
                  var f = u.value;
                  try {
                    C(f)
                  } catch (e) {
                    n = null != n ? n : [], e instanceof b ? n = m(m([], p(n)), p(e.errors)) : n.push(e)
                  }
                }
              } catch (e) {
                r = {
                  error: e
                }
              } finally {
                try {
                  u && !u.done && (i = d.return) && i.call(d)
                } finally {
                  if (r) throw r.error
                }
              }
            }
            if (n) throw new b(n)
          }
        }, e.prototype.add = function (t) {
          var r;
          if (t && t !== this)
            if (this.closed) C(t);
            else {
              if (t instanceof e) {
                if (t.closed || t._hasParent(this)) return;
                t._addParent(this)
              }(this._finalizers = null !== (r = this._finalizers) && void 0 !== r ? r : []).push(t)
            }
        }, e.prototype._hasParent = function (e) {
          var t = this._parentage;
          return t === e || Array.isArray(t) && t.includes(e)
        }, e.prototype._addParent = function (e) {
          var t = this._parentage;
          this._parentage = Array.isArray(t) ? (t.push(e), t) : t ? [t, e] : e
        }, e.prototype._removeParent = function (e) {
          var t = this._parentage;
          t === e ? this._parentage = null : Array.isArray(t) && k(t, e)
        }, e.prototype.remove = function (t) {
          var r = this._finalizers;
          r && k(r, t), t instanceof e && t._removeParent(this)
        }, e.EMPTY = ((t = new e).closed = !0, t), e
      }(),
      T = S.EMPTY;

    function E(e) {
      return e instanceof S || e && "closed" in e && w(e.remove) && w(e.add) && w(e.unsubscribe)
    }

    function C(e) {
      w(e) ? e() : e.unsubscribe()
    }
    var x = null,
      M = null,
      _ = void 0,
      I = !1,
      P = !1,
      A = {
        setTimeout: function (e, t) {
          for (var r = [], i = 2; i < arguments.length; i++) r[i - 2] = arguments[i];
          var n = A.delegate;
          return (null == n ? void 0 : n.setTimeout) ? n.setTimeout.apply(n, m([e, t], p(r))) : setTimeout.apply(void 0, m([e, t], p(r)))
        },
        clearTimeout: function (e) {
          var t = A.delegate;
          return ((null == t ? void 0 : t.clearTimeout) || clearTimeout)(e)
        },
        delegate: void 0
      };

    function F(e) {
      A.setTimeout((function () {
        if (!x) throw e;
        x(e)
      }))
    }

    function O() {}
    var R = L("C", void 0, void 0);

    function L(e, t, r) {
      return {
        kind: e,
        value: t,
        error: r
      }
    }
    var D = null;

    function N(e) {
      if (I) {
        var t = !D;
        if (t && (D = {
            errorThrown: !1,
            error: null
          }), e(), t) {
          var r = D,
            i = r.errorThrown,
            n = r.error;
          if (D = null, i) throw n
        }
      } else e()
    }
    var B = function (e) {
        function t(t) {
          var r = e.call(this) || this;
          return r.isStopped = !1, t ? (r.destination = t, E(t) && t.add(r)) : r.destination = W, r
        }
        return l(t, e), t.create = function (e, t, r) {
          return new j(e, t, r)
        }, t.prototype.next = function (e) {
          this.isStopped ? $(function (e) {
            return L("N", e, void 0)
          }(e), this) : this._next(e)
        }, t.prototype.error = function (e) {
          this.isStopped ? $(L("E", void 0, e), this) : (this.isStopped = !0, this._error(e))
        }, t.prototype.complete = function () {
          this.isStopped ? $(R, this) : (this.isStopped = !0, this._complete())
        }, t.prototype.unsubscribe = function () {
          this.closed || (this.isStopped = !0, e.prototype.unsubscribe.call(this), this.destination = null)
        }, t.prototype._next = function (e) {
          this.destination.next(e)
        }, t.prototype._error = function (e) {
          try {
            this.destination.error(e)
          } finally {
            this.unsubscribe()
          }
        }, t.prototype._complete = function () {
          try {
            this.destination.complete()
          } finally {
            this.unsubscribe()
          }
        }, t
      }(S),
      K = Function.prototype.bind;

    function H(e, t) {
      return K.call(e, t)
    }
    var q = function () {
        function e(e) {
          this.partialObserver = e
        }
        return e.prototype.next = function (e) {
          var t = this.partialObserver;
          if (t.next) try {
            t.next(e)
          } catch (e) {
            U(e)
          }
        }, e.prototype.error = function (e) {
          var t = this.partialObserver;
          if (t.error) try {
            t.error(e)
          } catch (e) {
            U(e)
          } else U(e)
        }, e.prototype.complete = function () {
          var e = this.partialObserver;
          if (e.complete) try {
            e.complete()
          } catch (e) {
            U(e)
          }
        }, e
      }(),
      j = function (e) {
        function t(t, r, i) {
          var n, s, a = e.call(this) || this;
          w(t) || !t ? n = {
            next: null != t ? t : void 0,
            error: null != r ? r : void 0,
            complete: null != i ? i : void 0
          } : a && P ? ((s = Object.create(t)).unsubscribe = function () {
            return a.unsubscribe()
          }, n = {
            next: t.next && H(t.next, s),
            error: t.error && H(t.error, s),
            complete: t.complete && H(t.complete, s)
          }) : n = t;
          return a.destination = new q(n), a
        }
        return l(t, e), t
      }(B);

    function U(e) {
      var t;
      I ? (t = e, I && D && (D.errorThrown = !0, D.error = t)) : F(e)
    }

    function $(e, t) {
      var r = M;
      r && A.setTimeout((function () {
        return r(e, t)
      }))
    }
    var W = {
        closed: !0,
        next: O,
        error: function (e) {
          throw e
        },
        complete: O
      },
      G = "function" == typeof Symbol && Symbol.observable || "@@observable";

    function z(e) {
      return e
    }

    function V(e) {
      return 0 === e.length ? z : 1 === e.length ? e[0] : function (t) {
        return e.reduce((function (e, t) {
          return t(e)
        }), t)
      }
    }
    var X = function () {
      function e(e) {
        e && (this._subscribe = e)
      }
      return e.prototype.lift = function (t) {
        var r = new e;
        return r.source = this, r.operator = t, r
      }, e.prototype.subscribe = function (e, t, r) {
        var i, n = this,
          s = (i = e) && i instanceof B || function (e) {
            return e && w(e.next) && w(e.error) && w(e.complete)
          }(i) && E(i) ? e : new j(e, t, r);
        return N((function () {
          var e = n,
            t = e.operator,
            r = e.source;
          s.add(t ? t.call(s, r) : r ? n._subscribe(s) : n._trySubscribe(s))
        })), s
      }, e.prototype._trySubscribe = function (e) {
        try {
          return this._subscribe(e)
        } catch (t) {
          e.error(t)
        }
      }, e.prototype.forEach = function (e, t) {
        var r = this;
        return new(t = J(t))((function (t, i) {
          var n = new j({
            next: function (t) {
              try {
                e(t)
              } catch (e) {
                i(e), n.unsubscribe()
              }
            },
            error: i,
            complete: t
          });
          r.subscribe(n)
        }))
      }, e.prototype._subscribe = function (e) {
        var t;
        return null === (t = this.source) || void 0 === t ? void 0 : t.subscribe(e)
      }, e.prototype[G] = function () {
        return this
      }, e.prototype.pipe = function () {
        for (var e = [], t = 0; t < arguments.length; t++) e[t] = arguments[t];
        return V(e)(this)
      }, e.prototype.toPromise = function (e) {
        var t = this;
        return new(e = J(e))((function (e, r) {
          var i;
          t.subscribe((function (e) {
            return i = e
          }), (function (e) {
            return r(e)
          }), (function () {
            return e(i)
          }))
        }))
      }, e.create = function (t) {
        return new e(t)
      }, e
    }();

    function J(e) {
      var t;
      return null !== (t = null != e ? e : _) && void 0 !== t ? t : Promise
    }

    function Q(e) {
      return function (t) {
        if (function (e) {
            return w(null == e ? void 0 : e.lift)
          }(t)) return t.lift((function (t) {
          try {
            return e(t, this)
          } catch (e) {
            this.error(e)
          }
        }));
        throw new TypeError("Unable to lift unknown Observable type")
      }
    }

    function Y(e, t, r, i, n) {
      return new Z(e, t, r, i, n)
    }
    var Z = function (e) {
        function t(t, r, i, n, s, a) {
          var o = e.call(this, t) || this;
          return o.onFinalize = s, o.shouldUnsubscribe = a, o._next = r ? function (e) {
            try {
              r(e)
            } catch (e) {
              t.error(e)
            }
          } : e.prototype._next, o._error = n ? function (e) {
            try {
              n(e)
            } catch (e) {
              t.error(e)
            } finally {
              this.unsubscribe()
            }
          } : e.prototype._error, o._complete = i ? function () {
            try {
              i()
            } catch (e) {
              t.error(e)
            } finally {
              this.unsubscribe()
            }
          } : e.prototype._complete, o
        }
        return l(t, e), t.prototype.unsubscribe = function () {
          var t;
          if (!this.shouldUnsubscribe || this.shouldUnsubscribe()) {
            var r = this.closed;
            e.prototype.unsubscribe.call(this), !r && (null === (t = this.onFinalize) || void 0 === t || t.call(this))
          }
        }, t
      }(B),
      ee = v((function (e) {
        return function () {
          e(this), this.name = "ObjectUnsubscribedError", this.message = "object unsubscribed"
        }
      })),
      te = function (e) {
        function t() {
          var t = e.call(this) || this;
          return t.closed = !1, t.currentObservers = null, t.observers = [], t.isStopped = !1, t.hasError = !1, t.thrownError = null, t
        }
        return l(t, e), t.prototype.lift = function (e) {
          var t = new re(this, this);
          return t.operator = e, t
        }, t.prototype._throwIfClosed = function () {
          if (this.closed) throw new ee
        }, t.prototype.next = function (e) {
          var t = this;
          N((function () {
            var r, i;
            if (t._throwIfClosed(), !t.isStopped) {
              t.currentObservers || (t.currentObservers = Array.from(t.observers));
              try {
                for (var n = h(t.currentObservers), s = n.next(); !s.done; s = n.next()) {
                  s.value.next(e)
                }
              } catch (e) {
                r = {
                  error: e
                }
              } finally {
                try {
                  s && !s.done && (i = n.return) && i.call(n)
                } finally {
                  if (r) throw r.error
                }
              }
            }
          }))
        }, t.prototype.error = function (e) {
          var t = this;
          N((function () {
            if (t._throwIfClosed(), !t.isStopped) {
              t.hasError = t.isStopped = !0, t.thrownError = e;
              for (var r = t.observers; r.length;) r.shift().error(e)
            }
          }))
        }, t.prototype.complete = function () {
          var e = this;
          N((function () {
            if (e._throwIfClosed(), !e.isStopped) {
              e.isStopped = !0;
              for (var t = e.observers; t.length;) t.shift().complete()
            }
          }))
        }, t.prototype.unsubscribe = function () {
          this.isStopped = this.closed = !0, this.observers = this.currentObservers = null
        }, Object.defineProperty(t.prototype, "observed", {
          get: function () {
            var e;
            return (null === (e = this.observers) || void 0 === e ? void 0 : e.length) > 0
          },
          enumerable: !1,
          configurable: !0
        }), t.prototype._trySubscribe = function (t) {
          return this._throwIfClosed(), e.prototype._trySubscribe.call(this, t)
        }, t.prototype._subscribe = function (e) {
          return this._throwIfClosed(), this._checkFinalizedStatuses(e), this._innerSubscribe(e)
        }, t.prototype._innerSubscribe = function (e) {
          var t = this,
            r = this,
            i = r.hasError,
            n = r.isStopped,
            s = r.observers;
          return i || n ? T : (this.currentObservers = null, s.push(e), new S((function () {
            t.currentObservers = null, k(s, e)
          })))
        }, t.prototype._checkFinalizedStatuses = function (e) {
          var t = this,
            r = t.hasError,
            i = t.thrownError,
            n = t.isStopped;
          r ? e.error(i) : n && e.complete()
        }, t.prototype.asObservable = function () {
          var e = new X;
          return e.source = this, e
        }, t.create = function (e, t) {
          return new re(e, t)
        }, t
      }(X),
      re = function (e) {
        function t(t, r) {
          var i = e.call(this) || this;
          return i.destination = t, i.source = r, i
        }
        return l(t, e), t.prototype.next = function (e) {
          var t, r;
          null === (r = null === (t = this.destination) || void 0 === t ? void 0 : t.next) || void 0 === r || r.call(t, e)
        }, t.prototype.error = function (e) {
          var t, r;
          null === (r = null === (t = this.destination) || void 0 === t ? void 0 : t.error) || void 0 === r || r.call(t, e)
        }, t.prototype.complete = function () {
          var e, t;
          null === (t = null === (e = this.destination) || void 0 === e ? void 0 : e.complete) || void 0 === t || t.call(e)
        }, t.prototype._subscribe = function (e) {
          var t, r;
          return null !== (r = null === (t = this.source) || void 0 === t ? void 0 : t.subscribe(e)) && void 0 !== r ? r : T
        }, t
      }(te),
      ie = {
        now: function () {
          return (ie.delegate || Date).now()
        },
        delegate: void 0
      },
      ne = function (e) {
        function t(t, r, i) {
          void 0 === t && (t = 1 / 0), void 0 === r && (r = 1 / 0), void 0 === i && (i = ie);
          var n = e.call(this) || this;
          return n._bufferSize = t, n._windowTime = r, n._timestampProvider = i, n._buffer = [], n._infiniteTimeWindow = !0, n._infiniteTimeWindow = r === 1 / 0, n._bufferSize = Math.max(1, t), n._windowTime = Math.max(1, r), n
        }
        return l(t, e), t.prototype.next = function (t) {
          var r = this,
            i = r.isStopped,
            n = r._buffer,
            s = r._infiniteTimeWindow,
            a = r._timestampProvider,
            o = r._windowTime;
          i || (n.push(t), !s && n.push(a.now() + o)), this._trimBuffer(), e.prototype.next.call(this, t)
        }, t.prototype._subscribe = function (e) {
          this._throwIfClosed(), this._trimBuffer();
          for (var t = this._innerSubscribe(e), r = this._infiniteTimeWindow, i = this._buffer.slice(), n = 0; n < i.length && !e.closed; n += r ? 1 : 2) e.next(i[n]);
          return this._checkFinalizedStatuses(e), t
        }, t.prototype._trimBuffer = function () {
          var e = this,
            t = e._bufferSize,
            r = e._timestampProvider,
            i = e._buffer,
            n = e._infiniteTimeWindow,
            s = (n ? 1 : 2) * t;
          if (t < 1 / 0 && s < i.length && i.splice(0, i.length - s), !n) {
            for (var a = r.now(), o = 0, c = 1; c < i.length && i[c] <= a; c += 2) o = c;
            o && i.splice(0, o + 1)
          }
        }, t
      }(te),
      se = function (e) {
        function t(t, r) {
          return e.call(this) || this
        }
        return l(t, e), t.prototype.schedule = function (e, t) {
          return void 0 === t && (t = 0), this
        }, t
      }(S),
      ae = {
        setInterval: function (e, t) {
          for (var r = [], i = 2; i < arguments.length; i++) r[i - 2] = arguments[i];
          var n = ae.delegate;
          return (null == n ? void 0 : n.setInterval) ? n.setInterval.apply(n, m([e, t], p(r))) : setInterval.apply(void 0, m([e, t], p(r)))
        },
        clearInterval: function (e) {
          var t = ae.delegate;
          return ((null == t ? void 0 : t.clearInterval) || clearInterval)(e)
        },
        delegate: void 0
      },
      oe = function (e) {
        function t(t, r) {
          var i = e.call(this, t, r) || this;
          return i.scheduler = t, i.work = r, i.pending = !1, i
        }
        return l(t, e), t.prototype.schedule = function (e, t) {
          var r;
          if (void 0 === t && (t = 0), this.closed) return this;
          this.state = e;
          var i = this.id,
            n = this.scheduler;
          return null != i && (this.id = this.recycleAsyncId(n, i, t)), this.pending = !0, this.delay = t, this.id = null !== (r = this.id) && void 0 !== r ? r : this.requestAsyncId(n, this.id, t), this
        }, t.prototype.requestAsyncId = function (e, t, r) {
          return void 0 === r && (r = 0), ae.setInterval(e.flush.bind(e, this), r)
        }, t.prototype.recycleAsyncId = function (e, t, r) {
          if (void 0 === r && (r = 0), null != r && this.delay === r && !1 === this.pending) return t;
          null != t && ae.clearInterval(t)
        }, t.prototype.execute = function (e, t) {
          if (this.closed) return new Error("executing a cancelled action");
          this.pending = !1;
          var r = this._execute(e, t);
          if (r) return r;
          !1 === this.pending && null != this.id && (this.id = this.recycleAsyncId(this.scheduler, this.id, null))
        }, t.prototype._execute = function (e, t) {
          var r, i = !1;
          try {
            this.work(e)
          } catch (e) {
            i = !0, r = e || new Error("Scheduled action threw falsy error")
          }
          if (i) return this.unsubscribe(), r
        }, t.prototype.unsubscribe = function () {
          if (!this.closed) {
            var t = this.id,
              r = this.scheduler,
              i = r.actions;
            this.work = this.state = this.scheduler = null, this.pending = !1, k(i, this), null != t && (this.id = this.recycleAsyncId(r, t, null)), this.delay = null, e.prototype.unsubscribe.call(this)
          }
        }, t
      }(se),
      ce = function () {
        function e(t, r) {
          void 0 === r && (r = e.now), this.schedulerActionCtor = t, this.now = r
        }
        return e.prototype.schedule = function (e, t, r) {
          return void 0 === t && (t = 0), new this.schedulerActionCtor(this, e).schedule(r, t)
        }, e.now = ie.now, e
      }(),
      le = new(function (e) {
        function t(t, r) {
          void 0 === r && (r = ce.now);
          var i = e.call(this, t, r) || this;
          return i.actions = [], i._active = !1, i
        }
        return l(t, e), t.prototype.flush = function (e) {
          var t = this.actions;
          if (this._active) t.push(e);
          else {
            var r;
            this._active = !0;
            do {
              if (r = e.execute(e.state, e.delay)) break
            } while (e = t.shift());
            if (this._active = !1, r) {
              for (; e = t.shift();) e.unsubscribe();
              throw r
            }
          }
        }, t
      }(ce))(oe),
      de = le,
      ue = new X((function (e) {
        return e.complete()
      }));

    function he(e) {
      return e && w(e.schedule)
    }

    function pe(e) {
      return e[e.length - 1]
    }

    function me(e) {
      return he(pe(e)) ? e.pop() : void 0
    }
    var fe = function (e) {
      return e && "number" == typeof e.length && "function" != typeof e
    };

    function ge(e) {
      return w(null == e ? void 0 : e.then)
    }

    function ye(e) {
      return w(e[G])
    }

    function we(e) {
      return Symbol.asyncIterator && w(null == e ? void 0 : e[Symbol.asyncIterator])
    }

    function ve(e) {
      return new TypeError("You provided " + (null !== e && "object" == typeof e ? "an invalid object" : "'" + e + "'") + " where a stream was expected. You can provide an Observable, Promise, ReadableStream, Array, AsyncIterable, or Iterable.")
    }
    var be = "function" == typeof Symbol && Symbol.iterator ? Symbol.iterator : "@@iterator";

    function ke(e) {
      return w(null == e ? void 0 : e[be])
    }

    function Se(e) {
      return g(this, arguments, (function () {
        var t, r, i;
        return u(this, (function (n) {
          switch (n.label) {
          case 0:
            t = e.getReader(), n.label = 1;
          case 1:
            n.trys.push([1, , 9, 10]), n.label = 2;
          case 2:
            return [4, f(t.read())];
          case 3:
            return r = n.sent(), i = r.value, r.done ? [4, f(void 0)] : [3, 5];
          case 4:
            return [2, n.sent()];
          case 5:
            return [4, f(i)];
          case 6:
            return [4, n.sent()];
          case 7:
            return n.sent(), [3, 2];
          case 8:
            return [3, 10];
          case 9:
            return t.releaseLock(), [7];
          case 10:
            return [2]
          }
        }))
      }))
    }

    function Te(e) {
      return w(null == e ? void 0 : e.getReader)
    }

    function Ee(e) {
      if (e instanceof X) return e;
      if (null != e) {
        if (ye(e)) return n = e, new X((function (e) {
          var t = n[G]();
          if (w(t.subscribe)) return t.subscribe(e);
          throw new TypeError("Provided object does not correctly implement Symbol.observable")
        }));
        if (fe(e)) return i = e, new X((function (e) {
          for (var t = 0; t < i.length && !e.closed; t++) e.next(i[t]);
          e.complete()
        }));
        if (ge(e)) return r = e, new X((function (e) {
          r.then((function (t) {
            e.closed || (e.next(t), e.complete())
          }), (function (t) {
            return e.error(t)
          })).then(null, F)
        }));
        if (we(e)) return Ce(e);
        if (ke(e)) return t = e, new X((function (e) {
          var r, i;
          try {
            for (var n = h(t), s = n.next(); !s.done; s = n.next()) {
              var a = s.value;
              if (e.next(a), e.closed) return
            }
          } catch (e) {
            r = {
              error: e
            }
          } finally {
            try {
              s && !s.done && (i = n.return) && i.call(n)
            } finally {
              if (r) throw r.error
            }
          }
          e.complete()
        }));
        if (Te(e)) return Ce(Se(e))
      }
      var t, r, i, n;
      throw ve(e)
    }

    function Ce(e) {
      return new X((function (t) {
        (function (e, t) {
          var r, i, n, s;
          return d(this, void 0, void 0, (function () {
            var a, o;
            return u(this, (function (c) {
              switch (c.label) {
              case 0:
                c.trys.push([0, 5, 6, 11]), r = y(e), c.label = 1;
              case 1:
                return [4, r.next()];
              case 2:
                if ((i = c.sent()).done) return [3, 4];
                if (a = i.value, t.next(a), t.closed) return [2];
                c.label = 3;
              case 3:
                return [3, 1];
              case 4:
                return [3, 11];
              case 5:
                return o = c.sent(), n = {
                  error: o
                }, [3, 11];
              case 6:
                return c.trys.push([6, , 9, 10]), i && !i.done && (s = r.return) ? [4, s.call(r)] : [3, 8];
              case 7:
                c.sent(), c.label = 8;
              case 8:
                return [3, 10];
              case 9:
                if (n) throw n.error;
                return [7];
              case 10:
                return [7];
              case 11:
                return t.complete(), [2]
              }
            }))
          }))
        })(e, t).catch((function (e) {
          return t.error(e)
        }))
      }))
    }

    function xe(e, t, r, i, n) {
      void 0 === i && (i = 0), void 0 === n && (n = !1);
      var s = t.schedule((function () {
        r(), n ? e.add(this.schedule(null, i)) : this.unsubscribe()
      }), i);
      if (e.add(s), !n) return s
    }

    function Me(e, t) {
      return void 0 === t && (t = 0), Q((function (r, i) {
        r.subscribe(Y(i, (function (r) {
          return xe(i, e, (function () {
            return i.next(r)
          }), t)
        }), (function () {
          return xe(i, e, (function () {
            return i.complete()
          }), t)
        }), (function (r) {
          return xe(i, e, (function () {
            return i.error(r)
          }), t)
        })))
      }))
    }

    function _e(e, t) {
      return void 0 === t && (t = 0), Q((function (r, i) {
        i.add(e.schedule((function () {
          return r.subscribe(i)
        }), t))
      }))
    }

    function Ie(e, t) {
      if (!e) throw new Error("Iterable cannot be null");
      return new X((function (r) {
        xe(r, t, (function () {
          var i = e[Symbol.asyncIterator]();
          xe(r, t, (function () {
            i.next().then((function (e) {
              e.done ? r.complete() : r.next(e.value)
            }))
          }), 0, !0)
        }))
      }))
    }

    function Pe(e, t) {
      if (null != e) {
        if (ye(e)) return function (e, t) {
          return Ee(e).pipe(_e(t), Me(t))
        }(e, t);
        if (fe(e)) return function (e, t) {
          return new X((function (r) {
            var i = 0;
            return t.schedule((function () {
              i === e.length ? r.complete() : (r.next(e[i++]), r.closed || this.schedule())
            }))
          }))
        }(e, t);
        if (ge(e)) return function (e, t) {
          return Ee(e).pipe(_e(t), Me(t))
        }(e, t);
        if (we(e)) return Ie(e, t);
        if (ke(e)) return function (e, t) {
          return new X((function (r) {
            var i;
            return xe(r, t, (function () {
                i = e[be](), xe(r, t, (function () {
                  var e, t, n;
                  try {
                    t = (e = i.next()).value, n = e.done
                  } catch (e) {
                    return void r.error(e)
                  }
                  n ? r.complete() : r.next(t)
                }), 0, !0)
              })),
              function () {
                return w(null == i ? void 0 : i.return) && i.return()
              }
          }))
        }(e, t);
        if (Te(e)) return function (e, t) {
          return Ie(Se(e), t)
        }(e, t)
      }
      throw ve(e)
    }

    function Ae(e, t) {
      return t ? Pe(e, t) : Ee(e)
    }

    function Fe() {
      for (var e = [], t = 0; t < arguments.length; t++) e[t] = arguments[t];
      return Ae(e, me(e))
    }
    var Oe = v((function (e) {
      return function () {
        e(this), this.name = "EmptyError", this.message = "no elements in sequence"
      }
    }));

    function Re(e, t) {
      var r = "object" == typeof t;
      return new Promise((function (i, n) {
        var s = new j({
          next: function (e) {
            i(e), s.unsubscribe()
          },
          error: n,
          complete: function () {
            r ? i(t.defaultValue) : n(new Oe)
          }
        });
        e.subscribe(s)
      }))
    }

    function Le(e, t) {
      return Q((function (r, i) {
        var n = 0;
        r.subscribe(Y(i, (function (r) {
          i.next(e.call(t, r, n++))
        })))
      }))
    }
    var De = Array.isArray;

    function Ne(e) {
      return Le((function (t) {
        return function (e, t) {
          return De(t) ? e.apply(void 0, m([], p(t))) : e(t)
        }(e, t)
      }))
    }
    Array.isArray, Object.getPrototypeOf, Object.prototype, Object.keys;

    function Be(e, t, r, i, n, s, a, o) {
      var c = [],
        l = 0,
        d = 0,
        u = !1,
        h = function () {
          !u || c.length || l || t.complete()
        },
        p = function (e) {
          return l < i ? m(e) : c.push(e)
        },
        m = function (e) {
          s && t.next(e), l++;
          var o = !1;
          Ee(r(e, d++)).subscribe(Y(t, (function (e) {
            null == n || n(e), s ? p(e) : t.next(e)
          }), (function () {
            o = !0
          }), void 0, (function () {
            if (o) try {
              l--;
              for (var e = function () {
                  var e = c.shift();
                  a ? xe(t, a, (function () {
                    return m(e)
                  })) : m(e)
                }; c.length && l < i;) e();
              h()
            } catch (e) {
              t.error(e)
            }
          })))
        };
      return e.subscribe(Y(t, p, (function () {
          u = !0, h()
        }))),
        function () {
          null == o || o()
        }
    }

    function Ke(e, t, r) {
      return void 0 === r && (r = 1 / 0), w(t) ? Ke((function (r, i) {
        return Le((function (e, n) {
          return t(r, e, i, n)
        }))(Ee(e(r, i)))
      }), r) : ("number" == typeof t && (r = t), Q((function (t, i) {
        return Be(t, i, e, r)
      })))
    }

    function He(e) {
      return void 0 === e && (e = 1 / 0), Ke(z, e)
    }

    function qe() {
      for (var e = [], t = 0; t < arguments.length; t++) e[t] = arguments[t];
      return He(1)(Ae(e, me(e)))
    }

    function je(e) {
      return new X((function (t) {
        Ee(e()).subscribe(t)
      }))
    }
    var Ue = ["addListener", "removeListener"],
      $e = ["addEventListener", "removeEventListener"],
      We = ["on", "off"];

    function Ge(e, t, r, i) {
      if (w(r) && (i = r, r = void 0), i) return Ge(e, t, r).pipe(Ne(i));
      var n = p(function (e) {
          return w(e.addEventListener) && w(e.removeEventListener)
        }(e) ? $e.map((function (i) {
          return function (n) {
            return e[i](t, n, r)
          }
        })) : function (e) {
          return w(e.addListener) && w(e.removeListener)
        }(e) ? Ue.map(ze(e, t)) : function (e) {
          return w(e.on) && w(e.off)
        }(e) ? We.map(ze(e, t)) : [], 2),
        s = n[0],
        a = n[1];
      if (!s && fe(e)) return Ke((function (e) {
        return Ge(e, t, r)
      }))(Ee(e));
      if (!s) throw new TypeError("Invalid event target");
      return new X((function (e) {
        var t = function () {
          for (var t = [], r = 0; r < arguments.length; r++) t[r] = arguments[r];
          return e.next(1 < t.length ? t : t[0])
        };
        return s(t),
          function () {
            return a(t)
          }
      }))
    }

    function ze(e, t) {
      return function (r) {
        return function (i) {
          return e[r](t, i)
        }
      }
    }

    function Ve(e, t, r) {
      void 0 === e && (e = 0), void 0 === r && (r = de);
      var i = -1;
      return null != t && (he(t) ? r = t : i = t), new X((function (t) {
        var n, s = (n = e) instanceof Date && !isNaN(n) ? +e - r.now() : e;
        s < 0 && (s = 0);
        var a = 0;
        return r.schedule((function () {
          t.closed || (t.next(a++), 0 <= i ? this.schedule(void 0, i) : t.complete())
        }), s)
      }))
    }

    function Xe() {
      for (var e = [], t = 0; t < arguments.length; t++) e[t] = arguments[t];
      var r = me(e),
        i = function (e, t) {
          return "number" == typeof pe(e) ? e.pop() : t
        }(e, 1 / 0),
        n = e;
      return n.length ? 1 === n.length ? Ee(n[0]) : He(i)(Ae(n, r)) : ue
    }
    var Je = new X(O),
      Qe = Array.isArray;

    function Ye(e) {
      return 1 === e.length && Qe(e[0]) ? e[0] : e
    }

    function Ze(e, t) {
      return Q((function (r, i) {
        var n = 0;
        r.subscribe(Y(i, (function (r) {
          return e.call(t, r, n++) && i.next(r)
        })))
      }))
    }

    function et(e) {
      return function (t) {
        for (var r = [], i = function (i) {
            r.push(Ee(e[i]).subscribe(Y(t, (function (e) {
              if (r) {
                for (var n = 0; n < r.length; n++) n !== i && r[n].unsubscribe();
                r = null
              }
              t.next(e)
            }))))
          }, n = 0; r && !t.closed && n < e.length; n++) i(n)
      }
    }

    function tt(e) {
      return Q((function (t, r) {
        var i, n = null,
          s = !1;
        n = t.subscribe(Y(r, void 0, void 0, (function (a) {
          i = Ee(e(a, tt(e)(t))), n ? (n.unsubscribe(), n = null, i.subscribe(r)) : s = !0
        }))), s && (n.unsubscribe(), n = null, i.subscribe(r))
      }))
    }

    function rt(e) {
      return Q((function (t, r) {
        var i = !1;
        t.subscribe(Y(r, (function (e) {
          i = !0, r.next(e)
        }), (function () {
          i || r.next(e), r.complete()
        })))
      }))
    }

    function it(e) {
      return e <= 0 ? function () {
        return ue
      } : Q((function (t, r) {
        var i = 0;
        t.subscribe(Y(r, (function (t) {
          ++i <= e && (r.next(t), e <= i && r.complete())
        })))
      }))
    }

    function nt() {
      return Q((function (e, t) {
        e.subscribe(Y(t, O))
      }))
    }

    function st(e) {
      return void 0 === e && (e = at), Q((function (t, r) {
        var i = !1;
        t.subscribe(Y(r, (function (e) {
          i = !0, r.next(e)
        }), (function () {
          return i ? r.complete() : r.error(e())
        })))
      }))
    }

    function at() {
      return new Oe
    }

    function ot(e, t) {
      var r = arguments.length >= 2;
      return function (i) {
        return i.pipe(e ? Ze((function (t, r) {
          return e(t, r, i)
        })) : z, it(1), r ? rt(t) : st((function () {
          return new Oe
        })))
      }
    }

    function ct() {
      for (var e = [], t = 0; t < arguments.length; t++) e[t] = arguments[t];
      return e.length ? Q((function (t, r) {
        et(m([t], p(e)))(r)
      })) : z
    }

    function lt(e) {
      var t;
      void 0 === e && (e = 1 / 0);
      var r = (t = e && "object" == typeof e ? e : {
          count: e
        }).count,
        i = void 0 === r ? 1 / 0 : r,
        n = t.delay,
        s = t.resetOnSuccess,
        a = void 0 !== s && s;
      return i <= 0 ? z : Q((function (e, t) {
        var r, s = 0,
          o = function () {
            var c = !1;
            r = e.subscribe(Y(t, (function (e) {
              a && (s = 0), t.next(e)
            }), void 0, (function (e) {
              if (s++ < i) {
                var a = function () {
                  r ? (r.unsubscribe(), r = null, o()) : c = !0
                };
                if (null != n) {
                  var l = "number" == typeof n ? Ve(n) : Ee(n(e, s)),
                    d = Y(t, (function () {
                      d.unsubscribe(), a()
                    }), (function () {
                      t.complete()
                    }));
                  l.subscribe(d)
                } else a()
              } else t.error(e)
            }))), c && (r.unsubscribe(), r = null, o())
          };
        o()
      }))
    }

    function dt(e, t, r) {
      var i = w(e) || t || r ? {
        next: e,
        error: t,
        complete: r
      } : e;
      return i ? Q((function (e, t) {
        var r;
        null === (r = i.subscribe) || void 0 === r || r.call(i);
        var n = !0;
        e.subscribe(Y(t, (function (e) {
          var r;
          null === (r = i.next) || void 0 === r || r.call(i, e), t.next(e)
        }), (function () {
          var e;
          n = !1, null === (e = i.complete) || void 0 === e || e.call(i), t.complete()
        }), (function (e) {
          var r;
          n = !1, null === (r = i.error) || void 0 === r || r.call(i, e), t.error(e)
        }), (function () {
          var e, t;
          n && (null === (e = i.unsubscribe) || void 0 === e || e.call(i)), null === (t = i.finalize) || void 0 === t || t.call(i)
        })))
      })) : z
    }
    Symbol.dispose ??= Symbol("dispose"), Symbol.asyncDispose ??= Symbol("asyncDispose");
    const ut = Symbol.dispose,
      ht = Symbol.asyncDispose;
    class pt {
      #e = !1;
      #t = [];
      get disposed() {
        return this.#e
      }
      dispose() {
        if (!this.#e) {
          this.#e = !0;
          for (const e of this.#t.reverse()) e[ut]()
        }
      }
      use(e) {
        return e && this.#t.push(e), e
      }
      adopt(e, t) {
        return this.#t.push({
          [ut]() {
            t(e)
          }
        }), e
      }
      defer(e) {
        this.#t.push({
          [ut]() {
            e()
          }
        })
      }
      move() {
        if (this.#e) throw new ReferenceError("a disposed stack can not use anything new");
        const e = new pt;
        return e.#t = this.#t, this.#e = !0, e
      } [ut] = this.dispose;
      [Symbol.toStringTag] = "DisposableStack"
    }
    class mt {
      #e = !1;
      #t = [];
      get disposed() {
        return this.#e
      }
      async dispose() {
        if (!this.#e) {
          this.#e = !0;
          for (const e of this.#t.reverse()) await e[ht]()
        }
      }
      use(e) {
        return e && this.#t.push(e), e
      }
      adopt(e, t) {
        return this.#t.push({
          [ht]: () => t(e)
        }), e
      }
      defer(e) {
        this.#t.push({
          [ht]: () => e()
        })
      }
      move() {
        if (this.#e) throw new ReferenceError("a disposed stack can not use anything new");
        const e = new mt;
        return e.#t = this.#t, this.#e = !0, e
      } [ht] = this.dispose;
      [Symbol.toStringTag] = "AsyncDisposableStack"
    }
    class ft {
      #r;
      #i = new Map;
      constructor(e = function (e) {
        return {
          all: e = e || new Map,
          on: function (t, r) {
            var i = e.get(t);
            i ? i.push(r) : e.set(t, [r])
          },
          off: function (t, r) {
            var i = e.get(t);
            i && (r ? i.splice(i.indexOf(r) >>> 0, 1) : e.set(t, []))
          },
          emit: function (t, r) {
            var i = e.get(t);
            i && i.slice().map((function (e) {
              e(r)
            })), (i = e.get("*")) && i.slice().map((function (e) {
              e(t, r)
            }))
          }
        }
      }(new Map)) {
        this.#r = e
      }
      on(e, t) {
        const r = this.#i.get(e);
        return void 0 === r ? this.#i.set(e, [t]) : r.push(t), this.#r.on(e, t), this
      }
      off(e, t) {
        const r = this.#i.get(e) ?? [];
        if (void 0 === t) {
          for (const t of r) this.#r.off(e, t);
          return this.#i.delete(e), this
        }
        const i = r.lastIndexOf(t);
        return i > -1 && this.#r.off(e, ...r.splice(i, 1)), this
      }
      emit(e, t) {
        return this.#r.emit(e, t), this.listenerCount(e) > 0
      }
      once(e, t) {
        const r = i => {
          t(i), this.off(e, r)
        };
        return this.on(e, r)
      }
      listenerCount(e) {
        return this.#i.get(e)?.length || 0
      }
      removeAllListeners(e) {
        return void 0 !== e ? this.off(e) : (this[ut](), this)
      } [ut]() {
        for (const [e, t] of this.#i)
          for (const r of t) this.#r.off(e, r);
        this.#i.clear()
      }
    }
    var gt = a(606);
    const yt = !(void 0 === gt || !gt.version),
      wt = {
        value: {
          get fs() {
            throw new Error("fs is not available in this environment")
          },
          get ScreenRecorder() {
            throw new Error("ScreenRecorder is not available in this environment")
          }
        }
      };
    var vt = a(809);
    const bt = (e, t) => {
      if (!e) throw new Error(t)
    };

    function kt(e, t = !1) {
      if (t) {
        const t = atob(e);
        return Uint8Array.from(t, (e => e.codePointAt(0)))
      }
      return (new TextEncoder).encode(e)
    }

    function St(e) {
      const t = [];
      for (let r = 0; r < e.length; r += 65534) {
        const i = e.subarray(r, r + 65534);
        t.push(String.fromCodePoint.apply(null, i))
      }
      const r = t.join("");
      return btoa(r)
    }
    let Tt = null;
    const Et = e => yt ? async (...t) => {
      xt && Ct.push(e + t), (await async function () {
        return Tt || (Tt = (await a.e(833).then(a.t.bind(a, 833, 19))).default), Tt
      }())(e)(t)
    }: (...t) => {
      const r = globalThis.__PUPPETEER_DEBUG;
      if (!r) return;
      "*" === r || r.endsWith("*") && e.startsWith(r)
    };
    let Ct = [],
      xt = !1;
    class Mt extends Error {
      constructor(e, t) {
        super(e, t), this.name = this.constructor.name
      }
      get[Symbol.toStringTag]() {
        return this.constructor.name
      }
    }
    class _t extends Mt {}
    class It extends Mt {}
    class Pt extends Mt {
      #n;
      #s = "";
      set code(e) {
        this.#n = e
      }
      get code() {
        return this.#n
      }
      set originalMessage(e) {
        this.#s = e
      }
      get originalMessage() {
        return this.#s
      }
    }
    class At extends Mt {}
    class Ft extends Pt {}
    const Ot = {
        letter: {
          cm: {
            width: 21.59,
            height: 27.94
          },
          in: {
            width: 8.5,
            height: 11
          }
        },
        legal: {
          cm: {
            width: 21.59,
            height: 35.56
          },
          in: {
            width: 8.5,
            height: 14
          }
        },
        tabloid: {
          cm: {
            width: 27.94,
            height: 43.18
          },
          in: {
            width: 11,
            height: 17
          }
        },
        ledger: {
          cm: {
            width: 43.18,
            height: 27.94
          },
          in: {
            width: 17,
            height: 11
          }
        },
        a0: {
          cm: {
            width: 84.1,
            height: 118.9
          },
          in: {
            width: 33.1102,
            height: 46.811
          }
        },
        a1: {
          cm: {
            width: 59.4,
            height: 84.1
          },
          in: {
            width: 23.3858,
            height: 33.1102
          }
        },
        a2: {
          cm: {
            width: 42,
            height: 59.4
          },
          in: {
            width: 16.5354,
            height: 23.3858
          }
        },
        a3: {
          cm: {
            width: 29.7,
            height: 42
          },
          in: {
            width: 11.6929,
            height: 16.5354
          }
        },
        a4: {
          cm: {
            width: 21,
            height: 29.7
          },
          in: {
            width: 8.2677,
            height: 11.6929
          }
        },
        a5: {
          cm: {
            width: 14.8,
            height: 21
          },
          in: {
            width: 5.8268,
            height: 8.2677
          }
        },
        a6: {
          cm: {
            width: 10.5,
            height: 14.8
          },
          in: {
            width: 4.1339,
            height: 5.8268
          }
        }
      },
      Rt = Et("puppeteer:error"),
      Lt = Object.freeze({
        width: 800,
        height: 600
      }),
      Dt = Symbol("Source URL for Puppeteer evaluation scripts");
    class Nt {
      static INTERNAL_URL = "pptr:internal";
      static fromCallSite(e, t) {
        const r = new Nt;
        return r.#a = e, r.#o = t.toString(), r
      }
      static parse = e => {
        e = e.slice(5);
        const [t = "", r = ""] = e.split(";"), i = new Nt;
        return i.#a = t, i.#o = decodeURIComponent(r), i
      };
      static isPuppeteerURL = e => e.startsWith("pptr:");
      #a;
      #o;
      get functionName() {
        return this.#a
      }
      get siteString() {
        return this.#o
      }
      toString() {
        return `pptr:${[this.#a,encodeURIComponent(this.#o)].join(";")}`
      }
    }
    const Bt = (e, t) => {
        if (Object.prototype.hasOwnProperty.call(t, Dt)) return t;
        const r = Error.prepareStackTrace;
        Error.prepareStackTrace = (e, t) => t[2];
        const i = (new Error).stack;
        return Error.prepareStackTrace = r, Object.assign(t, {
          [Dt]: Nt.fromCallSite(e, i)
        })
      },
      Kt = e => "string" == typeof e || e instanceof String;

    function Ht(e, ...t) {
      if (Kt(e)) return bt(0 === t.length, "Cannot evaluate a string with arguments"), e;
      return `(${e})(${t.map((function(e){return Object.is(e,void 0)?"undefined":JSON.stringify(e)})).join(",")})`
    }
    async function qt(e, t) {
      const r = [],
        i = e.getReader();
      if (t) {
        const e = await wt.value.fs.promises.open(t, "w+");
        try {
          for (;;) {
            const {
              done: t,
              value: n
            } = await i.read();
            if (t) break;
            r.push(n), await e.writeFile(n)
          }
        } finally {
          await e.close()
        }
      } else
        for (;;) {
          const {
            done: e,
            value: t
          } = await i.read();
          if (e) break;
          r.push(t)
        }
      try {
        const e = function (e) {
          let t = 0;
          for (const r of e) t += r.length;
          const r = new Uint8Array(t);
          let i = 0;
          for (const t of e) r.set(t, i), i += t.length;
          return r
        }(r);
        return 0 === e.length ? null : e
      } catch (e) {
        return Rt(e), null
      }
    }
    async function jt(e, t) {
      return new ReadableStream({
        async pull(r) {
          const {
            data: i,
            base64Encoded: n,
            eof: s
          } = await e.send("IO.read", {
            handle: t
          });
          r.enqueue(function (e, t) {
            return t ? Uint8Array.from(atob(e), (e => e.codePointAt(0))) : (new TextEncoder).encode(e)
          }(i, n ?? !1)), s && (await e.send("IO.close", {
            handle: t
          }), r.close())
        }
      })
    }

    function Ut(e, t) {
      return 0 === e ? Je : Ve(e).pipe(Le((() => {
        throw new _t(`Timed out after waiting ${e}ms`, {
          cause: t
        })
      })))
    }
    const $t = "__puppeteer_utility_world__" + vt.T,
      Wt = /^[\x20\t]*\/\/[@#] sourceURL=\s{0,10}(\S*?)\s{0,10}$/m;
    const Gt = 500;
    const zt = {
      px: 1,
      in: 96,
      cm: 37.8,
      mm: 3.78
    };

    function Vt(e, t = "in") {
      if (void 0 === e) return;
      let r;
      if ("number" == typeof (i = e) || i instanceof Number) r = e;
      else {
        if (!Kt(e)) throw new Error("page.pdf() Cannot handle parameter type: " + typeof e);
        {
          const t = e;
          let i = t.substring(t.length - 2).toLowerCase(),
            n = "";
          i in zt ? n = t.substring(0, t.length - 2) : (i = "px", n = t);
          const s = Number(n);
          bt(!isNaN(s), "Failed to parse parameter value: " + t), r = s * zt[i]
        }
      }
      var i;
      return r / zt[t]
    }

    function Xt(e, t) {
      return new X((r => {
        const i = e => {
          r.next(e)
        };
        return e.on(t, i), () => {
          e.off(t, i)
        }
      }))
    }

    function Jt(e, t) {
      return e ? Ge(e, "abort").pipe(Le((() => {
        if (e.reason instanceof Error) throw e.reason.cause = t, e.reason;
        throw new Error(e.reason, {
          cause: t
        })
      }))) : Je
    }

    function Qt(e) {
      return Ke((t => Ae(Promise.resolve(e(t))).pipe(Ze((e => e)), Le((() => t)))))
    }
    const Yt = new Map([
      ["accelerometer", "sensors"],
      ["ambient-light-sensor", "sensors"],
      ["background-sync", "backgroundSync"],
      ["camera", "videoCapture"],
      ["clipboard-read", "clipboardReadWrite"],
      ["clipboard-sanitized-write", "clipboardSanitizedWrite"],
      ["clipboard-write", "clipboardReadWrite"],
      ["geolocation", "geolocation"],
      ["gyroscope", "sensors"],
      ["idle-detection", "idleDetection"],
      ["keyboard-lock", "keyboardLock"],
      ["magnetometer", "sensors"],
      ["microphone", "audioCapture"],
      ["midi", "midi"],
      ["notifications", "notifications"],
      ["payment-handler", "paymentHandler"],
      ["persistent-storage", "durableStorage"],
      ["pointer-lock", "pointerLock"],
      ["midi-sysex", "midiSysex"]
    ]);
    class Zt extends ft {
      constructor() {
        super()
      }
      async waitForTarget(e, t = {}) {
        const {
          timeout: r = 3e4,
          signal: i
        } = t;
        return await Re(Xe(Xt(this, "targetcreated"), Xt(this, "targetchanged"), Ae(this.targets())).pipe(Qt(e), ct(Jt(i), Ut(r))))
      }
      async pages() {
        const e = await Promise.all(this.browserContexts().map((e => e.pages())));
        return e.reduce(((e, t) => e.concat(t)), [])
      }
      async cookies() {
        return await this.defaultBrowserContext().cookies()
      }
      async setCookie(...e) {
        return await this.defaultBrowserContext().setCookie(...e)
      }
      async deleteCookie(...e) {
        return await this.defaultBrowserContext().deleteCookie(...e)
      }
      isConnected() {
        return this.connected
      } [ut]() {
        this.process() ? this.close().catch(Rt) : this.disconnect().catch(Rt)
      } [ht]() {
        return this.process() ? this.close() : this.disconnect()
      }
    }
    class er {
      static create(e) {
        return new er(e)
      }
      static async race(e) {
        const t = new Set;
        try {
          const r = e.map((e => e instanceof er ? (e.#c && t.add(e), e.valueOrThrow()) : e));
          return await Promise.race(r)
        } finally {
          for (const e of t) e.reject(new Error("Timeout cleared"))
        }
      }
      #l = !1;
      #d = !1;
      #u;
      #h;
      #p = new Promise((e => {
        this.#h = e
      }));
      #c;
      #m;
      constructor(e) {
        e && e.timeout > 0 && (this.#m = new _t(e.message), this.#c = setTimeout((() => {
          this.reject(this.#m)
        }), e.timeout))
      }
      #f(e) {
        clearTimeout(this.#c), this.#u = e, this.#h()
      }
      resolve(e) {
        this.#d || this.#l || (this.#l = !0, this.#f(e))
      }
      reject(e) {
        this.#d || this.#l || (this.#d = !0, this.#f(e))
      }
      resolved() {
        return this.#l
      }
      finished() {
        return this.#l || this.#d
      }
      value() {
        return this.#u
      }
      #g;
      valueOrThrow() {
        return this.#g || (this.#g = (async () => {
          if (await this.#p, this.#d) throw this.#u;
          return this.#u
        })()), this.#g
      }
    }
    class tr {
      static Guard = class {
        #y;
        #w;
        constructor(e, t) {
          this.#y = e, this.#w = t
        } [ut]() {
          return this.#w?.(), this.#y.release()
        }
      };
      #v = !1;
      #b = [];
      async acquire(e) {
        if (!this.#v) return this.#v = !0, new tr.Guard(this);
        const t = er.create();
        return this.#b.push(t.resolve.bind(t)), await t.valueOrThrow(), new tr.Guard(this, e)
      }
      release() {
        const e = this.#b.shift();
        e ? e() : this.#v = !1
      }
    }
    class rr extends ft {
      constructor() {
        super()
      }
      #k;
      #S = 0;
      startScreenshot() {
        const e = this.#k || new tr;
        return this.#k = e, this.#S++, e.acquire((() => {
          this.#S--, 0 === this.#S && (this.#k = void 0)
        }))
      }
      waitForScreenshotOperations() {
        return this.#k?.acquire()
      }
      async waitForTarget(e, t = {}) {
        const {
          timeout: r = 3e4
        } = t;
        return await Re(Xe(Xt(this, "targetcreated"), Xt(this, "targetchanged"), Ae(this.targets())).pipe(Qt(e), ct(Ut(r))))
      }
      async deleteCookie(...e) {
        return await this.setCookie(...e.map((e => ({
          ...e,
          expires: 1
        }))))
      }
      get closed() {
        return !this.browser().browserContexts().includes(this)
      }
      get id() {} [ut]() {
        this.close().catch(Rt)
      } [ht]() {
        return this.close()
      }
    }
    var ir;
    ! function (e) {
      e.Disconnected = Symbol("CDPSession.Disconnected"), e.Swapped = Symbol("CDPSession.Swapped"), e.Ready = Symbol("CDPSession.Ready"), e.SessionAttached = "sessionattached", e.SessionDetached = "sessiondetached"
    }(ir || (ir = {}));
    class nr extends ft {
      constructor() {
        super()
      }
      parentSession() {}
    }
    const sr = Symbol("_isElementHandle");

    function ar(e) {
      return "object" == typeof e && null !== e && "name" in e && "message" in e
    }

    function or(e, t, r) {
      return e.message = t, e.originalMessage = r ?? e.originalMessage, e
    }

    function cr(e) {
      let t = e.error.message;
      return e.error && "object" == typeof e.error && "data" in e.error && (t += ` ${e.error.data}`), t
    }
    const lr = new Map;

    function dr(e) {
      let t = e.toString();
      try {
        new Function(`(${t})`)
      } catch (e) {
        if (e.message.includes("Refused to evaluate a string as JavaScript because 'unsafe-eval' is not an allowed source of script in the following Content Security Policy directive")) return t;
        let r = "function ";
        t.startsWith("async ") && (r = `async ${r}`, t = t.substring(6)), t = `${r}${t}`;
        try {
          new Function(`(${t})`)
        } catch {
          throw new Error("Passed function cannot be serialized!")
        }
      }
      return t
    }
    const ur = (e, t) => {
      let r = dr(e);
      for (const [e, i] of Object.entries(t)) r = r.replace(new RegExp(`PLACEHOLDER\\(\\s*(?:'${e}'|"${e}")\\s*\\)`, "g"), `(${i})`);
      return (e => {
        let t = lr.get(e);
        return t || (t = new Function(`return ${e}`)(), lr.set(e, t), t)
      })(r)
    };
    var hr = function (e, t, r) {
        if (null != t) {
          if ("object" != typeof t && "function" != typeof t) throw new TypeError("Object expected.");
          var i, n;
          if (r) {
            if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
            i = t[Symbol.asyncDispose]
          }
          if (void 0 === i) {
            if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
            i = t[Symbol.dispose], r && (n = i)
          }
          if ("function" != typeof i) throw new TypeError("Object not disposable.");
          n && (i = function () {
            try {
              n.call(this)
            } catch (e) {
              return Promise.reject(e)
            }
          }), e.stack.push({
            value: t,
            dispose: i,
            async: r
          })
        } else r && e.stack.push({
          async: !0
        });
        return t
      },
      pr = function (e) {
        return function (t) {
          function r(r) {
            t.error = t.hasError ? new e(r, t.error, "An error was suppressed during disposal.") : r, t.hasError = !0
          }
          var i, n = 0;
          return function e() {
            for (; i = t.stack.pop();) try {
              if (!i.async && 1 === n) return n = 0, t.stack.push(i), Promise.resolve().then(e);
              if (i.dispose) {
                var s = i.dispose.call(i.value);
                if (i.async) return n |= 2, Promise.resolve(s).then(e, (function (t) {
                  return r(t), e()
                }))
              } else n |= 1
            } catch (e) {
              r(e)
            }
            if (1 === n) return t.hasError ? Promise.reject(t.error) : Promise.resolve();
            if (t.hasError) throw t.error
          }()
        }
      }("function" == typeof SuppressedError ? SuppressedError : function (e, t, r) {
        var i = new Error(r);
        return i.name = "SuppressedError", i.error = e, i.suppressed = t, i
      });
    async function* mr(e, t) {
      const r = {
        stack: [],
        error: void 0,
        hasError: !1
      };
      try {
        const i = hr(r, await e.evaluateHandle((async (e, t) => {
            const r = [];
            for (; r.length < t;) {
              const t = await e.next();
              if (t.done) break;
              r.push(t.value)
            }
            return r
          }), t), !1),
          n = await i.getProperties(),
          s = n.values();
        return hr(r, new pt, !1).defer((() => {
          for (const e of s) {
            const t = {
              stack: [],
              error: void 0,
              hasError: !1
            };
            try {
              hr(t, e, !1)[ut]()
            } catch (e) {
              t.error = e, t.hasError = !0
            } finally {
              pr(t)
            }
          }
        })), yield* s, 0 === n.size
      } catch (e) {
        r.error = e, r.hasError = !0
      } finally {
        pr(r)
      }
    }
    async function* fr(e) {
      const t = {
        stack: [],
        error: void 0,
        hasError: !1
      };
      try {
        const r = hr(t, await e.evaluateHandle((e => async function* () {
          yield* e
        }())), !1);
        yield* async function* (e) {
          let t = 20;
          for (; !(yield* mr(e, t));) t <<= 1
        }(r)
      } catch (e) {
        t.error = e, t.hasError = !0
      } finally {
        pr(t)
      }
    }
    class gr {
      static create = e => new gr(e);
      #T;
      constructor(e) {
        this.#T = e
      }
      async get(e) {
        return await this.#T(e)
      }
    }
    var yr = function (e, t, r) {
        if (null != t) {
          if ("object" != typeof t && "function" != typeof t) throw new TypeError("Object expected.");
          var i, n;
          if (r) {
            if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
            i = t[Symbol.asyncDispose]
          }
          if (void 0 === i) {
            if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
            i = t[Symbol.dispose], r && (n = i)
          }
          if ("function" != typeof i) throw new TypeError("Object not disposable.");
          n && (i = function () {
            try {
              n.call(this)
            } catch (e) {
              return Promise.reject(e)
            }
          }), e.stack.push({
            value: t,
            dispose: i,
            async: r
          })
        } else r && e.stack.push({
          async: !0
        });
        return t
      },
      wr = function (e) {
        return function (t) {
          function r(r) {
            t.error = t.hasError ? new e(r, t.error, "An error was suppressed during disposal.") : r, t.hasError = !0
          }
          var i, n = 0;
          return function e() {
            for (; i = t.stack.pop();) try {
              if (!i.async && 1 === n) return n = 0, t.stack.push(i), Promise.resolve().then(e);
              if (i.dispose) {
                var s = i.dispose.call(i.value);
                if (i.async) return n |= 2, Promise.resolve(s).then(e, (function (t) {
                  return r(t), e()
                }))
              } else n |= 1
            } catch (e) {
              r(e)
            }
            if (1 === n) return t.hasError ? Promise.reject(t.error) : Promise.resolve();
            if (t.hasError) throw t.error
          }()
        }
      }("function" == typeof SuppressedError ? SuppressedError : function (e, t, r) {
        var i = new Error(r);
        return i.name = "SuppressedError", i.error = e, i.suppressed = t, i
      });
    class vr {
      static querySelectorAll;
      static querySelector;
      static get _querySelector() {
        if (this.querySelector) return this.querySelector;
        if (!this.querySelectorAll) throw new Error("Cannot create default `querySelector`.");
        return this.querySelector = ur((async (e, t, r) => {
          const i = PLACEHOLDER("querySelectorAll")(e, t, r);
          for await (const e of i) return e;
          return null
        }), {
          querySelectorAll: dr(this.querySelectorAll)
        })
      }
      static get _querySelectorAll() {
        if (this.querySelectorAll) return this.querySelectorAll;
        if (!this.querySelector) throw new Error("Cannot create default `querySelectorAll`.");
        return this.querySelectorAll = ur((async function* (e, t, r) {
          const i = PLACEHOLDER("querySelector"),
            n = await i(e, t, r);
          n && (yield n)
        }), {
          querySelector: dr(this.querySelector)
        })
      }
      static async * queryAll(e, t) {
        const r = {
          stack: [],
          error: void 0,
          hasError: !1
        };
        try {
          const i = yr(r, await e.evaluateHandle(this._querySelectorAll, t, gr.create((e => e.puppeteerUtil))), !1);
          yield* fr(i)
        } catch (e) {
          r.error = e, r.hasError = !0
        } finally {
          wr(r)
        }
      }
      static async queryOne(e, t) {
        const r = {
          stack: [],
          error: void 0,
          hasError: !1
        };
        try {
          const i = yr(r, await e.evaluateHandle(this._querySelector, t, gr.create((e => e.puppeteerUtil))), !1);
          return sr in i ? i.move() : null
        } catch (e) {
          r.error = e, r.hasError = !0
        } finally {
          wr(r)
        }
      }
      static async waitFor(e, t, r) {
        const i = {
          stack: [],
          error: void 0,
          hasError: !1
        };
        try {
          let n;
          const s = yr(i, await (async () => {
              if (sr in e) return n = e.frame, await n.isolatedRealm().adoptHandle(e);
              n = e
            })(), !1),
            {
              visible: a = !1,
              hidden: o = !1,
              timeout: c,
              signal: l
            } = r,
            d = a || o ? "raf" : r.polling;
          try {
            const e = {
              stack: [],
              error: void 0,
              hasError: !1
            };
            try {
              l?.throwIfAborted();
              const r = yr(e, await n.isolatedRealm().waitForFunction((async (e, t, r, i, n) => {
                const s = e.createFunction(t),
                  a = await s(i ?? document, r, e);
                return e.checkVisibility(a, n)
              }), {
                polling: d,
                root: s,
                timeout: c,
                signal: l
              }, gr.create((e => e.puppeteerUtil)), dr(this._querySelector), t, s, !!a || !o && void 0), !1);
              if (l?.aborted) throw l.reason;
              return sr in r ? await n.mainRealm().transferHandle(r) : null
            } catch (t) {
              e.error = t, e.hasError = !0
            } finally {
              wr(e)
            }
          } catch (e) {
            if (!ar(e)) throw e;
            if ("AbortError" === e.name) throw e;
            throw e.message = `Waiting for selector \`${t}\` failed: ${e.message}`, e
          }
        } catch (e) {
          i.error = e, i.hasError = !0
        } finally {
          wr(i)
        }
      }
    }
    class br {
      static async * map(e, t) {
        for await (const r of e) yield await t(r)
      }
      static async * flatMap(e, t) {
        for await (const r of e) yield* t(r)
      }
      static async collect(e) {
        const t = [];
        for await (const r of e) t.push(r);
        return t
      }
      static async first(e) {
        for await (const t of e) return t
      }
    }
    const kr = /\[\s*(?<attribute>\w+)\s*=\s*(?<quote>"|')(?<value>\\.|.*?(?=\k<quote>))\k<quote>\s*\]/g;
    class Sr extends vr {
      static querySelector = async (e, t, {
        ariaQuerySelector: r
      }) => await r(e, t);
      static async * queryAll(e, t) {
        const {
          name: r,
          role: i
        } = (e => {
          if (e.length > 1e4) throw new Error(`Selector ${e} is too long`);
          const t = {},
            r = e.replace(kr, ((e, r, i, n) => (bt((e => ["name", "role"].includes(e))(r), `Unknown aria attribute "${r}" in selector`), t[r] = n, "")));
          return r && !t.name && (t.name = r), t
        })(t);
        yield* e.queryAXTree(r, i)
      }
      static queryOne = async (e, t) => await br.first(this.queryAll(e, t)) ?? null
    }
    class Tr extends vr {
      static querySelector = (e, t, {
        cssQuerySelector: r
      }) => r(e, t);
      static querySelectorAll = (e, t, {
        cssQuerySelectorAll: r
      }) => r(e, t)
    }
    const Er = new class {
      #E = !1;
      #C = new Set;
      append(e) {
        this.#x((() => {
          this.#C.add(e)
        }))
      }
      pop(e) {
        this.#x((() => {
          this.#C.delete(e)
        }))
      }
      inject(e, t = !1) {
        (this.#E || t) && e(this.#T()), this.#E = !1
      }
      #x(e) {
        e(), this.#E = !0
      }
      #T() {
        return `(() => {\n      const module = {};\n      "use strict";var g=Object.defineProperty;var X=Object.getOwnPropertyDescriptor;var B=Object.getOwnPropertyNames;var Y=Object.prototype.hasOwnProperty;var l=(t,e)=>{for(var r in e)g(t,r,{get:e[r],enumerable:!0})},J=(t,e,r,o)=>{if(e&&typeof e=="object"||typeof e=="function")for(let n of B(e))!Y.call(t,n)&&n!==r&&g(t,n,{get:()=>e[n],enumerable:!(o=X(e,n))||o.enumerable});return t};var z=t=>J(g({},"__esModule",{value:!0}),t);var pe={};l(pe,{default:()=>he});module.exports=z(pe);var N=class extends Error{constructor(e,r){super(e,r),this.name=this.constructor.name}get[Symbol.toStringTag](){return this.constructor.name}},p=class extends N{};var c=class t{static create(e){return new t(e)}static async race(e){let r=new Set;try{let o=e.map(n=>n instanceof t?(n.#n&&r.add(n),n.valueOrThrow()):n);return await Promise.race(o)}finally{for(let o of r)o.reject(new Error("Timeout cleared"))}}#e=!1;#r=!1;#o;#t;#a=new Promise(e=>{this.#t=e});#n;#i;constructor(e){e&&e.timeout>0&&(this.#i=new p(e.message),this.#n=setTimeout(()=>{this.reject(this.#i)},e.timeout))}#l(e){clearTimeout(this.#n),this.#o=e,this.#t()}resolve(e){this.#r||this.#e||(this.#e=!0,this.#l(e))}reject(e){this.#r||this.#e||(this.#r=!0,this.#l(e))}resolved(){return this.#e}finished(){return this.#e||this.#r}value(){return this.#o}#s;valueOrThrow(){return this.#s||(this.#s=(async()=>{if(await this.#a,this.#r)throw this.#o;return this.#o})()),this.#s}};var L=new Map,F=t=>{let e=L.get(t);return e||(e=new Function(\`return \${t}\`)(),L.set(t,e),e)};var x={};l(x,{ariaQuerySelector:()=>G,ariaQuerySelectorAll:()=>b});var G=(t,e)=>globalThis.__ariaQuerySelector(t,e),b=async function*(t,e){yield*await globalThis.__ariaQuerySelectorAll(t,e)};var E={};l(E,{cssQuerySelector:()=>K,cssQuerySelectorAll:()=>Z});var K=(t,e)=>t.querySelector(e),Z=function(t,e){return t.querySelectorAll(e)};var A={};l(A,{customQuerySelectors:()=>P});var v=class{#e=new Map;register(e,r){if(!r.queryOne&&r.queryAll){let o=r.queryAll;r.queryOne=(n,i)=>{for(let s of o(n,i))return s;return null}}else if(r.queryOne&&!r.queryAll){let o=r.queryOne;r.queryAll=(n,i)=>{let s=o(n,i);return s?[s]:[]}}else if(!r.queryOne||!r.queryAll)throw new Error("At least one query method must be defined.");this.#e.set(e,{querySelector:r.queryOne,querySelectorAll:r.queryAll})}unregister(e){this.#e.delete(e)}get(e){return this.#e.get(e)}clear(){this.#e.clear()}},P=new v;var R={};l(R,{pierceQuerySelector:()=>ee,pierceQuerySelectorAll:()=>te});var ee=(t,e)=>{let r=null,o=n=>{let i=document.createTreeWalker(n,NodeFilter.SHOW_ELEMENT);do{let s=i.currentNode;s.shadowRoot&&o(s.shadowRoot),!(s instanceof ShadowRoot)&&s!==n&&!r&&s.matches(e)&&(r=s)}while(!r&&i.nextNode())};return t instanceof Document&&(t=t.documentElement),o(t),r},te=(t,e)=>{let r=[],o=n=>{let i=document.createTreeWalker(n,NodeFilter.SHOW_ELEMENT);do{let s=i.currentNode;s.shadowRoot&&o(s.shadowRoot),!(s instanceof ShadowRoot)&&s!==n&&s.matches(e)&&r.push(s)}while(i.nextNode())};return t instanceof Document&&(t=t.documentElement),o(t),r};var u=(t,e)=>{if(!t)throw new Error(e)};var y=class{#e;#r;#o;#t;constructor(e,r){this.#e=e,this.#r=r}async start(){let e=this.#t=c.create(),r=await this.#e();if(r){e.resolve(r);return}this.#o=new MutationObserver(async()=>{let o=await this.#e();o&&(e.resolve(o),await this.stop())}),this.#o.observe(this.#r,{childList:!0,subtree:!0,attributes:!0})}async stop(){u(this.#t,"Polling never started."),this.#t.finished()||this.#t.reject(new Error("Polling stopped")),this.#o&&(this.#o.disconnect(),this.#o=void 0)}result(){return u(this.#t,"Polling never started."),this.#t.valueOrThrow()}},w=class{#e;#r;constructor(e){this.#e=e}async start(){let e=this.#r=c.create(),r=await this.#e();if(r){e.resolve(r);return}let o=async()=>{if(e.finished())return;let n=await this.#e();if(!n){window.requestAnimationFrame(o);return}e.resolve(n),await this.stop()};window.requestAnimationFrame(o)}async stop(){u(this.#r,"Polling never started."),this.#r.finished()||this.#r.reject(new Error("Polling stopped"))}result(){return u(this.#r,"Polling never started."),this.#r.valueOrThrow()}},S=class{#e;#r;#o;#t;constructor(e,r){this.#e=e,this.#r=r}async start(){let e=this.#t=c.create(),r=await this.#e();if(r){e.resolve(r);return}this.#o=setInterval(async()=>{let o=await this.#e();o&&(e.resolve(o),await this.stop())},this.#r)}async stop(){u(this.#t,"Polling never started."),this.#t.finished()||this.#t.reject(new Error("Polling stopped")),this.#o&&(clearInterval(this.#o),this.#o=void 0)}result(){return u(this.#t,"Polling never started."),this.#t.valueOrThrow()}};var _={};l(_,{PCombinator:()=>H,pQuerySelector:()=>fe,pQuerySelectorAll:()=>$});var a=class{static async*map(e,r){for await(let o of e)yield await r(o)}static async*flatMap(e,r){for await(let o of e)yield*r(o)}static async collect(e){let r=[];for await(let o of e)r.push(o);return r}static async first(e){for await(let r of e)return r}};var C={};l(C,{textQuerySelectorAll:()=>m});var re=new Set(["checkbox","image","radio"]),oe=t=>t instanceof HTMLSelectElement||t instanceof HTMLTextAreaElement||t instanceof HTMLInputElement&&!re.has(t.type),ne=new Set(["SCRIPT","STYLE"]),f=t=>!ne.has(t.nodeName)&&!document.head?.contains(t),I=new WeakMap,j=t=>{for(;t;)I.delete(t),t instanceof ShadowRoot?t=t.host:t=t.parentNode},W=new WeakSet,se=new MutationObserver(t=>{for(let e of t)j(e.target)}),d=t=>{let e=I.get(t);if(e||(e={full:"",immediate:[]},!f(t)))return e;let r="";if(oe(t))e.full=t.value,e.immediate.push(t.value),t.addEventListener("input",o=>{j(o.target)},{once:!0,capture:!0});else{for(let o=t.firstChild;o;o=o.nextSibling){if(o.nodeType===Node.TEXT_NODE){e.full+=o.nodeValue??"",r+=o.nodeValue??"";continue}r&&e.immediate.push(r),r="",o.nodeType===Node.ELEMENT_NODE&&(e.full+=d(o).full)}r&&e.immediate.push(r),t instanceof Element&&t.shadowRoot&&(e.full+=d(t.shadowRoot).full),W.has(t)||(se.observe(t,{childList:!0,characterData:!0,subtree:!0}),W.add(t))}return I.set(t,e),e};var m=function*(t,e){let r=!1;for(let o of t.childNodes)if(o instanceof Element&&f(o)){let n;o.shadowRoot?n=m(o.shadowRoot,e):n=m(o,e);for(let i of n)yield i,r=!0}r||t instanceof Element&&f(t)&&d(t).full.includes(e)&&(yield t)};var k={};l(k,{checkVisibility:()=>le,pierce:()=>T,pierceAll:()=>O});var ie=["hidden","collapse"],le=(t,e)=>{if(!t)return e===!1;if(e===void 0)return t;let r=t.nodeType===Node.TEXT_NODE?t.parentElement:t,o=window.getComputedStyle(r),n=o&&!ie.includes(o.visibility)&&!ae(r);return e===n?t:!1};function ae(t){let e=t.getBoundingClientRect();return e.width===0||e.height===0}var ce=t=>"shadowRoot"in t&&t.shadowRoot instanceof ShadowRoot;function*T(t){ce(t)?yield t.shadowRoot:yield t}function*O(t){t=T(t).next().value,yield t;let e=[document.createTreeWalker(t,NodeFilter.SHOW_ELEMENT)];for(let r of e){let o;for(;o=r.nextNode();)o.shadowRoot&&(yield o.shadowRoot,e.push(document.createTreeWalker(o.shadowRoot,NodeFilter.SHOW_ELEMENT)))}}var Q={};l(Q,{xpathQuerySelectorAll:()=>q});var q=function*(t,e,r=-1){let n=(t.ownerDocument||document).evaluate(e,t,null,XPathResult.ORDERED_NODE_ITERATOR_TYPE),i=[],s;for(;(s=n.iterateNext())&&(i.push(s),!(r&&i.length===r)););for(let h=0;h<i.length;h++)s=i[h],yield s,delete i[h]};var ue=/[-\\w\\P{ASCII}*]/u,H=(r=>(r.Descendent=">>>",r.Child=">>>>",r))(H||{}),V=t=>"querySelectorAll"in t,M=class{#e;#r=[];#o=void 0;elements;constructor(e,r){this.elements=[e],this.#e=r,this.#t()}async run(){if(typeof this.#o=="string")switch(this.#o.trimStart()){case":scope":this.#t();break}for(;this.#o!==void 0;this.#t()){let e=this.#o;typeof e=="string"?e[0]&&ue.test(e[0])?this.elements=a.flatMap(this.elements,async function*(r){V(r)&&(yield*r.querySelectorAll(e))}):this.elements=a.flatMap(this.elements,async function*(r){if(!r.parentElement){if(!V(r))return;yield*r.querySelectorAll(e);return}let o=0;for(let n of r.parentElement.children)if(++o,n===r)break;yield*r.parentElement.querySelectorAll(\`:scope>:nth-child(\${o})\${e}\`)}):this.elements=a.flatMap(this.elements,async function*(r){switch(e.name){case"text":yield*m(r,e.value);break;case"xpath":yield*q(r,e.value);break;case"aria":yield*b(r,e.value);break;default:let o=P.get(e.name);if(!o)throw new Error(\`Unknown selector type: \${e.name}\`);yield*o.querySelectorAll(r,e.value)}})}}#t(){if(this.#r.length!==0){this.#o=this.#r.shift();return}if(this.#e.length===0){this.#o=void 0;return}let e=this.#e.shift();switch(e){case">>>>":{this.elements=a.flatMap(this.elements,T),this.#t();break}case">>>":{this.elements=a.flatMap(this.elements,O),this.#t();break}default:this.#r=e,this.#t();break}}},D=class{#e=new WeakMap;calculate(e,r=[]){if(e===null)return r;e instanceof ShadowRoot&&(e=e.host);let o=this.#e.get(e);if(o)return[...o,...r];let n=0;for(let s=e.previousSibling;s;s=s.previousSibling)++n;let i=this.calculate(e.parentNode,[n]);return this.#e.set(e,i),[...i,...r]}},U=(t,e)=>{if(t.length+e.length===0)return 0;let[r=-1,...o]=t,[n=-1,...i]=e;return r===n?U(o,i):r<n?-1:1},de=async function*(t){let e=new Set;for await(let o of t)e.add(o);let r=new D;yield*[...e.values()].map(o=>[o,r.calculate(o)]).sort(([,o],[,n])=>U(o,n)).map(([o])=>o)},$=function(t,e){let r=JSON.parse(e);if(r.some(o=>{let n=0;return o.some(i=>(typeof i=="string"?++n:n=0,n>1))}))throw new Error("Multiple deep combinators found in sequence.");return de(a.flatMap(r,o=>{let n=new M(t,o);return n.run(),n.elements}))},fe=async function(t,e){for await(let r of $(t,e))return r;return null};var me=Object.freeze({...x,...A,...R,..._,...C,...k,...Q,...E,Deferred:c,createFunction:F,createTextContent:d,IntervalPoller:S,isSuitableNodeForTextMatching:f,MutationPoller:y,RAFPoller:w}),he=me;\n\n      ${[...this.#C].map((e=>`(${e})(module.exports.default);`)).join("")}\n      return module.exports.default;\n    })()`
      }
    };
    const Cr = new class {
      #i = new Map;
      get(e) {
        const t = this.#i.get(e);
        return t ? t[1] : void 0
      }
      register(e, t) {
        bt(!this.#i.has(e), `Cannot register over existing handler: ${e}`), bt(/^[a-zA-Z]+$/.test(e), "Custom query handler names may only contain [a-zA-Z]"), bt(t.queryAll || t.queryOne, "At least one query method must be implemented.");
        const r = class extends vr {
            static querySelectorAll = ur(((e, t, r) => r.customQuerySelectors.get(PLACEHOLDER("name")).querySelectorAll(e, t)), {
              name: JSON.stringify(e)
            });
            static querySelector = ur(((e, t, r) => r.customQuerySelectors.get(PLACEHOLDER("name")).querySelector(e, t)), {
              name: JSON.stringify(e)
            })
          },
          i = ur((e => {
            e.customQuerySelectors.register(PLACEHOLDER("name"), {
              queryAll: PLACEHOLDER("queryAll"),
              queryOne: PLACEHOLDER("queryOne")
            })
          }), {
            name: JSON.stringify(e),
            queryAll: t.queryAll ? dr(t.queryAll) : String(void 0),
            queryOne: t.queryOne ? dr(t.queryOne) : String(void 0)
          }).toString();
        this.#i.set(e, [i, r]), Er.append(i)
      }
      unregister(e) {
        const t = this.#i.get(e);
        if (!t) throw new Error(`Cannot unregister unknown handler: ${e}`);
        Er.pop(t[0]), this.#i.delete(e)
      }
      names() {
        return [...this.#i.keys()]
      }
      clear() {
        for (const [e] of this.#i) Er.pop(e);
        this.#i.clear()
      }
    };
    class xr extends vr {
      static querySelectorAll = (e, t, {
        pQuerySelectorAll: r
      }) => r(e, t);
      static querySelector = (e, t, {
        pQuerySelector: r
      }) => r(e, t)
    }
    var Mr = {
        attribute: /\[\s*(?:(?<namespace>\*|[-\w\P{ASCII}]*)\|)?(?<name>[-\w\P{ASCII}]+)\s*(?:(?<operator>\W?=)\s*(?<value>.+?)\s*(\s(?<caseSensitive>[iIsS]))?\s*)?\]/gu,
        id: /#(?<name>[-\w\P{ASCII}]+)/gu,
        class: /\.(?<name>[-\w\P{ASCII}]+)/gu,
        comma: /\s*,\s*/g,
        combinator: /\s*[\s>+~]\s*/g,
        "pseudo-element": /::(?<name>[-\w\P{ASCII}]+)(?:\((?<argument>¶*)\))?/gu,
        "pseudo-class": /:(?<name>[-\w\P{ASCII}]+)(?:\((?<argument>¶*)\))?/gu,
        universal: /(?:(?<namespace>\*|[-\w\P{ASCII}]*)\|)?\*/gu,
        type: /(?:(?<namespace>\*|[-\w\P{ASCII}]*)\|)?(?<name>[-\w\P{ASCII}]+)/gu
      },
      _r = new Set(["combinator", "comma"]),
      Ir = e => {
        switch (e) {
        case "pseudo-element":
        case "pseudo-class":
          return new RegExp(Mr[e].source.replace("(?<argument>¶*)", "(?<argument>.*)"), "gu");
        default:
          return Mr[e]
        }
      };

    function Pr(e, t) {
      let r = 0,
        i = "";
      for (; t < e.length; t++) {
        const n = e[t];
        switch (n) {
        case "(":
          ++r;
          break;
        case ")":
          --r
        }
        if (i += n, 0 === r) return i
      }
      return i
    }
    var Ar = /(['"])([^\\\n]+?)\1/g,
      Fr = /\\./g;

    function Or(e, t = Mr) {
      if ("" === (e = e.trim())) return [];
      const r = [];
      e = (e = e.replace(Fr, ((e, t) => (r.push({
        value: e,
        offset: t
      }), "".repeat(e.length))))).replace(Ar, ((e, t, i, n) => (r.push({
        value: e,
        offset: n
      }), `${t}${"".repeat(i.length)}${t}`)));
      {
        let t, i = 0;
        for (;
          (t = e.indexOf("(", i)) > -1;) {
          const n = Pr(e, t);
          r.push({
            value: n,
            offset: t
          }), e = `${e.substring(0,t)}(${"¶".repeat(n.length-2)})${e.substring(t+n.length)}`, i = t + n.length
        }
      }
      const i = function (e, t = Mr) {
          if (!e) return [];
          const r = [e];
          for (const [e, i] of Object.entries(t))
            for (let t = 0; t < r.length; t++) {
              const n = r[t];
              if ("string" != typeof n) continue;
              i.lastIndex = 0;
              const s = i.exec(n);
              if (!s) continue;
              const a = s.index - 1,
                o = [],
                c = s[0],
                l = n.slice(0, a + 1);
              l && o.push(l), o.push({
                ...s.groups,
                type: e,
                content: c
              });
              const d = n.slice(a + c.length + 1);
              d && o.push(d), r.splice(t, 1, ...o)
            }
          let i = 0;
          for (const e of r) switch (typeof e) {
          case "string":
            throw new Error(`Unexpected sequence ${e} found at index ${i}`);
          case "object":
            i += e.content.length, e.pos = [i - e.content.length, i], _r.has(e.type) && (e.content = e.content.trim() || " ")
          }
          return r
        }(e, t),
        n = new Set;
      for (const e of r.reverse())
        for (const t of i) {
          const {
            offset: r,
            value: i
          } = e;
          if (!(t.pos[0] <= r && r + i.length <= t.pos[1])) continue;
          const {
            content: s
          } = t, a = r - t.pos[0];
          t.content = s.slice(0, a) + i + s.slice(a + i.length), t.content !== s && n.add(t)
        }
      for (const e of n) {
        const t = Ir(e.type);
        if (!t) throw new Error(`Unknown token type: ${e.type}`);
        t.lastIndex = 0;
        const r = t.exec(e.content);
        if (!r) throw new Error(`Unable to parse content for ${e.type}: ${e.content}`);
        Object.assign(e, r.groups)
      }
      return i
    }

    function Rr(e) {
      if (Array.isArray(e)) return e.map((e => e.content)).join("");
      switch (e.type) {
      case "list":
        return e.list.map(Rr).join(",");
      case "relative":
        return e.combinator + Rr(e.right);
      case "complex":
        return Rr(e.left) + e.combinator + Rr(e.right);
      case "compound":
        return e.list.map(Rr).join("");
      default:
        return e.content
      }
    }
    Mr.nesting = /&/g, Mr.combinator = /\s*(>>>>?|[\s>+~])\s*/g;
    const Lr = /\\[\s\S]/g;
    const Dr = {
        aria: Sr,
        pierce: class extends vr {
          static querySelector = (e, t, {
            pierceQuerySelector: r
          }) => r(e, t);
          static querySelectorAll = (e, t, {
            pierceQuerySelectorAll: r
          }) => r(e, t)
        },
        xpath: class extends vr {
          static querySelectorAll = (e, t, {
            xpathQuerySelectorAll: r
          }) => r(e, t);
          static querySelector = (e, t, {
            xpathQuerySelectorAll: r
          }) => {
            for (const i of r(e, t, 1)) return i;
            return null
          }
        },
        text: class extends vr {
          static querySelectorAll = (e, t, {
            textQuerySelectorAll: r
          }) => r(e, t)
        }
      },
      Nr = ["=", "/"];

    function Br(e) {
      for (const t of [Cr.names().map((e => [e, Cr.get(e)])), Object.entries(Dr)])
        for (const [r, i] of t)
          for (const t of Nr) {
            const n = `${r}${t}`;
            if (e.startsWith(n)) return {
              updatedSelector: e = e.slice(n.length),
              polling: "aria" === r ? "raf" : "mutation",
              QueryHandler: i
            }
          }
      try {
        const [t, r, i, n] = function (e) {
          let t = !0,
            r = !1,
            i = !1;
          const n = Or(e);
          if (0 === n.length) return [
            [], t, i, !1
          ];
          let s = [],
            a = [s];
          const o = [a],
            c = [];
          for (const e of n) {
            switch (e.type) {
            case "combinator":
              switch (e.content) {
              case ">>>":
                t = !1, c.length && (s.push(Rr(c)), c.splice(0)), s = [], a.push(">>>"), a.push(s);
                continue;
              case ">>>>":
                t = !1, c.length && (s.push(Rr(c)), c.splice(0)), s = [], a.push(">>>>"), a.push(s);
                continue
              }
              break;
            case "pseudo-element":
              if (!e.name.startsWith("-p-")) break;
              t = !1, c.length && (s.push(Rr(c)), c.splice(0));
              const n = e.name.slice(3);
              "aria" === n && (r = !0), s.push({
                name: n,
                value: (l = e.argument ?? "", l.length <= 1 ? l : ('"' !== l[0] && "'" !== l[0] || !l.endsWith(l[0]) || (l = l.slice(1, -1)), l.replace(Lr, (e => e[1]))))
              });
              continue;
            case "pseudo-class":
              i = !0;
              break;
            case "comma":
              c.length && (s.push(Rr(c)), c.splice(0)), s = [], a = [s], o.push(a);
              continue
            }
            c.push(e)
          }
          var l;
          return c.length && s.push(Rr(c)), [o, t, i, r]
        }(e);
        return r ? {
          updatedSelector: e,
          polling: i ? "raf" : "mutation",
          QueryHandler: Tr
        } : {
          updatedSelector: JSON.stringify(t),
          polling: n ? "raf" : "mutation",
          QueryHandler: xr
        }
      } catch {
        return {
          updatedSelector: e,
          polling: "mutation",
          QueryHandler: Tr
        }
      }
    }
    var Kr = function (e, t, r) {
        if (null != t) {
          if ("object" != typeof t && "function" != typeof t) throw new TypeError("Object expected.");
          var i, n;
          if (r) {
            if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
            i = t[Symbol.asyncDispose]
          }
          if (void 0 === i) {
            if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
            i = t[Symbol.dispose], r && (n = i)
          }
          if ("function" != typeof i) throw new TypeError("Object not disposable.");
          n && (i = function () {
            try {
              n.call(this)
            } catch (e) {
              return Promise.reject(e)
            }
          }), e.stack.push({
            value: t,
            dispose: i,
            async: r
          })
        } else r && e.stack.push({
          async: !0
        });
        return t
      },
      Hr = function (e) {
        return function (t) {
          function r(r) {
            t.error = t.hasError ? new e(r, t.error, "An error was suppressed during disposal.") : r, t.hasError = !0
          }
          var i, n = 0;
          return function e() {
            for (; i = t.stack.pop();) try {
              if (!i.async && 1 === n) return n = 0, t.stack.push(i), Promise.resolve().then(e);
              if (i.dispose) {
                var s = i.dispose.call(i.value);
                if (i.async) return n |= 2, Promise.resolve(s).then(e, (function (t) {
                  return r(t), e()
                }))
              } else n |= 1
            } catch (e) {
              r(e)
            }
            if (1 === n) return t.hasError ? Promise.reject(t.error) : Promise.resolve();
            if (t.hasError) throw t.error
          }()
        }
      }("function" == typeof SuppressedError ? SuppressedError : function (e, t, r) {
        var i = new Error(r);
        return i.name = "SuppressedError", i.error = e, i.suppressed = t, i
      });
    const qr = new WeakSet;

    function jr(e, t) {
      let r = !1;
      if (e.prototype[ut]) {
        const t = e.prototype[ut];
        e.prototype[ut] = function () {
          if (!qr.has(this)) return t.call(this);
          qr.delete(this)
        }, r = !0
      }
      if (e.prototype[ht]) {
        const t = e.prototype[ht];
        e.prototype[ht] = function () {
          if (!qr.has(this)) return t.call(this);
          qr.delete(this)
        }, r = !0
      }
      return r && (e.prototype.move = function () {
        return qr.add(this), this
      }), e
    }

    function Ur(e = e => `Attempted to use disposed ${e.constructor.name}.`) {
      return (t, r) => function (...r) {
        if (this.disposed) throw new Error(e(this));
        return t.call(this, ...r)
      }
    }

    function $r(e, t) {
      const r = new WeakMap;
      let i = -1;
      return function (...t) {
        if (-1 === i && (i = t.length), i !== t.length) throw new Error("Memoized method was called with the wrong number of arguments");
        let n = !1,
          s = r;
        for (const e of t) s.has(e) || (n = !0, s.set(e, new WeakMap)), s = s.get(e);
        if (n) return e.call(this, ...t)
      }
    }

    function Wr(e = function () {
      return this
    }) {
      return (t, r) => {
        const i = new WeakMap;
        return async function (...r) {
          const n = {
            stack: [],
            error: void 0,
            hasError: !1
          };
          try {
            const s = e.call(this);
            let a = i.get(s);
            a || (a = new tr, i.set(s, a));
            Kr(n, await a.acquire(), !0);
            return await t.call(this, ...r)
          } catch (e) {
            n.error = e, n.hasError = !0
          } finally {
            const e = Hr(n);
            e && await e
          }
        }
      }
    }
    new WeakMap;
    var Gr = function (e, t, r) {
        for (var i = arguments.length > 2, n = 0; n < t.length; n++) r = i ? t[n].call(e, r) : t[n].call(e);
        return i ? r : void 0
      },
      zr = function (e, t, r, i, n, s) {
        function a(e) {
          if (void 0 !== e && "function" != typeof e) throw new TypeError("Function expected");
          return e
        }
        for (var o, c = i.kind, l = "getter" === c ? "get" : "setter" === c ? "set" : "value", d = !t && e ? i.static ? e : e.prototype : null, u = t || (d ? Object.getOwnPropertyDescriptor(d, i.name) : {}), h = !1, p = r.length - 1; p >= 0; p--) {
          var m = {};
          for (var f in i) m[f] = "access" === f ? {} : i[f];
          for (var f in i.access) m.access[f] = i.access[f];
          m.addInitializer = function (e) {
            if (h) throw new TypeError("Cannot add initializers after decoration has completed");
            s.push(a(e || null))
          };
          var g = (0, r[p])("accessor" === c ? {
            get: u.get,
            set: u.set
          } : u[l], m);
          if ("accessor" === c) {
            if (void 0 === g) continue;
            if (null === g || "object" != typeof g) throw new TypeError("Object expected");
            (o = a(g.get)) && (u.get = o), (o = a(g.set)) && (u.set = o), (o = a(g.init)) && n.unshift(o)
          } else(o = a(g)) && ("field" === c ? n.unshift(o) : u[l] = o)
        }
        d && Object.defineProperty(d, i.name, u), h = !0
      },
      Vr = function (e, t, r) {
        if (null != t) {
          if ("object" != typeof t && "function" != typeof t) throw new TypeError("Object expected.");
          var i, n;
          if (r) {
            if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
            i = t[Symbol.asyncDispose]
          }
          if (void 0 === i) {
            if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
            i = t[Symbol.dispose], r && (n = i)
          }
          if ("function" != typeof i) throw new TypeError("Object not disposable.");
          n && (i = function () {
            try {
              n.call(this)
            } catch (e) {
              return Promise.reject(e)
            }
          }), e.stack.push({
            value: t,
            dispose: i,
            async: r
          })
        } else r && e.stack.push({
          async: !0
        });
        return t
      },
      Xr = function (e) {
        return function (t) {
          function r(r) {
            t.error = t.hasError ? new e(r, t.error, "An error was suppressed during disposal.") : r, t.hasError = !0
          }
          var i, n = 0;
          return function e() {
            for (; i = t.stack.pop();) try {
              if (!i.async && 1 === n) return n = 0, t.stack.push(i), Promise.resolve().then(e);
              if (i.dispose) {
                var s = i.dispose.call(i.value);
                if (i.async) return n |= 2, Promise.resolve(s).then(e, (function (t) {
                  return r(t), e()
                }))
              } else n |= 1
            } catch (e) {
              r(e)
            }
            if (1 === n) return t.hasError ? Promise.reject(t.error) : Promise.resolve();
            if (t.hasError) throw t.error
          }()
        }
      }("function" == typeof SuppressedError ? SuppressedError : function (e, t, r) {
        var i = new Error(r);
        return i.name = "SuppressedError", i.error = e, i.suppressed = t, i
      });
    let Jr = (() => {
      let e, t, r, i, n = [jr],
        s = [],
        a = [];
      (class {
        static {
          t = this
        }
        static {
          const o = "function" == typeof Symbol && Symbol.metadata ? Object.create(null) : void 0;
          zr(this, null, r, {
            kind: "method",
            name: "getProperty",
            static: !1,
            private: !1,
            access: {
              has: e => "getProperty" in e,
              get: e => e.getProperty
            },
            metadata: o
          }, null, a), zr(this, null, i, {
            kind: "method",
            name: "getProperties",
            static: !1,
            private: !1,
            access: {
              has: e => "getProperties" in e,
              get: e => e.getProperties
            },
            metadata: o
          }, null, a), zr(null, e = {
            value: t
          }, n, {
            kind: "class",
            name: t.name,
            metadata: o
          }, null, s), t = e.value, o && Object.defineProperty(t, Symbol.metadata, {
            enumerable: !0,
            configurable: !0,
            writable: !0,
            value: o
          }), Gr(t, s)
        }
        constructor() {
          Gr(this, a)
        }
        async evaluate(e, ...t) {
          return e = Bt(this.evaluate.name, e), await this.realm.evaluate(e, this, ...t)
        }
        async evaluateHandle(e, ...t) {
          return e = Bt(this.evaluateHandle.name, e), await this.realm.evaluateHandle(e, this, ...t)
        }
        async getProperty(e) {
          return await this.evaluateHandle(((e, t) => e[t]), e)
        }
        async getProperties() {
          const e = await this.evaluate((e => {
              const t = [],
                r = Object.getOwnPropertyDescriptors(e);
              for (const e in r) r[e]?.enumerable && t.push(e);
              return t
            })),
            t = new Map,
            r = await Promise.all(e.map((e => this.getProperty(e))));
          for (const [i, n] of Object.entries(e)) {
            const e = {
              stack: [],
              error: void 0,
              hasError: !1
            };
            try {
              const s = Vr(e, r[i], !1);
              s && t.set(n, s.move())
            } catch (t) {
              e.error = t, e.hasError = !0
            } finally {
              Xr(e)
            }
          }
          return t
        } [(r = [Ur()], i = [Ur()], ut)]() {
          this.dispose().catch(Rt)
        } [ht]() {
          return this.dispose()
        }
      });
      return t
    })();
    var Qr = function (e, t, r) {
        for (var i = arguments.length > 2, n = 0; n < t.length; n++) r = i ? t[n].call(e, r) : t[n].call(e);
        return i ? r : void 0
      },
      Yr = function (e, t, r, i, n, s) {
        function a(e) {
          if (void 0 !== e && "function" != typeof e) throw new TypeError("Function expected");
          return e
        }
        for (var o, c = i.kind, l = "getter" === c ? "get" : "setter" === c ? "set" : "value", d = !t && e ? i.static ? e : e.prototype : null, u = t || (d ? Object.getOwnPropertyDescriptor(d, i.name) : {}), h = !1, p = r.length - 1; p >= 0; p--) {
          var m = {};
          for (var f in i) m[f] = "access" === f ? {} : i[f];
          for (var f in i.access) m.access[f] = i.access[f];
          m.addInitializer = function (e) {
            if (h) throw new TypeError("Cannot add initializers after decoration has completed");
            s.push(a(e || null))
          };
          var g = (0, r[p])("accessor" === c ? {
            get: u.get,
            set: u.set
          } : u[l], m);
          if ("accessor" === c) {
            if (void 0 === g) continue;
            if (null === g || "object" != typeof g) throw new TypeError("Object expected");
            (o = a(g.get)) && (u.get = o), (o = a(g.set)) && (u.set = o), (o = a(g.init)) && n.unshift(o)
          } else(o = a(g)) && ("field" === c ? n.unshift(o) : u[l] = o)
        }
        d && Object.defineProperty(d, i.name, u), h = !0
      },
      Zr = function (e, t, r) {
        if (null != t) {
          if ("object" != typeof t && "function" != typeof t) throw new TypeError("Object expected.");
          var i, n;
          if (r) {
            if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
            i = t[Symbol.asyncDispose]
          }
          if (void 0 === i) {
            if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
            i = t[Symbol.dispose], r && (n = i)
          }
          if ("function" != typeof i) throw new TypeError("Object not disposable.");
          n && (i = function () {
            try {
              n.call(this)
            } catch (e) {
              return Promise.reject(e)
            }
          }), e.stack.push({
            value: t,
            dispose: i,
            async: r
          })
        } else r && e.stack.push({
          async: !0
        });
        return t
      },
      ei = function (e) {
        return function (t) {
          function r(r) {
            t.error = t.hasError ? new e(r, t.error, "An error was suppressed during disposal.") : r, t.hasError = !0
          }
          var i, n = 0;
          return function e() {
            for (; i = t.stack.pop();) try {
              if (!i.async && 1 === n) return n = 0, t.stack.push(i), Promise.resolve().then(e);
              if (i.dispose) {
                var s = i.dispose.call(i.value);
                if (i.async) return n |= 2, Promise.resolve(s).then(e, (function (t) {
                  return r(t), e()
                }))
              } else n |= 1
            } catch (e) {
              r(e)
            }
            if (1 === n) return t.hasError ? Promise.reject(t.error) : Promise.resolve();
            if (t.hasError) throw t.error
          }()
        }
      }("function" == typeof SuppressedError ? SuppressedError : function (e, t, r) {
        var i = new Error(r);
        return i.name = "SuppressedError", i.error = e, i.suppressed = t, i
      }),
      ti = function (e, t, r) {
        return "symbol" == typeof t && (t = t.description ? "[".concat(t.description, "]") : ""), Object.defineProperty(e, "name", {
          configurable: !0,
          value: r ? "".concat(r, " ", t) : t
        })
      };

    function ri(e, t) {
      return async function (...t) {
        if (this.realm === this.frame.isolatedRealm()) return await e.call(this, ...t);
        let r;
        this.isolatedHandle ? r = this.isolatedHandle : this.isolatedHandle = r = await this.frame.isolatedRealm().adoptHandle(this);
        const i = await e.call(r, ...t);
        return i === r ? this : i instanceof Jr ? await this.realm.transferHandle(i) : (Array.isArray(i) && await Promise.all(i.map((async (e, t, r) => {
          e instanceof Jr && (r[t] = await this.realm.transferHandle(e))
        }))), i instanceof Map && await Promise.all([...i.entries()].map((async ([e, t]) => {
          t instanceof Jr && i.set(e, await this.realm.transferHandle(t))
        }))), i)
      }
    }
    let ii = (() => {
      let e, t, r, i, n, s, a, o, c, l, d, u, h, p, m, f, g, y, w, v, b, k, S, T, E, C, x, M, _, I, P, A, F = Jr,
        O = [];
      return class R extends F {
        static {
          const R = "function" == typeof Symbol && Symbol.metadata ? Object.create(F[Symbol.metadata] ?? null) : void 0;
          e = [Ur(), ri], t = [Ur(), ri], r = [Ur(), ri], i = [Ur(), ri], n = [Ur()], s = [ri], o = [Ur(), ri], c = [Ur(), ri], l = [Ur(), ri], d = [Ur(), ri], u = [Ur(), ri], h = [Ur(), ri], p = [Ur(), ri], m = [Ur(), ri], f = [Ur(), ri], g = [Ur(), ri], y = [Ur(), ri], w = [Ur(), ri], v = [Ur(), ri], b = [Ur(), ri], k = [Ur(), ri], S = [Ur(), ri], T = [Ur(), ri], E = [Ur(), ri], C = [Ur(), ri], x = [Ur(), ri], M = [Ur(), ri], _ = [Ur(), ri], I = [Ur(), ri], P = [Ur(), ri], A = [Ur(), ri], Yr(this, null, e, {
            kind: "method",
            name: "getProperty",
            static: !1,
            private: !1,
            access: {
              has: e => "getProperty" in e,
              get: e => e.getProperty
            },
            metadata: R
          }, null, O), Yr(this, null, t, {
            kind: "method",
            name: "getProperties",
            static: !1,
            private: !1,
            access: {
              has: e => "getProperties" in e,
              get: e => e.getProperties
            },
            metadata: R
          }, null, O), Yr(this, null, r, {
            kind: "method",
            name: "jsonValue",
            static: !1,
            private: !1,
            access: {
              has: e => "jsonValue" in e,
              get: e => e.jsonValue
            },
            metadata: R
          }, null, O), Yr(this, null, i, {
            kind: "method",
            name: "$",
            static: !1,
            private: !1,
            access: {
              has: e => "$" in e,
              get: e => e.$
            },
            metadata: R
          }, null, O), Yr(this, null, n, {
            kind: "method",
            name: "$$",
            static: !1,
            private: !1,
            access: {
              has: e => "$$" in e,
              get: e => e.$$
            },
            metadata: R
          }, null, O), Yr(this, a = {
            value: ti((async function (e) {
              return await this.#M(e)
            }), "#$$")
          }, s, {
            kind: "method",
            name: "#$$",
            static: !1,
            private: !0,
            access: {
              has: e => #_ in e,
              get: e => e.#_
            },
            metadata: R
          }, null, O), Yr(this, null, o, {
            kind: "method",
            name: "waitForSelector",
            static: !1,
            private: !1,
            access: {
              has: e => "waitForSelector" in e,
              get: e => e.waitForSelector
            },
            metadata: R
          }, null, O), Yr(this, null, c, {
            kind: "method",
            name: "isVisible",
            static: !1,
            private: !1,
            access: {
              has: e => "isVisible" in e,
              get: e => e.isVisible
            },
            metadata: R
          }, null, O), Yr(this, null, l, {
            kind: "method",
            name: "isHidden",
            static: !1,
            private: !1,
            access: {
              has: e => "isHidden" in e,
              get: e => e.isHidden
            },
            metadata: R
          }, null, O), Yr(this, null, d, {
            kind: "method",
            name: "toElement",
            static: !1,
            private: !1,
            access: {
              has: e => "toElement" in e,
              get: e => e.toElement
            },
            metadata: R
          }, null, O), Yr(this, null, u, {
            kind: "method",
            name: "clickablePoint",
            static: !1,
            private: !1,
            access: {
              has: e => "clickablePoint" in e,
              get: e => e.clickablePoint
            },
            metadata: R
          }, null, O), Yr(this, null, h, {
            kind: "method",
            name: "hover",
            static: !1,
            private: !1,
            access: {
              has: e => "hover" in e,
              get: e => e.hover
            },
            metadata: R
          }, null, O), Yr(this, null, p, {
            kind: "method",
            name: "click",
            static: !1,
            private: !1,
            access: {
              has: e => "click" in e,
              get: e => e.click
            },
            metadata: R
          }, null, O), Yr(this, null, m, {
            kind: "method",
            name: "drag",
            static: !1,
            private: !1,
            access: {
              has: e => "drag" in e,
              get: e => e.drag
            },
            metadata: R
          }, null, O), Yr(this, null, f, {
            kind: "method",
            name: "dragEnter",
            static: !1,
            private: !1,
            access: {
              has: e => "dragEnter" in e,
              get: e => e.dragEnter
            },
            metadata: R
          }, null, O), Yr(this, null, g, {
            kind: "method",
            name: "dragOver",
            static: !1,
            private: !1,
            access: {
              has: e => "dragOver" in e,
              get: e => e.dragOver
            },
            metadata: R
          }, null, O), Yr(this, null, y, {
            kind: "method",
            name: "drop",
            static: !1,
            private: !1,
            access: {
              has: e => "drop" in e,
              get: e => e.drop
            },
            metadata: R
          }, null, O), Yr(this, null, w, {
            kind: "method",
            name: "dragAndDrop",
            static: !1,
            private: !1,
            access: {
              has: e => "dragAndDrop" in e,
              get: e => e.dragAndDrop
            },
            metadata: R
          }, null, O), Yr(this, null, v, {
            kind: "method",
            name: "select",
            static: !1,
            private: !1,
            access: {
              has: e => "select" in e,
              get: e => e.select
            },
            metadata: R
          }, null, O), Yr(this, null, b, {
            kind: "method",
            name: "tap",
            static: !1,
            private: !1,
            access: {
              has: e => "tap" in e,
              get: e => e.tap
            },
            metadata: R
          }, null, O), Yr(this, null, k, {
            kind: "method",
            name: "touchStart",
            static: !1,
            private: !1,
            access: {
              has: e => "touchStart" in e,
              get: e => e.touchStart
            },
            metadata: R
          }, null, O), Yr(this, null, S, {
            kind: "method",
            name: "touchMove",
            static: !1,
            private: !1,
            access: {
              has: e => "touchMove" in e,
              get: e => e.touchMove
            },
            metadata: R
          }, null, O), Yr(this, null, T, {
            kind: "method",
            name: "touchEnd",
            static: !1,
            private: !1,
            access: {
              has: e => "touchEnd" in e,
              get: e => e.touchEnd
            },
            metadata: R
          }, null, O), Yr(this, null, E, {
            kind: "method",
            name: "focus",
            static: !1,
            private: !1,
            access: {
              has: e => "focus" in e,
              get: e => e.focus
            },
            metadata: R
          }, null, O), Yr(this, null, C, {
            kind: "method",
            name: "type",
            static: !1,
            private: !1,
            access: {
              has: e => "type" in e,
              get: e => e.type
            },
            metadata: R
          }, null, O), Yr(this, null, x, {
            kind: "method",
            name: "press",
            static: !1,
            private: !1,
            access: {
              has: e => "press" in e,
              get: e => e.press
            },
            metadata: R
          }, null, O), Yr(this, null, M, {
            kind: "method",
            name: "boundingBox",
            static: !1,
            private: !1,
            access: {
              has: e => "boundingBox" in e,
              get: e => e.boundingBox
            },
            metadata: R
          }, null, O), Yr(this, null, _, {
            kind: "method",
            name: "boxModel",
            static: !1,
            private: !1,
            access: {
              has: e => "boxModel" in e,
              get: e => e.boxModel
            },
            metadata: R
          }, null, O), Yr(this, null, I, {
            kind: "method",
            name: "screenshot",
            static: !1,
            private: !1,
            access: {
              has: e => "screenshot" in e,
              get: e => e.screenshot
            },
            metadata: R
          }, null, O), Yr(this, null, P, {
            kind: "method",
            name: "isIntersectingViewport",
            static: !1,
            private: !1,
            access: {
              has: e => "isIntersectingViewport" in e,
              get: e => e.isIntersectingViewport
            },
            metadata: R
          }, null, O), Yr(this, null, A, {
            kind: "method",
            name: "scrollIntoView",
            static: !1,
            private: !1,
            access: {
              has: e => "scrollIntoView" in e,
              get: e => e.scrollIntoView
            },
            metadata: R
          }, null, O), R && Object.defineProperty(this, Symbol.metadata, {
            enumerable: !0,
            configurable: !0,
            writable: !0,
            value: R
          })
        }
        isolatedHandle = Qr(this, O);
        handle;
        constructor(e) {
          super(), this.handle = e, this[sr] = !0
        }
        get id() {
          return this.handle.id
        }
        get disposed() {
          return this.handle.disposed
        }
        async getProperty(e) {
          return await this.handle.getProperty(e)
        }
        async getProperties() {
          return await this.handle.getProperties()
        }
        async evaluate(e, ...t) {
          return e = Bt(this.evaluate.name, e), await this.handle.evaluate(e, ...t)
        }
        async evaluateHandle(e, ...t) {
          return e = Bt(this.evaluateHandle.name, e), await this.handle.evaluateHandle(e, ...t)
        }
        async jsonValue() {
          return await this.handle.jsonValue()
        }
        toString() {
          return this.handle.toString()
        }
        remoteObject() {
          return this.handle.remoteObject()
        }
        async dispose() {
          await Promise.all([this.handle.dispose(), this.isolatedHandle?.dispose()])
        }
        asElement() {
          return this
        }
        async $(e) {
          const {
            updatedSelector: t,
            QueryHandler: r
          } = Br(e);
          return await r.queryOne(this, t)
        }
        async $$(e, t) {
          return !1 === t?.isolate ? await this.#M(e) : await this.#_(e)
        }
        get #_() {
          return a.value
        }
        async #M(e) {
          const {
            updatedSelector: t,
            QueryHandler: r
          } = Br(e);
          return await br.collect(r.queryAll(this, t))
        }
        async $eval(e, t, ...r) {
          const i = {
            stack: [],
            error: void 0,
            hasError: !1
          };
          try {
            t = Bt(this.$eval.name, t);
            const n = Zr(i, await this.$(e), !1);
            if (!n) throw new Error(`Error: failed to find element matching selector "${e}"`);
            return await n.evaluate(t, ...r)
          } catch (e) {
            i.error = e, i.hasError = !0
          } finally {
            ei(i)
          }
        }
        async $$eval(e, t, ...r) {
          const i = {
            stack: [],
            error: void 0,
            hasError: !1
          };
          try {
            t = Bt(this.$$eval.name, t);
            const n = await this.$$(e),
              s = Zr(i, await this.evaluateHandle(((e, ...t) => t), ...n), !1),
              [a] = await Promise.all([s.evaluate(t, ...r), ...n.map((e => e.dispose()))]);
            return a
          } catch (e) {
            i.error = e, i.hasError = !0
          } finally {
            ei(i)
          }
        }
        async waitForSelector(e, t = {}) {
          const {
            updatedSelector: r,
            QueryHandler: i,
            polling: n
          } = Br(e);
          return await i.waitFor(this, r, {
            polling: n,
            ...t
          })
        }
        async #I(e) {
          return await this.evaluate((async (e, t, r) => Boolean(t.checkVisibility(e, r))), gr.create((e => e.puppeteerUtil)), e)
        }
        async isVisible() {
          return await this.#I(!0)
        }
        async isHidden() {
          return await this.#I(!1)
        }
        async toElement(e) {
          const t = await this.evaluate(((e, t) => e.nodeName === t.toUpperCase()), e);
          if (!t) throw new Error(`Element is not a(n) \`${e}\` element`);
          return this
        }
        async clickablePoint(e) {
          const t = await this.#P();
          if (!t) throw new Error("Node is either not clickable or not an Element");
          return void 0 !== e ? {
            x: t.x + e.x,
            y: t.y + e.y
          } : {
            x: t.x + t.width / 2,
            y: t.y + t.height / 2
          }
        }
        async hover() {
          await this.scrollIntoViewIfNeeded();
          const {
            x: e,
            y: t
          } = await this.clickablePoint();
          await this.frame.page().mouse.move(e, t)
        }
        async click(e = {}) {
          await this.scrollIntoViewIfNeeded();
          const {
            x: t,
            y: r
          } = await this.clickablePoint(e.offset);
          await this.frame.page().mouse.click(t, r, e)
        }
        async drag(e) {
          await this.scrollIntoViewIfNeeded();
          const t = this.frame.page();
          if (t.isDragInterceptionEnabled()) {
            const r = await this.clickablePoint();
            return e instanceof R && (e = await e.clickablePoint()), await t.mouse.drag(r, e)
          }
          try {
            t._isDragging || (t._isDragging = !0, await this.hover(), await t.mouse.down()), e instanceof R ? await e.hover() : await t.mouse.move(e.x, e.y)
          } catch (e) {
            throw t._isDragging = !1, e
          }
        }
        async dragEnter(e = {
          items: [],
          dragOperationsMask: 1
        }) {
          const t = this.frame.page();
          await this.scrollIntoViewIfNeeded();
          const r = await this.clickablePoint();
          await t.mouse.dragEnter(r, e)
        }
        async dragOver(e = {
          items: [],
          dragOperationsMask: 1
        }) {
          const t = this.frame.page();
          await this.scrollIntoViewIfNeeded();
          const r = await this.clickablePoint();
          await t.mouse.dragOver(r, e)
        }
        async drop(e = {
          items: [],
          dragOperationsMask: 1
        }) {
          const t = this.frame.page();
          if ("items" in e) {
            await this.scrollIntoViewIfNeeded();
            const r = await this.clickablePoint();
            await t.mouse.drop(r, e)
          } else await e.drag(this), t._isDragging = !1, await t.mouse.up()
        }
        async dragAndDrop(e, t) {
          const r = this.frame.page();
          bt(r.isDragInterceptionEnabled(), "Drag Interception is not enabled!"), await this.scrollIntoViewIfNeeded();
          const i = await this.clickablePoint(),
            n = await e.clickablePoint();
          await r.mouse.dragAndDrop(i, n, t)
        }
        async select(...e) {
          for (const t of e) bt(Kt(t), 'Values must be strings. Found value "' + t + '" of type "' + typeof t + '"');
          return await this.evaluate(((e, t) => {
            const r = new Set(t);
            if (!(e instanceof HTMLSelectElement)) throw new Error("Element is not a <select> element.");
            const i = new Set;
            if (e.multiple)
              for (const t of e.options) t.selected = r.has(t.value), t.selected && i.add(t.value);
            else {
              for (const t of e.options) t.selected = !1;
              for (const t of e.options)
                if (r.has(t.value)) {
                  t.selected = !0, i.add(t.value);
                  break
                }
            }
            return e.dispatchEvent(new Event("input", {
              bubbles: !0
            })), e.dispatchEvent(new Event("change", {
              bubbles: !0
            })), [...i.values()]
          }), e)
        }
        async tap() {
          await this.scrollIntoViewIfNeeded();
          const {
            x: e,
            y: t
          } = await this.clickablePoint();
          await this.frame.page().touchscreen.tap(e, t)
        }
        async touchStart() {
          await this.scrollIntoViewIfNeeded();
          const {
            x: e,
            y: t
          } = await this.clickablePoint();
          return await this.frame.page().touchscreen.touchStart(e, t)
        }
        async touchMove(e) {
          await this.scrollIntoViewIfNeeded();
          const {
            x: t,
            y: r
          } = await this.clickablePoint();
          if (e) return await e.move(t, r);
          await this.frame.page().touchscreen.touchMove(t, r)
        }
        async touchEnd() {
          await this.scrollIntoViewIfNeeded(), await this.frame.page().touchscreen.touchEnd()
        }
        async focus() {
          await this.evaluate((e => {
            if (!(e instanceof HTMLElement)) throw new Error("Cannot focus non-HTMLElement");
            return e.focus()
          }))
        }
        async type(e, t) {
          await this.focus(), await this.frame.page().keyboard.type(e, t)
        }
        async press(e, t) {
          await this.focus(), await this.frame.page().keyboard.press(e, t)
        }
        async #P() {
          const e = await this.evaluate((e => e instanceof Element ? [...e.getClientRects()].map((e => ({
            x: e.x,
            y: e.y,
            width: e.width,
            height: e.height
          }))) : null));
          if (!e?.length) return null;
          await this.#A(e);
          let t, r = this.frame;
          for (; t = r?.parentFrame();) {
            const i = {
              stack: [],
              error: void 0,
              hasError: !1
            };
            try {
              const n = Zr(i, await r.frameElement(), !1);
              if (!n) throw new Error("Unsupported frame type");
              const s = await n.evaluate((e => {
                if (0 === e.getClientRects().length) return null;
                const t = e.getBoundingClientRect(),
                  r = window.getComputedStyle(e);
                return {
                  left: t.left + parseInt(r.paddingLeft, 10) + parseInt(r.borderLeftWidth, 10),
                  top: t.top + parseInt(r.paddingTop, 10) + parseInt(r.borderTopWidth, 10)
                }
              }));
              if (!s) return null;
              for (const t of e) t.x += s.left, t.y += s.top;
              await n.#A(e), r = t
            } catch (e) {
              i.error = e, i.hasError = !0
            } finally {
              ei(i)
            }
          }
          const i = e.find((e => e.width >= 1 && e.height >= 1));
          return i ? {
            x: i.x,
            y: i.y,
            height: i.height,
            width: i.width
          } : null
        }
        async #A(e) {
          const {
            documentWidth: t,
            documentHeight: r
          } = await this.frame.isolatedRealm().evaluate((() => ({
            documentWidth: document.documentElement.clientWidth,
            documentHeight: document.documentElement.clientHeight
          })));
          for (const i of e) ni(i, t, r)
        }
        async boundingBox() {
          const e = await this.evaluate((e => {
            if (!(e instanceof Element)) return null;
            if (0 === e.getClientRects().length) return null;
            const t = e.getBoundingClientRect();
            return {
              x: t.x,
              y: t.y,
              width: t.width,
              height: t.height
            }
          }));
          if (!e) return null;
          const t = await this.#F();
          return t ? {
            x: e.x + t.x,
            y: e.y + t.y,
            height: e.height,
            width: e.width
          } : null
        }
        async boxModel() {
          const e = await this.evaluate((e => {
            if (!(e instanceof Element)) return null;
            if (0 === e.getClientRects().length) return null;
            const t = e.getBoundingClientRect(),
              r = window.getComputedStyle(e),
              i = {
                padding: {
                  left: parseInt(r.paddingLeft, 10),
                  top: parseInt(r.paddingTop, 10),
                  right: parseInt(r.paddingRight, 10),
                  bottom: parseInt(r.paddingBottom, 10)
                },
                margin: {
                  left: -parseInt(r.marginLeft, 10),
                  top: -parseInt(r.marginTop, 10),
                  right: -parseInt(r.marginRight, 10),
                  bottom: -parseInt(r.marginBottom, 10)
                },
                border: {
                  left: parseInt(r.borderLeft, 10),
                  top: parseInt(r.borderTop, 10),
                  right: parseInt(r.borderRight, 10),
                  bottom: parseInt(r.borderBottom, 10)
                }
              },
              n = [{
                x: t.left,
                y: t.top
              }, {
                x: t.left + t.width,
                y: t.top
              }, {
                x: t.left + t.width,
                y: t.top + t.height
              }, {
                x: t.left,
                y: t.top + t.height
              }],
              s = a(n, i.border);
            return {
              content: a(s, i.padding),
              padding: s,
              border: n,
              margin: a(n, i.margin),
              width: t.width,
              height: t.height
            };

            function a(e, t) {
              return [{
                x: e[0].x + t.left,
                y: e[0].y + t.top
              }, {
                x: e[1].x - t.right,
                y: e[1].y + t.top
              }, {
                x: e[2].x - t.right,
                y: e[2].y - t.bottom
              }, {
                x: e[3].x + t.left,
                y: e[3].y - t.bottom
              }]
            }
          }));
          if (!e) return null;
          const t = await this.#F();
          if (!t) return null;
          for (const r of ["content", "padding", "border", "margin"])
            for (const i of e[r]) i.x += t.x, i.y += t.y;
          return e
        }
        async #F() {
          const e = {
            x: 0,
            y: 0
          };
          let t, r = this.frame;
          for (; t = r?.parentFrame();) {
            const i = {
              stack: [],
              error: void 0,
              hasError: !1
            };
            try {
              const n = Zr(i, await r.frameElement(), !1);
              if (!n) throw new Error("Unsupported frame type");
              const s = await n.evaluate((e => {
                if (0 === e.getClientRects().length) return null;
                const t = e.getBoundingClientRect(),
                  r = window.getComputedStyle(e);
                return {
                  left: t.left + parseInt(r.paddingLeft, 10) + parseInt(r.borderLeftWidth, 10),
                  top: t.top + parseInt(r.paddingTop, 10) + parseInt(r.borderTopWidth, 10)
                }
              }));
              if (!s) return null;
              e.x += s.left, e.y += s.top, r = t
            } catch (e) {
              i.error = e, i.hasError = !0
            } finally {
              ei(i)
            }
          }
          return e
        }
        async screenshot(e = {}) {
          const {
            scrollIntoView: t = !0,
            clip: r
          } = e, i = this.frame.page();
          t && await this.scrollIntoViewIfNeeded();
          const n = await this.#O(),
            [s, a] = await this.evaluate((() => {
              if (!window.visualViewport) throw new Error("window.visualViewport is not supported.");
              return [window.visualViewport.pageLeft, window.visualViewport.pageTop]
            }));
          return n.x += s, n.y += a, r && (n.x += r.x, n.y += r.y, n.height = r.height, n.width = r.width), await i.screenshot({
            ...e,
            clip: n
          })
        }
        async #O() {
          const e = await this.boundingBox();
          return bt(e, "Node is either not visible or not an HTMLElement"), bt(0 !== e.width, "Node has 0 width."), bt(0 !== e.height, "Node has 0 height."), e
        }
        async assertConnectedElement() {
          const e = await this.evaluate((async e => e.isConnected ? e.nodeType !== Node.ELEMENT_NODE ? "Node is not of type HTMLElement" : void 0 : "Node is detached from document"));
          if (e) throw new Error(e)
        }
        async scrollIntoViewIfNeeded() {
          await this.isIntersectingViewport({
            threshold: 1
          }) || await this.scrollIntoView()
        }
        async isIntersectingViewport(e = {}) {
          const t = {
            stack: [],
            error: void 0,
            hasError: !1
          };
          try {
            await this.assertConnectedElement();
            const r = await this.#R(),
              i = Zr(t, r && await r.#L(), !1);
            return await (i ?? this).evaluate((async (e, t) => {
              const r = await new Promise((t => {
                const r = new IntersectionObserver((e => {
                  t(e[0].intersectionRatio), r.disconnect()
                }));
                r.observe(e)
              }));
              return 1 === t ? 1 === r : r > t
            }), e.threshold ?? 0)
          } catch (e) {
            t.error = e, t.hasError = !0
          } finally {
            ei(t)
          }
        }
        async scrollIntoView() {
          await this.assertConnectedElement(), await this.evaluate((async e => {
            e.scrollIntoView({
              block: "center",
              inline: "center",
              behavior: "instant"
            })
          }))
        }
        async #R() {
          return await this.evaluate((e => e instanceof SVGElement)) ? this : null
        }
        async #L() {
          return await this.evaluateHandle((e => e instanceof SVGSVGElement ? e : e.ownerSVGElement))
        }
      }
    })();

    function ni(e, t, r) {
      e.width = Math.max(e.x >= 0 ? Math.min(t - e.x, e.width) : Math.min(t, e.width + e.x), 0), e.height = Math.max(e.y >= 0 ? Math.min(r - e.y, e.height) : Math.min(r, e.height + e.y), 0)
    }
    var si, ai = function (e, t, r) {
        if (null != t) {
          if ("object" != typeof t && "function" != typeof t) throw new TypeError("Object expected.");
          var i, n;
          if (r) {
            if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
            i = t[Symbol.asyncDispose]
          }
          if (void 0 === i) {
            if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
            i = t[Symbol.dispose], r && (n = i)
          }
          if ("function" != typeof i) throw new TypeError("Object not disposable.");
          n && (i = function () {
            try {
              n.call(this)
            } catch (e) {
              return Promise.reject(e)
            }
          }), e.stack.push({
            value: t,
            dispose: i,
            async: r
          })
        } else r && e.stack.push({
          async: !0
        });
        return t
      },
      oi = function (e) {
        return function (t) {
          function r(r) {
            t.error = t.hasError ? new e(r, t.error, "An error was suppressed during disposal.") : r, t.hasError = !0
          }
          var i, n = 0;
          return function e() {
            for (; i = t.stack.pop();) try {
              if (!i.async && 1 === n) return n = 0, t.stack.push(i), Promise.resolve().then(e);
              if (i.dispose) {
                var s = i.dispose.call(i.value);
                if (i.async) return n |= 2, Promise.resolve(s).then(e, (function (t) {
                  return r(t), e()
                }))
              } else n |= 1
            } catch (e) {
              r(e)
            }
            if (1 === n) return t.hasError ? Promise.reject(t.error) : Promise.resolve();
            if (t.hasError) throw t.error
          }()
        }
      }("function" == typeof SuppressedError ? SuppressedError : function (e, t, r) {
        var i = new Error(r);
        return i.name = "SuppressedError", i.error = e, i.suppressed = t, i
      });
    ! function (e) {
      e.Action = "action"
    }(si || (si = {}));
    class ci extends ft {
      static race(e) {
        return mi.create(e)
      }
      visibility = null;
      _timeout = 3e4;
      #D = !0;
      #N = !0;
      #B = !0;
      operators = {
        conditions: (e, t) => Ke((r => Xe(...e.map((e => e(r, t)))).pipe(rt(r)))),
        retryAndRaceWithSignalAndTimer: (e, t) => {
          const r = [];
          return e && r.push(Jt(e, t)), r.push(Ut(this._timeout, t)),
            function () {
              for (var e = [], t = 0; t < arguments.length; t++) e[t] = arguments[t];
              return V(e)
            }(lt({
              delay: fi
            }), ct(...r))
        }
      };
      get timeout() {
        return this._timeout
      }
      setTimeout(e) {
        const t = this._clone();
        return t._timeout = e, t
      }
      setVisibility(e) {
        const t = this._clone();
        return t.visibility = e, t
      }
      setWaitForEnabled(e) {
        const t = this._clone();
        return t.#N = e, t
      }
      setEnsureElementIsInTheViewport(e) {
        const t = this._clone();
        return t.#D = e, t
      }
      setWaitForStableBoundingBox(e) {
        const t = this._clone();
        return t.#B = e, t
      }
      copyOptions(e) {
        return this._timeout = e._timeout, this.visibility = e.visibility, this.#N = e.#N, this.#D = e.#D, this.#B = e.#B, this
      }
      #K = (e, t) => this.#N ? Ae(e.frame.waitForFunction((e => {
        if (!(e instanceof HTMLElement)) return !0;
        return !["BUTTON", "INPUT", "SELECT", "TEXTAREA", "OPTION", "OPTGROUP"].includes(e.nodeName) || !e.hasAttribute("disabled")
      }), {
        timeout: this._timeout,
        signal: t
      }, e)).pipe(nt()) : ue;
      #H = e => this.#B ? je((() => Ae(e.evaluate((e => new Promise((t => {
        window.requestAnimationFrame((() => {
          const r = e.getBoundingClientRect();
          window.requestAnimationFrame((() => {
            const i = e.getBoundingClientRect();
            t([{
              x: r.x,
              y: r.y,
              width: r.width,
              height: r.height
            }, {
              x: i.x,
              y: i.y,
              width: i.width,
              height: i.height
            }])
          }))
        }))
      }))))))).pipe(ot((([e, t]) => e.x === t.x && e.y === t.y && e.width === t.width && e.height === t.height)), lt({
        delay: fi
      }), nt()) : ue;
      #q = e => this.#D ? Ae(e.isIntersectingViewport({
        threshold: 0
      })).pipe(Ze((e => !e)), Ke((() => Ae(e.scrollIntoView()))), Ke((() => je((() => Ae(e.isIntersectingViewport({
        threshold: 0
      })))).pipe(ot(z), lt({
        delay: fi
      }), nt())))) : ue;
      #j(e) {
        const t = e?.signal,
          r = new Error("Locator.click");
        return this._wait(e).pipe(this.operators.conditions([this.#q, this.#H, this.#K], t), dt((() => this.emit(si.Action, void 0))), Ke((t => Ae(t.click(e)).pipe(tt((e => {
          throw t.dispose().catch(Rt), e
        }))))), this.operators.retryAndRaceWithSignalAndTimer(t, r))
      }
      #U(e, t) {
        const r = t?.signal,
          i = new Error("Locator.fill");
        return this._wait(t).pipe(this.operators.conditions([this.#q, this.#H, this.#K], r), dt((() => this.emit(si.Action, void 0))), Ke((t => Ae(t.evaluate((e => e instanceof HTMLSelectElement ? "select" : e instanceof HTMLTextAreaElement ? "typeable-input" : e instanceof HTMLInputElement ? new Set(["textarea", "text", "url", "tel", "search", "password", "number", "email"]).has(e.type) ? "typeable-input" : "other-input" : e.isContentEditable ? "contenteditable" : "unknown"))).pipe(Ke((r => {
          switch (r) {
          case "select":
            return Ae(t.select(e).then(O));
          case "contenteditable":
          case "typeable-input":
            return Ae(t.evaluate(((e, t) => {
              const r = e.isContentEditable ? e.innerText : e.value;
              if (t.length <= r.length || !t.startsWith(e.value)) return e.isContentEditable ? e.innerText = "" : e.value = "", t;
              const i = e.isContentEditable ? e.innerText : e.value;
              return e.isContentEditable ? (e.innerText = "", e.innerText = i) : (e.value = "", e.value = i), t.substring(i.length)
            }), e)).pipe(Ke((e => Ae(t.type(e)))));
          case "other-input":
            return Ae(t.focus()).pipe(Ke((() => Ae(t.evaluate(((e, t) => {
              e.value = t, e.dispatchEvent(new Event("input", {
                bubbles: !0
              })), e.dispatchEvent(new Event("change", {
                bubbles: !0
              }))
            }), e)))));
          case "unknown":
            throw new Error("Element cannot be filled out.")
          }
        }))).pipe(tt((e => {
          throw t.dispose().catch(Rt), e
        }))))), this.operators.retryAndRaceWithSignalAndTimer(r, i))
      }
      #$(e) {
        const t = e?.signal,
          r = new Error("Locator.hover");
        return this._wait(e).pipe(this.operators.conditions([this.#q, this.#H], t), dt((() => this.emit(si.Action, void 0))), Ke((e => Ae(e.hover()).pipe(tt((t => {
          throw e.dispose().catch(Rt), t
        }))))), this.operators.retryAndRaceWithSignalAndTimer(t, r))
      }
      #W(e) {
        const t = e?.signal,
          r = new Error("Locator.scroll");
        return this._wait(e).pipe(this.operators.conditions([this.#q, this.#H], t), dt((() => this.emit(si.Action, void 0))), Ke((t => Ae(t.evaluate(((e, t, r) => {
          void 0 !== t && (e.scrollTop = t), void 0 !== r && (e.scrollLeft = r)
        }), e?.scrollTop, e?.scrollLeft)).pipe(tt((e => {
          throw t.dispose().catch(Rt), e
        }))))), this.operators.retryAndRaceWithSignalAndTimer(t, r))
      }
      clone() {
        return this._clone()
      }
      async waitHandle(e) {
        const t = new Error("Locator.waitHandle");
        return await Re(this._wait(e).pipe(this.operators.retryAndRaceWithSignalAndTimer(e?.signal, t)))
      }
      async wait(e) {
        const t = {
          stack: [],
          error: void 0,
          hasError: !1
        };
        try {
          const r = ai(t, await this.waitHandle(e), !1);
          return await r.jsonValue()
        } catch (e) {
          t.error = e, t.hasError = !0
        } finally {
          oi(t)
        }
      }
      map(e) {
        return new hi(this._clone(), (t => t.evaluateHandle(e)))
      }
      filter(e) {
        return new ui(this._clone(), (async (t, r) => (await t.frame.waitForFunction(e, {
          signal: r,
          timeout: this._timeout
        }, t), !0)))
      }
      filterHandle(e) {
        return new ui(this._clone(), e)
      }
      mapHandle(e) {
        return new hi(this._clone(), e)
      }
      click(e) {
        return Re(this.#j(e))
      }
      fill(e, t) {
        return Re(this.#U(e, t))
      }
      hover(e) {
        return Re(this.#$(e))
      }
      scroll(e) {
        return Re(this.#W(e))
      }
    }
    class li extends ci {
      static create(e, t) {
        return new li(e, t).setTimeout("getDefaultTimeout" in e ? e.getDefaultTimeout() : e.page().getDefaultTimeout())
      }
      #G;
      #z;
      constructor(e, t) {
        super(), this.#G = e, this.#z = t
      }
      _clone() {
        return new li(this.#G, this.#z)
      }
      _wait(e) {
        const t = e?.signal;
        return je((() => Ae(this.#G.waitForFunction(this.#z, {
          timeout: this.timeout,
          signal: t
        })))).pipe(st())
      }
    }
    class di extends ci {
      #V;
      constructor(e) {
        super(), this.#V = e, this.copyOptions(this.#V)
      }
      get delegate() {
        return this.#V
      }
      setTimeout(e) {
        const t = super.setTimeout(e);
        return t.#V = this.#V.setTimeout(e), t
      }
      setVisibility(e) {
        const t = super.setVisibility(e);
        return t.#V = t.#V.setVisibility(e), t
      }
      setWaitForEnabled(e) {
        const t = super.setWaitForEnabled(e);
        return t.#V = this.#V.setWaitForEnabled(e), t
      }
      setEnsureElementIsInTheViewport(e) {
        const t = super.setEnsureElementIsInTheViewport(e);
        return t.#V = this.#V.setEnsureElementIsInTheViewport(e), t
      }
      setWaitForStableBoundingBox(e) {
        const t = super.setWaitForStableBoundingBox(e);
        return t.#V = this.#V.setWaitForStableBoundingBox(e), t
      }
    }
    class ui extends di {
      #X;
      constructor(e, t) {
        super(e), this.#X = t
      }
      _clone() {
        return new ui(this.delegate.clone(), this.#X).copyOptions(this)
      }
      _wait(e) {
        return this.delegate._wait(e).pipe(Ke((t => Ae(Promise.resolve(this.#X(t, e?.signal))).pipe(Ze((e => e)), Le((() => t))))), st())
      }
    }
    class hi extends di {
      #J;
      constructor(e, t) {
        super(e), this.#J = t
      }
      _clone() {
        return new hi(this.delegate.clone(), this.#J).copyOptions(this)
      }
      _wait(e) {
        return this.delegate._wait(e).pipe(Ke((t => Ae(Promise.resolve(this.#J(t, e?.signal))))))
      }
    }
    class pi extends ci {
      static create(e, t) {
        return new pi(e, t).setTimeout("getDefaultTimeout" in e ? e.getDefaultTimeout() : e.page().getDefaultTimeout())
      }
      #G;
      #Q;
      constructor(e, t) {
        super(), this.#G = e, this.#Q = t
      }
      #Y = e => this.visibility ? (() => {
        switch (this.visibility) {
        case "hidden":
          return je((() => Ae(e.isHidden())));
        case "visible":
          return je((() => Ae(e.isVisible())))
        }
      })().pipe(ot(z), lt({
        delay: fi
      }), nt()) : ue;
      _clone() {
        return new pi(this.#G, this.#Q).copyOptions(this)
      }
      _wait(e) {
        const t = e?.signal;
        return je((() => Ae(this.#G.waitForSelector(this.#Q, {
          visible: !1,
          timeout: this._timeout,
          signal: t
        })))).pipe(Ze((e => null !== e)), st(), this.operators.conditions([this.#Y], t))
      }
    }
    class mi extends ci {
      static create(e) {
        const t = function (e) {
          for (const t of e)
            if (!(t instanceof ci)) throw new Error("Unknown locator for race candidate");
          return e
        }(e);
        return new mi(t)
      }
      #Z;
      constructor(e) {
        super(), this.#Z = e
      }
      _clone() {
        return new mi(this.#Z.map((e => e.clone()))).copyOptions(this)
      }
      _wait(e) {
        return function () {
          for (var e = [], t = 0; t < arguments.length; t++) e[t] = arguments[t];
          return 1 === (e = Ye(e)).length ? Ee(e[0]) : new X(et(e))
        }(...this.#Z.map((t => t._wait(e))))
      }
    }
    const fi = 100;
    var gi, yi = function (e, t, r) {
        for (var i = arguments.length > 2, n = 0; n < t.length; n++) r = i ? t[n].call(e, r) : t[n].call(e);
        return i ? r : void 0
      },
      wi = function (e, t, r, i, n, s) {
        function a(e) {
          if (void 0 !== e && "function" != typeof e) throw new TypeError("Function expected");
          return e
        }
        for (var o, c = i.kind, l = "getter" === c ? "get" : "setter" === c ? "set" : "value", d = !t && e ? i.static ? e : e.prototype : null, u = t || (d ? Object.getOwnPropertyDescriptor(d, i.name) : {}), h = !1, p = r.length - 1; p >= 0; p--) {
          var m = {};
          for (var f in i) m[f] = "access" === f ? {} : i[f];
          for (var f in i.access) m.access[f] = i.access[f];
          m.addInitializer = function (e) {
            if (h) throw new TypeError("Cannot add initializers after decoration has completed");
            s.push(a(e || null))
          };
          var g = (0, r[p])("accessor" === c ? {
            get: u.get,
            set: u.set
          } : u[l], m);
          if ("accessor" === c) {
            if (void 0 === g) continue;
            if (null === g || "object" != typeof g) throw new TypeError("Object expected");
            (o = a(g.get)) && (u.get = o), (o = a(g.set)) && (u.set = o), (o = a(g.init)) && n.unshift(o)
          } else(o = a(g)) && ("field" === c ? n.unshift(o) : u[l] = o)
        }
        d && Object.defineProperty(d, i.name, u), h = !0
      },
      vi = function (e, t, r) {
        if (null != t) {
          if ("object" != typeof t && "function" != typeof t) throw new TypeError("Object expected.");
          var i, n;
          if (r) {
            if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
            i = t[Symbol.asyncDispose]
          }
          if (void 0 === i) {
            if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
            i = t[Symbol.dispose], r && (n = i)
          }
          if ("function" != typeof i) throw new TypeError("Object not disposable.");
          n && (i = function () {
            try {
              n.call(this)
            } catch (e) {
              return Promise.reject(e)
            }
          }), e.stack.push({
            value: t,
            dispose: i,
            async: r
          })
        } else r && e.stack.push({
          async: !0
        });
        return t
      },
      bi = function (e) {
        return function (t) {
          function r(r) {
            t.error = t.hasError ? new e(r, t.error, "An error was suppressed during disposal.") : r, t.hasError = !0
          }
          var i, n = 0;
          return function e() {
            for (; i = t.stack.pop();) try {
              if (!i.async && 1 === n) return n = 0, t.stack.push(i), Promise.resolve().then(e);
              if (i.dispose) {
                var s = i.dispose.call(i.value);
                if (i.async) return n |= 2, Promise.resolve(s).then(e, (function (t) {
                  return r(t), e()
                }))
              } else n |= 1
            } catch (e) {
              r(e)
            }
            if (1 === n) return t.hasError ? Promise.reject(t.error) : Promise.resolve();
            if (t.hasError) throw t.error
          }()
        }
      }("function" == typeof SuppressedError ? SuppressedError : function (e, t, r) {
        var i = new Error(r);
        return i.name = "SuppressedError", i.error = e, i.suppressed = t, i
      });
    ! function (e) {
      e.FrameNavigated = Symbol("Frame.FrameNavigated"), e.FrameSwapped = Symbol("Frame.FrameSwapped"), e.LifecycleEvent = Symbol("Frame.LifecycleEvent"), e.FrameNavigatedWithinDocument = Symbol("Frame.FrameNavigatedWithinDocument"), e.FrameDetached = Symbol("Frame.FrameDetached"), e.FrameSwappedByActivation = Symbol("Frame.FrameSwappedByActivation")
    }(gi || (gi = {}));
    const ki = Ur((e => `Attempted to use detached Frame '${e._id}'.`));
    let Si = (() => {
      let e, t, r, i, n, s, a, o, c, l, d, u, h, p, m, f, g, y, w, v, b = ft,
        k = [];
      return class extends b {
        static {
          const S = "function" == typeof Symbol && Symbol.metadata ? Object.create(b[Symbol.metadata] ?? null) : void 0;
          e = [ki], t = [ki], r = [ki], i = [ki], n = [ki], s = [ki], a = [ki], o = [ki], c = [ki], l = [ki], d = [ki], u = [ki], h = [ki], p = [ki], m = [ki], f = [ki], g = [ki], y = [ki], w = [ki], v = [ki], wi(this, null, e, {
            kind: "method",
            name: "frameElement",
            static: !1,
            private: !1,
            access: {
              has: e => "frameElement" in e,
              get: e => e.frameElement
            },
            metadata: S
          }, null, k), wi(this, null, t, {
            kind: "method",
            name: "evaluateHandle",
            static: !1,
            private: !1,
            access: {
              has: e => "evaluateHandle" in e,
              get: e => e.evaluateHandle
            },
            metadata: S
          }, null, k), wi(this, null, r, {
            kind: "method",
            name: "evaluate",
            static: !1,
            private: !1,
            access: {
              has: e => "evaluate" in e,
              get: e => e.evaluate
            },
            metadata: S
          }, null, k), wi(this, null, i, {
            kind: "method",
            name: "locator",
            static: !1,
            private: !1,
            access: {
              has: e => "locator" in e,
              get: e => e.locator
            },
            metadata: S
          }, null, k), wi(this, null, n, {
            kind: "method",
            name: "$",
            static: !1,
            private: !1,
            access: {
              has: e => "$" in e,
              get: e => e.$
            },
            metadata: S
          }, null, k), wi(this, null, s, {
            kind: "method",
            name: "$$",
            static: !1,
            private: !1,
            access: {
              has: e => "$$" in e,
              get: e => e.$$
            },
            metadata: S
          }, null, k), wi(this, null, a, {
            kind: "method",
            name: "$eval",
            static: !1,
            private: !1,
            access: {
              has: e => "$eval" in e,
              get: e => e.$eval
            },
            metadata: S
          }, null, k), wi(this, null, o, {
            kind: "method",
            name: "$$eval",
            static: !1,
            private: !1,
            access: {
              has: e => "$$eval" in e,
              get: e => e.$$eval
            },
            metadata: S
          }, null, k), wi(this, null, c, {
            kind: "method",
            name: "waitForSelector",
            static: !1,
            private: !1,
            access: {
              has: e => "waitForSelector" in e,
              get: e => e.waitForSelector
            },
            metadata: S
          }, null, k), wi(this, null, l, {
            kind: "method",
            name: "waitForFunction",
            static: !1,
            private: !1,
            access: {
              has: e => "waitForFunction" in e,
              get: e => e.waitForFunction
            },
            metadata: S
          }, null, k), wi(this, null, d, {
            kind: "method",
            name: "content",
            static: !1,
            private: !1,
            access: {
              has: e => "content" in e,
              get: e => e.content
            },
            metadata: S
          }, null, k), wi(this, null, u, {
            kind: "method",
            name: "addScriptTag",
            static: !1,
            private: !1,
            access: {
              has: e => "addScriptTag" in e,
              get: e => e.addScriptTag
            },
            metadata: S
          }, null, k), wi(this, null, h, {
            kind: "method",
            name: "addStyleTag",
            static: !1,
            private: !1,
            access: {
              has: e => "addStyleTag" in e,
              get: e => e.addStyleTag
            },
            metadata: S
          }, null, k), wi(this, null, p, {
            kind: "method",
            name: "click",
            static: !1,
            private: !1,
            access: {
              has: e => "click" in e,
              get: e => e.click
            },
            metadata: S
          }, null, k), wi(this, null, m, {
            kind: "method",
            name: "focus",
            static: !1,
            private: !1,
            access: {
              has: e => "focus" in e,
              get: e => e.focus
            },
            metadata: S
          }, null, k), wi(this, null, f, {
            kind: "method",
            name: "hover",
            static: !1,
            private: !1,
            access: {
              has: e => "hover" in e,
              get: e => e.hover
            },
            metadata: S
          }, null, k), wi(this, null, g, {
            kind: "method",
            name: "select",
            static: !1,
            private: !1,
            access: {
              has: e => "select" in e,
              get: e => e.select
            },
            metadata: S
          }, null, k), wi(this, null, y, {
            kind: "method",
            name: "tap",
            static: !1,
            private: !1,
            access: {
              has: e => "tap" in e,
              get: e => e.tap
            },
            metadata: S
          }, null, k), wi(this, null, w, {
            kind: "method",
            name: "type",
            static: !1,
            private: !1,
            access: {
              has: e => "type" in e,
              get: e => e.type
            },
            metadata: S
          }, null, k), wi(this, null, v, {
            kind: "method",
            name: "title",
            static: !1,
            private: !1,
            access: {
              has: e => "title" in e,
              get: e => e.title
            },
            metadata: S
          }, null, k), S && Object.defineProperty(this, Symbol.metadata, {
            enumerable: !0,
            configurable: !0,
            writable: !0,
            value: S
          })
        }
        _id = yi(this, k);
        _parentId;
        _name;
        _hasStartedLoading = !1;
        constructor() {
          super()
        }
        #ee;
        #te() {
          return this.#ee || (this.#ee = this.mainRealm().evaluateHandle((() => document))), this.#ee
        }
        clearDocumentHandle() {
          this.#ee = void 0
        }
        async frameElement() {
          const e = {
            stack: [],
            error: void 0,
            hasError: !1
          };
          try {
            const t = this.parentFrame();
            if (!t) return null;
            const r = vi(e, await t.isolatedRealm().evaluateHandle((() => document.querySelectorAll("iframe,frame"))), !1);
            for await (const e of fr(r)) {
              const r = {
                stack: [],
                error: void 0,
                hasError: !1
              };
              try {
                const i = vi(r, e, !1),
                  n = await i.contentFrame();
                if (n?._id === this._id) return await t.mainRealm().adoptHandle(i)
              } catch (e) {
                r.error = e, r.hasError = !0
              } finally {
                bi(r)
              }
            }
            return null
          } catch (t) {
            e.error = t, e.hasError = !0
          } finally {
            bi(e)
          }
        }
        async evaluateHandle(e, ...t) {
          return e = Bt(this.evaluateHandle.name, e), await this.mainRealm().evaluateHandle(e, ...t)
        }
        async evaluate(e, ...t) {
          return e = Bt(this.evaluate.name, e), await this.mainRealm().evaluate(e, ...t)
        }
        locator(e) {
          return "string" == typeof e ? pi.create(this, e) : li.create(this, e)
        }
        async $(e) {
          const t = await this.#te();
          return await t.$(e)
        }
        async $$(e, t) {
          const r = await this.#te();
          return await r.$$(e, t)
        }
        async $eval(e, t, ...r) {
          t = Bt(this.$eval.name, t);
          const i = await this.#te();
          return await i.$eval(e, t, ...r)
        }
        async $$eval(e, t, ...r) {
          t = Bt(this.$$eval.name, t);
          const i = await this.#te();
          return await i.$$eval(e, t, ...r)
        }
        async waitForSelector(e, t = {}) {
          const {
            updatedSelector: r,
            QueryHandler: i,
            polling: n
          } = Br(e);
          return await i.waitFor(this, r, {
            polling: n,
            ...t
          })
        }
        async waitForFunction(e, t = {}, ...r) {
          return await this.mainRealm().waitForFunction(e, t, ...r)
        }
        async content() {
          return await this.evaluate((() => {
            let e = "";
            for (const t of document.childNodes)
              if (t === document.documentElement) e += document.documentElement.outerHTML;
              else e += (new XMLSerializer).serializeToString(t);
            return e
          }))
        }
        async setFrameContent(e) {
          return await this.evaluate((e => {
            document.open(), document.write(e), document.close()
          }), e)
        }
        name() {
          return this._name || ""
        }
        isDetached() {
          return this.detached
        }
        get disposed() {
          return this.detached
        }
        async addScriptTag(e) {
          let {
            content: t = "",
            type: r
          } = e;
          const {
            path: i
          } = e;
          if (+!!e.url + +!!i + +!!t != 1) throw new Error("Exactly one of `url`, `path`, or `content` must be specified.");
          return i && (t = await wt.value.fs.promises.readFile(i, "utf8"), t += `//# sourceURL=${i.replace(/\n/g,"")}`), r = r ?? "text/javascript", await this.mainRealm().transferHandle(await this.isolatedRealm().evaluateHandle((async ({
            url: e,
            id: t,
            type: r,
            content: i
          }) => await new Promise(((n, s) => {
            const a = document.createElement("script");
            a.type = r, a.text = i, a.addEventListener("error", (e => {
              s(new Error(e.message ?? "Could not load script"))
            }), {
              once: !0
            }), t && (a.id = t), e ? (a.src = e, a.addEventListener("load", (() => {
              n(a)
            }), {
              once: !0
            }), document.head.appendChild(a)) : (document.head.appendChild(a), n(a))
          }))), {
            ...e,
            type: r,
            content: t
          }))
        }
        async addStyleTag(e) {
          let {
            content: t = ""
          } = e;
          const {
            path: r
          } = e;
          if (+!!e.url + +!!r + +!!t != 1) throw new Error("Exactly one of `url`, `path`, or `content` must be specified.");
          return r && (t = await wt.value.fs.promises.readFile(r, "utf8"), t += "/*# sourceURL=" + r.replace(/\n/g, "") + "*/", e.content = t), await this.mainRealm().transferHandle(await this.isolatedRealm().evaluateHandle((async ({
            url: e,
            content: t
          }) => await new Promise(((r, i) => {
            let n;
            if (e) {
              const t = document.createElement("link");
              t.rel = "stylesheet", t.href = e, n = t
            } else n = document.createElement("style"), n.appendChild(document.createTextNode(t));
            return n.addEventListener("load", (() => {
              r(n)
            }), {
              once: !0
            }), n.addEventListener("error", (e => {
              i(new Error(e.message ?? "Could not load style"))
            }), {
              once: !0
            }), document.head.appendChild(n), n
          }))), e))
        }
        async click(e, t = {}) {
          const r = {
            stack: [],
            error: void 0,
            hasError: !1
          };
          try {
            const i = vi(r, await this.$(e), !1);
            bt(i, `No element found for selector: ${e}`), await i.click(t), await i.dispose()
          } catch (e) {
            r.error = e, r.hasError = !0
          } finally {
            bi(r)
          }
        }
        async focus(e) {
          const t = {
            stack: [],
            error: void 0,
            hasError: !1
          };
          try {
            const r = vi(t, await this.$(e), !1);
            bt(r, `No element found for selector: ${e}`), await r.focus()
          } catch (e) {
            t.error = e, t.hasError = !0
          } finally {
            bi(t)
          }
        }
        async hover(e) {
          const t = {
            stack: [],
            error: void 0,
            hasError: !1
          };
          try {
            const r = vi(t, await this.$(e), !1);
            bt(r, `No element found for selector: ${e}`), await r.hover()
          } catch (e) {
            t.error = e, t.hasError = !0
          } finally {
            bi(t)
          }
        }
        async select(e, ...t) {
          const r = {
            stack: [],
            error: void 0,
            hasError: !1
          };
          try {
            const i = vi(r, await this.$(e), !1);
            return bt(i, `No element found for selector: ${e}`), await i.select(...t)
          } catch (e) {
            r.error = e, r.hasError = !0
          } finally {
            bi(r)
          }
        }
        async tap(e) {
          const t = {
            stack: [],
            error: void 0,
            hasError: !1
          };
          try {
            const r = vi(t, await this.$(e), !1);
            bt(r, `No element found for selector: ${e}`), await r.tap()
          } catch (e) {
            t.error = e, t.hasError = !0
          } finally {
            bi(t)
          }
        }
        async type(e, t, r) {
          const i = {
            stack: [],
            error: void 0,
            hasError: !1
          };
          try {
            const n = vi(i, await this.$(e), !1);
            bt(n, `No element found for selector: ${e}`), await n.type(t, r)
          } catch (e) {
            i.error = e, i.hasError = !0
          } finally {
            bi(i)
          }
        }
        async title() {
          return await this.isolatedRealm().evaluate((() => document.title))
        }
      }
    })();
    class Ti {
      _interceptionId;
      _failureText = null;
      _response = null;
      _fromMemoryCache = !1;
      _redirectChain = [];
      interception = {
        enabled: !1,
        handled: !1,
        handlers: [],
        resolutionState: {
          action: Ei.None
        },
        requestOverrides: {},
        response: null,
        abortReason: null
      };
      constructor() {}
      continueRequestOverrides() {
        return bt(this.interception.enabled, "Request Interception is not enabled!"), this.interception.requestOverrides
      }
      responseForRequest() {
        return bt(this.interception.enabled, "Request Interception is not enabled!"), this.interception.response
      }
      abortErrorReason() {
        return bt(this.interception.enabled, "Request Interception is not enabled!"), this.interception.abortReason
      }
      interceptResolutionState() {
        return this.interception.enabled ? this.interception.handled ? {
          action: Ei.AlreadyHandled
        } : {
          ...this.interception.resolutionState
        } : {
          action: Ei.Disabled
        }
      }
      isInterceptResolutionHandled() {
        return this.interception.handled
      }
      enqueueInterceptAction(e) {
        this.interception.handlers.push(e)
      }
      async finalizeInterceptions() {
        await this.interception.handlers.reduce(((e, t) => e.then(t)), Promise.resolve()), this.interception.handlers = [];
        const {
          action: e
        } = this.interceptResolutionState();
        switch (e) {
        case "abort":
          return await this._abort(this.interception.abortReason);
        case "respond":
          if (null === this.interception.response) throw new Error("Response is missing for the interception");
          return await this._respond(this.interception.response);
        case "continue":
          return await this._continue(this.interception.requestOverrides)
        }
      }
      #re() {
        return !this.url().startsWith("data:") && !this._fromMemoryCache
      }
      async continue (e = {}, t) {
        if (this.#re()) {
          if (bt(this.interception.enabled, "Request Interception is not enabled!"), bt(!this.interception.handled, "Request is already handled!"), void 0 === t) return await this._continue(e);
          if (this.interception.requestOverrides = e, void 0 === this.interception.resolutionState.priority || t > this.interception.resolutionState.priority) this.interception.resolutionState = {
            action: Ei.Continue,
            priority: t
          };
          else if (t === this.interception.resolutionState.priority) {
            if ("abort" === this.interception.resolutionState.action || "respond" === this.interception.resolutionState.action) return;
            this.interception.resolutionState.action = Ei.Continue
          }
        }
      }
      async respond(e, t) {
        if (this.#re()) {
          if (bt(this.interception.enabled, "Request Interception is not enabled!"), bt(!this.interception.handled, "Request is already handled!"), void 0 === t) return await this._respond(e);
          if (this.interception.response = e, void 0 === this.interception.resolutionState.priority || t > this.interception.resolutionState.priority) this.interception.resolutionState = {
            action: Ei.Respond,
            priority: t
          };
          else if (t === this.interception.resolutionState.priority) {
            if ("abort" === this.interception.resolutionState.action) return;
            this.interception.resolutionState.action = Ei.Respond
          }
        }
      }
      async abort(e = "failed", t) {
        if (!this.#re()) return;
        const r = Mi[e];
        if (bt(r, "Unknown error code: " + e), bt(this.interception.enabled, "Request Interception is not enabled!"), bt(!this.interception.handled, "Request is already handled!"), void 0 === t) return await this._abort(r);
        this.interception.abortReason = r, (void 0 === this.interception.resolutionState.priority || t >= this.interception.resolutionState.priority) && (this.interception.resolutionState = {
          action: Ei.Abort,
          priority: t
        })
      }
      static getResponse(e) {
        const t = Kt(e) ? (new TextEncoder).encode(e) : e;
        return {
          contentLength: t.byteLength,
          base64: St(t)
        }
      }
    }
    var Ei;

    function Ci(e) {
      const t = [];
      for (const r in e) {
        const i = e[r];
        if (!Object.is(i, void 0)) {
          const e = Array.isArray(i) ? i : [i];
          t.push(...e.map((e => ({
            name: r,
            value: e + ""
          }))))
        }
      }
      return t
    }! function (e) {
      e.Abort = "abort", e.Respond = "respond", e.Continue = "continue", e.Disabled = "disabled", e.None = "none", e.AlreadyHandled = "already-handled"
    }(Ei || (Ei = {}));
    const xi = {
        100: "Continue",
        101: "Switching Protocols",
        102: "Processing",
        103: "Early Hints",
        200: "OK",
        201: "Created",
        202: "Accepted",
        203: "Non-Authoritative Information",
        204: "No Content",
        205: "Reset Content",
        206: "Partial Content",
        207: "Multi-Status",
        208: "Already Reported",
        226: "IM Used",
        300: "Multiple Choices",
        301: "Moved Permanently",
        302: "Found",
        303: "See Other",
        304: "Not Modified",
        305: "Use Proxy",
        306: "Switch Proxy",
        307: "Temporary Redirect",
        308: "Permanent Redirect",
        400: "Bad Request",
        401: "Unauthorized",
        402: "Payment Required",
        403: "Forbidden",
        404: "Not Found",
        405: "Method Not Allowed",
        406: "Not Acceptable",
        407: "Proxy Authentication Required",
        408: "Request Timeout",
        409: "Conflict",
        410: "Gone",
        411: "Length Required",
        412: "Precondition Failed",
        413: "Payload Too Large",
        414: "URI Too Long",
        415: "Unsupported Media Type",
        416: "Range Not Satisfiable",
        417: "Expectation Failed",
        418: "I'm a teapot",
        421: "Misdirected Request",
        422: "Unprocessable Entity",
        423: "Locked",
        424: "Failed Dependency",
        425: "Too Early",
        426: "Upgrade Required",
        428: "Precondition Required",
        429: "Too Many Requests",
        431: "Request Header Fields Too Large",
        451: "Unavailable For Legal Reasons",
        500: "Internal Server Error",
        501: "Not Implemented",
        502: "Bad Gateway",
        503: "Service Unavailable",
        504: "Gateway Timeout",
        505: "HTTP Version Not Supported",
        506: "Variant Also Negotiates",
        507: "Insufficient Storage",
        508: "Loop Detected",
        510: "Not Extended",
        511: "Network Authentication Required"
      },
      Mi = {
        aborted: "Aborted",
        accessdenied: "AccessDenied",
        addressunreachable: "AddressUnreachable",
        blockedbyclient: "BlockedByClient",
        blockedbyresponse: "BlockedByResponse",
        connectionaborted: "ConnectionAborted",
        connectionclosed: "ConnectionClosed",
        connectionfailed: "ConnectionFailed",
        connectionrefused: "ConnectionRefused",
        connectionreset: "ConnectionReset",
        internetdisconnected: "InternetDisconnected",
        namenotresolved: "NameNotResolved",
        timedout: "TimedOut",
        failed: "Failed"
      };

    function _i(e) {
      if (e.originalMessage.includes("Invalid header") || e.originalMessage.includes("Unsafe header") || e.originalMessage.includes('Expected "header"') || e.originalMessage.includes("invalid argument")) throw e;
      Rt(e)
    }
    var Ii = a(287).hp;
    class Pi {
      constructor() {}
      ok() {
        const e = this.status();
        return 0 === e || e >= 200 && e <= 299
      }
      async buffer() {
        const e = await this.content();
        return Ii.from(e)
      }
      async text() {
        const e = await this.content();
        return (new TextDecoder).decode(e)
      }
      async json() {
        const e = await this.text();
        return JSON.parse(e)
      }
    }

    function Ai() {
      let e = 0;
      return () => ++e
    }
    class Fi {
      constructor() {}
    }
    const Oi = Object.freeze({
      Left: "left",
      Right: "right",
      Middle: "middle",
      Back: "back",
      Forward: "forward"
    });
    class Ri {
      constructor() {}
    }
    class Li {
      idGenerator = Ai();
      touches = [];
      constructor() {}
      removeHandle(e) {
        const t = this.touches.indexOf(e); - 1 !== t && this.touches.splice(t, 1)
      }
      async tap(e, t) {
        const r = await this.touchStart(e, t);
        await r.end()
      }
      async touchMove(e, t) {
        const r = this.touches[0];
        if (!r) throw new It("Must start a new Touch first");
        return await r.move(e, t)
      }
      async touchEnd() {
        const e = this.touches.shift();
        if (!e) throw new It("Must start a new Touch first");
        await e.end()
      }
    }
    class Di {
      #ie;
      #ne;
      constructor() {
        this.#ie = null, this.#ne = null
      }
      setDefaultTimeout(e) {
        this.#ie = e
      }
      setDefaultNavigationTimeout(e) {
        this.#ne = e
      }
      navigationTimeout() {
        return null !== this.#ne ? this.#ne : null !== this.#ie ? this.#ie : 3e4
      }
      timeout() {
        return null !== this.#ie ? this.#ie : 3e4
      }
    }
    var Ni = function (e, t, r) {
        for (var i = arguments.length > 2, n = 0; n < t.length; n++) r = i ? t[n].call(e, r) : t[n].call(e);
        return i ? r : void 0
      },
      Bi = function (e, t, r, i, n, s) {
        function a(e) {
          if (void 0 !== e && "function" != typeof e) throw new TypeError("Function expected");
          return e
        }
        for (var o, c = i.kind, l = "getter" === c ? "get" : "setter" === c ? "set" : "value", d = !t && e ? i.static ? e : e.prototype : null, u = t || (d ? Object.getOwnPropertyDescriptor(d, i.name) : {}), h = !1, p = r.length - 1; p >= 0; p--) {
          var m = {};
          for (var f in i) m[f] = "access" === f ? {} : i[f];
          for (var f in i.access) m.access[f] = i.access[f];
          m.addInitializer = function (e) {
            if (h) throw new TypeError("Cannot add initializers after decoration has completed");
            s.push(a(e || null))
          };
          var g = (0, r[p])("accessor" === c ? {
            get: u.get,
            set: u.set
          } : u[l], m);
          if ("accessor" === c) {
            if (void 0 === g) continue;
            if (null === g || "object" != typeof g) throw new TypeError("Object expected");
            (o = a(g.get)) && (u.get = o), (o = a(g.set)) && (u.set = o), (o = a(g.init)) && n.unshift(o)
          } else(o = a(g)) && ("field" === c ? n.unshift(o) : u[l] = o)
        }
        d && Object.defineProperty(d, i.name, u), h = !0
      },
      Ki = function (e, t, r) {
        if (null != t) {
          if ("object" != typeof t && "function" != typeof t) throw new TypeError("Object expected.");
          var i, n;
          if (r) {
            if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
            i = t[Symbol.asyncDispose]
          }
          if (void 0 === i) {
            if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
            i = t[Symbol.dispose], r && (n = i)
          }
          if ("function" != typeof i) throw new TypeError("Object not disposable.");
          n && (i = function () {
            try {
              n.call(this)
            } catch (e) {
              return Promise.reject(e)
            }
          }), e.stack.push({
            value: t,
            dispose: i,
            async: r
          })
        } else r && e.stack.push({
          async: !0
        });
        return t
      },
      Hi = function (e) {
        return function (t) {
          function r(r) {
            t.error = t.hasError ? new e(r, t.error, "An error was suppressed during disposal.") : r, t.hasError = !0
          }
          var i, n = 0;
          return function e() {
            for (; i = t.stack.pop();) try {
              if (!i.async && 1 === n) return n = 0, t.stack.push(i), Promise.resolve().then(e);
              if (i.dispose) {
                var s = i.dispose.call(i.value);
                if (i.async) return n |= 2, Promise.resolve(s).then(e, (function (t) {
                  return r(t), e()
                }))
              } else n |= 1
            } catch (e) {
              r(e)
            }
            if (1 === n) return t.hasError ? Promise.reject(t.error) : Promise.resolve();
            if (t.hasError) throw t.error
          }()
        }
      }("function" == typeof SuppressedError ? SuppressedError : function (e, t, r) {
        var i = new Error(r);
        return i.name = "SuppressedError", i.error = e, i.suppressed = t, i
      });
    let qi = (() => {
      let e, t = ft,
        r = [];
      return class extends t {
        static {
          const i = "function" == typeof Symbol && Symbol.metadata ? Object.create(t[Symbol.metadata] ?? null) : void 0;
          Bi(this, null, e, {
            kind: "method",
            name: "screenshot",
            static: !1,
            private: !1,
            access: {
              has: e => "screenshot" in e,
              get: e => e.screenshot
            },
            metadata: i
          }, null, r), i && Object.defineProperty(this, Symbol.metadata, {
            enumerable: !0,
            configurable: !0,
            writable: !0,
            value: i
          })
        }
        _isDragging = (Ni(this, r), !1);
        _timeoutSettings = new Di;
        #se = new WeakMap;
        #ae = new ne(1);
        constructor() {
          var e, t, r, i;
          super(), Xt(this, "request").pipe(Ke((e => qe(Fe(1), Xe(Xt(this, "requestfailed"), Xt(this, "requestfinished"), Xt(this, "response").pipe(Le((e => e.request())))).pipe(Ze((t => t.id === e.id)), it(1), Le((() => -1)))))), (t = (e, t) => Fe(e + t), r = 0, void 0 === i && (i = 1 / 0), Q((function (e, n) {
            var s = r;
            return Be(e, n, (function (e, r) {
              return t(s, e, r)
            }), i, (function (e) {
              s = e
            }), !1, void 0, (function () {
              return s = null
            }))
          }))), (e = Xt(this, "close"), Q((function (t, r) {
            Ee(e).subscribe(Y(r, (function () {
              return r.complete()
            }), O)), !r.closed && t.subscribe(r)
          }))), function () {
            for (var e = [], t = 0; t < arguments.length; t++) e[t] = arguments[t];
            var r = me(e);
            return Q((function (t, i) {
              (r ? qe(e, t, r) : qe(e, t)).subscribe(i)
            }))
          }(0)).subscribe(this.#ae)
        }
        on(e, t) {
          if ("request" !== e) return super.on(e, t);
          let r = this.#se.get(t);
          return void 0 === r && (r = e => {
            e.enqueueInterceptAction((() => t(e)))
          }, this.#se.set(t, r)), super.on(e, r)
        }
        off(e, t) {
          return "request" === e && (t = this.#se.get(t) || t), super.off(e, t)
        }
        get accessibility() {
          return this.mainFrame().accessibility
        }
        locator(e) {
          return "string" == typeof e ? pi.create(this, e) : li.create(this, e)
        }
        locatorRace(e) {
          return ci.race(e)
        }
        async $(e) {
          return await this.mainFrame().$(e)
        }
        async $$(e, t) {
          return await this.mainFrame().$$(e, t)
        }
        async evaluateHandle(e, ...t) {
          return e = Bt(this.evaluateHandle.name, e), await this.mainFrame().evaluateHandle(e, ...t)
        }
        async $eval(e, t, ...r) {
          return t = Bt(this.$eval.name, t), await this.mainFrame().$eval(e, t, ...r)
        }
        async $$eval(e, t, ...r) {
          return t = Bt(this.$$eval.name, t), await this.mainFrame().$$eval(e, t, ...r)
        }
        async addScriptTag(e) {
          return await this.mainFrame().addScriptTag(e)
        }
        async addStyleTag(e) {
          return await this.mainFrame().addStyleTag(e)
        }
        url() {
          return this.mainFrame().url()
        }
        async content() {
          return await this.mainFrame().content()
        }
        async setContent(e, t) {
          await this.mainFrame().setContent(e, t)
        }
        async goto(e, t) {
          return await this.mainFrame().goto(e, t)
        }
        async waitForNavigation(e = {}) {
          return await this.mainFrame().waitForNavigation(e)
        }
        waitForRequest(e, t = {}) {
          const {
            timeout: r = this._timeoutSettings.timeout(),
            signal: i
          } = t;
          if ("string" == typeof e) {
            const t = e;
            e = e => e.url() === t
          }
          return Re(Xt(this, "request").pipe(Qt(e), ct(Ut(r), Jt(i), Xt(this, "close").pipe(Le((() => {
            throw new Ft("Page closed!")
          }))))))
        }
        waitForResponse(e, t = {}) {
          const {
            timeout: r = this._timeoutSettings.timeout(),
            signal: i
          } = t;
          if ("string" == typeof e) {
            const t = e;
            e = e => e.url() === t
          }
          return Re(Xt(this, "response").pipe(Qt(e), ct(Ut(r), Jt(i), Xt(this, "close").pipe(Le((() => {
            throw new Ft("Page closed!")
          }))))))
        }
        waitForNetworkIdle(e = {}) {
          return Re(this.waitForNetworkIdle$(e))
        }
        waitForNetworkIdle$(e = {}) {
          const {
            timeout: t = this._timeoutSettings.timeout(),
            idleTime: r = Gt,
            concurrency: i = 0,
            signal: n
          } = e;
          return this.#ae.pipe((s = e => e > i ? ue : Ve(r), Q((function (e, t) {
            var r = null,
              i = 0,
              n = !1,
              o = function () {
                return n && !r && t.complete()
              };
            e.subscribe(Y(t, (function (e) {
              null == r || r.unsubscribe();
              var n = 0,
                c = i++;
              Ee(s(e, c)).subscribe(r = Y(t, (function (r) {
                return t.next(a ? a(e, r, c, n++) : r)
              }), (function () {
                r = null, o()
              })))
            }), (function () {
              n = !0, o()
            })))
          }))), Le((() => {})), ct(Ut(t), Jt(n), Xt(this, "close").pipe(Le((() => {
            throw new Ft("Page closed!")
          })))));
          var s, a
        }
        async waitForFrame(e, t = {}) {
          const {
            timeout: r = this.getDefaultTimeout(),
            signal: i
          } = t, n = Kt(e) ? t => e === t.url() : e;
          return await Re(Xe(Xt(this, "frameattached"), Xt(this, "framenavigated"), Ae(this.frames())).pipe(Qt(n), ot(), ct(Ut(r), Jt(i), Xt(this, "close").pipe(Le((() => {
            throw new Ft("Page closed.")
          }))))))
        }
        async emulate(e) {
          await Promise.all([this.setUserAgent(e.userAgent), this.setViewport(e.viewport)])
        }
        async evaluate(e, ...t) {
          return e = Bt(this.evaluate.name, e), await this.mainFrame().evaluate(e, ...t)
        }
        async _maybeWriteTypedArrayToFile(e, t) {
          e && await wt.value.fs.promises.writeFile(e, t)
        }
        async screencast(e = {}) {
          const t = wt.value.ScreenRecorder,
            [r, i, n] = await this.#oe();
          let s;
          if (e.crop) {
            const {
              x: t,
              y: a,
              width: o,
              height: c
            } = Ui(ji(e.crop));
            if (t < 0 || a < 0) throw new Error("`crop.x` and `crop.y` must be greater than or equal to 0.");
            if (o <= 0 || c <= 0) throw new Error("`crop.height` and `crop.width` must be greater than or equal to 0.");
            const l = r / n,
              d = i / n;
            if (t + o > l) throw new Error(`\`crop.width\` cannot be larger than the viewport width (${l}).`);
            if (a + c > d) throw new Error(`\`crop.height\` cannot be larger than the viewport height (${d}).`);
            s = {
              x: t * n,
              y: a * n,
              width: o * n,
              height: c * n
            }
          }
          if (void 0 !== e.speed && e.speed <= 0) throw new Error("`speed` must be greater than 0.");
          if (void 0 !== e.scale && e.scale <= 0) throw new Error("`scale` must be greater than 0.");
          const a = new t(this, r, i, {
            ...e,
            path: e.ffmpegPath,
            crop: s
          });
          try {
            await this._startScreencast()
          } catch (e) {
            throw a.stop(), e
          }
          if (e.path) {
            const {
              createWriteStream: t
            } = wt.value.fs, r = t(e.path, "binary");
            a.pipe(r)
          }
          return a
        }
        #ce = 0;
        #le;
        async _startScreencast() {
          ++this.#ce, this.#le || (this.#le = this.mainFrame().client.send("Page.startScreencast", {
            format: "png"
          }).then((() => new Promise((e => this.mainFrame().client.once("Page.screencastFrame", (() => e()))))))), await this.#le
        }
        async _stopScreencast() {
          --this.#ce, this.#le && (this.#le = void 0, 0 === this.#ce && await this.mainFrame().client.send("Page.stopScreencast"))
        }
        async #oe() {
          const e = {
            stack: [],
            error: void 0,
            hasError: !1
          };
          try {
            const t = this.viewport(),
              r = Ki(e, new pt, !1);
            return t && 0 !== t.deviceScaleFactor && (await this.setViewport({
              ...t,
              deviceScaleFactor: 0
            }), r.defer((() => {
              this.setViewport(t).catch(Rt)
            }))), await this.mainFrame().isolatedRealm().evaluate((() => [window.visualViewport.width * window.devicePixelRatio, window.visualViewport.height * window.devicePixelRatio, window.devicePixelRatio]))
          } catch (t) {
            e.error = t, e.hasError = !0
          } finally {
            Hi(e)
          }
        }
        async screenshot(e = {}) {
          const t = {
            stack: [],
            error: void 0,
            hasError: !1
          };
          try {
            Ki(t, await this.browserContext().startScreenshot(), !1);
            const r = {
              ...e,
              clip: e.clip ? {
                ...e.clip
              } : void 0
            };
            if (void 0 === r.type && void 0 !== r.path) {
              const e = r.path;
              switch (e.slice(e.lastIndexOf(".") + 1).toLowerCase()) {
              case "png":
                r.type = "png";
                break;
              case "jpeg":
              case "jpg":
                r.type = "jpeg";
                break;
              case "webp":
                r.type = "webp"
              }
            }
            if (void 0 !== r.quality) {
              if (r.quality < 0 || r.quality > 100) throw new Error(`Expected 'quality' (${r.quality}) to be between 0 and 100, inclusive.`);
              if (void 0 === r.type || !["jpeg", "webp"].includes(r.type)) throw new Error(`${r.type??"png"} screenshots do not support 'quality'.`)
            }
            if (r.clip) {
              if (r.clip.width <= 0) throw new Error("'width' in 'clip' must be positive.");
              if (r.clip.height <= 0) throw new Error("'height' in 'clip' must be positive.")
            }! function (e) {
              e.optimizeForSpeed ??= !1, e.type ??= "png", e.fromSurface ??= !0, e.fullPage ??= !1, e.omitBackground ??= !1, e.encoding ??= "binary", e.captureBeyondViewport ??= !0
            }(r);
            const i = Ki(t, new mt, !0);
            if (r.clip) {
              if (r.fullPage) throw new Error("'clip' and 'fullPage' are mutually exclusive");
              r.clip = Ui(ji(r.clip))
            } else if (r.fullPage) {
              if (!r.captureBeyondViewport) {
                const e = await this.mainFrame().isolatedRealm().evaluate((() => {
                    const e = document.documentElement;
                    return {
                      width: e.scrollWidth,
                      height: e.scrollHeight
                    }
                  })),
                  t = this.viewport();
                await this.setViewport({
                  ...t,
                  ...e
                }), i.defer((async () => {
                  await this.setViewport(t).catch(Rt)
                }))
              }
            } else r.captureBeyondViewport = !1;
            const n = await this._screenshot(r);
            if ("base64" === r.encoding) return n;
            const s = kt(n, !0);
            return await this._maybeWriteTypedArrayToFile(r.path, s), s
          } catch (e) {
            t.error = e, t.hasError = !0
          } finally {
            const e = Hi(t);
            e && await e
          }
        }
        async title() {
          return await this.mainFrame().title()
        }
        click(e, t) {
          return this.mainFrame().click(e, t)
        }
        focus(e) {
          return this.mainFrame().focus(e)
        }
        hover(e) {
          return this.mainFrame().hover(e)
        }
        select(e, ...t) {
          return this.mainFrame().select(e, ...t)
        }
        tap(e) {
          return this.mainFrame().tap(e)
        }
        type(e, t, r) {
          return this.mainFrame().type(e, t, r)
        }
        async waitForSelector(e, t = {}) {
          return await this.mainFrame().waitForSelector(e, t)
        }
        waitForFunction(e, t, ...r) {
          return this.mainFrame().waitForFunction(e, t, ...r)
        } [(e = [Wr((function () {
          return this.browser()
        }))], ut)]() {
          this.close().catch(Rt)
        } [ht]() {
          return this.close()
        }
      }
    })();
    new Set(["Timestamp", "Documents", "Frames", "JSEventListeners", "Nodes", "LayoutCount", "RecalcStyleCount", "LayoutDuration", "RecalcStyleDuration", "ScriptDuration", "TaskDuration", "JSHeapUsedSize", "JSHeapTotalSize"]);

    function ji(e) {
      return {
        ...e,
        ...e.width < 0 ? {
          x: e.x + e.width,
          width: -e.width
        } : {
          x: e.x,
          width: e.width
        },
        ...e.height < 0 ? {
          y: e.y + e.height,
          height: -e.height
        } : {
          y: e.y,
          height: e.height
        }
      }
    }

    function Ui(e) {
      const t = Math.round(e.x),
        r = Math.round(e.y),
        i = Math.round(e.width + e.x - t),
        n = Math.round(e.height + e.y - r);
      return {
        ...e,
        x: t,
        y: r,
        width: i,
        height: n
      }
    }
    class $i {
      #de;
      #ue;
      #he;
      #pe;
      #me;
      #fe;
      #m;
      #ge = er.create();
      #ye;
      #we;
      #ve = [];
      constructor(e, t, r, ...i) {
        if (this.#de = e, this.#ue = t.polling, this.#he = t.root, this.#we = t.signal, this.#we?.addEventListener("abort", this.#be, {
            once: !0
          }), "string" == typeof r) this.#pe = `() => {return (${r});}`;
        else this.#pe = dr(r);
        this.#me = i, this.#de.taskManager.add(this), t.timeout && (this.#m = new _t(`Waiting failed: ${t.timeout}ms exceeded`), this.#fe = setTimeout((() => {
          this.terminate(this.#m)
        }), t.timeout)), this.rerun()
      }
      get result() {
        return this.#ge.valueOrThrow()
      }
      async rerun() {
        for (const e of this.#ve) e.abort();
        this.#ve.length = 0;
        const e = new AbortController;
        this.#ve.push(e);
        try {
          switch (this.#ue) {
          case "raf":
            this.#ye = await this.#de.evaluateHandle((({
              RAFPoller: e,
              createFunction: t
            }, r, ...i) => {
              const n = t(r);
              return new e((() => n(...i)))
            }), gr.create((e => e.puppeteerUtil)), this.#pe, ...this.#me);
            break;
          case "mutation":
            this.#ye = await this.#de.evaluateHandle((({
              MutationPoller: e,
              createFunction: t
            }, r, i, ...n) => {
              const s = t(i);
              return new e((() => s(...n)), r || document)
            }), gr.create((e => e.puppeteerUtil)), this.#he, this.#pe, ...this.#me);
            break;
          default:
            this.#ye = await this.#de.evaluateHandle((({
              IntervalPoller: e,
              createFunction: t
            }, r, i, ...n) => {
              const s = t(i);
              return new e((() => s(...n)), r)
            }), gr.create((e => e.puppeteerUtil)), this.#ue, this.#pe, ...this.#me)
          }
          await this.#ye.evaluate((e => {
            e.start()
          }));
          const e = await this.#ye.evaluateHandle((e => e.result()));
          this.#ge.resolve(e), await this.terminate()
        } catch (t) {
          if (e.signal.aborted) return;
          const r = this.getBadError(t);
          r && await this.terminate(r)
        }
      }
      async terminate(e) {
        if (this.#de.taskManager.delete(this), this.#we?.removeEventListener("abort", this.#be), clearTimeout(this.#fe), e && !this.#ge.finished() && this.#ge.reject(e), this.#ye) try {
          await this.#ye.evaluate((async e => {
            await e.stop()
          })), this.#ye && (await this.#ye.dispose(), this.#ye = void 0)
        } catch {}
      }
      getBadError(e) {
        if (ar(e)) {
          if (e.message.includes("Execution context is not available in detached frame")) return new Error("Waiting failed: Frame detached");
          if (e.message.includes("Execution context was destroyed")) return;
          if (e.message.includes("Cannot find context with specified id")) return;
          if (e.message.includes("DiscardedBrowsingContextError")) return;
          return e
        }
        return new Error("WaitTask failed with an error", {
          cause: e
        })
      }
      #be = () => {
        this.terminate(this.#we?.reason)
      }
    }
    class Wi {
      #ke = new Set;
      add(e) {
        this.#ke.add(e)
      }
      delete(e) {
        this.#ke.delete(e)
      }
      terminateAll(e) {
        for (const t of this.#ke) t.terminate(e);
        this.#ke.clear()
      }
      async rerunAll() {
        await Promise.all([...this.#ke].map((e => e.rerun())))
      }
    }
    class Gi {
      timeoutSettings;
      taskManager = new Wi;
      constructor(e) {
        this.timeoutSettings = e
      }
      async waitForFunction(e, t = {}, ...r) {
        const {
          polling: i = "raf",
          timeout: n = this.timeoutSettings.timeout(),
          root: s,
          signal: a
        } = t;
        if ("number" == typeof i && i < 0) throw new Error("Cannot poll with non-positive interval");
        const o = new $i(this, {
          polling: i,
          root: s,
          timeout: n,
          signal: a
        }, e, ...r);
        return await o.result
      }
      get disposed() {
        return this.#e
      }
      #e = !1;
      dispose() {
        this.#e = !0, this.taskManager.terminateAll(new Error("waitForFunction failed: frame got detached."))
      } [ut]() {
        this.dispose()
      }
    }
    var zi;
    ! function (e) {
      e.PAGE = "page", e.BACKGROUND_PAGE = "background_page", e.SERVICE_WORKER = "service_worker", e.SHARED_WORKER = "shared_worker", e.BROWSER = "browser", e.WEBVIEW = "webview", e.OTHER = "other", e.TAB = "tab"
    }(zi || (zi = {}));
    class Vi {
      constructor() {}
      async worker() {
        return null
      }
      async page() {
        return null
      }
    }
    class Xi extends ft {
      timeoutSettings = new Di;
      #Se;
      constructor(e) {
        super(), this.#Se = e
      }
      url() {
        return this.#Se
      }
      async evaluate(e, ...t) {
        return e = Bt(this.evaluate.name, e), await this.mainRealm().evaluate(e, ...t)
      }
      async evaluateHandle(e, ...t) {
        return e = Bt(this.evaluateHandle.name, e), await this.mainRealm().evaluateHandle(e, ...t)
      }
      async close() {
        throw new At("WebWorker.close() is not supported")
      }
    }
    var Ji = function (e, t, r) {
        if (null != t) {
          if ("object" != typeof t && "function" != typeof t) throw new TypeError("Object expected.");
          var i, n;
          if (r) {
            if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
            i = t[Symbol.asyncDispose]
          }
          if (void 0 === i) {
            if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
            i = t[Symbol.dispose], r && (n = i)
          }
          if ("function" != typeof i) throw new TypeError("Object not disposable.");
          n && (i = function () {
            try {
              n.call(this)
            } catch (e) {
              return Promise.reject(e)
            }
          }), e.stack.push({
            value: t,
            dispose: i,
            async: r
          })
        } else r && e.stack.push({
          async: !0
        });
        return t
      },
      Qi = function (e) {
        return function (t) {
          function r(r) {
            t.error = t.hasError ? new e(r, t.error, "An error was suppressed during disposal.") : r, t.hasError = !0
          }
          var i, n = 0;
          return function e() {
            for (; i = t.stack.pop();) try {
              if (!i.async && 1 === n) return n = 0, t.stack.push(i), Promise.resolve().then(e);
              if (i.dispose) {
                var s = i.dispose.call(i.value);
                if (i.async) return n |= 2, Promise.resolve(s).then(e, (function (t) {
                  return r(t), e()
                }))
              } else n |= 1
            } catch (e) {
              r(e)
            }
            if (1 === n) return t.hasError ? Promise.reject(t.error) : Promise.resolve();
            if (t.hasError) throw t.error
          }()
        }
      }("function" == typeof SuppressedError ? SuppressedError : function (e, t, r) {
        var i = new Error(r);
        return i.name = "SuppressedError", i.error = e, i.suppressed = t, i
      });
    class Yi {
      #Te;
      #Ee;
      constructor(e, t = "") {
        this.#Te = e, this.#Ee = t
      }
      async snapshot(e = {}) {
        const {
          interestingOnly: t = !0,
          root: r = null,
          includeIframes: i = !1
        } = e, {
          nodes: n
        } = await this.#Te.environment.client.send("Accessibility.getFullAXTree", {
          frameId: this.#Ee
        });
        let s;
        if (r) {
          const {
            node: e
          } = await this.#Te.environment.client.send("DOM.describeNode", {
            objectId: r.id
          });
          s = e.backendNodeId
        }
        const a = Zi.createTree(this.#Te, n),
          o = async t => {
            if ("Iframe" === t.payload.role?.value) {
              const r = {
                stack: [],
                error: void 0,
                hasError: !1
              };
              try {
                if (!t.payload.backendDOMNodeId) return;
                const i = Ji(r, await this.#Te.adoptBackendNode(t.payload.backendDOMNodeId), !1);
                if (!i || !("contentFrame" in i)) return;
                const n = await i.contentFrame();
                if (!n) return;
                const s = await n.accessibility.snapshot(e);
                t.iframeSnapshot = s ?? void 0
              } catch (e) {
                r.error = e, r.hasError = !0
              } finally {
                Qi(r)
              }
            }
            for (const e of t.children) await o(e)
          };
        let c = a;
        if (!a) return null;
        if (i && await o(a), s && (c = a.find((e => e.payload.backendDOMNodeId === s))), !c) return null;
        if (!t) return this.serializeTree(c)[0] ?? null;
        const l = new Set;
        return this.collectInterestingNodes(l, a, !1), l.has(c) ? this.serializeTree(c, l)[0] ?? null : null
      }
      serializeTree(e, t) {
        const r = [];
        for (const i of e.children) r.push(...this.serializeTree(i, t));
        if (t && !t.has(e)) return r;
        const i = e.serialize();
        return r.length && (i.children = r), e.iframeSnapshot && (i.children || (i.children = []), i.children.push(e.iframeSnapshot)), [i]
      }
      collectInterestingNodes(e, t, r) {
        if ((t.isInteresting(r) || t.iframeSnapshot) && e.add(t), !t.isLeafNode()) {
          r = r || t.isControl();
          for (const i of t.children) this.collectInterestingNodes(e, i, r)
        }
      }
    }
    class Zi {
      payload;
      children = [];
      iframeSnapshot;
      #Ce = !1;
      #xe = !1;
      #Me = !1;
      #_e = !1;
      #Ie;
      #Pe;
      #Ae;
      #Fe;
      #Te;
      constructor(e, t) {
        this.payload = t, this.#Ie = this.payload.name ? this.payload.name.value : "", this.#Pe = this.payload.role ? this.payload.role.value : "Unknown", this.#Ae = this.payload.ignored, this.#Te = e;
        for (const e of this.payload.properties || []) "editable" === e.name && (this.#Ce = "richtext" === e.value.value, this.#xe = !0), "focusable" === e.name && (this.#Me = e.value.value), "hidden" === e.name && (this.#_e = e.value.value)
      }
      #Oe() {
        return !this.#Ce && (!!this.#xe || ("textbox" === this.#Pe || "searchbox" === this.#Pe))
      }
      #Re() {
        const e = this.#Pe;
        return "LineBreak" === e || "text" === e || "InlineTextBox" === e || "StaticText" === e
      }
      #Le() {
        if (void 0 === this.#Fe) {
          this.#Fe = !1;
          for (const e of this.children)
            if (e.#Me || e.#Le()) {
              this.#Fe = !0;
              break
            }
        }
        return this.#Fe
      }
      find(e) {
        if (e(this)) return this;
        for (const t of this.children) {
          const r = t.find(e);
          if (r) return r
        }
        return null
      }
      isLeafNode() {
        if (!this.children.length) return !0;
        if (this.#Oe() || this.#Re()) return !0;
        switch (this.#Pe) {
        case "doc-cover":
        case "graphics-symbol":
        case "img":
        case "image":
        case "Meter":
        case "scrollbar":
        case "slider":
        case "separator":
        case "progressbar":
          return !0
        }
        return !this.#Le() && (!(!this.#Me || !this.#Ie) || !("heading" !== this.#Pe || !this.#Ie))
      }
      isControl() {
        switch (this.#Pe) {
        case "button":
        case "checkbox":
        case "ColorWell":
        case "combobox":
        case "DisclosureTriangle":
        case "listbox":
        case "menu":
        case "menubar":
        case "menuitem":
        case "menuitemcheckbox":
        case "menuitemradio":
        case "radio":
        case "scrollbar":
        case "searchbox":
        case "slider":
        case "spinbutton":
        case "switch":
        case "tab":
        case "textbox":
        case "tree":
        case "treeitem":
          return !0;
        default:
          return !1
        }
      }
      isInteresting(e) {
        return "Ignored" !== this.#Pe && !this.#_e && !this.#Ae && (!(!this.#Me && !this.#Ce) || (!!this.isControl() || !e && (this.isLeafNode() && !!this.#Ie)))
      }
      serialize() {
        const e = new Map;
        for (const t of this.payload.properties || []) e.set(t.name.toLowerCase(), t.value.value);
        this.payload.name && e.set("name", this.payload.name.value), this.payload.value && e.set("value", this.payload.value.value), this.payload.description && e.set("description", this.payload.description.value);
        const t = {
            role: this.#Pe,
            elementHandle: async () => this.payload.backendDOMNodeId ? await this.#Te.adoptBackendNode(this.payload.backendDOMNodeId) : null
          },
          r = ["name", "value", "description", "keyshortcuts", "roledescription", "valuetext"];
        for (const n of r) e.has(n) && (t[n] = (i = n, e.get(i)));
        var i;
        const n = ["disabled", "expanded", "focused", "modal", "multiline", "multiselectable", "readonly", "required", "selected"],
          s = t => e.get(t);
        for (const e of n) {
          if ("focused" === e && "RootWebArea" === this.#Pe) continue;
          s(e) && (t[e] = s(e))
        }
        const a = ["checked", "pressed"];
        for (const r of a) {
          if (!e.has(r)) continue;
          const i = e.get(r);
          t[r] = "mixed" === i ? "mixed" : "true" === i
        }
        const o = ["level", "valuemax", "valuemin"],
          c = t => e.get(t);
        for (const r of o) e.has(r) && (t[r] = c(r));
        const l = ["autocomplete", "haspopup", "invalid", "orientation"],
          d = t => e.get(t);
        for (const e of l) {
          const r = d(e);
          r && "false" !== r && (t[e] = d(e))
        }
        return t
      }
      static createTree(e, t) {
        const r = new Map;
        for (const i of t) r.set(i.nodeId, new Zi(e, i));
        for (const e of r.values())
          for (const t of e.payload.childIds || []) {
            const i = r.get(t);
            i && e.children.push(i)
          }
        return r.values().next().value ?? null
      }
    }
    var en, tn = function (e, t, r) {
        if (null != t) {
          if ("object" != typeof t && "function" != typeof t) throw new TypeError("Object expected.");
          var i, n;
          if (r) {
            if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
            i = t[Symbol.asyncDispose]
          }
          if (void 0 === i) {
            if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
            i = t[Symbol.dispose], r && (n = i)
          }
          if ("function" != typeof i) throw new TypeError("Object not disposable.");
          n && (i = function () {
            try {
              n.call(this)
            } catch (e) {
              return Promise.reject(e)
            }
          }), e.stack.push({
            value: t,
            dispose: i,
            async: r
          })
        } else r && e.stack.push({
          async: !0
        });
        return t
      },
      rn = function (e) {
        return function (t) {
          function r(r) {
            t.error = t.hasError ? new e(r, t.error, "An error was suppressed during disposal.") : r, t.hasError = !0
          }
          var i, n = 0;
          return function e() {
            for (; i = t.stack.pop();) try {
              if (!i.async && 1 === n) return n = 0, t.stack.push(i), Promise.resolve().then(e);
              if (i.dispose) {
                var s = i.dispose.call(i.value);
                if (i.async) return n |= 2, Promise.resolve(s).then(e, (function (t) {
                  return r(t), e()
                }))
              } else n |= 1
            } catch (e) {
              r(e)
            }
            if (1 === n) return t.hasError ? Promise.reject(t.error) : Promise.resolve();
            if (t.hasError) throw t.error
          }()
        }
      }("function" == typeof SuppressedError ? SuppressedError : function (e, t, r) {
        var i = new Error(r);
        return i.name = "SuppressedError", i.error = e, i.suppressed = t, i
      });
    class nn {
      #Ie;
      #pe;
      #De;
      constructor(e, t, r) {
        this.#Ie = e, this.#pe = t, this.#De = r
      }
      get name() {
        return this.#Ie
      }
      get initSource() {
        return this.#De
      }
      async run(e, t, r, i) {
        const n = new pt;
        try {
          if (!i) {
            const i = {
              stack: [],
              error: void 0,
              hasError: !1
            };
            try {
              const s = tn(i, await e.evaluateHandle(((e, t) => globalThis[e].args.get(t)), this.#Ie, t), !1),
                a = await s.getProperties();
              for (const [e, t] of a)
                if (e in r)
                  if ("node" === t.remoteObject().subtype) r[+e] = t;
                  else n.use(t);
              else n.use(t)
            } catch (e) {
              i.error = e, i.hasError = !0
            } finally {
              rn(i)
            }
          }
          await e.evaluate(((e, t, r) => {
            const i = globalThis[e].callbacks;
            i.get(t).resolve(r), i.delete(t)
          }), this.#Ie, t, await this.#pe(...r));
          for (const e of r) e instanceof Jr && n.use(e)
        } catch (r) {
          ar(r) ? await e.evaluate(((e, t, r, i) => {
            const n = new Error(r);
            n.stack = i;
            const s = globalThis[e].callbacks;
            s.get(t).reject(n), s.delete(t)
          }), this.#Ie, t, r.message, r.stack).catch(Rt) : await e.evaluate(((e, t, r) => {
            const i = globalThis[e].callbacks;
            i.get(t).reject(r), i.delete(t)
          }), this.#Ie, t, r).catch(Rt)
        }
      }
    }
    class sn {
      #Ne;
      #Be;
      #me;
      #Ke;
      #He;
      constructor(e, t, r, i, n) {
        this.#Ne = e, this.#Be = t, this.#me = r, this.#Ke = i, this.#He = n
      }
      type() {
        return this.#Ne
      }
      text() {
        return this.#Be
      }
      args() {
        return this.#me
      }
      location() {
        return this.#Ke[0] ?? (this.#He ? {
          url: this.#He.url()
        } : {})
      }
      stackTrace() {
        return this.#Ke
      }
    }
    class an {
      #qe;
      #je;
      #Ue = !1;
      constructor(e, t) {
        this.#qe = e, this.#je = "selectSingle" !== t.mode
      }
      isMultiple() {
        return this.#je
      }
      async accept(e) {
        bt(!this.#Ue, "Cannot accept FileChooser which is already handled!"), this.#Ue = !0, await this.#qe.uploadFile(...e)
      }
      async cancel() {
        bt(!this.#Ue, "Cannot cancel FileChooser which is already handled!"), this.#Ue = !0, await this.#qe.evaluate((e => {
          e.dispatchEvent(new Event("cancel", {
            bubbles: !0
          }))
        }))
      }
    }! function (e) {
      e.Request = Symbol("NetworkManager.Request"), e.RequestServedFromCache = Symbol("NetworkManager.RequestServedFromCache"), e.Response = Symbol("NetworkManager.Response"), e.RequestFailed = Symbol("NetworkManager.RequestFailed"), e.RequestFinished = Symbol("NetworkManager.RequestFinished")
    }(en || (en = {}));
    class on {
      #$e = new Map;
      #We = Ai();
      create(e, t, r) {
        const i = new cn(this.#We(), e, t);
        this.#$e.set(i.id, i);
        try {
          r(i.id)
        } catch (e) {
          throw i.promise.catch(Rt).finally((() => {
            this.#$e.delete(i.id)
          })), i.reject(e), e
        }
        return i.promise.finally((() => {
          this.#$e.delete(i.id)
        }))
      }
      reject(e, t, r) {
        const i = this.#$e.get(e);
        i && this._reject(i, t, r)
      }
      rejectRaw(e, t) {
        const r = this.#$e.get(e);
        r && r.reject(t)
      }
      _reject(e, t, r) {
        let i, n;
        t instanceof Pt ? (i = t, i.cause = e.error, n = t.message) : (i = e.error, n = t), e.reject(or(i, `Protocol error (${e.label}): ${n}`, r))
      }
      resolve(e, t) {
        const r = this.#$e.get(e);
        r && r.resolve(t)
      }
      clear() {
        for (const e of this.#$e.values()) this._reject(e, new Ft("Target closed"));
        this.#$e.clear()
      }
      getPendingProtocolErrors() {
        const e = [];
        for (const t of this.#$e.values()) e.push(new Error(`${t.label} timed out. Trace: ${t.error.stack}`));
        return e
      }
    }
    class cn {
      #Ge;
      #ze = new Pt;
      #Ve = er.create();
      #Xe;
      #Je;
      constructor(e, t, r) {
        this.#Ge = e, this.#Je = t, r && (this.#Xe = setTimeout((() => {
          this.#Ve.reject(or(this.#ze, `${t} timed out. Increase the 'protocolTimeout' setting in launch/connect calls for a higher timeout if needed.`))
        }), r))
      }
      resolve(e) {
        clearTimeout(this.#Xe), this.#Ve.resolve(e)
      }
      reject(e) {
        clearTimeout(this.#Xe), this.#Ve.reject(e)
      }
      get id() {
        return this.#Ge
      }
      get promise() {
        return this.#Ve.valueOrThrow()
      }
      get error() {
        return this.#ze
      }
      get label() {
        return this.#Je
      }
    }
    class ln extends nr {
      #Qe;
      #Ye;
      #$e = new on;
      #Ze;
      #et;
      #tt;
      #rt = !1;
      #it = !1;
      constructor(e, t, r, i, n) {
        super(), this.#Ze = e, this.#Ye = t, this.#Qe = r, this.#et = i, this.#rt = n
      }
      setTarget(e) {
        this.#tt = e
      }
      target() {
        return bt(this.#tt, "Target must exist"), this.#tt
      }
      connection() {
        return this.#Ze
      }
      get detached() {
        return this.#Ze._closed || this.#it
      }
      parentSession() {
        if (!this.#et) return this;
        const e = this.#Ze?.session(this.#et);
        return e ?? void 0
      }
      send(e, t, r) {
        return this.detached ? Promise.reject(new Ft(`Protocol error (${e}): Session closed. Most likely the ${this.#Ye} has been closed.`)) : this.#Ze._rawSend(this.#$e, e, t, this.#Qe, r)
      }
      onMessage(e) {
        e.id ? e.error ? this.#rt ? this.#$e.rejectRaw(e.id, e.error) : this.#$e.reject(e.id, cr(e), e.error.message) : this.#$e.resolve(e.id, e.result) : (bt(!e.id), this.emit(e.method, e.params))
      }
      async detach() {
        if (this.detached) throw new Error(`Session already detached. Most likely the ${this.#Ye} has been closed.`);
        await this.#Ze.send("Target.detachFromTarget", {
          sessionId: this.#Qe
        }), this.#it = !0
      }
      onClosed() {
        this.#$e.clear(), this.#it = !0, this.emit(ir.Disconnected, void 0)
      }
      id() {
        return this.#Qe
      }
      getPendingProtocolErrors() {
        return this.#$e.getPendingProtocolErrors()
      }
    }
    const dn = Et("puppeteer:protocol:SEND ►"),
      un = Et("puppeteer:protocol:RECV ◀");
    class hn extends ft {
      #Se;
      #nt;
      #st;
      #fe;
      #at = new Map;
      #ot = !1;
      #ct = new Set;
      #$e;
      #rt = !1;
      constructor(e, t, r = 0, i, n = !1) {
        super(), this.#rt = n, this.#$e = new on, this.#Se = e, this.#st = r, this.#fe = i ?? 18e4, this.#nt = t, this.#nt.onmessage = this.onMessage.bind(this), this.#nt.onclose = this.#lt.bind(this)
      }
      static fromSession(e) {
        return e.connection()
      }
      get delay() {
        return this.#st
      }
      get timeout() {
        return this.#fe
      }
      get _closed() {
        return this.#ot
      }
      get _sessions() {
        return this.#at
      }
      _session(e) {
        return this.#at.get(e) || null
      }
      session(e) {
        return this._session(e)
      }
      url() {
        return this.#Se
      }
      send(e, t, r) {
        return this._rawSend(this.#$e, e, t, void 0, r)
      }
      _rawSend(e, t, r, i, n) {
        return this.#ot ? Promise.reject(new Error("Protocol error: Connection closed.")) : e.create(t, n?.timeout ?? this.#fe, (e => {
          const n = JSON.stringify({
            method: t,
            params: r,
            id: e,
            sessionId: i
          });
          dn(n), this.#nt.send(n)
        }))
      }
      async closeBrowser() {
        await this.send("Browser.close")
      }
      async onMessage(e) {
        this.#st && await new Promise((e => setTimeout(e, this.#st))), un(e);
        const t = JSON.parse(e);
        if ("Target.attachedToTarget" === t.method) {
          const e = t.params.sessionId,
            r = new ln(this, t.params.targetInfo.type, e, t.sessionId, this.#rt);
          this.#at.set(e, r), this.emit(ir.SessionAttached, r);
          const i = this.#at.get(t.sessionId);
          i && i.emit(ir.SessionAttached, r)
        } else if ("Target.detachedFromTarget" === t.method) {
          const e = this.#at.get(t.params.sessionId);
          if (e) {
            e.onClosed(), this.#at.delete(t.params.sessionId), this.emit(ir.SessionDetached, e);
            const r = this.#at.get(t.sessionId);
            r && r.emit(ir.SessionDetached, e)
          }
        }
        if (t.sessionId) {
          const e = this.#at.get(t.sessionId);
          e && e.onMessage(t)
        } else t.id ? t.error ? this.#rt ? this.#$e.rejectRaw(t.id, t.error) : this.#$e.reject(t.id, cr(t), t.error.message) : this.#$e.resolve(t.id, t.result) : this.emit(t.method, t.params)
      }
      #lt() {
        if (!this.#ot) {
          this.#ot = !0, this.#nt.onmessage = void 0, this.#nt.onclose = void 0, this.#$e.clear();
          for (const e of this.#at.values()) e.onClosed();
          this.#at.clear(), this.emit(ir.Disconnected, void 0)
        }
      }
      dispose() {
        this.#lt(), this.#nt.close()
      }
      isAutoAttached(e) {
        return !this.#ct.has(e)
      }
      async _createSession(e, t = !0) {
        t || this.#ct.add(e.targetId);
        const {
          sessionId: r
        } = await this.send("Target.attachToTarget", {
          targetId: e.targetId,
          flatten: !0
        });
        this.#ct.delete(e.targetId);
        const i = this.#at.get(r);
        if (!i) throw new Error("CDPSession creation failed.");
        return i
      }
      async createSession(e) {
        return await this._createSession(e, !1)
      }
      getPendingProtocolErrors() {
        const e = [];
        e.push(...this.#$e.getPendingProtocolErrors());
        for (const t of this.#at.values()) e.push(...t.getPendingProtocolErrors());
        return e
      }
    }

    function pn(e) {
      return e instanceof Ft
    }
    class mn {
      #dt;
      #ut;
      constructor(e) {
        this.#dt = new fn(e), this.#ut = new gn(e)
      }
      updateClient(e) {
        this.#dt.updateClient(e), this.#ut.updateClient(e)
      }
      async startJSCoverage(e = {}) {
        return await this.#dt.start(e)
      }
      async stopJSCoverage() {
        return await this.#dt.stop()
      }
      async startCSSCoverage(e = {}) {
        return await this.#ut.start(e)
      }
      async stopCSSCoverage() {
        return await this.#ut.stop()
      }
    }
    class fn {
      #ht;
      #pt = !1;
      #mt = new Map;
      #ft = new Map;
      #gt;
      #yt = !1;
      #wt = !1;
      #vt = !1;
      constructor(e) {
        this.#ht = e
      }
      updateClient(e) {
        this.#ht = e
      }
      async start(e = {}) {
        bt(!this.#pt, "JSCoverage is already enabled");
        const {
          resetOnNavigation: t = !0,
          reportAnonymousScripts: r = !1,
          includeRawScriptCoverage: i = !1,
          useBlockCoverage: n = !0
        } = e;
        this.#yt = t, this.#wt = r, this.#vt = i, this.#pt = !0, this.#mt.clear(), this.#ft.clear(), this.#gt = new pt;
        const s = this.#gt.use(new ft(this.#ht));
        s.on("Debugger.scriptParsed", this.#bt.bind(this)), s.on("Runtime.executionContextsCleared", this.#kt.bind(this)), await Promise.all([this.#ht.send("Profiler.enable"), this.#ht.send("Profiler.startPreciseCoverage", {
          callCount: this.#vt,
          detailed: n
        }), this.#ht.send("Debugger.enable"), this.#ht.send("Debugger.setSkipAllPauses", {
          skip: !0
        })])
      }
      #kt() {
        this.#yt && (this.#mt.clear(), this.#ft.clear())
      }
      async #bt(e) {
        if (!Nt.isPuppeteerURL(e.url) && (e.url || this.#wt)) try {
          const t = await this.#ht.send("Debugger.getScriptSource", {
            scriptId: e.scriptId
          });
          this.#mt.set(e.scriptId, e.url), this.#ft.set(e.scriptId, t.scriptSource)
        } catch (e) {
          Rt(e)
        }
      }
      async stop() {
        bt(this.#pt, "JSCoverage is not enabled"), this.#pt = !1;
        const e = await Promise.all([this.#ht.send("Profiler.takePreciseCoverage"), this.#ht.send("Profiler.stopPreciseCoverage"), this.#ht.send("Profiler.disable"), this.#ht.send("Debugger.disable")]);
        this.#gt?.dispose();
        const t = [],
          r = e[0];
        for (const e of r.result) {
          let r = this.#mt.get(e.scriptId);
          !r && this.#wt && (r = "debugger://VM" + e.scriptId);
          const i = this.#ft.get(e.scriptId);
          if (void 0 === i || void 0 === r) continue;
          const n = [];
          for (const t of e.functions) n.push(...t.ranges);
          const s = yn(n);
          this.#vt ? t.push({
            url: r,
            ranges: s,
            text: i,
            rawScriptCoverage: e
          }) : t.push({
            url: r,
            ranges: s,
            text: i
          })
        }
        return t
      }
    }
    class gn {
      #ht;
      #pt = !1;
      #St = new Map;
      #Tt = new Map;
      #Et;
      #yt = !1;
      constructor(e) {
        this.#ht = e
      }
      updateClient(e) {
        this.#ht = e
      }
      async start(e = {}) {
        bt(!this.#pt, "CSSCoverage is already enabled");
        const {
          resetOnNavigation: t = !0
        } = e;
        this.#yt = t, this.#pt = !0, this.#St.clear(), this.#Tt.clear(), this.#Et = new pt;
        const r = this.#Et.use(new ft(this.#ht));
        r.on("CSS.styleSheetAdded", this.#Ct.bind(this)), r.on("Runtime.executionContextsCleared", this.#kt.bind(this)), await Promise.all([this.#ht.send("DOM.enable"), this.#ht.send("CSS.enable"), this.#ht.send("CSS.startRuleUsageTracking")])
      }
      #kt() {
        this.#yt && (this.#St.clear(), this.#Tt.clear())
      }
      async #Ct(e) {
        const t = e.header;
        if (t.sourceURL) try {
          const e = await this.#ht.send("CSS.getStyleSheetText", {
            styleSheetId: t.styleSheetId
          });
          this.#St.set(t.styleSheetId, t.sourceURL), this.#Tt.set(t.styleSheetId, e.text)
        } catch (e) {
          Rt(e)
        }
      }
      async stop() {
        bt(this.#pt, "CSSCoverage is not enabled"), this.#pt = !1;
        const e = await this.#ht.send("CSS.stopRuleUsageTracking");
        await Promise.all([this.#ht.send("CSS.disable"), this.#ht.send("DOM.disable")]), this.#Et?.dispose();
        const t = new Map;
        for (const r of e.ruleUsage) {
          let e = t.get(r.styleSheetId);
          e || (e = [], t.set(r.styleSheetId, e)), e.push({
            startOffset: r.startOffset,
            endOffset: r.endOffset,
            count: r.used ? 1 : 0
          })
        }
        const r = [];
        for (const e of this.#St.keys()) {
          const i = this.#St.get(e);
          bt(void 0 !== i, `Stylesheet URL is undefined (styleSheetId=${e})`);
          const n = this.#Tt.get(e);
          bt(void 0 !== n, `Stylesheet text is undefined (styleSheetId=${e})`);
          const s = yn(t.get(e) || []);
          r.push({
            url: i,
            ranges: s,
            text: n
          })
        }
        return r
      }
    }

    function yn(e) {
      const t = [];
      for (const r of e) t.push({
        offset: r.startOffset,
        type: 0,
        range: r
      }), t.push({
        offset: r.endOffset,
        type: 1,
        range: r
      });
      t.sort(((e, t) => {
        if (e.offset !== t.offset) return e.offset - t.offset;
        if (e.type !== t.type) return t.type - e.type;
        const r = e.range.endOffset - e.range.startOffset,
          i = t.range.endOffset - t.range.startOffset;
        return 0 === e.type ? i - r : r - i
      }));
      const r = [],
        i = [];
      let n = 0;
      for (const e of t) {
        if (r.length && n < e.offset && r[r.length - 1] > 0) {
          const t = i[i.length - 1];
          t && t.end === n ? t.end = e.offset : i.push({
            start: n,
            end: e.offset
          })
        }
        n = e.offset, 0 === e.type ? r.push(e.range.count) : r.pop()
      }
      return i.filter((e => e.end - e.start > 0))
    }
    class wn {
      #Ne;
      #xt;
      #Mt;
      handled = !1;
      constructor(e, t, r = "") {
        this.#Ne = e, this.#xt = t, this.#Mt = r
      }
      type() {
        return this.#Ne
      }
      message() {
        return this.#xt
      }
      defaultValue() {
        return this.#Mt
      }
      async accept(e) {
        bt(!this.handled, "Cannot accept dialog which is already handled!"), this.handled = !0, await this.handle({
          accept: !0,
          text: e
        })
      }
      async dismiss() {
        bt(!this.handled, "Cannot dismiss dialog which is already handled!"), this.handled = !0, await this.handle({
          accept: !1
        })
      }
    }
    class vn extends wn {
      #ht;
      constructor(e, t, r, i = "") {
        super(t, r, i), this.#ht = e
      }
      async handle(e) {
        await this.#ht.send("Page.handleJavaScriptDialog", {
          accept: e.accept,
          promptText: e.text
        })
      }
    }
    var bn = function (e, t, r) {
        for (var i = arguments.length > 2, n = 0; n < t.length; n++) r = i ? t[n].call(e, r) : t[n].call(e);
        return i ? r : void 0
      },
      kn = function (e, t, r, i, n, s) {
        function a(e) {
          if (void 0 !== e && "function" != typeof e) throw new TypeError("Function expected");
          return e
        }
        for (var o, c = i.kind, l = "getter" === c ? "get" : "setter" === c ? "set" : "value", d = !t && e ? i.static ? e : e.prototype : null, u = t || (d ? Object.getOwnPropertyDescriptor(d, i.name) : {}), h = !1, p = r.length - 1; p >= 0; p--) {
          var m = {};
          for (var f in i) m[f] = "access" === f ? {} : i[f];
          for (var f in i.access) m.access[f] = i.access[f];
          m.addInitializer = function (e) {
            if (h) throw new TypeError("Cannot add initializers after decoration has completed");
            s.push(a(e || null))
          };
          var g = (0, r[p])("accessor" === c ? {
            get: u.get,
            set: u.set
          } : u[l], m);
          if ("accessor" === c) {
            if (void 0 === g) continue;
            if (null === g || "object" != typeof g) throw new TypeError("Object expected");
            (o = a(g.get)) && (u.get = o), (o = a(g.set)) && (u.set = o), (o = a(g.init)) && n.unshift(o)
          } else(o = a(g)) && ("field" === c ? n.unshift(o) : u[l] = o)
        }
        d && Object.defineProperty(d, i.name, u), h = !0
      },
      Sn = function (e, t, r) {
        return "symbol" == typeof t && (t = t.description ? "[".concat(t.description, "]") : ""), Object.defineProperty(e, "name", {
          configurable: !0,
          value: r ? "".concat(r, " ", t) : t
        })
      };
    class Tn {
      #_t;
      #It;
      #Pt;
      constructor(e, t, r) {
        this.#_t = e, this.#It = t, this.#Pt = r, this.#It.registerState(this)
      }
      async setState(e) {
        this.#_t = e, await this.sync()
      }
      get state() {
        return this.#_t
      }
      async sync() {
        await Promise.all(this.#It.clients().map((e => this.#Pt(e, this.#_t))))
      }
    }
    let En = (() => {
      let e, t, r, i, n, s, a, o, c, l, d, u, h, p, m, f, g, y, w, v, b = [];
      return class {
        static {
          const k = "function" == typeof Symbol && Symbol.metadata ? Object.create(null) : void 0;
          e = [$r], r = [$r], n = [$r], a = [$r], c = [$r], d = [$r], h = [$r], m = [$r], g = [$r], w = [$r], kn(this, t = {
            value: Sn((async function (e, t) {
              if (!t.viewport) return void await Promise.all([e.send("Emulation.clearDeviceMetricsOverride"), e.send("Emulation.setTouchEmulationEnabled", {
                enabled: !1
              })]).catch(Rt);
              const {
                viewport: r
              } = t, i = r.isMobile || !1, n = r.width, s = r.height, a = r.deviceScaleFactor ?? 1, o = r.isLandscape ? {
                angle: 90,
                type: "landscapePrimary"
              } : {
                angle: 0,
                type: "portraitPrimary"
              }, c = r.hasTouch || !1;
              await Promise.all([e.send("Emulation.setDeviceMetricsOverride", {
                mobile: i,
                width: n,
                height: s,
                deviceScaleFactor: a,
                screenOrientation: o
              }).catch((e => {
                if (!e.message.includes("Target does not support metrics override")) throw e;
                Rt(e)
              })), e.send("Emulation.setTouchEmulationEnabled", {
                enabled: c
              })])
            }), "#applyViewport")
          }, e, {
            kind: "method",
            name: "#applyViewport",
            static: !1,
            private: !0,
            access: {
              has: e => #At in e,
              get: e => e.#At
            },
            metadata: k
          }, null, b), kn(this, i = {
            value: Sn((async function (e, t) {
              t.active && (t.overrides ? await e.send("Emulation.setIdleOverride", {
                isUserActive: t.overrides.isUserActive,
                isScreenUnlocked: t.overrides.isScreenUnlocked
              }) : await e.send("Emulation.clearIdleOverride"))
            }), "#emulateIdleState")
          }, r, {
            kind: "method",
            name: "#emulateIdleState",
            static: !1,
            private: !0,
            access: {
              has: e => #Ft in e,
              get: e => e.#Ft
            },
            metadata: k
          }, null, b), kn(this, s = {
            value: Sn((async function (e, t) {
              if (t.active) try {
                await e.send("Emulation.setTimezoneOverride", {
                  timezoneId: t.timezoneId || ""
                })
              } catch (e) {
                if (ar(e) && e.message.includes("Invalid timezone")) throw new Error(`Invalid timezone ID: ${t.timezoneId}`);
                throw e
              }
            }), "#emulateTimezone")
          }, n, {
            kind: "method",
            name: "#emulateTimezone",
            static: !1,
            private: !0,
            access: {
              has: e => #Ot in e,
              get: e => e.#Ot
            },
            metadata: k
          }, null, b), kn(this, o = {
            value: Sn((async function (e, t) {
              t.active && await e.send("Emulation.setEmulatedVisionDeficiency", {
                type: t.visionDeficiency || "none"
              })
            }), "#emulateVisionDeficiency")
          }, a, {
            kind: "method",
            name: "#emulateVisionDeficiency",
            static: !1,
            private: !0,
            access: {
              has: e => #Rt in e,
              get: e => e.#Rt
            },
            metadata: k
          }, null, b), kn(this, l = {
            value: Sn((async function (e, t) {
              t.active && await e.send("Emulation.setCPUThrottlingRate", {
                rate: t.factor ?? 1
              })
            }), "#emulateCpuThrottling")
          }, c, {
            kind: "method",
            name: "#emulateCpuThrottling",
            static: !1,
            private: !0,
            access: {
              has: e => #Lt in e,
              get: e => e.#Lt
            },
            metadata: k
          }, null, b), kn(this, u = {
            value: Sn((async function (e, t) {
              t.active && await e.send("Emulation.setEmulatedMedia", {
                features: t.mediaFeatures
              })
            }), "#emulateMediaFeatures")
          }, d, {
            kind: "method",
            name: "#emulateMediaFeatures",
            static: !1,
            private: !0,
            access: {
              has: e => #Dt in e,
              get: e => e.#Dt
            },
            metadata: k
          }, null, b), kn(this, p = {
            value: Sn((async function (e, t) {
              t.active && await e.send("Emulation.setEmulatedMedia", {
                media: t.type || ""
              })
            }), "#emulateMediaType")
          }, h, {
            kind: "method",
            name: "#emulateMediaType",
            static: !1,
            private: !0,
            access: {
              has: e => #Nt in e,
              get: e => e.#Nt
            },
            metadata: k
          }, null, b), kn(this, f = {
            value: Sn((async function (e, t) {
              t.active && await e.send("Emulation.setGeolocationOverride", t.geoLocation ? {
                longitude: t.geoLocation.longitude,
                latitude: t.geoLocation.latitude,
                accuracy: t.geoLocation.accuracy
              } : void 0)
            }), "#setGeolocation")
          }, m, {
            kind: "method",
            name: "#setGeolocation",
            static: !1,
            private: !0,
            access: {
              has: e => #Bt in e,
              get: e => e.#Bt
            },
            metadata: k
          }, null, b), kn(this, y = {
            value: Sn((async function (e, t) {
              t.active && await e.send("Emulation.setDefaultBackgroundColorOverride", {
                color: t.color
              })
            }), "#setDefaultBackgroundColor")
          }, g, {
            kind: "method",
            name: "#setDefaultBackgroundColor",
            static: !1,
            private: !0,
            access: {
              has: e => #Kt in e,
              get: e => e.#Kt
            },
            metadata: k
          }, null, b), kn(this, v = {
            value: Sn((async function (e, t) {
              t.active && await e.send("Emulation.setScriptExecutionDisabled", {
                value: !t.javaScriptEnabled
              })
            }), "#setJavaScriptEnabled")
          }, w, {
            kind: "method",
            name: "#setJavaScriptEnabled",
            static: !1,
            private: !0,
            access: {
              has: e => #Ht in e,
              get: e => e.#Ht
            },
            metadata: k
          }, null, b), k && Object.defineProperty(this, Symbol.metadata, {
            enumerable: !0,
            configurable: !0,
            writable: !0,
            value: k
          })
        }
        #ht = bn(this, b);
        #qt = !1;
        #jt = !1;
        #Ut = [];
        #$t = new Tn({
          active: !1
        }, this, this.#At);
        #Wt = new Tn({
          active: !1
        }, this, this.#Ft);
        #Gt = new Tn({
          active: !1
        }, this, this.#Ot);
        #zt = new Tn({
          active: !1
        }, this, this.#Rt);
        #Vt = new Tn({
          active: !1
        }, this, this.#Lt);
        #Xt = new Tn({
          active: !1
        }, this, this.#Dt);
        #Jt = new Tn({
          active: !1
        }, this, this.#Nt);
        #Qt = new Tn({
          active: !1
        }, this, this.#Bt);
        #Yt = new Tn({
          active: !1
        }, this, this.#Kt);
        #Zt = new Tn({
          javaScriptEnabled: !0,
          active: !1
        }, this, this.#Ht);
        #er = new Set;
        constructor(e) {
          this.#ht = e
        }
        updateClient(e) {
          this.#ht = e, this.#er.delete(e)
        }
        registerState(e) {
          this.#Ut.push(e)
        }
        clients() {
          return [this.#ht, ...Array.from(this.#er)]
        }
        async registerSpeculativeSession(e) {
          this.#er.add(e), e.once(ir.Disconnected, (() => {
            this.#er.delete(e)
          })), Promise.all(this.#Ut.map((e => e.sync().catch(Rt))))
        }
        get javascriptEnabled() {
          return this.#Zt.state.javaScriptEnabled
        }
        async emulateViewport(e) {
          const t = this.#$t.state;
          if (!e && !t.active) return !1;
          await this.#$t.setState(e ? {
            viewport: e,
            active: !0
          } : {
            active: !1
          });
          const r = e?.isMobile || !1,
            i = e?.hasTouch || !1,
            n = this.#qt !== r || this.#jt !== i;
          return this.#qt = r, this.#jt = i, n
        }
        get #At() {
          return t.value
        }
        async emulateIdleState(e) {
          await this.#Wt.setState({
            active: !0,
            overrides: e
          })
        }
        get #Ft() {
          return i.value
        }
        get #Ot() {
          return s.value
        }
        async emulateTimezone(e) {
          await this.#Gt.setState({
            timezoneId: e,
            active: !0
          })
        }
        get #Rt() {
          return o.value
        }
        async emulateVisionDeficiency(e) {
          const t = new Set(["none", "achromatopsia", "blurredVision", "deuteranopia", "protanopia", "reducedContrast", "tritanopia"]);
          bt(!e || t.has(e), `Unsupported vision deficiency: ${e}`), await this.#zt.setState({
            active: !0,
            visionDeficiency: e
          })
        }
        get #Lt() {
          return l.value
        }
        async emulateCPUThrottling(e) {
          bt(null === e || e >= 1, "Throttling rate should be greater or equal to 1"), await this.#Vt.setState({
            active: !0,
            factor: e ?? void 0
          })
        }
        get #Dt() {
          return u.value
        }
        async emulateMediaFeatures(e) {
          if (Array.isArray(e))
            for (const t of e) {
              const e = t.name;
              bt(/^(?:prefers-(?:color-scheme|reduced-motion)|color-gamut)$/.test(e), "Unsupported media feature: " + e)
            }
          await this.#Xt.setState({
            active: !0,
            mediaFeatures: e
          })
        }
        get #Nt() {
          return p.value
        }
        async emulateMediaType(e) {
          bt("screen" === e || "print" === e || void 0 === (e ?? void 0), "Unsupported media type: " + e), await this.#Jt.setState({
            type: e,
            active: !0
          })
        }
        get #Bt() {
          return f.value
        }
        async setGeolocation(e) {
          const {
            longitude: t,
            latitude: r,
            accuracy: i = 0
          } = e;
          if (t < -180 || t > 180) throw new Error(`Invalid longitude "${t}": precondition -180 <= LONGITUDE <= 180 failed.`);
          if (r < -90 || r > 90) throw new Error(`Invalid latitude "${r}": precondition -90 <= LATITUDE <= 90 failed.`);
          if (i < 0) throw new Error(`Invalid accuracy "${i}": precondition 0 <= ACCURACY failed.`);
          await this.#Qt.setState({
            active: !0,
            geoLocation: {
              longitude: t,
              latitude: r,
              accuracy: i
            }
          })
        }
        get #Kt() {
          return y.value
        }
        async resetDefaultBackgroundColor() {
          await this.#Yt.setState({
            active: !0,
            color: void 0
          })
        }
        async setTransparentBackgroundColor() {
          await this.#Yt.setState({
            active: !0,
            color: {
              r: 0,
              g: 0,
              b: 0,
              a: 0
            }
          })
        }
        get #Ht() {
          return v.value
        }
        async setJavaScriptEnabled(e) {
          await this.#Zt.setState({
            active: !0,
            javaScriptEnabled: e
          })
        }
      }
    })();
    class Cn {
      #Ge;
      #tr;
      #rr = new WeakMap;
      constructor(e, t, r) {
        this.#Ge = t, this.#tr = r, this.#rr.set(e, t)
      }
      get id() {
        return this.#Ge
      }
      get source() {
        return this.#tr
      }
      getIdForFrame(e) {
        return this.#rr.get(e)
      }
      setIdForFrame(e, t) {
        this.#rr.set(e, t)
      }
    }
    class xn {
      id;
      name;
      constructor(e, t) {
        this.id = e, this.name = t
      }
    }
    class Mn {
      #ht;
      #ir;
      #Ge;
      #Ue = !1;
      #nr = this.#sr.bind(this);
      #ar = new Set;
      devices = [];
      constructor(e, t, r) {
        this.#ht = e, this.#ir = t, this.#Ge = r.id, this.#ht.on("DeviceAccess.deviceRequestPrompted", this.#nr), this.#ht.on("Target.detachedFromTarget", (() => {
          this.#ht = null
        })), this.#sr(r)
      }
      #sr(e) {
        if (e.id === this.#Ge)
          for (const t of e.devices) {
            if (this.devices.some((e => e.id === t.id))) continue;
            const e = new xn(t.id, t.name);
            this.devices.push(e);
            for (const t of this.#ar) t.filter(e) && t.promise.resolve(e)
          }
      }
      async waitForDevice(e, t = {}) {
        for (const t of this.devices)
          if (e(t)) return t;
        const {
          timeout: r = this.#ir.timeout()
        } = t, i = er.create({
          message: `Waiting for \`DeviceRequestPromptDevice\` failed: ${r}ms exceeded`,
          timeout: r
        });
        t.signal && t.signal.addEventListener("abort", (() => {
          i.reject(t.signal?.reason)
        }), {
          once: !0
        });
        const n = {
          filter: e,
          promise: i
        };
        this.#ar.add(n);
        try {
          return await i.valueOrThrow()
        } finally {
          this.#ar.delete(n)
        }
      }
      async select(e) {
        return bt(null !== this.#ht, "Cannot select device through detached session!"), bt(this.devices.includes(e), "Cannot select unknown device!"), bt(!this.#Ue, "Cannot select DeviceRequestPrompt which is already handled!"), this.#ht.off("DeviceAccess.deviceRequestPrompted", this.#nr), this.#Ue = !0, await this.#ht.send("DeviceAccess.selectPrompt", {
          id: this.#Ge,
          deviceId: e.id
        })
      }
      async cancel() {
        return bt(null !== this.#ht, "Cannot cancel prompt through detached session!"), bt(!this.#Ue, "Cannot cancel DeviceRequestPrompt which is already handled!"), this.#ht.off("DeviceAccess.deviceRequestPrompted", this.#nr), this.#Ue = !0, await this.#ht.send("DeviceAccess.cancelPrompt", {
          id: this.#Ge
        })
      }
    }
    class _n {
      #ht;
      #ir;
      #or = new Set;
      constructor(e, t) {
        this.#ht = e, this.#ir = t, this.#ht.on("DeviceAccess.deviceRequestPrompted", (e => {
          this.#cr(e)
        })), this.#ht.on("Target.detachedFromTarget", (() => {
          this.#ht = null
        }))
      }
      async waitForDevicePrompt(e = {}) {
        bt(null !== this.#ht, "Cannot wait for device prompt through detached session!");
        let t;
        0 === this.#or.size && (t = this.#ht.send("DeviceAccess.enable"));
        const {
          timeout: r = this.#ir.timeout()
        } = e, i = er.create({
          message: `Waiting for \`DeviceRequestPrompt\` failed: ${r}ms exceeded`,
          timeout: r
        });
        e.signal && e.signal.addEventListener("abort", (() => {
          i.reject(e.signal?.reason)
        }), {
          once: !0
        }), this.#or.add(i);
        try {
          const [e] = await Promise.all([i.valueOrThrow(), t]);
          return e
        } finally {
          this.#or.delete(i)
        }
      }
      #cr(e) {
        if (!this.#or.size) return;
        bt(null !== this.#ht);
        const t = new Mn(this.#ht, this.#ir, e);
        for (const e of this.#or) e.resolve(t);
        this.#or.clear()
      }
    }

    function In(e) {
      let t, r;
      if (e.exception) {
        if (!("object" === e.exception.type && "error" === e.exception.subtype || e.exception.objectId)) return An(e.exception);
        {
          const i = Pn(e);
          t = i.name, r = i.message
        }
      } else t = "Error", r = e.text;
      const i = r.split("\n").length,
        n = new Error(r);
      n.name = t;
      const s = n.stack.split("\n"),
        a = s.splice(0, i);
      if (s.shift(), e.stackTrace && s.length < Error.stackTraceLimit)
        for (const t of e.stackTrace.callFrames.reverse()) {
          if (Nt.isPuppeteerURL(t.url) && t.url !== Nt.INTERNAL_URL) {
            const e = Nt.parse(t.url);
            s.unshift(`    at ${t.functionName||e.functionName} (${e.functionName} at ${e.siteString}, <anonymous>:${t.lineNumber}:${t.columnNumber})`)
          } else s.push(`    at ${t.functionName||"<anonymous>"} (${t.url}:${t.lineNumber}:${t.columnNumber})`);
          if (s.length >= Error.stackTraceLimit) break
        }
      return n.stack = [...a, ...s].join("\n"), n
    }
    const Pn = e => {
      let t, r = "";
      const i = e.exception?.description?.split("\n    at ") ?? [],
        n = Math.min(e.stackTrace?.callFrames.length ?? 0, i.length - 1);
      return i.splice(-n, n), e.exception?.className && (r = e.exception.className), t = i.join("\n"), r && t.startsWith(`${r}: `) && (t = t.slice(r.length + 2)), {
        message: t,
        name: r
      }
    };

    function An(e) {
      if (bt(!e.objectId, "Cannot extract value when objectId is given"), e.unserializableValue) {
        if ("bigint" === e.type) return BigInt(e.unserializableValue.replace("n", ""));
        switch (e.unserializableValue) {
        case "-0":
          return -0;
        case "NaN":
          return NaN;
        case "Infinity":
          return 1 / 0;
        case "-Infinity":
          return -1 / 0;
        default:
          throw new Error("Unsupported unserializable value: " + e.unserializableValue)
        }
      }
      return e.value
    }

    function Fn(e, t, r) {
      globalThis[t] || Object.assign(globalThis, {
        [t](...i) {
          const n = globalThis[t];
          n.args ??= new Map, n.callbacks ??= new Map;
          const s = (n.lastSeq ?? 0) + 1;
          return n.lastSeq = s, n.args.set(s, i), globalThis[r + t](JSON.stringify({
            type: e,
            name: t,
            seq: s,
            args: i,
            isTrivial: !i.some((e => e instanceof Node))
          })), new Promise(((e, t) => {
            n.callbacks.set(s, {
              resolve(t) {
                n.args.delete(s), e(t)
              },
              reject(e) {
                n.args.delete(s), t(e)
              }
            })
          }))
        }
      })
    }
    const On = "puppeteer_";
    class Rn extends Jr {
      #e = !1;
      #lr;
      #de;
      constructor(e, t) {
        super(), this.#de = e, this.#lr = t
      }
      get disposed() {
        return this.#e
      }
      get realm() {
        return this.#de
      }
      get client() {
        return this.realm.environment.client
      }
      async jsonValue() {
        if (!this.#lr.objectId) return An(this.#lr);
        const e = await this.evaluate((e => e));
        if (void 0 === e) throw new Error("Could not serialize referenced object");
        return e
      }
      asElement() {
        return null
      }
      async dispose() {
        this.#e || (this.#e = !0, await Ln(this.client, this.#lr))
      }
      toString() {
        if (!this.#lr.objectId) return "JSHandle:" + An(this.#lr);
        return "JSHandle@" + (this.#lr.subtype || this.#lr.type)
      }
      get id() {
        return this.#lr.objectId
      }
      remoteObject() {
        return this.#lr
      }
      async getProperties() {
        const e = await this.client.send("Runtime.getProperties", {
            objectId: this.#lr.objectId,
            ownProperties: !0
          }),
          t = new Map;
        for (const r of e.result) r.enumerable && r.value && t.set(r.name, this.#de.createCdpHandle(r.value));
        return t
      }
    }
    async function Ln(e, t) {
      t.objectId && await e.send("Runtime.releaseObject", {
        objectId: t.objectId
      }).catch((e => {
        Rt(e)
      }))
    }
    var Dn = function (e, t, r) {
        for (var i = arguments.length > 2, n = 0; n < t.length; n++) r = i ? t[n].call(e, r) : t[n].call(e);
        return i ? r : void 0
      },
      Nn = function (e, t, r, i, n, s) {
        function a(e) {
          if (void 0 !== e && "function" != typeof e) throw new TypeError("Function expected");
          return e
        }
        for (var o, c = i.kind, l = "getter" === c ? "get" : "setter" === c ? "set" : "value", d = !t && e ? i.static ? e : e.prototype : null, u = t || (d ? Object.getOwnPropertyDescriptor(d, i.name) : {}), h = !1, p = r.length - 1; p >= 0; p--) {
          var m = {};
          for (var f in i) m[f] = "access" === f ? {} : i[f];
          for (var f in i.access) m.access[f] = i.access[f];
          m.addInitializer = function (e) {
            if (h) throw new TypeError("Cannot add initializers after decoration has completed");
            s.push(a(e || null))
          };
          var g = (0, r[p])("accessor" === c ? {
            get: u.get,
            set: u.set
          } : u[l], m);
          if ("accessor" === c) {
            if (void 0 === g) continue;
            if (null === g || "object" != typeof g) throw new TypeError("Object expected");
            (o = a(g.get)) && (u.get = o), (o = a(g.set)) && (u.set = o), (o = a(g.init)) && n.unshift(o)
          } else(o = a(g)) && ("field" === c ? n.unshift(o) : u[l] = o)
        }
        d && Object.defineProperty(d, i.name, u), h = !0
      };
    const Bn = new Set(["StaticText", "InlineTextBox"]);
    let Kn = (() => {
      let e, t, r, i, n = ii,
        s = [];
      return class extends n {
        static {
          const a = "function" == typeof Symbol && Symbol.metadata ? Object.create(n[Symbol.metadata] ?? null) : void 0;
          e = [Ur()], t = [Ur(), ri], r = [Ur(), ri], i = [Ur()], Nn(this, null, e, {
            kind: "method",
            name: "contentFrame",
            static: !1,
            private: !1,
            access: {
              has: e => "contentFrame" in e,
              get: e => e.contentFrame
            },
            metadata: a
          }, null, s), Nn(this, null, t, {
            kind: "method",
            name: "scrollIntoView",
            static: !1,
            private: !1,
            access: {
              has: e => "scrollIntoView" in e,
              get: e => e.scrollIntoView
            },
            metadata: a
          }, null, s), Nn(this, null, r, {
            kind: "method",
            name: "uploadFile",
            static: !1,
            private: !1,
            access: {
              has: e => "uploadFile" in e,
              get: e => e.uploadFile
            },
            metadata: a
          }, null, s), Nn(this, null, i, {
            kind: "method",
            name: "autofill",
            static: !1,
            private: !1,
            access: {
              has: e => "autofill" in e,
              get: e => e.autofill
            },
            metadata: a
          }, null, s), a && Object.defineProperty(this, Symbol.metadata, {
            enumerable: !0,
            configurable: !0,
            writable: !0,
            value: a
          })
        }
        #dr = Dn(this, s);
        constructor(e, t) {
          super(new Rn(e, t))
        }
        get realm() {
          return this.handle.realm
        }
        get client() {
          return this.handle.client
        }
        remoteObject() {
          return this.handle.remoteObject()
        }
        get #ur() {
          return this.frame._frameManager
        }
        get frame() {
          return this.realm.environment
        }
        async contentFrame() {
          const e = await this.client.send("DOM.describeNode", {
            objectId: this.id
          });
          return "string" != typeof e.node.frameId ? null : this.#ur.frame(e.node.frameId)
        }
        async scrollIntoView() {
          await this.assertConnectedElement();
          try {
            await this.client.send("DOM.scrollIntoViewIfNeeded", {
              objectId: this.id
            })
          } catch (e) {
            Rt(e), await super.scrollIntoView()
          }
        }
        async uploadFile(...e) {
          const t = await this.evaluate((e => e.multiple));
          bt(e.length <= 1 || t, "Multiple file uploads only work with <input type=file multiple>");
          const r = wt.value.path;
          if (r && (e = e.map((e => r.win32.isAbsolute(e) || r.posix.isAbsolute(e) ? e : r.resolve(e)))), 0 === e.length) return void await this.evaluate((e => {
            e.files = (new DataTransfer).files, e.dispatchEvent(new Event("input", {
              bubbles: !0,
              composed: !0
            })), e.dispatchEvent(new Event("change", {
              bubbles: !0
            }))
          }));
          const {
            node: {
              backendNodeId: i
            }
          } = await this.client.send("DOM.describeNode", {
            objectId: this.id
          });
          await this.client.send("DOM.setFileInputFiles", {
            objectId: this.id,
            files: e,
            backendNodeId: i
          })
        }
        async autofill(e) {
          const t = (await this.client.send("DOM.describeNode", {
              objectId: this.handle.id
            })).node.backendNodeId,
            r = this.frame._id;
          await this.client.send("Autofill.trigger", {
            fieldId: t,
            frameId: r,
            card: e.creditCard
          })
        }
        async * queryAXTree(e, t) {
          const {
            nodes: r
          } = await this.client.send("Accessibility.queryAXTree", {
            objectId: this.id,
            accessibleName: e,
            role: t
          }), i = r.filter((e => !e.ignored && (!!e.role && !Bn.has(e.role.value))));
          return yield* br.map(i, (e => this.realm.adoptBackendNode(e.backendDOMNodeId)))
        }
        async backendNodeId() {
          if (this.#dr) return this.#dr;
          const {
            node: e
          } = await this.client.send("DOM.describeNode", {
            objectId: this.handle.id
          });
          return this.#dr = e.backendNodeId, this.#dr
        }
      }
    })();
    var Hn = function (e, t, r) {
        if (null != t) {
          if ("object" != typeof t && "function" != typeof t) throw new TypeError("Object expected.");
          var i, n;
          if (r) {
            if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
            i = t[Symbol.asyncDispose]
          }
          if (void 0 === i) {
            if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
            i = t[Symbol.dispose], r && (n = i)
          }
          if ("function" != typeof i) throw new TypeError("Object not disposable.");
          n && (i = function () {
            try {
              n.call(this)
            } catch (e) {
              return Promise.reject(e)
            }
          }), e.stack.push({
            value: t,
            dispose: i,
            async: r
          })
        } else r && e.stack.push({
          async: !0
        });
        return t
      },
      qn = function (e) {
        return function (t) {
          function r(r) {
            t.error = t.hasError ? new e(r, t.error, "An error was suppressed during disposal.") : r, t.hasError = !0
          }
          var i, n = 0;
          return function e() {
            for (; i = t.stack.pop();) try {
              if (!i.async && 1 === n) return n = 0, t.stack.push(i), Promise.resolve().then(e);
              if (i.dispose) {
                var s = i.dispose.call(i.value);
                if (i.async) return n |= 2, Promise.resolve(s).then(e, (function (t) {
                  return r(t), e()
                }))
              } else n |= 1
            } catch (e) {
              r(e)
            }
            if (1 === n) return t.hasError ? Promise.reject(t.error) : Promise.resolve();
            if (t.hasError) throw t.error
          }()
        }
      }("function" == typeof SuppressedError ? SuppressedError : function (e, t, r) {
        var i = new Error(r);
        return i.name = "SuppressedError", i.error = e, i.suppressed = t, i
      });
    const jn = new nn("__ariaQuerySelector", Sr.queryOne, ""),
      Un = new nn("__ariaQuerySelectorAll", (async (e, t) => {
        const r = Sr.queryAll(e, t);
        return await e.realm.evaluateHandle(((...e) => e), ...await br.collect(r))
      }), "");
    class $n extends ft {
      #ht;
      #de;
      #Ge;
      #Ie;
      #hr = new pt;
      constructor(e, t, r) {
        super(), this.#ht = e, this.#de = r, this.#Ge = t.id, t.name && (this.#Ie = t.name);
        const i = this.#hr.use(new ft(this.#ht));
        i.on("Runtime.bindingCalled", this.#pr.bind(this)), i.on("Runtime.executionContextDestroyed", (async e => {
          e.executionContextId === this.#Ge && this[ut]()
        })), i.on("Runtime.executionContextsCleared", (async () => {
          this[ut]()
        })), i.on("Runtime.consoleAPICalled", this.#mr.bind(this)), i.on(ir.Disconnected, (() => {
          this[ut]()
        }))
      }
      #fr = new Map;
      #y = new tr;
      async #gr(e) {
        const t = {
          stack: [],
          error: void 0,
          hasError: !1
        };
        try {
          if (this.#fr.has(e.name)) return;
          Hn(t, await this.#y.acquire(), !1);
          try {
            await this.#ht.send("Runtime.addBinding", this.#Ie ? {
              name: On + e.name,
              executionContextName: this.#Ie
            } : {
              name: On + e.name,
              executionContextId: this.#Ge
            }), await this.evaluate(Fn, "internal", e.name, On), this.#fr.set(e.name, e)
          } catch (e) {
            if (e instanceof Error) {
              if (e.message.includes("Execution context was destroyed")) return;
              if (e.message.includes("Cannot find context with specified id")) return
            }
            Rt(e)
          }
        } catch (e) {
          t.error = e, t.hasError = !0
        } finally {
          qn(t)
        }
      }
      async #pr(e) {
        if (e.executionContextId !== this.#Ge) return;
        let t;
        try {
          t = JSON.parse(e.payload)
        } catch {
          return
        }
        const {
          type: r,
          name: i,
          seq: n,
          args: s,
          isTrivial: a
        } = t;
        if ("internal" === r)
          if (this.#fr.has(i)) try {
            const e = this.#fr.get(i);
            await (e?.run(this, n, s, a))
          } catch (e) {
            Rt(e)
          } else this.emit("bindingcalled", e);
          else this.emit("bindingcalled", e)
      }
      get id() {
        return this.#Ge
      }
      #mr(e) {
        e.executionContextId === this.#Ge && this.emit("consoleapicalled", e)
      }
      #yr = !1;
      #wr;
      get puppeteerUtil() {
        let e = Promise.resolve();
        return this.#yr || (e = Promise.all([this.#vr(jn), this.#vr(Un)]), this.#yr = !0), Er.inject((t => {
          this.#wr && this.#wr.then((e => {
            e.dispose()
          })), this.#wr = e.then((() => this.evaluateHandle(t)))
        }), !this.#wr), this.#wr
      }
      async #vr(e) {
        try {
          await this.#gr(e)
        } catch (e) {
          Rt(e)
        }
      }
      async evaluate(e, ...t) {
        return await this.#br(!0, e, ...t)
      }
      async evaluateHandle(e, ...t) {
        return await this.#br(!1, e, ...t)
      }
      async #br(e, t, ...r) {
        const i = `//# sourceURL=${(e=>{if(Object.prototype.hasOwnProperty.call(e,Dt))return e[Dt]})(t)?.toString()??Nt.INTERNAL_URL}`;
        if (Kt(t)) {
          const r = this.#Ge,
            n = t,
            s = Wt.test(n) ? n : `${n}\n${i}\n`,
            {
              exceptionDetails: a,
              result: o
            } = await this.#ht.send("Runtime.evaluate", {
              expression: s,
              contextId: r,
              returnByValue: e,
              awaitPromise: !0,
              userGesture: !0
            }).catch(Wn);
          if (a) throw In(a);
          return e ? An(o) : this.#de.createCdpHandle(o)
        }
        const n = dr(t),
          s = Wt.test(n) ? n : `${n}\n${i}\n`;
        let a;
        try {
          a = this.#ht.send("Runtime.callFunctionOn", {
            functionDeclaration: s,
            executionContextId: this.#Ge,
            arguments: r.some((e => e instanceof gr)) ? await Promise.all(r.map((e => async function (e, t) {
              t instanceof gr && (t = await t.get(e));
              return l(e, t)
            }(this, e)))) : r.map((e => l(this, e))),
            returnByValue: e,
            awaitPromise: !0,
            userGesture: !0
          })
        } catch (e) {
          throw e instanceof TypeError && e.message.startsWith("Converting circular structure to JSON") && (e.message += " Recursive objects are not allowed."), e
        }
        const {
          exceptionDetails: o,
          result: c
        } = await a.catch(Wn);
        if (o) throw In(o);
        return e ? An(c) : this.#de.createCdpHandle(c);

        function l(e, t) {
          if ("bigint" == typeof t) return {
            unserializableValue: `${t.toString()}n`
          };
          if (Object.is(t, -0)) return {
            unserializableValue: "-0"
          };
          if (Object.is(t, 1 / 0)) return {
            unserializableValue: "Infinity"
          };
          if (Object.is(t, -1 / 0)) return {
            unserializableValue: "-Infinity"
          };
          if (Object.is(t, NaN)) return {
            unserializableValue: "NaN"
          };
          const r = t && (t instanceof Rn || t instanceof Kn) ? t : null;
          if (r) {
            if (r.realm !== e.#de) throw new Error("JSHandles can be evaluated only in the context they were created!");
            if (r.disposed) throw new Error("JSHandle is disposed!");
            return r.remoteObject().unserializableValue ? {
              unserializableValue: r.remoteObject().unserializableValue
            } : r.remoteObject().objectId ? {
              objectId: r.remoteObject().objectId
            } : {
              value: r.remoteObject().value
            }
          }
          return {
            value: t
          }
        }
      } [ut]() {
        this.#hr.dispose(), this.emit("disposed", void 0)
      }
    }
    const Wn = e => {
      if (e.message.includes("Object reference chain is too long")) return {
        result: {
          type: "undefined"
        }
      };
      if (e.message.includes("Object couldn't be returned by value")) return {
        result: {
          type: "undefined"
        }
      };
      if (e.message.endsWith("Cannot find context with specified id") || e.message.endsWith("Inspected target navigated or closed")) throw new Error("Execution context was destroyed, most likely because of a navigation.");
      throw e
    };
    var Gn;
    ! function (e) {
      e.FrameAttached = Symbol("FrameManager.FrameAttached"), e.FrameNavigated = Symbol("FrameManager.FrameNavigated"), e.FrameDetached = Symbol("FrameManager.FrameDetached"), e.FrameSwapped = Symbol("FrameManager.FrameSwapped"), e.LifecycleEvent = Symbol("FrameManager.LifecycleEvent"), e.FrameNavigatedWithinDocument = Symbol("FrameManager.FrameNavigatedWithinDocument"), e.ConsoleApiCalled = Symbol("FrameManager.ConsoleApiCalled"), e.BindingCalled = Symbol("FrameManager.BindingCalled")
    }(Gn || (Gn = {}));
    class zn extends Gi {
      #kr;
      #r = new ft;
      #Sr;
      constructor(e, t) {
        super(t), this.#Sr = e
      }
      get environment() {
        return this.#Sr
      }
      get client() {
        return this.#Sr.client
      }
      get emitter() {
        return this.#r
      }
      setContext(e) {
        this.#kr?.[ut](), e.once("disposed", this.#Tr.bind(this)), e.on("consoleapicalled", this.#Er.bind(this)), e.on("bindingcalled", this.#Cr.bind(this)), this.#kr = e, this.#r.emit("context", e), this.taskManager.rerunAll()
      }
      #Tr() {
        this.#kr = void 0, "clearDocumentHandle" in this.#Sr && this.#Sr.clearDocumentHandle()
      }
      #Er(e) {
        this.#r.emit("consoleapicalled", e)
      }
      #Cr(e) {
        this.#r.emit("bindingcalled", e)
      }
      hasContext() {
        return !!this.#kr
      }
      get context() {
        return this.#kr
      }
      #xr() {
        if (this.disposed) throw new Error(`Execution context is not available in detached frame or worker "${this.environment.url()}" (are you trying to evaluate?)`);
        return this.#kr
      }
      async #Mr() {
        const e = new Error("Execution context was destroyed");
        return await Re(Xt(this.#r, "context").pipe(ct(Xt(this.#r, "disposed").pipe(Le((() => {
          throw e
        }))), Ut(this.timeoutSettings.timeout()))))
      }
      async evaluateHandle(e, ...t) {
        e = Bt(this.evaluateHandle.name, e);
        let r = this.#xr();
        return r || (r = await this.#Mr()), await r.evaluateHandle(e, ...t)
      }
      async evaluate(e, ...t) {
        e = Bt(this.evaluate.name, e);
        let r = this.#xr();
        return r || (r = await this.#Mr()), await r.evaluate(e, ...t)
      }
      async adoptBackendNode(e) {
        let t = this.#xr();
        t || (t = await this.#Mr());
        const {
          object: r
        } = await this.client.send("DOM.resolveNode", {
          backendNodeId: e,
          executionContextId: t.id
        });
        return this.createCdpHandle(r)
      }
      async adoptHandle(e) {
        if (e.realm === this) return await e.evaluateHandle((e => e));
        const t = await this.client.send("DOM.describeNode", {
          objectId: e.id
        });
        return await this.adoptBackendNode(t.node.backendNodeId)
      }
      async transferHandle(e) {
        if (e.realm === this) return e;
        if (void 0 === e.remoteObject().objectId) return e;
        const t = await this.client.send("DOM.describeNode", {
            objectId: e.remoteObject().objectId
          }),
          r = await this.adoptBackendNode(t.node.backendNodeId);
        return await e.dispose(), r
      }
      createCdpHandle(e) {
        return "node" === e.subtype ? new Kn(this, e) : new Rn(this, e)
      } [ut]() {
        this.#kr?.[ut](), this.#r.emit("disposed", void 0), super[ut](), this.#r.removeAllListeners()
      }
    }
    const Vn = Symbol("mainWorld"),
      Xn = Symbol("puppeteerWorld"),
      Jn = new Map([
        ["load", "load"],
        ["domcontentloaded", "DOMContentLoaded"],
        ["networkidle0", "networkIdle"],
        ["networkidle2", "networkAlmostIdle"]
      ]);
    class Qn {
      #_r;
      #He;
      #fe;
      #Ir = null;
      #gt = new pt;
      #Pr;
      #Ar;
      #Fr = er.create();
      #Or = er.create();
      #Rr = er.create();
      #Lr;
      #Dr;
      #Nr;
      constructor(e, t, r, i, n) {
        Array.isArray(r) ? r = r.slice() : "string" == typeof r && (r = [r]), this.#Pr = t._loaderId, this.#_r = r.map((e => {
          const t = Jn.get(e);
          return bt(t, "Unknown value for options.waitUntil: " + e), t
        })), n?.addEventListener("abort", (() => {
          this.#Ar.reject(n.reason)
        })), this.#He = t, this.#fe = i;
        this.#gt.use(new ft(t._frameManager)).on(Gn.LifecycleEvent, this.#Br.bind(this));
        const s = this.#gt.use(new ft(t));
        s.on(gi.FrameNavigatedWithinDocument, this.#Kr.bind(this)), s.on(gi.FrameNavigated, this.#Hr.bind(this)), s.on(gi.FrameSwapped, this.#qr.bind(this)), s.on(gi.FrameSwappedByActivation, this.#qr.bind(this)), s.on(gi.FrameDetached, this.#jr.bind(this));
        const a = this.#gt.use(new ft(e));
        a.on(en.Request, this.#Ur.bind(this)), a.on(en.Response, this.#$r.bind(this)), a.on(en.RequestFailed, this.#Wr.bind(this)), this.#Ar = er.create({
          timeout: this.#fe,
          message: `Navigation timeout of ${this.#fe} ms exceeded`
        }), this.#Br()
      }
      #Ur(e) {
        e.frame() === this.#He && e.isNavigationRequest() && (this.#Ir = e, this.#Nr?.resolve(), this.#Nr = er.create(), null !== e.response() && this.#Nr?.resolve())
      }
      #Wr(e) {
        this.#Ir?.id === e.id && this.#Nr?.resolve()
      }
      #$r(e) {
        this.#Ir?.id === e.request().id && this.#Nr?.resolve()
      }
      #jr(e) {
        this.#He !== e ? this.#Br() : this.#Ar.resolve(new Error("Navigating frame was detached"))
      }
      async navigationResponse() {
        return await (this.#Nr?.valueOrThrow()), this.#Ir ? this.#Ir.response() : null
      }
      sameDocumentNavigationPromise() {
        return this.#Fr.valueOrThrow()
      }
      newDocumentNavigationPromise() {
        return this.#Rr.valueOrThrow()
      }
      lifecyclePromise() {
        return this.#Or.valueOrThrow()
      }
      terminationPromise() {
        return this.#Ar.valueOrThrow()
      }
      #Kr() {
        this.#Lr = !0, this.#Br()
      }
      #Hr(e) {
        if ("BackForwardCacheRestore" === e) return this.#qr();
        this.#Br()
      }
      #qr() {
        this.#Dr = !0, this.#Br()
      }
      #Br() {
        (function e(t, r) {
          for (const e of r)
            if (!t._lifecycleEvents.has(e)) return !1;
          for (const i of t.childFrames())
            if (i._hasStartedLoading && !e(i, r)) return !1;
          return !0
        })(this.#He, this.#_r) && (this.#Or.resolve(), this.#Lr && this.#Fr.resolve(void 0), (this.#Dr || this.#He._loaderId !== this.#Pr) && this.#Rr.resolve(void 0))
      }
      dispose() {
        this.#gt.dispose(), this.#Ar.resolve(new Error("LifecycleWatcher disposed"))
      }
    }
    var Yn = function (e, t, r) {
        for (var i = arguments.length > 2, n = 0; n < t.length; n++) r = i ? t[n].call(e, r) : t[n].call(e);
        return i ? r : void 0
      },
      Zn = function (e, t, r, i, n, s) {
        function a(e) {
          if (void 0 !== e && "function" != typeof e) throw new TypeError("Function expected");
          return e
        }
        for (var o, c = i.kind, l = "getter" === c ? "get" : "setter" === c ? "set" : "value", d = !t && e ? i.static ? e : e.prototype : null, u = t || (d ? Object.getOwnPropertyDescriptor(d, i.name) : {}), h = !1, p = r.length - 1; p >= 0; p--) {
          var m = {};
          for (var f in i) m[f] = "access" === f ? {} : i[f];
          for (var f in i.access) m.access[f] = i.access[f];
          m.addInitializer = function (e) {
            if (h) throw new TypeError("Cannot add initializers after decoration has completed");
            s.push(a(e || null))
          };
          var g = (0, r[p])("accessor" === c ? {
            get: u.get,
            set: u.set
          } : u[l], m);
          if ("accessor" === c) {
            if (void 0 === g) continue;
            if (null === g || "object" != typeof g) throw new TypeError("Object expected");
            (o = a(g.get)) && (u.get = o), (o = a(g.set)) && (u.set = o), (o = a(g.init)) && n.unshift(o)
          } else(o = a(g)) && ("field" === c ? n.unshift(o) : u[l] = o)
        }
        d && Object.defineProperty(d, i.name, u), h = !0
      };
    let es = (() => {
      let e, t, r, i, n, s, a, o = Si,
        c = [];
      return class extends o {
        static {
          const l = "function" == typeof Symbol && Symbol.metadata ? Object.create(o[Symbol.metadata] ?? null) : void 0;
          Zn(this, null, e, {
            kind: "method",
            name: "goto",
            static: !1,
            private: !1,
            access: {
              has: e => "goto" in e,
              get: e => e.goto
            },
            metadata: l
          }, null, c), Zn(this, null, t, {
            kind: "method",
            name: "waitForNavigation",
            static: !1,
            private: !1,
            access: {
              has: e => "waitForNavigation" in e,
              get: e => e.waitForNavigation
            },
            metadata: l
          }, null, c), Zn(this, null, r, {
            kind: "method",
            name: "setContent",
            static: !1,
            private: !1,
            access: {
              has: e => "setContent" in e,
              get: e => e.setContent
            },
            metadata: l
          }, null, c), Zn(this, null, i, {
            kind: "method",
            name: "addPreloadScript",
            static: !1,
            private: !1,
            access: {
              has: e => "addPreloadScript" in e,
              get: e => e.addPreloadScript
            },
            metadata: l
          }, null, c), Zn(this, null, n, {
            kind: "method",
            name: "addExposedFunctionBinding",
            static: !1,
            private: !1,
            access: {
              has: e => "addExposedFunctionBinding" in e,
              get: e => e.addExposedFunctionBinding
            },
            metadata: l
          }, null, c), Zn(this, null, s, {
            kind: "method",
            name: "removeExposedFunctionBinding",
            static: !1,
            private: !1,
            access: {
              has: e => "removeExposedFunctionBinding" in e,
              get: e => e.removeExposedFunctionBinding
            },
            metadata: l
          }, null, c), Zn(this, null, a, {
            kind: "method",
            name: "waitForDevicePrompt",
            static: !1,
            private: !1,
            access: {
              has: e => "waitForDevicePrompt" in e,
              get: e => e.waitForDevicePrompt
            },
            metadata: l
          }, null, c), l && Object.defineProperty(this, Symbol.metadata, {
            enumerable: !0,
            configurable: !0,
            writable: !0,
            value: l
          })
        }
        #Se = (Yn(this, c), "");
        #it = !1;
        #ht;
        _frameManager;
        _loaderId = "";
        _lifecycleEvents = new Set;
        _id;
        _parentId;
        accessibility;
        worlds;
        constructor(e, t, r, i) {
          super(), this._frameManager = e, this.#Se = "", this._id = t, this._parentId = r, this.#it = !1, this.#ht = i, this._loaderId = "", this.worlds = {
            [Vn]: new zn(this, this._frameManager.timeoutSettings),
            [Xn]: new zn(this, this._frameManager.timeoutSettings)
          }, this.accessibility = new Yi(this.worlds[Vn], t), this.on(gi.FrameSwappedByActivation, (() => {
            this._onLoadingStarted(), this._onLoadingStopped()
          })), this.worlds[Vn].emitter.on("consoleapicalled", this.#Gr.bind(this)), this.worlds[Vn].emitter.on("bindingcalled", this.#zr.bind(this))
        }
        #Gr(e) {
          this._frameManager.emit(Gn.ConsoleApiCalled, [this.worlds[Vn], e])
        }
        #zr(e) {
          this._frameManager.emit(Gn.BindingCalled, [this.worlds[Vn], e])
        }
        _client() {
          return this.#ht
        }
        updateId(e) {
          this._id = e
        }
        updateClient(e) {
          this.#ht = e
        }
        page() {
          return this._frameManager.page()
        }
        async goto(e, t = {}) {
          const {
            referer: r = this._frameManager.networkManager.extraHTTPHeaders().referer,
            referrerPolicy: i = this._frameManager.networkManager.extraHTTPHeaders()["referer-policy"],
            waitUntil: n = ["load"],
            timeout: s = this._frameManager.timeoutSettings.navigationTimeout()
          } = t;
          let a = !1;
          const o = new Qn(this._frameManager.networkManager, this, n, s);
          let c = await er.race([async function (e, t, r, i, n) {
            try {
              const s = await e.send("Page.navigate", {
                url: t,
                referrer: r,
                frameId: n,
                referrerPolicy: i
              });
              return a = !!s.loaderId, "net::ERR_HTTP_RESPONSE_CODE_FAILURE" === s.errorText ? null : s.errorText ? new Error(`${s.errorText} at ${t}`) : null
            } catch (e) {
              if (ar(e)) return e;
              throw e
            }
          }(this.#ht, e, r, i, this._id), o.terminationPromise()]);
          c || (c = await er.race([o.terminationPromise(), a ? o.newDocumentNavigationPromise() : o.sameDocumentNavigationPromise()]));
          try {
            if (c) throw c;
            return await o.navigationResponse()
          } finally {
            o.dispose()
          }
        }
        async waitForNavigation(e = {}) {
          const {
            waitUntil: t = ["load"],
            timeout: r = this._frameManager.timeoutSettings.navigationTimeout(),
            signal: i
          } = e, n = new Qn(this._frameManager.networkManager, this, t, r, i), s = await er.race([n.terminationPromise(), ...e.ignoreSameDocumentNavigation ? [] : [n.sameDocumentNavigationPromise()], n.newDocumentNavigationPromise()]);
          try {
            if (s) throw s;
            const e = await er.race([n.terminationPromise(), n.navigationResponse()]);
            if (e instanceof Error) throw s;
            return e || null
          } finally {
            n.dispose()
          }
        }
        get client() {
          return this.#ht
        }
        mainRealm() {
          return this.worlds[Vn]
        }
        isolatedRealm() {
          return this.worlds[Xn]
        }
        async setContent(e, t = {}) {
          const {
            waitUntil: r = ["load"],
            timeout: i = this._frameManager.timeoutSettings.navigationTimeout()
          } = t;
          await this.setFrameContent(e);
          const n = new Qn(this._frameManager.networkManager, this, r, i),
            s = await er.race([n.terminationPromise(), n.lifecyclePromise()]);
          if (n.dispose(), s) throw s
        }
        url() {
          return this.#Se
        }
        parentFrame() {
          return this._frameManager._frameTree.parentFrame(this._id) || null
        }
        childFrames() {
          return this._frameManager._frameTree.childFrames(this._id)
        }
        #Vr() {
          return this._frameManager._deviceRequestPromptManager(this.#ht)
        }
        async addPreloadScript(e) {
          const t = this.parentFrame();
          if (t && this.#ht === t.client) return;
          if (e.getIdForFrame(this)) return;
          const {
            identifier: r
          } = await this.#ht.send("Page.addScriptToEvaluateOnNewDocument", {
            source: e.source
          });
          e.setIdForFrame(this, r)
        }
        async addExposedFunctionBinding(e) {
          (this === this._frameManager.mainFrame() || this._hasStartedLoading) && await Promise.all([this.#ht.send("Runtime.addBinding", {
            name: On + e.name
          }), this.evaluate(e.initSource).catch(Rt)])
        }
        async removeExposedFunctionBinding(e) {
          (this === this._frameManager.mainFrame() || this._hasStartedLoading) && await Promise.all([this.#ht.send("Runtime.removeBinding", {
            name: On + e.name
          }), this.evaluate((e => {
            globalThis[e] = void 0
          }), e.name).catch(Rt)])
        }
        async waitForDevicePrompt(e = {}) {
          return await this.#Vr().waitForDevicePrompt(e)
        }
        _navigated(e) {
          this._name = e.name, this.#Se = `${e.url}${e.urlFragment||""}`
        }
        _navigatedWithinDocument(e) {
          this.#Se = e
        }
        _onLifecycleEvent(e, t) {
          "init" === t && (this._loaderId = e, this._lifecycleEvents.clear()), this._lifecycleEvents.add(t)
        }
        _onLoadingStopped() {
          this._lifecycleEvents.add("DOMContentLoaded"), this._lifecycleEvents.add("load")
        }
        _onLoadingStarted() {
          this._hasStartedLoading = !0
        }
        get detached() {
          return this.#it
        } [(e = [ki], t = [ki], r = [ki], i = [ki], n = [ki], s = [ki], a = [ki], ut)]() {
          this.#it || (this.#it = !0, this.worlds[Vn][ut](), this.worlds[Xn][ut]())
        }
        exposeFunction() {
          throw new At
        }
        async frameElement() {
          const e = this.parentFrame();
          if (!e) return null;
          const {
            backendNodeId: t
          } = await e.client.send("DOM.getFrameOwner", {
            frameId: this._id
          });
          return await e.mainRealm().adoptBackendNode(t)
        }
      }
    })();
    class ts {
      #Xr = new Map;
      #Jr = new Map;
      #Qr = new Map;
      #Yr;
      #Zr = !1;
      #ei = new Map;
      getMainFrame() {
        return this.#Yr
      }
      getById(e) {
        return this.#Xr.get(e)
      }
      waitForFrame(e) {
        const t = this.getById(e);
        if (t) return Promise.resolve(t);
        const r = er.create();
        return (this.#ei.get(e) || new Set).add(r), r.valueOrThrow()
      }
      frames() {
        return Array.from(this.#Xr.values())
      }
      addFrame(e) {
        this.#Xr.set(e._id, e), e._parentId ? (this.#Jr.set(e._id, e._parentId), this.#Qr.has(e._parentId) || this.#Qr.set(e._parentId, new Set), this.#Qr.get(e._parentId).add(e._id)) : this.#Yr && !this.#Zr || (this.#Yr = e, this.#Zr = !1), this.#ei.get(e._id)?.forEach((t => t.resolve(e)))
      }
      removeFrame(e) {
        this.#Xr.delete(e._id), this.#Jr.delete(e._id), e._parentId ? this.#Qr.get(e._parentId)?.delete(e._id) : this.#Zr = !0
      }
      childFrames(e) {
        const t = this.#Qr.get(e);
        return t ? Array.from(t).map((e => this.getById(e))).filter((e => void 0 !== e)) : []
      }
      parentFrame(e) {
        const t = this.#Jr.get(e);
        return t ? this.getById(t) : void 0
      }
    }
    class rs extends Ti {
      id;
      #ht;
      #ti;
      #Se;
      #ri;
      #ii;
      #ni = !1;
      #si;
      #ai = {};
      #He;
      #oi;
      get client() {
        return this.#ht
      }
      set client(e) {
        this.#ht = e
      }
      constructor(e, t, r, i, n, s) {
        super(), this.#ht = e, this.id = n.requestId, this.#ti = n.requestId === n.loaderId && "Document" === n.type, this._interceptionId = r, this.#Se = n.request.url + (n.request.urlFragment ?? ""), this.#ri = (n.type || "other").toLowerCase(), this.#ii = n.request.method, this.#si = n.request.postData, this.#ni = n.request.hasPostData ?? !1, this.#He = t, this._redirectChain = s, this.#oi = n.initiator, this.interception.enabled = i;
        for (const [e, t] of Object.entries(n.request.headers)) this.#ai[e.toLowerCase()] = t
      }
      url() {
        return this.#Se
      }
      resourceType() {
        return this.#ri
      }
      method() {
        return this.#ii
      }
      postData() {
        return this.#si
      }
      hasPostData() {
        return this.#ni
      }
      async fetchPostData() {
        try {
          return (await this.#ht.send("Network.getRequestPostData", {
            requestId: this.id
          })).postData
        } catch (e) {
          return void Rt(e)
        }
      }
      headers() {
        return this.#ai
      }
      response() {
        return this._response
      }
      frame() {
        return this.#He
      }
      isNavigationRequest() {
        return this.#ti
      }
      initiator() {
        return this.#oi
      }
      redirectChain() {
        return this._redirectChain.slice()
      }
      failure() {
        return this._failureText ? {
          errorText: this._failureText
        } : null
      }
      async _continue(e = {}) {
        const {
          url: t,
          method: r,
          postData: i,
          headers: n
        } = e;
        this.interception.handled = !0;
        const s = i ? (a = i, St((new TextEncoder).encode(a))) : void 0;
        var a;
        if (void 0 === this._interceptionId) throw new Error("HTTPRequest is missing _interceptionId needed for Fetch.continueRequest");
        await this.#ht.send("Fetch.continueRequest", {
          requestId: this._interceptionId,
          url: t,
          method: r,
          postData: s,
          headers: n ? Ci(n) : void 0
        }).catch((e => (this.interception.handled = !1, _i(e))))
      }
      async _respond(e) {
        let t;
        this.interception.handled = !0, e.body && (t = Ti.getResponse(e.body));
        const r = {};
        if (e.headers)
          for (const t of Object.keys(e.headers)) {
            const i = e.headers[t];
            r[t.toLowerCase()] = Array.isArray(i) ? i.map((e => String(e))) : String(i)
          }
        e.contentType && (r["content-type"] = e.contentType), t?.contentLength && !("content-length" in r) && (r["content-length"] = String(t.contentLength));
        const i = e.status || 200;
        if (void 0 === this._interceptionId) throw new Error("HTTPRequest is missing _interceptionId needed for Fetch.fulfillRequest");
        await this.#ht.send("Fetch.fulfillRequest", {
          requestId: this._interceptionId,
          responseCode: i,
          responsePhrase: xi[i],
          responseHeaders: Ci(r),
          body: t?.base64
        }).catch((e => (this.interception.handled = !1, _i(e))))
      }
      async _abort(e) {
        if (this.interception.handled = !0, void 0 === this._interceptionId) throw new Error("HTTPRequest is missing _interceptionId needed for Fetch.failRequest");
        await this.#ht.send("Fetch.failRequest", {
          requestId: this._interceptionId,
          errorReason: e || "Failed"
        }).catch(_i)
      }
    }
    class is {
      #ci;
      #li;
      #di;
      #ui;
      #hi;
      #pi;
      constructor(e) {
        this.#ci = e.subjectName, this.#li = e.issuer, this.#di = e.validFrom, this.#ui = e.validTo, this.#hi = e.protocol, this.#pi = e.sanList
      }
      issuer() {
        return this.#li
      }
      validFrom() {
        return this.#di
      }
      validTo() {
        return this.#ui
      }
      protocol() {
        return this.#hi
      }
      subjectName() {
        return this.#ci
      }
      subjectAlternativeNames() {
        return this.#pi
      }
    }
    class ns extends Pi {
      #mi;
      #fi = null;
      #gi = er.create();
      #yi;
      #wi;
      #vi;
      #bi;
      #ki;
      #ai = {};
      #Si;
      #Ti;
      constructor(e, t, r) {
        super(), this.#mi = e, this.#yi = {
          ip: t.remoteIPAddress,
          port: t.remotePort
        }, this.#vi = this.#Ei(r) || t.statusText, this.#bi = !!t.fromDiskCache, this.#ki = !!t.fromServiceWorker, this.#wi = r ? r.statusCode : t.status;
        const i = r ? r.headers : t.headers;
        for (const [e, t] of Object.entries(i)) this.#ai[e.toLowerCase()] = t;
        this.#Si = t.securityDetails ? new is(t.securityDetails) : null, this.#Ti = t.timing || null
      }
      #Ei(e) {
        if (!e || !e.headersText) return;
        const t = e.headersText.split("\r", 1)[0];
        if (!t || t.length > 1e3) return;
        const r = t.match(/[^ ]* [^ ]* (.*)/);
        if (!r) return;
        const i = r[1];
        return i || void 0
      }
      _resolveBody(e) {
        return e ? this.#gi.reject(e) : this.#gi.resolve()
      }
      remoteAddress() {
        return this.#yi
      }
      url() {
        return this.#mi.url()
      }
      status() {
        return this.#wi
      }
      statusText() {
        return this.#vi
      }
      headers() {
        return this.#ai
      }
      securityDetails() {
        return this.#Si
      }
      timing() {
        return this.#Ti
      }
      content() {
        return this.#fi || (this.#fi = this.#gi.valueOrThrow().then((async () => {
          try {
            const e = await this.#mi.client.send("Network.getResponseBody", {
              requestId: this.#mi.id
            });
            return kt(e.body, e.base64Encoded)
          } catch (e) {
            if (e instanceof Pt && "No resource with given identifier found" === e.originalMessage) throw new Pt("Could not load body for this request. This might happen if the request is a preflight request.");
            throw e
          }
        }))), this.#fi
      }
      request() {
        return this.#mi
      }
      fromCache() {
        return this.#bi || this.#mi._fromMemoryCache
      }
      fromServiceWorker() {
        return this.#ki
      }
      frame() {
        return this.#mi.frame()
      }
    }
    class ss {
      #Ci = new Map;
      #xi = new Map;
      #Mi = new Map;
      #_i = new Map;
      #Ii = new Map;
      #Pi = new Map;
      forget(e) {
        this.#Ci.delete(e), this.#xi.delete(e), this.#Pi.delete(e), this.#Ii.delete(e), this.#_i.delete(e)
      }
      responseExtraInfo(e) {
        return this.#_i.has(e) || this.#_i.set(e, []), this.#_i.get(e)
      }
      queuedRedirectInfo(e) {
        return this.#Ii.has(e) || this.#Ii.set(e, []), this.#Ii.get(e)
      }
      queueRedirectInfo(e, t) {
        this.queuedRedirectInfo(e).push(t)
      }
      takeQueuedRedirectInfo(e) {
        return this.queuedRedirectInfo(e).shift()
      }
      inFlightRequestsCount() {
        let e = 0;
        for (const t of this.#Mi.values()) t.response() || e++;
        return e
      }
      storeRequestWillBeSent(e, t) {
        this.#Ci.set(e, t)
      }
      getRequestWillBeSent(e) {
        return this.#Ci.get(e)
      }
      forgetRequestWillBeSent(e) {
        this.#Ci.delete(e)
      }
      getRequestPaused(e) {
        return this.#xi.get(e)
      }
      forgetRequestPaused(e) {
        this.#xi.delete(e)
      }
      storeRequestPaused(e, t) {
        this.#xi.set(e, t)
      }
      getRequest(e) {
        return this.#Mi.get(e)
      }
      storeRequest(e, t) {
        this.#Mi.set(e, t)
      }
      forgetRequest(e) {
        this.#Mi.delete(e)
      }
      getQueuedEventGroup(e) {
        return this.#Pi.get(e)
      }
      queueEventGroup(e, t) {
        this.#Pi.set(e, t)
      }
      forgetQueuedEventGroup(e) {
        this.#Pi.delete(e)
      }
      printState() {}
    }
    class as extends ft {
      #ur;
      #Ai = new ss;
      #Fi;
      #Oi = null;
      #Ri = new Set;
      #Li = !1;
      #Di = !1;
      #Ni;
      #Bi;
      #Ki;
      #Hi;
      #i = [
        ["Fetch.requestPaused", this.#qi],
        ["Fetch.authRequired", this.#ji],
        ["Network.requestWillBeSent", this.#Ui],
        ["Network.requestServedFromCache", this.#$i],
        ["Network.responseReceived", this.#Wi],
        ["Network.loadingFinished", this.#Gi],
        ["Network.loadingFailed", this.#zi],
        ["Network.responseReceivedExtraInfo", this.#Vi],
        [ir.Disconnected, this.#Xi]
      ];
      #Ji = new Map;
      constructor(e) {
        super(), this.#ur = e
      }
      async addClient(e) {
        if (this.#Ji.has(e)) return;
        const t = new pt;
        this.#Ji.set(e, t);
        const r = t.use(new ft(e));
        for (const [t, i] of this.#i) r.on(t, (t => i.bind(this)(e, t)));
        await Promise.all([e.send("Network.enable"), this.#Qi(e), this.#Yi(e), this.#Zi(e), this.#en(e), this.#tn(e)])
      }
      async #Xi(e) {
        this.#Ji.get(e)?.dispose(), this.#Ji.delete(e)
      }
      async authenticate(e) {
        this.#Oi = e;
        const t = this.#Li || !!this.#Oi;
        t !== this.#Di && (this.#Di = t, await this.#rn(this.#en.bind(this)))
      }
      async setExtraHTTPHeaders(e) {
        const t = {};
        for (const [r, i] of Object.entries(e)) bt(Kt(i), `Expected value of header "${r}" to be String, but "${typeof i}" is found.`), t[r.toLowerCase()] = i;
        this.#Fi = t, await this.#rn(this.#Qi.bind(this))
      }
      async #Qi(e) {
        void 0 !== this.#Fi && await e.send("Network.setExtraHTTPHeaders", {
          headers: this.#Fi
        })
      }
      extraHTTPHeaders() {
        return Object.assign({}, this.#Fi)
      }
      inFlightRequestsCount() {
        return this.#Ai.inFlightRequestsCount()
      }
      async setOfflineMode(e) {
        this.#Bi || (this.#Bi = {
          offline: !1,
          upload: -1,
          download: -1,
          latency: 0
        }), this.#Bi.offline = e, await this.#rn(this.#Yi.bind(this))
      }
      async emulateNetworkConditions(e) {
        this.#Bi || (this.#Bi = {
          offline: !1,
          upload: -1,
          download: -1,
          latency: 0
        }), this.#Bi.upload = e ? e.upload : -1, this.#Bi.download = e ? e.download : -1, this.#Bi.latency = e ? e.latency : 0, await this.#rn(this.#Yi.bind(this))
      }
      async #rn(e) {
        await Promise.all(Array.from(this.#Ji.keys()).map((t => e(t))))
      }
      async #Yi(e) {
        void 0 !== this.#Bi && await e.send("Network.emulateNetworkConditions", {
          offline: this.#Bi.offline,
          latency: this.#Bi.latency,
          uploadThroughput: this.#Bi.upload,
          downloadThroughput: this.#Bi.download
        })
      }
      async setUserAgent(e, t) {
        this.#Ki = e, this.#Hi = t, await this.#rn(this.#tn.bind(this))
      }
      async #tn(e) {
        void 0 !== this.#Ki && await e.send("Network.setUserAgentOverride", {
          userAgent: this.#Ki,
          userAgentMetadata: this.#Hi
        })
      }
      async setCacheEnabled(e) {
        this.#Ni = !e, await this.#rn(this.#Zi.bind(this))
      }
      async setRequestInterception(e) {
        this.#Li = e;
        const t = this.#Li || !!this.#Oi;
        t !== this.#Di && (this.#Di = t, await this.#rn(this.#en.bind(this)))
      }
      async #en(e) {
        void 0 === this.#Ni && (this.#Ni = !1), this.#Di ? await Promise.all([this.#Zi(e), e.send("Fetch.enable", {
          handleAuthRequests: !0,
          patterns: [{
            urlPattern: "*"
          }]
        })]) : await Promise.all([this.#Zi(e), e.send("Fetch.disable")])
      }
      async #Zi(e) {
        void 0 !== this.#Ni && await e.send("Network.setCacheDisabled", {
          cacheDisabled: this.#Ni
        })
      }
      #Ui(e, t) {
        if (!this.#Li || t.request.url.startsWith("data:")) this.#Ur(e, t, void 0);
        else {
          const {
            requestId: r
          } = t;
          this.#Ai.storeRequestWillBeSent(r, t);
          const i = this.#Ai.getRequestPaused(r);
          if (i) {
            const {
              requestId: n
            } = i;
            this.#in(t, i), this.#Ur(e, t, n), this.#Ai.forgetRequestPaused(r)
          }
        }
      }
      #ji(e, t) {
        let r = "Default";
        this.#Ri.has(t.requestId) ? r = "CancelAuth" : this.#Oi && (r = "ProvideCredentials", this.#Ri.add(t.requestId));
        const {
          username: i,
          password: n
        } = this.#Oi || {
          username: void 0,
          password: void 0
        };
        e.send("Fetch.continueWithAuth", {
          requestId: t.requestId,
          authChallengeResponse: {
            response: r,
            username: i,
            password: n
          }
        }).catch(Rt)
      }
      #qi(e, t) {
        !this.#Li && this.#Di && e.send("Fetch.continueRequest", {
          requestId: t.requestId
        }).catch(Rt);
        const {
          networkId: r,
          requestId: i
        } = t;
        if (!r) return void this.#nn(e, t);
        const n = (() => {
          const e = this.#Ai.getRequestWillBeSent(r);
          if (!e || e.request.url === t.request.url && e.request.method === t.request.method) return e;
          this.#Ai.forgetRequestWillBeSent(r)
        })();
        n ? (this.#in(n, t), this.#Ur(e, n, i)) : this.#Ai.storeRequestPaused(r, t)
      }
      #in(e, t) {
        e.request.headers = {
          ...e.request.headers,
          ...t.request.headers
        }
      }
      #nn(e, t) {
        const r = t.frameId ? this.#ur.frame(t.frameId) : null,
          i = new rs(e, r, t.requestId, this.#Li, t, []);
        this.emit(en.Request, i), i.finalizeInterceptions()
      }
      #Ur(e, t, r, i = !1) {
        let n = [];
        if (t.redirectResponse) {
          let i = null;
          if (t.redirectHasExtraInfo && (i = this.#Ai.responseExtraInfo(t.requestId).shift(), !i)) return void this.#Ai.queueRedirectInfo(t.requestId, {
            event: t,
            fetchRequestId: r
          });
          const s = this.#Ai.getRequest(t.requestId);
          s && (this.#sn(e, s, t.redirectResponse, i), n = s._redirectChain)
        }
        const s = t.frameId ? this.#ur.frame(t.frameId) : null,
          a = new rs(e, s, r, this.#Li, t, n);
        a._fromMemoryCache = i, this.#Ai.storeRequest(t.requestId, a), this.emit(en.Request, a), a.finalizeInterceptions()
      }
      #$i(e, t) {
        const r = this.#Ai.getRequestWillBeSent(t.requestId);
        let i = this.#Ai.getRequest(t.requestId);
        i && (i._fromMemoryCache = !0), !i && r && (this.#Ur(e, r, void 0, !0), i = this.#Ai.getRequest(t.requestId)), i ? this.emit(en.RequestServedFromCache, i) : Rt(new Error(`Request ${t.requestId} was served from cache but we could not find the corresponding request object`))
      }
      #sn(e, t, r, i) {
        const n = new ns(t, r, i);
        t._response = n, t._redirectChain.push(t), n._resolveBody(new Error("Response body is unavailable for redirect responses")), this.#an(t, !1), this.emit(en.Response, n), this.emit(en.RequestFinished, t)
      }
      #on(e, t, r) {
        const i = this.#Ai.getRequest(t.requestId);
        if (!i) return;
        this.#Ai.responseExtraInfo(t.requestId).length && Rt(new Error("Unexpected extraInfo events for request " + t.requestId)), t.response.fromDiskCache && (r = null);
        const n = new ns(i, t.response, r);
        i._response = n, this.emit(en.Response, n)
      }
      #Wi(e, t) {
        const r = this.#Ai.getRequest(t.requestId);
        let i = null;
        !r || r._fromMemoryCache || !t.hasExtraInfo || (i = this.#Ai.responseExtraInfo(t.requestId).shift(), i) ? this.#on(e, t, i) : this.#Ai.queueEventGroup(t.requestId, {
          responseReceivedEvent: t
        })
      }
      #Vi(e, t) {
        const r = this.#Ai.takeQueuedRedirectInfo(t.requestId);
        if (r) return this.#Ai.responseExtraInfo(t.requestId).push(t), void this.#Ur(e, r.event, r.fetchRequestId);
        const i = this.#Ai.getQueuedEventGroup(t.requestId);
        if (i) return this.#Ai.forgetQueuedEventGroup(t.requestId), this.#on(e, i.responseReceivedEvent, t), i.loadingFinishedEvent && this.#cn(e, i.loadingFinishedEvent), void(i.loadingFailedEvent && this.#ln(e, i.loadingFailedEvent));
        this.#Ai.responseExtraInfo(t.requestId).push(t)
      }
      #an(e, t) {
        const r = e.id,
          i = e._interceptionId;
        this.#Ai.forgetRequest(r), void 0 !== i && this.#Ri.delete(i), t && this.#Ai.forget(r)
      }
      #Gi(e, t) {
        const r = this.#Ai.getQueuedEventGroup(t.requestId);
        r ? r.loadingFinishedEvent = t : this.#cn(e, t)
      }
      #cn(e, t) {
        const r = this.#Ai.getRequest(t.requestId);
        r && (this.#dn(e, r), r.response() && r.response()?._resolveBody(), this.#an(r, !0), this.emit(en.RequestFinished, r))
      }
      #zi(e, t) {
        const r = this.#Ai.getQueuedEventGroup(t.requestId);
        r ? r.loadingFailedEvent = t : this.#ln(e, t)
      }
      #ln(e, t) {
        const r = this.#Ai.getRequest(t.requestId);
        if (!r) return;
        this.#dn(e, r), r._failureText = t.errorText;
        const i = r.response();
        i && i._resolveBody(), this.#an(r, !0), this.emit(en.RequestFailed, r)
      }
      #dn(e, t) {
        e !== t.client && t.isNavigationRequest() && (t.client = e)
      }
    }
    class os extends ft {
      #un;
      #hn;
      #ir;
      #pn = new Set;
      #ht;
      #mn = new Map;
      #fr = new Set;
      _frameTree = new ts;
      #fn = new Set;
      #gn = new WeakMap;
      #yn;
      get timeoutSettings() {
        return this.#ir
      }
      get networkManager() {
        return this.#hn
      }
      get client() {
        return this.#ht
      }
      constructor(e, t, r) {
        super(), this.#ht = e, this.#un = t, this.#hn = new as(this), this.#ir = r, this.setupEventListeners(this.#ht), e.once(ir.Disconnected, (() => {
          this.#wn().catch(Rt)
        }))
      }
      async #wn() {
        const e = this._frameTree.getMainFrame();
        if (!e) return;
        if (!this.#un.browser().connected) return void this.#vn(e);
        for (const t of e.childFrames()) this.#vn(t);
        const t = er.create({
          timeout: 100,
          message: "Frame was not swapped"
        });
        e.once(gi.FrameSwappedByActivation, (() => {
          t.resolve()
        }));
        try {
          await t.valueOrThrow()
        } catch {
          this.#vn(e)
        }
      }
      async swapFrameTree(e) {
        this.#ht = e;
        const t = this._frameTree.getMainFrame();
        t && (this.#fn.add(this.#ht.target()._targetId), this._frameTree.removeFrame(t), t.updateId(this.#ht.target()._targetId), this._frameTree.addFrame(t), t.updateClient(e)), this.setupEventListeners(e), e.once(ir.Disconnected, (() => {
          this.#wn().catch(Rt)
        })), await this.initialize(e, t), await this.#hn.addClient(e), t && t.emit(gi.FrameSwappedByActivation, void 0)
      }
      async registerSpeculativeSession(e) {
        await this.#hn.addClient(e)
      }
      setupEventListeners(e) {
        e.on("Page.frameAttached", (async t => {
          await (this.#yn?.valueOrThrow()), this.#bn(e, t.frameId, t.parentFrameId)
        })), e.on("Page.frameNavigated", (async e => {
          this.#fn.add(e.frame.id), await (this.#yn?.valueOrThrow()), this.#kn(e.frame, e.type)
        })), e.on("Page.navigatedWithinDocument", (async e => {
          await (this.#yn?.valueOrThrow()), this.#Sn(e.frameId, e.url)
        })), e.on("Page.frameDetached", (async e => {
          await (this.#yn?.valueOrThrow()), this.#jr(e.frameId, e.reason)
        })), e.on("Page.frameStartedLoading", (async e => {
          await (this.#yn?.valueOrThrow()), this.#Tn(e.frameId)
        })), e.on("Page.frameStoppedLoading", (async e => {
          await (this.#yn?.valueOrThrow()), this.#En(e.frameId)
        })), e.on("Runtime.executionContextCreated", (async t => {
          await (this.#yn?.valueOrThrow()), this.#Cn(t.context, e)
        })), e.on("Page.lifecycleEvent", (async e => {
          await (this.#yn?.valueOrThrow()), this.#xn(e)
        }))
      }
      async initialize(e, t) {
        try {
          this.#yn?.resolve(), this.#yn = er.create(), await Promise.all([this.#hn.addClient(e), e.send("Page.enable"), e.send("Page.getFrameTree").then((({
            frameTree: t
          }) => {
            this.#Mn(e, t), this.#yn?.resolve()
          })), e.send("Page.setLifecycleEventsEnabled", {
            enabled: !0
          }), e.send("Runtime.enable").then((() => this.#_n(e, $t))), ...(t ? Array.from(this.#mn.values()) : []).map((e => t?.addPreloadScript(e))), ...(t ? Array.from(this.#fr.values()) : []).map((e => t?.addExposedFunctionBinding(e)))])
        } catch (e) {
          if (this.#yn?.resolve(), ar(e) && pn(e)) return;
          throw e
        }
      }
      page() {
        return this.#un
      }
      mainFrame() {
        const e = this._frameTree.getMainFrame();
        return bt(e, "Requesting main frame too early!"), e
      }
      frames() {
        return Array.from(this._frameTree.frames())
      }
      frame(e) {
        return this._frameTree.getById(e) || null
      }
      async addExposedFunctionBinding(e) {
        this.#fr.add(e), await Promise.all(this.frames().map((async t => await t.addExposedFunctionBinding(e))))
      }
      async removeExposedFunctionBinding(e) {
        this.#fr.delete(e), await Promise.all(this.frames().map((async t => await t.removeExposedFunctionBinding(e))))
      }
      async evaluateOnNewDocument(e) {
        const {
          identifier: t
        } = await this.mainFrame()._client().send("Page.addScriptToEvaluateOnNewDocument", {
          source: e
        }), r = new Cn(this.mainFrame(), t, e);
        return this.#mn.set(t, r), await Promise.all(this.frames().map((async e => await e.addPreloadScript(r)))), {
          identifier: t
        }
      }
      async removeScriptToEvaluateOnNewDocument(e) {
        const t = this.#mn.get(e);
        if (!t) throw new Error(`Script to evaluate on new document with id ${e} not found`);
        this.#mn.delete(e), await Promise.all(this.frames().map((e => {
          const r = t.getIdForFrame(e);
          if (r) return e._client().send("Page.removeScriptToEvaluateOnNewDocument", {
            identifier: r
          }).catch(Rt)
        })))
      }
      onAttachedToTarget(e) {
        if ("iframe" !== e._getTargetInfo().type) return;
        const t = this.frame(e._getTargetInfo().targetId);
        t && t.updateClient(e._session()), this.setupEventListeners(e._session()), this.initialize(e._session(), t)
      }
      _deviceRequestPromptManager(e) {
        let t = this.#gn.get(e);
        return void 0 === t && (t = new _n(e, this.#ir), this.#gn.set(e, t)), t
      }
      #xn(e) {
        const t = this.frame(e.frameId);
        t && (t._onLifecycleEvent(e.loaderId, e.name), this.emit(Gn.LifecycleEvent, t), t.emit(gi.LifecycleEvent, void 0))
      }
      #Tn(e) {
        const t = this.frame(e);
        t && t._onLoadingStarted()
      }
      #En(e) {
        const t = this.frame(e);
        t && (t._onLoadingStopped(), this.emit(Gn.LifecycleEvent, t), t.emit(gi.LifecycleEvent, void 0))
      }
      #Mn(e, t) {
        if (t.frame.parentId && this.#bn(e, t.frame.id, t.frame.parentId), this.#fn.has(t.frame.id) ? this.#fn.delete(t.frame.id) : this.#kn(t.frame, "Navigation"), t.childFrames)
          for (const r of t.childFrames) this.#Mn(e, r)
      }
      #bn(e, t, r) {
        let i = this.frame(t);
        if (i) {
          const t = this.frame(r);
          e && t && i.client !== t?.client && i.updateClient(e)
        } else i = new es(this, t, r, e), this._frameTree.addFrame(i), this.emit(Gn.FrameAttached, i)
      }
      async #kn(e, t) {
        const r = e.id,
          i = !e.parentId;
        let n = this._frameTree.getById(r);
        if (n)
          for (const e of n.childFrames()) this.#vn(e);
        i && (n ? (this._frameTree.removeFrame(n), n._id = r) : n = new es(this, r, void 0, this.#ht), this._frameTree.addFrame(n)), n = await this._frameTree.waitForFrame(r), n._navigated(e), this.emit(Gn.FrameNavigated, n), n.emit(gi.FrameNavigated, t)
      }
      async #_n(e, t) {
        const r = `${e.id()}:${t}`;
        this.#pn.has(r) || (await e.send("Page.addScriptToEvaluateOnNewDocument", {
          source: `//# sourceURL=${Nt.INTERNAL_URL}`,
          worldName: t
        }), await Promise.all(this.frames().filter((t => t.client === e)).map((r => e.send("Page.createIsolatedWorld", {
          frameId: r._id,
          worldName: t,
          grantUniveralAccess: !0
        }).catch(Rt)))), this.#pn.add(r))
      }
      #Sn(e, t) {
        const r = this.frame(e);
        r && (r._navigatedWithinDocument(t), this.emit(Gn.FrameNavigatedWithinDocument, r), r.emit(gi.FrameNavigatedWithinDocument, void 0), this.emit(Gn.FrameNavigated, r), r.emit(gi.FrameNavigated, "Navigation"))
      }
      #jr(e, t) {
        const r = this.frame(e);
        if (r) switch (t) {
        case "remove":
          this.#vn(r);
          break;
        case "swap":
          this.emit(Gn.FrameSwapped, r), r.emit(gi.FrameSwapped, void 0)
        }
      }
      #Cn(e, t) {
        const r = e.auxData,
          i = r && r.frameId,
          n = "string" == typeof i ? this.frame(i) : void 0;
        let s;
        if (n) {
          if (n.client !== t) return;
          e.auxData && e.auxData.isDefault ? s = n.worlds[Vn] : e.name === $t && (s = n.worlds[Xn])
        }
        if (!s) return;
        const a = new $n(n?.client || this.#ht, e, s);
        s.setContext(a)
      }
      #vn(e) {
        for (const t of e.childFrames()) this.#vn(t);
        e[ut](), this._frameTree.removeFrame(e), this.emit(Gn.FrameDetached, e), e.emit(gi.FrameDetached, e)
      }
    }
    const cs = {
      0: {
        keyCode: 48,
        key: "0",
        code: "Digit0"
      },
      1: {
        keyCode: 49,
        key: "1",
        code: "Digit1"
      },
      2: {
        keyCode: 50,
        key: "2",
        code: "Digit2"
      },
      3: {
        keyCode: 51,
        key: "3",
        code: "Digit3"
      },
      4: {
        keyCode: 52,
        key: "4",
        code: "Digit4"
      },
      5: {
        keyCode: 53,
        key: "5",
        code: "Digit5"
      },
      6: {
        keyCode: 54,
        key: "6",
        code: "Digit6"
      },
      7: {
        keyCode: 55,
        key: "7",
        code: "Digit7"
      },
      8: {
        keyCode: 56,
        key: "8",
        code: "Digit8"
      },
      9: {
        keyCode: 57,
        key: "9",
        code: "Digit9"
      },
      Power: {
        key: "Power",
        code: "Power"
      },
      Eject: {
        key: "Eject",
        code: "Eject"
      },
      Abort: {
        keyCode: 3,
        code: "Abort",
        key: "Cancel"
      },
      Help: {
        keyCode: 6,
        code: "Help",
        key: "Help"
      },
      Backspace: {
        keyCode: 8,
        code: "Backspace",
        key: "Backspace"
      },
      Tab: {
        keyCode: 9,
        code: "Tab",
        key: "Tab"
      },
      Numpad5: {
        keyCode: 12,
        shiftKeyCode: 101,
        key: "Clear",
        code: "Numpad5",
        shiftKey: "5",
        location: 3
      },
      NumpadEnter: {
        keyCode: 13,
        code: "NumpadEnter",
        key: "Enter",
        text: "\r",
        location: 3
      },
      Enter: {
        keyCode: 13,
        code: "Enter",
        key: "Enter",
        text: "\r"
      },
      "\r": {
        keyCode: 13,
        code: "Enter",
        key: "Enter",
        text: "\r"
      },
      "\n": {
        keyCode: 13,
        code: "Enter",
        key: "Enter",
        text: "\r"
      },
      ShiftLeft: {
        keyCode: 16,
        code: "ShiftLeft",
        key: "Shift",
        location: 1
      },
      ShiftRight: {
        keyCode: 16,
        code: "ShiftRight",
        key: "Shift",
        location: 2
      },
      ControlLeft: {
        keyCode: 17,
        code: "ControlLeft",
        key: "Control",
        location: 1
      },
      ControlRight: {
        keyCode: 17,
        code: "ControlRight",
        key: "Control",
        location: 2
      },
      AltLeft: {
        keyCode: 18,
        code: "AltLeft",
        key: "Alt",
        location: 1
      },
      AltRight: {
        keyCode: 18,
        code: "AltRight",
        key: "Alt",
        location: 2
      },
      Pause: {
        keyCode: 19,
        code: "Pause",
        key: "Pause"
      },
      CapsLock: {
        keyCode: 20,
        code: "CapsLock",
        key: "CapsLock"
      },
      Escape: {
        keyCode: 27,
        code: "Escape",
        key: "Escape"
      },
      Convert: {
        keyCode: 28,
        code: "Convert",
        key: "Convert"
      },
      NonConvert: {
        keyCode: 29,
        code: "NonConvert",
        key: "NonConvert"
      },
      Space: {
        keyCode: 32,
        code: "Space",
        key: " "
      },
      Numpad9: {
        keyCode: 33,
        shiftKeyCode: 105,
        key: "PageUp",
        code: "Numpad9",
        shiftKey: "9",
        location: 3
      },
      PageUp: {
        keyCode: 33,
        code: "PageUp",
        key: "PageUp"
      },
      Numpad3: {
        keyCode: 34,
        shiftKeyCode: 99,
        key: "PageDown",
        code: "Numpad3",
        shiftKey: "3",
        location: 3
      },
      PageDown: {
        keyCode: 34,
        code: "PageDown",
        key: "PageDown"
      },
      End: {
        keyCode: 35,
        code: "End",
        key: "End"
      },
      Numpad1: {
        keyCode: 35,
        shiftKeyCode: 97,
        key: "End",
        code: "Numpad1",
        shiftKey: "1",
        location: 3
      },
      Home: {
        keyCode: 36,
        code: "Home",
        key: "Home"
      },
      Numpad7: {
        keyCode: 36,
        shiftKeyCode: 103,
        key: "Home",
        code: "Numpad7",
        shiftKey: "7",
        location: 3
      },
      ArrowLeft: {
        keyCode: 37,
        code: "ArrowLeft",
        key: "ArrowLeft"
      },
      Numpad4: {
        keyCode: 37,
        shiftKeyCode: 100,
        key: "ArrowLeft",
        code: "Numpad4",
        shiftKey: "4",
        location: 3
      },
      Numpad8: {
        keyCode: 38,
        shiftKeyCode: 104,
        key: "ArrowUp",
        code: "Numpad8",
        shiftKey: "8",
        location: 3
      },
      ArrowUp: {
        keyCode: 38,
        code: "ArrowUp",
        key: "ArrowUp"
      },
      ArrowRight: {
        keyCode: 39,
        code: "ArrowRight",
        key: "ArrowRight"
      },
      Numpad6: {
        keyCode: 39,
        shiftKeyCode: 102,
        key: "ArrowRight",
        code: "Numpad6",
        shiftKey: "6",
        location: 3
      },
      Numpad2: {
        keyCode: 40,
        shiftKeyCode: 98,
        key: "ArrowDown",
        code: "Numpad2",
        shiftKey: "2",
        location: 3
      },
      ArrowDown: {
        keyCode: 40,
        code: "ArrowDown",
        key: "ArrowDown"
      },
      Select: {
        keyCode: 41,
        code: "Select",
        key: "Select"
      },
      Open: {
        keyCode: 43,
        code: "Open",
        key: "Execute"
      },
      PrintScreen: {
        keyCode: 44,
        code: "PrintScreen",
        key: "PrintScreen"
      },
      Insert: {
        keyCode: 45,
        code: "Insert",
        key: "Insert"
      },
      Numpad0: {
        keyCode: 45,
        shiftKeyCode: 96,
        key: "Insert",
        code: "Numpad0",
        shiftKey: "0",
        location: 3
      },
      Delete: {
        keyCode: 46,
        code: "Delete",
        key: "Delete"
      },
      NumpadDecimal: {
        keyCode: 46,
        shiftKeyCode: 110,
        code: "NumpadDecimal",
        key: "\0",
        shiftKey: ".",
        location: 3
      },
      Digit0: {
        keyCode: 48,
        code: "Digit0",
        shiftKey: ")",
        key: "0"
      },
      Digit1: {
        keyCode: 49,
        code: "Digit1",
        shiftKey: "!",
        key: "1"
      },
      Digit2: {
        keyCode: 50,
        code: "Digit2",
        shiftKey: "@",
        key: "2"
      },
      Digit3: {
        keyCode: 51,
        code: "Digit3",
        shiftKey: "#",
        key: "3"
      },
      Digit4: {
        keyCode: 52,
        code: "Digit4",
        shiftKey: "$",
        key: "4"
      },
      Digit5: {
        keyCode: 53,
        code: "Digit5",
        shiftKey: "%",
        key: "5"
      },
      Digit6: {
        keyCode: 54,
        code: "Digit6",
        shiftKey: "^",
        key: "6"
      },
      Digit7: {
        keyCode: 55,
        code: "Digit7",
        shiftKey: "&",
        key: "7"
      },
      Digit8: {
        keyCode: 56,
        code: "Digit8",
        shiftKey: "*",
        key: "8"
      },
      Digit9: {
        keyCode: 57,
        code: "Digit9",
        shiftKey: "(",
        key: "9"
      },
      KeyA: {
        keyCode: 65,
        code: "KeyA",
        shiftKey: "A",
        key: "a"
      },
      KeyB: {
        keyCode: 66,
        code: "KeyB",
        shiftKey: "B",
        key: "b"
      },
      KeyC: {
        keyCode: 67,
        code: "KeyC",
        shiftKey: "C",
        key: "c"
      },
      KeyD: {
        keyCode: 68,
        code: "KeyD",
        shiftKey: "D",
        key: "d"
      },
      KeyE: {
        keyCode: 69,
        code: "KeyE",
        shiftKey: "E",
        key: "e"
      },
      KeyF: {
        keyCode: 70,
        code: "KeyF",
        shiftKey: "F",
        key: "f"
      },
      KeyG: {
        keyCode: 71,
        code: "KeyG",
        shiftKey: "G",
        key: "g"
      },
      KeyH: {
        keyCode: 72,
        code: "KeyH",
        shiftKey: "H",
        key: "h"
      },
      KeyI: {
        keyCode: 73,
        code: "KeyI",
        shiftKey: "I",
        key: "i"
      },
      KeyJ: {
        keyCode: 74,
        code: "KeyJ",
        shiftKey: "J",
        key: "j"
      },
      KeyK: {
        keyCode: 75,
        code: "KeyK",
        shiftKey: "K",
        key: "k"
      },
      KeyL: {
        keyCode: 76,
        code: "KeyL",
        shiftKey: "L",
        key: "l"
      },
      KeyM: {
        keyCode: 77,
        code: "KeyM",
        shiftKey: "M",
        key: "m"
      },
      KeyN: {
        keyCode: 78,
        code: "KeyN",
        shiftKey: "N",
        key: "n"
      },
      KeyO: {
        keyCode: 79,
        code: "KeyO",
        shiftKey: "O",
        key: "o"
      },
      KeyP: {
        keyCode: 80,
        code: "KeyP",
        shiftKey: "P",
        key: "p"
      },
      KeyQ: {
        keyCode: 81,
        code: "KeyQ",
        shiftKey: "Q",
        key: "q"
      },
      KeyR: {
        keyCode: 82,
        code: "KeyR",
        shiftKey: "R",
        key: "r"
      },
      KeyS: {
        keyCode: 83,
        code: "KeyS",
        shiftKey: "S",
        key: "s"
      },
      KeyT: {
        keyCode: 84,
        code: "KeyT",
        shiftKey: "T",
        key: "t"
      },
      KeyU: {
        keyCode: 85,
        code: "KeyU",
        shiftKey: "U",
        key: "u"
      },
      KeyV: {
        keyCode: 86,
        code: "KeyV",
        shiftKey: "V",
        key: "v"
      },
      KeyW: {
        keyCode: 87,
        code: "KeyW",
        shiftKey: "W",
        key: "w"
      },
      KeyX: {
        keyCode: 88,
        code: "KeyX",
        shiftKey: "X",
        key: "x"
      },
      KeyY: {
        keyCode: 89,
        code: "KeyY",
        shiftKey: "Y",
        key: "y"
      },
      KeyZ: {
        keyCode: 90,
        code: "KeyZ",
        shiftKey: "Z",
        key: "z"
      },
      MetaLeft: {
        keyCode: 91,
        code: "MetaLeft",
        key: "Meta",
        location: 1
      },
      MetaRight: {
        keyCode: 92,
        code: "MetaRight",
        key: "Meta",
        location: 2
      },
      ContextMenu: {
        keyCode: 93,
        code: "ContextMenu",
        key: "ContextMenu"
      },
      NumpadMultiply: {
        keyCode: 106,
        code: "NumpadMultiply",
        key: "*",
        location: 3
      },
      NumpadAdd: {
        keyCode: 107,
        code: "NumpadAdd",
        key: "+",
        location: 3
      },
      NumpadSubtract: {
        keyCode: 109,
        code: "NumpadSubtract",
        key: "-",
        location: 3
      },
      NumpadDivide: {
        keyCode: 111,
        code: "NumpadDivide",
        key: "/",
        location: 3
      },
      F1: {
        keyCode: 112,
        code: "F1",
        key: "F1"
      },
      F2: {
        keyCode: 113,
        code: "F2",
        key: "F2"
      },
      F3: {
        keyCode: 114,
        code: "F3",
        key: "F3"
      },
      F4: {
        keyCode: 115,
        code: "F4",
        key: "F4"
      },
      F5: {
        keyCode: 116,
        code: "F5",
        key: "F5"
      },
      F6: {
        keyCode: 117,
        code: "F6",
        key: "F6"
      },
      F7: {
        keyCode: 118,
        code: "F7",
        key: "F7"
      },
      F8: {
        keyCode: 119,
        code: "F8",
        key: "F8"
      },
      F9: {
        keyCode: 120,
        code: "F9",
        key: "F9"
      },
      F10: {
        keyCode: 121,
        code: "F10",
        key: "F10"
      },
      F11: {
        keyCode: 122,
        code: "F11",
        key: "F11"
      },
      F12: {
        keyCode: 123,
        code: "F12",
        key: "F12"
      },
      F13: {
        keyCode: 124,
        code: "F13",
        key: "F13"
      },
      F14: {
        keyCode: 125,
        code: "F14",
        key: "F14"
      },
      F15: {
        keyCode: 126,
        code: "F15",
        key: "F15"
      },
      F16: {
        keyCode: 127,
        code: "F16",
        key: "F16"
      },
      F17: {
        keyCode: 128,
        code: "F17",
        key: "F17"
      },
      F18: {
        keyCode: 129,
        code: "F18",
        key: "F18"
      },
      F19: {
        keyCode: 130,
        code: "F19",
        key: "F19"
      },
      F20: {
        keyCode: 131,
        code: "F20",
        key: "F20"
      },
      F21: {
        keyCode: 132,
        code: "F21",
        key: "F21"
      },
      F22: {
        keyCode: 133,
        code: "F22",
        key: "F22"
      },
      F23: {
        keyCode: 134,
        code: "F23",
        key: "F23"
      },
      F24: {
        keyCode: 135,
        code: "F24",
        key: "F24"
      },
      NumLock: {
        keyCode: 144,
        code: "NumLock",
        key: "NumLock"
      },
      ScrollLock: {
        keyCode: 145,
        code: "ScrollLock",
        key: "ScrollLock"
      },
      AudioVolumeMute: {
        keyCode: 173,
        code: "AudioVolumeMute",
        key: "AudioVolumeMute"
      },
      AudioVolumeDown: {
        keyCode: 174,
        code: "AudioVolumeDown",
        key: "AudioVolumeDown"
      },
      AudioVolumeUp: {
        keyCode: 175,
        code: "AudioVolumeUp",
        key: "AudioVolumeUp"
      },
      MediaTrackNext: {
        keyCode: 176,
        code: "MediaTrackNext",
        key: "MediaTrackNext"
      },
      MediaTrackPrevious: {
        keyCode: 177,
        code: "MediaTrackPrevious",
        key: "MediaTrackPrevious"
      },
      MediaStop: {
        keyCode: 178,
        code: "MediaStop",
        key: "MediaStop"
      },
      MediaPlayPause: {
        keyCode: 179,
        code: "MediaPlayPause",
        key: "MediaPlayPause"
      },
      Semicolon: {
        keyCode: 186,
        code: "Semicolon",
        shiftKey: ":",
        key: ";"
      },
      Equal: {
        keyCode: 187,
        code: "Equal",
        shiftKey: "+",
        key: "="
      },
      NumpadEqual: {
        keyCode: 187,
        code: "NumpadEqual",
        key: "=",
        location: 3
      },
      Comma: {
        keyCode: 188,
        code: "Comma",
        shiftKey: "<",
        key: ","
      },
      Minus: {
        keyCode: 189,
        code: "Minus",
        shiftKey: "_",
        key: "-"
      },
      Period: {
        keyCode: 190,
        code: "Period",
        shiftKey: ">",
        key: "."
      },
      Slash: {
        keyCode: 191,
        code: "Slash",
        shiftKey: "?",
        key: "/"
      },
      Backquote: {
        keyCode: 192,
        code: "Backquote",
        shiftKey: "~",
        key: "`"
      },
      BracketLeft: {
        keyCode: 219,
        code: "BracketLeft",
        shiftKey: "{",
        key: "["
      },
      Backslash: {
        keyCode: 220,
        code: "Backslash",
        shiftKey: "|",
        key: "\\"
      },
      BracketRight: {
        keyCode: 221,
        code: "BracketRight",
        shiftKey: "}",
        key: "]"
      },
      Quote: {
        keyCode: 222,
        code: "Quote",
        shiftKey: '"',
        key: "'"
      },
      AltGraph: {
        keyCode: 225,
        code: "AltGraph",
        key: "AltGraph"
      },
      Props: {
        keyCode: 247,
        code: "Props",
        key: "CrSel"
      },
      Cancel: {
        keyCode: 3,
        key: "Cancel",
        code: "Abort"
      },
      Clear: {
        keyCode: 12,
        key: "Clear",
        code: "Numpad5",
        location: 3
      },
      Shift: {
        keyCode: 16,
        key: "Shift",
        code: "ShiftLeft",
        location: 1
      },
      Control: {
        keyCode: 17,
        key: "Control",
        code: "ControlLeft",
        location: 1
      },
      Alt: {
        keyCode: 18,
        key: "Alt",
        code: "AltLeft",
        location: 1
      },
      Accept: {
        keyCode: 30,
        key: "Accept"
      },
      ModeChange: {
        keyCode: 31,
        key: "ModeChange"
      },
      " ": {
        keyCode: 32,
        key: " ",
        code: "Space"
      },
      Print: {
        keyCode: 42,
        key: "Print"
      },
      Execute: {
        keyCode: 43,
        key: "Execute",
        code: "Open"
      },
      "\0": {
        keyCode: 46,
        key: "\0",
        code: "NumpadDecimal",
        location: 3
      },
      a: {
        keyCode: 65,
        key: "a",
        code: "KeyA"
      },
      b: {
        keyCode: 66,
        key: "b",
        code: "KeyB"
      },
      c: {
        keyCode: 67,
        key: "c",
        code: "KeyC"
      },
      d: {
        keyCode: 68,
        key: "d",
        code: "KeyD"
      },
      e: {
        keyCode: 69,
        key: "e",
        code: "KeyE"
      },
      f: {
        keyCode: 70,
        key: "f",
        code: "KeyF"
      },
      g: {
        keyCode: 71,
        key: "g",
        code: "KeyG"
      },
      h: {
        keyCode: 72,
        key: "h",
        code: "KeyH"
      },
      i: {
        keyCode: 73,
        key: "i",
        code: "KeyI"
      },
      j: {
        keyCode: 74,
        key: "j",
        code: "KeyJ"
      },
      k: {
        keyCode: 75,
        key: "k",
        code: "KeyK"
      },
      l: {
        keyCode: 76,
        key: "l",
        code: "KeyL"
      },
      m: {
        keyCode: 77,
        key: "m",
        code: "KeyM"
      },
      n: {
        keyCode: 78,
        key: "n",
        code: "KeyN"
      },
      o: {
        keyCode: 79,
        key: "o",
        code: "KeyO"
      },
      p: {
        keyCode: 80,
        key: "p",
        code: "KeyP"
      },
      q: {
        keyCode: 81,
        key: "q",
        code: "KeyQ"
      },
      r: {
        keyCode: 82,
        key: "r",
        code: "KeyR"
      },
      s: {
        keyCode: 83,
        key: "s",
        code: "KeyS"
      },
      t: {
        keyCode: 84,
        key: "t",
        code: "KeyT"
      },
      u: {
        keyCode: 85,
        key: "u",
        code: "KeyU"
      },
      v: {
        keyCode: 86,
        key: "v",
        code: "KeyV"
      },
      w: {
        keyCode: 87,
        key: "w",
        code: "KeyW"
      },
      x: {
        keyCode: 88,
        key: "x",
        code: "KeyX"
      },
      y: {
        keyCode: 89,
        key: "y",
        code: "KeyY"
      },
      z: {
        keyCode: 90,
        key: "z",
        code: "KeyZ"
      },
      Meta: {
        keyCode: 91,
        key: "Meta",
        code: "MetaLeft",
        location: 1
      },
      "*": {
        keyCode: 106,
        key: "*",
        code: "NumpadMultiply",
        location: 3
      },
      "+": {
        keyCode: 107,
        key: "+",
        code: "NumpadAdd",
        location: 3
      },
      "-": {
        keyCode: 109,
        key: "-",
        code: "NumpadSubtract",
        location: 3
      },
      "/": {
        keyCode: 111,
        key: "/",
        code: "NumpadDivide",
        location: 3
      },
      ";": {
        keyCode: 186,
        key: ";",
        code: "Semicolon"
      },
      "=": {
        keyCode: 187,
        key: "=",
        code: "Equal"
      },
      ",": {
        keyCode: 188,
        key: ",",
        code: "Comma"
      },
      ".": {
        keyCode: 190,
        key: ".",
        code: "Period"
      },
      "`": {
        keyCode: 192,
        key: "`",
        code: "Backquote"
      },
      "[": {
        keyCode: 219,
        key: "[",
        code: "BracketLeft"
      },
      "\\": {
        keyCode: 220,
        key: "\\",
        code: "Backslash"
      },
      "]": {
        keyCode: 221,
        key: "]",
        code: "BracketRight"
      },
      "'": {
        keyCode: 222,
        key: "'",
        code: "Quote"
      },
      Attn: {
        keyCode: 246,
        key: "Attn"
      },
      CrSel: {
        keyCode: 247,
        key: "CrSel",
        code: "Props"
      },
      ExSel: {
        keyCode: 248,
        key: "ExSel"
      },
      EraseEof: {
        keyCode: 249,
        key: "EraseEof"
      },
      Play: {
        keyCode: 250,
        key: "Play"
      },
      ZoomOut: {
        keyCode: 251,
        key: "ZoomOut"
      },
      ")": {
        keyCode: 48,
        key: ")",
        code: "Digit0"
      },
      "!": {
        keyCode: 49,
        key: "!",
        code: "Digit1"
      },
      "@": {
        keyCode: 50,
        key: "@",
        code: "Digit2"
      },
      "#": {
        keyCode: 51,
        key: "#",
        code: "Digit3"
      },
      $: {
        keyCode: 52,
        key: "$",
        code: "Digit4"
      },
      "%": {
        keyCode: 53,
        key: "%",
        code: "Digit5"
      },
      "^": {
        keyCode: 54,
        key: "^",
        code: "Digit6"
      },
      "&": {
        keyCode: 55,
        key: "&",
        code: "Digit7"
      },
      "(": {
        keyCode: 57,
        key: "(",
        code: "Digit9"
      },
      A: {
        keyCode: 65,
        key: "A",
        code: "KeyA"
      },
      B: {
        keyCode: 66,
        key: "B",
        code: "KeyB"
      },
      C: {
        keyCode: 67,
        key: "C",
        code: "KeyC"
      },
      D: {
        keyCode: 68,
        key: "D",
        code: "KeyD"
      },
      E: {
        keyCode: 69,
        key: "E",
        code: "KeyE"
      },
      F: {
        keyCode: 70,
        key: "F",
        code: "KeyF"
      },
      G: {
        keyCode: 71,
        key: "G",
        code: "KeyG"
      },
      H: {
        keyCode: 72,
        key: "H",
        code: "KeyH"
      },
      I: {
        keyCode: 73,
        key: "I",
        code: "KeyI"
      },
      J: {
        keyCode: 74,
        key: "J",
        code: "KeyJ"
      },
      K: {
        keyCode: 75,
        key: "K",
        code: "KeyK"
      },
      L: {
        keyCode: 76,
        key: "L",
        code: "KeyL"
      },
      M: {
        keyCode: 77,
        key: "M",
        code: "KeyM"
      },
      N: {
        keyCode: 78,
        key: "N",
        code: "KeyN"
      },
      O: {
        keyCode: 79,
        key: "O",
        code: "KeyO"
      },
      P: {
        keyCode: 80,
        key: "P",
        code: "KeyP"
      },
      Q: {
        keyCode: 81,
        key: "Q",
        code: "KeyQ"
      },
      R: {
        keyCode: 82,
        key: "R",
        code: "KeyR"
      },
      S: {
        keyCode: 83,
        key: "S",
        code: "KeyS"
      },
      T: {
        keyCode: 84,
        key: "T",
        code: "KeyT"
      },
      U: {
        keyCode: 85,
        key: "U",
        code: "KeyU"
      },
      V: {
        keyCode: 86,
        key: "V",
        code: "KeyV"
      },
      W: {
        keyCode: 87,
        key: "W",
        code: "KeyW"
      },
      X: {
        keyCode: 88,
        key: "X",
        code: "KeyX"
      },
      Y: {
        keyCode: 89,
        key: "Y",
        code: "KeyY"
      },
      Z: {
        keyCode: 90,
        key: "Z",
        code: "KeyZ"
      },
      ":": {
        keyCode: 186,
        key: ":",
        code: "Semicolon"
      },
      "<": {
        keyCode: 188,
        key: "<",
        code: "Comma"
      },
      _: {
        keyCode: 189,
        key: "_",
        code: "Minus"
      },
      ">": {
        keyCode: 190,
        key: ">",
        code: "Period"
      },
      "?": {
        keyCode: 191,
        key: "?",
        code: "Slash"
      },
      "~": {
        keyCode: 192,
        key: "~",
        code: "Backquote"
      },
      "{": {
        keyCode: 219,
        key: "{",
        code: "BracketLeft"
      },
      "|": {
        keyCode: 220,
        key: "|",
        code: "Backslash"
      },
      "}": {
        keyCode: 221,
        key: "}",
        code: "BracketRight"
      },
      '"': {
        keyCode: 222,
        key: '"',
        code: "Quote"
      },
      SoftLeft: {
        key: "SoftLeft",
        code: "SoftLeft",
        location: 4
      },
      SoftRight: {
        key: "SoftRight",
        code: "SoftRight",
        location: 4
      },
      Camera: {
        keyCode: 44,
        key: "Camera",
        code: "Camera",
        location: 4
      },
      Call: {
        key: "Call",
        code: "Call",
        location: 4
      },
      EndCall: {
        keyCode: 95,
        key: "EndCall",
        code: "EndCall",
        location: 4
      },
      VolumeDown: {
        keyCode: 182,
        key: "VolumeDown",
        code: "VolumeDown",
        location: 4
      },
      VolumeUp: {
        keyCode: 183,
        key: "VolumeUp",
        code: "VolumeUp",
        location: 4
      }
    };
    class ls extends Fi {
      #ht;
      #In = new Set;
      _modifiers = 0;
      constructor(e) {
        super(), this.#ht = e
      }
      updateClient(e) {
        this.#ht = e
      }
      async down(e, t = {
        text: void 0,
        commands: []
      }) {
        const r = this.#Pn(e),
          i = this.#In.has(r.code);
        this.#In.add(r.code), this._modifiers |= this.#An(r.key);
        const n = void 0 === t.text ? r.text : t.text;
        await this.#ht.send("Input.dispatchKeyEvent", {
          type: n ? "keyDown" : "rawKeyDown",
          modifiers: this._modifiers,
          windowsVirtualKeyCode: r.keyCode,
          code: r.code,
          key: r.key,
          text: n,
          unmodifiedText: n,
          autoRepeat: i,
          location: r.location,
          isKeypad: 3 === r.location,
          commands: t.commands
        })
      }
      #An(e) {
        return "Alt" === e ? 1 : "Control" === e ? 2 : "Meta" === e ? 4 : "Shift" === e ? 8 : 0
      }
      #Pn(e) {
        const t = 8 & this._modifiers,
          r = {
            key: "",
            keyCode: 0,
            code: "",
            text: "",
            location: 0
          },
          i = cs[e];
        return bt(i, `Unknown key: "${e}"`), i.key && (r.key = i.key), t && i.shiftKey && (r.key = i.shiftKey), i.keyCode && (r.keyCode = i.keyCode), t && i.shiftKeyCode && (r.keyCode = i.shiftKeyCode), i.code && (r.code = i.code), i.location && (r.location = i.location), 1 === r.key.length && (r.text = r.key), i.text && (r.text = i.text), t && i.shiftText && (r.text = i.shiftText), -9 & this._modifiers && (r.text = ""), r
      }
      async up(e) {
        const t = this.#Pn(e);
        this._modifiers &= ~this.#An(t.key), this.#In.delete(t.code), await this.#ht.send("Input.dispatchKeyEvent", {
          type: "keyUp",
          modifiers: this._modifiers,
          key: t.key,
          windowsVirtualKeyCode: t.keyCode,
          code: t.code,
          location: t.location
        })
      }
      async sendCharacter(e) {
        await this.#ht.send("Input.insertText", {
          text: e
        })
      }
      charIsKey(e) {
        return !!cs[e]
      }
      async type(e, t = {}) {
        const r = t.delay || void 0;
        for (const t of e) this.charIsKey(t) ? await this.press(t, {
          delay: r
        }) : (r && await new Promise((e => setTimeout(e, r))), await this.sendCharacter(t))
      }
      async press(e, t = {}) {
        const {
          delay: r = null
        } = t;
        await this.down(e, t), r && await new Promise((e => setTimeout(e, t.delay))), await this.up(e)
      }
    }
    const ds = e => {
        switch (e) {
        case Oi.Left:
          return 1;
        case Oi.Right:
          return 2;
        case Oi.Middle:
          return 4;
        case Oi.Back:
          return 8;
        case Oi.Forward:
          return 16
        }
      },
      us = e => 1 & e ? Oi.Left : 2 & e ? Oi.Right : 4 & e ? Oi.Middle : 8 & e ? Oi.Back : 16 & e ? Oi.Forward : "none";
    class hs extends Ri {
      #ht;
      #Fn;
      constructor(e, t) {
        super(), this.#ht = e, this.#Fn = t
      }
      updateClient(e) {
        this.#ht = e
      }
      #On = {
        position: {
          x: 0,
          y: 0
        },
        buttons: 0
      };
      get #_t() {
        return Object.assign({
          ...this.#On
        }, ...this.#Rn)
      }
      #Rn = [];
      #Ln() {
        const e = {};
        this.#Rn.push(e);
        const t = () => {
          this.#Rn.splice(this.#Rn.indexOf(e), 1)
        };
        return {
          update: t => {
            Object.assign(e, t)
          },
          commit: () => {
            this.#On = {
              ...this.#On,
              ...e
            }, t()
          },
          rollback: t
        }
      }
      async #Dn(e) {
        const {
          update: t,
          commit: r,
          rollback: i
        } = this.#Ln();
        try {
          await e(t), r()
        } catch (e) {
          throw i(), e
        }
      }
      async reset() {
        const e = [];
        for (const [t, r] of [
            [1, Oi.Left],
            [4, Oi.Middle],
            [2, Oi.Right],
            [16, Oi.Forward],
            [8, Oi.Back]
          ]) this.#_t.buttons & t && e.push(this.up({
          button: r
        }));
        0 === this.#_t.position.x && 0 === this.#_t.position.y || e.push(this.move(0, 0)), await Promise.all(e)
      }
      async move(e, t, r = {}) {
        const {
          steps: i = 1
        } = r, n = this.#_t.position, s = e, a = t;
        for (let e = 1; e <= i; e++) await this.#Dn((t => {
          t({
            position: {
              x: n.x + (s - n.x) * (e / i),
              y: n.y + (a - n.y) * (e / i)
            }
          });
          const {
            buttons: r,
            position: o
          } = this.#_t;
          return this.#ht.send("Input.dispatchMouseEvent", {
            type: "mouseMoved",
            modifiers: this.#Fn._modifiers,
            buttons: r,
            button: us(r),
            ...o
          })
        }))
      }
      async down(e = {}) {
        const {
          button: t = Oi.Left,
          clickCount: r = 1
        } = e, i = ds(t);
        if (!i) throw new Error(`Unsupported mouse button: ${t}`);
        if (this.#_t.buttons & i) throw new Error(`'${t}' is already pressed.`);
        await this.#Dn((e => {
          e({
            buttons: this.#_t.buttons | i
          });
          const {
            buttons: n,
            position: s
          } = this.#_t;
          return this.#ht.send("Input.dispatchMouseEvent", {
            type: "mousePressed",
            modifiers: this.#Fn._modifiers,
            clickCount: r,
            buttons: n,
            button: t,
            ...s
          })
        }))
      }
      async up(e = {}) {
        const {
          button: t = Oi.Left,
          clickCount: r = 1
        } = e, i = ds(t);
        if (!i) throw new Error(`Unsupported mouse button: ${t}`);
        if (!(this.#_t.buttons & i)) throw new Error(`'${t}' is not pressed.`);
        await this.#Dn((e => {
          e({
            buttons: this.#_t.buttons & ~i
          });
          const {
            buttons: n,
            position: s
          } = this.#_t;
          return this.#ht.send("Input.dispatchMouseEvent", {
            type: "mouseReleased",
            modifiers: this.#Fn._modifiers,
            clickCount: r,
            buttons: n,
            button: t,
            ...s
          })
        }))
      }
      async click(e, t, r = {}) {
        const {
          delay: i,
          count: n = 1,
          clickCount: s = n
        } = r;
        if (n < 1) throw new Error("Click must occur a positive number of times.");
        const a = [this.move(e, t)];
        if (s === n)
          for (let e = 1; e < n; ++e) a.push(this.down({
            ...r,
            clickCount: e
          }), this.up({
            ...r,
            clickCount: e
          }));
        a.push(this.down({
          ...r,
          clickCount: s
        })), "number" == typeof i && (await Promise.all(a), a.length = 0, await new Promise((e => {
          setTimeout(e, i)
        }))), a.push(this.up({
          ...r,
          clickCount: s
        })), await Promise.all(a)
      }
      async wheel(e = {}) {
        const {
          deltaX: t = 0,
          deltaY: r = 0
        } = e, {
          position: i,
          buttons: n
        } = this.#_t;
        await this.#ht.send("Input.dispatchMouseEvent", {
          type: "mouseWheel",
          pointerType: "mouse",
          modifiers: this.#Fn._modifiers,
          deltaY: r,
          deltaX: t,
          buttons: n,
          ...i
        })
      }
      async drag(e, t) {
        const r = new Promise((e => {
          this.#ht.once("Input.dragIntercepted", (t => e(t.data)))
        }));
        return await this.move(e.x, e.y), await this.down(), await this.move(t.x, t.y), await r
      }
      async dragEnter(e, t) {
        await this.#ht.send("Input.dispatchDragEvent", {
          type: "dragEnter",
          x: e.x,
          y: e.y,
          modifiers: this.#Fn._modifiers,
          data: t
        })
      }
      async dragOver(e, t) {
        await this.#ht.send("Input.dispatchDragEvent", {
          type: "dragOver",
          x: e.x,
          y: e.y,
          modifiers: this.#Fn._modifiers,
          data: t
        })
      }
      async drop(e, t) {
        await this.#ht.send("Input.dispatchDragEvent", {
          type: "drop",
          x: e.x,
          y: e.y,
          modifiers: this.#Fn._modifiers,
          data: t
        })
      }
      async dragAndDrop(e, t, r = {}) {
        const {
          delay: i = null
        } = r, n = await this.drag(e, t);
        await this.dragEnter(t, n), await this.dragOver(t, n), i && await new Promise((e => setTimeout(e, i))), await this.drop(t, n), await this.up()
      }
    }
    class ps {
      #Nn = !1;
      #Bn;
      #Kn;
      #ht;
      #Fn;
      constructor(e, t, r, i) {
        this.#ht = e, this.#Bn = t, this.#Fn = r, this.#Kn = i
      }
      updateClient(e) {
        this.#ht = e
      }
      async start() {
        if (this.#Nn) throw new It("Touch has already started");
        await this.#ht.send("Input.dispatchTouchEvent", {
          type: "touchStart",
          touchPoints: [this.#Kn],
          modifiers: this.#Fn._modifiers
        }), this.#Nn = !0
      }
      move(e, t) {
        return this.#Kn.x = Math.round(e), this.#Kn.y = Math.round(t), this.#ht.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [this.#Kn],
          modifiers: this.#Fn._modifiers
        })
      }
      async end() {
        await this.#ht.send("Input.dispatchTouchEvent", {
          type: "touchEnd",
          touchPoints: [this.#Kn],
          modifiers: this.#Fn._modifiers
        }), this.#Bn.removeHandle(this)
      }
    }
    class ms extends Li {
      #ht;
      #Fn;
      constructor(e, t) {
        super(), this.#ht = e, this.#Fn = t
      }
      updateClient(e) {
        this.#ht = e, this.touches.forEach((t => {
          t.updateClient(e)
        }))
      }
      async touchStart(e, t) {
        const r = this.idGenerator(),
          i = {
            x: Math.round(e),
            y: Math.round(t),
            radiusX: .5,
            radiusY: .5,
            force: .5,
            id: r
          },
          n = new ps(this.#ht, this, this.#Fn, i);
        return await n.start(), this.touches.push(n), n
      }
    }
    class fs {
      #ht;
      #Hn = !1;
      #qn;
      constructor(e) {
        this.#ht = e
      }
      updateClient(e) {
        this.#ht = e
      }
      async start(e = {}) {
        bt(!this.#Hn, "Cannot start recording trace while already recording trace.");
        const t = ["-*", "devtools.timeline", "v8.execute", "disabled-by-default-devtools.timeline", "disabled-by-default-devtools.timeline.frame", "toplevel", "blink.console", "blink.user_timing", "latencyInfo", "disabled-by-default-devtools.timeline.stack", "disabled-by-default-v8.cpu_profiler"],
          {
            path: r,
            screenshots: i = !1,
            categories: n = t
          } = e;
        i && n.push("disabled-by-default-devtools.screenshot");
        const s = n.filter((e => e.startsWith("-"))).map((e => e.slice(1))),
          a = n.filter((e => !e.startsWith("-")));
        this.#qn = r, this.#Hn = !0, await this.#ht.send("Tracing.start", {
          transferMode: "ReturnAsStream",
          traceConfig: {
            excludedCategories: s,
            includedCategories: a
          }
        })
      }
      async stop() {
        const e = er.create();
        return this.#ht.once("Tracing.tracingComplete", (async t => {
          try {
            bt(t.stream, 'Missing "stream"');
            const r = await jt(this.#ht, t.stream),
              i = await qt(r, this.#qn);
            e.resolve(i ?? void 0)
          } catch (t) {
            ar(t) ? e.reject(t) : e.reject(new Error(`Unknown error: ${t}`))
          }
        })), await this.#ht.send("Tracing.end"), this.#Hn = !1, await e.valueOrThrow()
      }
    }
    class gs extends Xi {
      #de;
      #ht;
      #Ge;
      #Ye;
      constructor(e, t, r, i, n, s) {
        super(t), this.#Ge = r, this.#ht = e, this.#Ye = i, this.#de = new zn(this, new Di), this.#ht.once("Runtime.executionContextCreated", (async t => {
          this.#de.setContext(new $n(e, t.context, this.#de))
        })), this.#de.emitter.on("consoleapicalled", (async e => {
          try {
            return n(e.type, e.args.map((e => new Rn(this.#de, e))), e.stackTrace)
          } catch (e) {
            Rt(e)
          }
        })), this.#ht.on("Runtime.exceptionThrown", s), this.#ht.once(ir.Disconnected, (() => {
          this.#de.dispose()
        })), this.#ht.send("Runtime.enable").catch(Rt)
      }
      mainRealm() {
        return this.#de
      }
      get client() {
        return this.#ht
      }
      async close() {
        switch (this.#Ye) {
        case zi.SERVICE_WORKER:
        case zi.SHARED_WORKER:
          await (this.client.connection()?.send("Target.closeTarget", {
            targetId: this.#Ge
          })), await (this.client.connection()?.send("Target.detachFromTarget", {
            sessionId: this.client.id()
          }));
          break;
        default:
          await this.evaluate((() => {
            self.close()
          }))
        }
      }
    }
    var ys = function (e, t, r) {
        if (null != t) {
          if ("object" != typeof t && "function" != typeof t) throw new TypeError("Object expected.");
          var i, n;
          if (r) {
            if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
            i = t[Symbol.asyncDispose]
          }
          if (void 0 === i) {
            if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
            i = t[Symbol.dispose], r && (n = i)
          }
          if ("function" != typeof i) throw new TypeError("Object not disposable.");
          n && (i = function () {
            try {
              n.call(this)
            } catch (e) {
              return Promise.reject(e)
            }
          }), e.stack.push({
            value: t,
            dispose: i,
            async: r
          })
        } else r && e.stack.push({
          async: !0
        });
        return t
      },
      ws = function (e) {
        return function (t) {
          function r(r) {
            t.error = t.hasError ? new e(r, t.error, "An error was suppressed during disposal.") : r, t.hasError = !0
          }
          var i, n = 0;
          return function e() {
            for (; i = t.stack.pop();) try {
              if (!i.async && 1 === n) return n = 0, t.stack.push(i), Promise.resolve().then(e);
              if (i.dispose) {
                var s = i.dispose.call(i.value);
                if (i.async) return n |= 2, Promise.resolve(s).then(e, (function (t) {
                  return r(t), e()
                }))
              } else n |= 1
            } catch (e) {
              r(e)
            }
            if (1 === n) return t.hasError ? Promise.reject(t.error) : Promise.resolve();
            if (t.hasError) throw t.error
          }()
        }
      }("function" == typeof SuppressedError ? SuppressedError : function (e, t, r) {
        var i = new Error(r);
        return i.name = "SuppressedError", i.error = e, i.suppressed = t, i
      });

    function vs(e) {
      return "warning" === e ? "warn" : e
    }
    class bs extends qi {
      static async _create(e, t, r) {
        const i = new bs(e, t);
        if (await i.#jn(), r) try {
          await i.setViewport(r)
        } catch (e) {
          if (!ar(e) || !pn(e)) throw e;
          Rt(e)
        }
        return i
      }
      #ot = !1;
      #Un;
      #$n;
      #Wn;
      #Gn;
      #zn;
      #Fn;
      #Vn;
      #Xn;
      #ur;
      #Jn;
      #Qn;
      #fr = new Map;
      #Yn = new Map;
      #Zn;
      #es;
      #ts = new Map;
      #rs = new Set;
      #is = er.create();
      #ns = !1;
      #ss = !1;
      constructor(e, t) {
        super(), this.#$n = e, this.#Gn = e.parentSession(), bt(this.#Gn, "Tab target session is not defined."), this.#zn = this.#Gn.target(), bt(this.#zn, "Tab target is not defined."), this.#Wn = t, this.#Un = t._targetManager(), this.#Fn = new ls(e), this.#Vn = new hs(e, this.#Fn), this.#Xn = new ms(e, this.#Fn), this.#ur = new os(e, this, this._timeoutSettings), this.#Jn = new En(e), this.#Qn = new fs(e), this.#Zn = new mn(e), this.#es = null;
        const r = new ft(this.#ur);
        r.on(Gn.FrameAttached, (e => {
          this.emit("frameattached", e)
        })), r.on(Gn.FrameDetached, (e => {
          this.emit("framedetached", e)
        })), r.on(Gn.FrameNavigated, (e => {
          this.emit("framenavigated", e)
        })), r.on(Gn.ConsoleApiCalled, (([e, t]) => {
          this.#mr(e, t)
        })), r.on(Gn.BindingCalled, (([e, t]) => {
          this.#pr(e, t)
        }));
        const i = new ft(this.#ur.networkManager);
        i.on(en.Request, (e => {
          this.emit("request", e)
        })), i.on(en.RequestServedFromCache, (e => {
          this.emit("requestservedfromcache", e)
        })), i.on(en.Response, (e => {
          this.emit("response", e)
        })), i.on(en.RequestFailed, (e => {
          this.emit("requestfailed", e)
        })), i.on(en.RequestFinished, (e => {
          this.emit("requestfinished", e)
        })), this.#Gn.on(ir.Swapped, this.#as.bind(this)), this.#Gn.on(ir.Ready, this.#os.bind(this)), this.#Un.on("targetGone", this.#cs), this.#zn._isClosedDeferred.valueOrThrow().then((() => {
          this.#Un.off("targetGone", this.#cs), this.emit("close", void 0), this.#ot = !0
        })).catch(Rt), this.#ls(), this.#ds()
      }
      #ds() {
        const e = [];
        for (const t of this.#Un.getChildTargets(this.#Wn)) e.push(t);
        let t = 0;
        for (; t < e.length;) {
          const r = e[t];
          t++;
          const i = r._session();
          i && this.#us(i);
          for (const t of this.#Un.getChildTargets(r)) e.push(t)
        }
      }
      async #as(e) {
        bt(e instanceof ln, "CDPSession is not instance of CdpCDPSession"), this.#$n = e, this.#Wn = e.target(), bt(this.#Wn, "Missing target on swap"), this.#Fn.updateClient(e), this.#Vn.updateClient(e), this.#Xn.updateClient(e), this.#Jn.updateClient(e), this.#Qn.updateClient(e), this.#Zn.updateClient(e), await this.#ur.swapFrameTree(e), this.#ls()
      }
      async #os(e) {
        bt(e instanceof ln), "prerender" === e.target()._subtype() && (this.#ur.registerSpeculativeSession(e).catch(Rt), this.#Jn.registerSpeculativeSession(e).catch(Rt))
      }
      #ls() {
        const e = new ft(this.#$n);
        e.on(ir.Ready, this.#us), e.on(ir.Disconnected, (() => {
          this.#is.reject(new Ft("Target closed"))
        })), e.on("Page.domContentEventFired", (() => {
          this.emit("domcontentloaded", void 0)
        })), e.on("Page.loadEventFired", (() => {
          this.emit("load", void 0)
        })), e.on("Page.javascriptDialogOpening", this.#hs.bind(this)), e.on("Runtime.exceptionThrown", this.#ps.bind(this)), e.on("Inspector.targetCrashed", this.#ms.bind(this)), e.on("Performance.metrics", this.#fs.bind(this)), e.on("Log.entryAdded", this.#gs.bind(this)), e.on("Page.fileChooserOpened", this.#ys.bind(this))
      }
      #cs = e => {
        const t = e._session()?.id(),
          r = this.#ts.get(t);
        r && (this.#ts.delete(t), this.emit("workerdestroyed", r))
      };
      #us = e => {
        if (bt(e instanceof ln), this.#ur.onAttachedToTarget(e.target()), "worker" === e.target()._getTargetInfo().type) {
          const t = new gs(e, e.target().url(), e.target()._targetId, e.target().type(), this.#ws.bind(this), this.#ps.bind(this));
          this.#ts.set(e.id(), t), this.emit("workercreated", t)
        }
        e.on(ir.Ready, this.#us)
      };
      async #jn() {
        try {
          await Promise.all([this.#ur.initialize(this.#$n), this.#$n.send("Performance.enable"), this.#$n.send("Log.enable")])
        } catch (e) {
          if (!ar(e) || !pn(e)) throw e;
          Rt(e)
        }
      }
      async #ys(e) {
        const t = {
          stack: [],
          error: void 0,
          hasError: !1
        };
        try {
          if (!this.#rs.size) return;
          const r = this.#ur.frame(e.frameId);
          bt(r, "This should never happen.");
          const i = ys(t, await r.worlds[Vn].adoptBackendNode(e.backendNodeId), !1),
            n = new an(i.move(), e);
          for (const e of this.#rs) e.resolve(n);
          this.#rs.clear()
        } catch (e) {
          t.error = e, t.hasError = !0
        } finally {
          ws(t)
        }
      }
      _client() {
        return this.#$n
      }
      isServiceWorkerBypassed() {
        return this.#ns
      }
      isDragInterceptionEnabled() {
        return this.#ss
      }
      isJavaScriptEnabled() {
        return this.#Jn.javascriptEnabled
      }
      async waitForFileChooser(e = {}) {
        const t = 0 === this.#rs.size,
          {
            timeout: r = this._timeoutSettings.timeout()
          } = e,
          i = er.create({
            message: `Waiting for \`FileChooser\` failed: ${r}ms exceeded`,
            timeout: r
          });
        let n;
        e.signal && e.signal.addEventListener("abort", (() => {
          i.reject(e.signal?.reason)
        }), {
          once: !0
        }), this.#rs.add(i), t && (n = this.#$n.send("Page.setInterceptFileChooserDialog", {
          enabled: !0
        }));
        try {
          const [e] = await Promise.all([i.valueOrThrow(), n]);
          return e
        } catch (e) {
          throw this.#rs.delete(i), e
        }
      }
      async setGeolocation(e) {
        return await this.#Jn.setGeolocation(e)
      }
      target() {
        return this.#Wn
      }
      browser() {
        return this.#Wn.browser()
      }
      browserContext() {
        return this.#Wn.browserContext()
      }
      #ms() {
        this.emit("error", new Error("Page crashed!"))
      }
      #gs(e) {
        const {
          level: t,
          text: r,
          args: i,
          source: n,
          url: s,
          lineNumber: a
        } = e.entry;
        i && i.map((e => {
          Ln(this.#$n, e)
        })), "worker" !== n && this.emit("console", new sn(vs(t), r, [], [{
          url: s,
          lineNumber: a
        }]))
      }
      mainFrame() {
        return this.#ur.mainFrame()
      }
      get keyboard() {
        return this.#Fn
      }
      get touchscreen() {
        return this.#Xn
      }
      get coverage() {
        return this.#Zn
      }
      get tracing() {
        return this.#Qn
      }
      frames() {
        return this.#ur.frames()
      }
      workers() {
        return Array.from(this.#ts.values())
      }
      async setRequestInterception(e) {
        return await this.#ur.networkManager.setRequestInterception(e)
      }
      async setBypassServiceWorker(e) {
        return this.#ns = e, await this.#$n.send("Network.setBypassServiceWorker", {
          bypass: e
        })
      }
      async setDragInterception(e) {
        return this.#ss = e, await this.#$n.send("Input.setInterceptDrags", {
          enabled: e
        })
      }
      async setOfflineMode(e) {
        return await this.#ur.networkManager.setOfflineMode(e)
      }
      async emulateNetworkConditions(e) {
        return await this.#ur.networkManager.emulateNetworkConditions(e)
      }
      setDefaultNavigationTimeout(e) {
        this._timeoutSettings.setDefaultNavigationTimeout(e)
      }
      setDefaultTimeout(e) {
        this._timeoutSettings.setDefaultTimeout(e)
      }
      getDefaultTimeout() {
        return this._timeoutSettings.timeout()
      }
      getDefaultNavigationTimeout() {
        return this._timeoutSettings.navigationTimeout()
      }
      async queryObjects(e) {
        bt(!e.disposed, "Prototype JSHandle is disposed!"), bt(e.id, "Prototype JSHandle must not be referencing primitive value");
        const t = await this.mainFrame().client.send("Runtime.queryObjects", {
          prototypeObjectId: e.id
        });
        return this.mainFrame().mainRealm().createCdpHandle(t.objects)
      }
      async cookies(...e) {
        const t = (await this.#$n.send("Network.getCookies", {
            urls: e.length ? e : [this.url()]
          })).cookies,
          r = ["sourcePort"];
        return t.map((e => {
          for (const t of r) delete e[t];
          return e
        })).map((e => ({
          ...e,
          partitionKey: e.partitionKey ? e.partitionKey.topLevelSite : void 0
        })))
      }
      async deleteCookie(...e) {
        const t = this.url();
        for (const r of e) {
          const e = {
            ...r,
            partitionKey: Ss(r.partitionKey)
          };
          if (!r.url && t.startsWith("http") && (e.url = t), await this.#$n.send("Network.deleteCookies", e), t.startsWith("http") && !e.partitionKey) {
            const r = new URL(t);
            await this.#$n.send("Network.deleteCookies", {
              ...e,
              partitionKey: {
                topLevelSite: r.origin.replace(`:${r.port}`, ""),
                hasCrossSiteAncestor: !1
              }
            })
          }
        }
      }
      async setCookie(...e) {
        const t = this.url(),
          r = t.startsWith("http"),
          i = e.map((e => {
            const i = Object.assign({}, e);
            return !i.url && r && (i.url = t), bt("about:blank" !== i.url, `Blank page can not have cookie "${i.name}"`), bt(!String.prototype.startsWith.call(i.url || "", "data:"), `Data URL page can not have cookie "${i.name}"`), i
          }));
        await this.deleteCookie(...i), i.length && await this.#$n.send("Network.setCookies", {
          cookies: i.map((e => ({
            ...e,
            partitionKey: Ss(e.partitionKey)
          })))
        })
      }
      async exposeFunction(e, t) {
        if (this.#fr.has(e)) throw new Error(`Failed to add page binding with name ${e}: window['${e}'] already exists!`);
        const r = function (e, t) {
          return Ht(Fn, e, t, On)
        }("exposedFun", e);
        let i;
        if ("function" == typeof t) i = new nn(e, t, r);
        else i = new nn(e, t.default, r);
        this.#fr.set(e, i);
        const [{
          identifier: n
        }] = await Promise.all([this.#ur.evaluateOnNewDocument(r), this.#ur.addExposedFunctionBinding(i)]);
        this.#Yn.set(e, n)
      }
      async removeExposedFunction(e) {
        const t = this.#Yn.get(e);
        if (!t) throw new Error(`Function with name "${e}" does not exist`);
        const r = this.#fr.get(e);
        this.#Yn.delete(e), this.#fr.delete(e), await Promise.all([this.#ur.removeScriptToEvaluateOnNewDocument(t), this.#ur.removeExposedFunctionBinding(r)])
      }
      async authenticate(e) {
        return await this.#ur.networkManager.authenticate(e)
      }
      async setExtraHTTPHeaders(e) {
        return await this.#ur.networkManager.setExtraHTTPHeaders(e)
      }
      async setUserAgent(e, t) {
        return await this.#ur.networkManager.setUserAgent(e, t)
      }
      async metrics() {
        const e = await this.#$n.send("Performance.getMetrics");
        return this.#vs(e.metrics)
      }
      #fs(e) {
        this.emit("metrics", {
          title: e.title,
          metrics: this.#vs(e.metrics)
        })
      }
      #vs(e) {
        const t = {};
        for (const r of e || []) ks.has(r.name) && (t[r.name] = r.value);
        return t
      }
      #ps(e) {
        this.emit("pageerror", function (e) {
          let t, r;
          if (e.exception) {
            if (!("object" === e.exception.type && "error" === e.exception.subtype || e.exception.objectId)) return An(e.exception);
            {
              const i = Pn(e);
              t = i.name, r = i.message
            }
          } else t = "Error", r = e.text;
          const i = new Error(r);
          i.name = t;
          const n = i.message.split("\n").length,
            s = i.stack.split("\n").splice(0, n),
            a = [];
          if (e.stackTrace)
            for (const t of e.stackTrace.callFrames)
              if (a.push(`    at ${t.functionName||"<anonymous>"} (${t.url}:${t.lineNumber+1}:${t.columnNumber+1})`), a.length >= Error.stackTraceLimit) break;
          return i.stack = [...s, ...a].join("\n"), i
        }(e.exceptionDetails))
      }
      #mr(e, t) {
        const r = t.args.map((t => e.createCdpHandle(t)));
        this.#ws(vs(t.type), r, t.stackTrace)
      }
      async #pr(e, t) {
        let r;
        try {
          r = JSON.parse(t.payload)
        } catch {
          return
        }
        const {
          type: i,
          name: n,
          seq: s,
          args: a,
          isTrivial: o
        } = r;
        if ("exposedFun" !== i) return;
        const c = e.context;
        if (!c) return;
        const l = this.#fr.get(n);
        await (l?.run(c, s, a, o))
      }
      #ws(e, t, r) {
        if (!this.listenerCount("console")) return void t.forEach((e => e.dispose()));
        const i = [];
        for (const e of t) {
          const t = e.remoteObject();
          t.objectId ? i.push(e.toString()) : i.push(An(t))
        }
        const n = [];
        if (r)
          for (const e of r.callFrames) n.push({
            url: e.url,
            lineNumber: e.lineNumber,
            columnNumber: e.columnNumber
          });
        const s = new sn(vs(e), i.join(" "), t, n);
        this.emit("console", s)
      }
      #hs(e) {
        const t = function (e) {
            let t = null;
            return new Set(["alert", "confirm", "prompt", "beforeunload"]).has(e) && (t = e), bt(t, `Unknown javascript dialog type: ${e}`), t
          }(e.type),
          r = new vn(this.#$n, t, e.message, e.defaultPrompt);
        this.emit("dialog", r)
      }
      async reload(e) {
        const [t] = await Promise.all([this.waitForNavigation({
          ...e,
          ignoreSameDocumentNavigation: !0
        }), this.#$n.send("Page.reload")]);
        return t
      }
      async createCDPSession() {
        return await this.target().createCDPSession()
      }
      async goBack(e = {}) {
        return await this.#bs(-1, e)
      }
      async goForward(e = {}) {
        return await this.#bs(1, e)
      }
      async #bs(e, t) {
        const r = await this.#$n.send("Page.getNavigationHistory"),
          i = r.entries[r.currentIndex + e];
        if (!i) return null;
        return (await Promise.all([this.waitForNavigation(t), this.#$n.send("Page.navigateToHistoryEntry", {
          entryId: i.id
        })]))[0]
      }
      async bringToFront() {
        await this.#$n.send("Page.bringToFront")
      }
      async setJavaScriptEnabled(e) {
        return await this.#Jn.setJavaScriptEnabled(e)
      }
      async setBypassCSP(e) {
        await this.#$n.send("Page.setBypassCSP", {
          enabled: e
        })
      }
      async emulateMediaType(e) {
        return await this.#Jn.emulateMediaType(e)
      }
      async emulateCPUThrottling(e) {
        return await this.#Jn.emulateCPUThrottling(e)
      }
      async emulateMediaFeatures(e) {
        return await this.#Jn.emulateMediaFeatures(e)
      }
      async emulateTimezone(e) {
        return await this.#Jn.emulateTimezone(e)
      }
      async emulateIdleState(e) {
        return await this.#Jn.emulateIdleState(e)
      }
      async emulateVisionDeficiency(e) {
        return await this.#Jn.emulateVisionDeficiency(e)
      }
      async setViewport(e) {
        const t = await this.#Jn.emulateViewport(e);
        this.#es = e, t && await this.reload()
      }
      viewport() {
        return this.#es
      }
      async evaluateOnNewDocument(e, ...t) {
        const r = Ht(e, ...t);
        return await this.#ur.evaluateOnNewDocument(r)
      }
      async removeScriptToEvaluateOnNewDocument(e) {
        return await this.#ur.removeScriptToEvaluateOnNewDocument(e)
      }
      async setCacheEnabled(e = !0) {
        await this.#ur.networkManager.setCacheEnabled(e)
      }
      async _screenshot(e) {
        const t = {
          stack: [],
          error: void 0,
          hasError: !1
        };
        try {
          const {
            fromSurface: r,
            omitBackground: i,
            optimizeForSpeed: n,
            quality: s,
            clip: a,
            type: o,
            captureBeyondViewport: c
          } = e, l = ys(t, new mt, !0);
          !i || "png" !== o && "webp" !== o || (await this.#Jn.setTransparentBackgroundColor(), l.defer((async () => {
            await this.#Jn.resetDefaultBackgroundColor().catch(Rt)
          })));
          let d = a;
          if (d && !c) {
            d = function (e, t) {
              const r = Math.max(e.x, t.x),
                i = Math.max(e.y, t.y);
              return {
                x: r,
                y: i,
                width: Math.max(Math.min(e.x + e.width, t.x + t.width) - r, 0),
                height: Math.max(Math.min(e.y + e.height, t.y + t.height) - i, 0)
              }
            }(d, await this.mainFrame().isolatedRealm().evaluate((() => {
              const {
                height: e,
                pageLeft: t,
                pageTop: r,
                width: i
              } = window.visualViewport;
              return {
                x: t,
                y: r,
                height: e,
                width: i
              }
            })))
          }
          const {
            data: u
          } = await this.#$n.send("Page.captureScreenshot", {
            format: o,
            optimizeForSpeed: n,
            fromSurface: r,
            ...void 0 !== s ? {
              quality: Math.round(s)
            } : {},
            ...d ? {
              clip: {
                ...d,
                scale: d.scale ?? 1
              }
            } : {},
            captureBeyondViewport: c
          });
          return u
        } catch (e) {
          t.error = e, t.hasError = !0
        } finally {
          const e = ws(t);
          e && await e
        }
      }
      async createPDFStream(e = {}) {
        const {
          timeout: t = this._timeoutSettings.timeout()
        } = e, {
          landscape: r,
          displayHeaderFooter: i,
          headerTemplate: n,
          footerTemplate: s,
          printBackground: a,
          scale: o,
          width: c,
          height: l,
          margin: d,
          pageRanges: u,
          preferCSSPageSize: h,
          omitBackground: p,
          tagged: m,
          outline: f,
          waitForFonts: g
        } = function (e = {}, t = "in") {
          let r = 8.5,
            i = 11;
          if (e.format) {
            const n = Ot[e.format.toLowerCase()][t];
            bt(n, "Unknown paper format: " + e.format), r = n.width, i = n.height
          } else r = Vt(e.width, t) ?? r, i = Vt(e.height, t) ?? i;
          const n = {
            top: Vt(e.margin?.top, t) || 0,
            left: Vt(e.margin?.left, t) || 0,
            bottom: Vt(e.margin?.bottom, t) || 0,
            right: Vt(e.margin?.right, t) || 0
          };
          return e.outline && (e.tagged = !0), {
            scale: 1,
            displayHeaderFooter: !1,
            headerTemplate: "",
            footerTemplate: "",
            printBackground: !1,
            landscape: !1,
            pageRanges: "",
            preferCSSPageSize: !1,
            omitBackground: !1,
            outline: !1,
            tagged: !0,
            waitForFonts: !0,
            ...e,
            width: r,
            height: i,
            margin: n
          }
        }(e);
        p && await this.#Jn.setTransparentBackgroundColor(), g && await Re(Ae(this.mainFrame().isolatedRealm().evaluate((() => document.fonts.ready))).pipe(ct(Ut(t))));
        const y = this.#$n.send("Page.printToPDF", {
            transferMode: "ReturnAsStream",
            landscape: r,
            displayHeaderFooter: i,
            headerTemplate: n,
            footerTemplate: s,
            printBackground: a,
            scale: o,
            paperWidth: c,
            paperHeight: l,
            marginTop: d.top,
            marginBottom: d.bottom,
            marginLeft: d.left,
            marginRight: d.right,
            pageRanges: u,
            preferCSSPageSize: h,
            generateTaggedPDF: m,
            generateDocumentOutline: f
          }),
          w = await Re(Ae(y).pipe(ct(Ut(t))));
        return p && await this.#Jn.resetDefaultBackgroundColor(), bt(w.stream, "`stream` is missing from `Page.printToPDF"), await jt(this.#$n, w.stream)
      }
      async pdf(e = {}) {
        const {
          path: t
        } = e, r = await this.createPDFStream(e), i = await qt(r, t);
        return bt(i, "Could not create typed array"), i
      }
      async close(e = {
        runBeforeUnload: void 0
      }) {
        const t = {
          stack: [],
          error: void 0,
          hasError: !1
        };
        try {
          ys(t, await this.browserContext().waitForScreenshotOperations(), !1);
          const r = this.#$n.connection();
          bt(r, "Protocol error: Connection closed. Most likely the page has been closed.");
          !!e.runBeforeUnload ? await this.#$n.send("Page.close") : (await r.send("Target.closeTarget", {
            targetId: this.#Wn._targetId
          }), await this.#zn._isClosedDeferred.valueOrThrow())
        } catch (e) {
          t.error = e, t.hasError = !0
        } finally {
          ws(t)
        }
      }
      isClosed() {
        return this.#ot
      }
      get mouse() {
        return this.#Vn
      }
      async waitForDevicePrompt(e = {}) {
        return await this.mainFrame().waitForDevicePrompt(e)
      }
    }
    const ks = new Set(["Timestamp", "Documents", "Frames", "JSEventListeners", "Nodes", "LayoutCount", "RecalcStyleCount", "LayoutDuration", "RecalcStyleDuration", "ScriptDuration", "TaskDuration", "JSHeapUsedSize", "JSHeapTotalSize"]);

    function Ss(e) {
      if (void 0 !== e) return "string" == typeof e ? {
        topLevelSite: e,
        hasCrossSiteAncestor: !1
      } : {
        topLevelSite: e.sourceOrigin,
        hasCrossSiteAncestor: e.hasCrossSiteAncestor ?? !1
      }
    }
    var Ts, Es = function (e, t, r) {
        if (null != t) {
          if ("object" != typeof t && "function" != typeof t) throw new TypeError("Object expected.");
          var i, n;
          if (r) {
            if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
            i = t[Symbol.asyncDispose]
          }
          if (void 0 === i) {
            if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
            i = t[Symbol.dispose], r && (n = i)
          }
          if ("function" != typeof i) throw new TypeError("Object not disposable.");
          n && (i = function () {
            try {
              n.call(this)
            } catch (e) {
              return Promise.reject(e)
            }
          }), e.stack.push({
            value: t,
            dispose: i,
            async: r
          })
        } else r && e.stack.push({
          async: !0
        });
        return t
      },
      Cs = function (e) {
        return function (t) {
          function r(r) {
            t.error = t.hasError ? new e(r, t.error, "An error was suppressed during disposal.") : r, t.hasError = !0
          }
          var i, n = 0;
          return function e() {
            for (; i = t.stack.pop();) try {
              if (!i.async && 1 === n) return n = 0, t.stack.push(i), Promise.resolve().then(e);
              if (i.dispose) {
                var s = i.dispose.call(i.value);
                if (i.async) return n |= 2, Promise.resolve(s).then(e, (function (t) {
                  return r(t), e()
                }))
              } else n |= 1
            } catch (e) {
              r(e)
            }
            if (1 === n) return t.hasError ? Promise.reject(t.error) : Promise.resolve();
            if (t.hasError) throw t.error
          }()
        }
      }("function" == typeof SuppressedError ? SuppressedError : function (e, t, r) {
        var i = new Error(r);
        return i.name = "SuppressedError", i.error = e, i.suppressed = t, i
      });
    class xs extends rr {
      #Ze;
      #ks;
      #Ge;
      constructor(e, t, r) {
        super(), this.#Ze = e, this.#ks = t, this.#Ge = r
      }
      get id() {
        return this.#Ge
      }
      targets() {
        return this.#ks.targets().filter((e => e.browserContext() === this))
      }
      async pages() {
        return (await Promise.all(this.targets().filter((e => "page" === e.type() || "other" === e.type() && this.#ks._getIsPageTargetCallback()?.(e))).map((e => e.page())))).filter((e => !!e))
      }
      async overridePermissions(e, t) {
        const r = t.map((e => {
          const t = Yt.get(e);
          if (!t) throw new Error("Unknown permission: " + e);
          return t
        }));
        await this.#Ze.send("Browser.grantPermissions", {
          origin: e,
          browserContextId: this.#Ge || void 0,
          permissions: r
        })
      }
      async clearPermissionOverrides() {
        await this.#Ze.send("Browser.resetPermissions", {
          browserContextId: this.#Ge || void 0
        })
      }
      async newPage() {
        const e = {
          stack: [],
          error: void 0,
          hasError: !1
        };
        try {
          Es(e, await this.waitForScreenshotOperations(), !1);
          return await this.#ks._createPageInContext(this.#Ge)
        } catch (t) {
          e.error = t, e.hasError = !0
        } finally {
          Cs(e)
        }
      }
      browser() {
        return this.#ks
      }
      async close() {
        bt(this.#Ge, "Default BrowserContext cannot be closed!"), await this.#ks._disposeContext(this.#Ge)
      }
      async cookies() {
        const {
          cookies: e
        } = await this.#Ze.send("Storage.getCookies", {
          browserContextId: this.#Ge
        });
        return e.map((e => ({
          ...e,
          partitionKey: e.partitionKey ? {
            sourceOrigin: e.partitionKey.topLevelSite,
            hasCrossSiteAncestor: e.partitionKey.hasCrossSiteAncestor
          } : void 0
        })))
      }
      async setCookie(...e) {
        return await this.#Ze.send("Storage.setCookies", {
          browserContextId: this.#Ge,
          cookies: e.map((e => ({
            ...e,
            partitionKey: Ss(e.partitionKey)
          })))
        })
      }
      async setDownloadBehavior(e) {
        await this.#Ze.send("Browser.setDownloadBehavior", {
          behavior: e.policy,
          downloadPath: e.downloadPath,
          browserContextId: this.#Ge
        })
      }
    }! function (e) {
      e.SUCCESS = "success", e.ABORTED = "aborted"
    }(Ts || (Ts = {}));
    class Ms extends Vi {
      #Ss;
      #Ts;
      #Es;
      #Un;
      #Cs;
      #xs = new Set;
      _initializedDeferred = er.create();
      _isClosedDeferred = er.create();
      _targetId;
      constructor(e, t, r, i, n) {
        super(), this.#Ts = t, this.#Un = i, this.#Es = e, this.#Ss = r, this._targetId = e.targetId, this.#Cs = n, this.#Ts && this.#Ts.setTarget(this)
      }
      async asPage() {
        const e = this._session();
        return e ? await bs._create(e, this, null) : await this.createCDPSession().then((e => bs._create(e, this, null)))
      }
      _subtype() {
        return this.#Es.subtype
      }
      _session() {
        return this.#Ts
      }
      _addChildTarget(e) {
        this.#xs.add(e)
      }
      _removeChildTarget(e) {
        this.#xs.delete(e)
      }
      _childTargets() {
        return this.#xs
      }
      _sessionFactory() {
        if (!this.#Cs) throw new Error("sessionFactory is not initialized");
        return this.#Cs
      }
      createCDPSession() {
        if (!this.#Cs) throw new Error("sessionFactory is not initialized");
        return this.#Cs(!1).then((e => (e.setTarget(this), e)))
      }
      url() {
        return this.#Es.url
      }
      type() {
        switch (this.#Es.type) {
        case "page":
          return zi.PAGE;
        case "background_page":
          return zi.BACKGROUND_PAGE;
        case "service_worker":
          return zi.SERVICE_WORKER;
        case "shared_worker":
          return zi.SHARED_WORKER;
        case "browser":
          return zi.BROWSER;
        case "webview":
          return zi.WEBVIEW;
        case "tab":
          return zi.TAB;
        default:
          return zi.OTHER
        }
      }
      _targetManager() {
        if (!this.#Un) throw new Error("targetManager is not initialized");
        return this.#Un
      }
      _getTargetInfo() {
        return this.#Es
      }
      browser() {
        if (!this.#Ss) throw new Error("browserContext is not initialized");
        return this.#Ss.browser()
      }
      browserContext() {
        if (!this.#Ss) throw new Error("browserContext is not initialized");
        return this.#Ss
      }
      opener() {
        const {
          openerId: e
        } = this.#Es;
        if (e) return this.browser().targets().find((t => t._targetId === e))
      }
      _targetInfoChanged(e) {
        this.#Es = e, this._checkIfInitialized()
      }
      _initialize() {
        this._initializedDeferred.resolve(Ts.SUCCESS)
      }
      _isTargetExposed() {
        return this.type() !== zi.TAB && !this._subtype()
      }
      _checkIfInitialized() {
        this._initializedDeferred.resolved() || this._initializedDeferred.resolve(Ts.SUCCESS)
      }
    }
    class _s extends Ms {
      #Ms;
      pagePromise;
      constructor(e, t, r, i, n, s) {
        super(e, t, r, i, n), this.#Ms = s ?? void 0
      }
      _initialize() {
        this._initializedDeferred.valueOrThrow().then((async e => {
          if (e === Ts.ABORTED) return;
          const t = this.opener();
          if (!(t instanceof _s)) return;
          if (!t || !t.pagePromise || "page" !== this.type()) return !0;
          const r = await t.pagePromise;
          if (!r.listenerCount("popup")) return !0;
          const i = await this.page();
          return r.emit("popup", i), !0
        })).catch(Rt), this._checkIfInitialized()
      }
      async page() {
        if (!this.pagePromise) {
          const e = this._session();
          this.pagePromise = (e ? Promise.resolve(e) : this._sessionFactory()(!1)).then((e => bs._create(e, this, this.#Ms ?? null)))
        }
        return await this.pagePromise ?? null
      }
      _checkIfInitialized() {
        this._initializedDeferred.resolved() || "" !== this._getTargetInfo().url && this._initializedDeferred.resolve(Ts.SUCCESS)
      }
    }
    class Is extends _s {}
    class Ps extends Ms {
      #_s;
      async worker() {
        if (!this.#_s) {
          const e = this._session();
          this.#_s = (e ? Promise.resolve(e) : this._sessionFactory()(!1)).then((e => new gs(e, this._getTargetInfo().url, this._targetId, this.type(), (() => {}), (() => {}))))
        }
        return await this.#_s
      }
    }
    class As extends Ms {}
    class Fs extends ft {
      #Ze;
      #Is = new Map;
      #Ps = new Map;
      #As = new Map;
      #Fs = new Set;
      #Os;
      #Rs;
      #Ls = new WeakMap;
      #Ds = new WeakMap;
      #Ns = er.create();
      #Bs = new Set;
      #Ks = !0;
      #Hs = [{}];
      constructor(e, t, r, i = !0) {
        super(), this.#Ze = e, this.#Os = r, this.#Rs = t, this.#Ks = i, this.#Ze.on("Target.targetCreated", this.#qs), this.#Ze.on("Target.targetDestroyed", this.#js), this.#Ze.on("Target.targetInfoChanged", this.#Us), this.#Ze.on(ir.SessionDetached, this.#$s), this.#Ws(this.#Ze)
      }
      #Gs = () => {
        if (this.#Ks)
          for (const [e, t] of this.#Is.entries()) {
            const r = new Ms(t, void 0, void 0, this, void 0),
              i = "page" === t.type || "iframe" === t.type,
              n = t.url.startsWith("chrome-extension://");
            this.#Os && !this.#Os(r) || !i || n || this.#Bs.add(e)
          }
      };
      async initialize() {
        await this.#Ze.send("Target.setDiscoverTargets", {
          discover: !0,
          filter: this.#Hs
        }), this.#Gs(), await this.#Ze.send("Target.setAutoAttach", {
          waitForDebuggerOnStart: !0,
          flatten: !0,
          autoAttach: !0,
          filter: [{
            type: "page",
            exclude: !0
          }, ...this.#Hs]
        }), this.#zs(), await this.#Ns.valueOrThrow()
      }
      getChildTargets(e) {
        return e._childTargets()
      }
      dispose() {
        this.#Ze.off("Target.targetCreated", this.#qs), this.#Ze.off("Target.targetDestroyed", this.#js), this.#Ze.off("Target.targetInfoChanged", this.#Us), this.#Ze.off(ir.SessionDetached, this.#$s), this.#Vs(this.#Ze)
      }
      getAvailableTargets() {
        return this.#Ps
      }
      #Ws(e) {
        const t = t => {
          this.#us(e, t)
        };
        bt(!this.#Ls.has(e)), this.#Ls.set(e, t), e.on("Target.attachedToTarget", t);
        const r = t => this.#cs(e, t);
        bt(!this.#Ds.has(e)), this.#Ds.set(e, r), e.on("Target.detachedFromTarget", r)
      }
      #Vs(e) {
        const t = this.#Ls.get(e);
        t && (e.off("Target.attachedToTarget", t), this.#Ls.delete(e)), this.#Ds.has(e) && (e.off("Target.detachedFromTarget", this.#Ds.get(e)), this.#Ds.delete(e))
      }
      #$s = e => {
        this.#Vs(e)
      };
      #qs = async e => {
        if (this.#Is.set(e.targetInfo.targetId, e.targetInfo), this.emit("targetDiscovered", e.targetInfo), "browser" === e.targetInfo.type && e.targetInfo.attached) {
          if (this.#Ps.has(e.targetInfo.targetId)) return;
          const t = this.#Rs(e.targetInfo, void 0);
          t._initialize(), this.#Ps.set(e.targetInfo.targetId, t)
        }
      };
      #js = e => {
        const t = this.#Is.get(e.targetId);
        if (this.#Is.delete(e.targetId), this.#zs(e.targetId), "service_worker" === t?.type && this.#Ps.has(e.targetId)) {
          const t = this.#Ps.get(e.targetId);
          t && (this.emit("targetGone", t), this.#Ps.delete(e.targetId))
        }
      };
      #Us = e => {
        if (this.#Is.set(e.targetInfo.targetId, e.targetInfo), this.#Fs.has(e.targetInfo.targetId) || !this.#Ps.has(e.targetInfo.targetId) || !e.targetInfo.attached) return;
        const t = this.#Ps.get(e.targetInfo.targetId);
        if (!t) return;
        const r = t.url(),
          i = t._initializedDeferred.value() === Ts.SUCCESS;
        if (function (e, t) {
            return Boolean(e._subtype()) && !t.subtype
          }(t, e.targetInfo)) {
          const e = t?._session();
          bt(e, "Target that is being activated is missing a CDPSession."), e.parentSession()?.emit(ir.Swapped, e)
        }
        t._targetInfoChanged(e.targetInfo), i && r !== t.url() && this.emit("targetChanged", {
          target: t,
          wasInitialized: i,
          previousURL: r
        })
      };
      #us = async (e, t) => {
        const r = t.targetInfo,
          i = this.#Ze._session(t.sessionId);
        if (!i) throw new Error(`Session ${t.sessionId} was not created.`);
        const n = async () => {
          await i.send("Runtime.runIfWaitingForDebugger").catch(Rt), await e.send("Target.detachFromTarget", {
            sessionId: i.id()
          }).catch(Rt)
        };
        if (!this.#Ze.isAutoAttached(r.targetId)) return;
        if ("service_worker" === r.type) {
          if (this.#zs(r.targetId), await n(), this.#Ps.has(r.targetId)) return;
          const e = this.#Rs(r);
          return e._initialize(), this.#Ps.set(r.targetId, e), void this.emit("targetAvailable", e)
        }
        const s = this.#Ps.has(r.targetId),
          a = s ? this.#Ps.get(r.targetId) : this.#Rs(r, i, e instanceof ln ? e : void 0);
        if (this.#Os && !this.#Os(a)) return this.#Fs.add(r.targetId), this.#zs(r.targetId), void await n();
        this.#Ws(i), s ? (i.setTarget(a), this.#As.set(i.id(), this.#Ps.get(r.targetId))) : (a._initialize(), this.#Ps.set(r.targetId, a), this.#As.set(i.id(), a));
        const o = e instanceof nr ? e.target() : null;
        o?._addChildTarget(a), e.emit(ir.Ready, i), this.#Bs.delete(a._targetId), s || this.emit("targetAvailable", a), this.#zs(), await Promise.all([i.send("Target.setAutoAttach", {
          waitForDebuggerOnStart: !0,
          flatten: !0,
          autoAttach: !0,
          filter: this.#Hs
        }), i.send("Runtime.runIfWaitingForDebugger")]).catch(Rt)
      };
      #zs(e) {
        void 0 !== e && this.#Bs.delete(e), 0 === this.#Bs.size && this.#Ns.resolve()
      }
      #cs = (e, t) => {
        const r = this.#As.get(t.sessionId);
        this.#As.delete(t.sessionId), r && (e instanceof nr && e.target()._removeChildTarget(r), this.#Ps.delete(r._targetId), this.emit("targetGone", r))
      }
    }
    class Os extends Zt {
      protocol = "cdp";
      static async _create(e, t, r, i, n, s, a, o, c, l = !0) {
        const d = new Os(e, t, i, s, a, o, c, l);
        return r && await e.send("Security.setIgnoreCertificateErrors", {
          ignore: !0
        }), await d._attach(n), d
      }
      #Ms;
      #Xs;
      #Ze;
      #Js;
      #Os;
      #Qs;
      #Ys;
      #Zs = new Map;
      #Un;
      constructor(e, t, r, i, n, s, a, o = !0) {
        super(), this.#Ms = r, this.#Xs = i, this.#Ze = e, this.#Js = n || (() => {}), this.#Os = s || (() => !0), this.#ea(a), this.#Un = new Fs(e, this.#ta, this.#Os, o), this.#Ys = new xs(this.#Ze, this);
        for (const e of t) this.#Zs.set(e, new xs(this.#Ze, this, e))
      }
      #ra = () => {
        this.emit("disconnected", void 0)
      };
      async _attach(e) {
        this.#Ze.on(ir.Disconnected, this.#ra), e && await this.#Ys.setDownloadBehavior(e), this.#Un.on("targetAvailable", this.#us), this.#Un.on("targetGone", this.#cs), this.#Un.on("targetChanged", this.#ia), this.#Un.on("targetDiscovered", this.#na), await this.#Un.initialize()
      }
      _detach() {
        this.#Ze.off(ir.Disconnected, this.#ra), this.#Un.off("targetAvailable", this.#us), this.#Un.off("targetGone", this.#cs), this.#Un.off("targetChanged", this.#ia), this.#Un.off("targetDiscovered", this.#na)
      }
      process() {
        return this.#Xs ?? null
      }
      _targetManager() {
        return this.#Un
      }
      #ea(e) {
        this.#Qs = e || (e => "page" === e.type() || "background_page" === e.type() || "webview" === e.type())
      }
      _getIsPageTargetCallback() {
        return this.#Qs
      }
      async createBrowserContext(e = {}) {
        const {
          proxyServer: t,
          proxyBypassList: r,
          downloadBehavior: i
        } = e, {
          browserContextId: n
        } = await this.#Ze.send("Target.createBrowserContext", {
          proxyServer: t,
          proxyBypassList: r && r.join(",")
        }), s = new xs(this.#Ze, this, n);
        return i && await s.setDownloadBehavior(i), this.#Zs.set(n, s), s
      }
      browserContexts() {
        return [this.#Ys, ...Array.from(this.#Zs.values())]
      }
      defaultBrowserContext() {
        return this.#Ys
      }
      async _disposeContext(e) {
        e && (await this.#Ze.send("Target.disposeBrowserContext", {
          browserContextId: e
        }), this.#Zs.delete(e))
      }
      #ta = (e, t) => {
        const {
          browserContextId: r
        } = e, i = r && this.#Zs.has(r) ? this.#Zs.get(r) : this.#Ys;
        if (!i) throw new Error("Missing browser context");
        const n = t => this.#Ze._createSession(e, t),
          s = new As(e, t, i, this.#Un, n);
        return e.url?.startsWith("devtools://") ? new Is(e, t, i, this.#Un, n, this.#Ms ?? null) : this.#Qs(s) ? new _s(e, t, i, this.#Un, n, this.#Ms ?? null) : "service_worker" === e.type || "shared_worker" === e.type ? new Ps(e, t, i, this.#Un, n) : s
      };
      #us = async e => {
        e._isTargetExposed() && await e._initializedDeferred.valueOrThrow() === Ts.SUCCESS && (this.emit("targetcreated", e), e.browserContext().emit("targetcreated", e))
      };
      #cs = async e => {
        e._initializedDeferred.resolve(Ts.ABORTED), e._isClosedDeferred.resolve(), e._isTargetExposed() && await e._initializedDeferred.valueOrThrow() === Ts.SUCCESS && (this.emit("targetdestroyed", e), e.browserContext().emit("targetdestroyed", e))
      };
      #ia = ({
        target: e
      }) => {
        this.emit("targetchanged", e), e.browserContext().emit("targetchanged", e)
      };
      #na = e => {
        this.emit("targetdiscovered", e)
      };
      wsEndpoint() {
        return this.#Ze.url()
      }
      async newPage() {
        return await this.#Ys.newPage()
      }
      async _createPageInContext(e) {
        const {
          targetId: t
        } = await this.#Ze.send("Target.createTarget", {
          url: "about:blank",
          browserContextId: e || void 0
        }), r = await this.waitForTarget((e => e._targetId === t));
        if (!r) throw new Error(`Missing target for page (id = ${t})`);
        if (!(await r._initializedDeferred.valueOrThrow() === Ts.SUCCESS)) throw new Error(`Failed to create target for page (id = ${t})`);
        const i = await r.page();
        if (!i) throw new Error(`Failed to create a page for context (id = ${e})`);
        return i
      }
      targets() {
        return Array.from(this.#Un.getAvailableTargets().values()).filter((e => e._isTargetExposed() && e._initializedDeferred.value() === Ts.SUCCESS))
      }
      target() {
        const e = this.targets().find((e => "browser" === e.type()));
        if (!e) throw new Error("Browser target is not found");
        return e
      }
      async version() {
        return (await this.#sa()).product
      }
      async userAgent() {
        return (await this.#sa()).userAgent
      }
      async close() {
        await this.#Js.call(null), await this.disconnect()
      }
      disconnect() {
        return this.#Un.dispose(), this.#Ze.dispose(), this._detach(), Promise.resolve()
      }
      get connected() {
        return !this.#Ze._closed
      }
      #sa() {
        return this.#Ze.send("Browser.getVersion")
      }
      get debugInfo() {
        return {
          pendingProtocolErrors: this.#Ze.getPendingProtocolErrors()
        }
      }
    }
    const Rs = {
        targetId: "tabTargetId",
        type: "tab",
        title: "tab",
        url: "about:blank",
        attached: !1,
        canAccessOpener: !1
      },
      Ls = {
        targetId: "pageTargetId",
        type: "page",
        title: "page",
        url: "about:blank",
        attached: !1,
        canAccessOpener: !1
      };
    class Ds {
      static async connectTab(e) {
        return await chrome.debugger.attach({
          tabId: e
        }, "1.3"), new Ds(e)
      }
      onmessage;
      onclose;
      #aa;
      constructor(e) {
        this.#aa = e, chrome.debugger.onEvent.addListener(this.#oa)
      }
      #oa = (e, t, r) => {
        e.tabId === this.#aa && this.#ca({
          sessionId: e.sessionId ?? "pageTargetSessionId",
          method: t,
          params: r
        })
      };
      #ca(e) {
        this.onmessage?.(JSON.stringify(e))
      }
      send(e) {
        const t = JSON.parse(e);
        switch (t.method) {
        case "Browser.getVersion":
          return void this.#ca({
            id: t.id,
            sessionId: t.sessionId,
            method: t.method,
            result: {
              protocolVersion: "1.3",
              product: "chrome",
              revision: "unknown",
              userAgent: "chrome",
              jsVersion: "unknown"
            }
          });
        case "Target.getBrowserContexts":
          return void this.#ca({
            id: t.id,
            sessionId: t.sessionId,
            method: t.method,
            result: {
              browserContextIds: []
            }
          });
        case "Target.setDiscoverTargets":
          return this.#ca({
            method: "Target.targetCreated",
            params: {
              targetInfo: Rs
            }
          }), this.#ca({
            method: "Target.targetCreated",
            params: {
              targetInfo: Ls
            }
          }), void this.#ca({
            id: t.id,
            sessionId: t.sessionId,
            method: t.method,
            result: {}
          });
        case "Target.setAutoAttach":
          if ("tabTargetSessionId" === t.sessionId) return this.#ca({
            method: "Target.attachedToTarget",
            params: {
              targetInfo: Ls,
              sessionId: "pageTargetSessionId"
            }
          }), void this.#ca({
            id: t.id,
            sessionId: t.sessionId,
            method: t.method,
            result: {}
          });
          if (!t.sessionId) return this.#ca({
            method: "Target.attachedToTarget",
            params: {
              targetInfo: Rs,
              sessionId: "tabTargetSessionId"
            }
          }), void this.#ca({
            id: t.id,
            sessionId: t.sessionId,
            method: t.method,
            result: {}
          })
        }
        "pageTargetSessionId" === t.sessionId && delete t.sessionId, chrome.debugger.sendCommand({
          tabId: this.#aa,
          sessionId: t.sessionId
        }, t.method, t.params).then((e => {
          this.#ca({
            id: t.id,
            sessionId: t.sessionId ?? "pageTargetSessionId",
            method: t.method,
            result: e
          })
        })).catch((e => {
          this.#ca({
            id: t.id,
            sessionId: t.sessionId ?? "pageTargetSessionId",
            method: t.method,
            error: {
              code: e?.code,
              data: e?.data,
              message: e?.message ?? "CDP error had no message"
            }
          })
        }))
      }
      close() {
        chrome.debugger.onEvent.removeListener(this.#oa), chrome.debugger.detach({
          tabId: this.#aa
        })
      }
    }
    Object.freeze({
      "Slow 3G": {
        download: 5e4,
        upload: 5e4,
        latency: 2e3
      },
      "Fast 3G": {
        download: 18e4,
        upload: 84375,
        latency: 562.5
      },
      "Slow 4G": {
        download: 18e4,
        upload: 84375,
        latency: 562.5
      },
      "Fast 4G": {
        download: 1012500,
        upload: 168750,
        latency: 165
      }
    });
    const Ns = [{
        name: "Blackberry PlayBook",
        userAgent: "Mozilla/5.0 (PlayBook; U; RIM Tablet OS 2.1.0; en-US) AppleWebKit/536.2+ (KHTML like Gecko) Version/7.2.1.0 Safari/536.2+",
        viewport: {
          width: 600,
          height: 1024,
          deviceScaleFactor: 1,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !1
        }
      }, {
        name: "Blackberry PlayBook landscape",
        userAgent: "Mozilla/5.0 (PlayBook; U; RIM Tablet OS 2.1.0; en-US) AppleWebKit/536.2+ (KHTML like Gecko) Version/7.2.1.0 Safari/536.2+",
        viewport: {
          width: 1024,
          height: 600,
          deviceScaleFactor: 1,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !0
        }
      }, {
        name: "BlackBerry Z30",
        userAgent: "Mozilla/5.0 (BB10; Touch) AppleWebKit/537.10+ (KHTML, like Gecko) Version/10.0.9.2372 Mobile Safari/537.10+",
        viewport: {
          width: 360,
          height: 640,
          deviceScaleFactor: 2,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !1
        }
      }, {
        name: "BlackBerry Z30 landscape",
        userAgent: "Mozilla/5.0 (BB10; Touch) AppleWebKit/537.10+ (KHTML, like Gecko) Version/10.0.9.2372 Mobile Safari/537.10+",
        viewport: {
          width: 640,
          height: 360,
          deviceScaleFactor: 2,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !0
        }
      }, {
        name: "Galaxy Note 3",
        userAgent: "Mozilla/5.0 (Linux; U; Android 4.3; en-us; SM-N900T Build/JSS15J) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30",
        viewport: {
          width: 360,
          height: 640,
          deviceScaleFactor: 3,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !1
        }
      }, {
        name: "Galaxy Note 3 landscape",
        userAgent: "Mozilla/5.0 (Linux; U; Android 4.3; en-us; SM-N900T Build/JSS15J) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30",
        viewport: {
          width: 640,
          height: 360,
          deviceScaleFactor: 3,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !0
        }
      }, {
        name: "Galaxy Note II",
        userAgent: "Mozilla/5.0 (Linux; U; Android 4.1; en-us; GT-N7100 Build/JRO03C) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30",
        viewport: {
          width: 360,
          height: 640,
          deviceScaleFactor: 2,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !1
        }
      }, {
        name: "Galaxy Note II landscape",
        userAgent: "Mozilla/5.0 (Linux; U; Android 4.1; en-us; GT-N7100 Build/JRO03C) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30",
        viewport: {
          width: 640,
          height: 360,
          deviceScaleFactor: 2,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !0
        }
      }, {
        name: "Galaxy S III",
        userAgent: "Mozilla/5.0 (Linux; U; Android 4.0; en-us; GT-I9300 Build/IMM76D) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30",
        viewport: {
          width: 360,
          height: 640,
          deviceScaleFactor: 2,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !1
        }
      }, {
        name: "Galaxy S III landscape",
        userAgent: "Mozilla/5.0 (Linux; U; Android 4.0; en-us; GT-I9300 Build/IMM76D) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30",
        viewport: {
          width: 640,
          height: 360,
          deviceScaleFactor: 2,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !0
        }
      }, {
        name: "Galaxy S5",
        userAgent: "Mozilla/5.0 (Linux; Android 5.0; SM-G900P Build/LRX21T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3765.0 Mobile Safari/537.36",
        viewport: {
          width: 360,
          height: 640,
          deviceScaleFactor: 3,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !1
        }
      }, {
        name: "Galaxy S5 landscape",
        userAgent: "Mozilla/5.0 (Linux; Android 5.0; SM-G900P Build/LRX21T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3765.0 Mobile Safari/537.36",
        viewport: {
          width: 640,
          height: 360,
          deviceScaleFactor: 3,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !0
        }
      }, {
        name: "Galaxy S8",
        userAgent: "Mozilla/5.0 (Linux; Android 7.0; SM-G950U Build/NRD90M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.84 Mobile Safari/537.36",
        viewport: {
          width: 360,
          height: 740,
          deviceScaleFactor: 3,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !1
        }
      }, {
        name: "Galaxy S8 landscape",
        userAgent: "Mozilla/5.0 (Linux; Android 7.0; SM-G950U Build/NRD90M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.84 Mobile Safari/537.36",
        viewport: {
          width: 740,
          height: 360,
          deviceScaleFactor: 3,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !0
        }
      }, {
        name: "Galaxy S9+",
        userAgent: "Mozilla/5.0 (Linux; Android 8.0.0; SM-G965U Build/R16NW) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.111 Mobile Safari/537.36",
        viewport: {
          width: 320,
          height: 658,
          deviceScaleFactor: 4.5,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !1
        }
      }, {
        name: "Galaxy S9+ landscape",
        userAgent: "Mozilla/5.0 (Linux; Android 8.0.0; SM-G965U Build/R16NW) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.111 Mobile Safari/537.36",
        viewport: {
          width: 658,
          height: 320,
          deviceScaleFactor: 4.5,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !0
        }
      }, {
        name: "Galaxy Tab S4",
        userAgent: "Mozilla/5.0 (Linux; Android 8.1.0; SM-T837A) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.80 Safari/537.36",
        viewport: {
          width: 712,
          height: 1138,
          deviceScaleFactor: 2.25,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !1
        }
      }, {
        name: "Galaxy Tab S4 landscape",
        userAgent: "Mozilla/5.0 (Linux; Android 8.1.0; SM-T837A) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.80 Safari/537.36",
        viewport: {
          width: 1138,
          height: 712,
          deviceScaleFactor: 2.25,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !0
        }
      }, {
        name: "iPad",
        userAgent: "Mozilla/5.0 (iPad; CPU OS 11_0 like Mac OS X) AppleWebKit/604.1.34 (KHTML, like Gecko) Version/11.0 Mobile/15A5341f Safari/604.1",
        viewport: {
          width: 768,
          height: 1024,
          deviceScaleFactor: 2,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !1
        }
      }, {
        name: "iPad landscape",
        userAgent: "Mozilla/5.0 (iPad; CPU OS 11_0 like Mac OS X) AppleWebKit/604.1.34 (KHTML, like Gecko) Version/11.0 Mobile/15A5341f Safari/604.1",
        viewport: {
          width: 1024,
          height: 768,
          deviceScaleFactor: 2,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !0
        }
      }, {
        name: "iPad (gen 6)",
        userAgent: "Mozilla/5.0 (iPad; CPU OS 12_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Mobile/15E148 Safari/604.1",
        viewport: {
          width: 768,
          height: 1024,
          deviceScaleFactor: 2,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !1
        }
      }, {
        name: "iPad (gen 6) landscape",
        userAgent: "Mozilla/5.0 (iPad; CPU OS 12_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Mobile/15E148 Safari/604.1",
        viewport: {
          width: 1024,
          height: 768,
          deviceScaleFactor: 2,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !0
        }
      }, {
        name: "iPad (gen 7)",
        userAgent: "Mozilla/5.0 (iPad; CPU OS 12_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Mobile/15E148 Safari/604.1",
        viewport: {
          width: 810,
          height: 1080,
          deviceScaleFactor: 2,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !1
        }
      }, {
        name: "iPad (gen 7) landscape",
        userAgent: "Mozilla/5.0 (iPad; CPU OS 12_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Mobile/15E148 Safari/604.1",
        viewport: {
          width: 1080,
          height: 810,
          deviceScaleFactor: 2,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !0
        }
      }, {
        name: "iPad Mini",
        userAgent: "Mozilla/5.0 (iPad; CPU OS 11_0 like Mac OS X) AppleWebKit/604.1.34 (KHTML, like Gecko) Version/11.0 Mobile/15A5341f Safari/604.1",
        viewport: {
          width: 768,
          height: 1024,
          deviceScaleFactor: 2,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !1
        }
      }, {
        name: "iPad Mini landscape",
        userAgent: "Mozilla/5.0 (iPad; CPU OS 11_0 like Mac OS X) AppleWebKit/604.1.34 (KHTML, like Gecko) Version/11.0 Mobile/15A5341f Safari/604.1",
        viewport: {
          width: 1024,
          height: 768,
          deviceScaleFactor: 2,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !0
        }
      }, {
        name: "iPad Pro",
        userAgent: "Mozilla/5.0 (iPad; CPU OS 11_0 like Mac OS X) AppleWebKit/604.1.34 (KHTML, like Gecko) Version/11.0 Mobile/15A5341f Safari/604.1",
        viewport: {
          width: 1024,
          height: 1366,
          deviceScaleFactor: 2,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !1
        }
      }, {
        name: "iPad Pro landscape",
        userAgent: "Mozilla/5.0 (iPad; CPU OS 11_0 like Mac OS X) AppleWebKit/604.1.34 (KHTML, like Gecko) Version/11.0 Mobile/15A5341f Safari/604.1",
        viewport: {
          width: 1366,
          height: 1024,
          deviceScaleFactor: 2,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !0
        }
      }, {
        name: "iPad Pro 11",
        userAgent: "Mozilla/5.0 (iPad; CPU OS 12_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Mobile/15E148 Safari/604.1",
        viewport: {
          width: 834,
          height: 1194,
          deviceScaleFactor: 2,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !1
        }
      }, {
        name: "iPad Pro 11 landscape",
        userAgent: "Mozilla/5.0 (iPad; CPU OS 12_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Mobile/15E148 Safari/604.1",
        viewport: {
          width: 1194,
          height: 834,
          deviceScaleFactor: 2,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !0
        }
      }, {
        name: "iPhone 4",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 7_1_2 like Mac OS X) AppleWebKit/537.51.2 (KHTML, like Gecko) Version/7.0 Mobile/11D257 Safari/9537.53",
        viewport: {
          width: 320,
          height: 480,
          deviceScaleFactor: 2,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !1
        }
      }, {
        name: "iPhone 4 landscape",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 7_1_2 like Mac OS X) AppleWebKit/537.51.2 (KHTML, like Gecko) Version/7.0 Mobile/11D257 Safari/9537.53",
        viewport: {
          width: 480,
          height: 320,
          deviceScaleFactor: 2,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !0
        }
      }, {
        name: "iPhone 5",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 10_3_1 like Mac OS X) AppleWebKit/603.1.30 (KHTML, like Gecko) Version/10.0 Mobile/14E304 Safari/602.1",
        viewport: {
          width: 320,
          height: 568,
          deviceScaleFactor: 2,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !1
        }
      }, {
        name: "iPhone 5 landscape",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 10_3_1 like Mac OS X) AppleWebKit/603.1.30 (KHTML, like Gecko) Version/10.0 Mobile/14E304 Safari/602.1",
        viewport: {
          width: 568,
          height: 320,
          deviceScaleFactor: 2,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !0
        }
      }, {
        name: "iPhone 6",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1",
        viewport: {
          width: 375,
          height: 667,
          deviceScaleFactor: 2,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !1
        }
      }, {
        name: "iPhone 6 landscape",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1",
        viewport: {
          width: 667,
          height: 375,
          deviceScaleFactor: 2,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !0
        }
      }, {
        name: "iPhone 6 Plus",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1",
        viewport: {
          width: 414,
          height: 736,
          deviceScaleFactor: 3,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !1
        }
      }, {
        name: "iPhone 6 Plus landscape",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1",
        viewport: {
          width: 736,
          height: 414,
          deviceScaleFactor: 3,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !0
        }
      }, {
        name: "iPhone 7",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1",
        viewport: {
          width: 375,
          height: 667,
          deviceScaleFactor: 2,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !1
        }
      }, {
        name: "iPhone 7 landscape",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1",
        viewport: {
          width: 667,
          height: 375,
          deviceScaleFactor: 2,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !0
        }
      }, {
        name: "iPhone 7 Plus",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1",
        viewport: {
          width: 414,
          height: 736,
          deviceScaleFactor: 3,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !1
        }
      }, {
        name: "iPhone 7 Plus landscape",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1",
        viewport: {
          width: 736,
          height: 414,
          deviceScaleFactor: 3,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !0
        }
      }, {
        name: "iPhone 8",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1",
        viewport: {
          width: 375,
          height: 667,
          deviceScaleFactor: 2,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !1
        }
      }, {
        name: "iPhone 8 landscape",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1",
        viewport: {
          width: 667,
          height: 375,
          deviceScaleFactor: 2,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !0
        }
      }, {
        name: "iPhone 8 Plus",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1",
        viewport: {
          width: 414,
          height: 736,
          deviceScaleFactor: 3,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !1
        }
      }, {
        name: "iPhone 8 Plus landscape",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1",
        viewport: {
          width: 736,
          height: 414,
          deviceScaleFactor: 3,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !0
        }
      }, {
        name: "iPhone SE",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 10_3_1 like Mac OS X) AppleWebKit/603.1.30 (KHTML, like Gecko) Version/10.0 Mobile/14E304 Safari/602.1",
        viewport: {
          width: 320,
          height: 568,
          deviceScaleFactor: 2,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !1
        }
      }, {
        name: "iPhone SE landscape",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 10_3_1 like Mac OS X) AppleWebKit/603.1.30 (KHTML, like Gecko) Version/10.0 Mobile/14E304 Safari/602.1",
        viewport: {
          width: 568,
          height: 320,
          deviceScaleFactor: 2,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !0
        }
      }, {
        name: "iPhone X",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1",
        viewport: {
          width: 375,
          height: 812,
          deviceScaleFactor: 3,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !1
        }
      }, {
        name: "iPhone X landscape",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1",
        viewport: {
          width: 812,
          height: 375,
          deviceScaleFactor: 3,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !0
        }
      }, {
        name: "iPhone XR",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 12_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.0 Mobile/15E148 Safari/604.1",
        viewport: {
          width: 414,
          height: 896,
          deviceScaleFactor: 3,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !1
        }
      }, {
        name: "iPhone XR landscape",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 12_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.0 Mobile/15E148 Safari/604.1",
        viewport: {
          width: 896,
          height: 414,
          deviceScaleFactor: 3,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !0
        }
      }, {
        name: "iPhone 11",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 13_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1 Mobile/15E148 Safari/604.1",
        viewport: {
          width: 414,
          height: 828,
          deviceScaleFactor: 2,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !1
        }
      }, {
        name: "iPhone 11 landscape",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 13_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1 Mobile/15E148 Safari/604.1",
        viewport: {
          width: 828,
          height: 414,
          deviceScaleFactor: 2,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !0
        }
      }, {
        name: "iPhone 11 Pro",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 13_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1 Mobile/15E148 Safari/604.1",
        viewport: {
          width: 375,
          height: 812,
          deviceScaleFactor: 3,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !1
        }
      }, {
        name: "iPhone 11 Pro landscape",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 13_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1 Mobile/15E148 Safari/604.1",
        viewport: {
          width: 812,
          height: 375,
          deviceScaleFactor: 3,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !0
        }
      }, {
        name: "iPhone 11 Pro Max",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 13_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1 Mobile/15E148 Safari/604.1",
        viewport: {
          width: 414,
          height: 896,
          deviceScaleFactor: 3,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !1
        }
      }, {
        name: "iPhone 11 Pro Max landscape",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 13_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1 Mobile/15E148 Safari/604.1",
        viewport: {
          width: 896,
          height: 414,
          deviceScaleFactor: 3,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !0
        }
      }, {
        name: "iPhone 12",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Mobile/15E148 Safari/604.1",
        viewport: {
          width: 390,
          height: 844,
          deviceScaleFactor: 3,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !1
        }
      }, {
        name: "iPhone 12 landscape",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Mobile/15E148 Safari/604.1",
        viewport: {
          width: 844,
          height: 390,
          deviceScaleFactor: 3,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !0
        }
      }, {
        name: "iPhone 12 Pro",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Mobile/15E148 Safari/604.1",
        viewport: {
          width: 390,
          height: 844,
          deviceScaleFactor: 3,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !1
        }
      }, {
        name: "iPhone 12 Pro landscape",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Mobile/15E148 Safari/604.1",
        viewport: {
          width: 844,
          height: 390,
          deviceScaleFactor: 3,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !0
        }
      }, {
        name: "iPhone 12 Pro Max",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Mobile/15E148 Safari/604.1",
        viewport: {
          width: 428,
          height: 926,
          deviceScaleFactor: 3,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !1
        }
      }, {
        name: "iPhone 12 Pro Max landscape",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Mobile/15E148 Safari/604.1",
        viewport: {
          width: 926,
          height: 428,
          deviceScaleFactor: 3,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !0
        }
      }, {
        name: "iPhone 12 Mini",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Mobile/15E148 Safari/604.1",
        viewport: {
          width: 375,
          height: 812,
          deviceScaleFactor: 3,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !1
        }
      }, {
        name: "iPhone 12 Mini landscape",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Mobile/15E148 Safari/604.1",
        viewport: {
          width: 812,
          height: 375,
          deviceScaleFactor: 3,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !0
        }
      }, {
        name: "iPhone 13",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Mobile/15E148 Safari/604.1",
        viewport: {
          width: 390,
          height: 844,
          deviceScaleFactor: 3,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !1
        }
      }, {
        name: "iPhone 13 landscape",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Mobile/15E148 Safari/604.1",
        viewport: {
          width: 844,
          height: 390,
          deviceScaleFactor: 3,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !0
        }
      }, {
        name: "iPhone 13 Pro",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Mobile/15E148 Safari/604.1",
        viewport: {
          width: 390,
          height: 844,
          deviceScaleFactor: 3,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !1
        }
      }, {
        name: "iPhone 13 Pro landscape",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Mobile/15E148 Safari/604.1",
        viewport: {
          width: 844,
          height: 390,
          deviceScaleFactor: 3,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !0
        }
      }, {
        name: "iPhone 13 Pro Max",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Mobile/15E148 Safari/604.1",
        viewport: {
          width: 428,
          height: 926,
          deviceScaleFactor: 3,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !1
        }
      }, {
        name: "iPhone 13 Pro Max landscape",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Mobile/15E148 Safari/604.1",
        viewport: {
          width: 926,
          height: 428,
          deviceScaleFactor: 3,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !0
        }
      }, {
        name: "iPhone 13 Mini",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Mobile/15E148 Safari/604.1",
        viewport: {
          width: 375,
          height: 812,
          deviceScaleFactor: 3,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !1
        }
      }, {
        name: "iPhone 13 Mini landscape",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Mobile/15E148 Safari/604.1",
        viewport: {
          width: 812,
          height: 375,
          deviceScaleFactor: 3,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !0
        }
      }, {
        name: "iPhone 14",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
        viewport: {
          width: 390,
          height: 663,
          deviceScaleFactor: 3,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !1
        }
      }, {
        name: "iPhone 14 landscape",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
        viewport: {
          width: 750,
          height: 340,
          deviceScaleFactor: 3,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !0
        }
      }, {
        name: "iPhone 14 Plus",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
        viewport: {
          width: 428,
          height: 745,
          deviceScaleFactor: 3,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !1
        }
      }, {
        name: "iPhone 14 Plus landscape",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
        viewport: {
          width: 832,
          height: 378,
          deviceScaleFactor: 3,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !0
        }
      }, {
        name: "iPhone 14 Pro",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
        viewport: {
          width: 393,
          height: 659,
          deviceScaleFactor: 3,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !1
        }
      }, {
        name: "iPhone 14 Pro landscape",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
        viewport: {
          width: 734,
          height: 343,
          deviceScaleFactor: 3,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !0
        }
      }, {
        name: "iPhone 14 Pro Max",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
        viewport: {
          width: 430,
          height: 739,
          deviceScaleFactor: 3,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !1
        }
      }, {
        name: "iPhone 14 Pro Max landscape",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
        viewport: {
          width: 814,
          height: 380,
          deviceScaleFactor: 3,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !0
        }
      }, {
        name: "iPhone 15",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
        viewport: {
          width: 393,
          height: 659,
          deviceScaleFactor: 3,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !1
        }
      }, {
        name: "iPhone 15 landscape",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
        viewport: {
          width: 734,
          height: 343,
          deviceScaleFactor: 3,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !0
        }
      }, {
        name: "iPhone 15 Plus",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
        viewport: {
          width: 430,
          height: 739,
          deviceScaleFactor: 3,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !1
        }
      }, {
        name: "iPhone 15 Plus landscape",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
        viewport: {
          width: 814,
          height: 380,
          deviceScaleFactor: 3,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !0
        }
      }, {
        name: "iPhone 15 Pro",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
        viewport: {
          width: 393,
          height: 659,
          deviceScaleFactor: 3,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !1
        }
      }, {
        name: "iPhone 15 Pro landscape",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
        viewport: {
          width: 734,
          height: 343,
          deviceScaleFactor: 3,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !0
        }
      }, {
        name: "iPhone 15 Pro Max",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
        viewport: {
          width: 430,
          height: 739,
          deviceScaleFactor: 3,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !1
        }
      }, {
        name: "iPhone 15 Pro Max landscape",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
        viewport: {
          width: 814,
          height: 380,
          deviceScaleFactor: 3,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !0
        }
      }, {
        name: "JioPhone 2",
        userAgent: "Mozilla/5.0 (Mobile; LYF/F300B/LYF-F300B-001-01-15-130718-i;Android; rv:48.0) Gecko/48.0 Firefox/48.0 KAIOS/2.5",
        viewport: {
          width: 240,
          height: 320,
          deviceScaleFactor: 1,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !1
        }
      }, {
        name: "JioPhone 2 landscape",
        userAgent: "Mozilla/5.0 (Mobile; LYF/F300B/LYF-F300B-001-01-15-130718-i;Android; rv:48.0) Gecko/48.0 Firefox/48.0 KAIOS/2.5",
        viewport: {
          width: 320,
          height: 240,
          deviceScaleFactor: 1,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !0
        }
      }, {
        name: "Kindle Fire HDX",
        userAgent: "Mozilla/5.0 (Linux; U; en-us; KFAPWI Build/JDQ39) AppleWebKit/535.19 (KHTML, like Gecko) Silk/3.13 Safari/535.19 Silk-Accelerated=true",
        viewport: {
          width: 800,
          height: 1280,
          deviceScaleFactor: 2,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !1
        }
      }, {
        name: "Kindle Fire HDX landscape",
        userAgent: "Mozilla/5.0 (Linux; U; en-us; KFAPWI Build/JDQ39) AppleWebKit/535.19 (KHTML, like Gecko) Silk/3.13 Safari/535.19 Silk-Accelerated=true",
        viewport: {
          width: 1280,
          height: 800,
          deviceScaleFactor: 2,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !0
        }
      }, {
        name: "LG Optimus L70",
        userAgent: "Mozilla/5.0 (Linux; U; Android 4.4.2; en-us; LGMS323 Build/KOT49I.MS32310c) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/75.0.3765.0 Mobile Safari/537.36",
        viewport: {
          width: 384,
          height: 640,
          deviceScaleFactor: 1.25,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !1
        }
      }, {
        name: "LG Optimus L70 landscape",
        userAgent: "Mozilla/5.0 (Linux; U; Android 4.4.2; en-us; LGMS323 Build/KOT49I.MS32310c) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/75.0.3765.0 Mobile Safari/537.36",
        viewport: {
          width: 640,
          height: 384,
          deviceScaleFactor: 1.25,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !0
        }
      }, {
        name: "Microsoft Lumia 550",
        userAgent: "Mozilla/5.0 (Windows Phone 10.0; Android 4.2.1; Microsoft; Lumia 550) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2486.0 Mobile Safari/537.36 Edge/14.14263",
        viewport: {
          width: 640,
          height: 360,
          deviceScaleFactor: 2,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !1
        }
      }, {
        name: "Microsoft Lumia 950",
        userAgent: "Mozilla/5.0 (Windows Phone 10.0; Android 4.2.1; Microsoft; Lumia 950) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2486.0 Mobile Safari/537.36 Edge/14.14263",
        viewport: {
          width: 360,
          height: 640,
          deviceScaleFactor: 4,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !1
        }
      }, {
        name: "Microsoft Lumia 950 landscape",
        userAgent: "Mozilla/5.0 (Windows Phone 10.0; Android 4.2.1; Microsoft; Lumia 950) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2486.0 Mobile Safari/537.36 Edge/14.14263",
        viewport: {
          width: 640,
          height: 360,
          deviceScaleFactor: 4,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !0
        }
      }, {
        name: "Nexus 10",
        userAgent: "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 10 Build/MOB31T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3765.0 Safari/537.36",
        viewport: {
          width: 800,
          height: 1280,
          deviceScaleFactor: 2,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !1
        }
      }, {
        name: "Nexus 10 landscape",
        userAgent: "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 10 Build/MOB31T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3765.0 Safari/537.36",
        viewport: {
          width: 1280,
          height: 800,
          deviceScaleFactor: 2,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !0
        }
      }, {
        name: "Nexus 4",
        userAgent: "Mozilla/5.0 (Linux; Android 4.4.2; Nexus 4 Build/KOT49H) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3765.0 Mobile Safari/537.36",
        viewport: {
          width: 384,
          height: 640,
          deviceScaleFactor: 2,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !1
        }
      }, {
        name: "Nexus 4 landscape",
        userAgent: "Mozilla/5.0 (Linux; Android 4.4.2; Nexus 4 Build/KOT49H) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3765.0 Mobile Safari/537.36",
        viewport: {
          width: 640,
          height: 384,
          deviceScaleFactor: 2,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !0
        }
      }, {
        name: "Nexus 5",
        userAgent: "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3765.0 Mobile Safari/537.36",
        viewport: {
          width: 360,
          height: 640,
          deviceScaleFactor: 3,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !1
        }
      }, {
        name: "Nexus 5 landscape",
        userAgent: "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3765.0 Mobile Safari/537.36",
        viewport: {
          width: 640,
          height: 360,
          deviceScaleFactor: 3,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !0
        }
      }, {
        name: "Nexus 5X",
        userAgent: "Mozilla/5.0 (Linux; Android 8.0.0; Nexus 5X Build/OPR4.170623.006) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3765.0 Mobile Safari/537.36",
        viewport: {
          width: 412,
          height: 732,
          deviceScaleFactor: 2.625,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !1
        }
      }, {
        name: "Nexus 5X landscape",
        userAgent: "Mozilla/5.0 (Linux; Android 8.0.0; Nexus 5X Build/OPR4.170623.006) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3765.0 Mobile Safari/537.36",
        viewport: {
          width: 732,
          height: 412,
          deviceScaleFactor: 2.625,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !0
        }
      }, {
        name: "Nexus 6",
        userAgent: "Mozilla/5.0 (Linux; Android 7.1.1; Nexus 6 Build/N6F26U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3765.0 Mobile Safari/537.36",
        viewport: {
          width: 412,
          height: 732,
          deviceScaleFactor: 3.5,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !1
        }
      }, {
        name: "Nexus 6 landscape",
        userAgent: "Mozilla/5.0 (Linux; Android 7.1.1; Nexus 6 Build/N6F26U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3765.0 Mobile Safari/537.36",
        viewport: {
          width: 732,
          height: 412,
          deviceScaleFactor: 3.5,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !0
        }
      }, {
        name: "Nexus 6P",
        userAgent: "Mozilla/5.0 (Linux; Android 8.0.0; Nexus 6P Build/OPP3.170518.006) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3765.0 Mobile Safari/537.36",
        viewport: {
          width: 412,
          height: 732,
          deviceScaleFactor: 3.5,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !1
        }
      }, {
        name: "Nexus 6P landscape",
        userAgent: "Mozilla/5.0 (Linux; Android 8.0.0; Nexus 6P Build/OPP3.170518.006) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3765.0 Mobile Safari/537.36",
        viewport: {
          width: 732,
          height: 412,
          deviceScaleFactor: 3.5,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !0
        }
      }, {
        name: "Nexus 7",
        userAgent: "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 7 Build/MOB30X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3765.0 Safari/537.36",
        viewport: {
          width: 600,
          height: 960,
          deviceScaleFactor: 2,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !1
        }
      }, {
        name: "Nexus 7 landscape",
        userAgent: "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 7 Build/MOB30X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3765.0 Safari/537.36",
        viewport: {
          width: 960,
          height: 600,
          deviceScaleFactor: 2,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !0
        }
      }, {
        name: "Nokia Lumia 520",
        userAgent: "Mozilla/5.0 (compatible; MSIE 10.0; Windows Phone 8.0; Trident/6.0; IEMobile/10.0; ARM; Touch; NOKIA; Lumia 520)",
        viewport: {
          width: 320,
          height: 533,
          deviceScaleFactor: 1.5,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !1
        }
      }, {
        name: "Nokia Lumia 520 landscape",
        userAgent: "Mozilla/5.0 (compatible; MSIE 10.0; Windows Phone 8.0; Trident/6.0; IEMobile/10.0; ARM; Touch; NOKIA; Lumia 520)",
        viewport: {
          width: 533,
          height: 320,
          deviceScaleFactor: 1.5,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !0
        }
      }, {
        name: "Nokia N9",
        userAgent: "Mozilla/5.0 (MeeGo; NokiaN9) AppleWebKit/534.13 (KHTML, like Gecko) NokiaBrowser/8.5.0 Mobile Safari/534.13",
        viewport: {
          width: 480,
          height: 854,
          deviceScaleFactor: 1,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !1
        }
      }, {
        name: "Nokia N9 landscape",
        userAgent: "Mozilla/5.0 (MeeGo; NokiaN9) AppleWebKit/534.13 (KHTML, like Gecko) NokiaBrowser/8.5.0 Mobile Safari/534.13",
        viewport: {
          width: 854,
          height: 480,
          deviceScaleFactor: 1,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !0
        }
      }, {
        name: "Pixel 2",
        userAgent: "Mozilla/5.0 (Linux; Android 8.0; Pixel 2 Build/OPD3.170816.012) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3765.0 Mobile Safari/537.36",
        viewport: {
          width: 411,
          height: 731,
          deviceScaleFactor: 2.625,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !1
        }
      }, {
        name: "Pixel 2 landscape",
        userAgent: "Mozilla/5.0 (Linux; Android 8.0; Pixel 2 Build/OPD3.170816.012) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3765.0 Mobile Safari/537.36",
        viewport: {
          width: 731,
          height: 411,
          deviceScaleFactor: 2.625,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !0
        }
      }, {
        name: "Pixel 2 XL",
        userAgent: "Mozilla/5.0 (Linux; Android 8.0.0; Pixel 2 XL Build/OPD1.170816.004) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3765.0 Mobile Safari/537.36",
        viewport: {
          width: 411,
          height: 823,
          deviceScaleFactor: 3.5,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !1
        }
      }, {
        name: "Pixel 2 XL landscape",
        userAgent: "Mozilla/5.0 (Linux; Android 8.0.0; Pixel 2 XL Build/OPD1.170816.004) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3765.0 Mobile Safari/537.36",
        viewport: {
          width: 823,
          height: 411,
          deviceScaleFactor: 3.5,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !0
        }
      }, {
        name: "Pixel 3",
        userAgent: "Mozilla/5.0 (Linux; Android 9; Pixel 3 Build/PQ1A.181105.017.A1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.158 Mobile Safari/537.36",
        viewport: {
          width: 393,
          height: 786,
          deviceScaleFactor: 2.75,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !1
        }
      }, {
        name: "Pixel 3 landscape",
        userAgent: "Mozilla/5.0 (Linux; Android 9; Pixel 3 Build/PQ1A.181105.017.A1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.158 Mobile Safari/537.36",
        viewport: {
          width: 786,
          height: 393,
          deviceScaleFactor: 2.75,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !0
        }
      }, {
        name: "Pixel 4",
        userAgent: "Mozilla/5.0 (Linux; Android 10; Pixel 4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.138 Mobile Safari/537.36",
        viewport: {
          width: 353,
          height: 745,
          deviceScaleFactor: 3,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !1
        }
      }, {
        name: "Pixel 4 landscape",
        userAgent: "Mozilla/5.0 (Linux; Android 10; Pixel 4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.138 Mobile Safari/537.36",
        viewport: {
          width: 745,
          height: 353,
          deviceScaleFactor: 3,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !0
        }
      }, {
        name: "Pixel 4a (5G)",
        userAgent: "Mozilla/5.0 (Linux; Android 11; Pixel 4a (5G)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4812.0 Mobile Safari/537.36",
        viewport: {
          width: 353,
          height: 745,
          deviceScaleFactor: 3,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !1
        }
      }, {
        name: "Pixel 4a (5G) landscape",
        userAgent: "Mozilla/5.0 (Linux; Android 11; Pixel 4a (5G)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4812.0 Mobile Safari/537.36",
        viewport: {
          width: 745,
          height: 353,
          deviceScaleFactor: 3,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !0
        }
      }, {
        name: "Pixel 5",
        userAgent: "Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4812.0 Mobile Safari/537.36",
        viewport: {
          width: 393,
          height: 851,
          deviceScaleFactor: 3,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !1
        }
      }, {
        name: "Pixel 5 landscape",
        userAgent: "Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4812.0 Mobile Safari/537.36",
        viewport: {
          width: 851,
          height: 393,
          deviceScaleFactor: 3,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !0
        }
      }, {
        name: "Moto G4",
        userAgent: "Mozilla/5.0 (Linux; Android 7.0; Moto G (4)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4812.0 Mobile Safari/537.36",
        viewport: {
          width: 360,
          height: 640,
          deviceScaleFactor: 3,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !1
        }
      }, {
        name: "Moto G4 landscape",
        userAgent: "Mozilla/5.0 (Linux; Android 7.0; Moto G (4)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4812.0 Mobile Safari/537.36",
        viewport: {
          width: 640,
          height: 360,
          deviceScaleFactor: 3,
          isMobile: !0,
          hasTouch: !0,
          isLandscape: !0
        }
      }],
      Bs = {};
    for (const e of Ns) Bs[e.name] = e;
    Object.freeze(Bs);
    async function Ks(e, t, r) {
      const {
        acceptInsecureCerts: i = !1,
        defaultViewport: n = Lt
      } = r, {
        bidiConnection: s,
        cdpConnection: a,
        closeCallback: o
      } = await async function (e, t, r) {
        const i = await import("./bidi.js"),
          {
            slowMo: n = 0,
            protocolTimeout: s
          } = r,
          a = new i.BidiConnection(t, e, n, s);
        try {
          const e = await a.send("session.status", {});
          if ("type" in e && "success" === e.type) return {
            bidiConnection: a,
            closeCallback: async () => {
              await a.send("browser.close", {}).catch(Rt)
            }
          }
        } catch (e) {
          if (!(e instanceof Pt)) throw e
        }
        a.unbind();
        const o = new hn(t, e, n, s, !0),
          c = await o.send("Browser.getVersion");
        if (c.product.toLowerCase().includes("firefox")) throw new At("Firefox is not supported in BiDi over CDP mode.");
        const l = await i.connectBidiOverCdp(o);
        return {
          cdpConnection: o,
          bidiConnection: l,
          closeCallback: async () => {
            await o.send("Browser.close").catch(Rt)
          }
        }
      }(e, t, r), c = await import("./bidi.js");
      return await c.BidiBrowser.create({
        connection: s,
        cdpConnection: a,
        closeCallback: o,
        process: void 0,
        defaultViewport: n,
        acceptInsecureCerts: i,
        capabilities: r.capabilities
      })
    }
    const Hs = async () => yt ? (await a.e(874).then(a.bind(a, 874))).NodeWebSocketTransport : (await a.e(1).then(a.bind(a, 1))).BrowserWebSocketTransport;
    async function qs(e) {
      const {
        connectionTransport: t,
        endpointUrl: r
      } = await async function (e) {
        const {
          browserWSEndpoint: t,
          browserURL: r,
          transport: i,
          headers: n = {}
        } = e;
        if (bt(Number(!!t) + Number(!!r) + Number(!!i) === 1, "Exactly one of browserWSEndpoint, browserURL or transport must be passed to puppeteer.connect"), i) return {
          connectionTransport: i,
          endpointUrl: ""
        };
        if (t) {
          const e = await Hs();
          return {
            connectionTransport: await e.create(t, n),
            endpointUrl: t
          }
        }
        if (r) {
          const e = await async function (e) {
            const t = new URL("/json/version", e);
            try {
              const e = await globalThis.fetch(t.toString(), {
                method: "GET"
              });
              if (!e.ok) throw new Error(`HTTP ${e.statusText}`);
              return (await e.json()).webSocketDebuggerUrl
            } catch (e) {
              throw ar(e) && (e.message = `Failed to fetch browser webSocket URL from ${t}: ` + e.message), e
            }
          }(r), t = await Hs();
          return {
            connectionTransport: await t.create(e),
            endpointUrl: e
          }
        }
        throw new Error("Invalid connection options")
      }(e);
      if ("webDriverBiDi" === e.protocol) {
        return await Ks(t, r, e)
      } {
        const i = await async function (e, t, r) {
          const {
            acceptInsecureCerts: i = !1,
            defaultViewport: n = Lt,
            downloadBehavior: s,
            targetFilter: a,
            _isPageTarget: o,
            slowMo: c = 0,
            protocolTimeout: l
          } = r, d = new hn(t, e, c, l), {
            browserContextIds: u
          } = await d.send("Target.getBrowserContexts");
          return await Os._create(d, u, i, n, s, void 0, (() => d.send("Browser.close").catch(Rt)), a, o)
        }(t, r, e);
        return i
      }
    }
    Object.freeze({
      chrome: "135.0.7049.42",
      "chrome-headless-shell": "135.0.7049.42",
      firefox: "stable_137.0"
    });
    const js = new class {
        static customQueryHandlers = Cr;
        static registerCustomQueryHandler(e, t) {
          return this.customQueryHandlers.register(e, t)
        }
        static unregisterCustomQueryHandler(e) {
          return this.customQueryHandlers.unregister(e)
        }
        static customQueryHandlerNames() {
          return this.customQueryHandlers.names()
        }
        static clearCustomQueryHandlers() {
          return this.customQueryHandlers.clear()
        }
        _isPuppeteerCore;
        _changedBrowsers = !1;
        constructor(e) {
          this._isPuppeteerCore = e.isPuppeteerCore, this.connect = this.connect.bind(this)
        }
        connect(e) {
          return qs(e)
        }
      }({
        isPuppeteerCore: !0
      }),
      {
        connect: Us
      } = js;
    async function $s(e) {
      try {
        const t = await chrome.scripting.executeScript({
          target: {
            tabId: e
          },
          injectImmediately: !0,
          func: () => "function" == typeof window.domUtilsHealthCheck ? window.domUtilsHealthCheck() : {
            healthy: !1,
            details: {
              bundleReady: !0 === window.__domBundleReady
            }
          }
        });
        if (!0 === t?.[0]?.result?.healthy) return !0;
        return !!await Ws(e)
      } catch (t) {
        return await Ws(e)
      }
    }
    async function Ws(e) {
      try {
        const t = await chrome.scripting.executeScript({
          target: {
            tabId: e
          },
          injectImmediately: !0,
          func: () => {
            if ("function" == typeof window.domUtilsHealthCheck) {
              return !0 === window.domUtilsHealthCheck().healthy
            } {
              const e = !0 === window.__domBundleReady,
                t = window.DOMTreeParser && "function" == typeof window.DOMTreeParser.getDomTree,
                r = window.DOMTreeHighlighter && "function" == typeof window.DOMTreeHighlighter.highlightElements;
              return e && t && r
            }
          }
        });
        if (t && t.length > 0 && !0 === t[0]?.result) return !0;
        await chrome.scripting.executeScript({
          target: {
            tabId: e
          },
          injectImmediately: !0,
          files: ["/domBundle/domBundle.js"]
        });
        const r = await chrome.scripting.executeScript({
          target: {
            tabId: e
          },
          injectImmediately: !0,
          func: () => {
            if ("function" == typeof window.domUtilsHealthCheck) {
              return !0 === window.domUtilsHealthCheck().healthy
            }
            return !0 === window.__domBundleReady
          }
        });
        return !(!r || 0 === r.length || !r[0]?.result)
      } catch (e) {
        return !1
      }
    }
    class Gs {
      constructor() {
        this.templates = new Map, this.initializeDefaultTemplates()
      }
      initializeDefaultTemplates() {
        this.setTemplate("extract_content", "\nYour task is to process the provided page content based on the extraction goal, preserving the original structure as much as possible. The executor agent will determine the most appropriate format (JSON, CSV, or TXT) based on your output and the extraction goal.\n\nYou should focus on extracting the most relevant information based on the extraction goal. Structure your output in a way that best represents the content, regardless of the final format that will be used.\n\nFor all extractions:\n- Preserve the hierarchical structure of the content where relevant\n- Maintain relationships between data elements\n- Include all information specified in the extraction goal\n- Organize the content logically\n\nInclude the following metadata about the extracted content:\n- title: A concise, descriptive title for this content\n- description: A brief summary of what this content contains (1-2 sentences)\n- source_type: The type of content (article, product page, review, etc.)\n- key_points: The most important points from the content\n\nRespond with ONLY the extracted content in JSON format. The executor will convert this to the most appropriate final format if needed. Do not include any explanatory text before or after.\n\nExtraction Goal: {goal}\n\nPage Content (Text extracted by Readability):\n{page_text}\n"),
        this.setTemplate("generate_report", "\nYour task is to generate a comprehensive report in {format} format based on the provided extracted content files.\n\nGoal: {goal}\n\nAnalyze all the provided content files and create a well-structured report that addresses the goal. The report should:\n\n1. Have a clear introduction explaining the purpose and scope\n2. Organize information logically with appropriate sections and headings\n3. Synthesize information across multiple sources when relevant\n4. Highlight key findings, patterns, or insights\n5. Include a conclusion or summary\n\nIf generating a CSV report:\n- Identify the most appropriate columns based on the data\n- Ensure consistent formatting across all rows\n- Include headers\n- Use standard CSV formatting (comma-separated values, quoted strings when needed)\n\nIf generating a text report:\n- Use clear headings and subheadings\n- Include bullet points for lists when appropriate\n- Maintain a professional tone and style\n- Format for readability with appropriate spacing\n\nExtracted Files:\n{files_content}\n\nRespond ONLY with the report content in the requested format. Do not include any explanatory text before or after.\n"),
        this.setTemplate("planner", '\n  # Role: Strategic Planner Agent\n  You are a high-level planner AI for a browser automation agent. Your goal is to achieve the user\'s overall objective by breaking it down into a complete, detailed step-by-step plan with logical, sequential sub-tasks. You will create this comprehensive plan upfront and assign these sub-tasks to an Executor agent.\n\n  # Special Task Handling:\n  ## Image Extraction Tasks:\n  **CRITICAL**: If the user wants to extract/download images from a webpage:\n  1. Navigate to the target page\n  2. Wait 2-3 seconds for images to load\n  3. Use execute_javascript command to extract images (NOT DOM interactions like scroll/click)\n  4. The executor has access to window.extractImagesAsZip() function\n\n  **CORRECT Plan for Image Extraction:**\n  - Step 1: Navigate to URL\n  - Step 2: Wait for page load (2 seconds)\n  - Step 3: Execute JavaScript: await window.extractImagesAsZip(\'filename\')\n\n  **INCORRECT (DO NOT DO THIS):**\n  - ❌ Scrolling to find images\n  - ❌ Clicking on image elements\n  - ❌ Using extract_content for images\n  - ❌ Any DOM interactions for image extraction\n\n  The execute_javascript command automatically:\n  - Finds all images on the page\n  - Downloads actual image files\n  - Creates organized ZIP with JSON metadata\n  - Returns success/failure status\n\n  # Context Provided:\n  1.  **User Goal:** The original task request.\n  2.  **Planner Brain (Memory):** JSON object showing planned sub-tasks, their statuses, history, shared data keys, and a \'clarification_requested\' flag (boolean). Also includes current date and time information in the user\'s timezone under \'_system.dateTime\'.\n  3.  **Last Sub-task Result:** (If applicable) The outcome reported by the Executor for the most recently completed sub-task. On the final call, this will contain the entire Executor brain with all results and extracted data.\n\n\n  # Your Task:\n  1.  **Analyze:** Review the User Goal, Brain state (including \'clarification_requested\' flag), and Last Sub-task Result. Pay attention to the current date and time information in \'_system.dateTime\' when planning tasks that involve scheduling, reservations, or time-sensitive operations.\n  2.  **Request Clarification (Optional, Once at Start):** If the User Goal is ambiguous or missing critical information for planning (e.g., missing credentials, unclear target) AND the \'clarification_requested\' flag in the Brain is \'false\', you may ask the user ONE specific question to get the necessary details. Use the \'request_clarification\' output format. Do NOT ask if the flag is \'true\'.\n  3.  **Create Complete Plan:** If this is your first planning session and you\'re not requesting clarification, create a COMPLETE step-by-step plan for the entire task. Break down the overall goal into detailed, sequential sub-tasks that the Executor can follow. Your plan should be comprehensive and account for potential challenges.\n  4.  **Decide Next Step:** Determine the overall next step:\n      * If requesting clarification (and allowed), output that decision.\n      * If this is your first planning session, create a complete plan and identify the first sub-task to execute.\n      * If the previous sub-task failed, DO NOT GIVE UP. Instead, revise your plan and create a new sub-task with more specific and detailed instructions for the Executor. Break down the failed task into smaller steps, provide more context, or try an alternative approach. Only declare the overall task failed if you\'ve exhausted multiple different approaches and strategies.\n      * If all necessary sub-tasks are completed successfully, provide a detailed summary of everything that was accomplished, including any data that was extracted or reports that were generated.\n  5. The executor has the ability to extract content froma page with a specific goal for extraction IE emails or summarize whole page. Make sure you never tell it to extract search result pages because it will get confused and this is not useful.\n  6. When you tell the executor to extract content make sure you give it a final step to generate report as this can aggregate multipe articles into one overview which is benefitial for the end user.\n  \n  # Output Format:\n  You MUST output **only** a JSON object. Choose ONE of the following structures:\n\n  1.  **Assign Next Sub-task:**\n      ```json\n      {\n        "decision": "next_subtask",\n        "subtask_id": 1, // The ID of the sub-task in the brain to execute next\n        "subtask_description": "string", // Clear description of the sub-task for the Executor\n        "context_to_pass": {\n          "complete_plan": [  // Include your complete step-by-step plan here\n            { "step": 1, "description": "Detailed step 1 description" },\n            { "step": 2, "description": "Detailed step 2 description" },\n            // Additional steps...\n          ]\n        }\n      }\n      ```\n\n  2.  **Request Clarification (Use ONLY ONCE at start if needed and \'clarification_requested\' is false):**\n      ```json\n      {\n        "decision": "request_clarification",\n        "question": "string" // Specific question to ask the user.\n      }\n      ```\n\n  3.  **Report Task Completion:**\n      ```json\n      {\n        "decision": "task_complete",\n        "summary": "string" // Concise summary for the user.\n      }\n      ```\n  4.  **Report Task Failure:**\n       ```json\n      {\n         "decision": "task_failed",\n         "summary": "string" // Concise summary explaining why the task failed.\n       }\n       ```\n\n  # Examples for Guidance:\n\n  ## Example 1 - Cross-Site Workflow with Complete Plan\n  **User Goal:** "Find job postings on LinkedIn and add them to a personal Notion page."\n\n  **Good Complete Plan:**\n  1. Navigate to LinkedIn.com\n  2. Click on the Jobs section in the navigation bar\n  3. Search for relevant job postings using the keyword \'Software Engineer\'\n  4. Scroll through and collect titles and links for 5 job postings\n  5. Navigate to Notion.so\n  6. Log in if necessary\n  7. Navigate to the personal page where jobs should be added\n  8. For each collected job posting:\n     a. Create a new entry\n     b. Add the job title\n     c. Add the job link\n  9. Verify all jobs have been added successfully\n\n  ---\n\n  ## Example 2 - Cross-Site Workflow with Complete Plan\n  **User Goal:** "Find three recent articles about AI on Google News and email the links to myself."\n\n  **Good Complete Plan:**\n  1. Navigate to news.google.com\n  2. Search for \'AI\' in the search box\n  3. Navigate to articles and use the extract command to collect an article summary\n  4. Navigate to 3 other articles and generate 3 more summaries\n  5. Use the generate report command to create a report with all 4 articles\n  6. Navigate to Gmail.com\n  7. Log in if necessary\n  8. Click \'Compose\' to create a new email\n  9. Enter the user\'s email address in the \'To\' field\n  10. Add a subject line like "Recent AI Articles"\n  11. Compose the email body with the three article links\n  12. Send the email\n  13. Verify the email was sent successfully\n\n  ---\n\n  # Example JSON Outputs for Reference:\n\n  ## Assigning First Sub-task with Complete Plan\n\n  ```json\n  {\n    "decision": "next_subtask",\n    "subtask_id": 1,\n    "subtask_description": "Navigate to LinkedIn Jobs, search for \'Software Engineer\', and collect job titles and links for 5 job postings.",\n    "context_to_pass": {\n      "complete_plan": [\n        { "step": 1, "description": "Navigate to LinkedIn.com" },\n        { "step": 2, "description": "Click on the Jobs section in the navigation bar" },\n        { "step": 3, "description": "Search for \'Software Engineer\' in the search box" },\n        { "step": 4, "description": "Collect titles and links for 5 job postings" },\n        { "step": 5, "description": "Navigate to Notion.so" },\n        { "step": 6, "description": "Log in if necessary" },\n        { "step": 7, "description": "Navigate to the personal page" },\n        { "step": 8, "description": "Add each job posting as a new entry with title and link" },\n        { "step": 9, "description": "Verify all jobs have been added successfully" }\n      ]\n    }\n  }\n  ```\n\n  ## Follow-up Sub-task After Completion\n\n  ```json\n  {\n    "decision": "next_subtask",\n    "subtask_id": 2,\n    "subtask_description": "Navigate to Notion and create a new entry for each collected job posting with the title and link. Follow these steps: 1) Go to notion.so, 2) Log in if necessary, 3) Navigate to your personal page, 4) For each job in the collected list, create a new entry with the job title and link.",\n    "context_to_pass": {\n      "jobs_list_key": "collected_jobs",\n      "complete_plan": [\n        { "step": 1, "description": "Navigate to LinkedIn.com" },\n        { "step": 2, "description": "Click on the Jobs section in the navigation bar" },\n        { "step": 3, "description": "Search for \'Software Engineer\' in the search box" },\n        { "step": 4, "description": "Collect titles and links for 5 job postings" },\n        { "step": 5, "description": "Navigate to Notion.so" },\n        { "step": 6, "description": "Log in if necessary" },\n        { "step": 7, "description": "Navigate to the personal page" },\n        { "step": 8, "description": "Add each job posting as a new entry with title and link" },\n        { "step": 9, "description": "Verify all jobs have been added successfully" }\n      ]\n    }\n  }\n  ```\n\n  ## Detailed Task Complete Example\n\n  ```json\n  {\n    "decision": "task_complete",\n    "summary": "Successfully completed the task of finding job postings on LinkedIn and adding them to a Notion page. I navigated to LinkedIn Jobs, searched for \'Software Engineer\' positions, and collected information for 5 job postings including their titles, companies, and URLs. Then I navigated to Notion, logged in successfully, and created a new entry for each job posting with all the relevant details. All 5 job postings were successfully added to the Notion page with their complete information. The task has been fully completed according to the user\'s request."\n  }\n  ```\n\n  ## Example of Handling a Failed Subtask\n\n  **Failed Subtask Result:**\n  ```json\n  {\n    "status": "failure",\n    "subtask_id": 1,\n    "subtask_description": "Navigate to LinkedIn Jobs and collect job postings",\n    "error": "Could not find the job search box on LinkedIn"\n  }\n  ```\n\n  **Good Response - Creating a More Specific Subtask:**\n  ```json\n  {\n    "decision": "next_subtask",\n    "subtask_id": 3,\n    "subtask_description": "Navigate to LinkedIn Jobs with detailed steps: 1) Go to linkedin.com, 2) Click on the \'Jobs\' icon in the top navigation bar, 3) Wait for the jobs page to load, 4) Look for the search box labeled \'Search jobs\', 5) Enter \'Software Engineer\' in the search box, 6) Press Enter, 7) Collect the first 5 job titles and links.",\n    "context_to_pass": {\n      "complete_plan": [\n        { "step": 1, "description": "Navigate to LinkedIn.com" },\n        { "step": 2, "description": "Click on the Jobs section in the navigation bar" },\n        { "step": 3, "description": "Search for \'Software Engineer\' in the search box" },\n        { "step": 4, "description": "Collect titles and links for 5 job postings" },\n        { "step": 5, "description": "Navigate to Notion.so" },\n        { "step": 6, "description": "Log in if necessary" },\n        { "step": 7, "description": "Navigate to the personal page" },\n        { "step": 8, "description": "Add each job posting as a new entry with title and link" },\n        { "step": 9, "description": "Verify all jobs have been added successfully" }\n      ]\n    }\n  }\n  ```\n\n  # Current Task Context:\n  User Goal: {{USER_REQUEST}}\n  Planner Brain (Memory): {{BRAIN_CONTEXT}}\n  Last Sub-task Result: {{LAST_SUBTASK_RESULT}}\n\n  # Your Instruction:\n  Based on the context, decide the overall next step. Check if clarification is needed and allowed FIRST. Otherwise, create a complete plan for the entire task and identify the first sub-task, or determine task completion/failure.\n\n  **IMPORTANT**: When a subtask fails, be persistent and resilient. Create a new subtask with more specific, detailed instructions. Break down complex tasks into smaller steps, provide clearer guidance, or try alternative approaches. Only declare task failure as an absolute last resort after multiple different strategies have failed.\n  **IMPORTANT**: Always consider the current state of the page. If the page is already in a state that allows you to complete the sub-task, you can proceed directly to that action without creating a new sub-task.\n  For example if the user asks you to like 3 posts and you are already on a platform where you can do that, you can direct the executor to like the posts without asking for clarification.\n  ASSUME YOU ARE LOGGED IN if the executor gets to the platform and it is not logged in it will come back and then you can ask for clarification.\n\n  NEVER refuse to attempt a task or give up. Always try to find a way to accomplish the user\'s goal, even if it requires multiple attempts or different strategies. Only ask for clarification if absolutely necessary to complete the task. You are only ever done if the user\'s initial request has been met and you have verified the executor\'s actions against that request.\n\n  If this is the final call (after all subtasks are complete), provide a detailed summary of everything that was accomplished, including all data that was extracted and reports that were generated.\n\n  Output ONLY the JSON object representing your decision according to the specified Output Format.\n  '), 
        this.setTemplate("executor", '\nYou are a Tactical Executor Agent, an AI designed to perform specific sub-tasks within a web browser by determining and executing low-level actions such as clicks, typing, and navigation. Your role is crucial in a system where a higher-level planner assigns tasks, and you focus solely on executing your current sub-task efficiently and thoroughly.\n\nBefore we begin, here is the context for your current task:\n\n<subtask_context>\n{{SUBTASK_CONTEXT}}\n</subtask_context>\n\n<action_history>\n{{ACTION_HISTORY}}\n</action_history>\n\n<progress_tracking>\n{{PROGRESS_TRACKING}}\n</progress_tracking>\n\n<extracted_files_info>\n{{EXTRACTED_FILES_INFO}}\n</extracted_files_info>\n\n<current_page_state>\n{{CURRENT_PAGE_STATE}}\n</current_page_state>\n\nNote: The current_page_state includes:\n      - page_text_content: The visible text content of the page (use this to understand what\'s on the page, find prices, names, data, etc.)\n      - scroll_position information with the following properties:\n        - scrollY: Current vertical scroll position in pixels\n        - scrollHeight: Total scrollable height of the page\n        - clientHeight: Visible height of the viewport\n        - atTop: Boolean indicating if the page is scrolled to the top\n        - atBottom: Boolean indicating if the page is scrolled to the bottom\n        - percentScrolled: Percentage of the page that has been scrolled (0-100)\n\n**IMPORTANT**: Always read the page_text_content first to understand what information is available on the page. This contains the actual text content that you can analyze to find prices, product names, descriptions, and other data. If the user asks you to compare items, find prices, or extract information, analyze the page_text_content to get this data.\n\nYour primary objective is to complete the assigned sub-task by executing a series of low-level browser actions. Here are your key responsibilities:\n\n1. Analyze the current situation:\n   - Review your assigned sub-task, the context, the current page state, and the history of your recent actions.\n   - If this is your first action (empty action history), follow the command in the sub-task directly, unless the current state is already beneficial to completing the goal.\n\n2. Decide on the next action:\n   - Determine the single next logical low-level browser action required to make progress towards completing your assigned sub-task.\n   - Choose from the available commands listed below.\n\n3. Handle errors:\n   - If your last action failed, analyze the error and decide whether to retry, try an alternative action, or report that the sub-task cannot be completed.\n\n4. Determine completion:\n   - Once you believe the sub-task is completed, explicitly output a "subtask_complete" decision.\n   - This is the ONLY way to signal completion - the system won\'t assume completion even if all actions succeed.\n\n5. Maintain progress tracking:\n   - Since only the 5 most recent actions are stored in the action history, you MUST maintain detailed progress tracking by updating the notes and counters.\n   - Use short_term_notes for immediate action results and their rationale.\n   - Use long_term_memory for information that needs to be remembered throughout the task, such as specific details about content interacted with or important findings.\n   - For tasks with specific quantities (like "like 10 posts"), keep track of progress (e.g., "Posts liked: 3/10") in the progress counters.\n   - This progress tracking is your persistent memory for the task and will remain even as older actions are removed from the history.\n   - If the task is something that requires scrolling please be cognizant of your prior actions if you recently scrolled carefully examine the page and see if there are any elements you can interact with to get you closer to your goal.\n   - Be sure to keep track of important info you discover along the way, such as links, emails, or phone numbers. This information should be stored in the long_term_memory section of your progress tracking.\n   - If you need to collect a lot of information, consider using the extract_content command to capture all relevant data from the page, it can save you time and effort, you dont need to scroll all the way down to the bottom of the page to get all the data just call the function and specify what you want to extract.\n\nIMPORTANT: YOU MUST CHECK THE STATE OF THE PAGE AFTER SCROLLING. If you scroll and the page changes, analyze the new state to determine if you can take any actions to progress towards the user\'s goal. If you scroll and nothing changes, check the action history to see if you have already scrolled before.\nIDEALLY you always do something useful after each scroll review the task history and if you last action was scrolling look for something to interact with to help towards your goal.\n\nAvailable Commands:\n\n1. Basic Navigation and Interaction:\n   - navigate: {"url": "string"}\n   - go_back: {} - Navigate back in browser history (Use this if you get stuck on an action and the element you have tried doesn\'t seem to work.)\n   - go_forward: {} - Navigate forward in browser history\n   - click: {"element_number": integer}\n   - type: {"element_number": integer, "text": "string", "clear_first"?: boolean}\n   - keypress: {"key": "string"} (Common keys: "Enter", "Tab", "Escape", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Backspace", "Delete")\n   - scroll: {"direction": "up"|"down"|"top"|"bottom"}\n   - wait: {"seconds": float}\n   - google_search: {"query": "string"}\n\n2. Content Extraction and Processing:\n   - extract_content: {"goal": "string", "file_name": "string", "file_description": "string", "format": "json"|"csv"|"text"} - NEVER USE THIS ON SEARCH RESULTS PAGES UNLESS THE USER EXPLICITLY REQUESTS YOU TO. Use on content-rich pages after navigating to the actual article. You can specify the desired format (json, csv, or text) based on what would be most useful for the extracted content. If no format is specified, the system will automatically determine the best format. IMPORTANT: You can only extract content ONCE per page - if you\'ve already extracted content from the current page, you must navigate to a different page before using extract_content again.\n   - generate_report: {"goal": "string", "format": "text"|"csv", "report_name": "string", "report_description": "string"} - Always use at the end of a task to consolidate multiple extracted files into a single comprehensive report for the user. ALWAYS CALL THIS AFTER EXTRACTING MULTIPLE FILES TO CREATE A SINGLE COMPREHENSIVE DOCUMENT FOR THE USER.\n\n3. JavaScript Execution:\n   - execute_javascript: {"code": "string"} - Execute JavaScript code in the page context. CRITICAL FOR IMAGE EXTRACTION: Use this command to extract and download images from a webpage. The page has window.extractImagesAsZip(\'filename\') function available. Example: {"code": "await window.extractImagesAsZip(\'website_images\')"} - This will automatically find all images, download them as files, and create a ZIP with JSON metadata, TXT list, download summary, and all actual image files in an images/ folder. Returns success/failure status. DO NOT use scroll, click, or extract_content for image extraction tasks - ONLY use execute_javascript with extractImagesAsZip().\n\nImportant Notes:\n- Only mark a subtask complete when you\'ve confirmed it\'s fully accomplished, not just when all predefined actions are executed.\n- When executing a sequential flow, be sure each step is completely finished before moving to the next.\n- You may need to add final verification steps beyond the initial plan.\n- If you have tried logging in and still can\'t access the page, tell the planner to ask the user for credentials.\n- Be thorough in your research. Don\'t stop after just one search or page visit if the task requires comprehensive information gathering.\n- Use the extract_content feature liberally when researching. It allows you to capture all text data, links, emails, or phone numbers from a page with the right goal. You can specify the desired format (json, csv, or text) based on what would be most useful for the extracted content. Choose JSON for structured data with relationships, CSV for tabular data, and text for narrative content.\n- Always use the generate_report command to create a final, useful report for the user after extracting content from multiple sources. The report format should be chosen based on the extracted content: use CSV for tabular data and text for narrative content.\n- After scrolling, always analyze the new page state to determine if you can take any actions to progress towards the user\'s goal.\n- Before interacting with elements like buttons, checkboxes, or like/heart icons, check their current state using aria attributes and visual cues to avoid unnecessary interactions.\n\nFor content extraction, always provide a SPECIFIC goal (e.g., "Extract all email addresses and phone numbers" rather than "Extract contact info"). Extract the ENTIRE page content in one operation rather than multiple extractions. You can specify the desired format in the extract_content command based on what would be most useful for the data: use JSON for structured data with relationships, CSV for tabular data, and text for narrative content.\n\nBefore deciding on your next action, analyze the current situation and plan your approach. Wrap this analysis in <task_execution_planning> tags. Consider the following:\n- What is the current state of the sub-task?\n- What information do you need to collect or verify?\n- Are there any potential obstacles or challenges?\n- How can you ensure thorough exploration and data collection?\n- List out the sub-steps needed to complete the sub-task.\n- Provide a detailed breakdown of the current page state and how it relates to the sub-task.\n- Consider potential obstacles and alternative approaches.\n- Review your progress tracking and ensure you\'re not repeating actions unnecessarily.\n- Analyze the current page state in detail, including visible elements and their properties.\n- Review the action history to understand what has been done so far.\n\nStructure your task execution planning as follows:\n1. Current State Summary\n   - Briefly describe the current state of the sub-task and the web page.\n   - Highlight any immediate observations or concerns.\n\n2. Sub-task Progress\n   - Detail what has been accomplished so far.\n   - Identify what still needs to be done to complete the sub-task.\n\n3. Page State Analysis\n   - Analyze the current page state, including visible elements and their properties.\n   - Identify any relevant information or interactive elements on the page.\n\n4. Action History Review\n   - Summarize the recent actions taken and their outcomes.\n   - Identify any patterns or recurring issues in the action history.\n\n5. Potential Obstacles and Alternatives\n   - List any potential challenges or roadblocks you foresee.\n   - Propose alternative approaches or workarounds for these obstacles.\n\n6. Task Breakdown\n   - Break down the remaining work into specific, actionable steps.\n   - Prioritize these steps based on their importance and logical order.\n\n7. Next Steps Plan\n   - Clearly state the next immediate action to be taken.\n   - Explain how this action contributes to the overall sub-task goal.\n\nRemember to work diligently and persistently to complete your assigned sub-task. Don\'t give up easily, and make sure to explore all avenues to bring value to the user. If your job is to interact with content (e.g., liking posts), continue until you\'re certain you\'ve completed the task or exhausted all possibilities.\n\nAfter your task execution planning, output your decision in JSON format. Choose ONE of the following structures:\n\nBE SURE TO TRACK YOUR PROGRESS USING THE PROGRESS TRACKER WHEN A USER HAS GIVEN A SPECIFIC NUMBER OF ITEMS TO INTERACT WITH.\n\n1. Execute Next Action:\n```json\n{\n  "decision": "next_action",\n  "action": {\n    "command": "command_name",\n    "params": {"param1": "value1"}\n  },\n  "short_term_notes": "Notes about this specific action, what it did, and why",\n  "long_term_memory": "Information that needs to be remembered throughout the task",\n  "progress_counters": {\n    "items_processed": { "current": 5, "total": 10 }\n  }\n}\n```\n\n2. Report Sub-task Completion:\n```json\n{\n  "decision": "subtask_complete",\n  "result_data": {\n    "key1": "value1"\n  },\n  "short_term_notes": "Final summary of completed task",\n  "long_term_memory": "Key findings or actions taken that should be remembered",\n  "progress_counters": {\n    "items_processed": { "current": 10, "total": 10 }\n  }\n}\n```\n\n3. Report Sub-task Failure:\n```json\n{\n  "decision": "subtask_failed",\n  "error_message": "Detailed explanation of why the sub-task failed, including attempts made",\n  "short_term_notes": "Summary of what was attempted before failure",\n  "long_term_memory": "Information about the failure that should be remembered for future attempts",\n  "progress_counters": {\n    "items_processed": { "current": 5, "total": 10 }\n  }\n}\n```\n\nRemember, there are only THREE valid decision types: "next_action", "subtask_complete", and "subtask_failed". Commands like "extract_content" or "google_search" are NOT decision types - they must be used within the "next_action" decision structure.\n\nNow, based on the provided context, analyze the situation and decide on your next action to progress towards completing your assigned sub-task. Ensure you perform a thorough analysis before making your decision.\n')
      }
      getTemplate(e) {
        const t = this.templates.get(e);
        if (!t) throw new Error(`Template '${e}' not found`);
        return t
      }
      setTemplate(e, t) {
        this.templates.set(e, t)
      }
    }
    class zs {
      constructor() {
        this.activeSessions = new Map, this.sessionCreationQueue = new Map
      }
      static getInstance() {
        return zs.instance || (zs.instance = new zs), zs.instance
      }
      getActiveSessions() {
        return this.activeSessions
      }
      async executeInPageContext(e, t, ...r) {
        const i = await chrome.scripting.executeScript({
          target: {
            tabId: e
          },
          injectImmediately: !0,
          func: t,
          args: r
        });
        if (!i || 0 === i.length || !i[0]) throw new Error("Failed to execute script in page context");
        return i[0].result
      }
      async ensureCleanDebugger(e) {
        await chrome.debugger.detach({
          tabId: e
        }).catch((() => {}))
      }
      async getSession(e) {
        const t = this.sessionCreationQueue.get(e);
        if (t) return t;
        const r = this.activeSessions.get(e);
        if (r) {
          if (await r.evaluate((() => !0)).then((() => !0)).catch((() => !1))) return r;
          this.activeSessions.delete(e), this.ensureCleanDebugger(e)
        }
        const i = (async () => {
          let t = 0;
          const r = 3;
          for (; t < r;) try {
            const t = await chrome.tabs.get(e);
            const restrictedPrefixes = ["chrome://", "chrome-extension://", "edge://", "about:", "view-source:", "data:", "javascript:", "file://", "https://chromewebstore.google.com/", "https://chrome.google.com/webstore/", "https://microsoftedge.microsoft.com/addons/"];
            const isRestricted = !t.url || t.url === "" || t.url === "about:blank" || restrictedPrefixes.some((prefix => t.url.startsWith(prefix)));
            
            // Only redirect if on a truly restricted page (not regular websites)
            if (isRestricted) {
              console.log("[PuppeteerService] Detected restricted URL, navigating to Google...");
              await chrome.tabs.update(e, {
                url: "https://www.google.com"
              });
              await new Promise(((t, r) => {
                let i = !1;
                const n = (s, a) => {
                  s === e && "complete" === a.status && (i = !0, chrome.tabs.onUpdated.removeListener(n), t())
                };
                chrome.tabs.onUpdated.addListener(n);
                setTimeout((() => {
                  i || (chrome.tabs.onUpdated.removeListener(n), t())
                }), 8e3)
              }));
              console.log("[PuppeteerService] Navigation to Google complete, waiting for page to be ready...");
              await new Promise((e => setTimeout(e, 500)))
            }
            return await this.createNewSession(e)
          } catch (i) {
            if (t++, i.message && i.message.includes("chrome://")) {
              if (t >= r) throw new Error("Failed to navigate away from restricted page after multiple attempts");
              console.log(`[PuppeteerService] Retry ${t}/${r}: Still on restricted page, retrying...`);
              await new Promise((e => setTimeout(e, 1e3)))
            } else throw i
          }
          throw new Error("Failed to create session after multiple attempts")
        })();
        this.sessionCreationQueue.set(e, i);
        try {
          const t = await i;
          return this.activeSessions.set(e, t), t
        } finally {
          this.sessionCreationQueue.delete(e)
        }
      }
      async createNewSession(t) {
        await this.ensureCleanDebugger(t);
        const r = this;
        try {
          const n = await chrome.tabs.get(t);
          if (!n.url || ["chrome://", "chrome-extension://", "edge://", "about:", "view-source:", "data:", "javascript:", "file://", "https://chromewebstore.google.com/", "https://chrome.google.com/webstore/", "https://microsoftedge.microsoft.com/addons/"].some((e => n.url.startsWith(e)))) throw new Error("Cannot access a chrome:// URL or restricted page. The page will be navigated to a regular website.");
          const i = await Ds.connectTab(t),
            a = await Us({
              transport: i,
              defaultViewport: null,
              protocolTimeout: 3e4
            }),
            [s] = await a.pages();
          s.on("console", (e => {
            e.type()
          })), s.on("close", (() => {
            this.activeSessions.delete(t), this.ensureCleanDebugger(t)
          }));
          const o = {
            tabId: t,
            browser: a,
            page: s,
            _getDomDataAndRefs: async function () {
              this.page;
              const e = this.tabId;
              if (!await $s(e)) throw new Error("Failed to ensure DOM utilities health before DOM extraction");
              const t = await r.executeInPageContext(e, (() => {
                try {
                  if (delete window.__CACHED_LIVE_ELEMENT_REFS, delete window.__CACHED_SELECTORS, delete window.__CACHED_ELEMENTS, delete window.__CACHED_DOM_TIMESTAMP, !window.DOMTreeParser?.findInteractiveElements) return {
                    error: "DOMTreeParser.findInteractiveElements not available"
                  };
                  const e = window.DOMTreeParser.findInteractiveElements();
                  if (e && Array.isArray(e.elementRefs)) {
                    const t = e.elementRefs.filter((e => e instanceof Element && "function" == typeof e.getBoundingClientRect));
                    window.__CACHED_LIVE_ELEMENT_REFS = t
                  } else window.__CACHED_LIVE_ELEMENT_REFS = [];
                  return {
                    success: !0,
                    data: {
                      url: e.url,
                      title: e.title,
                      elements: e.elements,
                      scrollPosition: e.scrollPosition
                    }
                  }
                } catch (e) {
                  return {
                    error: e instanceof Error ? e.message : String(e)
                  }
                }
              }));
              if (t.error) throw new Error(t.error);
              const i = t.data;
              if (!i || !Array.isArray(i.elements)) throw new Error("Invalid DOM tree structure returned");
              return {
                data: i,
                refs: null
              }
            },
            prepareInteraction: async function (e) {
              this.page;
              const t = this.tabId;
              if (!await $s(t)) throw new Error("Failed to ensure DOM utilities health before preparing interaction");
              const i = await r.executeInPageContext(t, (e => {
                try {
                  delete window.__CACHED_SELECTORS, delete window.__CACHED_ELEMENTS, delete window.__CACHED_DOM_TIMESTAMP;
                  const t = window.__CACHED_LIVE_ELEMENT_REFS;
                  if (!Array.isArray(t) || 0 === t.length) return {
                    error: "Live element references not found. Run _getDomDataAndRefs first."
                  };
                  if (window.__CACHED_SELECTORS = {}, window.__CACHED_ELEMENTS = {}, e.forEach(((e, r) => {
                      const elemNum = e?.elementNumber;
                      if (void 0 !== elemNum) {
                        window.__CACHED_SELECTORS[elemNum] = {
                          primary: e.selectors?.primary || null,
                          fallback: e.selectors?.fallback || null
                        };
                        // Use elementNumber to access live refs, not array index
                        // The elemNum matches the index in the original elementRefs array
                        if (elemNum < t.length && t[elemNum] instanceof Element) {
                          window.__CACHED_ELEMENTS[elemNum] = t[elemNum];
                        }
                      }
                    })), window.__CACHED_DOM_TIMESTAMP = Date.now(), window.DOMTreeHighlighter?.highlightElements && t.length > 0) {
                    const e = t.filter((e => e instanceof Element && "function" == typeof e.getBoundingClientRect));
                    if (e.length > 0) {
                      window.DOMTreeHighlighter.highlightElements(e);
                      const t = document.getElementById("dom-tree-highlight-container");
                      t && t.querySelectorAll(".dom-tree-highlight-overlay").length;
                      t && t.getBoundingClientRect()
                    }
                  }
                  return {
                    success: !0,
                    selectorCount: Object.keys(window.__CACHED_SELECTORS).length,
                    elementCount: Object.keys(window.__CACHED_ELEMENTS).length
                  }
                } catch (e) {
                  return {
                    error: e instanceof Error ? e.message : String(e)
                  }
                }
              }), e.elements);
              if (i.error) throw new Error(i.error);
              await new Promise((e => setTimeout(e, 100)))
            },
            removeHighlights: async function () {
              const e = this.tabId;
              await r.executeInPageContext(e, (() => {
                try {
                  if (window.DOMTreeHighlighter && "function" == typeof window.DOMTreeHighlighter.removeHighlights) return window.DOMTreeHighlighter.removeHighlights(), {
                    success: !0
                  };
                  if ("function" == typeof window.removeHighlights) return window.removeHighlights(), {
                    success: !0
                  };
                  {
                    const e = document.getElementById("dom-tree-highlight-container");
                    e && e.remove();
                    const t = document.getElementById("dom-tree-highlight-styles");
                    return t && t.remove(), document.querySelectorAll(".dom-tree-highlight-overlay, .dom-tree-highlight-label").forEach((e => e.remove())), {
                      success: !0
                    }
                  }
                } catch (e) {
                  return {
                    error: e instanceof Error ? e.message : String(e)
                  }
                }
              }))
            },
            clickElement: async function (e) {
              const t = this.page,
                i = this.tabId,
                n = await r.executeInPageContext(i, (e => {
                  const t = "number" == typeof e ? e : -1,
                    r = window.__CACHED_SELECTORS;
                  if (!r) return {
                    error: "Selector cache not found or empty"
                  };
                  const i = r[t];
                  return i ? {
                    success: !0,
                    selector: i
                  } : {
                    error: `Element ${t} not found in selectors cache`
                  }
                }), e);
              if (n.error) throw new Error(`Element ${e} not found in cache.`);
              
              // First, try direct DOM click which is more reliable
              const directClick = await r.executeInPageContext(i, (elementNum => {
                try {
                  // Try cached element first
                  let element = window.__CACHED_ELEMENTS?.[elementNum];
                  
                  // If not in cache, try to find via selector
                  if (!element) {
                    const selectors = window.__CACHED_SELECTORS?.[elementNum];
                    if (selectors?.primary?.value) {
                      if (selectors.primary.type === 'xpath') {
                        const result = document.evaluate(selectors.primary.value, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                        element = result.singleNodeValue;
                      } else {
                        element = document.querySelector(selectors.primary.value);
                      }
                    }
                    if (!element && selectors?.fallback?.value) {
                      if (selectors.fallback.type === 'xpath') {
                        const result = document.evaluate(selectors.fallback.value, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                        element = result.singleNodeValue;
                      } else {
                        element = document.querySelector(selectors.fallback.value);
                      }
                    }
                  }
                  
                  // Also try live refs array
                  if (!element) {
                    const liveRefs = window.__CACHED_LIVE_ELEMENT_REFS;
                    if (Array.isArray(liveRefs) && liveRefs[elementNum]) {
                      element = liveRefs[elementNum];
                    }
                  }
                  
                  if (!element) return { error: 'Element not found' };
                  
                  // Scroll into view
                  element.scrollIntoView({ behavior: 'instant', block: 'center' });
                  
                  // Small delay for scroll to complete
                  return new Promise(resolve => {
                    setTimeout(() => {
                      try {
                        // Focus and click with proper coordinates
                        const rect = element.getBoundingClientRect();
                        const clickX = rect.left + rect.width / 2;
                        const clickY = rect.top + rect.height / 2;
                        
                        element.focus();
                        
                        // Fire mouse events with proper coordinates
                        const mouseOpts = { 
                          bubbles: true, 
                          cancelable: true, 
                          view: window,
                          clientX: clickX,
                          clientY: clickY
                        };
                        
                        element.dispatchEvent(new MouseEvent('mouseenter', mouseOpts));
                        element.dispatchEvent(new MouseEvent('mouseover', mouseOpts));
                        element.dispatchEvent(new MouseEvent('mousedown', { ...mouseOpts, button: 0, buttons: 1 }));
                        element.dispatchEvent(new MouseEvent('mouseup', { ...mouseOpts, button: 0, buttons: 0 }));
                        element.dispatchEvent(new MouseEvent('click', { ...mouseOpts, button: 0, buttons: 0 }));
                        
                        // Also try native click
                        if (typeof element.click === 'function') {
                          element.click();
                        }
                        
                        resolve({ success: true });
                      } catch (err) {
                        resolve({ error: err.message || String(err) });
                      }
                    }, 100);
                  });
                } catch (err) {
                  return { error: err.message || String(err) };
                }
              }), e);
              
              if (directClick.success) {
                // Wait a bit for any navigation
                await new Promise(resolve => setTimeout(resolve, 300));
                try {
                  await t.waitForNetworkIdle({ idleTime: 250, timeout: 2000, concurrency: 2 });
                } catch (e) {}
                return;
              }
              
              // Fallback to puppeteer locator approach
              const s = n.selector,
                a = e => e?.value ? "xpath" === e.type ? `::-p-xpath(${e.value})` : e.value : null,
                o = a(s.primary),
                c = a(s.fallback);
              if (o) try {
                const e = t.locator(o),
                  r = t.waitForNavigation({
                    timeout: 1e3
                  }).catch((() => null));
                await e.setTimeout(5e3).click();
                return void(await r && await t.waitForNetworkIdle({
                  idleTime: 250,
                  timeout: 3e3,
                  concurrency: 2
                }))
              } catch (e) {}
              if (c) try {
                const e = t.locator(c),
                  r = t.waitForNavigation({
                    timeout: 1e3
                  }).catch((() => null));
                await e.setTimeout(5e3).click();
                return void(await r && await t.waitForNetworkIdle({
                  idleTime: 250,
                  timeout: 3e3,
                  concurrency: 2
                }))
              } catch (e) {}
              throw new Error(`Failed to click element ${e} using both primary and fallback locators.`)
            },
            typeIntoElement: async function (e, t, i = !0) {
              const n = this.page,
                s = this.tabId,
                a = await r.executeInPageContext(s, (e => {
                  const t = window.__CACHED_SELECTORS;
                  if (!t) return {
                    error: "Selector cache not found or empty"
                  };
                  const r = t[e];
                  return r ? {
                    success: !0,
                    selector: r
                  } : {
                    error: `Element ${e} not found in selectors cache`
                  }
                }), e);
              if (a.error) throw new Error(`Element ${e} not found in cache.`);
              const o = a.selector,
                c = e => e?.value ? "xpath" === e.type ? `::-p-xpath(${e.value})` : e.value : null,
                l = c(o.primary),
                d = c(o.fallback);
              
              // First, try direct DOM manipulation which is more reliable
              const directType = await r.executeInPageContext(s, ((elementNum, text, clearFirst) => {
                try {
                  // Try cached element first
                  let element = window.__CACHED_ELEMENTS?.[elementNum];
                  
                  // If not in cache, try to find via selector
                  if (!element) {
                    const selectors = window.__CACHED_SELECTORS?.[elementNum];
                    if (selectors?.primary?.value) {
                      if (selectors.primary.type === 'xpath') {
                        const result = document.evaluate(selectors.primary.value, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                        element = result.singleNodeValue;
                      } else {
                        element = document.querySelector(selectors.primary.value);
                      }
                    }
                    if (!element && selectors?.fallback?.value) {
                      if (selectors.fallback.type === 'xpath') {
                        const result = document.evaluate(selectors.fallback.value, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                        element = result.singleNodeValue;
                      } else {
                        element = document.querySelector(selectors.fallback.value);
                      }
                    }
                  }
                  
                  // Also try to find by live refs
                  if (!element) {
                    const liveRefs = window.__CACHED_LIVE_ELEMENT_REFS;
                    if (Array.isArray(liveRefs) && liveRefs[elementNum]) {
                      element = liveRefs[elementNum];
                    }
                  }
                  
                  if (!element) return { error: 'Element not found' };
                  
                  // Scroll into view and focus
                  element.scrollIntoView({ behavior: 'instant', block: 'center' });
                  element.focus();
                  
                  // For input/textarea elements, use a special approach
                  const isInput = element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.isContentEditable;
                  
                  if (isInput) {
                    // Clear if needed
                    if (clearFirst) {
                      if ('value' in element) {
                        element.value = '';
                      } else if (element.isContentEditable) {
                        element.textContent = '';
                      }
                      element.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                    
                    // Use native input value setter to bypass React's synthetic events
                    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                      window.HTMLInputElement.prototype, 'value'
                    )?.set || Object.getOwnPropertyDescriptor(
                      window.HTMLTextAreaElement.prototype, 'value'
                    )?.set;
                    
                    if (nativeInputValueSetter && 'value' in element) {
                      nativeInputValueSetter.call(element, text);
                    } else if ('value' in element) {
                      element.value = text;
                    } else if (element.isContentEditable) {
                      element.textContent = text;
                    }
                    
                    // Dispatch all necessary events
                    element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
                    element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
                    
                    // Also simulate typing events for frameworks that need them
                    for (const char of text) {
                      element.dispatchEvent(new KeyboardEvent('keydown', { 
                        key: char, 
                        code: 'Key' + char.toUpperCase(),
                        bubbles: true,
                        cancelable: true
                      }));
                      element.dispatchEvent(new KeyboardEvent('keypress', { 
                        key: char,
                        bubbles: true,
                        cancelable: true
                      }));
                      element.dispatchEvent(new KeyboardEvent('keyup', { 
                        key: char,
                        bubbles: true,
                        cancelable: true
                      }));
                    }
                  } else {
                    // For non-input elements, just set textContent
                    element.textContent = text;
                  }
                  
                  return { success: true };
                } catch (err) {
                  return { error: err.message || String(err) };
                }
              }), e, t, i);
              
              if (directType.success) return;
              
              // Second fallback: click element and use keyboard.type which is most reliable for complex inputs
              try {
                const clickResult = await r.executeInPageContext(s, (elementNum => {
                  try {
                    let element = window.__CACHED_ELEMENTS?.[elementNum] || 
                                  window.__CACHED_LIVE_ELEMENT_REFS?.[elementNum];
                    
                    if (!element) {
                      const selectors = window.__CACHED_SELECTORS?.[elementNum];
                      if (selectors?.primary?.value) {
                        element = selectors.primary.type === 'xpath' 
                          ? document.evaluate(selectors.primary.value, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue
                          : document.querySelector(selectors.primary.value);
                      }
                    }
                    
                    if (!element) return { error: 'Element not found' };
                    
                    element.scrollIntoView({ behavior: 'instant', block: 'center' });
                    element.focus();
                    element.click();
                    
                    // Clear the field if needed
                    if (element.value !== undefined) {
                      element.select();
                    }
                    
                    return { success: true };
                  } catch (err) {
                    return { error: err.message };
                  }
                }), e);
                
                if (clickResult.success) {
                  // Now use keyboard to type character by character
                  if (i) {
                    // Clear by selecting all and deleting
                    await n.keyboard.down('Control');
                    await n.keyboard.press('a');
                    await n.keyboard.up('Control');
                    await n.keyboard.press('Backspace');
                  }
                  await n.keyboard.type(t, { delay: 10 });
                  return;
                }
              } catch (e) {}
              
              // Third fallback: puppeteer locator approach
              const u = async (e, r) => {
                  try {
                    const r = n.locator(e);
                    return i && await r.setTimeout(3e3).fill(""), await r.setTimeout(3e3).fill(t), !0
                  } catch (e) {
                    return !1
                  }
                };
              let h = !1;
              if (l && (h = await u(l)), !h && d && (h = await u(d)), !h) throw new Error(`Failed to type into element ${e} using both primary and fallback locators.`)
            },
            extractText: async function (e) {
              this.page;
              const t = this.tabId,
                i = await r.executeInPageContext(t, (e => {
                  try {
                    const t = window.__CACHED_ELEMENTS;
                    if (t && t[e]) {
                      const r = t[e];
                      return r instanceof HTMLInputElement || r instanceof HTMLTextAreaElement ? {
                        success: !0,
                        text: r.value
                      } : {
                        success: !0,
                        text: r.textContent || ""
                      }
                    }
                    const r = window.__CACHED_SELECTORS;
                    if (!r || !r[e]) return {
                      error: `Element ${e} not found in any cache`
                    };
                    const i = r[e];
                    let n = "";
                    if (i.primary)
                      if ("xpath" === i.primary.type) {
                        const e = document.evaluate(i.primary.value, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                        if (e instanceof Element && (n = e instanceof HTMLInputElement || e instanceof HTMLTextAreaElement ? e.value : e.textContent || "", n)) return {
                          success: !0,
                          text: n
                        }
                      } else {
                        const e = document.querySelector(i.primary.value);
                        if (e && (n = e instanceof HTMLInputElement || e instanceof HTMLTextAreaElement ? e.value : e.textContent || "", n)) return {
                          success: !0,
                          text: n
                        }
                      } if (i.fallback)
                      if ("xpath" === i.fallback.type) {
                        const e = document.evaluate(i.fallback.value, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                        if (e instanceof Element && (n = e instanceof HTMLInputElement || e instanceof HTMLTextAreaElement ? e.value : e.textContent || "", n)) return {
                          success: !0,
                          text: n
                        }
                      } else {
                        const e = document.querySelector(i.fallback.value);
                        if (e && (n = e instanceof HTMLInputElement || e instanceof HTMLTextAreaElement ? e.value : e.textContent || "", n)) return {
                          success: !0,
                          text: n
                        }
                      } return {
                      error: `Could not find element ${e} using any method`
                    }
                  } catch (e) {
                    return {
                      error: e instanceof Error ? e.message : String(e)
                    }
                  }
                }), e);
              if (i.error) throw new Error(`Error extracting text from element ${e}: ${i.error}`);
              return i.text
            },
            keypress: async function (e) {
              const t = this.page;
              try {
                const r = {
                    enter: "Enter",
                    tab: "Tab",
                    escape: "Escape",
                    arrowup: "ArrowUp",
                    arrowdown: "ArrowDown",
                    arrowleft: "ArrowLeft",
                    arrowright: "ArrowRight",
                    backspace: "Backspace",
                    delete: "Delete",
                    space: " ",
                    return: "Enter"
                  },
                  i = e.toLowerCase(),
                  n = r[i] || e;
                if (await t.keyboard.press(n), "enter" === i) try {
                  await t.waitForNetworkIdle({
                    idleTime: 500,
                    timeout: 5e3,
                    concurrency: 2
                  })
                } catch (e) {}
              } catch (t) {
                throw new Error(`Failed to press key '${e}': ${t.message}`)
              }
            },
            navigateTo: async function (e) {
              const t = this.page,
                i = this.tabId;
              await r.executeInPageContext(i, (() => (window.DOMTreeHighlighter?.removeHighlights && window.DOMTreeHighlighter.removeHighlights(), {
                success: !0
              })));
              const n = e.startsWith("http") ? e : `https://${e}`;
              try {
                await t.goto(n, {
                  waitUntil: ["domcontentloaded"],
                  timeout: 6e4
                })
              } catch (e) {
                if ("object" == typeof e && null !== e && "name" in e && "TimeoutError" === e.name) throw new Error(`Navigation timeout for URL: ${n}. The page might be slow to load or unreachable.`);
                throw e
              }
            },
            goBack: async function () {
              const e = this.page,
                t = this.tabId;
              await r.executeInPageContext(t, (() => (window.DOMTreeHighlighter?.removeHighlights && window.DOMTreeHighlighter.removeHighlights(), {
                success: !0
              })));
              try {
                await e.goBack({
                  waitUntil: ["domcontentloaded"],
                  timeout: 3e4
                })
              } catch (e) {
                throw new Error(`Failed to navigate back: ${e.message}`)
              }
            },
            goForward: async function () {
              const e = this.page,
                t = this.tabId;
              await r.executeInPageContext(t, (() => (window.DOMTreeHighlighter?.removeHighlights && window.DOMTreeHighlighter.removeHighlights(), {
                success: !0
              })));
              try {
                await e.goForward({
                  waitUntil: ["domcontentloaded"],
                  timeout: 3e4
                })
              } catch (e) {
                throw new Error(`Failed to navigate forward: ${e.message}`)
              }
            },
            scrollPage: async function (e, t) {
              const r = this.page,
                i = await r.evaluate((() => window.innerHeight || document.documentElement.clientHeight)),
                n = Math.round(.75 * i),
                s = "number" == typeof t ? t : n,
                a = await r.evaluate((() => {
                  const e = window.scrollY || window.pageYOffset,
                    t = document.documentElement.scrollHeight || document.body.scrollHeight,
                    r = document.documentElement.clientHeight || window.innerHeight;
                  return {
                    scrollY: e,
                    scrollHeight: t,
                    clientHeight: r,
                    atTop: e <= 5,
                    atBottom: e + r >= t - 5,
                    percentScrolled: Math.round(e / (t - r) * 100) || 0
                  }
                }));
              "top" === e && a.atTop || "bottom" === e && a.atBottom || "up" === e && a.atTop || "down" === e && a.atBottom || await r.evaluate(((e, t) => {
                switch (e) {
                case "up":
                  window.scrollBy(0, -t);
                  break;
                case "down":
                  window.scrollBy(0, t);
                  break;
                case "top":
                  window.scrollTo(0, 0);
                  break;
                case "bottom":
                  window.scrollTo(0, document.body.scrollHeight)
                }
              }), e, s)
            },
            waitForTimeout: async function (e) {
              await new Promise((t => setTimeout(t, e)))
            },
            evaluate: async function (e, t) {
              const r = this.page;
              return await r.evaluate(e, t)
            },
            executeJavaScript: async function (e) {
              const t = this.tabId;
              try {
                // First ensure imageExtractor is loaded
                try {
                  await chrome.scripting.executeScript({
                    target: { tabId: t },
                    files: ['/src/utils/jszip.min.js', '/src/utils/zipManager.js', '/src/utils/imageExtractor.js'],
                    world: 'MAIN'
                  });
                } catch (injectErr) {
                  // Files might already be loaded, continue
                }
                
                // Now execute the code using chrome.scripting which bypasses CSP
                const n = await chrome.scripting.executeScript({
                  target: { tabId: t },
                  func: function(codeStr) {
                    // Use indirect eval to execute in global scope and bypass CSP
                    return (0, eval)('(async () => { ' + codeStr + ' })()');
                  },
                  args: [e],
                  world: 'MAIN'
                });
                
                if (n && n[0]) {
                  if (n[0].error) {
                    throw new Error(n[0].error);
                  }
                  return {
                    success: !0,
                    result: n[0].result
                  }
                }
                return {
                  success: !1,
                  error: 'No result returned from script execution'
                }
              } catch (t) {
                throw new Error(`Failed to execute JavaScript: ${t.message}`)
              }
            },
            close: async function () {
              await r.closeSession(this.tabId)
            },
            extractContent: async function (t) {
              const i = this.page,
                n = this.tabId,
                s = r;
              try {
                try {
                  await i.waitForNetworkIdle({
                    idleTime: 500,
                    timeout: 15e3
                  })
                } catch (e) {}
                try {
                  await chrome.scripting.executeScript({
                    target: {
                      tabId: n
                    },
                    injectImmediately: !0,
                    files: ["/src/core/utils/readability/Readability.js"]
                  })
                } catch (e) {
                  throw new Error(`Failed to inject Readability library: ${e.message||String(e)}`)
                }
                try {
                  await new Promise((e => setTimeout(e, 50))), await chrome.scripting.executeScript({
                    target: {
                      tabId: n
                    },
                    injectImmediately: !0,
                    files: ["/src/core/utils/readability/wrapper.js"]
                  })
                } catch (e) {
                  throw new Error(`Failed to inject wrapper script: ${e.message||String(e)}`)
                }
                const r = await s.executeInPageContext(n, (() => window.__READABILITY_RESULT__ || {
                  error: "Readability result not found",
                  fallbackContent: document.body.textContent,
                  title: document.title,
                  url: window.location.href
                }));
                if (!r) throw new Error("Failed to execute content extraction script or no result returned.");
                let a = null;
                const o = r;
                o && !o.error && (a = {
                  title: o.title || document.title || "",
                  htmlContent: o.htmlContent || o.content || "",
                  length: o.length || 0,
                  excerpt: o.excerpt || "",
                  byline: o.byline || null,
                  dir: o.dir || null,
                  siteName: o.siteName || null,
                  lang: o.lang || null
                }), await e.llmService.initFromSettings();
                const c = (new Gs).getTemplate("extract_content");
                if (!c) throw new Error("Prompt template 'extract_content' not found.");
                const l = a ? JSON.stringify(a) : JSON.stringify({
                    title: document.title,
                    htmlContent: "",
                    error: "Extraction failed completely"
                  }),
                  d = c.replace("{goal}", t).replace("{page_text}", l),
                  p = {
                    temperature: 1
                  };
                const m = await e.llmService.generateResponse(d, p);
                return m.parsed_json || m.text
              } catch (e) {
                return {
                  error: `Failed to extract and process content: ${e.message}`
                }
              }
            }
          };
          return o
        } catch (e) {
          throw e instanceof Error ? e : new Error(String(e))
        }
      }
      async closeSession(e) {
        const t = this.activeSessions.get(e);
        if (!t) return;
        try {
          await this.executeInPageContext(e, (() => {
            try {
              return window.DOMTreeHighlighter && "function" == typeof window.DOMTreeHighlighter.removeHighlights ? window.DOMTreeHighlighter.removeHighlights() : "function" == typeof window.removeHighlights && window.removeHighlights(), delete window.__CACHED_ELEMENTS, delete window.__CACHED_SELECTORS, delete window.__CACHED_DOM_TIMESTAMP, delete window.__CACHED_LIVE_ELEMENT_REFS, delete window.__CACHED_ELEMENT_REFS, window.__domBundleReady && (window.__domBundleReady = !1), {
                success: !0
              }
            } catch (e) {
              return {
                error: e instanceof Error ? e.message : String(e)
              }
            }
          })).catch((e => {}))
        } catch (e) {}
        if (t.browser && "function" == typeof t.browser.isConnected && t.browser.isConnected()) {
          if (t.page) try {
            await t.page.close()
          } catch (e) {}
          if (t.browser && "function" == typeof t.browser.disconnect) try {
            await t.browser.disconnect()
          } catch (e) {}
        }
        await this.ensureCleanDebugger(e), this.activeSessions.delete(e)
      }
      async closeAllSessions() {
        const e = Array.from(this.activeSessions.keys());
        await Promise.all(e.map((e => this.closeSession(e)))), this.activeSessions.clear()
      }
    }
    class Vs extends o {
      constructor() {
        super(), this.activeTabId = null, this.puppeteerService = zs.getInstance(), this.updateActiveTab(), chrome.tabs.onActivated.addListener(this.handleTabChange.bind(this)), chrome.tabs.onRemoved.addListener(this.handleTabClose.bind(this))
      }
      async handleTabChange(e) {
        this.activeTabId = e.tabId
      }
      async handleTabClose(e) {
        e === this.activeTabId && (this.activeTabId = null);
        try {
          const t = await this.puppeteerService.getSession(e);
          t && await t.close()
        } catch (e) {}
      }
      async updateActiveTab() {
        try {
          const [e] = await chrome.tabs.query({
            active: !0,
            currentWindow: !0
          });
          e?.id && (this.activeTabId = e.id)
        } catch (e) {}
      }
      isRestrictedUrl(e) {
        // Empty or undefined URL is considered restricted
        if (!e || e === "" || e === "about:blank") return !0;
        const t = ["chrome://", "chrome-extension://", "edge://", "about:", "view-source:", "data:", "javascript:", "file://", "https://chromewebstore.google.com/", "https://chrome.google.com/webstore/", "https://microsoftedge.microsoft.com/addons/"];
        return t.some((t => e.startsWith(t)))
      }
      async ensureNavigableTab(e) {
        try {
          const t = await chrome.tabs.get(e);
          // Only redirect if on a restricted URL, otherwise stay on current page
          if (this.isRestrictedUrl(t.url)) {
            console.log("[ensureNavigableTab] On restricted URL, navigating to Google...");
            await chrome.tabs.update(e, {
              url: "https://www.google.com"
            });
            await new Promise((t => {
              const r = (i, n) => {
                i === e && "complete" === n.status && (chrome.tabs.onUpdated.removeListener(r), t())
              };
              chrome.tabs.onUpdated.addListener(r), setTimeout((() => {
                chrome.tabs.onUpdated.removeListener(r), t()
              }), 5e3)
            }));
            return !0;
          }
          // Not on restricted URL, no navigation needed
          return !1
        } catch (e) {
          throw new Error(`Failed to ensure navigable tab: ${e.message}`)
        }
      }
      async getActiveTabId() {
        if (!this.activeTabId && (await this.updateActiveTab(), !this.activeTabId)) throw new Error("No active tab available");
        return this.activeTabId
      }
      async startTask() {
        try {
          const e = await this.getActiveTabId();
          await this.ensureNavigableTab(e);
          try {
            const t = await this.puppeteerService.getSession(e);
            t && await t.close()
          } catch (e) {}
          return await this.puppeteerService.getSession(e), {
            success: !0
          }
        } catch (e) {
          return {
            success: !1,
            error: e.message
          }
        }
      }
      async completeTask() {
        try {
          let e = null;
          try {
            e = await this.getActiveTabId()
          } catch (e) {}
          if (null !== e) try {
            const t = async () => Promise.race([(async () => {
              const t = await this.puppeteerService.getSession(e);
              return t && await t.close(), !0
            })(), new Promise((e => setTimeout((() => {
              e(!1)
            }), 5e3)))]);
            if (await t());
            else try {
              await this.puppeteerService.ensureCleanDebugger(e)
            } catch (e) {}
          } catch (e) {}
          try {
            null !== e && await this.removeHighlights().catch((e => {}))
          } catch (e) {}
          return {
            success: !0
          }
        } catch (e) {
          return {
            success: !1,
            error: e.message
          }
        }
      }
      async getDomDataAndRefs() {
        try {
          const e = await this.getActiveTabId(),
            t = await this.puppeteerService.getSession(e);
          return {
            success: !0,
            data: await t._getDomDataAndRefs()
          }
        } catch (e) {
          return {
            success: !1,
            error: e.message
          }
        }
      }
      async prepareInteraction(e) {
        try {
          const t = await this.getActiveTabId(),
            r = await this.puppeteerService.getSession(t);
          return await r.prepareInteraction(e), {
            success: !0
          }
        } catch (e) {
          return {
            success: !1,
            error: e.message
          }
        }
      }
      async captureScreenshot() {
        try {
          const e = (await chrome.storage.local.get("apiSettings")).apiSettings;
          if (!e?.features?.enableScreenshots) return null;
          const t = await this.getActiveTabId(),
            r = await this.puppeteerService.getSession(t);
          await new Promise((e => setTimeout(e, 250)));
          return `data:image/jpeg;base64,${await r.page.screenshot({type:"jpeg",quality:70,encoding:"base64"})}`
        } catch (e) {
          return null
        }
      }
      async extractDOM() {
        try {
          const e = await this.getActiveTabId();
          
          // Ensure we're on a navigable page before extracting DOM
          await this.ensureNavigableTab(e);
          
          const t = await this.puppeteerService.getSession(e);
          await t.removeHighlights().catch((() => {}));
          const {
            data: r
          } = await t._getDomDataAndRefs();
          return {
            success: !0,
            data: r
          }
        } catch (e) {
          return {
            success: !1,
            error: e.message
          }
        }
      }
      async removeHighlights() {
        try {
          const e = await this.getActiveTabId(),
            t = await this.puppeteerService.getSession(e);
          return await t.removeHighlights(), {
            success: !0
          }
        } catch (e) {
          return {
            success: !1,
            error: e.message
          }
        }
      }
      async clickElement(e) {
        try {
          const t = await this.getActiveTabId();
          
          // Ensure we're on a navigable page before clicking
          await this.ensureNavigableTab(t);
          
          const r = await this.puppeteerService.getSession(t);
          return await r.clickElement(e), {
            success: !0
          }
        } catch (e) {
          return {
            success: !1,
            error: e.message
          }
        }
      }
      async typeIntoElement(e, t, r = !0) {
        try {
          const i = await this.getActiveTabId();
          
          // Ensure we're on a navigable page before typing
          await this.ensureNavigableTab(i);
          
          const n = await this.puppeteerService.getSession(i);
          return await n.typeIntoElement(e, t, r), {
            success: !0
          }
        } catch (e) {
          return {
            success: !1,
            error: e.message
          }
        }
      }
      async keypress(e) {
        try {
          const t = await this.getActiveTabId();
          
          // Ensure we're on a navigable page before keypress
          await this.ensureNavigableTab(t);
          
          const r = await this.puppeteerService.getSession(t);
          return await r.keypress(e), {
            success: !0
          }
        } catch (e) {
          return {
            success: !1,
            error: e.message
          }
        }
      }
      async navigateTo(e) {
        try {
          // Check if target URL is restricted BEFORE attempting navigation
          if (this.isRestrictedUrl(e)) {
            return {
              success: !1,
              error: "Cannot navigate to " + e + ". This is a protected page (Chrome Web Store, chrome:// URLs, etc.) that cannot be automated by extensions. Please ask me to navigate to a different website."
            }
          }
          
          const t = await this.getActiveTabId();
          
          // ALWAYS go to Google first to avoid chrome:// and other restricted URL issues
          await this.ensureNavigableTab(t);
          
          const r = await this.puppeteerService.getSession(t);
          return await r.navigateTo(e), {
            success: !0
          }
        } catch (e) {
          return {
            success: !1,
            error: e.message
          }
        }
      }
      async scroll(e, t) {
        try {
          const r = await this.getActiveTabId();
          
          // Ensure we're on a navigable page before scrolling
          await this.ensureNavigableTab(r);
          
          const i = await this.puppeteerService.getSession(r);
          return await i.scrollPage(e, t), {
            success: !0
          }
        } catch (e) {
          return {
            success: !1,
            error: e.message
          }
        }
      }
      async goBack() {
        try {
          const e = await this.getActiveTabId();
          
          // Ensure we're on a navigable page before going back
          await this.ensureNavigableTab(e);
          
          const t = await this.puppeteerService.getSession(e);
          return await t.goBack(), {
            success: !0
          }
        } catch (e) {
          return {
            success: !1,
            error: e.message
          }
        }
      }
      async goForward() {
        try {
          const e = await this.getActiveTabId();
          
          // Ensure we're on a navigable page before going forward
          await this.ensureNavigableTab(e);
          
          const t = await this.puppeteerService.getSession(e);
          return await t.goForward(), {
            success: !0
          }
        } catch (e) {
          return {
            success: !1,
            error: e.message
          }
        }
      }
      async wait(e) {
        try {
          const t = await this.getActiveTabId(),
            r = await this.puppeteerService.getSession(t);
          return await r.waitForTimeout(1e3 * e), {
            success: !0
          }
        } catch (e) {
          return {
            success: !1,
            error: e.message
          }
        }
      }
      async extractText(e, t) {
        try {
          const r = await this.getActiveTabId(),
            i = await this.puppeteerService.getSession(r);
          return {
            success: !0,
            data: {
              extracted_text: await i.extractText(e),
              data_name: t
            }
          }
        } catch (e) {
          return {
            success: !1,
            error: e.message
          }
        }
      }
      async extractContent(e) {
        try {
          const t = await this.getActiveTabId(),
            r = await this.puppeteerService.getSession(t);
          return {
            success: !0,
            data: {
              extracted_content: await r.extractContent(e),
              goal: e
            }
          }
        } catch (e) {
          return {
            success: !1,
            error: e.message
          }
        }
      }
      async googleSearch(e) {
        try {
          const t = await this.getActiveTabId(),
            r = await this.puppeteerService.getSession(t),
            i = `https://www.google.com/search?q=${encodeURIComponent(e)}`;
          return await r.navigateTo(i), {
            success: !0,
            data: {
              searched_for: e,
              url: i
            }
          }
        } catch (e) {
          return {
            success: !1,
            error: e.message
          }
        }
      }
      async executeJavaScript(e) {
        try {
          const t = await this.getActiveTabId(),
            r = await this.puppeteerService.getSession(t);
          return await r.executeJavaScript(e)
        } catch (e) {
          return {
            success: !1,
            error: e.message
          }
        }
      }
      handleMessage(e, t, r) {
        if (e.requestId && this.responseHandlers.has(e.requestId)) return super.handleMessage(e, t, r);
        if (!e || void 0 === e.type) return r({
          success: !1,
          error: "Message type is undefined"
        }), !1;
        switch (e.type) {
        case s.TASK_START:
          return this.startTask().then((e => r(e))).catch((e => r({
            success: !1,
            error: e.message
          }))), !0;
        case s.TASK_COMPLETE:
          return this.completeTask().then((e => r(e))).catch((e => r({
            success: !1,
            error: e.message
          }))), !0;
        case s.DOM_EXTRACT:
          return this.extractDOM().then((e => r(e))).catch((e => r({
            success: !1,
            error: e.message
          }))), !0;
        case s.DOM_HIGHLIGHT_REMOVE:
          return this.removeHighlights().then((e => r(e))).catch((e => r({
            success: !1,
            error: e.message
          }))), !0;
        case s.ACTION_CLICK:
          const t = e;
          return this.clickElement(t.elementNumber).then((e => r(e))).catch((e => r({
            success: !1,
            error: e.message
          }))), !0;
        case s.ACTION_TYPE:
          const i = e;
          return this.typeIntoElement(i.elementNumber, i.text, i.clearFirst).then((e => r(e))).catch((e => r({
            success: !1,
            error: e.message
          }))), !0;
        case s.ACTION_KEYPRESS:
          const n = e;
          return this.keypress(n.key).then((e => r(e))).catch((e => r({
            success: !1,
            error: e.message
          }))), !0;
        case s.ACTION_NAVIGATE:
          const a = e;
          return this.navigateTo(a.url).then((e => r(e))).catch((e => r({
            success: !1,
            error: e.message
          }))), !0;
        case s.ACTION_SCROLL:
          const o = e;
          return this.scroll(o.direction, o.pixels).then((e => r(e))).catch((e => r({
            success: !1,
            error: e.message
          }))), !0;
        case s.ACTION_WAIT:
          const c = e;
          return this.wait(c.seconds).then((e => r(e))).catch((e => r({
            success: !1,
            error: e.message
          }))), !0;
        case s.ACTION_EXTRACT_TEXT:
          const l = e;
          return this.extractText(l.elementNumber, l.dataName).then((e => r(e))).catch((e => r({
            success: !1,
            error: e.message
          }))), !0;
        case s.ACTION_EXTRACT_CONTENT:
          const d = e;
          return this.extractContent(d.goal).then((e => r(e))).catch((e => r({
            success: !1,
            error: e.message
          }))), !0;
        case s.ACTION_GOOGLE_SEARCH:
          const u = e;
          return this.googleSearch(u.query).then((e => r(e))).catch((e => r({
            success: !1,
            error: e.message
          }))), !0;
        case s.STATUS_UPDATE:
          return r({
            success: !0
          }), !1;
        case s.TASK_COMPLETE:
          return this.completeTask().catch((e => {})), r({
            success: !0
          }), !1;
        case s.REQUEST_CLARIFICATION:
          return r({
            success: !0
          }), !1;
        case s.PROVIDE_CLARIFICATION:
          const h = e;
          return null === h.clarification ? r({
            success: !0,
            data: {
              clarificationProvided: !1
            }
          }) : r({
            success: !0,
            data: {
              clarificationProvided: !0,
              clarification: h.clarification
            }
          }), !1;
        case s.API_SETTINGS_CHANGED:
          return !1;
        case s.GENERATE_PLAN:
          return !1;
        case s.APPROVE_PLAN:
          return !1;
        case s.CHAT_MESSAGE:
          return !1;
        default:
          return r({
            success: !1,
            error: `Unhandled message type: ${e.type}`
          }), !1
        }
      }
      async cleanup() {
        const e = zs.getInstance().getActiveSessions();
        for (const t of e.keys()) try {
          const r = e.get(t);
          r && await r.close()
        } catch (e) {}
      }
    }
    class Xs {
      constructor() {
        this._lastDomData = null, this._lastElementRefs = null, this.messageHandler = new Vs
      }
      getMessageHandler() {
        return this.messageHandler
      }
      async getDomStateAndRefs() {
        let e = null;
        for (let t = 1; t <= 3; t++) try {
          const e = await this.messageHandler.getDomDataAndRefs();
          if (!e.success || !e.data) throw new Error(e.error || "Unknown error getting DOM data and refs");
          const {
            data: t,
            refs: r
          } = e.data;
          this._lastDomData = t, this._lastElementRefs = r;
          return {
            browserState: this.convertToBrowserState(t),
            domData: t,
            elementRefs: r
          }
        } catch (r) {
          if (e = r, t < 3) {
            const e = Math.min(100 * Math.pow(2, t - 1) + 100 * Math.random(), 1e3);
            await new Promise((t => setTimeout(t, e)))
          }
        }
        return {
          browserState: {
            current_url: this._lastDomData?.url || "unknown",
            page_title: this._lastDomData?.title || "",
            simplified_dom_tree: this._lastDomData ? this.convertToBrowserState(this._lastDomData).simplified_dom_tree : [],
            screenshot_description: `Failed to get DOM state after 3 attempts: ${e?.message||"Unknown error"}`
          },
          domData: this._lastDomData,
          elementRefs: this._lastElementRefs
        }
      }
      async executeAction(e, t, r) {
        try {
          switch (e.command) {
          case "navigate":
            try {
              const t = await this.messageHandler.navigateTo(e.params.url);
              return t.success ? {
                status: "success",
                action: e,
                command_executed: e,
                result: {
                  navigated_to: e.params.url
                }
              } : {
                status: "failure",
                action: e,
                command_executed: e,
                error_message: t.error || "Unknown error navigating"
              }
            } catch (t) {
              return {
                status: "failure",
                action: e,
                command_executed: e,
                error_message: `Failed to navigate: ${t.message}`
              }
            }
          case "click":
            try {
              const t = await this.messageHandler.clickElement(e.params.element_number);
              if (!t.success) return {
                status: "failure",
                action: e,
                command_executed: e,
                error_message: t.error || "Unknown error clicking element"
              };
              return {
                status: "success",
                action: e,
                command_executed: e,
                element: this._getElementDetails(e.params.element_number),
                result: {
                  clicked: e.params.element_number
                }
              }
            } catch (t) {
              return {
                status: "failure",
                action: e,
                command_executed: e,
                error_message: `Failed to click element: ${t.message}`
              }
            }
          case "type":
            try {
              const t = void 0 === e.params.clear_first || e.params.clear_first,
                r = await this.messageHandler.typeIntoElement(e.params.element_number, e.params.text, t);
              if (!r.success) return {
                status: "failure",
                action: e,
                command_executed: e,
                error_message: r.error || "Unknown error typing text"
              };
              return {
                status: "success",
                action: e,
                command_executed: e,
                element: this._getElementDetails(e.params.element_number),
                result: {
                  typed: e.params.text
                }
              }
            } catch (t) {
              return {
                status: "failure",
                action: e,
                command_executed: e,
                error_message: `Failed to type text: ${t.message}`
              }
            }
          case "keypress":
            try {
              const t = await this.messageHandler.keypress(e.params.key);
              return t.success ? {
                status: "success",
                action: e,
                command_executed: e,
                result: {
                  pressed_key: e.params.key
                }
              } : {
                status: "failure",
                action: e,
                command_executed: e,
                error_message: t.error || "Unknown error pressing key"
              }
            } catch (t) {
              return {
                status: "failure",
                action: e,
                command_executed: e,
                error_message: `Failed to press key: ${t.message}`
              }
            }
          case "scroll":
            try {
              const t = await this.messageHandler.scroll(e.params.direction, e.params.pixels);
              return t.success ? {
                status: "success",
                action: e,
                command_executed: e,
                result: {
                  scrolled: e.params.direction
                }
              } : {
                status: "failure",
                action: e,
                command_executed: e,
                error_message: t.error || "Unknown error scrolling"
              }
            } catch (t) {
              return {
                status: "failure",
                action: e,
                command_executed: e,
                error_message: `Failed to scroll: ${t.message}`
              }
            }
          case "wait":
            try {
              return await this.messageHandler.wait(e.params.seconds), {
                status: "success",
                action: e,
                command_executed: e,
                result: {
                  waited: e.params.seconds
                }
              }
            } catch (t) {
              return {
                status: "failure",
                action: e,
                command_executed: e,
                error_message: `Failed to wait: ${t.message}`
              }
            }
          case "extract_text":
            try {
              const r = await this.messageHandler.extractText(e.params.element_number, e.params.data_name);
              if (!r.success) return {
                status: "failure",
                action: e,
                command_executed: e,
                error_message: r.error || "Unknown error extracting text"
              };
              t && e.params.data_name && r.data?.extracted_text && t.addExtractedData(e.params.data_name, r.data.extracted_text);
              return {
                status: "success",
                action: e,
                command_executed: e,
                element: e.params.element_number ? this._getElementDetails(e.params.element_number) : null,
                result: r.data
              }
            } catch (t) {
              return {
                status: "failure",
                action: e,
                command_executed: e,
                error_message: `Failed to extract text: ${t.message}`
              }
            }
          case "extract_content":
            if (r) {
              const t = this._lastDomData?.url || window.location.href;
              if (r.hasExtractedPage(t)) return {
                status: "failure",
                action: e,
                command_executed: e,
                error_message: "Content has already been extracted from this page. Please navigate to a different page or use the existing extracted content."
              }
            }
            try {
              const i = await this.messageHandler.extractContent(e.params.goal);
              if (!i.success) return {
                status: "failure",
                action: e,
                command_executed: e,
                error_message: i.error || "Unknown error extracting content"
              };
              if (t && e.params.data_name && i.data?.extracted_content && t.addExtractedData(e.params.data_name, i.data.extracted_content), r && e.params.file_name && e.params.file_description) {
                const t = `file_${Date.now()}`,
                  n = this._lastDomData?.url || window.location.href;
                let s = "json";
                const a = i.data.extracted_content;
                if (e.params.format && ["json", "csv", "text"].includes(e.params.format.toLowerCase())) s = e.params.format.toLowerCase();
                else if ("object" == typeof a && null !== a && a.format)["json", "csv", "txt", "text"].includes(a.format.toLowerCase()) && (s = "txt" === a.format.toLowerCase() ? "text" : a.format.toLowerCase());
                else if ("string" == typeof a)
                  if (a.includes("\n") && a.includes(",")) {
                    const e = a.split("\n").filter((e => e.trim())),
                      t = e.map((e => (e.match(/,/g) || []).length)),
                      r = Math.max(...t.filter((e => e > 0)));
                    s = t.filter((e => e === r)).length > .7 * e.length ? "csv" : "text"
                  } else s = "text";
                else "object" == typeof a && (s = "json");
                await r.addExtractedFile(t, e.params.file_name, e.params.file_description, i.data.extracted_content, s, n), i.data.file_id = t
              }
              return {
                status: "success",
                action: e,
                command_executed: e,
                result: i.data
              }
            } catch (t) {
              return {
                status: "failure",
                action: e,
                command_executed: e,
                error_message: `Failed to extract content: ${t.message}`
              }
            }
          case "google_search":
            try {
              const t = await this.messageHandler.googleSearch(e.params.query);
              return t.success ? {
                status: "success",
                action: e,
                command_executed: e,
                result: t.data
              } : {
                status: "failure",
                action: e,
                command_executed: e,
                error_message: t.error || "Unknown error performing Google search"
              }
            } catch (t) {
              return {
                status: "failure",
                action: e,
                command_executed: e,
                error_message: `Failed to perform Google search: ${t.message}`
              }
            }
          case "execute_javascript":
            try {
              const t = await this.messageHandler.executeJavaScript(e.params.code);
              return t.success ? {
                status: "success",
                action: e,
                command_executed: e,
                result: {
                  executed: !0,
                  return_value: t.result
                }
              } : {
                status: "failure",
                action: e,
                command_executed: e,
                error_message: t.error || "Unknown error executing JavaScript"
              }
            } catch (t) {
              return {
                status: "failure",
                action: e,
                command_executed: e,
                error_message: `Failed to execute JavaScript: ${t.message}`
              }
            }
          case "go_back":
            try {
              const t = await this.messageHandler.goBack();
              return t.success ? {
                status: "success",
                action: e,
                command_executed: e,
                result: {
                  message: "Successfully navigated back in history"
                }
              } : {
                status: "failure",
                action: e,
                command_executed: e,
                error_message: t.error || "Unknown error navigating back"
              }
            } catch (t) {
              return {
                status: "failure",
                action: e,
                command_executed: e,
                error_message: `Failed to navigate back: ${t.message}`
              }
            }
          case "go_forward":
            try {
              const t = await this.messageHandler.goForward();
              return t.success ? {
                status: "success",
                action: e,
                command_executed: e,
                result: {
                  message: "Successfully navigated forward in history"
                }
              } : {
                status: "failure",
                action: e,
                command_executed: e,
                error_message: t.error || "Unknown error navigating forward"
              }
            } catch (t) {
              return {
                status: "failure",
                action: e,
                command_executed: e,
                error_message: `Failed to navigate forward: ${t.message}`
              }
            }
          case "save_to_file":
            if (!t) return {
              status: "failure",
              action: e,
              command_executed: e,
              error_message: "Memory required for save_to_file action"
            };
            return t.getExtractedData(e.params.data_name) ? {
              status: "success",
              action: e,
              command_executed: e,
              result: {
                saved_to: e.params.filename
              }
            } : {
              status: "failure",
              action: e,
              command_executed: e,
              error_message: `Data '${e.params.data_name}' not found in memory`
            };
          case "generate_report":
            if (!r) return {
              status: "failure",
              action: e,
              command_executed: e,
              error_message: "Executor required for generate_report action"
            };
            try {
              const t = await r.getAllExtractedFiles();
              if (0 === Object.keys(t).length) return {
                status: "failure",
                action: e,
                command_executed: e,
                error_message: "No extracted files found to generate report"
              };
              let i = e.params.format || "text";
              const n = e.params.goal || "Summarize all extracted content";
              if (!e.params.format) {
                const e = {
                  json: 0,
                  csv: 0,
                  text: 0
                };
                Object.values(t).forEach((t => {
                  "json" === t.format ? e.json++ : "csv" === t.format ? e.csv++ : "text" === t.format && e.text++
                })), i = e.csv > e.json && e.csv > e.text || e.json > e.text && n.toLowerCase().includes("data") || n.toLowerCase().includes("extract") || n.toLowerCase().includes("list") ? "csv" : "text"
              }
              const s = await Promise.resolve().then(a.bind(a, 191)).then((e => e.llmService));
              let o = `Generate a ${"csv"===i?"CSV":"text"} report based on the following extracted content.\n\n`;
              o += `Goal: ${n}\n\n`, o += "Extracted files:\n", Object.entries(t).forEach((([e, t]) => {
                o += `\n--- File: ${t.name} (${t.format.toUpperCase()} format) ---\n`, o += `Description: ${t.description}\n`, o += `Content: ${"object"==typeof t.content?JSON.stringify(t.content):t.content}\n`
              })), o += `\n\nPlease generate a comprehensive ${"csv"===i?"CSV":"text"} report that addresses the goal.`;
              const c = await s.generateResponse(o, {
                  temperature: .7
                }),
                l = `report_${Date.now()}`,
                d = e.params.report_name || `Report - ${(new Date).toLocaleString()}`,
                u = e.params.report_description || `Generated report: ${n}`;
              return await r.addExtractedFile(l, d, u, c.text, "csv" === i ? "csv" : "text"), {
                status: "success",
                action: e,
                command_executed: e,
                result: {
                  report_id: l,
                  report_name: d,
                  report_content: c.text,
                  format: i
                }
              }
            } catch (t) {
              return {
                status: "failure",
                action: e,
                command_executed: e,
                error_message: `Failed to generate report: ${t.message}`
              }
            }
          default:
            return {
              status: "failure", action: e, command_executed: e, error_message: `Unsupported action: ${e.command}`
            }
          }
        } catch (t) {
          return {
            status: "failure",
            action: e,
            command_executed: e,
            error_message: t.message
          }
        }
      }
      _getElementDetails(e) {
        if (!this._lastDomData || !Array.isArray(this._lastDomData.elements)) return null;
        const t = this._lastDomData.elements.find((t => t && t.elementNumber === e));
        return t ? {
          element_number: t.elementNumber,
          tag: (t.tagName || "DIV").toUpperCase(),
          type: t.attributes?.type || null,
          textContent: t.text || "",
          ariaLabel: t.attributes?.["aria-label"] || null,
          boundingBox: t.coords ? {
            top: t.coords.y || 0,
            left: t.coords.x || 0,
            width: t.coords.width || 0,
            height: t.coords.height || 0
          } : void 0
        } : null
      }
      convertToBrowserState(e) {
        if (!e || !Array.isArray(e.elements)) return {
          current_url: e?.url || "unknown",
          simplified_dom_tree: [],
          screenshot_description: "Error processing DOM data"
        };
        try {
          const t = e.elements.map(((e, t) => e ? {
              element_number: e.elementNumber ?? t,
              tag: (e.tagName || "DIV").toUpperCase(),
              type: e.attributes?.type || null,
              textContent: e.text || "",
              ariaLabel: e.attributes?.["aria-label"] || null,
              boundingBox: e.coords ? {
                top: e.coords.y || 0,
                left: e.coords.x || 0,
                width: e.coords.width || 0,
                height: e.coords.height || 0
              } : void 0
            } : null)).filter(Boolean),
            r = e.title || "",
            i = e.scrollPosition ? {
              scrollY: e.scrollPosition.scrollY,
              scrollHeight: e.scrollPosition.scrollHeight,
              clientHeight: e.scrollPosition.clientHeight,
              atTop: e.scrollPosition.atTop,
              atBottom: e.scrollPosition.atBottom,
              percentScrolled: e.scrollPosition.percentScrolled
            } : void 0,
            pageText = e.pageText || "";
          let n = "";
          return i && (n = i.atTop ? " (page is at the top)" : i.atBottom ? " (page is at the bottom)" : ` (page is scrolled ${i.percentScrolled}% down)`), {
            current_url: e.url || "unknown",
            page_title: r,
            page_text_content: pageText,
            simplified_dom_tree: t,
            scroll_position: i,
            screenshot_description: `Page at ${e.url||"unknown"} titled "${r}" with ${t.length} interactive elements visible${n}`
          }
        } catch (t) {
          return {
            current_url: e?.url || "unknown",
            simplified_dom_tree: [],
            screenshot_description: "Error processing DOM elements",
            scroll_position: void 0
          }
        }
      }
    }
    var Js;
    ! function (e) {
      e.PENDING = "pending", e.IN_PROGRESS = "in_progress", e.COMPLETED = "completed", e.FAILED = "failed"
    }(Js || (Js = {}));
    class Qs {
      constructor(e, t) {
        this.executedSubtaskRecords = [], this.userGoal = e, this.milestones = [], this.actionHistory = [], this.extractedData = {}, this.clarificationRequested = !1, this.maxHistoryPerMilestone = t?.maxHistoryPerMilestone || 20, this.maxTotalHistory = t?.maxTotalHistory || 100, this.milestoneCounter = 0
      }
      getUserGoal() {
        return this.userGoal
      }
      setUserGoal(e) {
        this.userGoal = e
      }
      isClarificationRequested() {
        return this.clarificationRequested
      }
      addMilestone(e) {
        const t = this.milestoneCounter++,
          r = {
            id: t,
            description: e,
            status: Js.PENDING,
            actions: [],
            executed_actions_results: [],
            final_result: null,
            retryCount: 0,
            createdAt: new Date,
            priority: this.milestones.length
          };
        return this.milestones.push(r), t
      }
      setMilestoneActions(e, t, r = !0) {
        const i = this.milestones.find((t => t.id === e));
        i && (i.actions = t, r && (i.executed_actions_results = []), i.status === Js.FAILED && (i.status = Js.PENDING, i.final_result = null, i.retryCount++))
      }
      getNextExecutableMilestone() {
        let e = this.milestones.find((e => e.status === Js.IN_PROGRESS));
        if (e) return e;
        const t = this.milestones.filter((e => e.status === Js.PENDING && e.actions && e.actions.length > 0)).sort(((e, t) => e.priority - t.priority));
        if (t.length > 0) {
          const e = t[0];
          return e.status = Js.IN_PROGRESS, e.startTime = new Date, e
        }
        return this.milestones.filter((e => e.status === Js.PENDING && (!e.actions || 0 === e.actions.length))).length > 0 || this.milestones.length, null
      }
      recordActionExecution(e, t, r, i = null) {
        const n = new Date,
          s = {
            action: t,
            status: r,
            result: i,
            milestone_id: e,
            timestamp: n.toISOString()
          };
        this.actionHistory.push(s), this.actionHistory.length > this.maxTotalHistory && this.actionHistory.shift();
        const a = this.milestones.find((t => t.id === e));
        a && (a.executed_actions_results.push({
          action: t,
          status: r,
          result: i
        }), a.executed_actions_results.length > this.maxHistoryPerMilestone && a.executed_actions_results.shift())
      }
      updateMilestoneStatus(e, t, r = null, i) {
        let n = this.milestones.find((t => t.id === e));
        if (n) n.status = t, n.final_result = r, t !== Js.COMPLETED && t !== Js.FAILED || (n.endTime = new Date);
        else {
          n = {
            id: e,
            description: i || `Auto-created milestone ${e}`,
            status: t,
            actions: [],
            executed_actions_results: [],
            final_result: r,
            retryCount: 0,
            createdAt: new Date,
            priority: this.milestones.length
          }, this.milestones.push(n), this.milestoneCounter <= e && (this.milestoneCounter = e + 1)
        }
      }
      addExtractedData(e, t) {
        this.extractedData[e] = t
      }
      getExtractedData(e) {
        return this.extractedData[e]
      }
      markClarificationRequested() {
        this.clarificationRequested = !0
      }
      getContextForPlanner() {
        const e = {
          user_goal: this.userGoal,
          clarification_requested: this.clarificationRequested,
          milestones: this.milestones.map((e => {
            let t = e.final_result;
            if (t && "object" == typeof t) {
              const {
                screenshot: e,
                final_screenshot: r,
                _screenshot: i,
                image: n,
                image_data: s,
                ...a
              } = t;
              t = a
            }
            return {
              id: e.id,
              description: e.description,
              status: e.status,
              final_result: t,
              retry_count: e.retryCount
            }
          })),
          action_history: this.actionHistory.slice(-10).map((e => {
            let t = e.result;
            if (t && "object" == typeof t) {
              const {
                screenshot: e,
                final_screenshot: r,
                _screenshot: i,
                image: n,
                image_data: s,
                ...a
              } = t;
              t = a
            } else "string" == typeof t && t.length > 1e3 && (t = "Large result data (possibly screenshot) omitted");
            return {
              ...e,
              result: t
            }
          })),
          detailed_action_history: this.executedSubtaskRecords.flatMap((e => e.actions.map((t => {
            const {
              result: r,
              ...i
            } = t, n = "string" == typeof r && r.length > 1e3 ? "Large result data (possibly screenshot) omitted" : r;
            return {
              subtask_id: e.subtaskId,
              subtask_description: e.description,
              ...i,
              result: n
            }
          })))).slice(-20),
          extracted_data_keys: Object.keys(this.extractedData),
          subtask_execution_details: this.executedSubtaskRecords.filter((e => e.status === Js.COMPLETED || e.status === Js.FAILED)).map((e => {
            let t = e.outcome.extracted_data;
            if (t && "object" == typeof t) {
              const {
                screenshot: e,
                final_screenshot: r,
                _screenshot: i,
                image: n,
                image_data: s,
                ...a
              } = t;
              t = a
            }
            return {
              id: e.subtaskId,
              description: e.description,
              status: e.status === Js.COMPLETED ? "success" : "failure",
              actions_count: e.actions.length,
              actions_summary: e.actions.map((e => e.details)).join("; "),
              outcome: e.outcome.summary,
              extracted_data: t
            }
          }))
        };
        try {
          return JSON.stringify(e, null, 2)
        } catch (e) {
          return JSON.stringify({
            user_goal: this.userGoal,
            error: "Could not serialize full context"
          })
        }
      }
      getSummary() {
        let e = `Goal: ${this.userGoal}\n\nProgress:\n`;
        return this.milestones && 0 !== this.milestones.length ? this.milestones.forEach((t => {
          if (e += `- Milestone ${t.id}: ${t.description} - Status: ${t.status}`, t.final_result) {
            const r = "object" == typeof t.final_result ? JSON.stringify(t.final_result) : String(t.final_result);
            e += ` (Result: ${r.substring(0,100)}${r.length>100?"...":""})`
          }
          e += "\n"
        })) : e += "- No milestones planned yet.\n", Object.keys(this.extractedData).length > 0 && (e += "\nExtracted Data Keys:\n", Object.keys(this.extractedData).forEach((t => {
          e += `- ${t}\n`
        }))), e
      }
      exportState() {
        return {
          userGoal: this.userGoal,
          milestones: this.milestones,
          actionHistory: this.actionHistory,
          extractedData: this.extractedData,
          clarificationRequested: this.clarificationRequested,
          milestoneCounter: this.milestoneCounter,
          executedSubtaskRecords: this.executedSubtaskRecords
        }
      }
      importState(e) {
        this.userGoal = e.userGoal, this.milestones = e.milestones, this.actionHistory = e.actionHistory, this.extractedData = e.extractedData, this.clarificationRequested = e.clarificationRequested, this.milestoneCounter = e.milestoneCounter, this.executedSubtaskRecords = e.executedSubtaskRecords
      }
      startSubtaskExecutionRecord(e) {
        const t = this.milestones.find((t => t.id === e));
        if (!t) return;
        const r = this.executedSubtaskRecords.findIndex((t => t.subtaskId === e));
        if (r >= 0) return this.executedSubtaskRecords[r].status = Js.IN_PROGRESS, this.executedSubtaskRecords[r].startTime = (new Date).toISOString(), void(this.executedSubtaskRecords[r].endTime = void 0);
        const i = {
          subtaskId: e,
          description: t.description,
          status: Js.IN_PROGRESS,
          startTime: (new Date).toISOString(),
          actions: [],
          outcome: {
            status: "success",
            summary: "In progress"
          }
        };
        this.executedSubtaskRecords.push(i)
      }
      recordDetailedAction(e, t, r, i) {
        const n = this.executedSubtaskRecords.findIndex((t => t.subtaskId === e));
        if (n < 0) return this.startSubtaskExecutionRecord(e), this.recordDetailedAction(e, t, r, i);
        let s = "";
        switch (t.command) {
        case "navigate":
          s = `Navigated to URL: ${t.params.url}`;
          break;
        case "click":
          s = `Clicked element ${t.params.element_number}`;
          break;
        case "type":
          s = `Typed "${t.params.text}" into element ${t.params.element_number}`;
          break;
        case "keypress":
          s = `Pressed key "${t.params.key}"${void 0!==t.params.element_number?` on element ${t.params.element_number}`:""}`;
          break;
        case "scroll":
          s = `Scrolled ${t.params.direction}`;
          break;
        case "wait":
          s = `Waited for ${t.params.seconds} seconds`;
          break;
        default:
          s = `Executed ${t.command} command`
        }
        let a = "";
        try {
          null == i ? a = "No result data" : "object" == typeof i ? i.error ? a = `Error: ${i.error}` : i.text ? a = `Text: ${i.text}` : i.elements ? a = `Found ${i.elements.length} elements` : (a = JSON.stringify(i).substring(0, 150), JSON.stringify(i).length > 150 && (a += "...")) : (a = String(i).substring(0, 150), String(i).length > 150 && (a += "..."))
        } catch (e) {
          a = "Error formatting result"
        }
        this.executedSubtaskRecords[n].actions.push({
          command: t.command,
          details: s,
          status: r,
          result: a,
          timestamp: (new Date).toISOString()
        })
      }
      completeSubtaskExecutionRecord(e, t, r = null) {
        let i = "";
        try {
          r && "object" == typeof r ? i = JSON.stringify(r) : r && (i = String(r))
        } catch (e) {
          i = "Error formatting result"
        }
        const n = this.executedSubtaskRecords.findIndex((t => t.subtaskId === e));
        if (n < 0) return;
        this.executedSubtaskRecords[n].status = "success" === t ? Js.COMPLETED : Js.FAILED, this.executedSubtaskRecords[n].endTime = (new Date).toISOString();
        let s, a = "";
        if ("success" === t) {
          a = `Successfully completed subtask after ${this.executedSubtaskRecords[n].actions.length} actions`, r && "object" == typeof r && (r.results ? s = r.results : r.data && (s = r.data))
        } else a = r && r.error ? `Failed: ${r.error}` : "Failed to complete subtask";
        this.executedSubtaskRecords[n].outcome = {
          status: t,
          summary: a,
          extracted_data: s
        }
      }
    }
    class Ys {
      constructor(e, t, r, i) {
        this.memory = null, this.isRunning = !1, this.maxPlannerTurns = 50, this.maxExecutorTurnsPerSubtask = 50, this.cancelRequested = !1, this.planner = e, this.executor = t, this.engine = r, i && (this.maxPlannerTurns = i.maxPlannerTurns ?? this.maxPlannerTurns, this.maxExecutorTurnsPerSubtask = i.maxExecutorTurnsPerSubtask ?? this.maxExecutorTurnsPerSubtask, this.onStatusUpdate = i.onStatusUpdate, this.onTaskComplete = i.onTaskComplete, this.onClarificationNeeded = i.onClarificationNeeded)
      }
      isRunningTask() {
        return this.isRunning
      }
      stopTask() {
        this.isRunning && (this.cancelRequested = !0, this._reportStatus("Stopping task..."))
      }
      _reportStatus(e) {
        e.replace(/<[^>]*>/g, "");
        this.onStatusUpdate?.(e)
      }
      formatActionDescription(e) {
        if (!e || !e.command) return "Unknown action";
        let t = `Executed ${e.command}`;
        const r = e.params?.element_number,
          i = e.params?.text,
          n = e.params?.url,
          s = e.params?.direction,
          a = e.params?.key;
        if ("click" === e.command) t = "Clicked";
        else if ("type" === e.command) {
          t = `Typed "${i?i.length>20?i.substring(0,20)+"...":i:""}"`
        } else "navigate" === e.command ? t = `Navigated to ${n||"page"}` : "scroll" === e.command ? t = `Scrolled ${s||"down"}` : "extract" === e.command ? t = "Extracted data from " + (void 0 !== r ? "element" : "page") : "keypress" === e.command ? t = `Pressed key ${a||""}` : "finish" === e.command ? t = `Task finished: ${e.params?.summary||"Completed"}` : "fail" === e.command && (t = `Task failed: ${e.params?.reason||"Unknown reason"}`);
        return t
      }
      async generateInitialPlan(e) {
        try {
          // Create temporary memory for plan generation
          const tempMemory = new Qs(e);
          const context = tempMemory.getContextForPlanner();
          
          // Get initial plan from planner
          const plannerResponse = await this.planner.getNextSubtask(e, context, null, null);
          
          // Extract the plan from the response
          if (plannerResponse && plannerResponse.context_to_pass && plannerResponse.context_to_pass.complete_plan) {
            return plannerResponse.context_to_pass.complete_plan;
          } else if (plannerResponse && plannerResponse.decision === "next_subtask" && plannerResponse.subtask_description) {
            // Fallback: create a single-step plan if complete_plan is not available
            return [{
              step: 1,
              description: plannerResponse.subtask_description
            }];
          } else if (plannerResponse && plannerResponse.decision === "request_clarification") {
            throw new Error(`Need clarification: ${plannerResponse.question}`);
          } else {
            throw new Error("Could not generate plan from planner response");
          }
        } catch (error) {
          console.error("[Agent] Failed to generate initial plan:", error);
          throw error;
        }
      }
      async startTask(e) {
        this.isRunning, this.isRunning = !0, this.cancelRequested = !1, this._reportStatus("Preparing browser environment..."), this.memory = new Qs(e);
        let t = 0,
          r = !1,
          i = "Task aborted unexpectedly.",
          n = null;
        const s = e;
        
        // Only redirect from restricted URLs, stay on current page otherwise
        try {
          const currentTab = await chrome.tabs.query({ active: !0, currentWindow: !0 });
          if (currentTab && currentTab[0]) {
            const tab = currentTab[0];
            const restrictedPrefixes = ["chrome://", "chrome-extension://", "edge://", "about:", "view-source:", "data:", "javascript:", "file://", "https://chromewebstore.google.com/", "https://chrome.google.com/webstore/", "https://microsoftedge.microsoft.com/addons/"];
            const isRestricted = !tab.url || restrictedPrefixes.some(prefix => tab.url.startsWith(prefix));
            
            // Only navigate to Google if on a restricted page
            if (isRestricted) {
              this._reportStatus("Navigating to safe page...");
              await chrome.tabs.update(tab.id, { url: "https://www.google.com" });
              
              // Wait for navigation to complete
              await new Promise((resolve) => {
                const listener = (tabId, changeInfo) => {
                  if (tabId === tab.id && changeInfo.status === "complete") {
                    chrome.tabs.onUpdated.removeListener(listener);
                    resolve();
                  }
                };
                chrome.tabs.onUpdated.addListener(listener);
                
                // Timeout after 5 seconds
                setTimeout(() => {
                  chrome.tabs.onUpdated.removeListener(listener);
                  resolve();
                }, 5000);
              });
            }
          }
        } catch (navError) {
          console.log("[Agent] Navigation check failed, continuing anyway:", navError);
        }
        
        this._reportStatus(`Starting task: ${e}`);
        try {
          for (; t < this.maxPlannerTurns;) {
            if (this.cancelRequested) {
              i = "Task cancelled by user.", r = !0;
              break
            }
            t++, this._reportStatus(`Planning next step (${t}/${this.maxPlannerTurns})...`);
            const {
              browserState: e
            } = await this.engine.getDomStateAndRefs();
            let a = null;
            try {
              const e = this.engine.getMessageHandler();
              e && (a = await e.captureScreenshot())
            } catch (e) {}
            const o = this.memory.getContextForPlanner(),
              c = await this.planner.getNextSubtask(this.memory.getUserGoal(), o, n, a);
            switch (n = null, c.decision) {
            case "request_clarification":
              if (this.memory.isClarificationRequested()) {
                r = !0, i = "Planning error: Tried to ask for clarification more than once.";
                break
              }
              if (this.memory.markClarificationRequested(), this.onClarificationNeeded) {
                this._reportStatus(`Waiting for user clarification: ${c.question}`);
                try {
                  const e = await this.onClarificationNeeded(c.question);
                  if (null !== e && "" !== e.trim()) {
                    this.memory.setUserGoal(`${s}\\n\\nUser Clarification: ${e}`), t--;
                    continue
                  }
                  i = "Task stopped: User clarification required but not provided.", r = !0
                } catch (e) {
                  i = "Task failed during user clarification process.", r = !0
                }
              } else i = "Task stopped: Clarification needed, but no handler provided.", r = !0;
              break;
            case "next_subtask": {
              if (this.cancelRequested) {
                i = "Task cancelled by user.", r = !0;
                break
              }
              let e;
              const t = c.subtask_id,
                s = c.subtask_description || "Unnamed Subtask",
                a = c.context_to_pass || {},
                o = void 0 !== t ? this.memory.exportState().milestones.find((e => e.id === t)) : void 0;
              o ? (e = o.id, s && o.description !== s && (o.description = s, o.status !== Js.COMPLETED && o.status !== Js.FAILED && this.memory.updateMilestoneStatus(e, Js.PENDING, null, s))) : void 0 !== t ? (e = t, this.memory.updateMilestoneStatus(e, Js.PENDING, null, s)) : e = this.memory.addMilestone(s);
              const l = new Date;
              a._system = {
                ...a._system,
                dateTime: {
                  currentDate: l.toLocaleDateString(),
                  currentTime: l.toLocaleTimeString(),
                  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                  isoDate: l.toISOString()
                },
                extractedFiles: this.memory?.exportState().extractedData?.files || []
              }, this._reportStatus(`Executing: ${s}`), this.executor.assignSubtask(s, a), this.memory.updateMilestoneStatus(e, Js.IN_PROGRESS, null, s);
              let d = 0,
                u = !1,
                h = null;
              for (; d < this.maxExecutorTurnsPerSubtask && !u;) {
                if (this.cancelRequested) {
                  i = "Task cancelled by user.", r = !0, h = {
                    status: "cancelled",
                    error: "User cancelled"
                  }, this.memory.updateMilestoneStatus(e, Js.FAILED, h, s), u = !0;
                  break
                }
                d++;
                let {
                  browserState: t,
                  domData: n,
                  elementRefs: a
                } = await this.engine.getDomStateAndRefs();
                const o = this.memory.exportState().milestones.find((t => t.id === e)),
                  c = o?.executed_actions_results || [],
                  l = this.engine.getMessageHandler();
                try {
                  await new Promise((e => setTimeout(e, 1e3)));
                  const t = await l.prepareInteraction(n);
                  if (!t.success) {
                    h = {
                      status: "failure",
                      error: `Failed to prepare interaction: ${t.error}`
                    }, this.memory.updateMilestoneStatus(e, Js.FAILED, h, s), u = !0;
                    continue
                  }
                } catch (t) {
                  h = {
                    status: "failure",
                    error: `Preparation error: ${t.message}`
                  }, this.memory.updateMilestoneStatus(e, Js.FAILED, h, s), u = !0;
                  continue
                }
                let p, m = null;
                try {
                  m = await l.captureScreenshot()
                } catch (e) {}
                try {
                  if (p = await this.executor.getNextAction(t, {
                      actionHistory: c,
                      image_data: m
                    }), "subtask_complete" === p.decision) {
                    h = {
                      status: "success",
                      result_data: p.result_data || {},
                      executor_summary: p.summary || `Successfully completed subtask ${e}.`
                    }, this.memory.updateMilestoneStatus(e, Js.COMPLETED, h, s), u = !0;
                    continue
                  }
                  if ("subtask_failed" === p.decision) {
                    h = {
                      status: "failure",
                      error: p.error_message || "Executor reported failure without specific error.",
                      executor_summary: p.summary || `Failed to complete subtask ${e}: ${p.error_message}`
                    }, this.memory.updateMilestoneStatus(e, Js.FAILED, h, s), u = !0;
                    continue
                  }
                  if ("next_action" === p.decision && p.action) {
                    if (!this.engine.getMessageHandler()) throw new Error("Cannot prepare interaction: Message handler is not available.");
                    const t = p.action,
                      r = this.formatActionDescription(t);
                    this._reportStatus(r);
                    const i = await this.engine.executeAction(t, this.memory, this.executor);
                    this.memory.recordDetailedAction(e, t, i.status, i), this.executor.recordActionOutcome(t, i, void 0, p.short_term_notes, p.long_term_memory, p.progress_counters);
                    const n = this.formatActionDescription(i.command_executed || t),
                      a = this.executor.getSanitizedBrain(),
                      o = a.actions.map(((e, t) => {
                        const r = e.action?.params?.element_number;
                        return {
                          id: t + 1,
                          description: this.formatActionDescription(e.action),
                          timestamp: e.timestamp ? new Date(e.timestamp) : new Date,
                          element_number: r
                        }
                      }));
                    "undefined" != typeof chrome && chrome.runtime && chrome.runtime.sendMessage && chrome.runtime.sendMessage({
                      type: "executor:response",
                      content: n,
                      actions: o,
                      subtaskId: e,
                      screenshot: m,
                      brain: a
                    }, (e => {
                      chrome.runtime.lastError
                    })), "failure" === i.status && (h = {
                      status: "failure",
                      error: i.error_message || "Action failed without specific error."
                    }, this.memory.updateMilestoneStatus(e, Js.FAILED, h, s), u = !0)
                  } else h = {
                    status: "failure",
                    error: `Invalid executor decision: ${p.decision}`
                  }, this.memory.updateMilestoneStatus(e, Js.FAILED, h, s), u = !0
                } catch (t) {
                  h = {
                    status: "failure",
                    error: `Executor turn error: ${t.message||String(t)}`
                  }, this.memory.updateMilestoneStatus(e, Js.FAILED, h, s), u = !0
                }
              }
              r || (!u && d >= this.maxExecutorTurnsPerSubtask ? (h = {
                status: "failure",
                error: "Execution turn limit reached"
              }, this.memory.updateMilestoneStatus(e, Js.FAILED, h, s)) : h || (h = {
                status: "failure",
                error: "Subtask ended with unknown status"
              }, this.memory.updateMilestoneStatus(e, Js.FAILED, h, s)));
              const p = this.memory.exportState().milestones.find((t => t.id === e)),
                m = p?.executed_actions_results || [],
                f = m.map((e => `Cmd: ${e.action?.command||"unknown_command"}, Params: ${JSON.stringify(e.action?.params||{})}, Status: ${e.status}, Result: ${e.result?.result_data?JSON.stringify(e.result.result_data):e.result?.error_message||""}`)).join("\n");
              n = {
                status: h?.status || "unknown",
                subtask_id: e,
                subtask_description: s,
                action_count: m.length,
                summary: h?.executor_summary || `Executed ${m.length} actions. Final status: ${h?.status||"unknown"}.`,
                action_summary: f,
                result_data: h?.result_data || {},
                error: h?.error || null
              }, "failure" === n.status || n.status;
              break
            }
            case "task_complete":
              i = c.summary || "Task completed successfully.", r = !1;
              break;
            case "task_failed":
              i = c.summary || `Task failed: ${c.error||"Planner indicated failure."}`, r = !0;
              break;
            default:
              i = `Task aborted due to unknown planner decision: ${JSON.stringify(c)}`, r = !0;
              break
            }
            if (r || "task_complete" === c.decision || "task_failed" === c.decision) break
          }!r && "Task aborted unexpectedly." === i && t >= this.maxPlannerTurns && (i = "Task stopped: Maximum planning interaction limit reached.", r = !0)
        } catch (e) {
          i = `Task failed with unexpected error: ${e.message||String(e)}`, r = !0, e.stack
        } finally {
          if (this.isRunning = !1, this.cancelRequested = !1, this._reportStatus(r ? `Task Failed: ${i}` : `Task Complete: ${i}`), this.onTaskComplete) try {
            this.onTaskComplete(i, !r)
          } catch (e) {}
          this.memory = null
        }
      }
    }
    let Zs = null,
      ea = null,
      promptTemplates = new Gs();
    async function ta() {
      try {
        ea && (await ea.cleanup(), ea = null), ea = new Vs;
        const r = promptTemplates;
        await e.llmService.initFromSettings();
        const i = new t(e.llmService, r),
          s = new n(e.llmService, r),
          a = new Xs;
        Zs = new Ys(i, s, a, {
          maxPlannerTurns: 50,
          maxExecutorTurnsPerSubtask: 50,
          onStatusUpdate: e => {
            Zs && Zs.isRunningTask() && chrome.runtime.sendMessage({
              type: "status:update",
              status: e
            })
          },
          onTaskComplete: (e, t) => {
            chrome.runtime.sendMessage({
              type: "task:complete",
              summary: e,
              success: t
            }), ea && ea.completeTask().catch((e => {}))
          },
          onClarificationNeeded: async e => new Promise((t => {
            chrome.runtime.sendMessage({
              type: "request:clarification",
              question: e
            });
            const r = e => {
              "provide:clarification" === e.type && (chrome.runtime.onMessage.removeListener(r), t(e.clarification))
            };
            chrome.runtime.onMessage.addListener(r)
          }))
        })
      } catch (e) {}
    }
    async function ra() {
      if (Zs && Zs.isRunningTask() && Zs.stopTask(), ea) {
        try {
          await ea.cleanup()
        } catch (e) {}
        ea = null
      }
      try {
        const e = await chrome.tabs.query({});
        for (const t of e)
          if (t.id) try {
            await chrome.debugger.detach({
              tabId: t.id
            })
          } catch (e) {
            e instanceof Error && e.message.includes("Debugger is not attached")
          }
      } catch (e) {}
      Zs = null
    }
    chrome.runtime.onMessage.addListener(((t, r, i) => {
      const n = t.type || t.action;
      
      // Handle plan generation request
      if ("generate:plan" === n || "generate_plan" === n) {
        console.log("[Background] Received generate:plan request:", t.request);
        
        // Use async IIFE to handle async operations
        (async () => {
          try {
            if (!Zs) {
              await ta();
            }
            
            if (Zs) {
              const plan = await Zs.generateInitialPlan(t.request);
              console.log("[Background] Plan generated successfully:", plan);
              i({ success: true, plan: plan });
            } else {
              i({ success: false, error: "Agent not initialized" });
            }
          } catch (e) {
            console.error("[Background] Error generating plan:", e);
            i({ success: false, error: e instanceof Error ? e.message : String(e) });
          }
        })();
        
        return true; // Keep message channel open
      }
      
      // Handle plan approval and task start
      if ("approve:plan" === n || "approve_plan" === n) {
        console.log("[Background] Received approve:plan request:", t.request);
        
        // Use async IIFE to handle async operations
        (async () => {
          try {
            if (ea) {
              await ea.completeTask().catch(() => {});
            }
            
            if (!Zs) {
              await ta();
            }
            
            if (Zs) {
              Zs.startTask(t.request).catch((e) => {
                chrome.runtime.sendMessage({
                  type: "error",
                  error: e instanceof Error ? e.message : "Failed to start task"
                });
              });
              i({ success: true });
            } else {
              i({ success: false, error: "Agent not initialized" });
            }
          } catch (e) {
            console.error("[Background] Error in approve:plan:", e);
            i({ success: false, error: e instanceof Error ? e.message : String(e) });
          }
        })();
        
        return true; // Keep message channel open
      }
      
      if ("chat:message" === n) {
        (async () => {
          try {
            const messages = t.messages || [];
            const forceJson = t.forceJson || false;
            
            // Get the llmService (same as used by planner/executor)
            const llmService = await Promise.resolve().then(a.bind(a, 191)).then((e => e.llmService));
            
            // Build the prompt from messages
            let prompt = "";
            let systemPrompt = "";
            let imageData = null;
            
            for (const msg of messages) {
              if (msg.role === "system") {
                systemPrompt = msg.content;
              } else if (msg.role === "user") {
                if (typeof msg.content === "string") {
                  prompt += msg.content;
                } else if (Array.isArray(msg.content)) {
                  // Handle vision messages
                  for (const part of msg.content) {
                    if (part.type === "text") {
                      prompt += part.text;
                    } else if (part.type === "image_url") {
                      imageData = part.image_url.url;
                    }
                  }
                }
              }
            }
            
            // Build options
            const options = {
              system_prompt: systemPrompt,
              image_data: imageData,
              temperature: 0.3,
              max_tokens: 4000
            };
            
            // Add JSON mode if requested
            if (forceJson) {
              options.response_format = {
                type: "json_object"
              };
            }
            
            // Use the llmService's generateResponse method (same as planner)
            const response = await llmService.generateResponse(prompt, options);
            
            i({ success: true, content: response.text });
          } catch (e) {
            console.error("[Background] Error in chat:message:", e);
            i({ success: false, error: e instanceof Error ? e.message : String(e) });
          }
        })();
        
        return true; // Keep message channel open
      }
      
      if ("start:task" === n || "start_task" === n) {
        if (ea && ea.completeTask().catch((e => {})), !Zs) try {
          return ta().then((() => {
            Zs ? Zs.startTask(t.request).catch((e => {
              chrome.runtime.sendMessage({
                type: "error",
                error: e instanceof Error ? e.message : "Failed to start task"
              })
            })) : chrome.runtime.sendMessage({
              type: "error",
              error: "Please reload the extension and try again."
            })
          })).catch((e => {
            chrome.runtime.sendMessage({
              type: "error",
              error: "Please reload the extension and try again."
            })
          })), i({
            success: !0,
            reinitializing: !0
          }), !0
        } catch (e) {}
        return Zs ? (Zs.startTask(t.request).catch((e => {
          chrome.runtime.sendMessage({
            type: "error",
            error: e instanceof Error ? e.message : "Failed to start task"
          }), i({
            success: !1,
            error: e.message
          })
        })), i({
          success: !0
        })) : (ta().then((() => {
          Zs ? Zs.startTask(t.request).catch((e => {})) : chrome.runtime.sendMessage({
            type: "error",
            error: "Please reload the extension and try again."
          })
        })).catch((e => {
          chrome.runtime.sendMessage({
            type: "error",
            error: "Please reload the extension and try again."
          })
        })), i({
          success: !0
        })), !0
      }
      if ("stop:task" === n || "stop_task" === n) {
        if (Zs && Zs.isRunningTask()) Zs.stopTask(), i({
          success: !0
        }), chrome.runtime.sendMessage({
          type: "status:update",
          status: "Task stopping..."
        });
        else {
          i({
            success: !1,
            error: "No task running to stop"
          })
        }
        return !0
      }
      if ("provide:clarification" === n || "provide_clarification" === n) return i({
        success: !0,
        clarificationReceived: !0
      }), !0;
      if ("dom:extract" === n || "test_extract_dom" === n) {
        if (!ea) return i({
          success: !1,
          error: "Browser message handler not initialized"
        }), !0;
        const e = ea;
        return chrome.tabs.query({
          active: !0,
          currentWindow: !0
        }, (async t => {
          try {
            const t = await e.extractDOM();
            chrome.runtime.sendMessage({
              type: "test:dom:extract:result",
              success: t.success,
              data: t.data,
              error: t.error
            })
          } catch (e) {
            chrome.runtime.sendMessage({
              type: "test:dom:extract:result",
              success: !1,
              error: e instanceof Error ? e.message : "Unknown error during DOM extraction"
            })
          }
        })), i({
          success: !0
        }), !0
      }
      if ("dom:highlight" === n || "test_highlight_element" === n) {
        if (!ea) return i({
          success: !1,
          error: "Browser message handler not initialized"
        }), !0;
        const e = ea;
        return chrome.tabs.query({
          active: !0,
          currentWindow: !0
        }, (async t => {
          e.highlightElements().then((e => {
            chrome.runtime.sendMessage({
              type: "test:highlight:result",
              success: e.success,
              error: e.error
            })
          })).catch((e => {
            chrome.runtime.sendMessage({
              type: "test:highlight:result",
              success: !1,
              error: e.message
            })
          }))
        })), i({
          success: !0
        }), !0
      }
      if ("dom:highlight:remove" === n || "test_remove_highlights" === n) {
        if (!ea) return i({
          success: !1,
          error: "Browser message handler not initialized"
        }), !0;
        const e = ea;
        return chrome.tabs.query({
          active: !0,
          currentWindow: !0
        }, (async t => {
          e.removeHighlights().then((e => {
            chrome.runtime.sendMessage({
              type: "test:highlight:remove:result",
              success: e.success,
              error: e.error
            })
          })).catch((e => {
            chrome.runtime.sendMessage({
              type: "test:highlight:remove:result",
              success: !1,
              error: e.message
            })
          }))
        })), i({
          success: !0
        }), !0
      }
      if (n === s.API_SETTINGS_CHANGED) {
        const r = t.source || "unknown";
        t.timestamp && new Date(t.timestamp).toISOString();
        if ("provider_change" === r || "model_change" === r || "api_key_save" === r) return e.llmService.initFromSettings().then((() => {
          chrome.runtime.sendMessage({
            type: "llm:service:reinitialized",
            source: r,
            success: !0,
            timestamp: Date.now()
          }).catch((e => {}));
          try {
            i({
              success: !0
            })
          } catch (e) {}
        })).catch((e => {
          chrome.runtime.sendMessage({
            type: "llm:service:reinitialized",
            source: r,
            success: !1,
            error: e.message,
            timestamp: Date.now()
          }).catch((e => {}));
          try {
            i({
              success: !1,
              error: e.message
            })
          } catch (e) {}
        })), !0
      }
      if (n === 'GET_ALL_PROMPTS') {
        try {
          if (!promptTemplates) {
            promptTemplates = new Gs();
          }
          const keys = ["extract_content", "generate_report", "planner", "executor"];
          const current = {};
          const defaults = {};
          const defaultsInstance = new Gs();
          for (const k of keys) {
            try {
              current[k] = promptTemplates.getTemplate(k);
            } catch (err) {
              current[k] = "";
            }
            try {
              defaults[k] = defaultsInstance.getTemplate(k);
            } catch (err) {
              defaults[k] = "";
            }
          }
          i({ success: true, prompts: { current, defaults } });
        } catch (error) {
          i({ success: false, error: error.message });
        }
        return true;
      }
      if (n === 'SAVE_PROMPT') {
        try {
          if (!promptTemplates) {
            promptTemplates = new Gs();
          }
          // Use the PromptTemplates API to set a single template
          promptTemplates.setTemplate(t.agentName, t.content);
          i({ success: true, agentName: t.agentName });
        } catch (error) {
          i({ success: false, error: error.message });
        }
        return true;
      }
      if (n === 'RESET_PROMPT') {
        try {
          if (!promptTemplates) {
            promptTemplates = new Gs();
          }
          // Create a temporary default templates instance to read default value for one agent
          const defaultTemplatesInstance = new Gs();
          const defaultValue = defaultTemplatesInstance.getTemplate(t.agentName);
          promptTemplates.setTemplate(t.agentName, defaultValue);
          i({ success: true, agentName: t.agentName });
        } catch (error) {
          i({ success: false, error: error.message });
        }
        return true;
      }
      if (n === 'RESET_ALL_PROMPTS') {
        try {
          if (!promptTemplates) {
            promptTemplates = new Gs();
          }
          // Re-initialize all templates to defaults
          if (typeof promptTemplates.initializeDefaultTemplates === 'function') {
            promptTemplates.initializeDefaultTemplates();
          } else {
            // Fallback: instantiate a fresh defaults instance and copy values
            const defaults = new Gs();
            const keys = ["extract_content", "generate_report", "planner", "executor"];
            for (const k of keys) {
              promptTemplates.setTemplate(k, defaults.getTemplate(k));
            }
          }
          i({ success: true });
        } catch (error) {
          i({ success: false, error: error.message });
        }
        return true;
      }
      return !1
    })), ta(), chrome.runtime.onMessageExternal.addListener(((e, t, r) => (t.origin && (t.origin.includes("agent-os.com") || t.origin.includes("agent0s.dev") || t.origin.includes("localhost")) && "OPENROUTER_API_KEY" === e.type && (chrome.runtime.sendMessage(e), r({
      success: !0
    })), !0))), chrome.action.onClicked.addListener((e => {
      e.id && chrome.sidePanel && "function" == typeof chrome.sidePanel.open && chrome.sidePanel.open({
        windowId: e.windowId
      })
    })), chrome.runtime.onSuspend.addListener((async () => {
      await ra()
    })), chrome.runtime.onSuspend.addListener((() => {
      ra().catch((e => {}))
    })), chrome.runtime.onConnect.addListener((e => {
      "sidepanel" !== e.name && "popup" !== e.name || e.onDisconnect.addListener((() => {
        ra().catch((e => {}))
      }))
    })),
    
    // ===== PREMIUM & TRIAL SYSTEM =====
    // Initialize trial on first install
    chrome.runtime.onInstalled.addListener((async details => {
      console.log('[Premium] Extension installed/updated:', details.reason);
      
      if (details.reason === 'install') {
        try {
          // Initialize 3-day trial
          const TRIAL_DAYS = 3;
          const PAYMENT_URL = 'https://payments.alhudud.xyz/pay.php?checkout_id=4';
          const trialData = {
            installDate: Date.now(),
            trialEndDate: Date.now() + (TRIAL_DAYS * 24 * 60 * 60 * 1000),
            isPremium: false,
            hasRated: false,
            dailyTaskCount: 0,
            lastTaskReset: Date.now(),
            hasShownWelcome: false,
            hasShownPaymentPrompt: false,
            version: '1.0'
          };
          
          await chrome.storage.local.set({ premium_data: trialData });
          console.log('[Premium] Trial initialized:', trialData);
          
          // Sidepanel will automatically check and show welcome on next open
        } catch (error) {
          console.error('[Premium] Trial initialization error:', error);
        }
      }
    })),
    
    // ===== SERVICE WORKER KEEP-ALIVE =====
    // Keep background service worker alive in Manifest V3
    // Uses chrome.alarms to prevent unloading
    (() => {
      try {
        // Create a keep-alive alarm
        chrome.alarms.create('keep-alive', { periodInMinutes: 0.5 });
        
        chrome.alarms.onAlarm.addListener((alarm) => {
          if (alarm.name === 'keep-alive') {
            console.log('[SW] Keep-alive ping at', new Date().toISOString());
          }
        });
      } catch (e) {
        console.warn('[SW] Keep-alive setup failed:', e);
      }
    })(),
    
    // ===== SERVER ACTIVATION HANDLER =====
    // Handle activation requests from server
    chrome.runtime.onMessageExternal.addListener(((message, sender, sendResponse) => {
      // Validate origin - allow from your payment server
      const allowedOrigins = [
        'https://payments.alhudud.xyz',
        'https://agent0s.dev',
        'https://agent-os.com',
        'http://localhost:3000',
        'http://localhost:5000'
      ];
      
      const isAllowedOrigin = allowedOrigins.some(origin => 
        sender.url && sender.url.startsWith(origin)
      );
      
      if (message.type === 'premium:activate' && isAllowedOrigin) {
        console.log('[External] Received premium:activate from:', sender.url);
        console.log('[External] Target extension ID:', message.extensionId);
        
        // Verify this message is for our extension
        if (message.extensionId === chrome.runtime.id) {
          (async () => {
            try {
              const data = await chrome.storage.local.get(['premium_data']);
              
              if (data.premium_data) {
                data.premium_data.isPremium = true;
                data.premium_data.activationDate = Date.now();
                data.premium_data.activatedByServer = true;
                data.premium_data.serverActivationTime = new Date().toISOString();
                
                await chrome.storage.local.set({ premium_data: data.premium_data });
                
                // Verify the write
                const verify = await chrome.storage.local.get(['premium_data']);
                if (verify.premium_data?.isPremium) {
                  console.log('[External] Premium activated successfully!', {
                    activationDate: verify.premium_data.activationDate,
                    isPremium: verify.premium_data.isPremium
                  });
                  
                  // Notify all tabs
                  const tabs = await chrome.tabs.query({});
                  for (const tab of tabs) {
                    try {
                      chrome.tabs.sendMessage(tab.id, {
                        type: 'premium:activated',
                        success: true,
                        source: 'server',
                        timestamp: Date.now()
                      }).catch(() => {});
                    } catch (e) {}
                  }
                  
                  sendResponse({ 
                    success: true,
                    message: 'Premium activated successfully',
                    timestamp: Date.now()
                  });
                } else {
                  throw new Error('Verification failed');
                }
              } else {
                sendResponse({ 
                  success: false,
                  error: 'No premium data found' 
                });
              }
            } catch (error) {
              console.error('[External] Activation error:', error);
              sendResponse({ 
                success: false,
                error: error.message 
              });
            }
          })();
          
          return true; // Keep the response channel open for async response
        } else {
          console.warn('[External] Extension ID mismatch:', {
            received: message.extensionId,
            expected: chrome.runtime.id
          });
          sendResponse({ 
            success: false,
            error: 'Extension ID mismatch' 
          });
          return false;
        }
      }
      
      return false;
    })),
    
    // Handle premium-related messages
    chrome.runtime.onMessage.addListener(((message, sender, sendResponse) => {
      if (message.type === 'premium:check') {
        chrome.storage.local.get(['premium_data']).then(data => {
          if (!data.premium_data) {
            sendResponse({ status: 'new', isPremium: false });
            return;
          }
          
          const pd = data.premium_data;
          const now = Date.now();
          const expired = now > pd.trialEndDate;
          const daysLeft = Math.max(0, Math.ceil((pd.trialEndDate - now) / (24 * 60 * 60 * 1000)));
          
          sendResponse({
            status: pd.isPremium ? 'premium' : (expired ? 'expired' : 'trial'),
            daysLeft,
            isPremium: pd.isPremium,
            expired,
            needsPayment: expired && !pd.isPremium
          });
        });
        return true;
      }
      
      if (message.type === 'premium:activate') {
        (async () => {
          try {
            const data = await chrome.storage.local.get(['premium_data']);
            if (data.premium_data) {
              data.premium_data.isPremium = true;
              data.premium_data.activationDate = Date.now();
              
              // Ensure persistent storage
              await chrome.storage.local.set({ premium_data: data.premium_data });
              
              // Verify the write was successful
              const verify = await chrome.storage.local.get(['premium_data']);
              if (verify.premium_data?.isPremium) {
                console.log('[Premium] Activated successfully!', {
                  activationDate: verify.premium_data.activationDate,
                  isPremium: verify.premium_data.isPremium
                });
                
                // Notify all tabs immediately
                const tabs = await chrome.tabs.query({});
                for (const tab of tabs) {
                  try {
                    chrome.tabs.sendMessage(tab.id, {
                      type: 'premium:activated',
                      success: true,
                      timestamp: Date.now()
                    }).catch(() => {});
                  } catch (e) {}
                }
                
                sendResponse({ 
                  success: true, 
                  message: 'Premium activated!',
                  timestamp: Date.now(),
                  isPremium: true
                });
              } else {
                throw new Error('Verification failed: Premium not saved');
              }
            } else {
              sendResponse({ success: false, message: 'No premium data found' });
            }
          } catch (error) {
            console.error('[Premium] Activation error:', error);
            sendResponse({ 
              success: false, 
              message: 'Activation failed: ' + error.message,
              error: error.message 
            });
          }
        })();
        return true;
      }
      
      if (message.type === 'premium:payment') {
        chrome.tabs.create({ url: 'https://payments.alhudud.xyz/pay.php?checkout_id=4' }).then(() => {
          sendResponse({ success: true });
        }).catch(error => {
          sendResponse({ success: false, error: error.message });
        });
        return true;
      }

      // Handle prompt template updates from sidepanel customization
      if (message.type === 'UPDATE_PROMPT_TEMPLATE') {
        try {
          if (promptTemplates && request.agentName && request.content) {
            promptTemplates.setTemplate(message.agentName, message.content);
            sendResponse({ success: true, message: `Template updated for ${message.agentName}` });
          } else {
            sendResponse({ success: false, error: 'Invalid template update request' });
          }
        } catch (error) {
          console.error('Error updating prompt template:', error);
          sendResponse({ success: false, error: error.message });
        }
        return true;
      }
    }))
  })()
})();
