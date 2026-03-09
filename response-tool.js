// Response Tool logic moved to external file to comply with CSP
// Runs after DOMContentLoaded (HTML includes <script src="response-tool.js" defer></script>)

document.addEventListener('DOMContentLoaded', async () => {
  // Respect optional mode param (?mode=post|reply) so Yellowdig header can open the desired flow.
  const _params = new URLSearchParams(window.location.search || '');
  const _initMode = (_params.get('mode') || '').toLowerCase();
  const LS_KEY = 'dig_response_tool_entries_v1';
  const modelFallback = (typeof GEMINI_MODEL !== 'undefined') ? GEMINI_MODEL : 'gemini-flash-latest';

  // Global Dig system instruction: prefer plain-text, no-markdown outputs
  const DIG_SYSTEM_INSTRUCTION = `Act as "Dig," a social work and sociology assistant. Your goal is to help generate Yellowdig posts and peer responses based on course materials and screenshots.

Always respond in PLAIN TEXT only — do NOT use Markdown, HTML, code blocks, or any other formatting. Return only the textual content to be inserted into Yellowdig or the Response Tool. The extension will wrap outputs into a single HTML Response Tool and add Click-to-Copy buttons.

For PDF + Intro (posts): produce a concise Yellowdig post (120-220 words) that connects the PDF data to the intro scenario, uses sociological lenses when requested, and includes a brief teaching point and one discussion question.

For Peer Responses (screenshots): start with "Hi [Name]!", tie points to the week's themes, add one brief evidence or insight, and end with a thoughtful follow-up question (keep under 180 words).

Tone: professional yet conversational, age-appropriate for under 18, classroom-appropriate, respectful.

Do not use alert() or produce HTML/Markdown; return plain text only.`;

  // Utils
  function el(id){return document.getElementById(id)}
  function now(){return new Date().toISOString()}
  function uid(){return 'r_'+Date.now()+'_'+Math.floor(Math.random()*0xFFFF).toString(16)}
  function show(elm){elm.classList.remove('hidden')}
  function hide(elm){elm.classList.add('hidden')}
  function setStatus(id,msg,timeout=3000){ const s=el(id); if(!s) return; s.textContent=msg; if(timeout) setTimeout(()=>{ if(s.textContent===msg) s.textContent=''; }, timeout); }

  // Clipboard helper — copy text and show ephemeral feedback on the button
  async function copyTextToClipboard(text, btn){
    try{ await navigator.clipboard.writeText(text); const orig = btn.innerText; btn.innerText = 'Copied!'; setTimeout(()=>btn.innerText = orig, 1500); }
    catch(e){ const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try{ document.execCommand('copy'); btn.innerText='Copied!'; setTimeout(()=>btn.innerText='Copied!'); }catch(err){} ta.remove(); }
  }

  // Storage
  function loadEntries(){ try{ return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); }catch(e){ return []; } }
  function saveEntries(arr){ localStorage.setItem(LS_KEY, JSON.stringify(arr)); renderSavedList(); }
  function addEntry(entry){ const arr = loadEntries(); arr.unshift(entry); saveEntries(arr); }
  function clearEntries(){ localStorage.removeItem(LS_KEY); renderSavedList(); }

  function renderSavedList(){
    const list = el('savedList'); list.innerHTML='';
    const arr = loadEntries();
    if(arr.length===0){ list.innerHTML = '<div class="small">No saved responses.</div>'; return; }
    arr.forEach((en, idx) => {
      const d = document.createElement('div'); d.className='entry';
      const meta = document.createElement('div'); meta.className='meta'; meta.textContent = `${en.type === 'post' ? 'Yellowdig Post' : 'Peer Response'} • ${new Date(en.createdAt).toLocaleString()}` + (en.source ? ' • ' + en.source : '');
      d.appendChild(meta);
      const header = document.createElement('div'); header.style.fontWeight='700'; header.style.marginBottom='8px'; header.textContent = en.headerText || '';
      const headerControls = document.createElement('div'); headerControls.className='controls';
      const copyH = document.createElement('button'); copyH.className='copy-btn'; copyH.innerText='Click to Copy Header'; copyH.onclick = ()=>copyTextToClipboard(en.headerText||'', copyH);
      headerControls.appendChild(copyH);
      d.appendChild(header);
      d.appendChild(headerControls);

      const content = document.createElement('div'); content.style.whiteSpace='pre-wrap'; content.style.marginTop='8px'; content.textContent = en.contentText || '';
      const contentControls = document.createElement('div'); contentControls.className='controls';
      const copyC = document.createElement('button'); copyC.className='copy-btn'; copyC.innerText='Click to Copy Response'; copyC.onclick = ()=>copyTextToClipboard(en.contentText||'', copyC);
      const del = document.createElement('button'); del.className='ghost'; del.innerText='Delete'; del.onclick = ()=>{ const arr = loadEntries(); arr.splice(idx,1); saveEntries(arr); };
      contentControls.appendChild(copyC); contentControls.appendChild(del);
      d.appendChild(content);
      d.appendChild(contentControls);
      list.appendChild(d);
    });
  }

  // Load shared KB from chrome.storage.local (if available).
  // Fallback order: chrome.storage.local -> extension/localStorage('digKnowledgeBase') -> window.__dig_shared_kb
  async function loadSharedKB() {
    return new Promise((resolve) => {
      try {
        if (window.chrome && chrome.storage && chrome.storage.local && chrome.storage.local.get) {
          try {
            chrome.storage.local.get('digKnowledgeBase', (res) => {
              (async () => {
                try {
                  const fromChrome = (res && res.digKnowledgeBase) ? res.digKnowledgeBase : {};
                  if (fromChrome && Object.keys(fromChrome).length) { resolve(fromChrome); return; }
                } catch (e) { /* ignore and continue */ }

                // Try extension page localStorage (extension origin)
                try {
                  const ls = JSON.parse(localStorage.getItem('digKnowledgeBase') || '{}');
                  if (ls && Object.keys(ls).length) { resolve(ls); return; }
                } catch (e) { /* ignore */ }

                // As a last resort, attempt to read the page's localStorage from the active tab
                try {
                  if (chrome && chrome.tabs && chrome.scripting && chrome.tabs.query) {
                    chrome.tabs.query({}, (tabs) => {
                      try {
                        if (!tabs || !tabs.length) { try { resolve(window.__dig_shared_kb || {}); } catch (e) { resolve({}); } return; }
                        // Prefer the originating page if the opener passed a pageUrl param
                        const pageUrlParam = (_params && _params.get) ? _params.get('pageUrl') : null;
                        let targetTab = null;
                        if (pageUrlParam) {
                          try {
                            for (const t of tabs) {
                              if (t && t.url && typeof t.url === 'string' && t.url.indexOf(pageUrlParam) === 0) { targetTab = t; break; }
                            }
                          } catch (e) { /* ignore */ }
                        }
                        if (!targetTab) {
                          // fallback to active tab in current window
                          targetTab = tabs.find(t => t.active && t.windowId === chrome.windows.WINDOW_ID_CURRENT) || tabs[0];
                        }
                        if (!targetTab) { try { resolve(window.__dig_shared_kb || {}); } catch (e) { resolve({}); } return; }
                        const tabId = targetTab.id;
                        // Execute in page context to read localStorage for the page origin
                          try {
                            chrome.scripting.executeScript({ target: { tabId }, func: (k) => { try { return JSON.parse(localStorage.getItem(k) || '{}'); } catch (e) { return {}; } }, args: ['digKnowledgeBase'] }).then((results) => {
                              try {
                                const pageKb = results && results[0] && results[0].result ? results[0].result : {};
                                if (pageKb && Object.keys(pageKb).length) { resolve(pageKb); return; }
                              } catch (e) { /* ignore */ }
                              try { resolve(window.__dig_shared_kb || {}); } catch (e) { resolve({}); }
                            }).catch((err) => {
                              // Likely tracking prevention blocked reading page storage — surface a helpful flag/status
                              try { window.__dig_tracking_prevention_blocked = true; } catch (e) { /* ignore */ }
                              try { setStatus('saveMsg', 'Tracking Prevention blocked reading page storage — shared KB may be missing. Consider migrating page KB to extension storage or allowing site storage.', 6000); } catch (e) { /* ignore */ }
                              try { resolve(window.__dig_shared_kb || {}); } catch (e) { resolve({}); }
                            });
                          return;
                        } catch (e) { /* ignore and fallthrough */ }
                      } catch (e) { try { resolve(window.__dig_shared_kb || {}); } catch (er) { resolve({}); } }
                    });
                    return;
                  }
                } catch (e) { /* ignore */ }

                try { resolve(window.__dig_shared_kb || {}); } catch (e) { resolve({}); }
              })();
            });
            return;
          } catch (e) { /* fallthrough */ }
        }
      } catch (e) { }

      // No chrome storage API — try extension/localStorage then cached window var
      try {
        const ls = JSON.parse(localStorage.getItem('digKnowledgeBase') || '{}');
        if (ls && Object.keys(ls).length) { resolve(ls); return; }
      } catch (e) { /* ignore */ }
      try { resolve(window.__dig_shared_kb || {}); } catch (e) { resolve({}); }
    });
  }

  // Build a short textual context from the shared KB. If clsHint provided, prefer that class's entries.
  function buildSharedContextText(sharedKB, clsHint, limit = 6) {
    try {
      if (!sharedKB || Object.keys(sharedKB).length === 0) return { text: '', count: 0 };
      const items = [];
      const pushFrom = (cls, topic, arr) => {
        if (!Array.isArray(arr)) return;
        for (const it of arr) {
          const txt = (it && (it.text || it.html)) ? (it.text || it.html || '') : '';
          items.push({ cls, topic, txt: String(txt || '').replace(/\s+/g,' ').trim().slice(0,500), ts: it && it.ts ? Number(it.ts) : 0 });
        }
      };
      if (clsHint && sharedKB[clsHint]) {
        Object.keys(sharedKB[clsHint]).forEach(topic => pushFrom(clsHint, topic, sharedKB[clsHint][topic]));
      }
      // fallback: gather across all classes
      if (items.length === 0) {
        Object.keys(sharedKB).forEach(cls => {
          Object.keys(sharedKB[cls] || {}).forEach(topic => pushFrom(cls, topic, sharedKB[cls][topic]));
        });
      }
      if (items.length === 0) return { text: '', count: 0 };
      items.sort((a,b) => (b.ts || 0) - (a.ts || 0));
      const picked = items.slice(0, limit);
      const parts = picked.map(it => `Class: ${it.cls} • Topic: ${it.topic}\nSnippet: ${it.txt}`);
      return { text: parts.join('\n\n'), count: picked.length };
    } catch (e) { return { text: '', count: 0 }; }
  }

  // Flatten shared KB into an array of items with stable ids
  function flattenSharedKB(sharedKB) {
    const items = [];
    try {
      Object.keys(sharedKB || {}).forEach(cls => {
        Object.keys(sharedKB[cls] || {}).forEach(topic => {
          const arr = sharedKB[cls][topic];
          if (!Array.isArray(arr)) return;
          arr.forEach((it, idx) => {
            const ts = it && it.ts ? Number(it.ts) : Date.now() - idx;
            const raw = (it && (it.text || it.html)) ? (it.text || it.html || '') : '';
            const txt = String(raw || '').replace(/\s+/g,' ').trim();
            const id = encodeURIComponent(cls) + '::' + encodeURIComponent(topic) + '::' + (ts || idx) + '::' + idx;
            items.push({ id, cls, topic, txt: txt.slice(0,1000), ts });
          });
        });
      });
    } catch (e) { }
    return items.sort((a,b) => (b.ts || 0) - (a.ts || 0));
  }

  // Selected shared IDs persisted in localStorage key
  const SHARED_SELECTED_KEY = 'dig_response_tool_selected_shared';
  function loadSelectedSharedIds(){ try{ return JSON.parse(localStorage.getItem(SHARED_SELECTED_KEY) || '[]'); }catch(e){ return []; } }
  function saveSelectedSharedIds(arr){ try{ localStorage.setItem(SHARED_SELECTED_KEY, JSON.stringify(arr || [])); }catch(e){} }

  // Render the shared KB panel (items = flattened array)
  async function loadAndRenderSharedKB() {
    try {
      const sharedKB = await loadSharedKB();
      const items = flattenSharedKB(sharedKB);
      const listEl = el('sharedKbList');
      if(!listEl) return items;
      const selected = new Set(loadSelectedSharedIds());
      const max = 30; // show up to 30 recent snippets
      const toShow = items.slice(0, max);
      if (toShow.length === 0) {
        listEl.innerHTML = '<div class="small">No shared KB entries found. If you saved KB in the page sidebar, open the Knowledge tab and use "Migrate to shared" to copy local KB into the extension-shared storage.</div>';
        return items;
      }
      listEl.innerHTML = '';
      toShow.forEach(it => {
        const wrap = document.createElement('div');
        wrap.style.padding = '6px'; wrap.style.borderBottom = '1px solid #eef2f7'; wrap.style.marginBottom = '6px';
        const lab = document.createElement('label'); lab.style.display = 'block'; lab.style.cursor = 'pointer';
        const cb = document.createElement('input'); cb.type = 'checkbox'; cb.className = 'shared-kb-checkbox'; cb.dataset.id = it.id; cb.style.marginRight = '8px';
        if (selected.has(it.id)) cb.checked = true;
        const title = document.createElement('div'); title.style.fontWeight = '700'; title.style.fontSize = '12px'; title.style.color = '#0f172a'; title.textContent = `${it.cls} • ${it.topic}`;
        const snippet = document.createElement('div'); snippet.style.fontSize = '13px'; snippet.style.color = '#334155'; snippet.style.marginTop='4px'; snippet.textContent = it.txt.length > 240 ? it.txt.slice(0,240) + '...' : it.txt;
        lab.appendChild(cb); lab.appendChild(title); lab.appendChild(snippet);
        wrap.appendChild(lab);
        listEl.appendChild(wrap);
      });
      // attach listeners
      listEl.querySelectorAll('.shared-kb-checkbox').forEach(cb => cb.onchange = (e) => {
        try {
          const id = cb.dataset.id; const arr = new Set(loadSelectedSharedIds());
          if (cb.checked) arr.add(id); else arr.delete(id);
          saveSelectedSharedIds(Array.from(arr));
        } catch (e) { }
      });
      return items;
    } catch (e) { console.error('loadAndRenderSharedKB failed', e); }
    return [];
  }

  function getSelectedSharedText(limit = 6) {
    try {
      const arrIds = loadSelectedSharedIds();
      if (!arrIds || !arrIds.length) return '';
      // Prefer cached shared KB, but fall back to extension/localStorage if needed
      let shared = window.__dig_shared_kb || {};
      if (!shared || Object.keys(shared).length === 0) {
        try {
          const ls = JSON.parse(localStorage.getItem('digKnowledgeBase') || '{}');
          if (ls && Object.keys(ls).length) shared = ls;
        } catch (e) { /* ignore */ }
      }
      const items = flattenSharedKB(shared);
      const picked = items.filter(i => arrIds.includes(i.id)).slice(0, limit);
      if (!picked.length) return '';
      return picked.map(it => `Class: ${it.cls} • Topic: ${it.topic}\nSnippet: ${it.txt.slice(0,500)}`).join('\n\n');
    } catch (e) { return ''; }
  }

  // Model invocation — try to use stored key (or the API key input) when calling Gemini via REST.
  async function getApiKeyFromStorage() {
    try {
      const keyRes = await new Promise((res) => { try { chrome.storage.local.get(['gemini_api_key'], res); } catch (e) { res({}); } });
      if (keyRes && keyRes.gemini_api_key) return keyRes.gemini_api_key;
    } catch (e) { }
    return null;
  }

  async function invokeModel(persona, prompt, apiKey, systemInstruction){
    // Merge user-provided systemInstruction with Dig's global instruction
    const finalSystemInstruction = (DIG_SYSTEM_INSTRUCTION || '') + (systemInstruction ? '\n\n' + systemInstruction : '');
    // Prefer extension-hosted wrapper when available
    if(window.generateContent && typeof window.generateContent === 'function'){
      try{ return await window.generateContent(persona, prompt, apiKey || (await getApiKeyFromStorage()) || '', finalSystemInstruction); }catch(e){ console.error('window.generateContent failed', e); }
    }

    // fallback: call Gemini via REST using provided key or stored key with retry/backoff
    const keyToUse = apiKey || (await getApiKeyFromStorage());
    if(!keyToUse) throw new Error('No API key provided for model fallback. Provide key or configure extension key in settings.');
    const GEMINI = (typeof window.GEMINI_MODEL !== 'undefined') ? window.GEMINI_MODEL : modelFallback;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI}:generateContent?key=${encodeURIComponent(keyToUse)}`;
    const payload = { contents:[{ parts:[{ text: persona + '\n' + prompt }] }], systemInstruction: finalSystemInstruction ? { parts:[{ text: finalSystemInstruction }] } : undefined };

    const sleep = (ms) => new Promise(res => setTimeout(res, ms));
    const maxRetries = 3;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (resp.ok) {
          const data = await resp.json();
          return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No content returned.';
        }

        // Handle rate limit specially
        if (resp.status === 429) {
          console.warn('Model API returned 429 (rate limit)');
          if (attempt < maxRetries) {
            setStatus('saveMsg', 'Model API rate limited — retrying...', 3000);
            await sleep(1000 * Math.pow(2, attempt) + Math.floor(Math.random() * 300));
            continue;
          }
          return 'Model API rate limit (429). The extension may be using a shared demo API key with limited quota — configure your own Google Generative API key in the extension settings or try again later.';
        }

        // Other non-OK responses: try to parse error details
        let errText = `Model API error ${resp.status}`;
        try {
          const errJson = await resp.json();
          if (errJson && errJson.error && errJson.error.message) errText += `: ${errJson.error.message}`;
        } catch (e) { /* ignore */ }
        throw new Error(errText);
      } catch (err) {
        if (attempt < maxRetries) {
          setStatus('saveMsg', 'Network error contacting model — retrying...', 3000);
          await sleep(1000 * Math.pow(2, attempt) + Math.floor(Math.random() * 300));
          continue;
        }
        console.error('invokeModel final error', err);
        return 'Error contacting model: ' + (err && err.message ? err.message : String(err));
      }
    }
    return 'Error contacting model.';
  }

  // PDF extraction using bundled pdf.js via dynamic import
  async function extractTextFromPdf(file){
    const arrayBuffer = await file.arrayBuffer();
    // dynamic import of bundled pdf.js exposed as web_accessible_resources
    let module = null;
    try { module = await import(chrome.runtime.getURL('pdf.min.mjs')); } catch (e) { try { module = await import(chrome.runtime.getURL('pdf.js')); } catch (e2) { module = null; } }
    const pdfjsLib = module && (module.default || module.pdfjsLib || module.PDFJS || module);
    if (!pdfjsLib || typeof pdfjsLib.getDocument !== 'function') throw new Error('pdfjs not available');
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = loadingTask && loadingTask.promise ? await loadingTask.promise : await loadingTask;
    const n = pdf.numPages || 0;
    const pages = [];
    for (let p = 1; p <= n; p++){
      try {
        const page = await pdf.getPage(p);
        const txt = await page.getTextContent();
        const items = txt && txt.items ? txt.items : [];
        const pageText = items.map(it => (it && (it.str || it.unicode)) ? (it.str || it.unicode) : '').join(' ');
        pages.push(pageText.trim());
      } catch (e) { pages.push(''); }
    }
    return pages.join('\n\n---PAGE BREAK---\n\n');
  }

  // Quick data point extraction (numbers and percentages)
  function extractNumbers(text, limit=6){ if(!text) return []; const matches = Array.from(new Set((text.match(/\b\d{1,3}(?:[.,]\d+)?(?:%| percent)?\b/gi) || []))); return matches.slice(0,limit); }

  // Heuristic parsing of OCRed screenshot to find name & question
  function parseNameAndQuestion(ocrText){
    const lines = ocrText.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
    let question = lines.find(l=>l.includes('?')) || '';
    if(!question) question = lines.find(l=>/^question[:\s]/i.test(l) || /^prompt[:\s]/i.test(l) || /^q[:\s]/i.test(l)) || '';
    let name = '';
    for(let i=0;i<Math.min(6,lines.length);i++){
      const L = lines[i];
      const by = L.match(/by\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)/i);
      if(by){ name = by[1]; break; }
      const posted = L.match(/posted by\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)/i);
      if(posted){ name = posted[1]; break; }
    }
    if(!name && lines.length>0 && lines[0].split(' ').length<=3) name = lines[0];
    return { name: name || '', question: question || '' };
  }

  // Build prompts
  function buildPostPrompt(pdfText, intro, lens){ const dataPoints = extractNumbers(pdfText).join(', '); const trimmedPdf = (pdfText || '').slice(0, 8000); return `PDF_EXCERPT:\n${trimmedPdf}\n\nDATA_POINTS:${dataPoints}\n\nINTRO_SCENARIO:\n${intro}\n\nINSTRUCTIONS:\nYou are Dig, a social work & sociology assistant. Create a concise Yellowdig post (120-220 words) that: 1) connects data from the PDF to the scenario, 2) interprets the data through the lens of ${lens}, 3) uses a professional yet conversational tone, 4) includes a brief teaching point referencing sociological theory, 5) ends with one discussion question for classmates. Keep it under 220 words.`; }
  function buildResponsePrompt(name, question, ocrText){ const trimmed = (ocrText||'').slice(0,4000); return `HEADER: Question: ${question} | Name: ${name}\n\nINSTRUCTIONS:\nYou are Dig, a social work & sociology assistant. Draft a classroom-appropriate peer response that: greets ${name} by name, ties their points back to the week's themes in a clear way, adds one brief piece of evidence or insight (use social work frameworks like strengths-based or systems), and ends with a thoughtful follow-up question. Keep it warm, respectful, and under 180 words. ORIGINAL_POST_TEXT:\n${trimmed}`; }

  // Wire UI
  const pdfFile = el('pdfFile');
  const introText = el('introText');
  const apiKeyInput = el('apiKey');
  const generatePostBtn = el('generatePostBtn');
  const postStatus = el('postStatus');
  const postOutput = el('postOutput');
  const savePostBtn = el('savePostBtn');
  const lensSelect = el('lensSelect');

  const screenshotFile = el('screenshotFile');
  const extractBtn = el('extractBtn');
  const ocrStatus = el('ocrStatus');
  const ocrPreview = el('ocrPreview');
  const detectedName = el('detectedName');
  const detectedQuestion = el('detectedQuestion');
  const generateResponseBtn = el('generateResponseBtn');
  const responseStatus = el('responseStatus');
  const responseOutput = el('responseOutput');
  const saveRespBtn = el('saveRespBtn');

  const clearAllBtn = el('clearAllBtn');
  const exportBtn = el('exportBtn');

  // Detect whether OCR (Tesseract) is available in this context
  const ocrAvailable = !!(window.Tesseract);

  // Apply initial mode: show only relevant section for clarity
  try {
    if (_initMode === 'reply') { const pdfSec = el('section-pdf'); if (pdfSec) pdfSec.style.display = 'none'; const scSec = el('section-screenshot'); if (scSec) scSec.style.display = 'block'; setTimeout(()=>{ try { el('screenshotFile')?.focus(); } catch(e){} }, 250);
    } else if (_initMode === 'post') { const pdfSec = el('section-pdf'); if (pdfSec) pdfSec.style.display = 'block'; const scSec = el('section-screenshot'); if (scSec) scSec.style.display = 'none'; setTimeout(()=>{ try { el('pdfFile')?.focus(); } catch(e){} }, 250); }
  } catch (e) { }

  generatePostBtn.addEventListener('click', async ()=>{
    try{
      setStatus('postStatus','Extracting PDF...');
      const f = pdfFile.files && pdfFile.files[0];
      if(!f){ setStatus('postStatus','Please choose a PDF file.'); return; }
      const pdfText = await extractTextFromPdf(f);
      setStatus('postStatus','Calling model... (may take a few seconds)');
      const lens = lensSelect.value;
      // Include selected shared KB snippets (if enabled). If none selected, fall back to recent shared entries.
      const includeShared = (el('sharedKbIncludeToggle') && el('sharedKbIncludeToggle').checked);
      let sharedText = '';
      if (includeShared) {
        try { sharedText = getSelectedSharedText(8); } catch (e) { sharedText = ''; }
        if (!sharedText) {
          try { setStatus('postStatus','Loading shared knowledge...'); const sharedKB = await loadSharedKB(); const clsHint = _params.get('cls') || ''; const sc = buildSharedContextText(sharedKB, clsHint, 6); if (sc && sc.count > 0) { sharedText = sc.text; setStatus('postStatus', `Including ${sc.count} shared KB entries...`, 2000); } } catch (e) { }
        }
      }

      const basePrompt = buildPostPrompt(pdfText, introText.value || '', lens);
      const prompt = (sharedText && sharedText.trim().length) ? (`SHARED_KB_CONTEXT:\n${sharedText}\n\n` + basePrompt) : basePrompt;
      const key = apiKeyInput.value.trim();
      const persona = 'Dig — social work and sociology assistant';
      const systemInstruction = `Tone: professional yet conversational. Use sociological lenses like Systems Theory and Strengths-Based. Keep it classroom-appropriate.`;
      const out = await invokeModel(persona, prompt, key, systemInstruction);
      postOutput.innerText = out.trim();
      show(postOutput); savePostBtn.style.display='inline-block';
      setStatus('postStatus','Ready');
      savePostBtn.onclick = ()=>{ addEntry({ id:uid(), type:'post', createdAt:now(), headerText:'Yellowdig Post • ' + (lens||''), contentText: postOutput.innerText, source:'pdf' }); setStatus('saveMsg','Post saved'); };
    }catch(e){ console.error(e); setStatus('postStatus','Error: '+ (e.message || e)); }
  });

  extractBtn.addEventListener('click', async ()=>{
    try{
      const f = screenshotFile.files && screenshotFile.files[0];
      if(!f){ setStatus('ocrStatus','Choose an image first'); return; }
      if (!ocrAvailable) {
        setStatus('ocrStatus','OCR is not available in this context. Please paste the post text into the Detected Question field manually.');
        // show preview area for manual edit
        show(ocrPreview); show(el('saveRespBtn'));
        // attempt to create a simple placeholder
        detectedName.value = detectedName.value || '';
        detectedQuestion.value = detectedQuestion.value || '';
        ocrPreview.dataset.raw = '';
        return;
      }
      setStatus('ocrStatus','Running OCR...');
      // Tesseract recognizes from file blob
      const worker = Tesseract.createWorker({ logger:m=>{} });
      await worker.load(); await worker.loadLanguage('eng'); await worker.initialize('eng');
      const { data } = await worker.recognize(f);
      await worker.terminate();
      const text = data && data.text ? data.text : '';
      const parsed = parseNameAndQuestion(text);
      detectedName.value = parsed.name || '';
      detectedQuestion.value = parsed.question || '';
      show(ocrPreview); show(el('saveRespBtn'));
      ocrPreview.dataset.raw = text;
      setStatus('ocrStatus','OCR complete — review fields before generating.');
    }catch(e){ console.error(e); setStatus('ocrStatus','OCR failed: '+ (e.message||e)); }
  });

  generateResponseBtn.addEventListener('click', async ()=>{
    try{
      setStatus('responseStatus','Calling model...');
      const name = detectedName.value.trim();
      const question = detectedQuestion.value.trim();
      const ocrRaw = ocrPreview.dataset.raw || '';
      if(!question){ setStatus('responseStatus','Please enter the question to respond to.'); return; }
      // Include selected shared KB snippets (if enabled). If none selected, fall back to recent shared entries.
      const includeSharedR = (el('sharedKbIncludeToggle') && el('sharedKbIncludeToggle').checked);
      let sharedTextR = '';
      if (includeSharedR) {
        try { sharedTextR = getSelectedSharedText(8); } catch (e) { sharedTextR = ''; }
        if (!sharedTextR) {
          try { setStatus('responseStatus','Loading shared knowledge...'); const sharedKB = await loadSharedKB(); const clsHint = _params.get('cls') || ''; const sc = buildSharedContextText(sharedKB, clsHint, 6); if (sc && sc.count > 0) { sharedTextR = sc.text; setStatus('responseStatus', `Including ${sc.count} shared KB entries...`, 2000); } } catch (e) { }
        }
      }
      const baseRespPrompt = buildResponsePrompt(name || 'Classmate', question, ocrRaw);
      const prompt = (sharedTextR && sharedTextR.trim().length) ? (`SHARED_KB_CONTEXT:\n${sharedTextR}\n\n` + baseRespPrompt) : baseRespPrompt;
      const key = apiKeyInput.value.trim();
      const persona = 'Dig — social work and sociology assistant';
      const sys = 'Tone: warm, respectful, classroom-appropriate. Greet the classmate by name and end with a follow-up question.';
      const out = await invokeModel(persona, prompt, key, sys);
      responseOutput.innerText = `Question: ${question} | Name: ${name}\n\n` + out.trim();
      show(responseOutput); saveRespBtn.style.display='inline-block';
      setStatus('responseStatus','Ready');
      saveRespBtn.onclick = ()=>{ addEntry({ id:uid(), type:'response', createdAt:now(), headerText:`Question: ${question} | Name: ${name}`, contentText: out.trim(), source:'screenshot', rawSourceText:ocrRaw }); setStatus('saveMsg','Response saved'); };
    }catch(e){ console.error(e); setStatus('responseStatus','Error: '+(e.message||e)); }
  });

  // Export
  exportBtn.addEventListener('click', ()=>{
    const arr = loadEntries();
    const htmlParts = ['<!doctype html>','<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Dig Response Tool Export</title>',
      '<style>body{font-family:Arial,Helvetica,sans-serif;margin:18px;background:#fff;color:#0f172a}pre{white-space:pre-wrap;font-size:14px;padding:10px;border:1px solid #e6eef6;background:#f8fafc;border-radius:8px}</style></head><body>',
      '<h2>Dig — Exported Responses</h2>','<div>Use the "Click to Copy" buttons to copy each block into Canvas.</div>'];
    arr.forEach(en=>{
      htmlParts.push(`<h3>${(en.type==='post')? 'Yellowdig Post' : 'Peer Response'} • ${new Date(en.createdAt).toLocaleString()}</h3>`);
      htmlParts.push(`<div><button onclick="(function(t){navigator.clipboard.writeText(t)})('${escapeHtmlForInline(en.headerText||'')}')">Click to Copy Header</button></div>`);
      htmlParts.push(`<pre>${escapeHtml(en.contentText||'')}</pre>`);
      htmlParts.push('<hr/>');
    });
    htmlParts.push('</body></html>');
    const blob = new Blob([htmlParts.join('\n')], {type:'text/html'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='dig-responses.html'; a.click(); URL.revokeObjectURL(url);
    setStatus('saveMsg','Export downloaded');
  });

  clearAllBtn.addEventListener('click', ()=>{ if(confirm('Clear all saved responses?')){ clearEntries(); setStatus('saveMsg','Cleared'); } });

  function escapeHtmlForInline(s){ return String(s||'').replace(/'/g,"\\'").replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/\r/g,''); }
  function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  // initial render
  try { loadAndRenderSharedKB(); } catch (e) {}
  renderSavedList();
  try {
    const rbtn = el('sharedKbRefresh'); if (rbtn) rbtn.onclick = () => { loadAndRenderSharedKB(); setStatus('saveMsg','Shared KB refreshed'); };
    const selAll = el('sharedKbSelectAll'); if (selAll) selAll.onclick = () => { const list = el('sharedKbList'); if (!list) return; const cbs = list.querySelectorAll('.shared-kb-checkbox'); const ids = []; cbs.forEach(cb => { cb.checked = true; ids.push(cb.dataset.id); }); saveSelectedSharedIds(ids); setStatus('saveMsg','Selected all'); };
    const clearBtn = el('sharedKbClear'); if (clearBtn) clearBtn.onclick = () => { const list = el('sharedKbList'); if (!list) return; const cbs = list.querySelectorAll('.shared-kb-checkbox'); cbs.forEach(cb => cb.checked = false); saveSelectedSharedIds([]); setStatus('saveMsg','Cleared selection'); };
  } catch (e) { }

});
