/* =====================================================================
   app.js — Main Bootstrap (Complete)
   কাজী মোশাররফ টাওয়ার ভবন মালিক সমিতি
   ===================================================================== */

import { APP_CONFIG } from './config.js';
import { SB, DB } from './core/db.js';
import { restore, logout, getUser, isAdmin } from './core/auth.js';
import { runSplash } from './ui/splash.js';
import { showLogin, hideLogin, setupLoginForm } from './ui/login.js';
import { toast } from './ui/toast.js';
import { ask } from './ui/modal.js';
import { setupNav, goTo, onViewChange, getCurrentView } from './ui/nav.js';
import { renderDashboard } from './features/dashboard.js';
import { setupEntry, setupPaymentChips, initDate, resetForm } from './features/entry.js';
import { renderTransactions } from './features/transactions.js';
import { currentYM } from './utils/bn.js';

/* ============ DOM Helpers ============ */
const $ = id => document.getElementById(id);

/* ============ State ============ */
let currentMonth = currentYM();

/* ============ App Shell ============ */
function showAppShell() {
  hideLogin();
  const app = $('appShell');
  if (app) app.hidden = false;
  
  const user = getUser();
  const userName = $('userName');
  if (userName && user) userName.textContent = user.fullName;
  
  // Role class on body  document.body.classList.remove('r-admin', 'r-accountant', 'r-viewer');
  if (user?.role) document.body.classList.add('r-' + user.role);
  
  // Admin menu visibility
  const adminMenu = $('adminMenu');
  if (adminMenu) {
    adminMenu.hidden = user?.role !== 'admin';
  }
  
  // Update month input
  const monthInput = $('monthInput');
  if (monthInput) monthInput.value = currentMonth;
}

function hideAppShell() {
  const app = $('appShell');
  if (app) app.hidden = true;
}

/* ============ Rendering ============ */
function renderAll() {
  const view = getCurrentView();
  
  if (view === 'dash') {
    renderDashboard(currentMonth);
  } else if (view === 'list') {
    renderTransactions(currentMonth);
  }
}

/* ============ Month Change ============ */
function setupMonthInput() {
  const monthInput = $('monthInput');
  if (!monthInput) return;
  
  monthInput.value = currentMonth;
  monthInput.addEventListener('change', () => {
    if (monthInput.value) {
      currentMonth = monthInput.value;
      renderAll();
    }
  });
}

/* ============ Admin Menu ============ */
function setupAdminMenu() {
  const btn = $('adminMenuBtn');
  const panel = $('adminMenuPanel');
  if (!btn || !panel) return;
  
  function close() {
    panel.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
  }
  function open() {
    panel.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
  }
  
  btn.addEventListener('click', e => {
    e.stopPropagation();
    panel.hidden ? open() : close();
  });
  
  document.addEventListener('click', e => {
    if (!panel.hidden && !panel.contains(e.target) && e.target !== btn) {
      close();
    }
  });
  
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !panel.hidden) close();
  });
  
  panel.addEventListener('click', e => {
    const b = e.target.closest('button[data-act]');
    if (!b) return;
    close();
    handleAdminAction(b.dataset.act);
  });
}

async function handleAdminAction(act) {
  if (!isAdmin()) {
    toast('শুধু অ্যাডমিন এই কাজ করতে পারবেন', 'err');
    return;
  }
  
  // Placeholder — পরের আপডেটে সম্পূর্ণ হবে
  switch (act) {
    case 'open':
      toast('জের সম্পাদনা — শীঘ্রই আসছে');
      break;
    case 'transfer':
      toast('ট্রান্সফার জের — শীঘ্রই আসছে');
      break;
    case 'sc':
      toast('সার্ভিস চার্জ সেটআপ — শীঘ্রই আসছে');
      break;
    case 'users':
      toast('ইউজার ম্যানেজমেন্ট — শীঘ্রই আসছে');
      break;
  }
}

/* ============ Logout ============ */
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

/* ============ Change Password ============ */
async function handleChangePassword() {
  const { changePassword } = await import('./core/auth.js');
  
  const r = await ask({
    title: 'পাসওয়ার্ড পরিবর্তন',
    fields: [
      { label: 'বর্তমান পাসওয়ার্ড', type: 'password' },
      { label: 'নতুন পাসওয়ার্ড', type: 'password' },
      { label: 'আবার লিখুন', type: 'password' },
    ],
    ok: 'পরিবর্তন করুন',
  });
  
  if (!r) return;
  
  const [current, newPw, confirm] = r;
  
  if (!current || !newPw) {
    return toast('সব ঘর পূরণ করুন', 'err');
  }
  if (newPw.length < 6) {
    return toast('পাসওয়ার্ড কমপক্ষে ৬ অক্ষর', 'err');
  }
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

/* ============ Summary Sheet (placeholder) ============ */
function handleSummary() {
  toast('সামারি শীট — শীঘ্রই আসছে');
}

/* ============ Boot ============ */
async function boot() {
  // Setup login
  setupLoginForm((user) => {
    showAppShell();
    setupAfterLogin();
    toast('স্বাগতম, ' + user.fullName, 'ok');
  });
  
  // Logout & change pw
  $('btnLogout')?.addEventListener('click', handleLogout);
  $('btnChangePw')?.addEventListener('click', handleChangePassword);
  $('btnSummary')?.addEventListener('click', handleSummary);
  
  // Check Supabase
  if (!SB.configured()) {
    await runSplash();
    showLogin();
    toast('Supabase কনফিগার করা হয়নি', 'err');
    return;
  }
  
  // Try restore
  let user = null;
  try {
    user = await restore();
  } catch (e) {
    console.error('Restore failed:', e);
  }
  
  // Load data if logged in
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
  
  // Show screen
  if (user) {
    showAppShell();
    setupAfterLogin();
    toast('স্বাগতম, ' + user.fullName, 'ok');
  } else {
    showLogin();
  }
}

/* ============ Setup after login ============ */
function setupAfterLogin() {
  // Nav
  setupNav();
  
  // Month input
  setupMonthInput();
  
  // Admin menu
  setupAdminMenu();
  
  // Entry form
  setupPaymentChips();
  initDate();
  setupEntry({
    onSave: (month) => {
      if (month) currentMonth = month;
      const monthInput = $('monthInput');
      if (monthInput) monthInput.value = currentMonth;
    },
  });
  
  // View change listener
  onViewChange((view) => {
    if (view === 'dash') {
      renderDashboard(currentMonth);
    } else if (view === 'list') {
      renderTransactions(currentMonth);
    } else if (view === 'add') {
      // Entry form already set up
    }
  });
  
  // Global data-changed listener
  window.addEventListener('data-changed', () => {
    renderAll();
  });
  
  // Initial render
  renderAll();
}

/* ============ Bootstrap ============ */
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
  window.__APP = { SB, DB, getUser, isAdmin, logout, goTo, renderAll };
}
