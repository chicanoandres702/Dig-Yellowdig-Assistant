document.addEventListener('DOMContentLoaded', () => {
    // Automatically open the Mission Control dashboard in a new tab
    chrome.tabs.create({ url: chrome.runtime.getURL("web-assistant.html") });
    
    // Close the popup window immediately so it feels seamless
    window.close();
});