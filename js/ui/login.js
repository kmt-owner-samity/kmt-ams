/* =====================================================================
   login.js — Login Screen Controller
   ===================================================================== */

import { login as authLogin } from '../core/auth.js';
import { toast } from './toast.js';
import { APP_CONFIG } from '../config.js';

/* ============ DOM Helpers ============ */
const $ = id => document.getElementById(id);

/* ============ Password Show/Hide Icons ============ */
const EYE_OPEN = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>`;
const EYE_CLOSED = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;

/* ============ Public API ============ */

/**
 * Login screen দেখান
 */
export function showLogin() {
  const ov = $('loginOv');
  if (ov) ov.hidden = false;
  
  // Last username restore
  try {
    const last = localStorage.getItem(APP_CONFIG.STORAGE.LAST_USER);
    if (last) {
      const userInput = $('loginUser');
      if (userInput) userInput.value = last;
      // Focus on password if username already filled
      setTimeout(() => $('loginPw')?.focus(), 100);
    } else {
      setTimeout(() => $('loginUser')?.focus(), 100);
    }
  } catch {}
}

/**
 * Login screen hide করুন
 */
export function hideLogin() {
  const ov = $('loginOv');
  if (ov) ov.hidden = true;
}

/**
 * Login form setup — একবার কল করুন
 * @param {Function} onSuccess — login সফল হলে call হবে
 */
export function setupLoginForm(onSuccess) {
  const form = $('loginForm');
  const pwInput = $('loginPw');
  const userInput = $('loginUser');
  const togglePw = $('togglePw');
  const btn = $('loginBtn');
  const btnText = btn?.querySelector('.btn-text');
  const msg = $('loginMsg');
  
  if (!form) return;
  
  /* ---- Password toggle ---- */
  if (togglePw && pwInput) {
    togglePw.addEventListener('click', () => {
      const show = pwInput.type === 'password';
      pwInput.type = show ? 'text' : 'password';
      togglePw.innerHTML = show ? EYE_CLOSED : EYE_OPEN;
      togglePw.setAttribute('aria-label', show ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখান');
      pwInput.focus();
    });
  }
  
  /* ---- Message helper ---- */
  function setMsg(text, isErr = false) {
    if (!msg) return;
    msg.textContent = text || '';
    msg.className = 'login-msg' + (isErr ? ' err' : '');
  }
  
  /* ---- Submit ---- */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = userInput.value.trim();
    const password = pwInput.value;
    
    if (!username || !password) {
      setMsg('ইউজারনেম ও পাসওয়ার্ড দুটোই দিন', true);
      return;
    }
    
    // Loading state
    btn.classList.add('loading');
    btn.disabled = true;
    if (btnText) btnText.textContent = 'লগইন হচ্ছে...';
    setMsg('');
    
    try {
      const user = await authLogin(username, password);
      
      // Success animation
      btn.classList.remove('loading');
      btn.classList.add('success');
      if (btnText) btnText.textContent = 'সফল ✓';
      setMsg('');
      
      // Small delay for success feedback
      setTimeout(() => {
        // Reset button
        btn.classList.remove('success');
        btn.disabled = false;
        if (btnText) btnText.textContent = 'লগইন করুন';
        
        // Clear password
        pwInput.value = '';
        
        // Callback
        onSuccess(user);
      }, 600);
      
    } catch (err) {
      // Error state
      btn.classList.remove('loading');
      btn.disabled = false;
      if (btnText) btnText.textContent = 'লগইন করুন';
      setMsg(err.message || 'লগইন ব্যর্থ', true);
      
      // Shake animation
      const card = $('loginCard');
      if (card) {
        card.classList.add('shake');
        setTimeout(() => card.classList.remove('shake'), 500);
      }
      
      // Focus on password field
      pwInput.focus();
      pwInput.select();
    }
  });
  
  /* ---- Focus management ---- */
  if (userInput) {
    userInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        pwInput?.focus();
      }
    });
  }
}
