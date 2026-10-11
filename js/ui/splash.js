/* =====================================================================
   splash.js — Splash Screen Controller
   ===================================================================== */

import { APP_CONFIG } from '../config.js';

/* ============ State ============ */
let pctTimer = null;

/* ============ Public API ============ */

/**
 * Splash screen দেখান ও progres animate করুন
 * @returns {Promise<void>} — splash শেষ হলে resolve
 */
export function runSplash() {
  const pctEl = document.getElementById('splashPct');
  let pct = 0;
  
  // Progress animation
  pctTimer = setInterval(() => {
    pct = Math.min(pct + Math.random() * 18, 95);
    if (pctEl) pctEl.textContent = Math.round(pct) + '%';
  }, 180);
  
  return new Promise(resolve => {
    setTimeout(() => {
      finishSplash(resolve);
    }, APP_CONFIG.SPLASH_MIN_MS);
  });
}

/**
 * Splash forcefully শেষ করুন (dismiss)
 */
export function finishSplash(afterResolve) {
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
