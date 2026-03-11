(function(){
  // Dynamic Welcome Banner for Sidepanel
  // - Shows premium features vs free limitations
  // - Updates automatically when sidepanel becomes visible again
  // - CTA opens the extension options page (fallback) and sends a premium activation message

  const PURCHASE_URL = '';
  const BANNER_ID = 'dynamic-welcome-banner';

  // Create the banner DOM element (detached). Does not insert into the document.
  function createBannerElement(){
    let existing = document.getElementById(BANNER_ID);
    if(existing) return existing;

    const container = document.createElement('div');
    container.id = BANNER_ID;
    // Compact professional styling to match app theme
    container.style.boxSizing = 'border-box';
    container.style.width = 'calc(100% - 16px)';
    container.style.padding = '6px 8px';
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.justifyContent = 'space-between';
    container.style.gap = '8px';
    container.style.borderRadius = '6px';
    container.style.margin = '6px 8px';
    container.style.background = 'rgba(255,255,255,0.02)';
    container.style.backdropFilter = 'blur(4px)';
    container.style.border = '1px solid rgba(255,255,255,0.03)';
  container.style.fontSize = '13px';
  // Make sure the banner sits above other elements and is visible without needing extra clicks
  container.style.zIndex = '9999';
    container.style.lineHeight = '1.2';

    // left area (compact)
    const left = document.createElement('div');
    left.style.flex = '1 1 auto';
    left.style.display = 'flex';
    left.style.flexDirection = 'column';

    // right CTA area
    const right = document.createElement('div');
    right.style.flex = '0 0 auto';
    right.style.display = 'flex';
    right.style.alignItems = 'center';
    right.style.gap = '8px';

    container.appendChild(left);
    container.appendChild(right);

    // Preferred insertion: after the visible app header
    return container;
  }

  // Insert banner element after a reference element
  function insertBannerAfter(refEl, bannerEl){
    if(!refEl || !refEl.parentNode) return false;
    refEl.parentNode.insertBefore(bannerEl, refEl.nextSibling);
    return true;
  }

  // Replace an existing element with the banner element
  function replaceElementWithBanner(oldEl, bannerEl){
    if(!oldEl || !oldEl.parentNode) return false;
    oldEl.parentNode.replaceChild(bannerEl, oldEl);
    return true;
  }

  // Default insertion: try a set of header selectors and insert after the first match.
  function defaultInsert(bannerEl){
    const selectors = ['.app-title', '#welcome', 'header', '[data-app-header]', '#root'];
    for(const sel of selectors){
      const el = document.querySelector(sel);
      if(el && el.parentNode){
        insertBannerAfter(el, bannerEl);
        return true;
      }
    }
    // fallback: append to body (or into #root if present)
    const root = document.getElementById('root');
    if(root && root.parentNode){
      root.parentNode.insertBefore(bannerEl, root);
      return true;
    }
    document.body.appendChild(bannerEl);
    return true;
  }

  function buildBannerContent(premiumData){
  const c = createBannerElement();
    const left = c.children[0];
    const right = c.children[1];
    left.innerHTML = '';
    right.innerHTML = '';

    const title = document.createElement('div');
    title.style.fontWeight = '700';
    title.style.fontSize = '12px';
    title.style.marginBottom = '2px';
    title.style.color = 'var(--sidebar-foreground, #FAFAFA)';

    const body = document.createElement('div');
    body.style.fontSize = '11px';
    body.style.color = 'var(--sidebar-accent-foreground, #D1D5DB)';
    body.style.lineHeight = '1.25';

    const featuresList = document.createElement('ul');
    featuresList.style.margin = '8px 0 0 16px';
    featuresList.style.padding = '0';

    // Default copy (professional, benefit-led)
    if(premiumData?.isPremium){
      // Concise professional banner for Pro users
      title.textContent = 'Agent OS Pro — active ✨';
      body.textContent = 'Priority features: Unlimited agents • Priority integrations • Faster execution';
      left.appendChild(title);
      left.appendChild(body);

      // CTA: Manage subscription (compact)
  const manageBtn = document.createElement('button');
      manageBtn.textContent = 'Manage';
      manageBtn.style.background = 'transparent';
      manageBtn.style.color = 'var(--sidebar-foreground, #fff)';
      manageBtn.style.border = '1px solid rgba(255,255,255,0.06)';
      manageBtn.style.padding = '6px 8px';
      manageBtn.style.borderRadius = '6px';
      manageBtn.style.cursor = 'pointer';
      manageBtn.style.fontSize = '13px';
      manageBtn.onclick = () => {
        console.debug('[Banner] Manage button clicked - starting navigation');
        
        // Direct approach: find and trigger click with native events
        const openSettingsAndBilling = () => {
          try{
            let allButtons = document.querySelectorAll('button');
            console.debug('[Banner] Total buttons found:', allButtons.length);
            console.debug('[Banner] Available buttons:', 
              Array.from(allButtons)
                .filter(b => b.offsetParent !== null)
                .map(b => b.textContent?.trim())
                .filter(t => t)
            );
            
            // Step 1: Check if Settings button is visible, if not open navigation menu first
            let settingsBtn = null;
            for(const btn of allButtons){
              const text = btn.textContent?.trim();
              if(text && text === 'Settings' && btn.offsetParent !== null){
                settingsBtn = btn;
                break;
              }
            }
            
            // If Settings not visible, try to open navigation menu
            if(!settingsBtn){
              console.debug('[Banner] Settings not visible, looking for Navigation button...');
              let navButton = null;
              
              for(const btn of allButtons){
                const text = btn.textContent?.trim();
                // Look for Navigation button or hamburger menu
                if(text === 'Navigation' && btn.offsetParent !== null){
                  navButton = btn;
                  break;
                }
              }
              
              if(navButton){
                console.debug('[Banner] Found Navigation button, clicking to open menu...');
                navButton.click();
                
                // Wait for menu to open, then find Settings
                setTimeout(() => {
                  allButtons = document.querySelectorAll('button');
                  for(const btn of allButtons){
                    const text = btn.textContent?.trim();
                    if(text && text === 'Settings' && btn.offsetParent !== null){
                      settingsBtn = btn;
                      console.debug('[Banner] Found Settings button after opening navigation');
                      break;
                    }
                  }
                  
                  if(settingsBtn){
                    clickSettingsAndNavigateToBilling(settingsBtn);
                  } else {
                    console.error('[Banner] Settings button still not found after opening navigation');
                  }
                }, 200);
                
                return true;
              } else {
                console.error('[Banner] Navigation button not found!');
                return false;
              }
            } else {
              // Settings is already visible
              clickSettingsAndNavigateToBilling(settingsBtn);
              return true;
            }
            
            function clickSettingsAndNavigateToBilling(settingsBtn){
              console.debug('[Banner] Clicking Settings button...');
              settingsBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
              settingsBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
              settingsBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
              settingsBtn.click();
              
              // Step 2: Wait and find Billing tab with multiple retries
              let attempts = 0;
              const maxAttempts = 20;
              
              const findBillingTab = () => {
                attempts++;
                console.debug(`[Banner] Attempt ${attempts}/${maxAttempts} - Looking for Billing tab...`);
                
                const allButtons = document.querySelectorAll('button');
                for(const btn of allButtons){
                  const text = btn.textContent?.trim();
                  if(text === 'Billing' && btn.offsetParent !== null){
                    console.debug('[Banner] Found Billing tab!', btn);
                    btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
                    btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
                    btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                    btn.click();
                    console.debug('[Banner] ✅ Successfully navigated to Billing tab');
                    return true;
                  }
                }
                
                if(attempts < maxAttempts){
                  setTimeout(findBillingTab, 100);
                } else {
                  console.error('[Banner] ❌ Billing tab not found after', attempts, 'attempts');
                  console.error('[Banner] Available buttons after opening Settings:', 
                    Array.from(document.querySelectorAll('button'))
                      .filter(b => b.offsetParent !== null)
                      .map(b => b.textContent?.trim())
                      .filter(t => t)
                  );
                }
                return false;
              };
              
              setTimeout(findBillingTab, 150);
            }
            
            return true;
            
          }catch(e){ 
            console.error('[Banner] ❌ Error in openSettingsAndBilling:', e); 
            return false;
          }
        };

        const opened = openSettingsAndBilling();
        if(!opened){
          console.debug('[Banner] Using fallback: sending premium:manage message');
          try{ chrome.runtime.sendMessage && chrome.runtime.sendMessage({type:'premium:manage'}); }catch(e){}
        }
      };

      right.appendChild(manageBtn);

    } else {
      // Non-premium / free user copy - SPECIAL DISCOUNT OFFER
      // Add glowing animation keyframes
      if (!document.getElementById('banner-glow-styles')) {
        const styleSheet = document.createElement('style');
        styleSheet.id = 'banner-glow-styles';
        styleSheet.textContent = `
          @keyframes bannerGlow {
            0%, 100% { box-shadow: 0 0 3px #7C3AED, 0 0 6px #7C3AED, 0 0 9px #7C3AED; }
            50% { box-shadow: 0 0 6px #9F7AEA, 0 0 12px #9F7AEA, 0 0 18px #9F7AEA; }
          }
          @keyframes buttonPulse {
            0%, 100% { box-shadow: 0 0 3px #10B981, 0 0 6px #10B981; transform: scale(1); }
            50% { box-shadow: 0 0 8px #10B981, 0 0 12px #10B981; transform: scale(1.01); }
          }
          @keyframes textShimmer {
            0% { background-position: -200% center; }
            100% { background-position: 200% center; }
          }
        `;
        document.head.appendChild(styleSheet);
      }

      // Apply glowing effect to container with festive colors
      c.style.background = 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(16,185,129,0.1), rgba(239,68,68,0.08))';
      c.style.border = '1px solid rgba(124,58,237,0.4)';
      c.style.animation = 'bannerGlow 2s ease-in-out infinite';

      // Special offer badge
      const badge = document.createElement('div');
      badge.style.background = 'linear-gradient(90deg, #EF4444, #DC2626)';
      badge.style.color = '#fff';
      badge.style.padding = '1px 6px';
      badge.style.borderRadius = '3px';
      badge.style.fontSize = '8px';
      badge.style.fontWeight = '700';
      badge.style.textTransform = 'uppercase';
      badge.style.marginBottom = '2px';
      badge.style.display = 'inline-block';
      badge.style.width = 'fit-content';
      badge.style.letterSpacing = '0.3px';
      badge.textContent = '⚡ LIMITED TIME SALE - ONLY 5 SPOTS LEFT!';
      left.appendChild(badge);

      title.textContent = 'Premium LIFETIME — 85% OFF! 🎉';
      title.style.fontSize = '11px';
      title.style.background = 'linear-gradient(90deg, #FAFAFA, #FFD700, #10B981, #FFD700, #FAFAFA)';
      title.style.backgroundSize = '200% auto';
      title.style.webkitBackgroundClip = 'text';
      title.style.webkitTextFillColor = 'transparent';
      title.style.backgroundClip = 'text';
      title.style.animation = 'textShimmer 3s linear infinite';
      left.appendChild(title);

      // Price display
      const priceContainer = document.createElement('div');
      priceContainer.style.display = 'flex';
      priceContainer.style.alignItems = 'center';
      priceContainer.style.gap = '6px';
      priceContainer.style.marginTop = '2px';

      const oldPrice = document.createElement('span');
      oldPrice.textContent = '$99';
      oldPrice.style.textDecoration = 'line-through';
      oldPrice.style.color = '#9CA3AF';
      oldPrice.style.fontSize = '11px';

      const newPrice = document.createElement('span');
      newPrice.textContent = '$4.99';
      newPrice.style.color = '#10B981';
      newPrice.style.fontSize = '14px';
      newPrice.style.fontWeight = '800';

      const lifetime = document.createElement('span');
      lifetime.textContent = 'LIFETIME';
      lifetime.style.background = 'rgba(16,185,129,0.2)';
      lifetime.style.color = '#10B981';
      lifetime.style.padding = '1px 4px';
      lifetime.style.borderRadius = '3px';
      lifetime.style.fontSize = '8px';
      lifetime.style.fontWeight = '700';

      priceContainer.appendChild(oldPrice);
      priceContainer.appendChild(newPrice);
      priceContainer.appendChild(lifetime);
      left.appendChild(priceContainer);

      body.textContent = '⚡ SPECIAL OFFER: Limited to first 5 customers only! Act fast!';
      body.style.marginTop = '2px';
      body.style.fontSize = '9px';
      left.appendChild(body);

      // CTA: Claim offer button with glow
      const upgradeBtn = document.createElement('button');
      upgradeBtn.textContent = '⚡ CLAIM SPECIAL OFFER!';
      upgradeBtn.style.background = 'linear-gradient(90deg, #10B981, #059669)';
      upgradeBtn.style.color = '#fff';
      upgradeBtn.style.border = 'none';
      upgradeBtn.style.padding = '6px 10px';
      upgradeBtn.style.borderRadius = '5px';
      upgradeBtn.style.cursor = 'pointer';
      upgradeBtn.style.fontWeight = '700';
      upgradeBtn.style.fontSize = '11px';
      upgradeBtn.style.animation = 'buttonPulse 1.5s ease-in-out infinite';
      upgradeBtn.style.textTransform = 'uppercase';
      upgradeBtn.style.letterSpacing = '0.3px';
      upgradeBtn.onclick = () => {
        console.debug('[Banner] Upgrade button clicked - starting navigation');
        
        // Direct approach: find and trigger click with native events
        const openSettingsAndBilling = () => {
          try{
            let allButtons = document.querySelectorAll('button');
            console.debug('[Banner] Total buttons found:', allButtons.length);
            
            // Step 1: Check if Settings button is visible
            let settingsBtn = null;
            for(const btn of allButtons){
              const text = btn.textContent?.trim();
              if(text && text === 'Settings' && btn.offsetParent !== null){
                settingsBtn = btn;
                break;
              }
            }
            
            // If Settings not visible, try to open navigation menu first
            if(!settingsBtn){
              console.debug('[Banner] Settings not visible, looking for Navigation button...');
              let navButton = null;
              
              for(const btn of allButtons){
                const text = btn.textContent?.trim();
                if(text === 'Navigation' && btn.offsetParent !== null){
                  navButton = btn;
                  break;
                }
              }
              
              if(navButton){
                console.debug('[Banner] Found Navigation button, clicking to open menu...');
                navButton.click();
                
                // Wait for menu to open, then find Settings
                setTimeout(() => {
                  allButtons = document.querySelectorAll('button');
                  for(const btn of allButtons){
                    const text = btn.textContent?.trim();
                    if(text && text === 'Settings' && btn.offsetParent !== null){
                      settingsBtn = btn;
                      console.debug('[Banner] Found Settings button after opening navigation');
                      break;
                    }
                  }
                  
                  if(settingsBtn){
                    clickSettingsAndNavigateToBilling(settingsBtn);
                  } else {
                    console.error('[Banner] Settings button still not found after opening navigation');
                  }
                }, 200);
                
                return true;
              } else {
                console.error('[Banner] Navigation button not found!');
                return false;
              }
            } else {
              clickSettingsAndNavigateToBilling(settingsBtn);
              return true;
            }
            
            function clickSettingsAndNavigateToBilling(settingsBtn){
              console.debug('[Banner] Clicking Settings button...');
              settingsBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
              settingsBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
              settingsBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
              settingsBtn.click();
              
              // Wait and find Billing tab with multiple retries
              let attempts = 0;
              const maxAttempts = 20;
              
              const findBillingTab = () => {
                attempts++;
                console.debug(`[Banner] Attempt ${attempts}/${maxAttempts} - Looking for Billing tab...`);
                
                const allButtons = document.querySelectorAll('button');
                for(const btn of allButtons){
                  const text = btn.textContent?.trim();
                  if(text === 'Billing' && btn.offsetParent !== null){
                    console.debug('[Banner] Found Billing tab!', btn);
                    btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
                    btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
                    btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                    btn.click();
                    console.debug('[Banner] ✅ Successfully navigated to Billing tab');
                    return true;
                  }
                }
                
                if(attempts < maxAttempts){
                  setTimeout(findBillingTab, 100);
                } else {
                  console.error('[Banner] ❌ Billing tab not found after', attempts, 'attempts');
                }
                return false;
              };
              
              setTimeout(findBillingTab, 150);
            }
            
            return true;
            
          }catch(e){ 
            console.error('[Banner] ❌ Error in openSettingsAndBilling:', e); 
            return false;
          }
        };

        const opened = openSettingsAndBilling();
        if(!opened){
          console.debug('[Banner] Using fallback: sending premium:activate message');
          try{ chrome.runtime.sendMessage && chrome.runtime.sendMessage({type:'premium:activate'}); }catch(e){}
          if(PURCHASE_URL){ try{ window.open(PURCHASE_URL, '_blank'); }catch(e){} }
        }
      };
      right.appendChild(upgradeBtn);
    }

    // Note: banner is intentionally static and persistent. No close/dismiss control is added.
    // Ensure banner is visible
    c.style.display = 'flex';
  }

  function getPremiumData(){
    return new Promise((resolve) => {
      try{
        chrome && chrome.storage && chrome.storage.local && chrome.storage.local.get(['premium_data'], (res) => {
          resolve(res?.premium_data || { isPremium: false });
        });
      }catch(e){
        // If chrome.storage not available, treat as non-premium
        resolve({ isPremium: false });
      }
    });
  }

  // Always build and insert the banner; do not hide based on dismissal. This keeps the banner static and persistent.
  async function updateBanner(){
    const pd = await getPremiumData();
    // Try to find and replace the old built-in welcome/banner.
    const replaced = tryReplaceOldWelcomeBanner(pd);
    if(!replaced){
      // fallback: build and insert in header area
      buildBannerContent(pd);
      const bannerEl = document.getElementById(BANNER_ID) || createBannerElement();
      // Ensure banner is visible and inserted if not already
      if(bannerEl){
        bannerEl.style.display = 'flex';
        if(!bannerEl.parentNode){
          defaultInsert(bannerEl);
        }
      }
    } else {
      // If replaced, ensure the built banner is visible
      const b = document.getElementById(BANNER_ID);
      if(b) b.style.display = 'flex';
    }
  }

  // Attempt to find the old built-in welcome/banner (text: 'Welcome to Agent OS') and replace it
  function tryReplaceOldWelcomeBanner(premiumData){
    try{
      const spans = Array.from(document.querySelectorAll('span'));
      for(const sp of spans){
        const txt = (sp.textContent || '').trim();
        if(!txt) continue;
        if(txt.startsWith('Welcome to Agent OS')){
          // Find an ancestor that looks like the banner wrapper (class includes 'p-3' or 'bg-gradient-to-r' or 'border-b')
          let el = sp.closest('div');
          while(el && el !== document.body){
            const cn = el.className || '';
            if(typeof cn === 'string' && (cn.includes('p-3') || cn.includes('bg-gradient-to-r') || cn.includes('border-b') || cn.includes('welcome'))){
              // Build banner element (detached) and replace
              const newEl = createBannerElement();
              buildBannerContent(premiumData);
              const built = document.getElementById(BANNER_ID) || newEl;
              replaceElementWithBanner(el, built);
              return true;
            }
            el = el.parentElement;
          }
        }
      }
    }catch(e){
      console.debug('replace old welcome banner failed', e);
    }
    return false;
  }

  // Update when the document becomes visible or receives focus
  document.addEventListener('visibilitychange', () => {
    if(document.visibilityState === 'visible') updateBanner();
  });
  window.addEventListener('focus', () => updateBanner());
  // Run on load once
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', updateBanner);
  } else {
    updateBanner();
  }

  // Expose a debug function
  window.__agentOsUpdateBanner = updateBanner;

  // Try to run immediately (best-effort). Some builds render the welcome banner after scripts run,
  // so also observe DOM mutations and replace the original banner as soon as it appears.
  try{
    // immediate attempt
    updateBanner();
  }catch(e){
    setTimeout(() => { try{ updateBanner(); }catch(_){} }, 50);
  }

  // MutationObserver to catch late-rendered welcome/banner elements and replace them automatically
  (function installObserver(){
    const target = document.getElementById('root') || document.body;
    if(!target) return;
    const obs = new MutationObserver((mutations, observer) => {
      for(const m of mutations){
        for(const node of Array.from(m.addedNodes)){
          if(!(node instanceof Element)) continue;
          const text = (node.textContent || '').trim();
          if(text.includes('Welcome to Agent OS')){
            try{ updateBanner(); }catch(e){}
            observer.disconnect();
            return;
          }
          // also check descendants quickly
          try{
            const span = node.querySelector && node.querySelector('span');
            if(span && (span.textContent || '').includes('Welcome to Agent OS')){
              try{ updateBanner(); }catch(e){}
              observer.disconnect();
              return;
            }
          }catch(e){}
        }
      }
    });
    obs.observe(target, { childList: true, subtree: true });
  })();
})();
