-- =====================================================================
-- কাজী মোশাররফ টাওয়ার ভবন মালিক সমিতি — Supabase Schema v3
-- চালান: Supabase Dashboard → SQL Editor → New query → পুরোটা পেস্ট → Run
-- =====================================================================

-- Required extensions
create extension if not exists pgcrypto;

-- =====================================================================
-- ENUM Types
-- =====================================================================
create type user_role    as enum ('admin','accountant','viewer');
create type txn_kind     as enum ('income','expense');
create type account_kind as enum ('cash','bank');

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
-- ২) accounts — হিসাব
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
-- ১০) audit_log + settings
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

create table settings (key text primary key, value text not null);

-- =====================================================================
-- সহায়ক ফাংশন — Role check
-- =====================================================================
create or replace function my_role() returns user_role
language sql stable security definer set search_path = public as
$$ select role from profiles where id = auth.uid() and is_active $$;

create or replace function can_write() returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce(my_role() in ('admin','accountant'), false) $$;

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce(my_role() = 'admin', false) $$;

-- =====================================================================
-- next_doc_no — Race-safe invoice numbering
-- =====================================================================
create or replace function next_doc_no(p_kind txn_kind, p_date date) returns text
language plpgsql security definer set search_path = public as $$
declare y smallint := extract(year from p_date); n integer;
begin
  insert into doc_counters(kind, year, last_no) values (p_kind, y, 1)
  on conflict (kind, year) do update set last_no = doc_counters.last_no + 1
  returning last_no into n;
  return (case p_kind when 'income' then 'আয়' else 'ব্যয়' end) || '-' || y || '-' || lpad(n::text, 4, '0');
end $$;

-- =====================================================================
-- add_txn — লেনদেন যোগ (নম্বর RPC-তে তৈরি)
-- =====================================================================
create or replace function add_txn(
  p_kind txn_kind, p_date date, p_cat integer, p_sub integer, p_acct smallint, p_amount numeric,
  p_flat smallint default null, p_owner text default null, p_note text default null,
  p_months date[] default null, p_doc_no text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_no text; v_id uuid; v_sc boolean;
begin
  if not can_write() then raise exception 'এই কাজের অনুমতি নেই' using errcode = '42501'; end if;
  if not exists (select 1 from categories where id = p_sub and parent_id = p_cat and kind = p_kind) then
    raise exception 'খাত ও উপ খাত মিলছে না'; end if;
  select is_service_charge into v_sc from categories where id = p_cat;
  if v_sc and (p_flat is null or p_months is null or cardinality(p_months) = 0) then
    raise exception 'সার্ভিস চার্জে ফ্ল্যাট ও মাস আবশ্যক'; end if;
  if p_doc_no is not null then
    v_no := p_doc_no;
    if p_doc_no ~ '^(আয়|ব্যয়)-[0-9]{4}-[0-9]+$' then
      insert into doc_counters(kind, year, last_no)
      values (p_kind, split_part(p_doc_no,'-',2)::smallint, split_part(p_doc_no,'-',3)::integer)
      on conflict (kind, year) do update set last_no = greatest(doc_counters.last_no, excluded.last_no);
    end if;
  else
    v_no := next_doc_no(p_kind, p_date);
  end if;
  insert into transactions(doc_no,kind,txn_date,category_id,sub_category_id,account_id,amount,flat_id,owner_name,note,created_by)
  values (v_no,p_kind,p_date,p_cat,p_sub,p_acct,p_amount,p_flat,p_owner,nullif(p_note,''),auth.uid())
  returning id into v_id;
  if p_months is not null then
    insert into service_charge_months(transaction_id, month) select v_id, m from unnest(p_months) m on conflict do nothing;
  end if;
  return jsonb_build_object('id', v_id, 'doc_no', v_no);
end $$;

-- =====================================================================
-- update_txn — লেনদেন সংশোধন
-- =====================================================================
create or replace function update_txn(
  p_id uuid, p_date date, p_cat integer, p_sub integer, p_acct smallint, p_amount numeric,
  p_flat smallint default null, p_owner text default null, p_note text default null,
  p_months date[] default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_kind txn_kind; v_no text; v_sc boolean;
begin
  if not can_write() then raise exception 'এই কাজের অনুমতি নেই' using errcode = '42501'; end if;
  select kind, doc_no into v_kind, v_no from transactions where id = p_id and deleted_at is null;
  if v_no is null then raise exception 'লেনদেনটি পাওয়া যায়নি'; end if;
  if not exists (select 1 from categories where id = p_sub and parent_id = p_cat and kind = v_kind) then
    raise exception 'খাত ও উপ খাত মিলছে না'; end if;
  select is_service_charge into v_sc from categories where id = p_cat;
  if v_sc and (p_flat is null or p_months is null or cardinality(p_months) = 0) then
    raise exception 'সার্ভিস চার্জে ফ্ল্যাট ও মাস আবশ্যক'; end if;
  update transactions set txn_date=p_date, category_id=p_cat, sub_category_id=p_sub, account_id=p_acct, amount=p_amount,
         flat_id=p_flat, owner_name=p_owner, note=nullif(p_note,''), updated_by=auth.uid(), updated_at=now()
   where id = p_id;
  delete from service_charge_months where transaction_id = p_id;
  if p_months is not null then
    insert into service_charge_months(transaction_id, month) select p_id, m from unnest(p_months) m on conflict do nothing;
  end if;
  return jsonb_build_object('id', p_id, 'doc_no', v_no);
end $$;

-- =====================================================================
-- delete_txn — সফট ডিলিট
-- =====================================================================
create or replace function delete_txn(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not can_write() then raise exception 'এই কাজের অনুমতি নেই' using errcode = '42501'; end if;
  update transactions set deleted_at = now(), deleted_by = auth.uid() where id = p_id and deleted_at is null;
  return jsonb_build_object('id', p_id);
end $$;

-- =====================================================================
-- add_transfer — শুধু অ্যাডমিন
-- =====================================================================
create or replace function add_transfer(p_date date, p_from smallint, p_to smallint, p_amount numeric, p_note text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not is_admin() then raise exception 'শুধু অ্যাডমিন ট্রান্সফার করতে পারবেন' using errcode = '42501'; end if;
  insert into transfers(transfer_date, from_account_id, to_account_id, amount, note, created_by)
  values (p_date, p_from, p_to, p_amount, nullif(p_note,''), auth.uid()) returning id into v_id;
  return jsonb_build_object('id', v_id);
end $$;

-- =====================================================================
-- ping — keep-alive
-- =====================================================================
create or replace function ping() returns timestamptz
language sql security definer set search_path = public as $$ select now() $$;

-- =====================================================================
-- login_email_for — Username → Email (login-এর আগে)
-- =====================================================================
create or replace function login_email_for(p_login_id text) returns text
language sql stable security definer set search_path = public, auth as $$
  select u.email
  from profiles p
  join auth.users u on u.id = p.id
  where lower(p.login_id) = lower(trim(p_login_id))
    and p.is_active = true
  limit 1;
$$;

-- =====================================================================
-- admin_user_create — শুধু admin নতুন user বানাবে
-- =====================================================================
create or replace function admin_user_create(
  p_email text, p_password text, p_login_id text, p_full_name text, p_role user_role
) returns jsonb
language plpgsql security definer set search_path = public, auth as $$
declare v_id uuid;
begin
  if not is_admin() then raise exception 'শুধু অ্যাডমিন এই কাজ করতে পারবেন' using errcode = '42501'; end if;
  if coalesce(trim(p_email),'') = '' then raise exception 'Email খালি রাখা যাবে না'; end if;
  if coalesce(trim(p_login_id),'') = '' then raise exception 'ইউজারনেম খালি রাখা যাবে না'; end if;
  if coalesce(trim(p_full_name),'') = '' then raise exception 'নাম খালি রাখা যাবে না'; end if;
  if length(p_password) < 6 then raise exception 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষর'; end if;
  if exists(select 1 from profiles where lower(login_id) = lower(trim(p_login_id))) then
    raise exception 'এই ইউজারনেম আগে থেকেই আছে';
  end if;
  if exists(select 1 from auth.users where lower(email) = lower(trim(p_email))) then
    raise exception 'এই ইমেইল আগে থেকেই আছে';
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
    lower(trim(p_email)), crypt(p_password, gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', ''
  ) returning id into v_id;

  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_id, v_id,
    jsonb_build_object('sub', v_id::text, 'email', lower(trim(p_email))),
    'email', now(), now(), now());

  insert into profiles(id, login_id, full_name, role, is_active)
  values (v_id, trim(p_login_id), trim(p_full_name), p_role, true);

  return jsonb_build_object('id', v_id, 'login_id', p_login_id);
end $$;

-- =====================================================================
-- admin_user_update — admin নাম/role/active বদলাবে
-- =====================================================================
create or replace function admin_user_update(
  p_id uuid, p_full_name text, p_role user_role, p_is_active boolean
) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'শুধু অ্যাডমিন এই কাজ করতে পারবেন' using errcode = '42501'; end if;
  if p_id = auth.uid() and (p_role <> 'admin' or not p_is_active) then
    raise exception 'নিজের ভূমিকা বা সক্রিয়তা বদলানো যাবে না'; end if;
  if coalesce(trim(p_full_name),'') = '' then raise exception 'নাম খালি রাখা যাবে না'; end if;
  update profiles set full_name = trim(p_full_name), role = p_role, is_active = p_is_active where id = p_id;
  return jsonb_build_object('id', p_id);
end $$;

-- =====================================================================
-- admin_user_reset_password — admin পাসওয়ার্ড রিসেট
-- =====================================================================
create or replace function admin_user_reset_password(p_id uuid, p_new_password text) returns jsonb
language plpgsql security definer set search_path = public, auth as $$
begin
  if not is_admin() then raise exception 'শুধু অ্যাডমিন এই কাজ করতে পারবেন' using errcode = '42501'; end if;
  if length(p_new_password) < 6 then raise exception 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষর'; end if;
  update auth.users set encrypted_password = crypt(p_new_password, gen_salt('bf')), updated_at = now() where id = p_id;
  return jsonb_build_object('id', p_id);
end $$;

-- =====================================================================
-- admin_user_delete — সম্পূর্ণ মুছে ফেলা (hard delete)
-- =====================================================================
create or replace function admin_user_delete(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public, auth as $$
begin
  if not is_admin() then raise exception 'শুধু অ্যাডমিন এই কাজ করতে পারবেন' using errcode = '42501'; end if;
  if p_id = auth.uid() then raise exception 'নিজেকে মুছে ফেলা যাবে না'; end if;
  delete from profiles where id = p_id;
  delete from auth.users where id = p_id;
  return jsonb_build_object('id', p_id);
end $$;

-- =====================================================================
-- Audit trigger
-- =====================================================================
create or replace function log_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into audit_log(table_name, record_id, action, old_data, new_data, user_id)
  values (tg_table_name, case when tg_op = 'DELETE' then old.id::text else new.id::text end, lower(tg_op),
          case when tg_op <> 'INSERT' then to_jsonb(old) end,
          case when tg_op <> 'DELETE' then to_jsonb(new) end, auth.uid());
  return coalesce(new, old);
end $$;

create trigger trg_audit_tx     after insert or update or delete on transactions         for each row execute function log_change();
create trigger trg_audit_trf    after insert or update or delete on transfers            for each row execute function log_change();
create trigger trg_audit_acc    after update on accounts                                  for each row execute function log_change();
create trigger trg_audit_rate   after insert or update or delete on service_charge_rates for each row execute function log_change();
create trigger trg_audit_prof   after insert or update or delete on profiles             for each row execute function log_change();

-- =====================================================================
-- v_account_balances — বর্তমান জের
-- =====================================================================
create or replace view v_account_balances with (security_invoker = true) as
select a.id, a.code, a.name,
       a.opening_balance
       + coalesce((select sum(amount) from transactions t where t.account_id=a.id and t.kind='income'  and t.deleted_at is null),0)
       - coalesce((select sum(amount) from transactions t where t.account_id=a.id and t.kind='expense' and t.deleted_at is null),0)
       + coalesce((select sum(amount) from transfers x where x.to_account_id=a.id),0)
       - coalesce((select sum(amount) from transfers x where x.from_account_id=a.id),0) as balance
from accounts a;

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table profiles              enable row level security;
alter table accounts              enable row level security;
alter table flats                 enable row level security;
alter table categories            enable row level security;
alter table service_charge_rates  enable row level security;
alter table doc_counters          enable row level security;
alter table transactions          enable row level security;
alter table service_charge_months enable row level security;
alter table transfers             enable row level security;
alter table audit_log             enable row level security;
alter table settings              enable row level security;

-- profiles: নিজের row সবাই দেখবে, admin সব দেখবে
create policy read_self on profiles for select using (id = auth.uid() or my_role() = 'admin');

-- সাধারণ read সব logged-in user
create policy read_all on accounts              for select using (my_role() is not null);
create policy read_all on flats                 for select using (my_role() is not null);
create policy read_all on categories            for select using (my_role() is not null);
create policy read_all on service_charge_rates  for select using (my_role() is not null);
create policy read_all on transactions          for select using (my_role() is not null);
create policy read_all on service_charge_months for select using (my_role() is not null);
create policy read_all on transfers             for select using (my_role() is not null);
create policy read_all on settings              for select using (my_role() is not null);

-- admin only writes
create policy admin_acc  on accounts             for update using (my_role() = 'admin') with check (my_role() = 'admin');
create policy admin_rate on service_charge_rates for all    using (my_role() = 'admin') with check (my_role() = 'admin');
create policy admin_set  on settings             for all    using (my_role() = 'admin') with check (my_role() = 'admin');
create policy admin_flat on flats                for all    using (my_role() = 'admin') with check (my_role() = 'admin');
create policy admin_cat  on categories           for all    using (my_role() = 'admin') with check (my_role() = 'admin');
create policy admin_log  on audit_log            for select using (my_role() = 'admin');

-- =====================================================================
-- Permissions
-- =====================================================================
revoke all on all tables    in schema public from anon;
revoke all on all functions in schema public from anon, public;
grant usage on schema public to authenticated, anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on all functions in schema public to authenticated;
grant execute on function ping() to anon;
grant execute on function login_email_for(text) to anon, authenticated;

-- =====================================================================
-- Initial data (accounts + settings)
-- =====================================================================
insert into accounts(code,name,kind,bank_name,branch) values
 ('cash','নগদ টাকা','cash',null,null),
 ('nbl','ন্যাশনাল ব্যাংক পিএলসি','bank','ন্যাশনাল ব্যাংক পিএলসি','আসাদ গেট শাখা'),
 ('pbl','পূবালী ব্যাংক পিএলসি','bank','পূবালী ব্যাংক পিএলসি','মোহাম্মদপুর শাখা');

insert into settings(key,value) values
 ('org_name','কাজী মোশাররফ টাওয়ার ভবন মালিক সমিতি'),
 ('org_address','বাসা নং ৩/৪, ব্লক-এ, আসাদ এভিনিউ, ঢাকা-১২০৭'),
 ('sc_default','0');

-- =====================================================================
-- সম্পূর্ণ
-- =====================================================================
