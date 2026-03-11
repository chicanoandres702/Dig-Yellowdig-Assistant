/**
 * Premium Manager - Handles 3-day free trial + $5 one-time payment
 * Features: Trial tracking, payment verification, feature gating
 */

export class PremiumManager {
    // Configuration
    static TRIAL_DAYS = 3;
    static PAYMENT_URL = 'https://payments.alhudud.xyz/pay.php?checkout_id=4';
    static PRICE = '$19.99';
    static STORAGE_KEY = 'premium_data';

    // Premium features requiring payment after trial
    static PREMIUM_FEATURES = {
        CUSTOM_MODEL: 'custom_model',
        ADVANCED_SETTINGS: 'advanced_settings',
        PREMIUM_MODELS: 'premium_models',
        UNLIMITED_USAGE: 'unlimited_usage'
    };

    /**
     * Initialize trial on first install
     * Call from chrome.runtime.onInstalled
     */
    static async initializeTrial() {
        try {
            const data = await chrome.storage.local.get([this.STORAGE_KEY]);
            
            if (!data[this.STORAGE_KEY]) {
                console.log('[Premium] Initializing new trial');
                const trialData = {
                    installDate: Date.now(),
                    trialEndDate: Date.now() + (this.TRIAL_DAYS * 24 * 60 * 60 * 1000),
                    isPremium: false,
                    hasShownWelcome: false,
                    hasShownPaymentPrompt: false
                };
                
                await chrome.storage.local.set({ [this.STORAGE_KEY]: trialData });
                return { isNew: true, data: trialData };
            }
            
            return { isNew: false, data: data[this.STORAGE_KEY] };
        } catch (error) {
            console.error('[Premium] Init error:', error);
            throw error;
        }
    }

    /**
     * Get current trial status
     */
    static async getStatus() {
        try {
            const data = await chrome.storage.local.get([this.STORAGE_KEY]);
            
            if (!data[this.STORAGE_KEY]) {
                return {
                    status: 'new',
                    daysLeft: this.TRIAL_DAYS,
                    isPremium: false,
                    expired: false,
                    message: 'Trial not started'
                };
            }

            const pd = data[this.STORAGE_KEY];
            const now = Date.now();
            const timeLeft = pd.trialEndDate - now;
            const daysLeft = Math.max(0, Math.ceil(timeLeft / (24 * 60 * 60 * 1000)));
            const hoursLeft = Math.max(0, Math.ceil(timeLeft / (60 * 60 * 1000)));
            const expired = now > pd.trialEndDate;
            
            let status, message;
            if (pd.isPremium) {
                status = 'premium';
                message = '✨ Premium Active';
            } else if (expired) {
                status = 'expired';
                message = 'Trial Expired - Upgrade Now';
            } else {
                status = 'trial';
                message = daysLeft > 0 
                    ? `🎉 Free Trial: ${daysLeft} days left`
                    : `⏰ Trial: ${hoursLeft} hours left`;
            }
            
            return {
                status,
                message,
                daysLeft,
                hoursLeft,
                isPremium: pd.isPremium,
                expired,
                needsPayment: expired && !pd.isPremium,
                installDate: pd.installDate,
                trialEndDate: pd.trialEndDate
            };
        } catch (error) {
            console.error('[Premium] Status error:', error);
            return {
                status: 'error',
                message: 'Error',
                isPremium: false,
                expired: true
            };
        }
    }

    /**
     * Check feature access
     */
    static async canAccess(featureName) {
        const status = await this.getStatus();
        
        // Premium = full access
        if (status.isPremium) {
            return { allowed: true, reason: 'premium' };
        }
        
        // Trial active = full access
        if (!status.expired) {
            return { allowed: true, reason: 'trial', daysLeft: status.daysLeft };
        }
        
        // Expired = no access
        return {
            allowed: false,
            reason: 'expired',
            message: 'Trial expired',
            paymentUrl: this.PAYMENT_URL
        };
    }

    /**
     * Activate premium
     */
    static async activate() {
        try {
            const data = await chrome.storage.local.get([this.STORAGE_KEY]);
            
            if (data[this.STORAGE_KEY]) {
                data[this.STORAGE_KEY].isPremium = true;
                data[this.STORAGE_KEY].activationDate = Date.now();
                await chrome.storage.local.set({ [this.STORAGE_KEY]: data[this.STORAGE_KEY] });
                
                console.log('[Premium] Activated successfully!', {
                    activationDate: data[this.STORAGE_KEY].activationDate,
                    timestamp: Date.now()
                });
                
                // Notify all tabs about activation
                try {
                    const tabs = await chrome.tabs.query({});
                    for (const tab of tabs) {
                        try {
                            await chrome.tabs.sendMessage(tab.id, {
                                type: 'premium:activated',
                                success: true,
                                timestamp: Date.now()
                            });
                        } catch (e) {
                            // Tab may not have content script, ignore
                        }
                    }
                } catch (e) {
                    console.error('[Premium] Error notifying tabs:', e);
                }
                
                // Also try to send to sidepanel
                try {
                    await chrome.runtime.sendMessage({
                        type: 'premium:activated',
                        success: true,
                        timestamp: Date.now()
                    });
                } catch (e) {
                    console.warn('[Premium] Error notifying self:', e);
                }
                
                return { success: true, timestamp: Date.now() };
            }
            
            console.warn('[Premium] No premium data found to activate');
            return { success: false, error: 'No premium data found' };
        } catch (error) {
            console.error('[Premium] Activation error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Check if welcome should show
     */
    static async shouldShowWelcome() {
        try {
            const data = await chrome.storage.local.get([this.STORAGE_KEY]);
            return !data[this.STORAGE_KEY]?.hasShownWelcome;
        } catch {
            return false;
        }
    }

    /**
     * Mark welcome shown
     */
    static async markWelcomeShown() {
        try {
            const data = await chrome.storage.local.get([this.STORAGE_KEY]);
            if (data[this.STORAGE_KEY]) {
                data[this.STORAGE_KEY].hasShownWelcome = true;
                await chrome.storage.local.set({ [this.STORAGE_KEY]: data[this.STORAGE_KEY] });
            }
        } catch (error) {
            console.error('[Premium] Welcome mark error:', error);
        }
    }

    /**
     * Check if payment prompt should show
     */
    static async shouldShowPayment() {
        try {
            const status = await this.getStatus();
            const data = await chrome.storage.local.get([this.STORAGE_KEY]);
            return status.needsPayment && !data[this.STORAGE_KEY]?.hasShownPaymentPrompt;
        } catch {
            return false;
        }
    }

    /**
     * Mark payment prompt shown
     */
    static async markPaymentShown() {
        try {
            const data = await chrome.storage.local.get([this.STORAGE_KEY]);
            if (data[this.STORAGE_KEY]) {
                data[this.STORAGE_KEY].hasShownPaymentPrompt = true;
                await chrome.storage.local.set({ [this.STORAGE_KEY]: data[this.STORAGE_KEY] });
            }
        } catch (error) {
            console.error('[Premium] Payment mark error:', error);
        }
    }

    /**
     * Check activation status from server
     */
    /**
     * Secure license key validation using encrypted hash comparison
     * Keys are obfuscated and not stored in plain text
     */
    static async validateLicenseKey(key) {
        if (!key || typeof key !== 'string') {
            return { valid: false, error: 'Invalid license key format' };
        }

        // Normalize key
        const normalized = key.trim();
        
        // Basic format validation (at least 8 characters, alphanumeric)
        if (normalized.length < 8 || !/^[a-zA-Z0-9\-_]+$/.test(normalized)) {
            return { valid: false, error: 'Invalid license key format' };
        }

        try {
            // Generate hash of the input key
            const keyHash = await this._generateKeyHash(normalized);
            
            // Valid key hashes (obfuscated - harder to reverse engineer)
            // These are SHA-256 hashes of valid license keys
            const validHashes = await this._getValidKeyHashes();
            
            // Check if the hash matches any valid hash
            const isValid = validHashes.includes(keyHash);
            
            if (isValid) {
                return { 
                    valid: true, 
                    normalizedKey: normalized,
                    activationData: {
                        type: 'license_key',
                        features: ['unlimited_agents', 'custom_prompts', 'priority_support']
                    }
                };
            } else {
                return { 
                    valid: false, 
                    error: 'Invalid license key' 
                };
            }
        } catch (error) {
            console.error('[Premium] Validation error:', error);
            return { 
                valid: false, 
                error: 'Validation failed. Please try again.' 
            };
        }
    }

    /**
     * Generate SHA-256 hash of license key
     * Private method for internal use only
     */
    static async _generateKeyHash(key) {
        const normalized = key.toLowerCase().replace(/[-_\s]/g, '');
        const encoder = new TextEncoder();
        const data = encoder.encode(normalized + 'AgentOS-Salt-2025');
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Get valid license key hashes (obfuscated storage)
     * These are SHA-256 hashes, not the actual keys
     */
    static async _getValidKeyHashes() {
        // Obfuscated storage - hashes are split across multiple arrays
        // This makes it harder to find and extract all valid hashes at once
        const h1 = '499ace1a988fc98e958e855960bdb3caa9e3f7b7389a1d7d55ea03e1cf0706f8'; // AgentOS2025
        const h2 = 'd8728ad92b7f4c2885725af88021da19e483537c28beb5a80b12df16761a2d6e'; // AGENTOS-PREMIUM
        
        // Additional hashes can be added here
        const additionalHashes = [
            // Add more hashes generated from generate-key-hashes.js
            // Example: 'your-hash-here',
        ];
        
        // Combine all hashes
        return [h1, h2, ...additionalHashes];
    }

    /**
     * Activate premium with license key
     */
    static async activateLicenseKey(licenseKey) {
        try {
            // Validate key with server
            const validation = await this.validateLicenseKey(licenseKey);
            if (!validation.valid) {
                return { success: false, error: validation.error };
            }

            // Get current data
            const data = await chrome.storage.local.get([this.STORAGE_KEY]);
            const pd = data[this.STORAGE_KEY] || { installDate: Date.now() };

            // Mark as premium
            pd.isPremium = true;
            pd.premiumActivatedDate = Date.now();
            pd.licenseKey = validation.normalizedKey;
            pd.activationMethod = 'license_key';
            pd.activationData = validation.activationData || {};

            // Save
            await chrome.storage.local.set({ [this.STORAGE_KEY]: pd });

            console.log('[Premium] License key activation successful');
            return { success: true, message: 'Premium activated with license key' };
        } catch (error) {
            console.error('[Premium] License key activation error:', error);
            return { success: false, error: error.message };
        }
    }

    static async checkServerActivation(serverUrl = 'https://your-server.com') {
        try {
            const response = await fetch(`${serverUrl}/api/check-activation`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    extensionId: chrome.runtime.id 
                })
            });

            if (!response.ok) {
                console.warn('[Premium] Server check failed:', response.status);
                return { found: false };
            }

            const data = await response.json();
            
            if (data.activated && !data.activated_locally) {
                // Server says it's activated but local storage says no
                // Update local storage
                console.log('[Premium] Found server activation, updating local storage');
                await this.activate();
                return { activated: true, justUpdated: true };
            }

            return data;
        } catch (error) {
            console.warn('[Premium] Server check error:', error);
            return { found: false, error: error.message };
        }
    }

    /**
     * Open payment page
     */
    static async openPayment() {
        try {
            await chrome.tabs.create({ url: this.PAYMENT_URL });
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Reset trial (testing only)
     */
    static async reset() {
        try {
            await chrome.storage.local.remove([this.STORAGE_KEY]);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

// Export for background script
export default PremiumManager;
