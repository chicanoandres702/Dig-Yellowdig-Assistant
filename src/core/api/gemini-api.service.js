/**
 * Gemini API Service: Handles raw HTTP communication, retries, and rate limiting.
 */

const GEMINI_CONFIG = {
    RETRIES: 3,
    MIN_GAP_MS: 1500, // Minimum time between sequential requests
    COOLDOWN_429_MS: 30000, // Cooldown after a rate limit hit
    TIMEOUT_MS: 15000
};

// Tools / function declarations used for agentic flows (Gemini 3 Flash)
const AGENT_TOOLS = [
    {
        name: "CLICK",
        description: "Simulate a touch-tap on a mobile element center.",
        parameters: { type: "object", properties: { id: { type: "string" } }, required: ["id"] }
    },
    {
        name: "TYPE",
        description: "Type text into an input field.",
        parameters: { type: "object", properties: { id: { type: "string" }, text: { type: "string" } }, required: ["id", "text"] }
    },
    {
        name: "BATCH",
        description: "Execute multiple operations in a single turn for efficiency.",
        parameters: { type: "object", properties: { operations: { type: "array", items: { type: "object", properties: { type: { type: "string", enum: ["CLICK", "TYPE"] }, id: { type: "string" }, text: { type: "string" } } } } } }
    },
    {
        name: "SCROLL",
        description: "Scroll the viewport.",
        parameters: { type: "object", properties: { direction: { type: "string", enum: ["up", "down"] } } }
    },
    {
        name: "SWITCH_TAB",
        description: "Change focus to a different browser tab.",
        parameters: { type: "object", properties: { tab_index: { type: "integer" } } }
    },
    {
        name: "ANSWER",
        description: "Provide a final information response to the user.",
        parameters: { type: "object", properties: { text: { type: "string" } } }
    }
];

let lastRequestTime = 0;
let apiCooldownUntil = 0;
const requestQueue = [];
let isProcessingQueue = false;

/**
 * If a local proxy is available, frontend can call it instead of the public API.
 * Set `window.__GEMINI_PROXY_URL` (e.g. http://localhost:5174) to enable.
 */
function _getProxyUrl() {
    try {
        if (typeof window !== 'undefined' && window.__GEMINI_PROXY_URL) return window.__GEMINI_PROXY_URL;
    } catch (e) { /* ignore */ }
    try {
        if (typeof GEMINI_PROXY_URL !== 'undefined') return GEMINI_PROXY_URL;
    } catch (e) {}
    return null;
}

/**
 * Resolves the Gemini API key from local storage or defaults.
 */
async function getGeminiApiKey(providedKey) {
    if (providedKey) return providedKey;
    try {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local && chrome.storage.local.get) {
            const res = await new Promise(resolve => chrome.storage.local.get(['gemini_api_key'], resolve));
            if (res && res.gemini_api_key) return res.gemini_api_key;
        }
    } catch (err) {
        console.warn('Could not read gemini_api_key from chrome.storage.local', err);
    }
    try {
        return localStorage.getItem('gemini_api_key') || (typeof DEFAULT_API_KEY !== 'undefined' ? DEFAULT_API_KEY : '');
    } catch (e) {
        return typeof DEFAULT_API_KEY !== 'undefined' ? DEFAULT_API_KEY : '';
    }
}

/**
 * Throttled model invocation.
 */
async function invokeGeminiAPI(persona, prompt, apiKey, systemInstruction, DIG_SYSTEM_INSTRUCTION = '', imageParts = []) {
    return new Promise((resolve, reject) => {
        requestQueue.push({ persona, prompt, apiKey, systemInstruction, DIG_SYSTEM_INSTRUCTION, imageParts, resolve, reject });
        _processQueue();
    });
}

/**
 * Core queue processor with rate limiting and gap management.
 */
async function _processQueue() {
    if (isProcessingQueue || requestQueue.length === 0) return;
    isProcessingQueue = true;

    while (requestQueue.length > 0) {
        const now = Date.now();

        // Handle global cooldown
        if (now < apiCooldownUntil) {
            const wait = apiCooldownUntil - now;
            await new Promise(r => setTimeout(r, wait));
            continue;
        }

        // Ensure minimum gap between requests
        const timeSinceLast = now - lastRequestTime;
        if (timeSinceLast < GEMINI_CONFIG.MIN_GAP_MS) {
            await new Promise(r => setTimeout(r, GEMINI_CONFIG.MIN_GAP_MS - timeSinceLast));
            continue;
        }

        const task = requestQueue.shift();
        lastRequestTime = Date.now();

        try {
            const result = await _executeGeminiRequest(task);
            task.resolve(result);
        } catch (err) {
            task.reject(err);
        }
    }

    isProcessingQueue = false;
}

/**
 * Raw request execution with retry logic.
 */
async function _executeGeminiRequest({ persona, prompt, apiKey, systemInstruction, DIG_SYSTEM_INSTRUCTION, imageParts }) {
    const finalSystemInstruction = (DIG_SYSTEM_INSTRUCTION || '') + (systemInstruction ? '\n\n' + systemInstruction : '');
    const resolvedKey = await getGeminiApiKey(apiKey);

    if (!resolvedKey) throw new Error('No API key provided.');

    const GEMINI = (typeof window !== 'undefined' && window.GEMINI_MODEL) ? window.GEMINI_MODEL : (typeof GEMINI_MODEL !== 'undefined' ? GEMINI_MODEL : 'gemini-flash-latest');

    const parts = [{ text: persona + '\n' + prompt }];
    if (imageParts && imageParts.length > 0) {
        imageParts.forEach(img => {
            if (img.inlineData) parts.push({ inlineData: img.inlineData });
        });
    }

    const payload = {
        contents: [{ parts }],
        systemInstruction: finalSystemInstruction ? { parts: [{ text: finalSystemInstruction }] } : undefined
    };

    // If a proxy URL is provided, forward the request to the proxy which will
    // perform the model call using a server-side key. This avoids exposing the
    // API key in the client and allows centralized rate limiting / logging.
    const proxyUrl = _getProxyUrl();
    let url = null;
    let fetchOptions = null;
    if (proxyUrl) {
        url = proxyUrl.replace(/\/$/, '') + '/api/gemini';
        fetchOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: GEMINI, payload })
        };
    } else {
        url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI}:generateContent?key=${encodeURIComponent(resolvedKey)}`;
        fetchOptions = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) };
    }

    const sleep = (ms) => new Promise(res => setTimeout(res, ms));

    for (let attempt = 0; attempt <= GEMINI_CONFIG.RETRIES; attempt++) {
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), GEMINI_CONFIG.TIMEOUT_MS);

            const resp = await fetch(url, Object.assign({}, fetchOptions, { signal: controller.signal }));
            clearTimeout(timer);

            if (resp.ok) {
                const data = await resp.json();
                return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No content returned.';
            }

            if (resp.status === 429) {
                console.warn('Gemini API rate limited (429). Triggering cooldown.');
                apiCooldownUntil = Date.now() + GEMINI_CONFIG.COOLDOWN_429_MS;
                if (attempt < GEMINI_CONFIG.RETRIES) {
                    await sleep(2000 * Math.pow(2, attempt));
                    continue;
                }
                return 'Model API rate limit (429). Cooldown active. Try again in 30s.';
            }

            let errText = `Gemini API error ${resp.status}`;
            try {
                const errJson = await resp.json();
                if (errJson?.error?.message) errText += ': ' + errJson.error.message;
            } catch (ee) { }
            throw new Error(errText);
        } catch (e) {
            if (attempt < GEMINI_CONFIG.RETRIES) {
                await sleep(1000 * Math.pow(2, attempt));
                continue;
            }
            console.error('Gemini API Error:', e);
            throw e;
        }
    }
    return 'Error contacting model.';
}

// Agent-specific request: returns the raw model part (including functionCall and thought_signature)
async function _executeAgentRequest({ contents, apiKey, systemInstruction, DIG_SYSTEM_INSTRUCTION = '', generationConfig = {} }) {
    const finalSystemInstruction = (DIG_SYSTEM_INSTRUCTION || '') + (systemInstruction ? '\n\n' + systemInstruction : '');
    const resolvedKey = await getGeminiApiKey(apiKey);

    if (!resolvedKey) throw new Error('No API key provided.');

    const GEMINI = (typeof window !== 'undefined' && window.GEMINI_MODEL) ? window.GEMINI_MODEL : (typeof GEMINI_MODEL !== 'undefined' ? GEMINI_MODEL : 'gemini-flash-latest');

    const payload = {
        contents: contents && contents.length ? contents : [],
        systemInstruction: finalSystemInstruction ? { parts: [{ text: finalSystemInstruction }] } : undefined,
        tools: AGENT_TOOLS,
        generationConfig: Object.assign({ includeThoughts: true }, generationConfig)
    };

    const proxyUrl = _getProxyUrl();
    let url = null;
    let fetchOptions = null;
    if (proxyUrl) {
        url = proxyUrl.replace(/\/$/, '') + '/api/gemini';
        fetchOptions = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: GEMINI, payload }) };
    } else {
        url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI}:generateContent?key=${encodeURIComponent(resolvedKey)}`;
        fetchOptions = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) };
    }

    const sleep = (ms) => new Promise(res => setTimeout(res, ms));

    for (let attempt = 0; attempt <= GEMINI_CONFIG.RETRIES; attempt++) {
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), GEMINI_CONFIG.TIMEOUT_MS);

            const resp = await fetch(url, Object.assign({}, fetchOptions, { signal: controller.signal }));
            clearTimeout(timer);

            if (resp.ok) {
                const data = await resp.json();
                // return the raw part object so callers can inspect functionCall/thought_signature
                return data.candidates?.[0]?.content?.parts?.[0] || null;
            }

            if (resp.status === 429) {
                apiCooldownUntil = Date.now() + GEMINI_CONFIG.COOLDOWN_429_MS;
                if (attempt < GEMINI_CONFIG.RETRIES) {
                    await sleep(2000 * Math.pow(2, attempt));
                    continue;
                }
                return null;
            }

            let errText = `Gemini API error ${resp.status}`;
            try {
                const errJson = await resp.json();
                if (errJson?.error?.message) errText += ': ' + errJson.error.message;
            } catch (ee) { }
            throw new Error(errText);
        } catch (e) {
            if (attempt < GEMINI_CONFIG.RETRIES) {
                await sleep(1000 * Math.pow(2, attempt));
                continue;
            }
            console.error('Gemini API Agent Error:', e);
            throw e;
        }
    }
    return null;
}

// Exported helper for agent flows. Accepts a pre-built `contents` history array and returns the model part.
export async function invokeGeminiAgent({ contents = [], apiKey = undefined, systemInstruction = '', generationConfig = {} } = {}) {
    return await _executeAgentRequest({ contents, apiKey, systemInstruction, generationConfig });
}
