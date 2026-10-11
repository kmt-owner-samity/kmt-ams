/* =====================================================================
   bn.js — বাংলা সংখ্যা, তারিখ, মাস
   ===================================================================== */

import { MONTHS_BN, MONTHS_EN_SHORT } from '../config.js';

/* বাংলা অঙ্ক */
const BN_DIGITS = '০১২৩৪৫৬৭৮৯';

/**
 * ইংরেজি সংখ্যা → বাংলা সংখ্যা
 * 1234 → ১২৩৪
 */
export function bd(n) {
  return String(n ?? '').replace(/\d/g, d => BN_DIGITS[d]);
}

/**
 * বাংলা সংখ্যা → ইংরেজি সংখ্যা
 */
export function en(s) {
  return String(s ?? '').replace(/[০-৯]/g, c => BN_DIGITS.indexOf(c));
}

/**
 * তারিখ → বাংলা ফরম্যাট (দিন-মাস-বছর)
 * '2026-10-11' → '১১-১০-২৬ ইং'
 */
export function bnDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return bd(`${d}-${m}-${y.slice(2)}`) + ' ইং';
}

/**
 * তারিখ → বাংলা ফরম্যাট (দিন মাসবাংলানাম বছর)
 * '2026-10-11' → '১১ অক্টোবর ২০২৬'
 */
export function bnDateLong(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${bd(d)} ${MONTHS_BN[+m - 1]} ${bd(y)}`;
}

/**
 * মাসের নাম + বছর বাংলায়
 * '2026-10' → 'অক্টোবর ২০২৬'
 */
export function bnMonth(ym) {
  if (!ym) return '';
  const [y, m] = ym.split('-');
  return `${MONTHS_BN[+m - 1]} ${bd(y)}`;
}

/**
 * মাসের নাম ইংরেজি short + বছর ২ অঙ্কে
 * '2026-10' → 'Oct-26'
 */
export function ymEn(ym) {
  if (!ym) return '';
  return MONTHS_EN_SHORT[+ym.slice(5) - 1] + '-' + ym.slice(2, 4);
}

/**
 * আজকের তারিখ → 'YYYY-MM-DD'
 */
export function todayISO() {
  const d = new Date();
  const z = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

/**
 * বর্তমান মাস → 'YYYY-MM'
 */
export function currentYM() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * আগের মাস → 'YYYY-MM'
 */
export function prevYM(ym) {
  if (!ym) ym = currentYM();
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * মাস কমানো/বাড়ানো
 * shiftYM('2026-10', -3) → '2026-07'
 */
export function shiftYM(ym, delta) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * 'DD/MM/YYYY' → 'YYYY-MM-DD' (ISO)
 * ভুল হলে empty string
 */
export function parseDMY(v) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(v).trim());
  if (!m) return '';
  const [, d, mo, y] = m;
  const dt = new Date(+y, +mo - 1, +d);
  return dt.getFullYear() == y && dt.getMonth() == mo - 1 && dt.getDate() == d
    ? `${y}-${mo}-${d}`
    : '';
}

/**
 * 'YYYY-MM-DD' → 'DD/MM/YYYY'
 */
export function toDMY(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
