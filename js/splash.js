/* =====================================================================
   splash.js — Splash Screen Controller
   কাজী মোশাররফ টাওয়ার ভবন মালিক সমিতি
   
   Login screen-এর আগে একটা সুন্দর animated splash দেখায়।
   ===================================================================== */

const SPLASH_MS = 2200;   // কতক্ষণ দেখাবে (milliseconds)

let pctTimer = null;

/**
 * Splash screen দেখান এবং progress animate করুন
 * @returns {Promise<void>} — splash শেষ হলে resolve
 */
function runSplash() {
  const pctEl = document.getElementById('splashPct');
  let pct = 0;
  
  // Progress percentage animation
  pctTimer = setInterval(() => {
    pct = Math.min(pct + Math.random() * 18, 95);
    if (pctEl) pctEl.textContent = Math.round(pct) + '%';
  }, 180);
  
  return new Promise(resolve => {
    setTimeout(() => {
      finishSplash(resolve);
    }, SPLASH_MS);
  });
}

/**
 * Splash বন্ধ করুন
 * @param {Function} [afterResolve] — hide হওয়ার পরে call
 */
function finishSplash(afterResolve) {
  // Timer বন্ধ
  if (pctTimer) {
    clearInterval(pctTimer);
    pctTimer = null;
  }
  
  const pctEl = document.getElementById('splashPct');
  if (pctEl) pctEl.textContent = '100%';
  
  const splash = document.getElementById('splashOv');
  if (!splash) {
    if (afterResolve) afterResolve();
    return;
  }
  
  splash.classList.add('hide');
  setTimeout(() => {
    splash.remove();
    if (afterResolve) afterResolve();
  }, 700);
}

/**
 * Splash বন্ধ করে সরাসরি callback call করুন (login success-এর জন্য)
 */
function dismissSplash() {
  finishSplash(null);
}

/* ============ Global Expose ============ */
window.runSplash = runSplash;
window.finishSplash = finishSplash;
window.dismissSplash = dismissSplash;
