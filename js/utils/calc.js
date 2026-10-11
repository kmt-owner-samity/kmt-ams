/* =====================================================================
   calc.js — Financial Calculations
   কাজী মোশাররফ টাওয়ার ভবন মালিক সমিতি
   ===================================================================== */

import { DB } from '../core/db.js';

/* ============ Month Key Helper ============ */
export function mkey(dateStr) {
  return dateStr.slice(0, 7);   // '2026-10-15' → '2026-10'
}

/* ============ Sum helpers ============ */
function sumBy(arr, type, acct) {
  return arr
    .filter(t => t.type === type && (!acct || t.acct === acct))
    .reduce((s, t) => s + t.amount, 0);
}

function transferNet(arr, acctKey) {
  return arr
    .filter(t => t.type === 'transfer')
    .reduce((s, t) => {
      if (t.to === acctKey) return s + t.amount;
      if (t.from === acctKey) return s - t.amount;
      return s;
    }, 0);
}

/* ============ Main Calculation ============ */
/**
 * একটি মাসের সম্পূর্ণ হিসাব বের করে
 * @param {string} month - 'YYYY-MM'
 * @returns {Object} calculation result
 */
export function calculate(month) {
  const all = DB.all;
  const open0 = DB.op;
  const ACCTS = Object.values(DB.accCode);
  
  const current = all.filter(t => mkey(t.date) === month);
  const previous = all.filter(t => mkey(t.date) < month);
  
  // Total opening (all 3 accounts)
  const totalOpening = ACCTS.reduce((s, a) => s + (open0[a.code] || 0), 0);
  
  // Previous balance
  const prevBal = totalOpening 
    + sumBy(previous, 'income') 
    - sumBy(previous, 'expense');
  
  // Current month
  const income = sumBy(current, 'income');
  const expense = sumBy(current, 'expense');
  const currentBal = prevBal + income - expense;
  
  // Per-account breakdown
  const accounts = ACCTS.map(a => {
    const opening = open0[a.code] || 0;
    const prevIn = sumBy(previous, 'income', a.code);
    const prevOut = sumBy(previous, 'expense', a.code);
    const prevTransfers = transferNet(previous, a.code);
    const prevTotal = opening + prevIn - prevOut + prevTransfers;
    
    const curIn = sumBy(current, 'income', a.code);
    const curOut = sumBy(current, 'expense', a.code);
    const curTransfers = transferNet(current, a.code);
    const curTotal = prevTotal + curIn - curOut + curTransfers;
    
    return {
      code: a.code,
      name: a.name,
      opening: prevTotal,
      income: curIn,
      expense: curOut,
      transfer: curTransfers,
      balance: curTotal,
    };
  });
  
  return {
    month,
    current,
    previous,
    openingBalance: prevBal,
    totalIncome: income,
    totalExpense: expense,
    currentBalance: currentBal,
    accounts,
  };
}

/* ============ Breakdown by category ============ */
/**
 * একটি মাসের transactions থেকে group/sub breakdown
 * @param {Array} txns - current month transactions
 * @param {string} type - 'income' | 'expense'
 * @param {number} total
 * @returns {Array} breakdown array
 */
export function breakdown(txns, type, total) {
  const filtered = txns.filter(t => t.type === type);
  const groups = {};
  
  filtered.forEach(t => {
    if (!groups[t.group]) {
      groups[t.group] = { sum: 0, items: {} };
    }
    groups[t.group].sum += t.amount;
    groups[t.group].items[t.item] = (groups[t.group].items[t.item] || 0) + t.amount;
  });
  
  return Object.entries(groups)
    .map(([name, data]) => ({
      name,
      sum: data.sum,
      percent: total ? (data.sum / total) * 100 : 0,
      items: Object.entries(data.items)
        .map(([itemName, amount]) => ({ name: itemName, amount }))
        .sort((a, b) => b.amount - a.amount),
    }))
    .sort((a, b) => b.sum - a.sum);
}

/* ============ Service charge expected amount ============ */
/**
 * একটি ফ্ল্যাটের মাসিক সার্ভিস চার্জ (DB থেকে)
 * @param {string} flatNo - যেমন '২-এ'
 * @returns {number}
 */
export function expAmt(flatNo) {
  const per = DB.scc.per?.[flatNo];
  if (per !== undefined && per !== '' && per !== null) return +per;
  return +DB.scc.def || 0;
}

/* ============ Owner lookup ============ */
/**
 * ফ্ল্যাটের মালিকের নাম (DB থেকে আসবে)
 * আপাতত empty — পরের আপডেটে
 * @param {string} flatNo
 * @returns {string}
 */
export function ownerOf(flatNo) {
  // TODO: এই ফাংশনটি পরে DB.flats থেকে owner_name আনবে
  return '';
}

/* ============ Month list for slider ============ */
/**
 * Service charge-এর জন্য মাসের তালিকা
 * (২ মাস অগ্রিম + current + ২১ মাস অতীত)
 * @param {Array} extra - extra months to include
 * @returns {Array<string>} sorted desc
 */
export function monthList(extra = []) {
  const d = new Date();
  const out = [];
  for (let k = 2; k >= -21; k--) {
    const x = new Date(d.getFullYear(), d.getMonth() + k, 1);
    out.push(x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0'));
  }
  extra.forEach(e => {
    if (e && !out.includes(e)) out.push(e);
  });
  return out.sort().reverse();
}
