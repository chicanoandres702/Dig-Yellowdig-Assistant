/**
 * Draft Generation Service: Core AI logic for creating posts and responses.
 */


async function generateDraft(mode, container) {
    const out = document.getElementById('dig-draft-out');
    if (out) {
        out.innerHTML = "<div style='color:var(--sap-400);font-style:italic;'>\"Dig\" is constructing your response tool...</div>";
        out.style.color = "var(--text-main)";
    }

    const context = await buildFilteredKBContext(container);
    const mainPrompt = (document.getElementById('dig-draft-mainPrompt') && document.getElementById('dig-draft-mainPrompt').value.trim()) || '';
    const status = document.getElementById('dig-draft-postStatus');
    const detName = (document.getElementById('dig-detectedName') && document.getElementById('dig-detectedName').value.trim()) || 'Classmate';
    const detQuest = (document.getElementById('dig-detectedQuestion') && document.getElementById('dig-detectedQuestion').value.trim()) || '';

    if (status) status.innerText = 'Analyzing context...';

    let systemLabel = 'Dig — Social Work & Sociology Assistant';
    let prompt = '';
    let toneNote = 'Professional yet conversational, sociological, and insight-driven.';

    if (mode === 'academic') {
        prompt = `ACADEMIC_ARTIFACT: Professional, scholarly, and analytical.
CONTEXT: ${context}
REQUEST: ${mainPrompt}
Generate a formal academic reflection or analysis. Use PLAIN TEXT for this mode.`;
        toneNote = 'Formal, scholarly, and objective.';
    } else if (mode === 'response') {
        prompt = `PEER_RESPONSE_TOOL:
CONTEXT: ${context}
ORIGINAL_POST: ${mainPrompt}
NAME: ${detName}
QUESTION: ${detQuest}

1. Create a header: "Question: ${detQuest || 'Class Discussion'} | Name: ${detName}".
2. Greet them by name.
3. Tie their points to course themes and context provided.
4. End with an insightful follow-up question.
Return as a single HTML "Response Tool" with a "Click to Copy" button.`;
    } else { // Yellowdig Post
        prompt = `YELLOWDIG_POST_TOOL:
CONTEXT: ${context}
INTRO_SCENARIO: ${mainPrompt}

1. Connect PDF data (poverty rates, economic trends, etc. found in context) to the scenario.
2. Apply sociological lenses: Systems Theory or Strengths-Based Perspective.
3. Keep it engaging and concise.
Return as a single HTML "Response Tool" with a "Click to Copy" button.`;
    }

    if (status) status.innerText = 'Consulting Dig...';
    try {
        const outText = await invokeAI(systemLabel, prompt, localStorage.getItem('gemini_api_key'), toneNote);
        if (out) {
            // If it's HTML, render it. If not (academic), innerText it.
            if (outText.trim().startsWith('<')) {
                out.innerHTML = outText.trim();
            } else {
                out.innerText = outText.trim();
            }
            out.style.background = "var(--bg-panel)";
        }
        if (status) status.innerText = 'Ready';
        return outText.trim();
    } catch (e) {
        if (out) out.innerHTML = "<div style='color:var(--danger);'>Error consulting Dig: " + e.message + "</div>";
        if (status) status.innerText = 'Error';
    }
}
