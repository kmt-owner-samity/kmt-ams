/* =====================================================================
   dashboard.js — Dashboard Screen
   4 summary cards + 3 account cards + income/expense breakdown
   ===================================================================== */

import { DB } from '../core/db.js';
import { calculate, breakdown } from '../utils/calc.js';
import { tk, esc } from '../utils/format.js';
import { bd } from '../utils/bn.js';

/* ============ SVG Icons ============ */
const ICONS = {
  opening: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 109-9 9 9 0 00-6.7 3M3 4v5h5M12 7v5l3 2"/></svg>`,
  income: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v12m0 0l-5-5m5 5l5-5M5 20h14"/></svg>`,
  expense: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V8m0 0l-5 5m5-5l5 5M5 4h14"/></svg>`,
  current: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 012-2h13v4M3 7v10a2 2 0 002 2h14a1 1 0 001-1v-9H5a2 2 0 01-2-2zM16 14h2"/></svg>`,
};

/* ============ Account Icons ============ */
const ACCT_ICONS = {
  cash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/></svg>`,
  bank: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10l9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18"/></svg>`,
};

/* ============ Account Colors ============ */
const ACCT_COLORS = {
  cash: { bg: '#fef3c7', fg: '#b45309' },
  nbl: { bg: '#ccfbf1', fg: '#0f766e' },
  pbl: { bg: '#e0e7ff', fg: '#4338ca' },
};

/* ============ Main render ============ */
export function renderDashboard(month) {
  if (!month) return;
  
  const c = calculate(month);
  
  renderSummary(c);
  renderAccounts(c);
  renderBreakdown('income', c.current, c.totalIncome);
  renderBreakdown('expense', c.current, c.totalExpense);
}

/* ---- Summary Cards ---- */
function renderSummary(c) {
  const grid = document.getElementById('summaryGrid');
  if (!grid) return;
  
  grid.innerHTML = `
    <div class="summary-card opening">
      <div class="ic">${ICONS.opening}</div>
      <span class="label">প্রারম্ভিক জের</span>
      <div class="amount">${tk(c.openingBalance)}</div>
    </div>
    <div class="summary-card income">
      <div class="ic">${ICONS.income}</div>
      <span class="label">মোট আয়</span>
      <div class="amount">${tk(c.totalIncome)}</div>
    </div>
    <div class="summary-card expense">
      <div class="ic">${ICONS.expense}</div>
      <span class="label">মোট ব্যয়</span>
      <div class="amount">${tk(c.totalExpense)}</div>
    </div>
    <div class="summary-card current">
      <div class="ic">${ICONS.current}</div>
      <span class="label">বর্তমান জের</span>
      <div class="amount">${tk(c.currentBalance)}</div>
    </div>
  `;
}

/* ---- Account Cards ---- */
function renderAccounts(c) {
  const grid = document.getElementById('accountsGrid');
  if (!grid) return;
  
  grid.innerHTML = c.accounts.map(a => {
    const colors = ACCT_COLORS[a.code] || ACCT_COLORS.cash;
    const icon = a.code === 'cash' ? ACCT_ICONS.cash : ACCT_ICONS.bank;
    const shortName = getShortName(a.name);
    
    return `
      <div class="account-card" style="--acct-bg:${colors.bg};--acct-color:${colors.fg}">
        <div class="acct-icon">${icon}</div>
        <span class="acct-name">${esc(shortName)}</span>
        <div class="acct-balance">${tk(a.balance)}</div>
      </div>
    `;
  }).join('');
}

function getShortName(fullName) {
  // 'ন্যাশনাল ব্যাংক পিএলসি' → 'ন্যাশনাল ব্যাংক'
  // 'পূবালী ব্যাংক পিএলসি' → 'পূবালী ব্যাংক'
  // 'নগদ টাকা' → 'নগদ'
  return fullName
    .replace(' পিএলসি', '')
    .replace(' টাকা', '');
}

/* ---- Breakdown (income/expense) ---- */
function renderBreakdown(type, txns, total) {
  const containerId = type === 'income' ? 'bdIncome' : 'bdExpense';
  const box = document.getElementById(containerId);
  if (!box) return;
  
  const items = breakdown(txns, type, total);
  const color = type === 'income' ? 'var(--in)' : 'var(--out)';
  
  if (!items.length) {
    box.innerHTML = `
      <div class="empty-state">
        <div class="em-icon">📭</div>
        এই মাসে কোনো ${type === 'income' ? 'আয়' : 'ব্যয়'} নেই
      </div>
    `;
    return;
  }
  
  box.innerHTML = items.map(item => `
    <details>
      <summary>
        <span>${esc(item.name)}</span>
        <span>${tk(item.sum)}</span>
      </summary>
      <div class="detail-bar">
        <i style="width:${item.percent}%;background:${color}"></i>
      </div>
      ${item.items.map(sub => `
        <div class="detail-sub">
          <span>${esc(sub.name)}</span>
          <span>${tk(sub.amount)}</span>
        </div>
      `).join('')}
    </details>
  `).join('') + `
    <div class="detail-total ${type === 'income' ? 'in' : 'out'}">
      <span>মোট</span>
      <span>${tk(total)}</span>
    </div>
  `;
}
