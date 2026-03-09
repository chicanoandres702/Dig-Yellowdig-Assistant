/**
 * KB Save Dialog Picker: Element picking and cross-frame search for the save dialog.
 * Why: The picker/selector logic is a distinct concern from the dialog DOM and confirmation.
 */

function _wireSaveDialogPicker(overlay) {
    try {
        const pickBtn = overlay.querySelector('#dig-savebucket-pick');
        const selectorInput = overlay.querySelector('#dig-savebucket-selector');
        const previewDiv = overlay.querySelector('#dig-savebucket-preview');
        pickBtn.onclick = () => {
            try {
                pickBtn.disabled = true; pickBtn.textContent = 'Picking...';
                startPickingElement(async (selector) => {
                    pickBtn.disabled = false; pickBtn.textContent = '🔎 Pick element';
                    if (!selector) return;
                    try {
                        selectorInput.value = selector;
                        const found = await _findElementAcrossFrames(selector);
                        if (found) { previewDiv.innerHTML = found.html; overlay._pickedContent = { selector, html: found.html, text: found.text }; }
                        else { previewDiv.innerText = 'Selected: ' + selector + '\nPreview not available in this frame.'; overlay._pickedContent = { selector, html: '', text: '' }; }
                    } catch (err) { previewDiv.innerText = 'Error applying selector'; overlay._pickedContent = { selector, html: '', text: '' }; }
                });
            } catch (e) { pickBtn.disabled = false; pickBtn.textContent = '🔎 Pick element'; }
        };
        selectorInput.onchange = selectorInput.onblur = () => {
            (async () => {
                const selector = selectorInput.value && selectorInput.value.trim();
                if (!selector) return;
                try {
                    const found = await _findElementAcrossFrames(selector);
                    if (found) { previewDiv.innerHTML = found.html; overlay._pickedContent = { selector, html: found.html, text: found.text }; }
                    else { previewDiv.innerText = 'No element found for selector: ' + selector; overlay._pickedContent = null; }
                } catch (err) { previewDiv.innerText = 'Invalid selector'; overlay._pickedContent = null; }
            })();
        };
    } catch (e) { console.error('picker wiring failed', e); }
}

/** Why: Searches document + nested iframes for a CSS selector match. */
async function _findElementAcrossFrames(sel) {
    try {
        const tryDoc = (doc) => {
            try { if (!doc) return null; const el = doc.querySelector(sel); if (el) return { html: el.outerHTML || el.innerHTML || '', text: el.innerText || el.textContent || '' }; } catch (e) { }
            return null;
        };
        let res = tryDoc(document);
        if (res) return res;
        const visited = new Set();
        const recurse = (wins) => {
            for (const w of wins) {
                try {
                    if (!w || !w.document) continue;
                    const key = w.location && w.location.href ? w.location.href : Math.random();
                    if (visited.has(key)) continue;
                    visited.add(key);
                    res = tryDoc(w.document);
                    if (res) return res;
                    const childFrames = Array.from(w.document.querySelectorAll('iframe')).map(f => f.contentWindow).filter(Boolean);
                    const found = recurse(childFrames);
                    if (found) return found;
                } catch (e) { }
            }
            return null;
        };
        return recurse(Array.from(document.querySelectorAll('iframe')).map(f => f.contentWindow).filter(Boolean));
    } catch (e) { return null; }
}
