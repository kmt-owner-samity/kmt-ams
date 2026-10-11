/* =====================================================================
   toast.js — Notification Toast
   ===================================================================== */

let toastTimer = null;

/**
 * Toast message দেখান
 * @param {string} msg - message text
 * @param {string} type - '' | 'err' | 'ok'
 */
export function toast(msg, type = '') {
  const t = document.getElementById('toast');
  if (!t) return;
  
  const icon = type === 'err' ? '⚠️ ' : type === 'ok' ? '✓ ' : '';
  t.textContent = icon + msg;
  t.className = 'toast on' + (type ? ' ' + type : '');
  
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    t.classList.remove('on');
  }, type === 'err' ? 5000 : 2400);
}
