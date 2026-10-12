/* =====================================================================
   flat-manager.js — Flat & Owner Management (Admin only)
   কাজী মোশাররফ টাওয়ার ভবন মালিক সমিতি
   ===================================================================== */

/* ===== State ===== */
let fmFlats = [];
let fmFilter = 'all';

const _f$ = id => document.getElementById(id);

/* =====================================================================
   OPEN / CLOSE
   ===================================================================== */
async function openFlatManager() {
  const ov = _f$('flatOv');
  if (!ov) return;
  ov.hidden = false;

  switchTab('edit');
  await loadFlats();
}

function closeFlatManager() {
  const ov = _f$('flatOv');
  if (ov) ov.hidden = true;
  fmFlats = [];
}

/* =====================================================================
   LOAD FLATS
   ===================================================================== */
async function loadFlats() {
  const list = _f$('fmList');
  if (list) list.innerHTML = '<div class="empty">লোড হচ্ছে...</div>';

  try {
    const rows = await SB.req('/rest/v1/rpc/flat_list', {
      method: 'POST',
      body: {},
    });

    fmFlats = (rows || []).map(r => ({
      id: r.id,
      flat_no: r.flat_no,
      floor_no: r.floor_no,
      owner_name: r.owner_name || '',
      owner_phone: r.owner_phone || '',
      tenant_name: r.tenant_name || '',
      tenant_phone: r.tenant_phone || '',
    }));

    renderEditList();
    renderListPreview();
  } catch (e) {
    if (list) list.innerHTML = `<div class="empty">লোড ব্যর্থ: ${esc(e.message)}</div>`;
  }
}

/* =====================================================================
   RENDER — Edit Tab
   ===================================================================== */
function renderEditList() {
  const list = _f$('fmList');
  if (!list) return;

  if (!fmFlats.length) {
    list.innerHTML = '<div class="empty">কোনো ফ্ল্যাট নেই</div>';
    return;
  }

  list.innerHTML = fmFlats.map(f => `
    <div class="fm-item" data-flat-no="${esc(f.flat_no)}">
      <div class="fm-flat-no">${esc(f.flat_no)}</div>
      <div class="fm-fields">
        <div class="fm-owner-label">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></svg>
          মালিক
        </div>
        <div class="fm-field">
          <label>নাম</label>
          <input type="text" data-role="owner_name" value="${esc(f.owner_name)}" maxlength="50" autocomplete="off">
        </div>
        <div class="fm-field">
          <label>মোবাইল</label>
          <input type="tel" data-role="owner_phone" value="${esc(f.owner_phone)}" maxlength="11" inputmode="numeric" placeholder="১১ ডিজিট" autocomplete="off">
        </div>

        <div class="fm-tenant-label">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M5 21V7l7-4 7 4v14"/></svg>
          ভাড়াটিয়া (ঐচ্ছিক)
        </div>
        <div class="fm-field tenant">
          <label>নাম</label>
          <input type="text" data-role="tenant_name" value="${esc(f.tenant_name)}" maxlength="50" placeholder="খালি রাখলে ভাড়াটিয়া নেই" autocomplete="off">
        </div>
        <div class="fm-field tenant">
          <label>মোবাইল</label>
          <input type="tel" data-role="tenant_phone" value="${esc(f.tenant_phone)}" maxlength="11" inputmode="numeric" placeholder="১১ ডিজিট" autocomplete="off">
        </div>
      </div>
    </div>
  `).join('');

  list.querySelectorAll('.fm-item').forEach(el => {
    const flatNo = el.dataset.flatNo;
    const row = fmFlats.find(x => x.flat_no === flatNo);
    if (!row) return;

    ['owner_name', 'owner_phone', 'tenant_name', 'tenant_phone'].forEach(role => {
      const inp = el.querySelector(`[data-role="${role}"]`);
      if (!inp) return;
      inp.addEventListener('input', () => {
        // Mobile fields — শুধু digit allow
        if (role === 'owner_phone' || role === 'tenant_phone') {
          const cleaned = inp.value.replace(/\D/g, '').slice(0, 11);
          if (cleaned !== inp.value) inp.value = cleaned;
          row[role] = cleaned;
        } else {
          row[role] = inp.value;
        }
      });
    });
  });
}

/* =====================================================================
   RENDER — List Tab (HTML Table)
   ===================================================================== */
function renderListPreview() {
  const preview = _f$('fmPreview');
  if (!preview) return;

  const filtered = fmFilter === 'tenant'
    ? fmFlats.filter(f => f.tenant_name && f.tenant_name.trim())
    : fmFlats;

  if (!filtered.length) {
    preview.innerHTML = '<div class="empty">কোনো তথ্য নেই</div>';
    return;
  }

  const rows = filtered.map((f, i) => `
    <tr>
      <td class="c">${bd(i + 1)}</td>
      <td class="c"><b>${esc(f.flat_no)}</b></td>
      <td>${esc(f.owner_name)}</td>
      <td class="nowrap">${esc(f.owner_phone || '—')}</td>
      <td>${esc(f.tenant_name || '—')}</td>
      <td class="nowrap">${esc(f.tenant_phone || '—')}</td>
    </tr>
  `).join('');

  preview.innerHTML = `
    <div class="fm-screen-table">
      <div class="fm-screen-table-head">
        <div class="fm-screen-table-title">মালিক ও ভাড়াটিয়া তালিকা</div>
        <div class="fm-screen-table-count">মোট: ${bd(filtered.length)} টি ফ্ল্যাট</div>
      </div>
      <div class="fm-table-wrap">
        <table class="fm-table">
          <thead>
            <tr>
              <th style="width:50px">ক্রঃ</th>
              <th style="width:70px">ফ্ল্যাট</th>
              <th>মালিকের নাম</th>
              <th style="width:140px">মোবাইল</th>
              <th>ভাড়াটিয়ার নাম</th>
              <th style="width:140px">মোবাইল</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  `;
}

/* =====================================================================
   BUILD A4 PDF PAGES
   ===================================================================== */
function buildFlatPdfPages() {
  const filtered = fmFilter === 'tenant'
    ? fmFlats.filter(f => f.tenant_name && f.tenant_name.trim())
    : fmFlats;

  if (!filtered.length) return [];

  const today = new Date();
  const dateStr = bd(String(today.getDate()).padStart(2, '0')) + '/' +
                  bd(String(today.getMonth() + 1).padStart(2, '0')) + '/' +
                  bd(today.getFullYear());

  const ROWS_PER_PAGE = 28;
  const pages = [];
  const totalPages = Math.ceil(filtered.length / ROWS_PER_PAGE);

  for (let i = 0; i < filtered.length; i += ROWS_PER_PAGE) {
    const chunk = filtered.slice(i, i + ROWS_PER_PAGE);
    const pageNum = Math.floor(i / ROWS_PER_PAGE) + 1;

    const rows = chunk.map((f, idx) => `
      <tr>
        <td class="c">${bd(i + idx + 1)}</td>
        <td class="c"><b>${esc(f.flat_no)}</b></td>
        <td>${esc(f.owner_name)}</td>
        <td class="nowrap">${esc(f.owner_phone || '—')}</td>
        <td>${esc(f.tenant_name || '—')}</td>
        <td class="nowrap">${esc(f.tenant_phone || '—')}</td>
      </tr>
    `).join('');

    pages.push(`
      <div class="a4 tight">
        <div class="ah">
          <b>কাজী মোশাররফ টাওয়ার ভবন মালিক সমিতি</b>
          <span>বাসা নং ৩/৪, ব্লক-এ, আসাদ এভিনিউ, ঢাকা-১২০৭</span>
        </div>
        <div class="mt">মালিক ও ভাড়াটিয়া তালিকা</div>
        <h3 class="sh">তারিখ: ${dateStr}${fmFilter === 'tenant' ? ' — শুধু ভাড়াটিয়া' : ''}</h3>
        <table class="at mx">
          <thead>
            <tr>
              <th style="width:45px">ক্রঃ</th>
              <th style="width:60px">ফ্ল্যাট</th>
              <th>মালিকের নাম</th>
              <th style="width:130px">মোবাইল</th>
              <th>ভাড়াটিয়ার নাম</th>
              <th style="width:130px">মোবাইল</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="ft">পৃষ্ঠা ${bd(pageNum)}/${bd(totalPages)} · মোট: ${bd(filtered.length)} টি ফ্ল্যাট · এটি কম্পিউটার সিস্টেম দ্বারা প্রস্তুতকৃত।</div>
      </div>
    `);
  }

  return pages;
}

/* =====================================================================
   SWITCH TAB
   ===================================================================== */
function switchTab(tabName) {
  document.querySelectorAll('.fm-tab').forEach(t => {
    t.classList.toggle('on', t.dataset.tab === tabName);
  });
  document.querySelectorAll('.fm-panel').forEach(p => {
    const id = 'fmPanel' + tabName.charAt(0).toUpperCase() + tabName.slice(1);
    p.classList.toggle('on', p.id === id);
  });

  if (tabName === 'list') {
    renderListPreview();
  }
}

/* =====================================================================
   SAVE ALL
   ===================================================================== */
async function saveAllFlats() {
  const errors = [];
  const payload = [];

  fmFlats.forEach(f => {
    const ownerName = (f.owner_name || '').trim();
    if (!ownerName) {
      errors.push(`${f.flat_no}: মালিকের নাম দিন`);
      return;
    }
    payload.push({
      flat_no: f.flat_no,
      owner_name: ownerName,
      owner_phone: (f.owner_phone || '').trim(),
      tenant_name: (f.tenant_name || '').trim(),
      tenant_phone: (f.tenant_phone || '').trim(),
    });
  });

  if (errors.length) {
    return toast(errors[0] + (errors.length > 1 ? ` (+${errors.length - 1})` : ''), true);
  }
  if (!payload.length) {
    return toast('কোনো ফ্ল্যাট নেই', true);
  }

  const btn = _f$('flatSave');
  const lab = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'সংরক্ষণ হচ্ছে…';

  try {
    const res = await SB.req('/rest/v1/rpc/update_flats_batch', {
      method: 'POST',
      body: { p_items: payload },
    });

   toast('সংরক্ষিত হয়েছে ✓');

    try { await DB.loadRef(); } catch (err) { console.error('DB.loadRef failed:', err); }
    closeFlatManager();
    try { if (typeof render === 'function') render(); } catch (err) { console.error('render failed:', err); }
  } catch (e) {
    toast(e.message || 'সংরক্ষণ ব্যর্থ', true);
  } finally {
    btn.disabled = false;
    btn.textContent = lab;
  }
}

/* =====================================================================
   SHARE / DOWNLOAD
   ===================================================================== */
async function fmDownloadPdf() {
  const pages = buildFlatPdfPages();
  if (!pages.length) return toast('কোনো তথ্য নেই', true);
  const name = 'malik-talika-' + _fTodayName() + '.pdf';
  await pdfOut(pages, name);
}

async function fmSharePdf() {
  const pages = buildFlatPdfPages();
  if (!pages.length) return toast('কোনো তথ্য নেই', true);
  const name = 'malik-talika-' + _fTodayName() + '.pdf';
  await pdfShare(pages, name);
}

function _fTodayName() {
  const d = new Date();
  const z = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${z(d.getMonth() + 1)}${z(d.getDate())}`;
}

/* =====================================================================
   SETUP
   ===================================================================== */
function setupFlatManager() {
  const ov = _f$('flatOv');
  if (!ov) return;

  const xBtn = _f$('flatX'); if (xBtn) xBtn.onclick = closeFlatManager;
  const cancelBtn = _f$('flatCancel'); if (cancelBtn) cancelBtn.onclick = closeFlatManager;

  document.querySelectorAll('.fm-tab').forEach(t => {
    t.onclick = () => switchTab(t.dataset.tab);
  });

  document.querySelectorAll('.fm-filter-btn').forEach(b => {
    b.onclick = () => {
      document.querySelectorAll('.fm-filter-btn').forEach(x => x.classList.remove('on'));
      b.classList.add('on');
      fmFilter = b.dataset.filter;
      renderListPreview();
    };
  });

  const saveBtn = _f$('flatSave'); if (saveBtn) saveBtn.onclick = saveAllFlats;
  const shareBtn = _f$('fmShare'); if (shareBtn) shareBtn.onclick = fmSharePdf;
  const dlBtn = _f$('fmDownload'); if (dlBtn) dlBtn.onclick = fmDownloadPdf;

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !ov.hidden) closeFlatManager();
  });
}

/* =====================================================================
   GLOBAL EXPOSE
   ===================================================================== */
window.openFlatManager = openFlatManager;
window.closeFlatManager = closeFlatManager;
window.setupFlatManager = setupFlatManager;
