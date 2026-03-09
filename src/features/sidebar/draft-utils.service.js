/**
 * Draft Utilities: Helping the Draft Tab manage KB context.
 */
function getKBSources() {
    // Combine local and extension-shared KB sources. Shared entries are marked with `shared: true`.
    let localKb = {};
    try { localKb = JSON.parse(localStorage.getItem('digKnowledgeBase') || '{}'); } catch (e) { localKb = {}; }
    const sharedKb = window.__dig_shared_kb || {};
    const sources = [];

    const pushSource = (cls, topic, items, shared) => {
        const isBook = items && items.length && items[0].type === 'book-page';
        if (isBook) {
            const chapters = {};
            items.forEach(it => {
                const ch = it.chapter || 'Unknown';
                chapters[ch] = (chapters[ch] || 0) + 1;
            });
            sources.push({ cls, topic, count: items.length, isBook: true, chapters, shared: !!shared });
        } else {
            sources.push({ cls, topic, count: (items && items.length) || 0, isBook: false, shared: !!shared });
        }
    };

    try {
        Object.keys(localKb || {}).forEach(cls => {
            Object.keys(localKb[cls] || {}).forEach(topic => {
                pushSource(cls, topic, localKb[cls][topic], false);
            });
        });
    } catch (e) { }

    try {
        Object.keys(sharedKb || {}).forEach(cls => {
            Object.keys(sharedKb[cls] || {}).forEach(topic => {
                pushSource(cls, topic, sharedKb[cls][topic], true);
            });
        });
    } catch (e) { }

    return sources;
}

async function buildFilteredKBContext(container) {
    let localKb = {};
    try { localKb = JSON.parse(localStorage.getItem('digKnowledgeBase') || '{}'); } catch (e) { localKb = {}; }
    const sharedKb = window.__dig_shared_kb || {};
    let context = '';

    const checked = Array.from(container.querySelectorAll('.dig-kb-toggle:checked'));
    for (const cb of checked) {
        try {
            const cls = cb.dataset.cls;
            const topic = cb.dataset.topic;
            const isShared = cb.dataset.shared === '1' || cb.dataset.shared === 'true';
            let items = isShared ? (sharedKb[cls]?.[topic] || []) : (localKb[cls]?.[topic] || []);
            if (cb.dataset.chapter) {
                const want = cb.dataset.chapter;
                items = items.filter(i => (i.chapter || 'Unknown') === want);
            }

            for (const item of (items || [])) {
                try {
                    // If the item references remote content, attempt to resolve it
                    let textChunk = '';
                    if (item && item.contentRef && typeof getRemoteContent === 'function') {
                        try {
                            const remote = await getRemoteContent(item.contentRef);
                            if (remote) {
                                textChunk = String(remote.text || remote.html || item.text || item.html || '');
                            } else {
                                textChunk = String(item.text || item.html || '');
                            }
                        } catch (e) {
                            textChunk = String(item.text || item.html || '');
                        }
                    } else {
                        textChunk = String(item.text || item.html || '');
                    }
                    // trim large blobs to a sensible size but include as much as practical
                    if (textChunk && textChunk.length > 2000) textChunk = textChunk.substring(0, 2000) + '...';
                    context += `[${cls}${isShared ? ' (shared)' : ''}/${topic}] ${textChunk}\n`;
                } catch (e) { /* ignore item-level errors */ }
            }
        } catch (e) { /* ignore checkbox-level errors */ }
    }

    return context || 'No sources selected.';
}

// --- Appended Utility Functions for Draft Generation ---

function waitForCondition(condFn, timeout = 20000, interval = 300) {
    return new Promise((resolve) => {
        const start = Date.now();
        const t = setInterval(() => {
            try { if (condFn()) { clearInterval(t); resolve(true); return; } if (Date.now() - start > timeout) { clearInterval(t); resolve(false); return; } } catch (e) { clearInterval(t); resolve(false); }
        }, interval);
    });
}

function findElementByText(regex) {
    const tags = ['button', 'a', 'div', 'span', 'li', 'label'];
    for (const tag of tags) {
        const nodes = Array.from(document.querySelectorAll(tag));
        for (const n of nodes) {
            try {
                const t = (n.innerText || n.textContent || '').trim();
                if (t && regex.test(t)) return n;
            } catch (e) { /* ignore */ }
        }
    }
    return null;
}

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

async function tryInsertIntoYellowdig(text) {
    try {
        if (!window.chrome || !chrome.tabs || !chrome.scripting) return false;
        return new Promise((resolve) => {
            try {
                chrome.tabs.query({}, (tabs) => {
                    try {
                        const target = (tabs || []).find(t => t.url && (t.url.toLowerCase().includes('yellowdig')));
                        if (!target) { resolve(false); return; }
                        chrome.scripting.executeScript({
                            target: { tabId: target.id },
                            func: (txt) => {
                                const composerSelectors = [
                                    'textarea[name*=post i]', 'textarea[id*=post i]', 'textarea[placeholder*=post i]',
                                    'textarea[placeholder*=write i]', 'textarea[aria-label*=post i]', 'textarea',
                                    'div[contenteditable=true]', 'div[role=textbox]', '[contenteditable="true"]', 'input[type="text"]'
                                ];
                                const bySelectors = (sels) => {
                                    for (const s of sels) {
                                        try { const el = document.querySelector(s); if (el) return el; } catch (e) { }
                                    }
                                    return null;
                                };
                                let el = bySelectors(composerSelectors);
                                if (el) {
                                    el.focus();
                                    if (el.getAttribute && el.getAttribute('contenteditable') === 'true') { el.innerText = txt; }
                                    else if ('value' in el) { el.value = txt; }
                                    else { el.innerText = txt; }
                                    el.dispatchEvent(new (el.getAttribute && el.getAttribute('contenteditable') === 'true' ? InputEvent : Event)('input', { bubbles: true }));
                                    return true;
                                }
                                return false;
                            },
                            args: [text]
                        }).then((res) => {
                            resolve(res && res[0] && res[0].result);
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

async function extractTextFromPdf(file) {
    const arrayBuffer = await (file.arrayBuffer ? file.arrayBuffer() : new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsArrayBuffer(file); }));
    let module = null;
    try { module = await import(chrome.runtime.getURL('pdf.min.mjs')); } catch (e) { try { module = await import(chrome.runtime.getURL('pdf.js')); } catch (e2) { module = null; } }
    const pdfjsLib = module && (module.default || module.pdfjsLib || module.PDFJS || module);
    if (!pdfjsLib || typeof pdfjsLib.getDocument !== 'function') throw new Error('pdf.js not available');
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = loadingTask && loadingTask.promise ? await loadingTask.promise : await loadingTask;
    const pages = [];
    for (let p = 1; p <= (pdf.numPages || 0); p++) {
        try { const page = await pdf.getPage(p); const txt = await page.getTextContent(); const pageText = (txt.items || []).map(it => (it.str || it.unicode || '')).join(' '); pages.push(pageText.trim()); } catch (e) { pages.push(''); }
    }
    return pages.join('\n\n---PAGE BREAK---\n\n');
}

function parseNameAndQuestion(ocrText) {
    const lines = ocrText.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    let question = lines.find(l => l.includes('?')) || '';
    if (!question) { question = lines.find(l => /^question[:\s]/i.test(l) || /^prompt[:\s]/i.test(l) || /^q[:\s]/i.test(l)) || ''; }
    let name = '';
    for (let i = 0; i < Math.min(6, lines.length); i++) {
        const L = lines[i];
        const by = L.match(/by\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)/i);
        if (by) { name = by[1]; break; }
        const posted = L.match(/posted by\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)/i);
        if (posted) { name = posted[1]; break; }
    }
    if (!name && lines.length > 0 && lines[0].split(' ').length <= 3) name = lines[0];
    return { name: name || '', question: question || '' };
}

function extractNumbers(text, limit = 6) {
    if (!text) return [];
    const matches = Array.from(new Set((text.match(/\b\d{1,3}(?:[.,]\d+)?(?:%| percent)?\b/gi) || [])));
    return matches.slice(0, limit);
}

function buildPostPrompt(pdfText, intro, lens) {
    const dataPoints = extractNumbers(pdfText).join(', ');
    const trimmedPdf = (pdfText || '').slice(0, 8000);
    return `PDF_EXCERPT:\n${trimmedPdf}\n\nDATA_POINTS:${dataPoints}\n\nINTRO_SCENARIO:\n${intro}\n\nINSTRUCTIONS:\nYou are Dig, a social work & sociology assistant. Create a concise Yellowdig post (120-220 words) that: 1) connects data from the PDF to the scenario, 2) interprets the data through the lens of ${lens}, 3) uses a professional yet conversational tone, 4) includes a brief teaching point referencing sociological theory, 5) ends with one discussion question for classmates. Keep it under 220 words.`;
}

function buildResponsePrompt(name, question, ocrText) {
    const trimmed = (ocrText || '').slice(0, 4000);
    return `HEADER: Question: ${question} | Name: ${name}\n\nINSTRUCTIONS:\nYou are Dig, a social work & sociology assistant. Draft a classroom-appropriate peer response that: greets ${name} by name, ties their points back to the week's themes in a clear way, adds one brief piece of evidence or insight (use social work frameworks like strengths-based or systems), and ends with a thoughtful follow-up question. Keep it warm, respectful, and under 180 words. ORIGINAL_POST_TEXT:\n${trimmed}`;
}

