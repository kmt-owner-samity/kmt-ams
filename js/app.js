/* =====================================================================
   app.js — Bootstrap (temporary)
   ধাপ ৪: শুধু splash + login shell দেখাবে
   ধাপ ৫-এ পুরো logic আসবে
   ===================================================================== */

import { APP_CONFIG } from './config.js';

/* ============ DOM Helpers ============ */
const $ = id => document.getElementById(id);

/* ============ Toast ============ */
let toastTimer;
export function toast(msg, type = '') {
  const t = $('toast');
  if (!t) return;
  const icon = type === 'err' ? '⚠️ ' : type === 'ok' ? '✓ ' : '';
  t.textContent = icon + msg;
  t.className = 'toast on' + (type ? ' ' + type : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('on'), type === 'err' ? 5000 : 2400);
}

/* ============ Splash Controller ============ */
function runSplash() {
  const pctEl = $('splashPct');
  let pct = 0;
  const timer = setInterval(() => {
    pct = Math.min(pct + Math.random() * 18, 95);
    if (pctEl) pctEl.textContent = Math.round(pct) + '%';
  }, 180);

  return new Promise(resolve => {
    setTimeout(() => {
      clearInterval(timer);
      if (pctEl) pctEl.textContent = '100%';
      const splash = $('splashOv');
      if (splash) {
        splash.classList.add('hide');
        setTimeout(() => {
          splash.remove();
          resolve();
        }, 700);
      } else {
        resolve();
      }
    }, APP_CONFIG.SPLASH_MIN_MS);
  });
}

/* ============ Login Screen ============ */
function showLogin() {
  const ov = $('loginOv');
  if (ov) ov.hidden = false;
  // remember last username
  try {
    const last = localStorage.getItem(APP_CONFIG.STORAGE.LAST_USER);
    if (last) $('loginUser').value = last;
  } catch {}
}

function hideLogin() {
  const ov = $('loginOv');
  if (ov) ov.hidden = true;
}

/* ============ Login Form (placeholder) ============ */
function setupLoginForm() {
  const form = $('loginForm');
  const togglePw = $('togglePw');
  const pwInput = $('loginPw');
  const btn = $('loginBtn');
  const msg = $('loginMsg');

  // Password show/hide
  if (togglePw) {
    togglePw.addEventListener('click', () => {
      const show = pwInput.type === 'password';
      pwInput.type = show ? 'text' : 'password';
      pwInput.focus();
    });
  }

  // Submit (temporary — will be replaced in step 5)
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const user = $('loginUser').value.trim();
      const pw = pwInput.value;

      if (!user || !pw) {
        msg.textContent = 'ইউজারনেম ও পাসওয়ার্ড দুটোই দিন';
        msg.className = 'login-msg err';
        return;
      }

      // Temporary fake login — replaced in step 5
      btn.classList.add('loading');
      btn.disabled = true;
      msg.textContent = '';

      await new Promise(r => setTimeout(r, 800));

      // Show app shell (placeholder)
      hideLogin();
      const app = $('appShell');
      if (app) app.hidden = false;
      const userName = $('userName');
      if (userName) userName.textContent = user;

      toast('স্বাগতম, ' + user, 'ok');
    });
  }

  // Logout button (placeholder)
  const btnOut = $('btnLogout');
  if (btnOut) {
    btnOut.addEventListener('click', () => {
      const app = $('appShell');
      if (app) app.hidden = true;
      showLogin();
      toast('লগআউট হয়েছে');
    });
  }
}

/* ============ Boot ============ */
async function boot() {
  setupLoginForm();
  await runSplash();
  showLogin();
}

window.addEventListener('load', boot);
