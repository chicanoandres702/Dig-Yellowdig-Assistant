/**
 * Settings Tab Service
 * Renders the settings menu in the Dig sidebar.
 */

async function renderSettingsTab(container) {
    container.innerHTML = `
        <div class="dig-settings-container" style="display:flex;flex-direction:column;gap:24px;padding:8px 0;">
            <p style="margin:0;font-size:15px;color:var(--text-main);font-weight:500;line-height:1.5;">Customize your Dig Assistant experience.</p>
            
            <!-- Toolbar Toggle -->
            <div style="display:flex;align-items:center;justify-content:space-between;background:var(--bg-panel);padding:16px 20px;border-radius:var(--radius-lg);border:var(--border-glass);box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);">
                <div style="display:flex;flex-direction:column;gap:6px;padding-right:16px;">
                    <strong style="font-size:16px;color:var(--text-main);font-weight:600;">Floating Toolbar</strong>
                    <span style="font-size:14px;color:var(--text-muted);line-height:1.4;">Quick actions at the bottom of the screen.</span>
                </div>
                <label class="dig-toggle-switch" style="flex-shrink:0;">
                    <input type="checkbox" id="dig-toggle-toolbar">
                    <span class="dig-toggle-slider"></span>
                </label>
            </div>

            <!-- FAB Toggle -->
            <div style="display:flex;align-items:center;justify-content:space-between;background:var(--bg-panel);padding:16px 20px;border-radius:var(--radius-lg);border:var(--border-glass);box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);">
                <div style="display:flex;flex-direction:column;gap:6px;padding-right:16px;">
                    <strong style="font-size:16px;color:var(--text-main);font-weight:600;">On-Page Button (FAB)</strong>
                    <span style="font-size:14px;color:var(--text-muted);line-height:1.4;">The floating "Academic Hub" button on the right.</span>
                </div>
                <label class="dig-toggle-switch" style="flex-shrink:0;">
                    <input type="checkbox" id="dig-toggle-fab">
                    <span class="dig-toggle-slider"></span>
                </label>
            </div>

            <style>
                .dig-toggle-switch {
                    position: relative;
                    display: inline-block;
                    width: 44px;
                    height: 24px;
                }
                .dig-toggle-switch input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }
                .dig-toggle-slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background-color: hsla(158, 80%, 30%, 0.3);
                    transition: .3s;
                    border-radius: 24px;
                    border: var(--border-glass);
                }
                .dig-toggle-slider:before {
                    position: absolute;
                    content: "";
                    height: 18px;
                    width: 18px;
                    left: 3px;
                    bottom: 2px;
                    background-color: var(--text-muted);
                    transition: .3s;
                    border-radius: 50%;
                }
                input:checked + .dig-toggle-slider {
                    background-color: var(--emerald-500);
                }
                input:checked + .dig-toggle-slider:before {
                    transform: translateX(19px);
                    background-color: white;
                }
            </style>
        </div>
    `;

    // Load states
    chrome.storage.local.get({
        'dig_show_floating_toolbar': true,
        'dig_show_fab': true
    }, (res) => {
        const tbCheck = document.getElementById('dig-toggle-toolbar');
        const fabCheck = document.getElementById('dig-toggle-fab');
        if (tbCheck) tbCheck.checked = res.dig_show_floating_toolbar;
        if (fabCheck) fabCheck.checked = res.dig_show_fab;

        // Bind events
        if (tbCheck) {
            tbCheck.addEventListener('change', (e) => {
                chrome.storage.local.set({ 'dig_show_floating_toolbar': !!e.target.checked });
            });
        }
        if (fabCheck) {
            fabCheck.addEventListener('change', (e) => {
                chrome.storage.local.set({ 'dig_show_fab': !!e.target.checked });
            });
        }
    });
}
