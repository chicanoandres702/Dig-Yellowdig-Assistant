document.addEventListener('DOMContentLoaded', function() {
    const keyInput = document.getElementById('apiKey');
    const apiSelect = document.getElementById('apiSelect');
    const saveBtn = document.getElementById('saveBtn');

    chrome.storage.local.get(['gemini_api_key', 'dig_ai_backend'], (result) => {
        if (result.gemini_api_key) keyInput.value = result.gemini_api_key;
        if (result.dig_ai_backend) apiSelect.value = result.dig_ai_backend;
    });

    saveBtn.onclick = () => {
        chrome.storage.local.set({
            gemini_api_key: keyInput.value,
            dig_ai_backend: apiSelect.value
        }, () => {
            saveBtn.innerText = "Saved!";
            setTimeout(() => { saveBtn.innerText = "Save Settings"; }, 2000);
        });
    };
});
