-- =====================================================================
-- Seed Data — খাত, উপখাত ও ফ্ল্যাট
-- schema.sql চালানোর পরে চালান
-- =====================================================================

-- =====================================================================
-- Categories: Income
-- =====================================================================
insert into categories (kind, name, parent_id, sort_order, is_service_charge) values
 ('income','মাসিক সার্ভিস চার্জ', null, 1, false),
 ('income','ব্যাংক সুদ ও মুনাফা', null, 2, false),
 ('income','বিশেষ ডোনেশন ও অনুদান', null, 3, false),
 ('income','অন্যান্য আয়', null, 4, false);

-- Income subcategories
insert into categories (kind, name, parent_id, sort_order, is_service_charge)
select 'income', 'ফ্ল্যাটের সার্ভিস চার্জ', id, 1, true
from categories where kind='income' and name='মাসিক সার্ভিস চার্জ';

insert into categories (kind, name, parent_id, sort_order)
select 'income', 'সঞ্চয়ী হিসাবের সুদ', id, 1
from categories where kind='income' and name='ব্যাংক সুদ ও মুনাফা';

insert into categories (kind, name, parent_id, sort_order)
select 'income', 'এফডিআর/ডিপিএস মুনাফা', id, 2
from categories where kind='income' and name='ব্যাংক সুদ ও মুনাফা';

insert into categories (kind, name, parent_id, sort_order)
select 'income', 'সাধারণ অনুদান', id, 1
from categories where kind='income' and name='বিশেষ ডোনেশন ও অনুদান';

insert into categories (kind, name, parent_id, sort_order)
select 'income', 'নির্দিষ্ট কাজের জন্য অনুদান', id, 2
from categories where kind='income' and name='বিশেষ ডোনেশন ও অনুদান';

insert into categories (kind, name, parent_id, sort_order)
select 'income', 'বিলম্ব ফি/জরিমানা', id, 1
from categories where kind='income' and name='অন্যান্য আয়';

insert into categories (kind, name, parent_id, sort_order)
select 'income', 'হল/ছাদ ভাড়া', id, 2
from categories where kind='income' and name='অন্যান্য আয়';

insert into categories (kind, name, parent_id, sort_order)
select 'income', 'স্ক্র্যাপ/পুরানো মালামাল বিক্রি', id, 3
from categories where kind='income' and name='অন্যান্য আয়';

-- =====================================================================
-- Categories: Expense
-- =====================================================================
insert into categories (kind, name, parent_id, sort_order) values
 ('expense','বেতন ও সম্মানী', null, 1),
 ('expense','ইউটিলিটি বিল', null, 2),
 ('expense','লিফট', null, 3),
 ('expense','জেনারেটর', null, 4),
 ('expense','ট্যাংক ও প্লাম্বিং', null, 5),
 ('expense','মেইনটেন্যান্স ও মেরামত', null, 6),
 ('expense','প্রশাসনিক', null, 7),
 ('expense','পরিচ্ছন্নতা ও পেস্ট কন্ট্রোল', null, 8),
 ('expense','অন্যান্য', null, 9);

-- Expense subcategories
insert into categories (kind, name, parent_id, sort_order)
select 'expense', 'কর্মচারীদের বেতন', id, 1
from categories where kind='expense' and name='বেতন ও সম্মানী';

insert into categories (kind, name, parent_id, sort_order)
select 'expense', 'মালির বেতন', id, 2
from categories where kind='expense' and name='বেতন ও সম্মানী';

insert into categories (kind, name, parent_id, sort_order)
select 'expense', 'বোনাস ও বকশিশ', id, 3
from categories where kind='expense' and name='বেতন ও সম্মানী';

insert into categories (kind, name, parent_id, sort_order)
select 'expense', 'বিদ্যুৎ বিল', id, 1
from categories where kind='expense' and name='ইউটিলিটি বিল';

insert into categories (kind, name, parent_id, sort_order)
select 'expense', 'ওয়াসা বিল', id, 2
from categories where kind='expense' and name='ইউটিলিটি বিল';

insert into categories (kind, name, parent_id, sort_order)
select 'expense', 'গ্যাস বিল', id, 3
from categories where kind='expense' and name='ইউটিলিটি বিল';

insert into categories (kind, name, parent_id, sort_order)
select 'expense', 'ইন্টারনেট ও ডিশ বিল', id, 4
from categories where kind='expense' and name='ইউটিলিটি বিল';

insert into categories (kind, name, parent_id, sort_order)
select 'expense', 'মোবাইল বিল', id, 5
from categories where kind='expense' and name='ইউটিলিটি বিল';

insert into categories (kind, name, parent_id, sort_order)
select 'expense', 'সার্ভিসিং ফি (মাসিক)', id, 1
from categories where kind='expense' and
