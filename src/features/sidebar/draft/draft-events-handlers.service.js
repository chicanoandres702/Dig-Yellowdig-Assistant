/**
 * Draft Events Handlers: Extracted event handlers for the Draft Tab.
 */

async function handleDraftRefinement() {
    const text = document.getElementById('dig-draft-out').innerText;
    if (text.length < 10) return;
    const out = document.getElementById('dig-draft-out');
    out.innerText = 'Polishing grammar and flow...';
    const result = await invokeAI('Professional academic editor. Fix all grammar errors, improve flow, ensure informal yet scholarly tone. Keep citations.', text, localStorage.getItem('gemini_api_key'));
    out.innerText = result;
}

async function handleDraftHumanize() {
    const text = document.getElementById('dig-draft-out').innerText;
    if (text.length < 50) return;
    const out = document.getElementById('dig-draft-out');
    const originalBg = out.style.background;
    out.style.background = '#fffbeb';
    out.innerText = '🛡️ Applying AI Detection Shield...';
    const result = window.humanizeText ? await window.humanizeText(text, localStorage.getItem('gemini_api_key')) : text;
    out.innerText = result;
    out.style.background = '#f0fdf4';
    const btn = document.getElementById('dig-draft-shield');
    btn.innerText = '🛡️ Protected';
    setTimeout(() => { btn.innerText = '🛡️ Humanize'; out.style.background = originalBg; }, 3000);
}

async function handleDraftYellowdigSend() {
    try {
        const modeEl = document.getElementById('dig-draft-modeSelect');
        const mode = modeEl ? (modeEl.value || 'post') : 'post';
        const outEl = document.getElementById('dig-draft-out');
        if (!outEl || !outEl.innerText || outEl.innerText.trim().length < 20) {
            await generateDraft(mode, document.getElementById('dig-sidebar-container'));
        }
        const content = (outEl && outEl.innerText) ? outEl.innerText : '';
        const btn = document.getElementById('dig-draft-cp');
        if (content && content.trim().length > 0) {
            if (window.copyAndTryInsertFromYellowdigDOM) await window.copyAndTryInsertFromYellowdigDOM(content, btn);
        } else {
            if (btn) { const orig = btn.innerText; btn.innerText = 'No content'; setTimeout(() => btn.innerText = orig, 1500); }
        }
    } catch (e) { console.error(e); }
}

async function handleDraftPostComposer() {
    const outEl = document.getElementById('dig-draft-out');
    let content = (outEl && outEl.innerText) ? outEl.innerText : '';
    if (!content || content.trim().length < 20) {
        await generateDraft('post', document.getElementById('dig-sidebar-container'));
        content = outEl.innerText;
    }
    if (!content || content.trim().length < 5) return;
    if (window.openYellowdigComposer) await window.openYellowdigComposer('post', content);
}

async function handleDraftReplyComposer() {
    const outEl = document.getElementById('dig-draft-out');
    let content = (outEl && outEl.innerText) ? outEl.innerText : '';
    if (!content || content.trim().length < 20) {
        await generateDraft('response', document.getElementById('dig-sidebar-container'));
        content = outEl.innerText;
    }
    if (!content || content.trim().length < 5) return;
    if (window.openYellowdigComposer) await window.openYellowdigComposer('reply', content);
}

/**
 * Handle OCR: Extracts text from a screenshot file using Gemini Vision.
 */
async function handleOCR() {
    const fileInp = document.getElementById('dig-draft-screenshotFile');
    const status = document.getElementById('dig-draft-ocrStatus');
    const nameInp = document.getElementById('dig-detectedName');
    const questionInp = document.getElementById('dig-detectedQuestion');
    const preview = document.getElementById('dig-draft-ocrPreview');

    if (!fileInp || !fileInp.files || !fileInp.files[0]) {
        if (status) status.innerText = 'No file selected.';
        return;
    }

    const file = fileInp.files[0];
    if (status) status.innerText = 'Extracting text with AI...';

    try {
        const reader = new FileReader();
        const base64Promise = new Promise((resolve) => {
            reader.onload = () => resolve(reader.result.split(',')[1]);
        });
        reader.readAsDataURL(file);
        const base64Data = await base64Promise;

        const mimeType = file.type || 'image/png';
        const imageParts = [{ inlineData: { mimeType, data: base64Data } }];

        const prompt = "Perform high-accuracy OCR. Extract text exactly. Wrap hints like NAME: [name] QUESTION: [question]";
        const ocrText = await invokeAI("OCR Specialist", prompt, localStorage.getItem('gemini_api_key'), "Return raw text plus name/question hints.", imageParts);

        if (status) status.innerText = 'Text extracted!';
        if (preview) preview.style.display = 'block';

        const { name, question } = typeof parseNameAndQuestion === 'function' ? parseNameAndQuestion(ocrText) : { name: '', question: '' };
        if (nameInp) nameInp.value = name;
        if (questionInp) questionInp.value = question;

        const mainPrompt = document.getElementById('dig-draft-mainPrompt');
        if (mainPrompt && !mainPrompt.value.trim()) {
            mainPrompt.value = ocrText.replace(/NAME:.*?\n/g, '').replace(/QUESTION:.*?\n/g, '').trim();
        }
    } catch (err) {
        if (status) status.innerText = 'OCR Error: ' + err.message;
        console.error(err);
    }
}
