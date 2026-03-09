/**
 * Yellowdig DOM Service: Handles interaction with the Yellowdig platform natively.
 */

// Helper to copy text robustly and show brief feedback on the triggering button
async function copyToClipboard(text, btn) {
    try {
        await navigator.clipboard.writeText(text);
        if (btn) { const orig = btn.innerText; btn.innerText = '✅ Copied'; setTimeout(() => btn.innerText = orig, 1500); }
        return true;
    } catch (e) {
        try {
            const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
            if (btn) { const orig = btn.innerText; btn.innerText = '✅ Copied'; setTimeout(() => btn.innerText = orig, 1500); }
            return true;
        } catch (err) {
            if (btn) { const orig = btn.innerText; btn.innerText = 'Copy failed'; setTimeout(() => btn.innerText = orig, 1500); }
            return false;
        }
    }
}

// Try to insert text into an open Yellowdig composer if found. Returns true if inserted.
async function tryInsertIntoYellowdig(text) {
    try {
        if (!window.chrome || !chrome.tabs || !chrome.scripting) return false;
        return new Promise((resolve) => {
            try {
                chrome.tabs.query({}, (tabs) => {
                    try {
                        const target = (tabs || []).find(t => t.url && (t.url.toLowerCase().includes('yellowdig')));
                        if (!target) { resolve(false); return; }
                        const tabId = target.id;

                        chrome.scripting.executeScript({
                            target: { tabId },
                            func: (txt) => {
                                const debug = { inserted: false, actions: [], candidates: [], err: null };
                                try {
                                    const bySelectors = (sels) => {
                                        for (const s of sels) {
                                            try { const el = document.querySelector(s); if (el) return { el, sel: s }; } catch (e) { }
                                        }
                                        return null;
                                    };

                                    const composerSelectors = [
                                        'textarea[name*=post i]', 'textarea[id*=post i]', 'textarea[placeholder*=post i]',
                                        'textarea[placeholder*=write i]', 'textarea[aria-label*=post i]', 'textarea',
                                        'div[contenteditable=true]', 'div[role=textbox]', '[contenteditable="true"]', 'input[type="text"]'
                                    ];
                                    let found = bySelectors(composerSelectors);
                                    if (found) {
                                        try {
                                            const el = found.el;
                                            if (el.getAttribute && el.getAttribute('contenteditable') === 'true') {
                                                el.focus(); el.innerText = txt; el.dispatchEvent(new InputEvent('input', { bubbles: true }));
                                            } else if ('value' in el) {
                                                el.focus(); el.value = txt; el.dispatchEvent(new Event('input', { bubbles: true }));
                                            } else {
                                                el.focus(); el.innerText = txt; el.dispatchEvent(new InputEvent('input', { bubbles: true }));
                                            }
                                            debug.inserted = true; debug.actions.push({ method: 'direct', selector: found.sel });
                                            return debug;
                                        } catch (e) { debug.actions.push({ method: 'direct-fail', err: String(e) }); }
                                    }

                                    const clickButtonByText = (regex) => {
                                        const tags = ['button', 'a', 'div', 'span', 'li'];
                                        for (const tag of tags) {
                                            const nodes = Array.from(document.getElementsByTagName(tag));
                                            for (const n of nodes) {
                                                try {
                                                    const t = (n.innerText || n.textContent || '').trim();
                                                    if (t && regex.test(t)) { try { n.click(); } catch (e) { } debug.actions.push({ method: 'clickByText', tag, text: t }); return true; }
                                                } catch (e) { }
                                            }
                                        }
                                        return false;
                                    };

                                    const newPostRegex = /\b(new post|create post|start a post|new discussion|create discussion|post to class|create)\b/i;
                                    if (clickButtonByText(newPostRegex)) {
                                        const start = Date.now(); const timeout = 2500;
                                        while (Date.now() - start < timeout) {
                                            const el = document.querySelector('textarea, [contenteditable=true], [role=textbox]');
                                            if (el) {
                                                try {
                                                    if (el.getAttribute && el.getAttribute('contenteditable') === 'true') { el.focus(); el.innerText = txt; el.dispatchEvent(new InputEvent('input', { bubbles: true })); }
                                                    else if ('value' in el) { el.focus(); el.value = txt; el.dispatchEvent(new Event('input', { bubbles: true })); }
                                                    else { el.focus(); el.innerText = txt; el.dispatchEvent(new InputEvent('input', { bubbles: true })); }
                                                    debug.inserted = true; debug.actions.push({ method: 'newPostInsert' });
                                                    return debug;
                                                } catch (e) { }
                                            }
                                        }
                                    }

                                    const replyRegex = /\b(reply|respond)\b/i;
                                    if (clickButtonByText(replyRegex)) {
                                        const start = Date.now(); const timeout = 2000;
                                        while (Date.now() - start < timeout) {
                                            const el = document.querySelector('textarea, [contenteditable=true], [role=textbox]');
                                            if (el) {
                                                try {
                                                    if (el.getAttribute && el.getAttribute('contenteditable') === 'true') { el.focus(); el.innerText = txt; el.dispatchEvent(new InputEvent('input', { bubbles: true })); }
                                                    else if ('value' in el) { el.focus(); el.value = txt; el.dispatchEvent(new Event('input', { bubbles: true })); }
                                                    else { el.focus(); el.innerText = txt; el.dispatchEvent(new InputEvent('input', { bubbles: true })); }
                                                    debug.inserted = true; debug.actions.push({ method: 'replyInsert' });
                                                    return debug;
                                                } catch (e) { }
                                            }
                                        }
                                    }

                                    try {
                                        const cands = [];
                                        ['textarea', '[contenteditable=true]', '[role=textbox]', 'input[type="text"]'].forEach(sel => {
                                            const els = Array.from(document.querySelectorAll(sel)).slice(0, 6).map(e => ({ tag: e.tagName, placeholder: e.getAttribute && e.getAttribute('placeholder') || '', aria: e.getAttribute && e.getAttribute('aria-label') || '', classes: e.className || '' }));
                                            if (els && els.length) cands.push({ sel, examples: els });
                                        });
                                        debug.candidates = cands;
                                    } catch (e) { }

                                } catch (e) { debug.err = String(e); }
                                return debug;
                            },
                            args: [text]
                        }).then((res) => {
                            try {
                                const r = res && res[0] && res[0].result;
                                if (r && r.inserted) resolve(true);
                                else {
                                    try { console && console.log && console.log('dig-insert-debug', r); } catch (e) { }
                                    resolve(false);
                                }
                            } catch (e) { resolve(false); }
                        }).catch(() => resolve(false));
                    } catch (e) { resolve(false); }
                });
            } catch (e) { resolve(false); }
        });
    } catch (e) { return false; }
}

async function copyAndTryInsert(text, btn) {
    try {
        await copyToClipboard(text, btn);
        const inserted = await tryInsertIntoYellowdig(text);
        const saveMsg = document.getElementById('dig-draft-saveMsg') || document.getElementById('dig-draft-saveMsg2');
        if (inserted && saveMsg) { saveMsg.innerText = 'Inserted into Yellowdig composer'; setTimeout(() => saveMsg.innerText = '', 2000); }
        else if (saveMsg) { saveMsg.innerText = 'Copied to clipboard'; setTimeout(() => saveMsg.innerText = '', 2000); }
    } catch (e) {
        const saveMsg = document.getElementById('dig-draft-saveMsg') || document.getElementById('dig-draft-saveMsg2');
        if (saveMsg) saveMsg.innerText = 'Copy failed';
    }
}
