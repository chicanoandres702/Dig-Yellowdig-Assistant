/**
 * Gemini API Service: Handles raw HTTP communication, retries, and rate limiting.
 */

const GEMINI_CONFIG = {
    RETRIES: 3,
    MIN_GAP_MS: 1500, // Minimum time between sequential requests
    COOLDOWN_429_MS: 30000, // Cooldown after a rate limit hit
    TIMEOUT_MS: 15000
};

let lastRequestTime = 0;
let apiCooldownUntil = 0;
const requestQueue = [];
let isProcessingQueue = false;

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
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI}:generateContent?key=${encodeURIComponent(resolvedKey)}`;

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

    const sleep = (ms) => new Promise(res => setTimeout(res, ms));

    for (let attempt = 0; attempt <= GEMINI_CONFIG.RETRIES; attempt++) {
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), GEMINI_CONFIG.TIMEOUT_MS);

            const resp = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: controller.signal
            });
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
