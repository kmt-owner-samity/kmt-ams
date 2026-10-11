/* =====================================================================
   app.js — স্ক্রিন, ফর্ম, ড্যাশবোর্ড, লেনদেন, অ্যাডমিন, প্রোফাইল
   কাজী মোশাররফ টাওয়ার ভবন মালিক সমিতি
   ===================================================================== */

const $ = id => document.getElementById(id);
const M = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
const tk = n => '৳ ' + (+n || 0).toLocaleString('bn-BD', { maximumFractionDigits: 2 });
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const bd = n => String(n).replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[d]);
const bnDate = s => { const [y, m, d] = s.split('-'); return bd(d + '-' + m + '-' + y.slice(2)) + ' ইং'; };
const ROLE_BN = { admin: 'অ্যাডমিন', accountant: 'হিসাবরক্ষক', viewer: 'দর্শক' };

let type = 'income', all = [], open0 = { cash: 0, nbl: 0, pbl: 0 }, scCfg = { def: 0, per: {} };

function toast(m, err) {
  const t = $('toast');
  if (!t) return;
  t.textContent = m;
  t.classList.toggle('err', !!err);
  t.classList.add('on');
  clearTimeout(toast.h);
  toast.h = setTimeout(() => t.classList.remove('on'), err ? 9000 : 2200);
}
function dbFail(e) {
  toast((e && e.message) || 'অজানা ত্রুটি', true);
  if (e && e.status === 401) showLogin('আবার লগইন করুন।', true);
}

/* ===== Viewer flash fix — body class apply হওয়ার আগে সব role-only element লুকান ===== */
document.documentElement.classList.add('no-role');

/* ট্যাব */
document.querySelectorAll('nav button').forEach(b => b.onclick = () => {
  if (editId) resetForm();
  document.querySelectorAll('nav button').forEach(x => x.classList.toggle('on', x === b));
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('on', v.id === 'v-' + b.dataset.v));
  window.scrollTo(0, 0);
  const view = b.dataset.v;
  const mbar = $('mbar'); if (mbar) mbar.hidden = view === 'add';
  const smBtn = $('smBtn'); if (smBtn) smBtn.hidden = view !== 'dash';
  const am = $('adminMenu');
  if (am) {
    const isAdmin = SB.profile && SB.profile.role === 'admin';
    am.hidden = !isAdmin || view !== 'dash';
  }
});

/* আয়/ব্যয় টগল */
document.querySelectorAll('.seg button').forEach(b => b.onclick = () => { editId = null; setSeg(b.dataset.t); setType(); });
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ymEn = ym => MON[+ym.slice(5) - 1] + '-' + ym.slice(2, 4);
const prevYM = () => { const d = new Date(), x = new Date(d.getFullYear(), d.getMonth() - 1, 1); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0'); };
const curYM = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };
const smList = t => (t.smonths || (t.smonth ? [t.smonth] : [])).slice().sort();
const subOf = t => (t.type === 'transfer' ? [t.item, t.note] : [t.item, AN(t.acct), smList(t).length ? 'সার্ভিস চার্জ: ' + smList(t).map(ymEn).join(', ') : '', t.flat ? 'ফ্ল্যাট ' + t.flat : '', t.note]).filter(Boolean).map(esc).join(' · ');
let editId = null, sel = new Set();

function setSeg(t) {
  type = t;
  document.querySelectorAll('.seg button').forEach(x => x.classList.toggle('on', x.dataset.t === t));
}

function monthList(extra = []) {
  const d = new Date(), out = [];
  for (let k = 2; k >= -21; k--) {
    const x = new Date(d.getFullYear(), d.getMonth() + k, 1);
    out.push(x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0'));
  }
  extra.forEach(e => { if (e && !out.includes(e)) out.push(e); });
  return out.sort().reverse();
}

function focusSel() {
  const t = $('smTrack'), o = t && t.querySelector('.mc.on');
  if (o && !$('smBox').hidden) t.scrollLeft = Math.max(0, o.getBoundingClientRect().left - t.getBoundingClientRect().left + t.scrollLeft - 60);
}

function setSel(arr) {
  sel = new Set(arr);
  const cur = curYM();
  const t = $('smTrack');
  if (!t) return;
  t.innerHTML = monthList(arr).map(ym => `<button type="button" class="mc${sel.has(ym) ? ' on' : ''}${ym > cur ? ' adv' : ''}" data-ym="${ym}">${ymEn(ym)}</button>`).join('');
  focusSel();
}

const smTrackEl = $('smTrack');
if (smTrackEl) {
  smTrackEl.addEventListener('click', e => {
    const b = e.target.closest('.mc');
    if (!b) return;
    const ym = b.dataset.ym;
    if (sel.has(ym)) {
      if (sel.size > 1) sel.delete(ym);
      else return toast('কমপক্ষে একটি মাস বাছাই থাকতে হবে');
    } else sel.add(ym);
    b.classList.toggle('on', sel.has(ym));
    if (editId) delete $('a').dataset.man;
    autoAmt();
  });
}

const smLEl = $('smL');
if (smLEl) smLEl.onclick = () => $('smTrack').scrollBy({ left: -200, behavior: 'smooth' });
const smREl = $('smR');
if (smREl) smREl.onclick = () => $('smTrack').scrollBy({ left: 200, behavior: 'smooth' });

function autoAmt() {
  if ($('flatBox').hidden || $('a').dataset.man || !$('fl').value) return;
  const e = expAmt($('fl').value);
  if (e > 0) $('a').value = Math.round(e * sel.size * 100) / 100;
}

function showOwner() {
  const o = $('owner');
  if (o) o.textContent = ownerOf($('fl').value);
  autoAmt();
}

const aEl = $('a');
if (aEl) aEl.addEventListener('input', () => { $('a').dataset.man = 1; });

function resetForm() {
  editId = null;
  $('a').value = '';
  delete $('a').dataset.man;
  $('n').value = '';
  setType();
}

function setType() {
  const w = type === 'income' ? 'আয়' : 'ব্যয়';
  $('chipL').textContent = type === 'income' ? 'টাকা কোথায় জমা হলো?' : 'টাকা কোথা থেকে দেওয়া হলো?';
  document.querySelectorAll('[name=acct]').forEach(x => { x.checked = false; });
  document.body.classList.toggle('out', type === 'expense');
  $('ft').textContent = editId ? 'এন্ট্রি সংশোধন' : 'নতুন ' + w + ' যোগ করুন';
  $('save').textContent = editId ? 'হালনাগাদ করুন' : w + ' সংরক্ষণ করুন';
  $('g').innerHTML = '<option value="">খাত বাছাই করুন</option>' + Object.keys(CATS[type] || {}).map(k => `<option>${esc(k)}</option>`).join('');
  setSel([prevYM()]);
  $('fl').value = '';
  setSub();
}

function setSub() {
  const g = $('g').value;
  $('s').innerHTML = g ? '<option value="">উপ খাত বাছাই করুন</option>' + CATS[type][g].map(k => `<option>${esc(k)}</option>`).join('') : '<option value="">আগে খাত বাছাই করুন</option>';
  $('s').disabled = !g;
  updSc();
}

function updSc() {
  const sc = type === 'income' && $('g').value === 'মাসিক সার্ভিস চার্জ' && $('s').value === 'ফ্ল্যাটের সার্ভিস চার্জ';
  $('flatBox').hidden = $('smBox').hidden = !sc;
  $('fl').required = sc;
  showOwner();
  if (sc) focusSel();
}

const gEl = $('g'); if (gEl) gEl.onchange = setSub;
const sEl = $('s'); if (sEl) sEl.onchange = updSc;
const flEl = $('fl');
if (flEl) {
  flEl.innerHTML = '<option value="">ফ্ল্যাট বাছাই করুন</option>' + FLATS.map(x => `<option>${x.f}</option>`).join('');
  flEl.onchange = () => { if (editId) delete $('a').dataset.man; showOwner(); };
}

const saveBtn = $('save');
if (saveBtn) saveBtn.onclick = async () => {
  const f = $('f'), iso = getISO();
  $('d').setCustomValidity(iso ? '' : 'সঠিক তারিখ দিন (দিন/মাস/বছর)');
  if (!f.reportValidity()) return;
  const t = {
    type, date: iso, amount: +$('a').value, note: $('n').value.trim(),
    group: $('g').value, item: $('s').value,
    acct: document.querySelector('[name=acct]:checked').value,
  };
  if (!$('flatBox').hidden) {
    t.flat = $('fl').value;
    t.owner = ownerOf(t.flat);
    t.smonths = [...sel].sort();
  }
  const was = editId;
  const btn = $('save'), lab = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'সংরক্ষণ হচ্ছে…';
  try {
    if (was) { t.id = was; await DB.update(t); }
    else await DB.add(t);
  } catch (e) { dbFail(e); return; }
  finally { btn.disabled = false; btn.textContent = lab; }
  resetForm();
  setMonth(iso.slice(0, 7));
  document.querySelector('nav button[data-v=' + (was ? 'list' : 'dash') + ']').click();
  toast(was ? 'হালনাগাদ হয়েছে ✓' : 'সংরক্ষিত হয়েছে ✓');
  render();
};

function startEdit(id) {
  const t = all.find(x => String(x.id) === String(id));
  if (!t || t.type === 'transfer') return;
  document.querySelector('nav button[data-v=add]').click();
  editId = t.id;
  setSeg(t.type);
  setType();
  setDateISO(t.date);
  $('a').value = t.amount;
  $('a').dataset.man = 1;
  $('n').value = t.note || '';
  $('g').value = t.group;
  setSub();
  $('s').value = t.item;
  updSc();
  if (t.flat) {
    $('fl').value = t.flat;
    showOwner();
    setSel(smList(t).length ? smList(t) : [curYM()]);
  }
  const r = document.querySelector('[name=acct][value="' + t.acct + '"]');
  if (r) r.checked = true;
}

const cancelBtn = $('cancelEdit');
if (cancelBtn) cancelBtn.onclick = () => {
  const was = editId;
  resetForm();
  document.querySelector('nav button[data-v=' + (was ? 'list' : 'dash') + ']').click();
};

/* হিসাব */
function parseDMY(v) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(v).trim());
  if (!m) return '';
  const [, d, mo, y] = m, dt = new Date(+y, +mo - 1, +d);
  return dt.getFullYear() == y && dt.getMonth() == mo - 1 && dt.getDate() == d ? `${y}-${mo}-${d}` : '';
}
function getISO() { return parseDMY($('d').value); }
function setDateISO(v) {
  const [y, m, d] = v.split('-');
  $('d').value = `${d}/${m}/${y}`;
  $('dpick').value = v;
  $('d').setCustomValidity('');
}

const dEl = $('d');
if (dEl) dEl.addEventListener('input', () => {
  const t = $('d').value.replace(/[০-৯]/g, c => '০১২৩৪৫৬৭৮৯'.indexOf(c)).replace(/\D/g, '').slice(0, 8);
  $('d').value = t.length > 4 ? t.slice(0, 2) + '/' + t.slice(2, 4) + '/' + t.slice(4) : t.length > 2 ? t.slice(0, 2) + '/' + t.slice(2) : t;
  $('d').setCustomValidity('');
  $('dpick').value = getISO();
});

const dpickEl = $('dpick');
if (dpickEl) dpickEl.onchange = () => { if ($('dpick').value) setDateISO($('dpick').value); };

/* ইনভয়েস */
let curDL = null;
function openPrev(pages, name) {
  curDL = { pages, name };
  $('invBody').innerHTML = pages.join('');
  $('invOv').hidden = false;
  fitInv();
  const ib = document.querySelector('.invbox'); if (ib) ib.scrollTop = 0;
}
function fitInv() {
  const b = $('invBody');
  if (!b || !b.firstElementChild) return;
  const sc = Math.min(1, (innerWidth - 64) / 794);
  b.style.width = '794px';
  b.style.transform = `scale(${sc})`;
  $('invFit').style.width = 794 * sc + 'px';
  $('invFit').style.height = b.offsetHeight * sc + 'px';
}
function showInv(id) {
  const t = all.find(x => x.id === id);
  if (!t) return;
  openPrev([invHTML(t)], (t.type === 'income' ? 'receipt-' : 'voucher-') + t.no.replace(/[^0-9-]/g, '').replace(/^-/, '') + '.pdf');
}
window.addEventListener('resize', () => { const io = $('invOv'); if (io && !io.hidden) fitInv(); });
const tbEl = $('tb');
if (tbEl) tbEl.addEventListener('click', e => {
  const b = e.target.closest('.ib');
  if (!b) return;
  const c = b.classList;
  c.contains('del') ? del(b.dataset.id) : c.contains('ed') ? startEdit(b.dataset.id) : showInv(b.dataset.id);
});
const invX = $('invX'); if (invX) invX.onclick = () => $('invOv').hidden = true;
const invOv = $('invOv'); if (invOv) invOv.addEventListener('click', e => { if (e.target.id === 'invOv') $('invOv').hidden = true; });
const invD = $('invD'); if (invD) invD.onclick = () => curDL && pdfOut(curDL.pages, curDL.name);
const invS = $('invS'); if (invS) invS.onclick = () => curDL && pdfShare(curDL.pages, curDL.name);
const smBtnEl = $('smBtn'); if (smBtnEl) smBtnEl.onclick = () => openPrev(sumPages(), 'summary-' + $('month').value + '.pdf');

const mkey = d => d.slice(0, 7);

function calc() {
  const m = $('month').value, cur = all.filter(t => mkey(t.date) === m), prev = all.filter(t => mkey(t.date) < m);
  const sum = (a, ty, k) => a.filter(t => t.type === ty && (!k || t.acct === k)).reduce((s, t) => s + t.amount, 0);
  const trn = (a, k) => a.filter(t => t.type === 'transfer').reduce((s, t) => s + (t.to === k ? t.amount : 0) - (t.from === k ? t.amount : 0), 0);
  const tot = ACCTS.reduce((s, a) => s + open0[a.k], 0), pb = tot + sum(prev, 'income') - sum(prev, 'expense'), I = sum(cur, 'income'), O = sum(cur, 'expense');
  const ac = ACCTS.map(a => {
    const p = open0[a.k] + sum(prev, 'income', a.k) - sum(prev, 'expense', a.k) + trn(prev, a.k), i = sum(cur, 'income', a.k), o = sum(cur, 'expense', a.k), x = trn(cur, a.k);
    return { ...a, p, i, o, x, c: p + i - o + x };
  });
  return { m, cur, pb, I, O, cb: pb + I - O, ac };
}

function breakdown(cur, ty, total) {
  const g = {};
  cur.filter(t => t.type === ty).forEach(t => {
    (g[t.group] ??= { sum: 0, items: {} }).sum += t.amount;
    g[t.group].items[t.item] = (g[t.group].items[t.item] || 0) + t.amount;
  });
  const col = ty === 'income' ? 'var(--in)' : 'var(--out)', k = Object.keys(g);
  if (!k.length) return '<div class="empty">এই মাসে কোনো এন্ট্রি নেই</div>';
  return k.sort((a, b) => g[b].sum - g[a].sum).map(n => `<details><summary><span>${esc(n)}</span><span>${tk(g[n].sum)}</span></summary>
 <div class="bar"><i style="width:${total ? g[n].sum / total * 100 : 0}%;background:${col}"></i></div>
 ${Object.entries(g[n].items).map(([i, v]) => `<div class="sub"><span>${esc(i)}</span><span>${tk(v)}</span></div>`).join('')}</details>`).join('')
    + `<div class="sub" style="margin-top:12px;padding:10px 0 0;border-top:1px solid var(--line);font-weight:700;font-size:1.2rem;color:${col}"><span>মোট</span><span>${tk(total)}</span></div>`;
}

async function render() {
  all = await DB.list();
  open0 = await DB.opening();
  scCfg = await DB.sc();
  const c = calc();
  $('eq').innerHTML = `<div><em class="ic" style="--tb:#f1f5f9;--tc:#475569"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 109-9 9 9 0 00-6.7 3M3 4v5h5M12 7v5l3 2"/></svg></em><span>প্রারম্ভিক জের</span><b>${tk(c.pb)}</b></div><div class="i"><em class="ic" style="--tb:var(--in-bg);--tc:var(--in)"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v12m0 0l-5-5m5 5l5-5M5 20h14"/></svg></em><span>মোট আয়</span><b>${tk(c.I)}</b></div><div class="o"><em class="ic" style="--tb:var(--out-bg);--tc:var(--out)"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V8m0 0l-5 5m5-5l5 5M5 4h14"/></svg></em><span>মোট ব্যয়</span><b>${tk(c.O)}</b></div><div class="c"><em class="ic" style="--tb:#e0f2fe;--tc:#0369a1"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 012-2h13v4M3 7v10a2 2 0 002 2h14a1 1 0 001-1v-9H5a2 2 0 01-2-2zM16 14h2"/></svg></em><span>বর্তমান জের</span><b>${tk(c.cb)}</b></div>`;
  $('acc3').innerHTML = c.ac.map(a => `<div class="ac" style="--tc:${a.tc};--tb:${a.tb}"><em class="ic">${svg(a.d, 18)}</em><span>${a.t}</span><b>${tk(a.c)}</b></div>`).join('');
  $('bd-in').innerHTML = breakdown(c.cur, 'income', c.I);
  $('bd-out').innerHTML = breakdown(c.cur, 'expense', c.O);
  const rows = [...c.cur].sort((a, b) => b.date.localeCompare(a.date));
  $('tb').innerHTML = rows.length ? rows.map(rowHTML).join('') : '<tr><td colspan="5" class="empty">এই মাসে কোনো লেনদেন নেই। "আয়/ব্যয় এন্ট্রি" থেকে যোগ করুন।</td></tr>';
}

/* মডাল */
function ask({ title, msg = '', fields = [], ok = 'ঠিক আছে' }) {
  return new Promise(res => {
    $('dt').textContent = title;
    $('dm').textContent = msg;
    $('dm').hidden = !msg;
    $('df').innerHTML = fields.map((f, i) => {
      const lb = f.label ? `<label for="df${i}">${esc(f.label)}</label>` : '';
      const ac = f.autocomplete === false ? 'off' : 'off';
      if (f.type === 'select') return lb + `<select id="df${i}" style="margin-bottom:10px"><option value="">বাছাই করুন</option>${f.options.map(([v, t]) => `<option value="${esc(v)}"${v === f.value ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select>`;
      const inp = `<input id="df${i}" type="${f.type || 'text'}" placeholder="${esc(f.ph || '')}" value="${esc(f.value ?? '')}" ${f.type === 'number' ? 'step="any" min="0" inputmode="decimal"' : ''} ${f.mask ? 'inputmode="numeric" maxlength="10" style="padding-right:46px"' : 'style="margin-bottom:10px"'} autocomplete="${ac}">`;
      return lb + (f.mask === 'date' ? `<div class="dwrap" style="margin-bottom:10px">${inp}<span class="cal"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg></span><input type="date" id="dp${i}" class="dpk" aria-label="ক্যালেন্ডার"></div>` : inp);
    }).join('');
    fields.forEach((f, i) => {
      if (f.mask !== 'date') return;
      const t = $('df' + i), p = $('dp' + i);
      p.value = parseDMY(t.value) || '';
      t.addEventListener('input', () => { t.value = fmtDMY(t.value); p.value = parseDMY(t.value) || ''; });
      p.onchange = () => { if (p.value) { const [y, m, d] = p.value.split('-'); t.value = d + '/' + m + '/' + y; } };
    });
    $('dok').textContent = ok;
    $('dlg').hidden = false;
    const done = v => { $('dlg').hidden = true; $('dok').onclick = $('dno').onclick = document.onkeydown = null; res(v); };
    $('dok').onclick = () => done(fields.map((_, i) => $('df' + i).value));
    $('dno').onclick = () => done(null);
    document.onkeydown = e => { if (e.key === 'Escape') done(null); else if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') $('dok').click(); };
    (fields.length ? $('df0') : $('dok')).focus();
  });
}

const ICO = { inv: 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6', ed: 'M4 20h4L19 9l-4-4L4 16zM13 7l4 4', del: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3' };
const ib = (c, id, tt, d) => `<button class="ib ${c}" data-id="${id}" title="${tt}" aria-label="${tt}">${svg('<path d="' + d + '"/>', 18)}</button>`;

function rowHTML(t) {
  const T = t.type === 'transfer', I = t.type === 'income';
  return `<tr><td>${bnDate(t.date)}</td><td><span class="badge ${T ? 't' : I ? 'i' : 'o'}">${T ? 'ট্রান্সফার' : I ? 'আয়' : 'ব্যয়'}</span></td><td>${esc(t.group)}<br><small style="color:var(--mute)">${subOf(t)}</small></td><td class="n ${T ? 'tr-c' : I ? 'in-c' : 'out-c'}">${tk(t.amount)}</td><td class="act">${T ? '' : ib('inv', t.id, 'ইনভয়েস ' + bd(t.no || ''), ICO.inv) + ib('ed', t.id, 'সম্পাদনা', ICO.ed) + ib('del', t.id, 'মুছুন', ICO.del)}</td></tr>`;
}

async function del(id) {
  const v = await ask({ title: 'এন্ট্রি মুছবেন?', msg: 'এই লেনদেনটি স্থায়ীভাবে মুছে যাবে।', ok: 'মুছুন' });
  if (v) {
    try { await DB.remove(id); toast('মুছে ফেলা হয়েছে ✓'); render(); }
    catch (e) { dbFail(e); }
  }
}

/* অ্যাডমিন কাজ */
async function adminAuth() {
  if (!SB.profile || SB.profile.role !== 'admin') {
    toast('শুধু অ্যাডমিন এই কাজ করতে পারবেন', true);
    return false;
  }
  return true;
}

async function changePw() {
  const v = await ask({
    title: 'পাসওয়ার্ড পরিবর্তন',
    fields: [
      { label: 'বর্তমান পাসওয়ার্ড', type: 'password', autocomplete: false },
      { label: 'নতুন পাসওয়ার্ড', type: 'password', autocomplete: false },
      { label: 'আবার লিখুন', type: 'password', autocomplete: false },
    ],
    ok: 'পরিবর্তন করুন',
  });
  if (!v) return;
  if (v[1].length < 6 || v[1] !== v[2]) return toast('নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষর ও দুইবার একই হতে হবে', true);
  try {
    if (!await SB.verify(v[0])) return toast('বর্তমান পাসওয়ার্ড ভুল', true);
    await SB.updatePassword(v[1]);
    toast('পাসওয়ার্ড পরিবর্তিত হয়েছে ✓');
  } catch (e) { dbFail(e); }
}

/* ============================================================
   PROFILE MODAL — view + edit
   ============================================================ */
function openProfile() {
  if (!SB.profile) return;
  const p = SB.profile;
  $('profileFullName').value = p.full_name || '';
  $('profileLoginId').value = SB.profile.login_id || '—';
  $('profileEmail').value = SB.profile.email || '';
  $('profileRole').value = ROLE_BN[p.role] || p.role || '—';
  $('profileOv').hidden = false;
  setTimeout(() => $('profileFullName').focus(), 50);
}
function closeProfile() {
  $('profileOv').hidden = true;
}
async function saveProfile() {
  const full_name = $('profileFullName').value.trim();
  const email = $('profileEmail').value.trim();

  if (!full_name) return toast('পূর্ণ নাম খালি রাখা যাবে না', true);
  if (!email) return toast('ইমেইল খালি রাখা যাবে না', true);
  if (!email.includes('@')) return toast('সঠিক ইমেইল দিন', true);

  const btn = $('profileSave'), lab = btn.textContent;
  btn.disabled = true; btn.textContent = 'সংরক্ষণ হচ্ছে…';

  try {
    await SB.rpc('user_update_self', { p_full_name: full_name, p_email: email });
    // SB.profile update
    SB.profile.full_name = full_name;
    SB.profile.email = email;
    // session update (user object)
    if (SB.sess && SB.sess.user) SB.sess.user.email = email;
    // header update
    $('whoName').textContent = full_name;
    toast('প্রোফাইল হালনাগাদ হয়েছে ✓');
    closeProfile();
  } catch (e) {
    toast(e.message || 'সংরক্ষণ ব্যর্থ', true);
  } finally {
    btn.disabled = false; btn.textContent = lab;
  }
}

/* ============================================================
   GEAR MENU — profile/password
   ============================================================ */
(function setupGearMenu() {
  const btn = $('gearBtn'), panel = $('gearPanel');
  if (!btn || !panel) return;

  function close() { panel.hidden = true; btn.setAttribute('aria-expanded', 'false'); }
  function open() { panel.hidden = false; btn.setAttribute('aria-expanded', 'true'); }

  btn.onclick = e => { e.stopPropagation(); panel.hidden ? open() : close(); };

  document.addEventListener('click', e => {
    if (!panel.hidden && !panel.contains(e.target) && e.target !== btn) close();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !panel.hidden) close();
  });

  panel.addEventListener('click', e => {
    const b = e.target.closest('button[data-act]');
    if (!b) return;
    close();
    const act = b.dataset.act;
    if (act === 'profile') openProfile();
    else if (act === 'password') changePw();
  });
})();

/* Profile modal listeners */
const profileCancelBtn = $('profileCancel'); if (profileCancelBtn) profileCancelBtn.onclick = closeProfile;
const profileSaveBtn = $('profileSave'); if (profileSaveBtn) profileSaveBtn.onclick = saveProfile;
const profileOvEl = $('profileOv');
if (profileOvEl) profileOvEl.addEventListener('click', e => { if (e.target.id === 'profileOv') closeProfile(); });

async function adminAct(k) {
  if (k === 'pw') return changePw();
  if (!await adminAuth()) return;
  if (k === 'open') return editOpen();
  if (k === 'sc') return scSetup();
  if (k === 'import') return importLocal();
  if (k === 'users') return openUserManager();
  if (k === 'transfer') return doTransfer();
}

async function editOpen() {
  const n = await ask({
    title: 'প্রারম্ভিক জের সম্পাদনা',
    fields: ACCTS.map(a => ({ label: a.n, type: 'number', value: open0[a.k] || '', ph: '৳ পরিমাণ' })),
    ok: 'সংরক্ষণ',
  });
  if (!n) return;
  try { await DB.setOpening({ cash: n[0], nbl: n[1], pbl: n[2] }); }
  catch (e) { return dbFail(e); }
  toast('জের হালনাগাদ হয়েছে ✓');
  render();
}

async function doTransfer() {
  const d = new Date();
  const opts = ACCTS.map(a => [a.k, a.n]);
  let v = ['', '', String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear(), '', ''];
  for (; ;) {
    const pr = ask({
      title: 'ট্রান্সফার জের',
      fields: [
        { label: 'কোথা থেকে', type: 'select', options: opts, value: v[0] },
        { label: 'কোথায়', type: 'select', options: opts, value: v[1] },
        { label: 'তারিখ (দিন/মাস/বছর)', mask: 'date', value: v[2], ph: 'DD/MM/YYYY' },
        { label: 'টাকার পরিমাণ (৳)', type: 'number', value: v[3] },
        { label: 'বিবরণ (ঐচ্ছিক)', value: v[4] },
      ],
      ok: 'ট্রান্সফার করুন',
    });
    {
      const x = () => {
        const a = $('df0').value, b = $('df1').value;
        [...$('df0').options].forEach(o => o.disabled = !!o.value && o.value === b);
        [...$('df1').options].forEach(o => o.disabled = !!o.value && o.value === a);
      };
      $('df0').onchange = $('df1').onchange = x;
      x();
    }
    const r = await pr;
    if (!r) return;
    v = r;
    const iso = parseDMY(r[2]);
    let err = '';
    if (!r[0] || !r[1]) err = 'দুটি হিসাব বাছাই করুন';
    else if (r[0] === r[1]) err = 'দুটি হিসাব এক হতে পারবে না';
    else if (!iso) err = 'সঠিক তারিখ দিন';
    else if (!(+r[3] > 0)) err = 'সঠিক টাকার পরিমাণ দিন';
    if (err) { toast(err); continue; }
    try {
      await DB.add({ type: 'transfer', date: iso, amount: +r[3], note: r[4].trim(), group: 'ট্রান্সফার', item: AN(r[0]) + ' → ' + AN(r[1]), from: r[0], to: r[1], acct: r[0] });
    } catch (e) { dbFail(e); continue; }
    toast('ট্রান্সফার সংরক্ষিত ✓');
    render();
    return;
  }
}

/* CSV রিপোর্ট */
function csv() {
  const c = calc(), [y, mm] = c.m.split('-'), q = v => '"' + String(v).replace(/"/g, '""') + '"';
  const L = [[`কাজী মোশাররফ টাওয়ার ভবন মালিক সমিতি - ${M[+mm - 1]} ${y}`], ['পূর্বের জের', c.pb], ['মোট আয়', c.I], ['মোট ব্যয়', c.O], ['বর্তমান জের', c.cb], [], ['তারিখ', 'ধরন', 'খাত', 'উপখাত', 'ফ্ল্যাট', 'বিবরণ', 'টাকা']];
  [...c.cur].sort((a, b) => a.date.localeCompare(b.date)).forEach(t => L.push([t.date, t.type === 'income' ? 'আয়' : 'ব্যয়', t.group, t.item, t.flat, t.note, t.amount]));
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['\ufeff' + L.map(r => r.map(q).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' }));
  a.download = `hisab-${c.m}.csv`;
  a.click();
}

/* শুরু */
const now = new Date(), z = n => String(n).padStart(2, '0');
const Y = now.getFullYear();
function setMonth(v) { $('month').value = v; }
const monthEl = $('month'); if (monthEl) monthEl.onchange = render;
setMonth(`${Y}-${z(now.getMonth() + 1)}`);
setDateISO(`${now.getFullYear()}-${z(now.getMonth() + 1)}-${z(now.getDate())}`);
$('chips').innerHTML = ACCTS.map(a => `<label class="chip"><input type="radio" name="acct" value="${a.k}" required><span>${svg(a.d, 22)}${a.s}${a.br ? `<small>${a.br}</small>` : ''}</span></label>`).join('');
if (typeof initReports === 'function') initReports();
setType();

/* ===== লগইন ও চালু করা ===== */
function showLogin(msg, err) {
  const lo = $('loginOv'); if (!lo) return;
  lo.hidden = false;
  const lm = $('loginMsg'); if (lm) { lm.textContent = msg || ''; lm.className = err ? 'lerr' : ''; }
  const lp = $('lpw'); if (lp) lp.value = '';
}
function hideLogin() { const lo = $('loginOv'); if (lo) lo.hidden = true; }

/* ===== Role apply — সব ফ্ল্যাশ ফিক্স ===== */
function applyRole() {
  if (!SB.profile) return;
  const r = SB.profile.role;

  // HTML root class সরান (flash fix)
  document.documentElement.classList.remove('no-role');

  // Body role class
  document.body.classList.remove('r-admin', 'r-accountant', 'r-viewer');
  document.body.classList.add('r-' + r);

  // Header
  const wn = $('whoName'); if (wn) wn.textContent = SB.profile.full_name;
  const wb = $('whobar'); if (wb) wb.hidden = false;

  // Admin menu
  const ib = $('impBtn'); if (ib) ib.hidden = !(r === 'admin' && DB.legacyCount() > 0);
  const am = $('adminMenu'); if (am) am.hidden = r !== 'admin';
  const im = $('impMenuItem'); if (im) im.hidden = !(r === 'admin' && DB.legacyCount() > 0);

  // Viewer flash fix — nav-এর wr-only hide করা হয় CSS দিয়ে
  // তাছাড়া nav-এ class দেওয়ার দরকার নেই
}

async function startApp() {
  hideLogin();
  try { await DB.init(); }
  catch (e) { showLogin(e.message, true); return; }
  applyRole();
  render();
}

async function bootApp() {
  const splashPromise = window.runSplash ? window.runSplash() : Promise.resolve();

  if (!SB.configured()) {
    await splashPromise;
    showLogin('সিস্টেম এখনও প্রস্তুত নয়। অ্যাডমিনের সাথে যোগাযোগ করুন।', true);
    return;
  }

  try {
    const restored = await SB.restore();
    await splashPromise;
    if (restored) await startApp();
    else showLogin();
  } catch (e) {
    await splashPromise;
    showLogin(e.message, true);
  }
}

/* ===== লগইন ফর্ম (username দিয়ে) ===== */
const loginFormEl = $('loginForm');
if (loginFormEl) loginFormEl.addEventListener('submit', async e => {
  e.preventDefault();
  const b = $('loginBtn');
  const username = $('lem').value.trim();
  const password = $('lpw').value;

  if (!username || !password) {
    showLogin('ইউজারনেম ও পাসওয়ার্ড দুটোই দিন', true);
    return;
  }

  b.disabled = true;
  b.textContent = 'লগইন হচ্ছে…';

  try {
    await SB.loginByUsername(username, password);
    try { localStorage.setItem('kmt_last_user', username); } catch (e) {}
    b.disabled = false;
    b.textContent = 'লগইন';
    await startApp();
  } catch (err) {
    showLogin(err.message, true);
    b.disabled = false;
    b.textContent = 'লগইন';
  }
});

/* Last username restore */
(function () {
  try {
    const saved = localStorage.getItem('kmt_last_user');
    const le = $('lem'); if (saved && le) le.value = saved;
  } catch (e) {}
})();

/* ===== Header buttons ===== */
const btnOutEl = $('btnOut');
if (btnOutEl) btnOutEl.onclick = async () => { await SB.logout(); location.reload(); };

/* ===== Admin Menu ===== */
(function setupAdminMenu() {
  const btn = $('adminMenuBtn'), panel = $('adminMenuPanel');
  if (!btn || !panel) return;

  function close() { panel.hidden = true; btn.setAttribute('aria-expanded', 'false'); }
  function open() { panel.hidden = false; btn.setAttribute('aria-expanded', 'true'); }

  btn.onclick = e => { e.stopPropagation(); panel.hidden ? open() : close(); };

  document.addEventListener('click', e => {
    if (!panel.hidden && !panel.contains(e.target) && e.target !== btn) close();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !panel.hidden) close();
  });

  panel.addEventListener('click', e => {
    const b = e.target.closest('button[data-act]');
    if (!b) return;
    close();
    adminAct(b.dataset.act);
  });
})();

/* ===== User Manager Setup ===== */
if (typeof window.setupUserManager === 'function') window.setupUserManager();

/* ===== Legacy import ===== */
async function importLocal() {
  const n = DB.legacyCount();
  const v = await ask({
    title: 'পুরনো ডাটা আনবেন?',
    msg: 'এই ব্রাউজারে ' + bd(n) + 'টি লেনদেন পাওয়া গেছে। এগুলো (প্রারম্ভিক জের ও সার্ভিস চার্জ সেটআপসহ) যোগ হবে। শুধু একবার চালান, নইলে ডাটা দ্বিগুণ হবে।',
    ok: 'আনুন',
  });
  if (!v) return;
  try {
    toast('ডাটা আনা হচ্ছে… অপেক্ষা করুন');
    const r = await DB.importLegacy();
    render();
    if (r.fail.length) {
      await ask({ title: bd(r.ok) + 'টি এসেছে, ' + bd(r.fail.length) + 'টি আসেনি', msg: r.fail.slice(0, 6).join(' | '), ok: 'ঠিক আছে' });
    } else {
      const c = await ask({ title: 'সব ডাটা এসেছে ✓', msg: 'ব্রাউজারের পুরনো ডাটা মুছে ফেলবেন?', ok: 'মুছুন' });
      if (c) { DB.clearLegacy(); applyRole(); }
    }
  } catch (e) { dbFail(e); }
}

/* চালু */
bootApp();
