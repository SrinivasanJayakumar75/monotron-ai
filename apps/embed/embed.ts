import { EMBED_CONFIG } from './config';
import { chatBubbleIcon, closeIcon } from './icons';

(function() {
  let iframe: HTMLIFrameElement | null = null;
  let container: HTMLDivElement | null = null;
  let button: HTMLButtonElement | null = null;
  let popup: HTMLDivElement | null = null;
  let isOpen = false;
  let hasInteracted = false;
  
  // Get configuration from script tag
  let organizationId: string | null = null;
  let position: 'bottom-right' | 'bottom-left' = EMBED_CONFIG.DEFAULT_POSITION;
  
  // Try to get the current script
  const currentScript = document.currentScript as HTMLScriptElement;
  if (currentScript) {
    organizationId = currentScript.getAttribute('data-organization-id');
    position = (currentScript.getAttribute('data-position') as 'bottom-right' | 'bottom-left') || EMBED_CONFIG.DEFAULT_POSITION;
  } else {
    // Fallback: find script tag by src
    const scripts = document.querySelectorAll('script[src*="embed"]');
    const embedScript = Array.from(scripts).find(script => 
      script.hasAttribute('data-organization-id')
    ) as HTMLScriptElement;
    
    if (embedScript) {
      organizationId = embedScript.getAttribute('data-organization-id');
      position = (embedScript.getAttribute('data-position') as 'bottom-right' | 'bottom-left') || EMBED_CONFIG.DEFAULT_POSITION;
    }
  }
  
  // Exit if no organization ID
  if (!organizationId) {
    console.error('Echo Widget: data-organization-id attribute is required');
    return;
  }
  
  // Create notification sound
  function playNotificationSound() {
    try {
      // Create a simple notification sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (e) {
      console.warn('Could not play notification sound:', e);
    }
  }
  
  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', render);
    } else {
      render();
    }
  }
  
  function render() {
    // Create floating action button
    button = document.createElement('button');
    button.id = 'echo-widget-button';
    button.innerHTML = chatBubbleIcon;
    button.style.cssText = `
      position: fixed;
      ${position === 'bottom-right' ? 'right: 20px;' : 'left: 20px;'}
      bottom: 20px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: #3b41f6ff;
      color: white;
      border: none;
      cursor: pointer;
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 24px rgba(59, 130, 246, 0.35);
      transition: all 0.2s ease;
    `;
    
    button.addEventListener('click', toggleWidget);
    button.addEventListener('mouseenter', () => {
      if (button) button.style.transform = 'scale(1.05)';
    });
    button.addEventListener('mouseleave', () => {
      if (button) button.style.transform = 'scale(1)';
    });
    
    document.body.appendChild(button);
    
    // Create popup message
    createPopup();
    
    // Show popup after 3 seconds
    setTimeout(() => {
      showPopup();
    }, 3000);
    
    // Create container (hidden by default)
    container = document.createElement('div');
    container.id = 'echo-widget-container';
    container.style.cssText = `
      position: fixed;
      ${position === 'bottom-right' ? 'right: 20px;' : 'left: 20px;'}
      bottom: 90px;
      width: 400px;
      height: 600px;
      max-width: calc(100vw - 40px);
      max-height: calc(100vh - 110px);
      z-index: 999998;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
      display: none;
      opacity: 0;
      transform: translateY(10px);
      transition: all 0.3s ease;
    `;
    
    // Create iframe
    iframe = document.createElement('iframe');
    iframe.src = buildWidgetUrl();
    iframe.style.cssText = `
      width: 100%;
      height: 100%;
      border: none;
    `;
    // Add permissions for microphone and clipboard
    iframe.allow = 'microphone; clipboard-read; clipboard-write';
    
    container.appendChild(iframe);
    document.body.appendChild(container);
    
    // Handle messages from widget
    window.addEventListener('message', handleMessage);
  }
  
  function createPopup() {
    popup = document.createElement('div');
    popup.id = 'echo-widget-popup';
    popup.style.cssText = `
      position: fixed;
      ${position === 'bottom-right' ? 'right: 90px;' : 'left: 90px;'}
      bottom: 20px;
      background: white;
      padding: 16px 20px;
      border-radius: 12px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
      z-index: 999997;
      display: none;
      opacity: 0;
      transform: translateX(${position === 'bottom-right' ? '10px' : '-10px'});
      transition: all 0.3s ease;
      max-width: 280px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    `;
    
    popup.innerHTML = `
      <div style="display: flex; align-items: start; gap: 12px;">
        <div style="
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        ">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </div>
        <div style="flex: 1;">
          <div style="
            font-weight: 600;
            font-size: 14px;
            color: #1f2937;
            margin-bottom: 4px;
          ">I'm here to help you! 👋</div>
          <div style="
            font-size: 13px;
            color: #6b7280;
            line-height: 1.4;
          ">Have questions? Click the button to chat with me.</div>
        </div>
        <button id="echo-popup-close" style="
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #9ca3af;
          transition: color 0.2s;
          flex-shrink: 0;
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    `;
    
    const closeBtn = popup.querySelector('#echo-popup-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', hidePopup);
      closeBtn.addEventListener('mouseenter', (e) => {
        (e.target as HTMLElement).style.color = '#4b5563';
      });
      closeBtn.addEventListener('mouseleave', (e) => {
        (e.target as HTMLElement).style.color = '#9ca3af';
      });
    }
    
    document.body.appendChild(popup);
  }
  
  function showPopup() {
    if (popup && !hasInteracted && !isOpen) {
      popup.style.display = 'block';
      playNotificationSound();
      setTimeout(() => {
        if (popup) {
          popup.style.opacity = '1';
          popup.style.transform = 'translateX(0)';
        }
      }, 10);
      
      // Auto-hide after 10 seconds
      setTimeout(() => {
        hidePopup();
      }, 10000);
    }
  }
  
  function hidePopup() {
    if (popup) {
      popup.style.opacity = '0';
      popup.style.transform = `translateX(${position === 'bottom-right' ? '10px' : '-10px'})`;
      setTimeout(() => {
        if (popup) popup.style.display = 'none';
      }, 300);
    }
  }
  
  function buildWidgetUrl(): string {
    const params = new URLSearchParams();
    params.append('organizationId', organizationId!);
    return `${EMBED_CONFIG.WIDGET_URL}?${params.toString()}`;
  }
  
  function handleMessage(event: MessageEvent) {
    if (event.origin !== new URL(EMBED_CONFIG.WIDGET_URL).origin) return;
    
    const { type, payload } = event.data;
    
    switch (type) {
      case 'close':
        hide();
        break;
      case 'resize':
        if (payload.height && container) {
          container.style.height = `${payload.height}px`;
        }
        break;
    }
  }
  
  function toggleWidget() {
    hasInteracted = true;
    hidePopup(); // Hide popup when user interacts
    if (isOpen) {
      hide();
    } else {
      show();
    }
  }
  
  function show() {
    if (container && button) {
      isOpen = true;
      container.style.display = 'block';
      // Trigger animation
      setTimeout(() => {
        if (container) {
          container.style.opacity = '1';
          container.style.transform = 'translateY(0)';
        }
      }, 10);
      // Change button icon to close
      button.innerHTML = closeIcon;
    }
  }
  
  function hide() {
    if (container && button) {
      isOpen = false;
      container.style.opacity = '0';
      container.style.transform = 'translateY(10px)';
      // Hide after animation
      setTimeout(() => {
        if (container) container.style.display = 'none';
      }, 300);
      // Change button icon back to chat
      button.innerHTML = chatBubbleIcon;
      button.style.background = '#3e3bf6ff';
    }
  }
  
  function destroy() {
    window.removeEventListener('message', handleMessage);
    if (container) {
      container.remove();
      container = null;
      iframe = null;
    }
    if (button) {
      button.remove();
      button = null;
    }
    if (popup) {
      popup.remove();
      popup = null;
    }
    isOpen = false;
    hasInteracted = false;
  }
  
  // Function to reinitialize with new config
  function reinit(newConfig: { organizationId?: string; position?: 'bottom-right' | 'bottom-left' }) {
    // Destroy existing widget
    destroy();
    
    // Update config
    if (newConfig.organizationId) {
      organizationId = newConfig.organizationId;
    }
    if (newConfig.position) {
      position = newConfig.position;
    }
    
    // Reinitialize
    init();
  }
  
  // Expose API to global scope
  (window as any).MonotronWidget = {
    init: reinit,
    show,
    hide,
    destroy,
    showPopup,
    hidePopup
  };
  
  // Auto-initialize
  init();
})();