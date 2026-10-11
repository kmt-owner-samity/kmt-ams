/* =====================================================================
   entry.js — Income/Expense Entry Form
   Multi-month service charge সহ
   ===================================================================== */

import { DB } from '../core/db.js';
import { toast } from '../ui/toast.js';
import { goTo } from '../ui/nav.js';
import { expAmt, monthList } from '../utils/calc.js';
import { bd, bnMonth, currentYM, prevYM, shiftYM, toDMY, parseDMY, todayISO } from '../utils/bn.js';
import { esc } from '../utils/format.js';

/* ============ DOM Helpers ============ */
const $ = id => document.getElementById(id);

/* ============ State ============ */
let type = 'income';           // 'income' | 'expense'
let editId = null;             // editing transaction id or null
let selectedMonths = new Set();
let amountManuallyEdited = false;
let onSaveCallback = null;     // callback after save

/* ============ Initialize ============ */
export function setupEntry(opts = {}) {
  onSaveCallback = opts.onSave;
  
  // Seg toggle
  document.querySelectorAll('.seg-toggle button').forEach(btn => {
    btn.addEventListener('click', () => {
      if (editId) resetForm();
      setType(btn.dataset.t);
    });
  });
  
  // Date input — DD/MM/YYYY handling
  const dateInput = $('entryDate');
  const datePicker = $('entryDatePicker');
  
  if (dateInput) {
    dateInput.addEventListener('input', () => {
      const raw = dateInput.value.replace(/[০-৯]/g, c => '০১২৩৪৫৬৭৮৯'.indexOf(c)).replace(/\D/g, '').slice(0, 8);
      dateInput.value = raw.length > 4
        ? raw.slice(0, 2) + '/' + raw.slice(2, 4) + '/' + raw.slice(4)
        : raw.length > 2
          ? raw.slice(0, 2) + '/' + raw.slice(2)
          : raw;
      dateInput.setCustomValidity('');
      if (datePicker) datePicker.value = parseDMY(dateInput.value) || '';
    });
  }
  
  if (datePicker) {
    datePicker.addEventListener('change', () => {
      if (datePicker.value && dateInput) {
        dateInput.value = toDMY(datePicker.value);
        dateInput.setCustomValidity('');
      }
    });
  }
  
  // Category dropdowns
  const groupSel = $('entryGroup');
  const subSel = $('entrySub');
  
  if (groupSel) {
    groupSel.addEventListener('change', () => {
      updateSubCategories();
      updateServiceChargeVisibility();
    });
  }
  
  if (subSel) {
    subSel.addEventListener('change', updateServiceChargeVisibility);
  }
  
  // Flat select
  const flatSel = $('entryFlat');
  if (flatSel) {
    flatSel.addEventListener('change', () => {
      showOwner();
      if (!amountManuallyEdited) autoAmount();
    });
  }
  
  // Amount input — track manual edits
  const amountInput = $('entryAmount');
  if (amountInput) {
    amountInput.addEventListener('input', () => {
      amountManuallyEdited = true;
    });
  }
  
  // Month track — month chips
  const monthTrack = $('smTrack');
  if (monthTrack) {
    monthTrack.addEventListener('click', e => {
      const chip = e.target.closest('.month-chip');
      if (!chip) return;
      toggleMonth(chip.dataset.ym);
    });
  }
  
  // Month slider arrows
  const smPrev = $('smPrev');
  const smNext = $('smNext');
  if (smPrev && monthTrack) {
    smPrev.addEventListener('click', () => monthTrack.scrollBy({ left: -200, behavior: 'smooth' }));
  }
  if (smNext && monthTrack) {
    smNext.addEventListener('click', () => monthTrack.scrollBy({ left: 200, behavior: 'smooth' }));
  }
  
  // Save button
  const saveBtn = $('entrySave');
  if (saveBtn) saveBtn.addEventListener('click', handleSave);
  
  // Cancel button
  const cancelBtn = $('entryCancel');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      const was = editId;
      resetForm();
      goTo(was ? 'list' : 'dash');
    });
  }
  
  // Initial setup
  setType('income');
}

/* ============ Type Toggle ============ */
function setType(t) {
  type = t;
  
  document.querySelectorAll('.seg-toggle button').forEach(btn => {
    btn.classList.toggle('on', btn.dataset.t === t);
  });
  
  document.body.classList.toggle('out', t === 'expense');
  
  const w = t === 'income' ? 'আয়' : 'ব্যয়';
  const titleEl = $('entryTitle');
  const saveBtn = $('entrySave');
  
  if (titleEl) titleEl.textContent = (editId ? 'এন্ট্রি সংশোধন — ' : 'নতুন ') + w + ' যোগ করুন';
  if (saveBtn) saveBtn.textContent = editId ? 'হালনাগাদ করুন' : w + ' সংরক্ষণ করুন';
  
  // Populate group dropdown
  populateGroups();
  
  // Reset some state
  if (!editId) {
    selectedMonths = new Set([prevYM()]);
    const flatSel = $('entryFlat');
    if (flatSel) flatSel.value = '';
    amountManuallyEdited = false;
  }
  
  updateSubCategories();
  updateServiceChargeVisibility();
}

/* ============ Categories ============ */
function populateGroups() {
  const sel = $('entryGroup');
  if (!sel) return;
  
  // From DB.catTop
  const prefix = type + '|';
  const groups = Object.keys(DB.catTop)
    .filter(k => k.startsWith(prefix))
    .map(k => k.slice(prefix.length));
  
  sel.innerHTML = '<option value="">খাত বাছাই করুন</option>' +
    groups.map(g => `<option value="${esc(g)}">${esc(g)}</option>`).join('');
  
  sel.value = '';
}

function updateSubCategories() {
  const groupSel = $('entryGroup');
  const subSel = $('entrySub');
  if (!groupSel || !subSel) return;
  
  const groupName = groupSel.value;
  if (!groupName) {
    subSel.innerHTML = '<option value="">আগে খাত বাছাই করুন</option>';
    subSel.disabled = true;
    return;
  }
  
  const parentId = DB.catTop[type + '|' + groupName];
  if (!parentId) {
    subSel.innerHTML = '<option value="">উপ খাত পাওয়া যায়নি</option>';
    subSel.disabled = true;
    return;
  }
  
  // Filter subcategories for this parent
  const prefix = parentId + '|';
  const subs = Object.keys(DB.catSub)
    .filter(k => k.startsWith(prefix))
    .map(k => k.slice(prefix.length));
  
  subSel.innerHTML = '<option value="">উপ খাত বাছাই করুন</option>' +
    subs.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join('');
  subSel.disabled = false;
  subSel.value = '';
}

/* ============ Service Charge Logic ============ */
function updateServiceChargeVisibility() {
  const groupSel = $('entryGroup');
  const subSel = $('entrySub');
  const flatBox = $('flatBox');
  const scBox = $('scBox');
  
  if (!groupSel || !subSel || !flatBox || !scBox) return;
  
  const groupName = groupSel.value;
  const parentId = DB.catTop[type + '|' + groupName];
  
  const isSC = type === 'income' && parentId && DB.scCatId === parentId;
  
  flatBox.hidden = !isSC;
  scBox.hidden = !isSC;
  
  const flatSel = $('entryFlat');
  if (flatSel) flatSel.required = isSC;
  
  if (isSC) {
    populateFlats();
    populateMonths();
    showOwner();
  }
}

function populateFlats() {
  const sel = $('entryFlat');
  if (!sel) return;
  
  const flats = Object.keys(DB.flatId).sort((a, b) => {
    // '২-এ' → floor ২, unit এ
    const [fa] = a.split('-').map(x => parseInt(x.replace(/[০-৯]/g, c => '০১২৩৪৫৬৭৮৯'.indexOf(c))));
    const [fb] = b.split('-').map(x => parseInt(x.replace(/[০-৯]/g, c => '০১২৩৪৫৬৭৮৯'.indexOf(c))));
    return (fa - fb) || a.localeCompare(b);
  });
  
  sel.innerHTML = '<option value="">ফ্ল্যাট বাছাই করুন</option>' +
    flats.map(f => `<option value="${esc(f)}">${esc(f)}</option>`).join('');
  sel.value = '';
}

function showOwner() {
  const sel = $('entryFlat');
  const box = $('ownerDisplay');
  if (!sel || !box) return;
  
  // Owner name DB থেকে আসবে — আপাতত blank
  // (পরের আপডেটে owner_name যোগ হবে)
  box.textContent = '';
}

function populateMonths() {
  const track = $('smTrack');
  if (!track) return;
  
  const months = monthList([...selectedMonths]);
  const cur = currentYM();
  
  track.innerHTML = months.map(ym => {
    const on = selectedMonths.has(ym);
    const adv = ym > cur;
    return `<button type="button" class="month-chip${on ? ' on' : ''}${adv ? ' adv' : ''}" data-ym="${ym}">
      ${esc(bnMonth(ym).slice(0, 3))}-${bd(ym.slice(2, 4))}
    </button>`;
  }).join('');
  
  // Scroll to selected
  setTimeout(() => {
    const selected = track.querySelector('.month-chip.on');
    if (selected) {
      selected.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    }
  }, 50);
}

function toggleMonth(ym) {
  if (selectedMonths.has(ym)) {
    if (selectedMonths.size <= 1) {
      toast('কমপক্ষে একটি মাস বাছাই থাকতে হবে');
      return;
    }
    selectedMonths.delete(ym);
  } else {
    selectedMonths.add(ym);
  }
  
  // Update chip UI
  const track = $('smTrack');
  if (track) {
    const chip = track.querySelector(`[data-ym="${ym}"]`);
    if (chip) chip.classList.toggle('on', selectedMonths.has(ym));
  }
  
  // Recalculate amount
  if (!amountManuallyEdited) autoAmount();
}

function autoAmount() {
  const flatSel = $('entryFlat');
  const amountInput = $('entryAmount');
  if (!flatSel || !amountInput) return;
  if (!flatSel.value) return;
  
  const rate = expAmt(flatSel.value);
  if (rate > 0) {
    amountInput.value = Math.round(rate * selectedMonths.size * 100) / 100;
  }
}

/* ============ Save ============ */
async function handleSave() {
  const dateInput = $('entryDate');
  const groupSel = $('entryGroup');
  const subSel = $('entrySub');
  const amountInput = $('entryAmount');
  const noteInput = $('entryNote');
  const chipChecked = document.querySelector('[name="entryAcct"]:checked');
  
  if (!dateInput || !groupSel || !subSel || !amountInput || !chipChecked) return;
  
  // Validate date
  const iso = parseDMY(dateInput.value);
  if (!iso) {
    dateInput.setCustomValidity('সঠিক তারিখ দিন (DD/MM/YYYY)');
    dateInput.reportValidity();
    return;
  }
  dateInput.setCustomValidity('');
  
  // Validate other fields
  if (!groupSel.value || !subSel.value) {
    toast('খাত ও উপ খাত বাছাই করুন', 'err');
    return;
  }
  
  if (!amountInput.value || +amountInput.value <= 0) {
    toast('সঠিক পরিমাণ দিন', 'err');
    return;
  }
  
  // Build transaction object
  const t = {
    type,
    date: iso,
    amount: +amountInput.value,
    note: noteInput?.value.trim() || '',
    group: groupSel.value,
    item: subSel.value,
    acct: chipChecked.value,
  };
  
  // Service charge fields
  const flatSel = $('entryFlat');
  const isSC = flatSel && !$('flatBox').hidden;
  if (isSC) {
    if (!flatSel.value) {
      toast('ফ্ল্যাট বাছাই করুন', 'err');
      return;
    }
    if (!selectedMonths.size) {
      toast('অন্তত একটি মাস বাছাই করুন', 'err');
      return;
    }
    t.flat = flatSel.value;
    t.smonths = [...selectedMonths].sort();
  }
  
  // Save
  const saveBtn = $('entrySave');
  const originalText = saveBtn.textContent;
  saveBtn.disabled = true;
  saveBtn.textContent = 'সংরক্ষণ হচ্ছে...';
  
  try {
    if (editId) {
      t.id = editId;
      await DB.update(t);
      toast('হালনাগাদ হয়েছে', 'ok');
    } else {
      await DB.add(t);
      toast('সংরক্ষিত হয়েছে', 'ok');
    }
    
    const wasEdit = !!editId;
    resetForm();
    
    if (onSaveCallback) onSaveCallback(iso.slice(0, 7));
    goTo(wasEdit ? 'list' : 'dash');
    
  } catch (e) {
    toast(e.message || 'সংরক্ষণ ব্যর্থ', 'err');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = originalText;
  }
}

/* ============ Edit mode ============ */
export async function startEdit(id) {
  const t = DB.all.find(x => String(x.id) === String(id));
  if (!t || t.type === 'transfer') return;
  
  editId = t.id;
  type = t.type;
  
  // Go to entry tab
  goTo('add');
  
  // Set type
  setType(t.type);
  
  // Fill fields
  const dateInput = $('entryDate');
  if (dateInput) {
    dateInput.value = toDMY(t.date);
    const picker = $('entryDatePicker');
    if (picker) picker.value = t.date;
  }
  
  const amountInput = $('entryAmount');
  if (amountInput) {
    amountInput.value = t.amount;
    amountManuallyEdited = true;
  }
  
  const noteInput = $('entryNote');
  if (noteInput) noteInput.value = t.note || '';
  
  const groupSel = $('entryGroup');
  if (groupSel) groupSel.value = t.group;
  updateSubCategories();
  
  const subSel = $('entrySub');
  if (subSel) subSel.value = t.item;
  updateServiceChargeVisibility();
  
  // Service charge fields
  if (t.flat) {
    const flatSel = $('entryFlat');
    if (flatSel) flatSel.value = t.flat;
    showOwner();
    
    selectedMonths = new Set(t.smonths && t.smonths.length ? t.smonths : [currentYM()]);
    populateMonths();
  }
  
  // Account radio
  const radio = document.querySelector(`[name="entryAcct"][value="${t.acct}"]`);
  if (radio) radio.checked = true;
  
  // Update title/button
  const w = t.type === 'income' ? 'আয়' : 'ব্যয়';
  const titleEl = $('entryTitle');
  const saveBtn = $('entrySave');
  if (titleEl) titleEl.textContent = 'এন্ট্রি সংশোধন — ' + w;
  if (saveBtn) saveBtn.textContent = 'হালনাগাদ করুন';
}

/* ============ Reset ============ */
export function resetForm() {
  editId = null;
  amountManuallyEdited = false;
  selectedMonths = new Set([prevYM()]);
  
  const dateInput = $('entryDate');
  if (dateInput) {
    dateInput.value = toDMY(todayISO());
    const picker = $('entryDatePicker');
    if (picker) picker.value = todayISO();
  }
  
  const groupSel = $('entryGroup');
  if (groupSel) groupSel.value = '';
  
  updateSubCategories();
  
  const amountInput = $('entryAmount');
  if (amountInput) amountInput.value = '';
  
  const noteInput = $('entryNote');
  if (noteInput) noteInput.value = '';
  
  const flatSel = $('entryFlat');
  if (flatSel) flatSel.value = '';
  
  const ownerBox = $('ownerDisplay');
  if (ownerBox) ownerBox.textContent = '';
  
  // Uncheck all account radios
  document.querySelectorAll('[name="entryAcct"]').forEach(r => r.checked = false);
  
  setType('income');
}

/* ============ Setup Payment Chips ============ */
export function setupPaymentChips() {
  const box = $('entryChips');
  if (!box) return;
  
  const accounts = Object.values(DB.accCode).sort((a, b) => a.id - b.id);
  
  box.innerHTML = accounts.map(a => {
    const short = (a.name || a.code).replace(' পিএলসি', '').replace(' টাকা', '');
    const icon = a.kind === 'cash' ? ACCT_ICONS_CASH : ACCT_ICONS_BANK;
    return `
      <label class="chip">
        <input type="radio" name="entryAcct" value="${esc(a.code)}" required>
        <span>${icon}${esc(short)}</span>
      </label>
    `;
  }).join('');
}

const ACCT_ICONS_CASH = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/></svg>`;
const ACCT_ICONS_BANK = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10l9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18"/></svg>`;

/* ============ Initialize date ============ */
export function initDate() {
  const dateInput = $('entryDate');
  const picker = $('entryDatePicker');
  if (dateInput) dateInput.value = toDMY(todayISO());
  if (picker) picker.value = todayISO();
}
