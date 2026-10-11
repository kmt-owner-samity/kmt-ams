/* =====================================================================
   format.js — টাকা, escape, common formatting
   ===================================================================== */

/**
 * টাকার পরিমাণ → '৳ ১২,৩৪৫.৬৭'
 */
export function tk(n) {
  const v = +n || 0;
  return '৳ ' + v.toLocaleString('bn-BD', { maximumFractionDigits: 2 });
}

/**
 * সংখ্যা → '১২,৩৪৫.৬৭' (৳ ছাড়া)
 */
export function num(n) {
  const v = +n || 0;
  return v.toLocaleString('bn-BD', { maximumFractionDigits: 2 });
}

/**
 * HTML escape — XSS protection
 */
export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

/**
 * সংখ্যা abbreviated (হাজার/লক্ষ/কোটি)
 * 1250000 → '১২.৫ লক্ষ'
 */
export function shortNum(n) {
  const v = +n || 0;
  const abs = Math.abs(v);
  if (abs >= 1e7) return (v / 1e7).toFixed(2).replace(/\.00$/, '') + ' কোটি';
  if (abs >= 1e5) return (v / 1e5).toFixed(2).replace(/\.00$/, '') + ' লক্ষ';
  if (abs >= 1e3) return (v / 1e3).toFixed(1).replace(/\.0$/, '') + ' হাজার';
  return num(v);
}

/**
 * Percentage
 */
export function pct(n, total) {
  if (!total) return '০%';
  return num((n / total) * 100) + '%';
}

/**
 * টাকা → কথায় (বাংলা)
 * 1234.50 → 'এক হাজার দুইশত চৌত্রিশ টাকা পঞ্চাশ পয়সা মাত্র।'
 */

const WORDS = 'শূন্য এক দুই তিন চার পাঁচ ছয় সাত আট নয় দশ এগার বার তের চৌদ্দ পনের ষোল সতের আঠার উনিশ বিশ একুশ বাইশ তেইশ চব্বিশ পঁচিশ ছাব্বিশ সাতাশ আটাশ ঊনত্রিশ ত্রিশ একত্রিশ বত্রিশ তেত্রিশ চৌত্রিশ পঁয়ত্রিশ ছত্রিশ সাঁইত্রিশ আটত্রিশ ঊনচল্লিশ চল্লিশ একচল্লিশ বিয়াল্লিশ তেতাল্লিশ চুয়াল্লিশ পঁয়তাল্লিশ ছেচল্লিশ সাতচল্লিশ আটচল্লিশ ঊনপঞ্চাশ পঞ্চাশ একান্ন বাহান্ন তিপ্পান্ন চুয়ান্ন পঞ্চান্ন ছাপ্পান্ন সাতান্ন আটান্ন ঊনষাট ষাট একষট্টি বাষট্টি তেষট্টি চৌষট্টি পঁয়ষট্টি ছিষট্টি সাতষট্টি আটষট্টি ঊনসত্তর সত্তর একাত্তর বাহাত্তর তিয়াত্তর চুয়াত্তর পঁচাত্তর ছিয়াত্তর সাতাত্তর আটাত্তর ঊনআশি আশি একাশি বিরাশি তিরাশি চুরাশি পঁচাশি ছিয়াশি সাতাশি অষ্টাশি ঊননব্বই নব্বই একানব্বই বিরানব্বই তিরানব্বই চুরানব্বই পঁচানব্বই ছিয়ানব্বই সাতানব্বই আটানব্বই নিরানব্বই'.split(' ');

function words(n) {
  if (n === 0) return WORDS[0];
  const parts = [];
  const crore = Math.floor(n / 1e7); n %= 1e7;
  const lakh = Math.floor(n / 1e5); n %= 1e5;
  const thousand = Math.floor(n / 1e3); n %= 1e3;
  const hundred = Math.floor(n / 100); n %= 100;
  if (crore) parts.push(words(crore) + ' কোটি');
  if (lakh) parts.push(WORDS[lakh] + ' লক্ষ');
  if (thousand) parts.push(WORDS[thousand] + ' হাজার');
  if (hundred) parts.push(WORDS[hundred] + ' শত');
  if (n) parts.push(WORDS[n]);
  return parts.join(' ');
}

export function inWords(amount) {
  const v = +amount || 0;
  const whole = Math.floor(v);
  const paisa = Math.round((v - whole) * 100);
  let s = words(whole) + ' টাকা';
  if (paisa) s += ' ' + WORDS[paisa] + ' পয়সা';
  return s + ' মাত্র।';
}
