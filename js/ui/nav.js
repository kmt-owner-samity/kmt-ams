/* =====================================================================
   nav.js — Tab Navigation Controller
   কাজী মোশাররফ টাওয়ার ভবন মালিক সমিতি
   ===================================================================== */

/* ============ State ============ */
let currentView = 'dash';
const listeners = new Set();

/* ============ Public API ============ */

/**
 * বর্তমান view name
 */
export function getCurrentView() {
  return currentView;
}

/**
 * একটি view-এ যান
 * @param {string} viewName - 'dash' | 'add' | 'list'
 */
export function goTo(viewName) {
  if (!viewName) return;
  if (currentView === viewName) return;
  
  currentView = viewName;
  
  // Update nav buttons
  document.querySelectorAll('.nav-tabs button[data-v]').forEach(btn => {
    btn.classList.toggle('on', btn.dataset.v === viewName);
  });
  
  // Update views
  document.querySelectorAll('.view').forEach(v => {
    v.classList.toggle('on', v.id === 'v-' + viewName);
  });
  
  // Show/hide month bar (only on dashboard)
  const monthBar = document.getElementById('monthBar');
  if (monthBar) {
    monthBar.hidden = viewName === 'add';
  }
  
  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
  
  // Notify listeners
  listeners.forEach(fn => {
    try { fn(viewName); } catch (e) { console.error('Nav listener error:', e); }
  });
}

/**
 * View change listener যোগ করুন
 * @param {Function} fn - (viewName) => void
 */
export function onViewChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Nav setup — buttons-এ click handler যোগ করে
 */
export function setupNav() {
  const navButtons = document.querySelectorAll('.nav-tabs button[data-v]');
  
  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      goTo(btn.dataset.v);
    });
  });
  
  // Initial view
  goTo('dash');
}
