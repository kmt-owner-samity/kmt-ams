-- =====================================================================
-- ০২ — Tables & Indexes
-- কাজী মোশাররফ টাওয়ার ভবন মালিক সমিতি — Schema v3
-- এই ফাইল চালানোর আগে 01-extensions-types.sql চালান
-- =====================================================================

-- =====================================================================
-- ১) profiles — ব্যবহারকারী ও ভূমিকা
-- =====================================================================
create table profiles (
  id          uuid primary key,
  login_id    text,
  full_name   text not null,
  role        user_role not null default 'viewer',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);
create unique index profiles_login_id_key on profiles (lower(login_id)) where login_id is not null;

-- =====================================================================
-- ২) accounts — হিসাব (নগদ, ব্যাংক)
-- =====================================================================
create table accounts (
  id              smallint generated always as identity primary key,
  code            text not null unique,
  name            text not null,
  kind            account_kind not null,
  bank_name       text,
  branch          text,
  opening_balance numeric(14,2) not null default 0,
  is_active       boolean not null default true
);

-- =====================================================================
-- ৩) flats — ফ্ল্যাট ও মালিক
-- =====================================================================
create table flats (
  id          smallint generated always as identity primary key,
  flat_no     text not null unique,
  floor_no    smallint not null,
  owner_name  text not null,
  owner_phone text,
  is_active   boolean not null default true
);

-- =====================================================================
-- ৪) categories — খাত ও উপখাত
-- =====================================================================
create table categories (
  id                integer generated always as identity primary key,
  kind              txn_kind not null,
  name              text not null,
  parent_id         integer references categories(id),
  sort_order        smallint not null default 0,
  is_service_charge boolean not null default false,
  is_active         boolean not null default true
);
create unique index categories_uniq on categories (kind, coalesce(parent_id,0), name);

-- =====================================================================
-- ৫) service_charge_rates — সার্ভিস চার্জের মাসিক অঙ্ক
-- =====================================================================
create table service_charge_rates (
  id             integer generated always as identity primary key,
  flat_id        smallint not null references flats(id),
  monthly_amount numeric(14,2) check (monthly_amount is null or monthly_amount >= 0),
  effective_from date not null,
  created_by     uuid references profiles(id),
  created_at     timestamptz not null default now(),
  unique (flat_id, effective_from)
);

-- =====================================================================
-- ৬) doc_counters — ইনভয়েস/ভাউচার নম্বরের কাউন্টার
-- =====================================================================
create table doc_counters (
  kind    txn_kind not null,
  year    smallint not null,
  last_no integer  not null default 0,
  primary key (kind, year)
);

-- =====================================================================
-- ৭) transactions — আয়/ব্যয়ের লেনদেন
-- =====================================================================
create table transactions (
  id              uuid primary key default gen_random_uuid(),
  doc_no          text not null unique,
  kind            txn_kind not null,
  txn_date        date not null,
  category_id     integer  not null references categories(id),
  sub_category_id integer  not null references categories(id),
  account_id      smallint not null references accounts(id),
  amount          numeric(14,2) not null check (amount > 0),
  flat_id         smallint references flats(id),
  owner_name      text,
  note            text,
  created_by      uuid references profiles(id),
  created_at      timestamptz not null default now(),
  updated_by      uuid references profiles(id),
  updated_at      timestamptz,
  deleted_at      timestamptz,
  deleted_by      uuid references profiles(id)
);
create index on transactions (txn_date) where deleted_at is null;
create index on transactions (account_id, txn_date);
create index on transactions (flat_id);
create index on transactions (category_id, sub_category_id);

-- =====================================================================
-- ৮) service_charge_months — কোন কোন মাসের সার্ভিস চার্জ
-- =====================================================================
create table service_charge_months (
  transaction_id uuid not null references transactions(id) on delete cascade,
  month          date not null check (extract(day from month) = 1),
  primary key (transaction_id, month)
);
create index on service_charge_months (month);

-- =====================================================================
-- ৯) transfers — হিসাব থেকে হিসাবে ট্রান্সফার
-- =====================================================================
create table transfers (
  id              uuid primary key default gen_random_uuid(),
  transfer_date   date not null,
  from_account_id smallint not null references accounts(id),
  to_account_id   smallint not null references accounts(id),
  amount          numeric(14,2) not null check (amount > 0),
  note            text,
  created_by      uuid references profiles(id),
  created_at      timestamptz not null default now(),
  check (from_account_id <> to_account_id)
);

-- =====================================================================
-- ১০) audit_log — পরিবর্তনের অডিট
-- =====================================================================
create table audit_log (
  id         bigint generated always as identity primary key,
  table_name text not null,
  record_id  text not null,
  action     text not null,
  old_data   jsonb,
  new_data   jsonb,
  user_id    uuid,
  at         timestamptz not null default now()
);
create index on audit_log (at desc);
create index on audit_log (table_name, record_id);

-- =====================================================================
-- ১১) settings — সেটিংস (key-value)
-- =====================================================================
create table settings (key text primary key, value text not null);

-- =====================================================================
-- সম্পূর্ণ
-- =====================================================================
