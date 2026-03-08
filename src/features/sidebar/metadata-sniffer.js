/**
 * Metadata Sniffer: Injected into the page world to intercept JSON metadata.
 * Communicates back to the extension via window.postMessage.
 */
(function () {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
        const response = await originalFetch(...args);
        const url = args[0] instanceof Request ? args[0].url : args[0];
        if (url.includes('books.json') || url.includes('pages.json')) {
            const clone = response.clone();
            clone.json().then(data => {
                window.postMessage({ type: 'DIG_METADATA_SNIFFED', url, data }, '*');
            });
        }
        return response;
    };

    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url) {
        this._url = url;
        return originalOpen.apply(this, arguments);
    };

    const originalSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function () {
        this.addEventListener('load', function () {
            if (this._url && (this._url.includes('books.json') || this._url.includes('pages.json'))) {
                try {
                    const data = JSON.parse(this.responseText);
                    window.postMessage({ type: 'DIG_METADATA_SNIFFED', url: this._url, data }, '*');
                } catch (e) { }
            }
        });
        return originalSend.apply(this, arguments);
    };
})();
