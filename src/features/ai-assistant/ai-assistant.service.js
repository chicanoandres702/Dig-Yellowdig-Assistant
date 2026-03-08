/**
 * Handles communication with the Gemini API for content generation.
 */

async function generateContent(personaPrompt, promptContext, apiKey, systemInstruction) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

    const payload = {
        contents: [{ parts: [{ text: personaPrompt + '\n' + promptContext }] }],
        systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "No content generated.";
    } catch (e) {
        console.error("Gemini API Error:", e);
        return "Error generating content.";
    }
}

/**
 * Humanize text to bypass detectors like Pangram.
 */
async function humanizeText(text, apiKey) {
    digLog('Applying AI detection shield...');
    return await generateContent(
        "Please rewrite this content to bypass AI detection while keeping all citations.",
        text,
        apiKey || localStorage.getItem('gemini_api_key') || DEFAULT_API_KEY,
        AI_HUMANIZER_PROMPT
    );
}

function draftContent(prompt, isNewPost = false) {
    console.log(`Drafting content for: ${prompt}, isNewPost: ${isNewPost}`);
}
