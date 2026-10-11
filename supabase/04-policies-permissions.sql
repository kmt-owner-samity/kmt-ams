-- =====================================================================
-- ০৪ — Triggers, View, RLS Policies, Permissions, Initial Data
-- কাজী মোশাররফ টাওয়ার ভবন মালিক সমিতি — Schema v3
-- এই ফাইল চালানোর আগে 03-functions.sql চালান
-- =====================================================================

-- =====================================================================
-- Audit Triggers
-- =====================================================================
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
-- Row Level Security — Enable
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

-- =====================================================================
-- RLS Policies — Read
-- =====================================================================
create policy read_self on profiles for select using (id = auth.uid() or my_role() = 'admin');

create policy read_all on accounts              for select using (my_role() is not null);
create policy read_all on flats                 for select using (my_role() is not null);
create policy read_all on categories            for select using (my_role() is not null);
create policy read_all on service_charge_rates  for select using (my_role() is not null);
create policy read_all on transactions          for select using (my_role() is not null);
create policy read_all on service_charge_months for select using (my_role() is not null);
create policy read_all on transfers             for select using (my_role() is not null);
create policy read_all on settings              for select using (my_role() is not null);

-- =====================================================================
-- RLS Policies — Admin Only Writes
-- =====================================================================
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
-- Initial Data — Accounts + Settings
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
