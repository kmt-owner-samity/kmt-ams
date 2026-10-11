/* =====================================================================
   auth.js — Authentication & Session Management
   কাজী মোশাররফ টাওয়ার ভবন মালিক সমিতি
   ===================================================================== */

import { SB } from './db.js';
import { APP_CONFIG } from '../config.js';

/* ============ Auth State ============ */
let currentUser = null;   // { username, fullName, role, isActive }

/* ============ Public API ============ */

/**
 * বর্তমান ব্যবহারকারীর তথ্য
 */
export function getUser() {
  return currentUser;
}

/**
 * ব্যবহারকারীর role
 */
export function getRole() {
  return currentUser?.role || null;
}

/**
 * Admin কি না
 */
export function isAdmin() {
  return currentUser?.role === 'admin';
}

/**
 * Write permission আছে কি না (admin বা accountant)
 */
export function canWrite() {
  return currentUser?.role === 'admin' || currentUser?.role === 'accountant';
}

/**
 * Username দিয়ে লগইন
 * @param {string} username
 * @param {string} password
 * @throws {DbError} ভুল হলে
 */
export async function login(username, password) {
  if (!username || !password) {
    throw new Error('ইউজারনেম ও পাসওয়ার্ড দুটোই দিন');
  }
  
  // Supabase login
  await SB.loginByUsername(username, password);
  
  // Profile থেকে নাম, role নিন
  const p = SB.profile;
  if (!p) {
    throw new Error('প্রোফাইল পাওয়া যায়নি');
  }
  
  currentUser = {
    username: username.trim(),
    fullName: p.full_name,
    role: p.role,
    isActive: p.is_active,
  };
  
  // Last username সংরক্ষণ
  try {
    localStorage.setItem(APP_CONFIG.STORAGE.LAST_USER, currentUser.username);
  } catch {}
  
  return currentUser;
}

/**
 * Session restore — পেজ refresh হলে আগের login থাকে
 */
export async function restore() {
  const ok = await SB.restore();
  if (!ok) return null;
  
  const p = SB.profile;
  if (!p) return null;
  
  // Username জানি না, কিন্তু profile-এ login_id আছে?
  // (এর জন্য নিচের দিকে আলাদা query দরকার — পরের আপডেটে)
  // আপাতত username হিসাবে full_name ব্যবহার করছি না, বরং empty রাখছি
  currentUser = {
    username: p.full_name,      // ← temporary, পরে ঠিক করা হবে
    fullName: p.full_name,
    role: p.role,
    isActive: p.is_active,
  };
  
  return currentUser;
}

/**
 * Logout
 */
export async function logout() {
  await SB.logout();
  currentUser = null;
}

/**
 * Password পরিবর্তন (নিজের)
 * @param {string} currentPw - বর্তমান পাসওয়ার্ড
 * @param {string} newPw - নতুন পাসওয়ার্ড
 */
export async function changePassword(currentPw, newPw) {
  if (!currentPw || !newPw) {
    throw new Error('সব ঘর পূরণ করুন');
  }
  if (newPw.length < 6) {
    throw new Error('নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষর হতে হবে');
  }
  
  const ok = await SB.verify(currentPw);
  if (!ok) {
    throw new Error('বর্তমান পাসওয়ার্ড ভুল');
  }
  
  await SB.updatePassword(newPw);
}
