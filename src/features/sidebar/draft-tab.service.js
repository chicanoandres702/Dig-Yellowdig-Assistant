/**
 * Draft Tab: Victoria's Academic Social Work Assistant.
 */
function renderDraftTab(container) {
    const kb = getKBSources();
    let togglesHtml = '<div style="margin-bottom:10px;"><label style="font-size:12px;font-weight:bold;color:#10b981;">Context Sources</label>';
    if (kb.length === 0) {
        togglesHtml += '<p style="font-size:11px;color:#888;">No KB sources yet.</p>';
    } else {
        kb.forEach(src => {
            togglesHtml += `<label style="display:flex;align-items:center;gap:6px;font-size:11px;color:#334155;margin:4px 0;cursor:pointer;">
        <input type="checkbox" class="dig-kb-toggle" data-cls="${src.cls}" data-topic="${src.topic}" checked style="accent-color:#10b981;">
        ${src.cls} / ${src.topic} (${src.count})</label>`;
        });
    }
    togglesHtml += '</div>';

    container.innerHTML = `<div style="display:flex;flex-direction:column;height:100%;">
    <p style="font-size:13px;font-weight:bold;color:#064e3b;margin:0 0-10px;">Hi Victoria Alethia Enciso!</p>
    ${togglesHtml}
    <label style="font-size:11px;font-weight:bold;color:#064e3b;margin-bottom:4px;">Paper Title</label>
    <input type="text" id="dig-draft-title" placeholder="Title..." style="width:100%;padding:6px;border:1px solid #e2e8f0;border-radius:6px;margin-bottom:8px;font-size:12px;">
    <textarea id="dig-draft-prompt" placeholder="Requirements..." style="width:100%;min-height:50px;border:1px solid #e2e8f0;border-radius:6px;padding:8px;font-size:13px;resize:vertical;box-sizing:border-box;margin-bottom:8px;"></textarea>
    <div style="display:flex;gap:4px;margin-bottom:8px;">
      <button id="dig-draft-gen" style="flex:1.5;background:#10b981;color:white;border:none;border-radius:6px;padding:8px;cursor:pointer;font-size:12px;font-weight:bold;">✨ Generate</button>
      <button id="dig-draft-ref" style="flex:1;background:#8b5cf6;color:white;border:none;border-radius:6px;padding:8px;cursor:pointer;font-size:11px;font-weight:bold;">🪄 Refine</button>
      <button id="dig-draft-shield" style="flex:1;background:#f59e0b;color:white;border:none;border-radius:6px;padding:8px;cursor:pointer;font-size:11px;font-weight:bold;" title="Bypass Pangram Detection">🛡️ Humanize</button>
      <button id="dig-draft-cp" style="flex:1;background:#3b82f6;color:white;border:none;border-radius:6px;padding:8px;cursor:pointer;font-size:11px;font-weight:bold;">📋 Copy</button>
    </div>
    <div id="dig-draft-out" style="flex:1;min-height:100px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px;font-size:12px;line-height:1.5;overflow-y:auto;color:#334155;">Ready for your input.</div>
    <div style="margin-top:10px;padding:8px;background:#fff1f2;border:1px solid #fecaca;border-radius:6px;font-size:10px;">
      <b>⚠️ INTEGRITY:</b> Fact-check citations. Rewrite sentences to ensure your unique student voice.
    </div>
  </div>`;

    document.getElementById('dig-draft-gen').onclick = async () => {
        const prompt = document.getElementById('dig-draft-prompt').value;
        const title = document.getElementById('dig-draft-title').value;
        if (!prompt) return;
        const out = document.getElementById('dig-draft-out');
        out.innerText = 'Generating Victoria\'s Draft...';
        const context = buildFilteredKBContext(container);
        const result = await generateContent(ACADEMIC_SYSTEM_PROMPT, `TITLE: ${title}\nContext:\n${context}\n\nPrompt: ${prompt}`, localStorage.getItem('gemini_api_key') || DEFAULT_API_KEY);
        out.innerText = result;
    };

    document.getElementById('dig-draft-ref').onclick = async () => {
        const text = document.getElementById('dig-draft-out').innerText;
        if (text.length < 10) return;
        const out = document.getElementById('dig-draft-out');
        out.innerText = 'Polishing grammar and flow...';
        const result = await generateContent('Professional academic editor. Fix all grammar errors, improve flow, ensure informal yet scholarly tone. Keep citations.', text, localStorage.getItem('gemini_api_key') || DEFAULT_API_KEY);
        out.innerText = result;
    };

    document.getElementById('dig-draft-shield').onclick = async () => {
        const text = document.getElementById('dig-draft-out').innerText;
        if (text.length < 50) return;
        const out = document.getElementById('dig-draft-out');
        const originalBg = out.style.background;
        out.style.background = '#fffbeb';
        out.innerText = '🛡️ Applying AI Detection Shield...';
        const result = await humanizeText(text, localStorage.getItem('gemini_api_key') || DEFAULT_API_KEY);
        out.innerText = result;
        out.style.background = '#f0fdf4'; // Light green for protected
        const btn = document.getElementById('dig-draft-shield');
        btn.innerText = '🛡️ Protected';
        setTimeout(() => { btn.innerText = '🛡️ Humanize'; out.style.background = originalBg; }, 3000);
    };

    document.getElementById('dig-draft-cp').onclick = async () => {
        await navigator.clipboard.writeText(document.getElementById('dig-draft-out').innerText);
        const btn = document.getElementById('dig-draft-cp'); btn.innerText = '✅ Saved';
        setTimeout(() => btn.innerText = '📋 Copy', 2000);
    };
}
