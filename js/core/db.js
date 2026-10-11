/* =====================================================================
   db.js — Supabase Data Layer
   কাজী মোশাররফ টাওয়ার ভবন মালিক সমিতি
   ===================================================================== */

import { SUPABASE_URL, SUPABASE_KEY } from '../supabase-config.js';
import { APP_CONFIG } from '../config.js';

/* ============ Error Classes ============ */
export class DbError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.status = status;
  }
}

const ERR_NET = 'ডাটাবেজে সমস্যা হয়েছে, অ্যাডমিনের সাথে যোগাযোগ করুন';
const ERR_PAUSE = 'ডাটাবেজে সমস্যা হয়েছে, অ্যাডমিনের সাথে যোগাযোগ করুন';

/* =====================================================================
   SB — Supabase Auth + REST wrapper
   ===================================================================== */
export const SB = {
  url: (SUPABASE_URL || '').replace(/\/+$/, ''),
  key: SUPABASE_KEY || '',
  sess: null,
  profile: null,
  _refreshPromise: null,
  
  configured() {
    return !!this.url && !!this.key && !/YOUR/.test(this.url + this.key);
  },
  
  uid() {
    const s = this.sess;
    if (!s) return null;
    if (s.user?.id) return s.user.id;
    try {
      const payload = JSON.parse(atob(s.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      return payload.sub;
    } catch {
      return null;
    }
  },
  
  /* ---- Low-level fetch ---- */
  async raw(path, o = {}) {
    const headers = {
      apikey: this.key,
      'Content-Type': 'application/json',
      ...(o.headers || {}),
    };
    const token = this.sess?.access_token;
    if (token) headers.Authorization = 'Bearer ' + token;
    else if (this.key.startsWith('eyJ')) headers.Authorization = 'Bearer ' + this.key;
    
    try {
      return await fetch(this.url + path, {
        method: o.method || 'GET',
        headers,
        body: o.body === undefined ? undefined : JSON.stringify(o.body),
      });
    } catch {
      throw new DbError(ERR_NET);
    }
  },
  
  /* ---- Error mapping ---- */
  async err(r) {
    let j = {};
    try { j = await r.json(); } catch {}
    const m = j.message || j.msg || j.error_description || j.error || r.statusText || ('HTTP ' + r.status);
    
    if (r.status === 401 || j.code === 'PGRST301' || j.code === 'PGRST303') {
      return new DbError('লগইনের মেয়াদ শেষ হয়েছে, আবার লগইন করুন', 401);
    }
    if (r.status === 403 || j.code === '42501') {
      return new DbError(/অনুমতি|অ্যাডমিন/.test(m) ? m : 'এই কাজের অনুমতি নেই', 403);
    }
    if ([502, 503, 504, 520, 521, 522, 523, 524, 540].includes(r.status)) {
      return new DbError(ERR_PAUSE, r.status);
    }
    return new DbError(m, r.status);
  },
  
  /* ---- Wrapper with auto-refresh ---- */
  async req(path, o = {}) {
    let r = await this.raw(path, o);
    if (r.status === 401 && this.sess?.refresh_token && !o._retry) {
      const ok = await this.refresh();
      if (ok) r = await this.raw(path, { ...o, _retry: 1 });
    }
    if (!r.ok) throw await this.err(r);
    const t = await r.text();
    return t ? JSON.parse(t) : null;
  },
  
  /* ---- Session management ---- */
  setSess(s) {
    const prevUser = this.sess?.user;
    this.sess = s;
    const user = s.user ? { id: s.user.id, email: s.user.email } : (prevUser || null);
    try {
      localStorage.setItem(APP_CONFIG.STORAGE.SESSION, JSON.stringify({
        access_token: s.access_token,
        refresh_token: s.refresh_token,
        user,
      }));
    } catch {}
  },
  
  clear() {
    this.sess = null;
    this.profile = null;
    try { localStorage.removeItem(APP_CONFIG.STORAGE.SESSION); } catch {}
  },
  
  /* ---- Login with email + pw (internal) ---- */
  async login(email, pw) {
    const r = await this.raw('/auth/v1/token?grant_type=password', {
      method: 'POST',
      body: { email: email.trim(), password: pw },
    });
    if (!r.ok) {
      if (r.status === 400) throw new DbError('ভুল ইউজারনেম বা পাসওয়ার্ড', 400);
      throw await this.err(r);
    }
    this.setSess(await r.json());
    await this.loadProfile();
  },
  
  /* ---- Login with username (external API) ---- */
  async emailFromUsername(username) {
    const r = await fetch(this.url + '/rest/v1/rpc/login_email_for', {
      method: 'POST',
      headers: { apikey: this.key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_login_id: username.trim() }),
    });
    if (!r.ok) return null;
    const t = await r.text();
    return t ? JSON.parse(t) : null;
  },
  
  async loginByUsername(username, password) {
    const email = await this.emailFromUsername(username);
    if (!email) throw new DbError('ভুল ইউজারনেম বা পাসওয়ার্ড', 400);
    return await this.login(email, password);
  },
  
  /* ---- Token refresh (race-safe) ---- */
  async refresh() {
    if (this._refreshPromise) return this._refreshPromise;
    
    this._refreshPromise = (async () => {
      try {
        const rt = this.sess?.refresh_token;
        if (!rt) return false;
        let r;
        try {
          r = await this.raw('/auth/v1/token?grant_type=refresh_token', {
            method: 'POST',
            body: { refresh_token: rt },
          });
        } catch { return false; }
        if (!r.ok) { this.clear(); return false; }
        const j = await r.json();
        if (!j.user) j.user = this.sess.user;
        this.setSess(j);
        return true;
      } finally {
        this._refreshPromise = null;
      }
    })();
    
    return this._refreshPromise;
  },
  
  /* ---- Restore session ---- */
  async restore() {
    try {
      this.sess = JSON.parse(localStorage.getItem(APP_CONFIG.STORAGE.SESSION));
    } catch {
      this.sess = null;
    }
    if (!this.sess?.access_token) return false;
    try {
      await this.loadProfile();
      return true;
    } catch (e) {
      if (e.status === 401 || e.status === 403) {
        this.clear();
        return false;
      }
      throw e;
    }
  },
  
  /* ---- Profile ---- */
  async loadProfile() {
    const p = await this.req(
      '/rest/v1/profiles?id=eq.' + this.uid() + '&select=full_name,role,is_active'
    );
    if (!p?.[0] || !p[0].is_active) {
      throw new DbError('এই অ্যাকাউন্টে এখনও কোনো ভূমিকা দেওয়া হয়নি। অ্যাডমিনকে জানান।', 403);
    }
    this.profile = p[0];
  },
  
  /* ---- Logout ---- */
  async logout() {
    try { await this.raw('/auth/v1/logout', { method: 'POST', body: {} }); } catch {}
    this.clear();
  },
  
  /* ---- Verify password (for sensitive operations) ---- */
  async verify(pw) {
    const email = this.sess?.user?.email;
    if (!email) return false;
    const r = await this.raw('/auth/v1/token?grant_type=password', {
      method: 'POST',
      body: { email, password: pw },
    });
    if (r.ok) return true;
    if (r.status === 400) return false;
    throw await this.err(r);
  },
  
  /* ---- Change own password ---- */
  async updatePassword(pw) {
    await this.req('/auth/v1/user', { method: 'PUT', body: { password: pw } });
  },
  
  /* ---- Ping (keepalive) ---- */
  async ping() {
    return await this.req('/rest/v1/rpc/ping', { method: 'POST', body: {} });
  },
};

/* =====================================================================
   DB — Application Data Layer
   ===================================================================== */
export const DB = {
  all: [],
  accId: {},
  accCode: {},
  catTop: {},
  catSub: {},
  catName: {},
  scCatId: null,
  flatId: {},
  flatNo: {},
  op: { cash: 0, nbl: 0, pbl: 0 },
  scc: { def: 0, per: {} },
  
  async init() {
    await this.loadRef();
    await this.load();
  },
  
  async reload() {
    await this.loadRef();
    await this.load();
  },
  
  /* ---- Load reference data (accounts, categories, flats, settings) ---- */
  async loadRef() {
    const [acc, cat, fl, st, rt] = await Promise.all([
      SB.req('/rest/v1/accounts?select=id,code,name,kind,opening_balance&order=id'),
      SB.req('/rest/v1/categories?select=id,kind,name,parent_id,is_service_charge&is_active=eq.true'),
      SB.req('/rest/v1/flats?select=id,flat_no,owner_name&is_active=eq.true'),
      SB.req('/rest/v1/settings?select=key,value'),
      SB.req('/rest/v1/service_charge_rates?select=flat_id,monthly_amount,effective_from&order=effective_from.desc'),
    ]);
    
    // Accounts
    this.accId = {};
    this.accCode = {};
    this.op = { cash: 0, nbl: 0, pbl: 0 };
    acc.forEach(a => {
      this.accId[a.id] = a;
      this.accCode[a.code] = a;
      this.op[a.code] = +a.opening_balance || 0;
    });
    
    // Categories
    this.catTop = {};
    this.catSub = {};
    this.catName = {};
    this.scCatId = null;
    cat.forEach(c => {
      this.catName[c.id] = c.name;
      if (!c.parent_id) {
        this.catTop[c.kind + '|' + c.name] = c.id;
        if (c.is_service_charge) this.scCatId = c.id;
      }
    });
    cat.forEach(c => {
      if (c.parent_id) this.catSub[c.parent_id + '|' + c.name] = c.id;
    });
    
    // Flats
    this.flatId = {};
    this.flatNo = {};
    fl.forEach(f => {
      this.flatId[f.flat_no] = f.id;
      this.flatNo[f.id] = f.flat_no;
    });
    
    // Settings
    const scDef = st.find(x => x.key === 'sc_default');
    
    // Service charge rates (latest per flat)
    const per = {};
    const seen = {};
    rt.forEach(r => {
      if (seen[r.flat_id]) return;
      seen[r.flat_id] = 1;
      if (r.monthly_amount !== null && this.flatNo[r.flat_id]) {
        per[this.flatNo[r.flat_id]] = +r.monthly_amount;
      }
    });
    
    this.scc = { def: scDef ? +scDef.value || 0 : 0, per };
  },
  
  /* ---- Pagination helper ---- */
  async page(path) {
    const out = [];
    for (let from = 0; ; from += 1000) {
      const p = await SB.req(path, {
        headers: { 'Range-Unit': 'items', Range: from + '-' + (from + 999) },
      });
      out.push(...p);
      if (p.length < 1000) break;
    }
    return out;
  },
  
  /* ---- Load transactions + transfers ---- */
  async load() {
    const tx = await this.page(
      '/rest/v1/transactions?select=id,doc_no,kind,txn_date,category_id,sub_category_id,account_id,amount,flat_id,owner_name,note,service_charge_months(month)&deleted_at=is.null&order=txn_date.asc,created_at.asc'
    );
    const tr = await this.page(
      '/rest/v1/transfers?select=id,transfer_date,from_account_id,to_account_id,amount,note&order=transfer_date.asc,created_at.asc'
    );
    
    const list = tx.map(r => ({
      id: r.id,
      no: r.doc_no,
      type: r.kind,
      date: r.txn_date,
      group: this.catName[r.category_id] || '?',
      item: this.catName[r.sub_category_id] || '?',
      acct: this.accId[r.account_id]?.code || 'cash',
      amount: +r.amount,
      note: r.note || '',
      flat: r.flat_id ? this.flatNo[r.flat_id] || '' : '',
      owner: r.owner_name || '',
      smonths: (r.service_charge_months || []).map(m => m.month.slice(0, 7)).sort(),
    }));
    
    tr.forEach(r => {
      const from = this.accId[r.from_account_id]?.code;
      const to = this.accId[r.to_account_id]?.code;
      list.push({
        id: r.id,
        no: '',
        type: 'transfer',
        date: r.transfer_date,
        amount: +r.amount,
        note: r.note || '',
        group: 'ট্রান্সফার',
        item: (this.accCode[from]?.name || from) + ' → ' + (this.accCode[to]?.name || to),
        from,
        to,
        acct: from,
      });
    });
    
    this.all = list;
  },
  
  /* ---- List (cache) ---- */
  async list() {
    return this.all;
  },
  
  /* ---- Opening balances ---- */
  async opening() {
    return { ...this.op };
  },
  
  async setOpening(o) {
    for (const k of ['cash', 'nbl', 'pbl']) {
      const r = await SB.req('/rest/v1/accounts?code=eq.' + k, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: { opening_balance: +o[k] || 0 },
      });
      if (!r?.length) {
        throw new DbError('প্রারম্ভিক জের বদলানোর অনুমতি নেই (শুধু অ্যাডমিন)', 403);
      }
    }
    await this.loadRef();
  },
  
  /* ---- Service charge config ---- */
  async sc() {
    return { def: this.scc.def, per: { ...this.scc.per } };
  },
  
  /* ---- RPC helper ---- */
  async rpc(name, body) {
    return SB.req('/rest/v1/rpc/' + name, { method: 'POST', body });
  },
};

/* ---- For debugging in console ---- */
if (typeof window !== 'undefined') {
  window.__DB = DB;
  window.__SB = SB;
}
