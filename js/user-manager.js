/* user-manager.js — ইউজার ম্যানেজমেন্ট (Admin only) */

const ROLE_BN = { admin: 'অ্যাডমিন', accountant: 'হিসাবরক্ষক', viewer: 'দর্শক' };

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
            <button type="button" onclick="editUser('${u.id}')">✏️ সম্পাদনা</button>
            <button type="button" onclick="resetUserPw('${u.id}','${esc(u.full_name)}')">🔑 পাসওয়ার্ড</button>
            ${!isMe ? `<button type="button" class="danger" onclick="toggleUserActive('${u.id}', ${u.is_active})">${u.is_active ? '🚫 নিষ্ক্রিয়' : '✓ সক্রিয়'}</button>` : ''}
          </div>
        </div>
      `;
    }).join('');
  } catch (e) {
    box.innerHTML = `<div class="empty">লোড করা যায়নি: ${esc(e.message)}</div>`;
  }
}

async function addUser() {
  const v = await ask({
    title: 'নতুন ইউজার তৈরি',
    msg: 'একটি নতুন ইউজার অ্যাকাউন্ট তৈরি হবে।',
    fields: [
      { label: 'পূর্ণ নাম', ph: 'যেমন: মোঃ আবুল হাসান' },
      { label: 'ইউজারনেম', ph: 'যেমন: hasan (ইংরেজি ছোট হাতের অক্ষর)' },
      { label: 'ইমেইল (ঐচ্ছিক)', ph: 'খালি রাখলে অটো তৈরি হবে' },
      { label: 'পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)', type: 'password' },
      { label: 'ভূমিকা', type: 'select', options: [['admin', 'অ্যাডমিন'], ['accountant', 'হিসাবরক্ষক'], ['viewer', 'দর্শক']] }
    ],
    ok: 'তৈরি করুন'
  });

  if (!v) return;

  let [full_name, login_id, email, password, role] = v.map(s => (s || '').trim());

  // অ্যাডমিন-এর role default
  if (!role) role = 'viewer';

  // Validation — দরকারি ঘর
  if (!full_name) return toast('পূর্ণ নাম দিন', true);
  if (!login_id) return toast('ইউজারনেম দিন', true);
  if (!password) return toast('পাসওয়ার্ড দিন', true);
  if (password.length < 6) return toast('পাসওয়ার্ড কমপক্ষে ৬ অক্ষর', true);

  // ইমেইল না দিলে auto-generate করুন
  if (!email) {
    // username থেকে email বানান (English-safe)
    const safeLogin = login_id.toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 30) || 'user';
    email = safeLogin + '@kmt.local';
  }

  try {
    await SB.adminUserCreate({ email, password, login_id, full_name, role });
    toast('নতুন ইউজার তৈরি হয়েছে ✓');
    refreshUserList();
  } catch (e) {
    toast(e.message || 'তৈরি করা যায়নি', true);
  }
}

async function editUser(id) {
  const users = await SB.adminUserList();
  const u = users.find(x => x.id === id);
  if (!u) return;

  const me = SB.uid();
  const isMe = u.id === me;

  const fields = [
    { label: 'পূর্ণ নাম', value: u.full_name },
    { label: 'ভূমিকা', type: 'select', value: u.role, options: [['admin', 'অ্যাডমিন'], ['accountant', 'হিসাবরক্ষক'], ['viewer', 'দর্শক']] }
  ];
  if (!isMe) {
    fields.push({ label: 'সক্রিয়?', type: 'select', value: u.is_active ? 'true' : 'false', options: [['true', 'সক্রিয়'], ['false', 'নিষ্ক্রিয়']] });
  }

  const v = await ask({ title: 'ইউজার সম্পাদনা', fields, ok: 'সংরক্ষণ' });
  if (!v) return;

  const full_name = v[0];
  const role = v[1];
  const is_active = isMe ? true : (v[2] === 'true');

  try {
    await SB.adminUserUpdate(id, full_name, role, is_active);
    toast('ইউজার হালনাগাদ হয়েছে ✓');
    refreshUserList();
  } catch (e) {
    toast(e.message || 'হালনাগাদ হয়নি', true);
  }
}

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
    await SB.adminUserUpdate(id, u.full_name, u.role, !isActive);
    toast(`ইউজার ${action} হয়েছে ✓`);
    refreshUserList();
  } catch (e) {
    toast(e.message || 'হয়নি', true);
  }
}

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

/* Global */
window.openUserManager = openUserManager;
window.closeUserManager = closeUserManager;
window.refreshUserList = refreshUserList;
window.addUser = addUser;
window.editUser = editUser;
window.resetUserPw = resetUserPw;
window.toggleUserActive = toggleUserActive;
window.setupUserManager = setupUserManager;
