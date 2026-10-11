/* =====================================================================
   user-manager.js — ইউজার ম্যানেজমেন্ট (Admin only)
   কাজী মোশাররফ টাওয়ার ভবন মালিক সমিতি
   ===================================================================== */

const ROLE_BN = { admin: 'অ্যাডমিন', accountant: 'হিসাবরক্ষক', viewer: 'দর্শক' };

/* ===== English-only filter ===== */
function englishOnly(input) {
  if (!input) return;
  input.setAttribute('inputmode', 'latin');
  input.classList.add('english-only');
  input.addEventListener('input', () => {
    const cleaned = input.value.replace(/[^A-Za-z0-9._\-@]/g, '');
    if (cleaned !== input.value) {
      const pos = input.selectionStart;
      input.value = cleaned;
      try { input.setSelectionRange(pos - 1, pos - 1); } catch (e) {}
    }
  });
}

/* ===== Open / Close ===== */
function openUserManager() {
  const ov = document.getElementById('userOv');
  if (!ov) return;
  ov.hidden = false;
  refreshUserList();
}
function closeUserManager() {
  const ov = document.getElementById('userOv');
  if (ov) ov.hidden = true;
}

/* ===== Refresh list ===== */
async function refreshUserList() {
  const box = document.getElementById('userList');
  if (!box) return;

  box.innerHTML = '<div class="empty">লোড হচ্ছে...</div>';

  try {
    const users = await SB.adminUserList();
    const me = SB.uid();

    if (!users || !users.length) {
      box.innerHTML = '<div class="empty">কোনো ইউজার নেই</div>';
      return;
    }

    box.innerHTML = users.map(u => {
      const isMe = u.id === me;
      const roleCls = u.is_active ? u.role : 'inactive';
      const roleLabel = u.is_active ? (ROLE_BN[u.role] || u.role) : 'নিষ্ক্রিয়';

      return `
        <div class="user-item">
          <div class="user-info">
            <div class="user-name">
              ${esc(u.full_name)}${isMe ? ' <small style="color:var(--mute);font-weight:400">(আপনি)</small>' : ''}
            </div>
            <div class="user-meta">
              <span>👤 ${esc(u.login_id || '—')}</span>
              <span class="role-badge ${roleCls}">${roleLabel}</span>
            </div>
          </div>
          <div class="user-actions">
            <button type="button" onclick="editUser('${u.id}')" title="সম্পাদনা">✏️ সম্পাদনা</button>
            <button type="button" onclick="resetUserPw('${u.id}','${esc(u.full_name).replace(/'/g, "\\'")}')" title="পাসওয়ার্ড">🔑 পাসওয়ার্ড</button>
            ${!isMe ? `<button type="button" onclick="toggleUserActive('${u.id}', ${u.is_active})">${u.is_active ? '🚫 নিষ্ক্রিয়' : '✓ সক্রিয়'}</button>` : ''}
            ${!isMe ? `<button type="button" class="danger" onclick="deleteUser('${u.id}','${esc(u.full_name).replace(/'/g, "\\'")}')" title="মুছুন">🗑️ মুছুন</button>` : ''}
          </div>
        </div>
      `;
    }).join('');
  } catch (e) {
    box.innerHTML = `<div class="empty">লোড করা যায়নি: ${esc(e.message)}</div>`;
  }
}

/* ===== Add user ===== */
async function addUser() {
  const v = await ask({
    title: 'নতুন ইউজার তৈরি',
    msg: 'একটি নতুন ইউজার অ্যাকাউন্ট তৈরি হবে।',
    fields: [
      { label: 'পূর্ণ নাম', ph: 'যেমন: মোঃ আবুল হাসান' },
      { label: 'ইউজারনেম (ইংরেজি)', ph: 'যেমন: hasan' },
      { label: 'ইমেইল (ঐচ্ছিক)', ph: 'খালি রাখলে অটো তৈরি হবে' },
      { label: 'পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)', type: 'password' },
      { label: 'ভূমিকা', type: 'select', options: [['admin', 'অ্যাডমিন'], ['accountant', 'হিসাবরক্ষক'], ['viewer', 'দর্শক']] }
    ],
    ok: 'তৈরি করুন',
    validate: (values) => {
      const [full_name, login_id, , password, role] = values.map(s => (s || '').trim());
      if (!full_name) return 'পূর্ণ নাম দিন';
      if (!login_id) return 'ইউজারনেম দিন';
      if (!/^[a-z0-9._-]+$/i.test(login_id)) return 'ইউজারনেম শুধু ইংরেজি অক্ষর, সংখ্যা, . _ - দিয়ে';
      if (!password) return 'পাসওয়ার্ড দিন';
      if (password.length < 6) return 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষর';
      if (!role) return 'ভূমিকা বাছাই করুন';
      return null;
    }
  });
  if (!v) return;

  let [full_name, login_id, email, password, role] = v.map(s => (s || '').trim());
  if (!email) {
    const safe = login_id.toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 30) || 'user';
    email = safe + '@kmt.local';
  }

  try {
    await SB.adminUserCreate({ email, password, login_id, full_name, role });
    toast('নতুন ইউজার তৈরি হয়েছে ✓');
    refreshUserList();
  } catch (e) {
    toast(e.message || 'তৈরি করা যায়নি', true);
  }
}

/* ===== Edit user (username, email, full name, role, active) ===== */
async function editUser(id) {
  const users = await SB.adminUserList();
  const u = users.find(x => x.id === id);
  if (!u) return;

  const me = SB.uid();
  const isMe = u.id === me;

  const fields = [
    { label: 'পূর্ণ নাম', value: u.full_name },
    { label: 'ইউজারনেম (ইংরেজি)', value: u.login_id || '' },
    { label: 'ইমেইল', value: u.email || '' },
    {
      label: 'ভূমিকা', type: 'select', value: u.role,
      options: [['admin', 'অ্যাডমিন'], ['accountant', 'হিসাবরক্ষক'], ['viewer', 'দর্শক']]
    }
  ];
  if (!isMe) {
    fields.push({
      label: 'সক্রিয়?', type: 'select', value: u.is_active ? 'true' : 'false',
      options: [['true', 'সক্রিয়'], ['false', 'নিষ্ক্রিয়']]
    });
  }

  const v = await ask({
    title: 'ইউজার সম্পাদনা',
    fields,
    ok: 'সংরক্ষণ',
    validate: (values) => {
      const [full_name, login_id, email, role] = values.map(s => (s || '').trim());
      if (!full_name) return 'পূর্ণ নাম দিন';
      if (!login_id) return 'ইউজারনেম দিন';
      if (!/^[a-z0-9._-]+$/i.test(login_id)) return 'ইউজারনেম শুধু ইংরেজি অক্ষর, সংখ্যা, . _ - দিয়ে';
      if (!email) return 'ইমেইল দিন';
      if (!email.includes('@')) return 'সঠিক ইমেইল দিন';
      if (!role) return 'ভূমিকা বাছাই করুন';
      return null;
    }
  });
  if (!v) return;

  const full_name = v[0].trim();
  const login_id = v[1].trim();
  const email = v[2].trim();
  const role = v[3];
  const is_active = isMe ? true : (v[4] === 'true');

  try {
    await SB.rpc('admin_user_update_full', {
      p_id: id,
      p_login_id: login_id,
      p_email: email,
      p_full_name: full_name,
      p_role: role,
      p_is_active: is_active
    });
    toast('ইউজার হালনাগাদ হয়েছে ✓');
    refreshUserList();
  } catch (e) {
    toast(e.message || 'হালনাগাদ হয়নি', true);
  }
}

/* ===== Reset password ===== */
async function resetUserPw(id, name) {
  const v = await ask({
    title: 'পাসওয়ার্ড রিসেট',
    msg: `${name} এর জন্য নতুন পাসওয়ার্ড`,
    fields: [
      { label: 'নতুন পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)', type: 'password' },
      { label: 'আবার লিখুন', type: 'password' }
    ],
    ok: 'রিসেট'
  });
  if (!v) return;
  if (v[0].length < 6 || v[0] !== v[1]) {
    return toast('পাসওয়ার্ড কমপক্ষে ৬ অক্ষর ও দুইবার একই হতে হবে', true);
  }
  try {
    await SB.adminUserResetPassword(id, v[0]);
    toast('পাসওয়ার্ড রিসেট হয়েছে ✓');
  } catch (e) {
    toast(e.message || 'রিসেট হয়নি', true);
  }
}

/* ===== Toggle active ===== */
async function toggleUserActive(id, isActive) {
  const users = await SB.adminUserList();
  const u = users.find(x => x.id === id);
  if (!u) return;

  const action = isActive ? 'নিষ্ক্রিয়' : 'সক্রিয়';
  const v = await ask({
    title: `ইউজার ${action} করবেন?`,
    msg: `${u.full_name}${isActive ? ' আর লগইন করতে পারবেন না।' : ' আবার লগইন করতে পারবেন।'}`,
    ok: action + ' করুন'
  });
  if (!v) return;

  try {
    await SB.rpc('admin_user_update_full', {
      p_id: id,
      p_login_id: u.login_id,
      p_email: u.email,
      p_full_name: u.full_name,
      p_role: u.role,
      p_is_active: !isActive
    });
    toast(`ইউজার ${action} হয়েছে ✓`);
    refreshUserList();
  } catch (e) {
    toast(e.message || 'হয়নি', true);
  }
}

/* ===== Delete user (permanent) ===== */
async function deleteUser(id, name) {
  const v = await ask({
    title: '⚠️ ইউজার সম্পূর্ণ মুছবেন?',
    msg: `${name} — এই ইউজারটি স্থায়ীভাবে মুছে যাবে। এই কাজ ফিরিয়ে আনা যাবে না।`,
    ok: 'মুছে ফেলুন'
  });
  if (!v) return;

  // দ্বিতীয়বার নিশ্চিতকরণ (extra safety)
  const v2 = await ask({
    title: '⚠️ নিশ্চিত করুন',
    msg: 'সত্যিই কি এই ইউজারকে মুছে ফেলতে চান?',
    fields: [{ label: 'নিশ্চিত করতে "হ্যাঁ" লিখুন', ph: 'হ্যাঁ' }],
    ok: 'মুছে ফেলুন'
  });
  if (!v2) return;
  if ((v2[0] || '').trim().toLowerCase() !== 'হ্যাঁ' && (v2[0] || '').trim().toLowerCase() !== 'hye' && (v2[0] || '').trim().toLowerCase() !== 'hyan') {
    return toast('নিশ্চিতকরণ বাতিল', true);
  }

  try {
    await SB.rpc('admin_user_delete', { p_id: id });
    toast('ইউজার মুছে ফেলা হয়েছে ✓');
    refreshUserList();
  } catch (e) {
    toast(e.message || 'মুছতে ব্যর্থ', true);
  }
}

/* ===== Setup listeners ===== */
function setupUserManager() {
  const ov = document.getElementById('userOv');
  const xBtn = document.getElementById('userOvX');
  const addBtn = document.getElementById('userAddBtn');

  if (xBtn) xBtn.onclick = closeUserManager;
  if (addBtn) addBtn.onclick = addUser;

  if (ov) {
    ov.addEventListener('click', e => {
      if (e.target.id === 'userOv') closeUserManager();
    });
  }
}

/* ===== Global expose ===== */
window.openUserManager = openUserManager;
window.closeUserManager = closeUserManager;
window.refreshUserList = refreshUserList;
window.addUser = addUser;
window.editUser = editUser;
window.resetUserPw = resetUserPw;
window.toggleUserActive = toggleUserActive;
window.deleteUser = deleteUser;
window.setupUserManager = setupUserManager;
