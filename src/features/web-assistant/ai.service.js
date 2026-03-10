import { extBridge } from './bridge.service.js';
import { log } from './logger.service.js';
// Load KB service so KB/pattern helpers are available (extracted from web-assistant.js)
import './kb.service.js';

// AI helper for web-assistant: provide callGeminiAPI and getGeminiApiKey
const MODEL = "gemini-flash-latest";
if (typeof window !== 'undefined') window.GEMINI_MODEL = MODEL;

export function getGeminiApiKey() {
    try {
        if (typeof __gemini_api_key !== 'undefined' && __gemini_api_key) return __gemini_api_key;
        if (typeof window !== 'undefined' && window.__gemini_api_key) return window.__gemini_api_key;
        if (typeof document !== 'undefined') {
            const el = document.getElementById('geminiApiKeyInput');
            if (el && el.value && el.value.trim()) return el.value.trim();
        }
        if (typeof localStorage !== 'undefined') {
            return localStorage.getItem('geminiApiKey') || localStorage.getItem('gemini_api_key') || null;
        }
    } catch (e) {
        console.warn('Error while resolving Gemini API key:', e);
    }
    return null;
}

export async function callGeminiAPI(query, systemPrompt) {
    // If extension bridge is available, forward to background for network and cooldown handling
    if (extBridge && extBridge.isActive) {
        const resp = await extBridge.sendSafe('CALL_GEMINI', { query, systemPrompt, apiKey: getGeminiApiKey() }, 60000);
        if (resp && resp.ok) return resp.text || '';
        throw new Error(resp && resp.error ? resp.error : 'bg_gemini_failed');
    }

    // Fallback to local fetch when bridge isn't available
    try {
        window._aiCache = window._aiCache || new Map();
        window._aiPending = window._aiPending || new Map();
    } catch (e) { }
    const cacheTTL = 1000 * 60 * 5;
    const timeoutMs = 30000;
    const keyStr = JSON.stringify({ q: String(query || ''), s: String(systemPrompt || '') });

    if (window._aiPending && window._aiPending.has(keyStr)) {
        return window._aiPending.get(keyStr);
    }
    try {
        const cached = window._aiCache && window._aiCache.get(keyStr);
        if (cached && (Date.now() - cached.ts) < cacheTTL) return cached.text;
    } catch (e) { }

    const p = (async () => {
        const key = getGeminiApiKey();
        if (!key) throw new Error('Gemini API key missing');
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(key)}`;
        const payload = { contents: [{ parts: [{ text: query }] }], systemInstruction: { parts: [{ text: systemPrompt }] } };
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const signal = controller ? controller.signal : undefined;
        let timer;
        if (controller) timer = setTimeout(() => { try { controller.abort(); } catch (e) {} }, timeoutMs);
        try {
            const resp = await fetch(endpoint, { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' }, signal });
            if (controller) clearTimeout(timer);
            if (!resp.ok) {
                let bodyText = '';
                try { bodyText = await resp.text(); } catch (e) {}
                if (resp.status === 429) {
                    window._geminiCooldownUntil = Date.now() + (1000 * 30);
                    throw new Error('Gemini rate limited');
                }
                throw new Error(`HTTP ${resp.status} ${bodyText}`);
            }
            const data = await resp.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            try { window._aiCache && window._aiCache.set(keyStr, { ts: Date.now(), text }); } catch (e) {}
            return text;
        } finally {
            try { if (window._aiPending) window._aiPending.delete(keyStr); } catch (e) {}
        }
    })();
    try { if (window._aiPending) window._aiPending.set(keyStr, p); } catch (e) {}
    return p;
}

// Attach to window for easy console access
try { if (typeof window !== 'undefined') window.callGeminiAPI = callGeminiAPI; } catch (e) {}
