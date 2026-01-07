(function(){"use strict";const l={WIDGET_URL:"https://monotron-ai-widgets-mupe.vercel.app",DEFAULT_POSITION:"bottom-right"},g=`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
</svg>`,T=`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <line x1="18" y1="6" x2="6" y2="18"></line>
  <line x1="6" y1="6" x2="18" y2="18"></line>
</svg>`;(function(){let s=null,e=null,i=null,o=null,d=!1,u=!1,c=null,a=l.DEFAULT_POSITION;const h=document.currentScript;if(h)c=h.getAttribute("data-organization-id"),a=h.getAttribute("data-position")||l.DEFAULT_POSITION;else{const t=document.querySelectorAll('script[src*="embed"]'),n=Array.from(t).find(r=>r.hasAttribute("data-organization-id"));n&&(c=n.getAttribute("data-organization-id"),a=n.getAttribute("data-position")||l.DEFAULT_POSITION)}if(!c){console.error("Echo Widget: data-organization-id attribute is required");return}function k(){try{const t=new(window.AudioContext||window.webkitAudioContext),n=t.createOscillator(),r=t.createGain();n.connect(r),r.connect(t.destination),n.frequency.value=800,n.type="sine",r.gain.setValueAtTime(.3,t.currentTime),r.gain.exponentialRampToValueAtTime(.01,t.currentTime+.3),n.start(t.currentTime),n.stop(t.currentTime+.3)}catch(t){console.warn("Could not play notification sound:",t)}}function x(){document.readyState==="loading"?document.addEventListener("DOMContentLoaded",m):m()}function m(){i=document.createElement("button"),i.id="echo-widget-button",i.innerHTML=g,i.style.cssText=`
      position: fixed;
      ${a==="bottom-right"?"right: 20px;":"left: 20px;"}
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
    `,i.addEventListener("click",I),i.addEventListener("mouseenter",()=>{i&&(i.style.transform="scale(1.05)")}),i.addEventListener("mouseleave",()=>{i&&(i.style.transform="scale(1)")}),document.body.appendChild(i),E(),setTimeout(()=>{y()},3e3),e=document.createElement("div"),e.id="echo-widget-container",e.style.cssText=`
      position: fixed;
      ${a==="bottom-right"?"right: 20px;":"left: 20px;"}
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
    `,s=document.createElement("iframe"),s.src=L(),s.style.cssText=`
      width: 100%;
      height: 100%;
      border: none;
    `,s.allow="microphone; clipboard-read; clipboard-write",e.appendChild(s),document.body.appendChild(e),window.addEventListener("message",b)}function E(){o=document.createElement("div"),o.id="echo-widget-popup",o.style.cssText=`
      position: fixed;
      ${a==="bottom-right"?"right: 90px;":"left: 90px;"}
      bottom: 20px;
      background: white;
      padding: 16px 20px;
      border-radius: 12px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
      z-index: 999997;
      display: none;
      opacity: 0;
      transform: translateX(${a==="bottom-right"?"10px":"-10px"});
      transition: all 0.3s ease;
      max-width: 280px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    `,o.innerHTML=`
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
    `;const t=o.querySelector("#echo-popup-close");t&&(t.addEventListener("click",p),t.addEventListener("mouseenter",n=>{n.target.style.color="#4b5563"}),t.addEventListener("mouseleave",n=>{n.target.style.color="#9ca3af"})),document.body.appendChild(o)}function y(){o&&!u&&!d&&(o.style.display="block",k(),setTimeout(()=>{o&&(o.style.opacity="1",o.style.transform="translateX(0)")},10),setTimeout(()=>{p()},1e4))}function p(){o&&(o.style.opacity="0",o.style.transform=`translateX(${a==="bottom-right"?"10px":"-10px"})`,setTimeout(()=>{o&&(o.style.display="none")},300))}function L(){const t=new URLSearchParams;return t.append("organizationId",c),`${l.WIDGET_URL}?${t.toString()}`}function b(t){if(t.origin!==new URL(l.WIDGET_URL).origin)return;const{type:n,payload:r}=t.data;switch(n){case"close":f();break;case"resize":r.height&&e&&(e.style.height=`${r.height}px`);break}}function I(){u=!0,p(),d?f():w()}function w(){e&&i&&(d=!0,e.style.display="block",setTimeout(()=>{e&&(e.style.opacity="1",e.style.transform="translateY(0)")},10),i.innerHTML=T)}function f(){e&&i&&(d=!1,e.style.opacity="0",e.style.transform="translateY(10px)",setTimeout(()=>{e&&(e.style.display="none")},300),i.innerHTML=g,i.style.background="#3e3bf6ff")}function v(){window.removeEventListener("message",b),e&&(e.remove(),e=null,s=null),i&&(i.remove(),i=null),o&&(o.remove(),o=null),d=!1,u=!1}function z(t){v(),t.organizationId&&(c=t.organizationId),t.position&&(a=t.position),x()}window.MonotronWidget={init:z,show:w,hide:f,destroy:v,showPopup:y,hidePopup:p},x()})()})();
