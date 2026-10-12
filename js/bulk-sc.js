/* =====================================================================
   bulk-sc.js — Bulk Service Charge Entry
   কাজী মোশাররফ টাওয়ার ভবন মালিক সমিতি
   
   একসাথে অনেক ফ্ল্যাটের সার্ভিস চার্জ এন্ট্রি।
   ===================================================================== */

/* ===== State ===== */
let bulkSel = {};

/* ===== Helpers ===== */
const _b$ = id => document.getElementById(id);

function _bParseDMY(v) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(v).trim());
  if (!m) return '';
  const [, d, mo, y] = m;
  const dt = new Date(+y, +mo - 1, +d);
  return dt.getFullYear() == y && dt.getMonth() == mo - 1 && dt.getDate() == d
    ? `${y}-${mo}-${d}` : '';
}
function _bFmtDMY(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
function _bTodayISO() {
  const d = new Date(), z = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}
function _bMaskDMY(v) {
  const raw = String(v).replace(/[০-৯]/g, c => '০১২৩৪৫৬৭৮৯'.indexOf(c)).replace(/\D/g, '').slice(0, 8);
  if (raw.length > 4) return raw.slice(0, 2) + '/' + raw.slice(2, 4) + '/' + raw.slice(4);
  if (raw.length > 2) return raw.slice(0, 2) + '/' + raw.slice(2);
  return raw;
}

/* ===== Open / Close ===== */
function openBulkSc() {
  const ov = _b$('bulkScOv');
  if (!ov) return;

  // Month default = previous month
  const d = new Date();
  const prev = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  const prevYM = prev.getFullYear() + '-' + String(prev.getMonth() + 1).padStart(2, '0');
  _b$('bulkMonth').value = prevYM;

  // Date default = today
  const todayISO = _bTodayISO();
  _b$('bulkDate').value = _bFmtDMY(todayISO);
  _b$('bulkDatePick').value = todayISO;

  // Payment options
  _b$('bulkAcct').innerHTML = '<option value="">বাছাই করুন</option>' +
    ACCTS.map(a => `<option value="${a.k}">${a.s}</option>`).join('');
  _b$('bulkAcct').value = 'cash';

  // Init state
  bulkSel = {};
  const defAcct = 'cash';

  FLATS.forEach(x => {
    const rate = expAmt(x.f);
    bulkSel[x.f] = {
      checked: true,
      date: todayISO,
      amount: rate > 0 ? rate : '',
      acct: defAcct,
      owner: x.o,
    };
  });

  renderBulkList();
  ov.hidden = false;
  _b$('bulkList').scrollTop = 0;
}

function closeBulkSc() {
  const ov = _b$('bulkScOv');
  if (ov) ov.hidden = true;
  bulkSel = {};
}

/* ===== Render list ===== */
function renderBulkList() {
  const box = _b$('bulkList');
  if (!box) return;

  const acctOpts = ACCTS.map(a => [a.k, a.s]);

  box.innerHTML = FLATS.map(x => {
    const s = bulkSel[x.f];
    if (!s) return '';

    const checked = s.checked ? 'checked' : '';
    const cls = s.checked ? 'checked' : '';

    return `
      <div class="bulk-item ${cls}" data-flat="${esc(x.f)}">
        <div class="bulk-check">
          <input type="checkbox" ${checked} data-role="check">
          <span class="box"></span>
        </div>
        <div class="bulk-info">
          <div class="bulk-flat">${esc(x.f)}</div>
          <div class="bulk-owner">${esc(x.o)}</div>
        </div>
        <div class="bulk-inputs">
          <div class="dwrap" style="margin:0">
            <input type="text" inputmode="numeric" maxlength="10" placeholder="DD/MM/YYYY"
                   value="${_bFmtDMY(s.date)}" data-role="date" autocomplete="off">
            <span class="cal">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="5" width="18" height="16" rx="2"/>
                <path d="M3 10h18M8 3v4M16 3v4"/>
              </svg>
            </span>
            <input type="date" class="dpk" data-role="datepick" value="${s.date}" aria-label="ক্যালেন্ডার">
          </div>
          <input type="number" min="0" step="any" inputmode="decimal"
                 placeholder="৳" value="${s.amount || ''}" data-role="amount">
          <select data-role="acct">
            ${acctOpts.map(([k, t]) =>
              `<option value="${k}"${k === s.acct ? ' selected' : ''}>${t}</option>`
            ).join('')}
          </select>
        </div>
      </div>
    `;
  }).join('');

  // Attach events
  box.querySelectorAll('.bulk-item').forEach(el => {
    const flat = el.dataset.flat;
    const dateInput = el.querySelector('[data-role="date"]');
    const datePicker = el.querySelector('[data-role="datepick"]');

    // Checkbox
    el.querySelector('[data-role="check"]').addEventListener('change', e => {
      bulkSel[flat].checked = e.target.checked;
      el.classList.toggle('checked', e.target.checked);
      updateBulkSummary();
    });

    // Date text input
    dateInput.addEventListener('input', () => {
      dateInput.value = _bMaskDMY(dateInput.value);
      const iso = _bParseDMY(dateInput.value);
      if (iso) {
        bulkSel[flat].date = iso;
        if (datePicker) datePicker.value = iso;
      }
    });

    // Date picker (native calendar)
    if (datePicker) {
      datePicker.addEventListener('change', () => {
        if (datePicker.value) {
          bulkSel[flat].date = datePicker.value;
          dateInput.value = _bFmtDMY(datePicker.value);
        }
      });
    }

    // Amount
    el.querySelector('[data-role="amount"]').addEventListener('input', e => {
      bulkSel[flat].amount = e.target.value;
      updateBulkSummary();
    });

    // Payment
    el.querySelector('[data-role="acct"]').addEventListener('change', e => {
      bulkSel[flat].acct = e.target.value;
    });
  });

  updateBulkSummary();
}

/* ===== Summary ===== */
function updateBulkSummary() {
  let count = 0;
  let total = 0;

  Object.keys(bulkSel).forEach(flat => {
    const s = bulkSel[flat];
    if (!s.checked) return;
    count++;
    total += (+s.amount || 0);
  });

  const cntEl = _b$('bulkCount');
  const totEl = _b$('bulkTotal');
  if (cntEl) cntEl.textContent = bd(count);
  if (totEl) totEl.textContent = tk(total);

  const saveBtn = _b$('bulkSave');
  if (saveBtn) {
    saveBtn.textContent = count > 0
      ? `${bd(count)}টি এন্ট্রি তৈরি করুন`
      : 'এন্ট্রি তৈরি করুন';
    saveBtn.disabled = count === 0;
  }
}

/* ===== Bulk Actions ===== */
function bulkSetAllDate() {
  const iso = _bParseDMY(_b$('bulkDate').value);
  if (!iso) return toast('সঠিক তারিখ দিন', true);

  Object.keys(bulkSel).forEach(flat => {
    if (bulkSel[flat].checked) bulkSel[flat].date = iso;
  });
  renderBulkList();
  toast('সব checked-এ তারিখ বসানো হয়েছে');
}

function bulkSetAllAcct() {
  const acct = _b$('bulkAcct').value;
  if (!acct) return toast('Payment বাছাই করুন', true);

  Object.keys(bulkSel).forEach(flat => {
    if (bulkSel[flat].checked) bulkSel[flat].acct = acct;
  });
  renderBulkList();
  toast('সব checked-এ payment বসানো হয়েছে');
}

function bulkSelectAll() {
  Object.keys(bulkSel).forEach(flat => { bulkSel[flat].checked = true; });
  renderBulkList();
}

function bulkDeselectAll() {
  Object.keys(bulkSel).forEach(flat => { bulkSel[flat].checked = false; });
  renderBulkList();
}

/* ===== Save ===== */
async function bulkSave() {
  const items = [];
  const errors = [];

  Object.keys(bulkSel).forEach(flat => {
    const s = bulkSel[flat];
    if (!s.checked) return;

    const iso = _bParseDMY(_bFmtDMY(s.date));
    if (!iso) { errors.push(`${flat}: তারিখ ভুল`); return; }
    if (!(s.amount > 0)) { errors.push(`${flat}: পরিমাণ দিন`); return; }
    if (!s.acct) { errors.push(`${flat}: Payment বাছাই করুন`); return; }

    items.push({
      flat,
      date: iso,
      amount: +s.amount,
      acct: s.acct,
      owner: s.owner,
    });
  });

  if (errors.length) {
    return toast(errors[0] + (errors.length > 1 ? ` (+${errors.length - 1} আরো)` : ''), true);
  }
  if (!items.length) {
    return toast('কোনো ফ্ল্যাট বাছাই করা হয়নি', true);
  }

  const ym = _b$('bulkMonth').value;
  if (!ym) return toast('মাস বাছাই করুন', true);
  const monthFirstDay = ym + '-01';

  const catId = DB.catTop['income|মাসিক সার্ভিস চার্জ'];
  const subId = catId && DB.catSub[catId + '|ফ্ল্যাটের সার্ভিস চার্জ'];
  if (!catId || !subId) {
    return toast('সার্ভিস চার্জের খাত পাওয়া যায়নি', true);
  }

  const payload = items.map(it => {
    const acctRow = DB.accCode[it.acct];
    const flatId = DB.flatId[it.flat];
    if (!acctRow) throw new Error(`হিসাব "${it.acct}" নেই`);
    if (!flatId) throw new Error(`ফ্ল্যাট "${it.flat}" নেই`);

    return {
      kind: 'income',
      date: it.date,
      cat: catId,
      sub: subId,
      acct: acctRow.id,
      amount: it.amount,
      flat: flatId,
      owner: it.owner || null,
      month: monthFirstDay,
      note: '',
    };
  });

  const btn = _b$('bulkSave');
  const lab = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'সংরক্ষণ হচ্ছে…';

  try {
    const res = await SB.req('/rest/v1/rpc/add_txn_batch', {
      method: 'POST',
      body: { p_items: payload },
    });

    const count = res && res.count ? res.count : payload.length;
    toast(`${bd(count)}টি এন্ট্রি তৈরি হয়েছে ✓`);

    await DB.reload();
    closeBulkSc();
    document.querySelector('nav button[data-v="dash"]').click();
    await render();
  } catch (e) {
    toast(e.message || 'সংরক্ষণ ব্যর্থ', true);
    btn.disabled = false;
    btn.textContent = lab;
  }
}

/* ===== Setup listeners ===== */
function setupBulkSc() {
  const ov = _b$('bulkScOv');
  if (!ov) return;

  // Close
  const xBtn = _b$('bulkScX'); if (xBtn) xBtn.onclick = closeBulkSc;
  const cancelBtn = _b$('bulkCancel'); if (cancelBtn) cancelBtn.onclick = closeBulkSc;

  // Bulk actions
  const setDateBtn = _b$('bulkSetAllDate'); if (setDateBtn) setDateBtn.onclick = bulkSetAllDate;
  const setAcctBtn = _b$('bulkSetAllAcct'); if (setAcctBtn) setAcctBtn.onclick = bulkSetAllAcct;
  const selAllBtn = _b$('bulkSelectAll'); if (selAllBtn) selAllBtn.onclick = bulkSelectAll;
  const deselAllBtn = _b$('bulkDeselectAll'); if (deselAllBtn) deselAllBtn.onclick = bulkDeselectAll;

  // Save
  const saveBtn = _b$('bulkSave'); if (saveBtn) saveBtn.onclick = bulkSave;

  // ===== TOP DATE INPUT =====
  const topDateInput = _b$('bulkDate');
  const topDatePicker = _b$('bulkDatePick');

  if (topDateInput) {
    topDateInput.addEventListener('input', () => {
      topDateInput.value = _bMaskDMY(topDateInput.value);
      const iso = _bParseDMY(topDateInput.value);
      if (iso && topDatePicker) topDatePicker.value = iso;
    });
  }
  if (topDatePicker) {
    topDatePicker.addEventListener('change', () => {
      if (topDatePicker.value && topDateInput) {
        topDateInput.value = _bFmtDMY(topDatePicker.value);
      }
    });
  }

  // Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !ov.hidden) closeBulkSc();
  });
}

/* ===== Global expose ===== */
window.openBulkSc = openBulkSc;
window.closeBulkSc = closeBulkSc;
window.setupBulkSc = setupBulkSc;
