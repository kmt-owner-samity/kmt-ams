/* =====================================================================
   category-manager.js — Category Management (Admin only)
   কাজী মোশাররফ টাওয়ার ভবন মালিক সমিতি
   
   ⚠️ এই ফাইল সম্পূর্ণ isolated।
   - শুধু নিজের global function expose করে
   - অন্য কোনো ফাইলের global variable/function-এ হাত দেয় না
   - শুধু DB-এর নির্দিষ্ট category API ব্যবহার করে
   ===================================================================== */

/* ============================================================
   Internal State (isolated — কোনো external access নেই)
   ============================================================ */
const _cmState = {
  all: [],           // সব category (income + expense)
  currentKind: 'income',
  loaded: false,
};

/* ============================================================
   DOM Helpers (isolated — নিজস্ব $)
   ============================================================ */
const _cm$ = id => document.getElementById(id);

/* ============================================================
   Icons
   ============================================================ */
const _cmIcons = {
  edit: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16zM13 7l4 4"/></svg>',
  del: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  on: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  off: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>',
  up: '▲',
  down: '▼',
};

/* ============================================================
   ====== OPEN / CLOSE ======
   ============================================================ */
async function openCategoryManager() {
  const ov = _cm$('categoryOv');
  if (!ov) return;

  ov.hidden = false;

  // Reset tab to income
  _cmState.currentKind = 'income';
  _cmState.loaded = false;

  // Update tabs
  _cmUpdateTabs();

  // Load data
  await _cmLoad();
}

function closeCategoryManager() {
  const ov = _cm$('categoryOv');
  if (ov) ov.hidden = true;
}

/* ============================================================
   ====== LOAD DATA ======
   ============================================================ */
async function _cmLoad() {
  const wrap = _cm$('catListWrap');
  if (wrap) wrap.innerHTML = '<div class="empty">লোড হচ্ছে...</div>';

  try {
    const rows = await SB.req('/rest/v1/rpc/category_list', {
      method: 'POST',
      body: {},
    });

    _cmState.all = (rows || []).map(r => ({
      id: r.id,
      kind: r.kind,
      name: r.name,
      parent_id: r.parent_id,
      sort_order: r.sort_order,
      is_service_charge: r.is_service_charge,
      is_active: r.is_active,
      usage_count: +r.usage_count || 0,
      child_count: +r.child_count || 0,
    }));
    _cmState.loaded = true;

    _cmRender();
  } catch (e) {
    if (wrap) {
      wrap.innerHTML = `<div class="empty">লোড ব্যর্থ: ${_cmEsc(e.message)}</div>`;
    }
  }
}

/* ============================================================
   ====== RENDER ======
   ============================================================ */
function _cmRender() {
  const wrap = _cm$('catListWrap');
  if (!wrap) return;

  const kind = _cmState.currentKind;
  const parents = _cmState.all
    .filter(c => c.kind === kind && !c.parent_id)
    .sort((a, b) => (a.sort_order - b.sort_order) || (a.id - b.id));

  if (!parents.length) {
    wrap.innerHTML = '<div class="cat-empty">এই খাতে কোনো কিছু নেই</div>';
    return;
  }

  const html = parents.map((p, idx) => _cmParentHTML(p, idx, parents.length)).join('');
  wrap.innerHTML = html;

  _cmAttachEvents(wrap);
}

function _cmParentHTML(parent, idx, total) {
  const children = _cmState.all
    .filter(c => c.parent_id === parent.id)
    .sort((a, b) => (a.sort_order - b.sort_order) || (a.id - b.id));

  const inactiveCls = parent.is_active ? '' : ' inactive';
  const inactiveBadge = parent.is_active ? '' :
    '<span class="inactive-badge">নিষ্ক্রিয়</span>';

  // Meta info
  const metaParts = [];
  if (children.length) metaParts.push(`${children.length}টি উপ-খাত`);
  if (parent.usage_count) metaParts.push(`${parent.usage_count}টি লেনদেন`);
  const meta = metaParts.length ? `<div class="cat-meta">${metaParts.join(' · ')}${inactiveBadge}</div>`
    : (inactiveBadge ? `<div class="cat-meta">${inactiveBadge}</div>` : '');

  // Order buttons
  const canUp = idx > 0;
  const canDown = idx < total - 1;

  // Delete blocked?
  const delBlocked = parent.usage_count > 0 || children.length > 0;
  const delTitle = delBlocked
    ? (parent.usage_count > 0
        ? 'এই খাতে লেনদেন আছে, মুছে ফেলা যাবে না'
        : 'আগে উপ-খাতগুলো মুছুন')
    : 'মুছে ফেলুন';

  // Children HTML
  const childHTML = children.map((c, cidx) => _cmChildHTML(c, cidx, children.length)).join('');
  const childrenSection = children.length
    ? `<div class="cat-children">${childHTML}</div>`
    : '';

  return `
    <div class="cat-parent" data-id="${parent.id}" data-kind="${parent.kind}">
      <div class="cat-parent-row">
        <div class="cat-order-btns">
          <button type="button" class="cat-order-btn" data-act="up" data-id="${parent.id}"
                  ${canUp ? '' : 'disabled'} title="উপরে">${_cmIcons.up}</button>
          <button type="button" class="cat-order-btn" data-act="down" data-id="${parent.id}"
                  ${canDown ? '' : 'disabled'} title="নিচে">${_cmIcons.down}</button>
        </div>
        <div class="cat-name-wrap">
          <div class="cat-name${inactiveCls}">${_cmEsc(parent.name)}</div>
          ${meta}
        </div>
        <div class="cat-actions">
          <button type="button" class="cat-action ed" data-act="rename" data-id="${parent.id}"
                  title="নাম পরিবর্তন">${_cmIcons.edit}</button>
          <button type="button" class="cat-action tog${parent.is_active ? '' : ' off'}"
                  data-act="toggle" data-id="${parent.id}" data-active="${parent.is_active}"
                  title="${parent.is_active ? 'নিষ্ক্রিয় করুন' : 'সক্রিয় করুন'}">
            ${parent.is_active ? _cmIcons.on : _cmIcons.off}
          </button>
          <button type="button" class="cat-action del" data-act="delete" data-id="${parent.id}"
                  ${delBlocked ? 'disabled' : ''} title="${delTitle}">${_cmIcons.del}</button>
        </div>
      </div>
      ${childrenSection}
      <div class="cat-add-child">
        <button type="button" class="cat-add-child-btn" data-act="addchild" data-id="${parent.id}"
                data-kind="${parent.kind}">
          ➕ নতুন উপ-খাত
        </button>
      </div>
    </div>
  `;
}

function _cmChildHTML(child, idx, total) {
  const inactiveCls = child.is_active ? '' : ' inactive';
  const inactiveBadge = child.is_active ? '' :
    '<span class="inactive-badge">নিষ্ক্রিয়</span>';

  const metaParts = [];
  if (child.usage_count) metaParts.push(`${child.usage_count}টি লেনদেন`);
  const meta = metaParts.length ? `<div class="cat-meta">${metaParts.join(' · ')}${inactiveBadge}</div>`
    : (inactiveBadge ? `<div class="cat-meta">${inactiveBadge}</div>` : '');

  const canUp = idx > 0;
  const canDown = idx < total - 1;

  const delBlocked = child.usage_count > 0;
  const delTitle = delBlocked ? 'এই উপ-খাতে লেনদেন আছে, মুছে ফেলা যাবে না' : 'মুছে ফেলুন';

  return `
    <div class="cat-child" data-id="${child.id}" data-parent-id="${child.parent_id}">
      <div class="cat-order-btns">
        <button type="button" class="cat-order-btn" data-act="up" data-id="${child.id}"
                ${canUp ? '' : 'disabled'} title="উপরে">${_cmIcons.up}</button>
        <button type="button" class="cat-order-btn" data-act="down" data-id="${child.id}"
                ${canDown ? '' : 'disabled'} title="নিচে">${_cmIcons.down}</button>
      </div>
      <div class="cat-name-wrap">
        <div class="cat-name${inactiveCls}">${_cmEsc(child.name)}</div>
        ${meta}
      </div>
      <div class="cat-actions">
        <button type="button" class="cat-action ed" data-act="rename" data-id="${child.id}"
                title="নাম পরিবর্তন">${_cmIcons.edit}</button>
        <button type="button" class="cat-action tog${child.is_active ? '' : ' off'}"
                data-act="toggle" data-id="${child.id}" data-active="${child.is_active}"
                title="${child.is_active ? 'নিষ্ক্রিয় করুন' : 'সক্রিয় করুন'}">
          ${child.is_active ? _cmIcons.on : _cmIcons.off}
        </button>
        <button type="button" class="cat-action del" data-act="delete" data-id="${child.id}"
                ${delBlocked ? 'disabled' : ''} title="${delTitle}">${_cmIcons.del}</button>
      </div>
    </div>
  `;
}

/* ============================================================
   ====== ATTACH EVENTS ======
   ============================================================ */
function _cmAttachEvents(wrap) {
  // Delegated click handler
  wrap.addEventListener('click', async e => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;

    const act = btn.dataset.act;
    const id = +btn.dataset.id;

    if (act === 'up') return _cmReorder(id, 'up');
    if (act === 'down') return _cmReorder(id, 'down');
    if (act === 'rename') return _cmRename(id);
    if (act === 'toggle') return _cmToggle(id, btn.dataset.active === 'true');
    if (act === 'delete') return _cmDelete(id);
    if (act === 'addchild') return _cmAddChild(+btn.dataset.id, btn.dataset.kind);
  });
}

/* ============================================================
   ====== ACTIONS ======
   ============================================================ */

/* --- Rename --- */
async function _cmRename(id) {
  const row = _cmState.all.find(c => c.id === id);
  if (!row) return;

  const result = await ask({
    title: 'নাম পরিবর্তন',
    fields: [
      { label: 'খাতের নাম', value: row.name, ph: 'নতুন নাম' },
    ],
    ok: 'সংরক্ষণ',
    validate: (values) => {
      const name = (values[0] || '').trim();
      if (!name) return 'নাম খালি রাখা যাবে না';
      if (name === row.name) return 'নাম পরিবর্তন হয়নি';
      return null;
    },
  });

  if (!result) return;

  const newName = result[0].trim();

  try {
    await SB.req('/rest/v1/rpc/category_rename', {
      method: 'POST',
      body: { p_id: id, p_name: newName },
    });
    toast('নাম পরিবর্তন হয়েছে ✓', 'ok');
    await _cmReload();
  } catch (e) {
    toast(e.message || 'পরিবর্তন হয়নি', 'err');
  }
}

/* --- Toggle Active --- */
async function _cmToggle(id, isActive) {
  const row = _cmState.all.find(c => c.id === id);
  if (!row) return;

  const action = isActive ? 'নিষ্ক্রিয়' : 'সক্রিয়';
  const confirm = await ask({
    title: `খাত ${action} করবেন?`,
    msg: isActive
      ? `"${row.name}" নিষ্ক্রিয় করা হবে। নতুন এন্ট্রিতে আর দেখা যাবে না, তবে পুরোনো রিপোর্টে থাকবে।`
      : `"${row.name}" আবার সক্রিয় করা হবে।`,
    ok: `${action} করুন`,
  });
  if (!confirm) return;

  try {
    await SB.req('/rest/v1/rpc/category_toggle_active', {
      method: 'POST',
      body: { p_id: id, p_active: !isActive },
    });
    toast(`খাত ${action} হয়েছে ✓`, 'ok');
    await _cmReload();
  } catch (e) {
    toast(e.message || 'হয়নি', 'err');
  }
}

/* --- Delete --- */
async function _cmDelete(id) {
  const row = _cmState.all.find(c => c.id === id);
  if (!row) return;

  const confirm = await ask({
    title: '⚠️ খাত মুছবেন?',
    msg: `"${row.name}" স্থায়ীভাবে মুছে যাবে। এই কাজ ফিরিয়ে আনা যাবে না।`,
    ok: 'মুছে ফেলুন',
  });
  if (!confirm) return;

  try {
    await SB.req('/rest/v1/rpc/category_delete', {
      method: 'POST',
      body: { p_id: id },
    });
    toast('খাত মুছে ফেলা হয়েছে ✓', 'ok');
    await _cmReload();
  } catch (e) {
    toast(e.message || 'মুছতে ব্যর্থ', 'err');
  }
}

/* --- Reorder --- */
async function _cmReorder(id, direction) {
  try {
    await SB.req('/rest/v1/rpc/category_reorder', {
      method: 'POST',
      body: { p_id: id, p_direction: direction },
    });
    await _cmReload();
  } catch (e) {
    toast(e.message || 'সরানো যায়নি', 'err');
  }
}

/* --- Add Top-Level Category --- */
async function _cmAddTop() {
  const kind = _cmState.currentKind;
  const kindLabel = kind === 'income' ? 'আয়' : 'ব্যয়';

  const result = await ask({
    title: `নতুন ${kindLabel} খাত`,
    fields: [
      { label: 'খাতের নাম', ph: 'নতুন খাতের নাম' },
    ],
    ok: 'তৈরি করুন',
    validate: (values) => {
      const name = (values[0] || '').trim();
      if (!name) return 'নাম খালি রাখা যাবে না';
      return null;
    },
  });

  if (!result) return;

  const newName = result[0].trim();

  try {
    await SB.req('/rest/v1/rpc/category_create', {
      method: 'POST',
      body: { p_kind: kind, p_name: newName, p_parent_id: null },
    });
    toast('নতুন খাত তৈরি হয়েছে ✓', 'ok');
    await _cmReload();
  } catch (e) {
    toast(e.message || 'তৈরি করা যায়নি', 'err');
  }
}

/* --- Add Child Category --- */
async function _cmAddChild(parentId, kind) {
  const parent = _cmState.all.find(c => c.id === parentId);
  if (!parent) return;

  const result = await ask({
    title: `নতুন উপ-খাত`,
    msg: `প্রধান খাত: ${parent.name}`,
    fields: [
      { label: 'উপ-খাতের নাম', ph: 'নতুন উপ-খাতের নাম' },
    ],
    ok: 'তৈরি করুন',
    validate: (values) => {
      const name = (values[0] || '').trim();
      if (!name) return 'নাম খালি রাখা যাবে না';
      return null;
    },
  });

  if (!result) return;

  const newName = result[0].trim();

  try {
    await SB.req('/rest/v1/rpc/category_create', {
      method: 'POST',
      body: { p_kind: kind, p_name: newName, p_parent_id: parentId },
    });
    toast('নতুন উপ-খাত তৈরি হয়েছে ✓', 'ok');
    await _cmReload();
  } catch (e) {
    toast(e.message || 'তৈরি করা যায়নি', 'err');
  }
}

/* ============================================================
   ====== RELOAD HELPER ======
   ============================================================ */
async function _cmReload() {
  await _cmLoad();
  // Force DB cache reload যাতে entry form-এ নতুন খাত দেখা যায়
  try {
    if (typeof DB !== 'undefined' && typeof DB.loadRef === 'function') {
      await DB.loadRef();
    }
    // Entry form-এর category dropdown refresh
    if (typeof setType === 'function') {
      try { setType(); } catch (e) { /* silent */ }
    }
  } catch (e) { /* silent */ }
}

/* ============================================================
   ====== TABS ======
   ============================================================ */
function _cmUpdateTabs() {
  document.querySelectorAll('.cat-tab').forEach(t => {
    t.classList.toggle('on', t.dataset.kind === _cmState.currentKind);
  });
}

/* ============================================================
   ====== SETUP ======
   ============================================================ */
function setupCategoryManager() {
  const ov = _cm$('categoryOv');
  if (!ov) return;

  // Close buttons
  const xBtn = _cm$('catX');
  if (xBtn) xBtn.onclick = closeCategoryManager;
  const cancelBtn = _cm$('catCancel');
  if (cancelBtn) cancelBtn.onclick = closeCategoryManager;

  // Add top button
  const addTop = _cm$('catAddTop');
  if (addTop) addTop.onclick = _cmAddTop;

  // Tabs
  document.querySelectorAll('.cat-tab').forEach(t => {
    t.onclick = () => {
      _cmState.currentKind = t.dataset.kind;
      _cmUpdateTabs();
      _cmRender();
    };
  });

  // Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !ov.hidden) closeCategoryManager();
  });
}

/* ============================================================
   ====== Internal Escape Helper ======
   ============================================================ */
function _cmEsc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

/* ============================================================
   ====== GLOBAL EXPOSE ======
   ============================================================ */
window.openCategoryManager = openCategoryManager;
window.closeCategoryManager = closeCategoryManager;
window.setupCategoryManager = setupCategoryManager;
