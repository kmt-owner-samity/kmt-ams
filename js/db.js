/* =====================================================================
   db.js — Supabase ডাটা লেয়ার (REST + Auth)
   কাজী মোশাররফ টাওয়ার ভবন মালিক সমিতি
   
   DB.list/add/update/remove — সব Supabase কল করে
   SB.loginByUsername — username দিয়ে login (নতুন)
   ===================================================================== */

const NET_MSG = 'ডাটাবেজে সমস্যা হয়েছে, অ্যাডমিনের সাথে যোগাযোগ করুন';
const PAUSE_MSG = 'ডাটাবেজে সমস্যা হয়েছে, অ্যাডমিনের সাথে যোগাযোগ করুন';

class DbError extends Error {
  constructor(m, status) {
    super(m);
    this.status = status || 0;
  }
}

const SB = {
  url: (typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : '').replace(/\/+$/, ''),
  key: typeof SUPABASE_KEY !== 'undefined' ? SUPABASE_KEY : '',
  sess: null,
  profile: null,
  _refreshPromise: null,

  configured() {
    return !!this.url && !!this.key && !/YOUR/.test(this.url + this.key);
  },

  uid() {
    const s = this.sess;
    if (!s) return null;
    if (s.user && s.user.id) return s.user.id;
    try {
      return JSON.parse(atob(s.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).sub;
    } catch (e) {
      return null;
    }
  },

  async raw(path, o = {}) {
    const h = {
      apikey: this.key,
      'Content-Type': 'application/json',
      ...(o.headers || {}),
    };
    const tok = this.sess && this.sess.access_token;
    if (tok) h.Authorization = 'Bearer ' + tok;
    else if (this.key.startsWith('eyJ')) h.Authorization = 'Bearer ' + this.key;

    try {
      return await fetch(this.url + path, {
        method: o.method || 'GET',
        headers: h,
        body: o.body === undefined ? undefined : JSON.stringify(o.body),
      });
    } catch (e) {
      throw new DbError(NET_MSG);
    }
  },

  async err(r) {
    let j = {};
    try { j = await r.json(); } catch (e) {}
    const m = j.message || j.msg || j.error_description || j.error || r.statusText || ('HTTP ' + r.status);

    if (r.status === 401 || j.code === 'PGRST301' || j.code === 'PGRST303') {
      return new DbError('লগইনের মেয়াদ শেষ হয়েছে, আবার লগইন করুন', 401);
    }
    if (r.status === 403 || j.code === '42501') {
      return new DbError(/অনুমতি|অ্যাডমিন/.test(m) ? m : 'এই কাজের অনুমতি নেই', 403);
    }
    if ([502, 503, 504, 520, 521, 522, 523, 524, 540].includes(r.status)) {
      return new DbError(PAUSE_MSG, r.status);
    }
    return new DbError(m, r.status);
  },

  async req(path, o = {}) {
    let r = await this.raw(path, o);
    if (r.status === 401 && this.sess && this.sess.refresh_token && !o._retry && await this.refresh()) {
      r = await this.raw(path, { ...o, _retry: 1 });
    }
    if (!r.ok) throw await this.err(r);
    const t = await r.text();
    return t ? JSON.parse(t) : null;
  },

  setSess(s) {
    const prevUser = this.sess && this.sess.user;
    this.sess = s;
    try {
      localStorage.setItem('kmt_sess', JSON.stringify({
        access_token: s.access_token,
        refresh_token: s.refresh_token,
        user: s.user ? { id: s.user.id, email: s.user.email } : (prevUser || null),
      }));
    } catch (e) {}
  },

  clear() {
    this.sess = null;
    this.profile = null;
    try { localStorage.removeItem('kmt_sess'); } catch (e) {}
  },

  /* ---- Email + Password login (internal) ---- */
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

  /* ---- Username → Email রূপান্তর (নতুন) ---- */
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

  /* ---- Username দিয়ে Login (নতুন) ---- */
  async loginByUsername(username, password) {
    const email = await this.emailFromUsername(username);
    if (!email) throw new DbError('ভুল ইউজারনেম বা পাসওয়ার্ড', 400);
    return await this.login(email, password);
  },

  /* ---- Race-safe refresh ---- */
  async refresh() {
    if (this._refreshPromise) return this._refreshPromise;

    this._refreshPromise = (async () => {
      try {
        const rt = this.sess && this.sess.refresh_token;
        if (!rt) return false;
        let r;
        try {
          r = await this.raw('/auth/v1/token?grant_type=refresh_token', {
            method: 'POST',
            body: { refresh_token: rt },
          });
        } catch (e) {
          return false;
        }
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

  async restore() {
    try {
      this.sess = JSON.parse(localStorage.getItem('kmt_sess'));
    } catch (e) {
      this.sess = null;
    }
    if (!this.sess || !this.sess.access_token) return false;
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

async loadProfile() {
  const p = await this.req('/rest/v1/profiles?id=eq.' + this.uid() + '&select=login_id,full_name,role,is_active');
  if (!p || !p[0] || !p[0].is_active) {
    throw new DbError('এই অ্যাকাউন্টে এখনও কোনো ভূমিকা (role) দেওয়া হয়নি। অ্যাডমিনকে জানান।', 403);
  }
  this.profile = p[0];
  // Email from session
  if (this.sess && this.sess.user && this.sess.user.email) {
    this.profile.email = this.sess.user.email;
  }
},

  async logout() {
    try { await this.raw('/auth/v1/logout', { method: 'POST', body: {} }); } catch (e) {}
    this.clear();
  },

   async rpc(name, body) {
    return await this.req('/rest/v1/rpc/' + name, { method: 'POST', body });
  },

  async verify(pw) {
    const email = this.sess && this.sess.user && this.sess.user.email;
    if (!email) return false;
    const r = await this.raw('/auth/v1/token?grant_type=password', {
      method: 'POST',
      body: { email, password: pw },
    });
    if (r.ok) return true;
    if (r.status === 400) return false;
    throw await this.err(r);
  },

  async updatePassword(pw) {
    await this.req('/auth/v1/user', { method: 'PUT', body: { password: pw } });
  },

  /* ---- Admin: user management (নতুন) ---- */
  async adminUserCreate({ email, password, login_id, full_name, role }) {
    return await this.req('/rest/v1/rpc/admin_user_create', {
      method: 'POST',
      body: {
        p_email: email,
        p_password: password,
        p_login_id: login_id,
        p_full_name: full_name,
        p_role: role,
      },
    });
  },

  async adminUserUpdate(id, full_name, role, is_active) {
    return await this.req('/rest/v1/rpc/admin_user_update', {
      method: 'POST',
      body: {
        p_id: id,
        p_full_name: full_name,
        p_role: role,
        p_is_active: is_active,
      },
    });
  },

  async adminUserResetPassword(id, new_password) {
    return await this.req('/rest/v1/rpc/admin_user_reset_password', {
      method: 'POST',
      body: { p_id: id, p_new_password: new_password },
    });
  },

async adminUserList() {
  return await this.req('/rest/v1/rpc/admin_user_list', { method: 'POST', body: {} });
},
};

/* =====================================================================
   DB — Data Layer
   ===================================================================== */
const DB = {
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

  async loadRef() {
    const [acc, cat, fl, st, rt] = await Promise.all([
      SB.req('/rest/v1/accounts?select=id,code,name,kind,opening_balance&order=id'),
      SB.req('/rest/v1/categories?select=id,kind,name,parent_id,is_service_charge&is_active=eq.true'),
      SB.req('/rest/v1/flats?select=id,flat_no,owner_name&is_active=eq.true'),
      SB.req('/rest/v1/settings?select=key,value'),
      SB.req('/rest/v1/service_charge_rates?select=flat_id,monthly_amount,effective_from&order=effective_from.desc'),
    ]);

    this.accId = {};
    this.accCode = {};
    this.op = { cash: 0, nbl: 0, pbl: 0 };
    acc.forEach(a => {
      this.accId[a.id] = a;
      this.accCode[a.code] = a;
      this.op[a.code] = +a.opening_balance || 0;
    });

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

    this.flatId = {};
    this.flatNo = {};
    fl.forEach(f => {
      this.flatId[f.flat_no] = f.id;
      this.flatNo[f.id] = f.flat_no;
    });

    const d = st.find(x => x.key === 'sc_default');
    const per = {};
    const seen = {};
    rt.forEach(r => {
      if (seen[r.flat_id]) return;
      seen[r.flat_id] = 1;
      if (r.monthly_amount !== null && this.flatNo[r.flat_id]) {
        per[this.flatNo[r.flat_id]] = +r.monthly_amount;
      }
    });
    this.scc = { def: d ? +d.value || 0 : 0, per };
  },

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

  async load() {
    const tx = await this.page('/rest/v1/transactions?select=id,doc_no,kind,txn_date,category_id,sub_category_id,account_id,amount,flat_id,owner_name,note,service_charge_months(month)&deleted_at=is.null&order=txn_date.asc,created_at.asc');
    const tr = await this.page('/rest/v1/transfers?select=id,transfer_date,from_account_id,to_account_id,amount,note&order=transfer_date.asc,created_at.asc');

    const L = tx.map(r => ({
      id: r.id,
      no: r.doc_no,
      type: r.kind,
      date: r.txn_date,
      group: this.catName[r.category_id] || '?',
      item: this.catName[r.sub_category_id] || '?',
      acct: (this.accId[r.account_id] || {}).code || 'cash',
      amount: +r.amount,
      note: r.note || '',
      flat: r.flat_id ? (this.flatNo[r.flat_id] || '') : '',
      owner: r.owner_name || '',
      smonths: (r.service_charge_months || []).map(m => m.month.slice(0, 7)).sort(),
    }));

    tr.forEach(r => {
      const f = (this.accId[r.from_account_id] || {}).code;
      const t = (this.accId[r.to_account_id] || {}).code;
      L.push({
        id: r.id,
        no: '',
        type: 'transfer',
        date: r.transfer_date,
        amount: +r.amount,
        note: r.note || '',
        group: 'ট্রান্সফার',
        item: AN(f) + ' → ' + AN(t),
        from: f,
        to: t,
        acct: f,
      });
    });

    this.all = L;
  },

  async list() {
    return this.all;
  },

  txArgs(t) {
    const cat = this.catTop[t.type + '|' + t.group];
    const sub = cat && this.catSub[cat + '|' + t.item];
    if (!cat || !sub) throw new DbError('খাত "' + t.group + ' / ' + t.item + '" ডাটাবেজে পাওয়া যায়নি — seed.sql চালানো হয়েছে কি?');
    const a = this.accCode[t.acct];
    if (!a) throw new DbError('হিসাব "' + t.acct + '" ডাটাবেজে নেই।');
    if (t.flat && !this.flatId[t.flat]) throw new DbError('ফ্ল্যাট "' + t.flat + '" ডাটাবেজে নেই।');
    return {
      p_date: t.date,
      p_cat: cat,
      p_sub: sub,
      p_acct: a.id,
      p_amount: t.amount,
      p_flat: t.flat ? this.flatId[t.flat] : null,
      p_owner: t.owner || null,
      p_note: t.note || null,
      p_months: t.smonths && t.smonths.length ? t.smonths.map(m => m + '-01') : null,
    };
  },

  async rpc(name, body) {
    return SB.req('/rest/v1/rpc/' + name, { method: 'POST', body });
  },

  async addTransfer(t) {
    const f = this.accCode[t.from];
    const to = this.accCode[t.to];
    await this.rpc('add_transfer', {
      p_date: t.date,
      p_from: f.id,
      p_to: to.id,
      p_amount: t.amount,
      p_note: t.note || null,
    });
  },

  async add(t) {
    let r = null;
    if (t.type === 'transfer') await this.addTransfer(t);
    else r = await this.rpc('add_txn', { p_kind: t.type, ...this.txArgs(t) });
    await this.load();
    return r;
  },

  async update(t) {
    await this.rpc('update_txn', {
      p_id: t.id,
      ...(({ p_date, p_cat, p_sub, p_acct, p_amount, p_flat, p_owner, p_note, p_months }) =>
        ({ p_date, p_cat, p_sub, p_acct, p_amount, p_flat, p_owner, p_note, p_months })
      )(this.txArgs(t)),
    });
    await this.load();
    return true;
  },

  async remove(id) {
    await this.rpc('delete_txn', { p_id: id });
    await this.load();
    return 1;
  },

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
      if (!r || !r.length) {
        throw new DbError('প্রারম্ভিক জের বদলানোর অনুমতি নেই (শুধু অ্যাডমিন পারেন)।', 403);
      }
    }
    await this.loadRef();
  },

  async sc() {
    return { def: this.scc.def, per: { ...this.scc.per } };
  },

  async setSc(o) {
    let r = await SB.req('/rest/v1/settings?on_conflict=key', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: [{ key: 'sc_default', value: String(+o.def || 0) }],
    });
    if (!r || !r.length) {
      throw new DbError('সার্ভিস চার্জ সেটআপের অনুমতি নেই (শুধু অ্যাডমিন)।', 403);
    }
    const d = new Date();
    const eff = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-01';
    const rows = [];
    FLATS.forEach(x => {
      const nv = o.per[x.f];
      const ov = this.scc.per[x.f];
      if (nv !== ov) rows.push({
        flat_id: this.flatId[x.f],
        monthly_amount: nv === undefined ? null : +nv,
        effective_from: eff,
        created_by: SB.uid(),
      });
    });
    if (rows.length) {
      r = await SB.req('/rest/v1/service_charge_rates?on_conflict=flat_id,effective_from', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        body: rows,
      });
      if (!r || r.length !== rows.length) {
        throw new DbError('সার্ভিস চার্জের অঙ্ক সংরক্ষণ হয়নি (অনুমতি নেই?)।', 403);
      }
    }
    await this.loadRef();
  },

  /* ---- Legacy localStorage import ---- */
  legacyCount() {
    try {
      return (JSON.parse(localStorage.getItem('kmt_tx')) || []).length;
    } catch (e) {
      return 0;
    }
  },

  async importLegacy(prog) {
    const g = k => {
      try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; }
    };
    const tx = (g('kmt_tx') || []).slice().sort((a, b) => a.date.localeCompare(b.date) || String(a.no).localeCompare(String(b.no)));
    const op = g('kmt_open3');
    const sc = g('kmt_sc');
    let ok = 0;
    const fail = [];

    if (op) await this.setOpening(op);
    if (sc) await this.setSc({ def: +sc.def || 0, per: sc.per || {} });

    for (let i = 0; i < tx.length; i++) {
      const t = tx[i];
      try {
        if (t.type === 'transfer') {
          await this.addTransfer({ date: t.date, amount: t.amount, note: t.note, from: t.from, to: t.to });
        } else {
          const rec = {
            ...t,
            group: GR[t.group] || t.group,
            acct: t.acct || 'cash',
            owner: t.owner || (t.flat ? ownerOf(t.flat) : ''),
            smonths: t.smonths || (t.smonth ? [t.smonth] : []),
          };
          await this.rpc('add_txn', { p_kind: t.type, ...this.txArgs(rec), p_doc_no: t.no || null });
        }
        ok++;
      } catch (e) {
        fail.push((t.no || t.date) + ' — ' + e.message);
      }
      if (prog) prog(i + 1, tx.length);
    }
    await this.reload();
    return { ok, fail };
  },

  clearLegacy() {
    ['kmt_tx', 'kmt_open3', 'kmt_open', 'kmt_sc', 'kmt_adm'].forEach(k => localStorage.removeItem(k));
  },
};
