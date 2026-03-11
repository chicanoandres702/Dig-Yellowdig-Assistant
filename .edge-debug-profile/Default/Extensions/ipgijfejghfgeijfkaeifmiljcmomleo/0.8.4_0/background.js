// Background script for Smart Cookie Editor
// This is a standalone version without imports

// Simple notification service
const notificationService = {
  isWatching: false,
  previousCookies: new Map(),
  cookieChangeHandler: null,

  // Known tracking cookie patterns
  trackingPatterns: [
    /_ga/, /_gid/, /_gat/, /gtag/, /gtm/,
    /_fbp/, /_fbc/, /fbclid/,
    /utm_/, /_track/, /analytics/, /pixel/, /beacon/,
    /_adnxs/, /doubleclick/, /adsystem/, /googlesyndication/,
    /mixpanel/, /hotjar/, /segment/, /amplitude/
  ],

  showToast(toast) {
    // Send message to content script to show toast on the page
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        const toastMessage = {
          type: 'SHOW_TOAST',
          toast: {
            ...toast,
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
          }
        };
        chrome.tabs.sendMessage(tabs[0].id, toastMessage);
      }
    });
  },

  isTrackingCookie(cookie) {
    const cookieName = cookie.name.toLowerCase();
    const cookieDomain = cookie.domain.toLowerCase();
    
    // Check name patterns
    if (this.trackingPatterns.some(pattern => pattern.test(cookieName))) {
      return true;
    }
    
    // Check domain patterns for known tracking domains
    const trackingDomains = [
      'doubleclick.net', 'google-analytics.com', 'googletagmanager.com',
      'facebook.com', 'connect.facebook.net', 'scorecardresearch.com',
      'amazon-adsystem.com', 'adsystem.amazon.com', 'googlesyndication.com'
    ];
    
    return trackingDomains.some(domain => cookieDomain.includes(domain));
  },

  handleCookieChange(notifyChanges, notifyTracking, changeTypes, changeInfo) {
    if (!this.isWatching) return;
    
    const { cookie, removed } = changeInfo;
    const key = `${cookie.name}|${cookie.domain}|${cookie.path}`;
    
    if (removed) {
      if (notifyChanges && changeTypes.includes('removed') && this.previousCookies.has(key)) {
        this.showToast({
          type: 'info',
          title: 'Cookie Removed',
          message: `Cookie "${cookie.name}" from ${cookie.domain} was deleted`,
          duration: 3000
        });
      }
      this.previousCookies.delete(key);
    } else {
      const wasNew = !this.previousCookies.has(key);
      const previousCookie = this.previousCookies.get(key);
      
      if (wasNew) {
        if (notifyChanges && changeTypes.includes('added')) {
          this.showToast({
            type: 'info',
            title: 'Cookie Added',
            message: `New cookie "${cookie.name}" from ${cookie.domain}`,
            duration: 3000
          });
        }
        
        if (notifyTracking && this.isTrackingCookie(cookie)) {
          this.showToast({
            type: 'warning',
            title: 'Tracking Cookie Detected',
            message: `Tracking cookie "${cookie.name}" from ${cookie.domain}`,
            duration: 5000
          });
        }
      } else if (previousCookie && previousCookie.value !== cookie.value && notifyChanges && changeTypes.includes('modified')) {
        this.showToast({
          type: 'info',
          title: 'Cookie Updated',
          message: `Cookie "${cookie.name}" value changed`,
          duration: 3000
        });
      }
      
      this.previousCookies.set(key, cookie);
    }
  },

  async startWatching(notifyChanges, notifyTracking, changeTypes = ['added', 'modified']) {
    if (this.isWatching) return;
    
    this.isWatching = true;
    
    // Initial cookie snapshot
    const allCookies = await chrome.cookies.getAll({});
    this.previousCookies.clear();
    allCookies.forEach(cookie => {
      const key = `${cookie.name}|${cookie.domain}|${cookie.path}`;
      this.previousCookies.set(key, cookie);
    });
    
    // Use chrome.cookies.onChanged listener for real-time updates
    this.cookieChangeHandler = (changeInfo) => {
      this.handleCookieChange(notifyChanges, notifyTracking, changeTypes, changeInfo);
    };
    chrome.cookies.onChanged.addListener(this.cookieChangeHandler);
  },

  stopWatching() {
    this.isWatching = false;
    
    if (this.cookieChangeHandler) {
      chrome.cookies.onChanged.removeListener(this.cookieChangeHandler);
      this.cookieChangeHandler = null;
    }
  }
};

// Initialize background script
async function initializeNotificationWatcher() {
  try {
    // Load settings from storage
    const result = await chrome.storage.sync.get(['cookie-editor-pro-settings']);
    const settings = result['cookie-editor-pro-settings'] || {};
    
    // Start notification watcher if enabled
    if (settings.notifyChanges || settings.notifyTracking) {
      notificationService.startWatching(settings.notifyChanges, settings.notifyTracking, settings.notifyChangeTypes || ['added', 'modified']);
    }
  } catch (error) {
    console.error('Smart Cookie Editor: Error initializing notification watcher:', error);
  }
}

// Startup and install listeners
chrome.runtime.onStartup.addListener(async () => {
  await initializeNotificationWatcher();
});

chrome.runtime.onInstalled.addListener(async () => {
  await initializeNotificationWatcher();
});

// Listen for settings changes
chrome.storage.onChanged.addListener(async (changes) => {
  const settingsKey = 'cookie-editor-pro-settings';
  if (changes[settingsKey]) {
    const newSettings = changes[settingsKey].newValue;
    if (newSettings) {
      // Update notification watcher based on new settings
      notificationService.stopWatching();
      if (newSettings.notifyChanges || newSettings.notifyTracking) {
        notificationService.startWatching(newSettings.notifyChanges, newSettings.notifyTracking, newSettings.notifyChangeTypes || ['added', 'modified']);
      }
    }
  }
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'START_NOTIFICATION_WATCHER') {
    notificationService.startWatching(message.notifyChanges, message.notifyTracking, message.notifyChangeTypes || ['added', 'modified']);
    sendResponse({ success: true });
  } else if (message.type === 'STOP_NOTIFICATION_WATCHER') {
    notificationService.stopWatching();
    sendResponse({ success: true });
  }
});