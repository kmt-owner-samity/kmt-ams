/* =====================================================================
   flat-manager.js — Flat & Owner Management (Admin only)
   কাজী মোশাররফ টাওয়ার ভবন মালিক সমিতি
   ===================================================================== */

/* ===== State ===== */
let fmFlats = [];         // [{id, flat_no, floor_no, owner_name, owner_phone, tenant_name, tenant_phone}]
let fmFilter = 'all';     // 'all' | 'tenant'

const _f$ = id => document.getElementById(id);

/* =====================================================================
   OPEN / CLOSE
   ===================================================================== */
async function openFlatManager() {
  const ov = _f$('flatOv');
  if (!ov) return;
  ov.hidden = false;

  // Reset to edit tab
  switchTab('edit');

  // Load data
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
          <input type="text" data-role="owner_name" value="${esc(f.owner_name)}" autocomplete="off">
        </div>
        <div class="fm-field">
          <label>মোবাইল</label>
          <input type="tel" data-role="owner_phone" value="${esc(f.owner_phone)}" placeholder="ঐচ্ছিক" autocomplete="off">
        </div>

        <div class="fm-tenant-label">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M5 21V7l7-4 7 4v14"/></svg>
          ভাড়াটিয়া (ঐচ্ছিক)
        </div>
        <div class="fm-field tenant">
          <label>নাম</label>
          <input type="text" data-role="tenant_name" value="${esc(f.tenant_name)}" placeholder="খালি রাখলে ভাড়াটিয়া নেই" autocomplete="off">
        </div>
        <div class="fm-field tenant">
          <label>মোবাইল</label>
          <input type="tel" data-role="tenant_phone" value="${esc(f.tenant_phone)}" placeholder="ঐচ্ছিক" autocomplete="off">
        </div>
      </div>
    </div>
  `).join('');

  // Attach input listeners to update state
  list.querySelectorAll('.fm-item').forEach(el => {
    const flatNo = el.dataset.flatNo;
    const row = fmFlats.find(x => x.flat_no === flatNo);
    if (!row) return;

    ['owner_name', 'owner_phone', 'tenant_name', 'tenant_phone'].forEach(role => {
      const inp = el.querySelector(`[data-role="${role}"]`);
      if (inp) inp.addEventListener('input', () => { row[role] = inp.value; });
    });
  });
}

/* =====================================================================
   RENDER — List Tab (Preview A4)
   ===================================================================== */
function renderListPreview() {
  const preview = _f$('fmPreview');
  const fit = _f$('fmFit');
  if (!preview) return;

  const filtered = fmFilter === 'tenant'
    ? fmFlats.filter(f => f.tenant_name && f.tenant_name.trim())
    : fmFlats;

  if (!filtered.length) {
    preview.innerHTML = '<div class="empty">কোনো তথ্য নেই</div>';
    if (fit) { fit.style.width = 'auto'; fit.style.height = 'auto'; }
    return;
  }

  const today = new Date();
  const dateStr = bd(String(today.getDate()).padStart(2, '0')) + '/' +
                  bd(String(today.getMonth() + 1).padStart(2, '0')) + '/' +
                  bd(today.getFullYear());

  const rows = filtered.map((f, i) => `
    <tr>
      <td class="c">${bd(i + 1)}</td>
      <td><b>${esc(f.flat_no)}</b></td>
      <td>${esc(f.owner_name)}</td>
      <td>${esc(f.owner_phone || '—')}</td>
      <td>${esc(f.tenant_name || '—')}</td>
      <td>${esc(f.tenant_phone || '—')}</td>
    </tr>
  `).join('');

  const html = `
    <div class="a4 tight">
      <div class="ah">
        <b>কাজী মোশাররফ টাওয়ার ভবন মালিক সমিতি</b>
        <span>বাসা নং ৩/৪, ব্লক-এ, আসাদ এভিনিউ, ঢাকা-১২০৭</span>
      </div>
      <div class="mt">মালিক ও ভাড়াটিয়া তালিকা</div>
      <h3 class="sh">তারিখ: ${dateStr}${fmFilter === 'tenant' ? ' — শুধু ভাড়াটিয়া' : ''}</h3>
      <table class="at">
        <thead>
          <tr>
            <th style="width:50px">ক্রঃ</th>
            <th style="width:70px">ফ্ল্যাট</th>
            <th>মালিকের নাম</th>
            <th style="width:140px">মালিকের মোবাইল</th>
            <th>ভাড়াটিয়ার নাম</th>
            <th style="width:140px">ভাড়াটিয়ার মোবাইল</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="ft">মোট: ${bd(filtered.length)} টি ফ্ল্যাট · এটি কম্পিউটার সিস্টেম দ্বারা প্রস্তুতকৃত।</div>
    </div>
  `;

  preview.innerHTML = html;

  // Fit A4 to container
  if (fit) {
    const wrap = preview.parentElement;
    const containerWidth = wrap ? wrap.clientWidth - 24 : 800;
    const scale = Math.min(1, containerWidth / 794);
    preview.style.width = '794px';
    preview.style.transform = `scale(${scale})`;
    fit.style.width = 794 * scale + 'px';
    fit.style.height = preview.firstElementChild.offsetHeight * scale + 'px';
  }
}

/* =====================================================================
   SWITCH TAB
   ===================================================================== */
function switchTab(tabName) {
  document.querySelectorAll('.fm-tab').forEach(t => {
    t.classList.toggle('on', t.dataset.tab === tabName);
  });
  document.querySelectorAll('.fm-panel').forEach(p => {
    p.classList.toggle('on', p.id === 'fmPanel' + tabName.charAt(0).toUpperCase() + tabName.slice(1));
  });

  if (tabName === 'list') {
    // Re-render preview with current data
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

    const count = res && res.count ? res.count : payload.length;
    toast(`${bd(count)}টি ফ্ল্যাট হালনাগাদ হয়েছে ✓`);

    // Reload local DB cache
    await DB.loadRef();

    // Update config-based FLATS to reflect new tenant/owner (for display)
    // ⚠️ FLATS is const — but its objects are mutable
    // (Alternative: rely on DB.flats — but app.js still uses FLATS)
    // We'll keep FLATS as-is for now; DB.flats will be the source.

    // Close modal
    closeFlatManager();

    // Refresh main UI
    if (typeof render === 'function') render();
  } catch (e) {
    toast(e.message || 'সংরক্ষণ ব্যর্থ', true);
    btn.disabled = false;
    btn.textContent = lab;
  }
}

/* =====================================================================
   SHARE / DOWNLOAD (A4 PDF)
   ===================================================================== */
async function fmDownloadPdf() {
  const preview = _f$('fmPreview');
  if (!preview || !preview.firstElementChild) {
    return toast('প্রথমে তালিকা দেখুন', true);
  }
  const pages = [preview.innerHTML];
  const name = 'malik-talika-' + _fTodayName() + '.pdf';
  await pdfOut(pages, name);
}

async function fmSharePdf() {
  const preview = _f$('fmPreview');
  if (!preview || !preview.firstElementChild) {
    return toast('প্রথমে তালিকা দেখুন', true);
  }
  const pages = [preview.innerHTML];
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

  // Close buttons
  const xBtn = _f$('flatX'); if (xBtn) xBtn.onclick = closeFlatManager;
  const cancelBtn = _f$('flatCancel'); if (cancelBtn) cancelBtn.onclick = closeFlatManager;

  // Tab buttons
  document.querySelectorAll('.fm-tab').forEach(t => {
    t.onclick = () => switchTab(t.dataset.tab);
  });

  // Filter buttons (list tab)
  document.querySelectorAll('.fm-filter-btn').forEach(b => {
    b.onclick = () => {
      document.querySelectorAll('.fm-filter-btn').forEach(x => x.classList.remove('on'));
      b.classList.add('on');
      fmFilter = b.dataset.filter;
      renderListPreview();
    };
  });

  // Save button
  const saveBtn = _f$('flatSave'); if (saveBtn) saveBtn.onclick = saveAllFlats;

  // Share / Download
  const shareBtn = _f$('fmShare'); if (shareBtn) shareBtn.onclick = fmSharePdf;
  const dlBtn = _f$('fmDownload'); if (dlBtn) dlBtn.onclick = fmDownloadPdf;

  // Escape key
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
