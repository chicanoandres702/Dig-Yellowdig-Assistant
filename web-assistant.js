/**
 * Entry point for the paper generation UI.
 */

document.addEventListener('DOMContentLoaded', () => {
  const generateBtn = document.getElementById('generatePaperBtn');
  if (generateBtn) {
    generateBtn.addEventListener('click', async () => {
      const promptInput = document.getElementById('promptInput');
      const prompt = promptInput ? promptInput.value : "";
      const apiKey = localStorage.getItem('gemini_api_key') || "";

      // generateContent is available globally
      const result = await generateContent("Victoria's SW Paper Assistant", prompt, apiKey);

      const output = document.getElementById('paperOutput');
      if (output) output.innerHTML = result;
    });
  }

  const kbBtn = document.getElementById('viewKbBtn');
  if (kbBtn) kbBtn.addEventListener('click', showKnowledgeBase);
});
