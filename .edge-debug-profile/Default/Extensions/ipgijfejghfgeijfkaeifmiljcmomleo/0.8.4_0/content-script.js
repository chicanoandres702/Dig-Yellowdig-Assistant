// Content script to show toasts on web pages
// This is a standalone version without TypeScript or imports

class PageToastManager {
  constructor() {
    this.toastContainer = null;
    this.toasts = new Map();
    this.toastQueue = [];
    this.activeToasts = new Set(); // Track active toast messages to prevent duplicates
    this.maxConcurrentToasts = 8;
    this.createContainer();
    this.injectStyles();
  }

  createContainer() {
    this.toastContainer = document.createElement('div');
    this.toastContainer.id = 'cookie-editor-toast-container';
    this.toastContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 2147483647;
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-width: 320px;
      pointer-events: none;
      z-index: 2147483647 !important;
    `;
    document.body.appendChild(this.toastContainer);
  }

  injectStyles() {
    const styleId = 'cookie-editor-toast-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .cookie-editor-toast {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 12px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        display: flex;
        align-items: flex-start;
        gap: 8px;
        cursor: pointer;
        transform: translateX(100%);
        opacity: 0;
        transition: all 0.3s ease;
        border-left: 4px solid #2563eb;
        pointer-events: auto;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
        font-size: 14px;
        line-height: 1.5;
      }

      .cookie-editor-toast.visible {
        transform: translateX(0);
        opacity: 1;
      }

      .cookie-editor-toast.leaving {
        transform: translateX(100%);
        opacity: 0;
      }

      .cookie-editor-toast.success {
        border-left-color: #10b981;
      }

      .cookie-editor-toast.warning {
        border-left-color: #f59e0b;
      }

      .cookie-editor-toast.error {
        border-left-color: #ef4444;
      }

      .cookie-editor-toast.info {
        border-left-color: #2563eb;
      }

      .cookie-editor-toast-icon {
        font-size: 16px;
        flex-shrink: 0;
        margin-top: 2px;
      }

      .cookie-editor-toast-content {
        flex: 1;
        min-width: 0;
      }

      .cookie-editor-toast-title {
        font-size: 14px;
        font-weight: 600;
        color: #1e293b;
        margin-bottom: 4px;
      }

      .cookie-editor-toast-message {
        font-size: 12px;
        color: #64748b;
        line-height: 1.4;
      }

      .cookie-editor-toast-close {
        background: none;
        border: none;
        color: #94a3b8;
        cursor: pointer;
        padding: 0;
        font-size: 12px;
        width: 16px;
        height: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: all 0.2s ease;
        flex-shrink: 0;
      }

      .cookie-editor-toast-close:hover {
        background: #f1f5f9;
        color: #1e293b;
      }

      @media (max-width: 480px) {
        #cookie-editor-toast-container {
          left: 10px;
          right: 10px;
          max-width: none;
        }
      }
    `;
    document.head.appendChild(style);
  }

  showToast(toast) {
    if (!this.toastContainer) return;

    // Create unique key for duplicate detection
    const toastKey = `${toast.title}:${toast.message}`;
    
    // Check if duplicate toast is already active
    if (this.activeToasts.has(toastKey)) {
      return; // Skip duplicate
    }

    // If at max capacity, queue the toast
    if (this.toasts.size >= this.maxConcurrentToasts) {
      this.toastQueue.push(toast);
      return;
    }

    this.displayToast(toast);
  }

  displayToast(toast) {
    const toastKey = `${toast.title}:${toast.message}`;
    this.activeToasts.add(toastKey);

    const toastElement = document.createElement('div');
    toastElement.className = `cookie-editor-toast ${toast.type}`;
    
    // Create icon element
    const iconElement = document.createElement('div');
    iconElement.className = 'cookie-editor-toast-icon';
    iconElement.textContent = this.getIcon(toast.type);
    
    // Create content container
    const contentElement = document.createElement('div');
    contentElement.className = 'cookie-editor-toast-content';
    
    // Create title element
    const titleElement = document.createElement('div');
    titleElement.className = 'cookie-editor-toast-title';
    titleElement.textContent = toast.title;
    
    // Create message element
    const messageElement = document.createElement('div');
    messageElement.className = 'cookie-editor-toast-message';
    messageElement.textContent = toast.message;
    
    // Create close button
    const closeButton = document.createElement('button');
    closeButton.className = 'cookie-editor-toast-close';
    closeButton.textContent = '✕';
    
    // Assemble the toast
    contentElement.appendChild(titleElement);
    contentElement.appendChild(messageElement);
    toastElement.appendChild(iconElement);
    toastElement.appendChild(contentElement);
    toastElement.appendChild(closeButton);

    let timeoutId = null;
    
    const removeToast = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      toastElement.classList.add('leaving');
      setTimeout(() => {
        if (toastElement.parentNode) {
          toastElement.parentNode.removeChild(toastElement);
        }
        this.toasts.delete(toast.id);
        this.activeToasts.delete(toastKey);
        
        // Process queue
        this.processQueue();
      }, 300);
    };

    const startTimeout = () => {
      if (toast.duration !== 0) {
        timeoutId = setTimeout(removeToast, toast.duration || 4000);
      }
    };

    const pauseTimeout = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    // Hover pause functionality
    toastElement.addEventListener('mouseenter', pauseTimeout);
    toastElement.addEventListener('mouseleave', startTimeout);

    closeButton.addEventListener('click', removeToast);
    toastElement.addEventListener('click', removeToast);

    this.toastContainer.appendChild(toastElement);
    this.toasts.set(toast.id, toastElement);

    // Trigger animation
    setTimeout(() => {
      toastElement.classList.add('visible');
    }, 10);

    // Start auto-remove timer
    startTimeout();
  }

  processQueue() {
    if (this.toastQueue.length > 0 && this.toasts.size < this.maxConcurrentToasts) {
      const nextToast = this.toastQueue.shift();
      this.displayToast(nextToast);
    }
  }

  getIcon(type) {
    switch (type) {
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      default:
        return 'ℹ️';
    }
  }
}

// Initialize toast manager
const toastManager = new PageToastManager();

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SHOW_TOAST') {
    toastManager.showToast(message.toast);
    sendResponse({ success: true });
    return true; // Keep the message channel open for async response
  }
});