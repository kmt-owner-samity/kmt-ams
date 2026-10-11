-- =====================================================================
-- ০৩ — Functions (RPC + Helpers)
-- কাজী মোশাররফ টাওয়ার ভবন মালিক সমিতি — Schema v3
-- এই ফাইল চালানোর আগে 02-tables.sql চালান
-- =====================================================================

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
-- admin_user_delete — সম্পূর্ণ মুছে ফেলা
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
-- log_change — audit trigger function
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

-- =====================================================================
-- সম্পূর্ণ
-- =====================================================================
