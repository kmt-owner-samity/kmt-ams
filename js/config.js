/* =====================================================================
   config.js — Static configuration
   কাজী মোশাররফ টাওয়ার ভবন মালিক সমিতি
   ===================================================================== */

export const APP_CONFIG = {
  // App info
  APP_NAME: 'কাজী মোশাররফ টাওয়ার ভবন মালিক সমিতি',
  APP_SHORT: 'KMT হিসাব',
  APP_SUB: 'অ্যাকাউন্টিং ম্যানেজমেন্ট সিস্টেম',
  
  // Splash timing
  SPLASH_MIN_MS: 2200,
  
  // Session
  SESSION_DAYS: 7,         // 7 days auto-logout
  REMEMBER_KEY: 'kmt_last_user',
  
  // Storage keys
  STORAGE: {
    SESSION: 'kmt_sess_v3',
    LAST_USER: 'kmt_last_user_v3',
  },
  
  // Date/Time
  LOCALE: 'bn-BD',
  
  // Defaults (used if DB not yet loaded)
  FALLBACK_ORG: {
    name: 'কাজী মোশাররফ টাওয়ার ভবন মালিক সমিতি',
    address: 'বাসা নং ৩/৪, ব্লক-এ, আসাদ এভিনিউ, ঢাকা-১২০৭',
  },
};

// Bengali month names
export const MONTHS_BN = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

// Bengali month short (for reports)
export const MONTHS_BN_SHORT = [
  'জানু', 'ফেব', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগ', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'
];

// English month short (for invoice numbers)
export const MONTHS_EN_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

// Role display names
export const ROLE_BN = {
  admin: 'অ্যাডমিন',
  accountant: 'হিসাবরক্ষক',
  viewer: 'দর্শক',
};

// Role badge colors (CSS class names)
export const ROLE_CLASS = {
  admin: 'admin',
  accountant: 'accountant',
  viewer: 'viewer',
};
