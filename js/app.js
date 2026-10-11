/* =====================================================================
   app.js — Main Bootstrap
   কাজী মোশাররফ টাওয়ার ভবন মালিক সমিতি
   ===================================================================== */

import { APP_CONFIG } from './config.js';
import { SB, DB } from './core/db.js';
import { restore, logout, getUser, isAdmin } from './core/auth.js';
import { runSplash, finishSplash } from './ui/splash.js';
import { showLogin, hideLogin, setupLoginForm } from './ui/login.js';
import { toast } from './ui/toast.js';

/* ============ DOM Helpers ============ */
const $ = id => document.getElementById(id);

/* ============ App Shell ============ */
function showAppShell() {
  hideLogin();
  const app = $('appShell');
  if (app) app.hidden = false;
  
  const user = getUser();
  const userName = $('userName');
  if (userName && user) userName.textContent = user.fullName;
  
  // Role-based class on body
  document.body.classList.remove('r-admin', 'r-accountant', 'r-viewer');
  if (user?.role) document.body.classList.add('r-' + user.role);
}

function hideAppShell() {
  const app = $('appShell');
  if (app) app.hidden = true;
}

/* ============ Logout Handler ============ */
async function handleLogout() {
  try {
    await logout();
    hideAppShell();
    showLogin();
    toast('লগআউট হয়েছে');
  } catch (e) {
    toast(e.message || 'লগআউট ব্যর্থ', 'err');
  }
}

/* ============ Change Password Handler ============ */
async function handleChangePassword() {
  const { changePassword } = await import('./core/auth.js');
  
  const current = prompt('বর্তমান পাসওয়ার্ড দিন:');
  if (!current) return;
  
  const newPw = prompt('নতুন পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর):');
  if (!newPw) return;
  
  const confirm = prompt('আবার নতুন পাসওয়ার্ড দিন:');
  if (!confirm) return;
  
  if (newPw !== confirm) {
    return toast('নতুন পাসওয়ার্ড দুইবার একই হয়নি', 'err');
  }
  
  try {
    await changePassword(current, newPw);
    toast('পাসওয়ার্ড পরিবর্তিত হয়েছে', 'ok');
  } catch (e) {
    toast(e.message || 'পরিবর্তন ব্যর্থ', 'err');
  }
}

/* ============ Main Boot ============ */
async function boot() {
  // Setup login form (callback when login succeeds)
  setupLoginForm((user) => {
    showAppShell();
    toast('স্বাগতম, ' + user.fullName, 'ok');
  });
  
  // Setup logout
  const btnLogout = $('btnLogout');
  if (btnLogout) btnLogout.addEventListener('click', handleLogout);
  
  // Setup change password
  const btnChangePw = $('btnChangePw');
  if (btnChangePw) btnChangePw.addEventListener('click', handleChangePassword);
  
  // Check if Supabase is configured
  if (!SB.configured()) {
    await runSplash();
    showLogin();
    toast('Supabase কনফিগার করা হয়নি', 'err');
    return;
  }
  
  // Try to restore session
  let user = null;
  try {
    user = await restore();
  } catch (e) {
    console.error('Restore failed:', e);
  }
  
  // Fetch data if logged in
  if (user) {
    try {
      await DB.init();
    } catch (e) {
      console.error('DB init failed:', e);
      toast(e.message || 'ডাটা লোড ব্যর্থ', 'err');
      user = null;
    }
  }
  
  // End splash
  await runSplash();
  
  // Show appropriate screen
  if (user) {
    showAppShell();
    toast('স্বাগতম, ' + user.fullName, 'ok');
  } else {
    showLogin();
  }
}

/* ============ Bootstrap on Load ============ */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

/* ============ Global error handler ============ */
window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled promise rejection:', e.reason);
});

/* ============ Debug ============ */
if (typeof window !== 'undefined') {
  window.__APP = { SB, DB, getUser, isAdmin, logout };
}
