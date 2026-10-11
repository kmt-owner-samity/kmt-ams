/* =====================================================================
   transactions.js — Transaction List View
   ===================================================================== */

import { DB } from '../core/db.js';
import { toast } from '../ui/toast.js';
import { ask } from '../ui/modal.js';
import { tk, esc } from '../utils/format.js';
import { bd, bnDate } from '../utils/bn.js';
import { mkey } from '../utils/calc.js';

/* ============ Render transaction list ============ */
export function renderTransactions(month) {
  const tbody = document.getElementById('txnBody');
  if (!tbody) return;
  
  const current = DB.all.filter(t => mkey(t.date) === month);
  const rows = [...current].sort((a, b) => b.date.localeCompare(a.date));
  
  if (!rows.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-state">
          <div class="em-icon">📭</div>
          এই মাসে কোনো লেনদেন নেই। "আয়/ব্যয় এন্ট্রি" থেকে যোগ করুন।
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = rows.map(t => rowHTML(t)).join('');
  
  // Attach click handlers
  tbody.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const { action, id } = btn.dataset;
      if (action === 'edit') handleEdit(id);
      else if (action === 'delete') handleDelete(id);
    });
  });
}

/* ============ Row HTML ============ */
function rowHTML(t) {
  const isTransfer = t.type === 'transfer';
  const isIncome = t.type === 'income';
  
  const badge = isTransfer
    ? '<span class="txn-badge t">ট্রান্সফার</span>'
    : isIncome
      ? '<span class="txn-badge i">আয়</span>'
      : '<span class="txn-badge o">ব্যয়</span>';
  
  const amountCls = isTransfer ? 't' : isIncome ? 'i' : 'o';
  const sign = isTransfer ? '' : isIncome ? '+ ' : '− ';
  
  const sub = buildSub(t);
  
  const actions = isTransfer ? '' : `
    <div class="txn-actions">
      <button type="button" data-action="edit" data-id="${t.id}" title="সম্পাদনা">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 20h4L19 9l-4-4L4 16zM13 7l4 4"/>
        </svg>
      </button>
      <button type="button" class="danger" data-action="delete" data-id="${t.id}" title="মুছুন">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>
        </svg>
      </button>
    </div>
  `;
  
  return `
    <tr>
      <td>${bnDate(t.date)}</td>
      <td>${badge}</td>
      <td>
        ${esc(t.group)}
        <span class="txn-sub">${sub}</span>
      </td>
      <td class="n"><span class="txn-amount ${amountCls}">${sign}${tk(t.amount)}</span></td>
      <td class="n actions-cell">${actions}</td>
    </tr>
  `;
}

function buildSub(t) {
  const parts = [];
  if (t.item) parts.push(t.item);
  if (t.flat) parts.push('ফ্ল্যাট ' + t.flat);
  if (t.smonths && t.smonths.length) {
    parts.push('মাস: ' + t.smonths.map(ym => bd(ym)).join(', '));
  }
  if (t.note) parts.push(t.note);
  return parts.map(esc).join(' · ');
}

/* ============ Edit handler ============ */
async function handleEdit(id) {
  const { startEdit } = await import('./entry.js');
  startEdit(id);
}

/* ============ Delete handler ============ */
async function handleDelete(id) {
  const t = DB.all.find(x => String(x.id) === String(id));
  if (!t) return;
  
  const ok = await ask({
    title: 'এন্ট্রি মুছবেন?',
    msg: `${esc(t.group)} — ${tk(t.amount)} এই লেনদেনটি মুছে ফেলা হবে।`,
    ok: 'মুছুন',
    cancel: 'বাতিল',
  });
  
  if (ok === null) return;
  
  try {
    await DB.remove(id);
    toast('মুছে ফেলা হয়েছে', 'ok');
    // Trigger re-render via global event
    window.dispatchEvent(new CustomEvent('data-changed'));
  } catch (e) {
    toast(e.message || 'মুছতে ব্যর্থ', 'err');
  }
}
