-- =====================================================================
-- Seed Data — খাত, উপখাত ও ফ্ল্যাট
-- কাজী মোশাররফ টাওয়ার ভবন মালিক সমিতি — Schema v3
-- schema ফাইলগুলোর পরে চালান
-- =====================================================================

-- =====================================================================
-- Categories: Income — প্রধান খাত
-- =====================================================================
insert into categories (kind, name, parent_id, sort_order, is_service_charge) values
 ('income','মাসিক সার্ভিস চার্জ', null, 1, false),
 ('income','ব্যাংক সুদ ও মুনাফা', null, 2, false),
 ('income','বিশেষ ডোনেশন ও অনুদান', null, 3, false),
 ('income','অন্যান্য আয়', null, 4, false);

-- =====================================================================
-- Categories: Income — উপখাত
-- =====================================================================
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
-- Categories: Expense — প্রধান খাত
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

-- =====================================================================
-- Categories: Expense — উপখাত
-- =====================================================================

-- বেতন ও সম্মানী
insert into categories (kind, name, parent_id, sort_order)
select 'expense', 'কর্মচারীদের বেতন', id, 1
from categories where kind='expense' and name='বেতন ও সম্মানী';

insert into categories (kind, name, parent_id, sort_order)
select 'expense', 'মালির বেতন', id, 2
from categories where kind='expense' and name='বেতন ও সম্মানী';

insert into categories (kind, name, parent_id, sort_order)
select 'expense', 'বোনাস ও বকশিশ', id, 3
from categories where kind='expense' and name='বেতন ও সম্মানী';

-- ইউটিলিটি বিল
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

-- লিফট
insert into categories (kind, name, parent_id, sort_order)
select 'expense', 'সার্ভিসিং ফি (মাসিক)', id, 1
from categories where kind='expense' and name='লিফট';

insert into categories (kind, name, parent_id, sort_order)
select 'expense', 'মালামাল ও যন্ত্রাংশ ক্রয়', id, 2
from categories where kind='expense' and name='লিফট';

insert into categories (kind, name, parent_id, sort_order)
select 'expense', 'মেরামত ও রক্ষণাবেক্ষণ', id, 3
from categories where kind='expense' and name='লিফট';

insert into categories (kind, name, parent_id, sort_order)
select 'expense', 'টেকনিশিয়ান ও শ্রমিক মজুরি', id, 4
from categories where kind='expense' and name='লিফট';

-- জেনারেটর
insert into categories (kind, name, parent_id, sort_order)
select 'expense', 'সার্ভিসিং ফি (ষান্মাসিক)', id, 1
from categories where kind='expense' and name='জেনারেটর';

insert into categories (kind, name, parent_id, sort_order)
select 'expense', 'জ্বালানি/তেল ক্রয়', id, 2
from categories where kind='expense' and name='জেনারেটর';

insert into categories (kind, name, parent_id, sort_order)
select 'expense', 'মালামাল ও যন্ত্রাংশ ক্রয়', id, 3
from categories where kind='expense' and name='জেনারেটর';

insert into categories (kind, name, parent_id, sort_order)
select 'expense', 'মেরামত, রক্ষণাবেক্ষণ ও মজুরি', id, 4
from categories where kind='expense' and name='জেনারেটর';

-- ট্যাংক ও প্লাম্বিং
insert into categories (kind, name, parent_id, sort_order)
select 'expense', 'পরিষ্কার ও জীবাণুমুক্তকরণ', id, 1
from categories where kind='expense' and name='ট্যাংক ও প্লাম্বিং';

insert into categories (kind, name, parent_id, sort_order)
select 'expense', 'মেরামত ও রক্ষণাবেক্ষণ', id, 2
from categories where kind='expense' and name='ট্যাংক ও প্লাম্বিং';

insert into categories (kind, name, parent_id, sort_order)
select 'expense', 'প্লাম্বিং ও ওয়াশরুম মেরামত', id, 3
from categories where kind='expense' and name='ট্যাংক ও প্লাম্বিং';

insert into categories (kind, name, parent_id, sort_order)
select 'expense', 'শ্রমিক মজুরি', id, 4
from categories where kind='expense' and name='ট্যাংক ও প্লাম্বিং';

-- মেইনটেন্যান্স ও মেরামত
insert into categories (kind, name, parent_id, sort_order)
select 'expense', 'সিসি ক্যামেরা ও সিকিউরিটি সিস্টেম', id, 1
from categories where kind='expense' and name='মেইনটেন্যান্স ও মেরামত';

insert into categories (kind, name, parent_id, sort_order)
select 'expense', 'ইলেকট্রিক ও লাইটিং মেরামত', id, 2
from categories where kind='expense' and name='মেইনটেন্যান্স ও মেরামত';

insert into categories (kind, name, parent_id, sort_order)
select 'expense', 'বিল্ডিং, গেট ও সিভিল মেরামত', id, 3
from categories where kind='expense' and name='মেইনটেন্যান্স ও মেরামত';

-- প্রশাসনিক (এখানে 'এমপ্লয়িদের আপ্যায়ন' যোগ করা হয়েছে)
insert into categories (kind, name, parent_id, sort_order)
select 'expense', 'খাতা, স্টেশনারি ও অফিস সামগ্রী', id, 1
from categories where kind='expense' and name='প্রশাসনিক';

insert into categories (kind, name, parent_id, sort_order)
select 'expense', 'প্রিন্টিং, ফটোকপি ও লেমিনেটিং', id, 2
from categories where kind='expense' and name='প্রশাসনিক';

insert into categories (kind, name, parent_id, sort_order)
select 'expense', 'আপ্যায়ন ও মিটিং খরচ', id, 3
from categories where kind='expense' and name='প্রশাসনিক';

insert into categories (kind, name, parent_id, sort_order)
select 'expense', 'আইনি, ট্রেড লাইসেন্স ও প্রশাসনিক ফি', id, 4
from categories where kind='expense' and name='প্রশাসনিক';

insert into categories (kind, name, parent_id, sort_order)
select 'expense', 'এমপ্লয়িদের আপ্যায়ন', id, 5
from categories where kind='expense' and name='প্রশাসনিক';

-- পরিচ্ছন্নতা ও পেস্ট কন্ট্রোল
insert into categories (kind, name, parent_id, sort_order)
select 'expense', 'ময়লার বিল (মাসিক)', id, 1
from categories where kind='expense' and name='পরিচ্ছন্নতা ও পেস্ট কন্ট্রোল';

insert into categories (kind, name, parent_id, sort_order)
select 'expense', 'ক্লিনিং মালামাল ও কেমিক্যাল', id, 2
from categories where kind='expense' and name='পরিচ্ছন্নতা ও পেস্ট কন্ট্রোল';

insert into categories (kind, name, parent_id, sort_order)
select 'expense', 'পেস্ট কন্ট্রোল/পোকা-মাকড় দমন', id, 3
from categories where kind='expense' and name='পরিচ্ছন্নতা ও পেস্ট কন্ট্রোল';

insert into categories (kind, name, parent_id, sort_order)
select 'expense', 'বর্জ্য ব্যবস্থাপনা', id, 4
from categories where kind='expense' and name='পরিচ্ছন্নতা ও পেস্ট কন্ট্রোল';

-- অন্যান্য
insert into categories (kind, name, parent_id, sort_order)
select 'expense', 'নির্মাণ সামগ্রী (ইট, বালু, সিমেন্ট)', id, 1
from categories where kind='expense' and name='অন্যান্য';

insert into categories (kind, name, parent_id, sort_order)
select 'expense', 'হার্ডওয়্যার ও স্যানিটারি সামগ্রী', id, 2
from categories where kind='expense' and name='অন্যান্য';

insert into categories (kind, name, parent_id, sort_order)
select 'expense', 'পরিবহন ও ভ্যান/গাড়ি ভাড়া', id, 3
from categories where kind='expense' and name='অন্যান্য';

insert into categories (kind, name, parent_id, sort_order)
select 'expense', 'আপৎকালীন/জরুরি মেরামত', id, 4
from categories where kind='expense' and name='অন্যান্য';

insert into categories (kind, name, parent_id, sort_order)
select 'expense', 'ডোনেশন/চাঁদা/কমিউনিটি ফি', id, 5
from categories where kind='expense' and name='অন্যান্য';

insert into categories (kind, name, parent_id, sort_order)
select 'expense', 'ব্যাংক চার্জ/অন্যান্য সার্ভিস ফি', id, 6
from categories where kind='expense' and name='অন্যান্য';

-- =====================================================================
-- Flats — ৪০টি ফ্ল্যাট
-- =====================================================================
insert into flats (flat_no, floor_no, owner_name) values
 ('২-এ',  2,  'মি. অজয় কুমার সরকার'),
 ('২-বি', 2,  'মিসেস উসা রানী বিশ্বাস'),
 ('২-সি', 2,  'মি. আনোয়ার উদ্দীন'),
 ('৩-এ',  3,  'মি. কাজী সাইফুদ্দীন হোসেন'),
 ('৩-বি', 3,  'মি. কাজী সাইফুদ্দীন হোসেন'),
 ('৩-সি', 3,  'মি. কাজী সাইফুদ্দীন হোসেন'),
 ('৪-এ',  4,  'মি. সঞ্জয় রায় তালুকদার'),
 ('৪-বি', 4,  'মি. ডাঃ দিলীপ কুমার ঘোষ'),
 ('৪-সি', 4,  'মিসেস তাহমিনা হক রুমি'),
 ('৫-এ',  5,  'মিসেস সাবেরা সুলতানা'),
 ('৫-বি', 5,  'মিসেস শীপ্রা সাহা'),
 ('৫-সি', 5,  'মিসেস পল্লবী দেব'),
 ('৬-এ',  6,  'মি. মাহমুদুল হক'),
 ('৬-বি', 6,  'মিসেস রেজিনা হোসেন'),
 ('৬-সি', 6,  'মিসেস পুরবী দেব'),
 ('৭-এ',  7,  'মি. মাহমুদুল হক'),
 ('৭-বি', 7,  'মিসেস মাহমুদা খাতুন'),
 ('৭-সি', 7,  'মি. মোঃ নাছিম হাসান'),
 ('৮-এ',  8,  'মিসেস রেজিনা হোসেন'),
 ('৮-বি', 8,  'মি. মোঃ মতিউর রহমান'),
 ('৮-সি', 8,  'মি. জামাল উদ্দীন'),
 ('৯-এ',  9,  'মি. সৈয়দ মোহাম্মদ হেমায়েত হোসেন'),
 ('৯-বি', 9,  'মি. মোঃ আলতাফ হোসেন'),
 ('৯-সি', 9,  'মি. শহীদ ফারকী'),
 ('১০-এ', 10, 'মি. কাজী সাইফুদ্দীন হোসেন'),
 ('১০-বি',10, 'মি. মোঃ জাকির হোসেন'),
 ('১০-সি',10, 'মি. ডাঃ অরুন জ্যোতি তরফদার'),
 ('১১-এ', 11, 'মি. বেবি ভান্ডির'),
 ('১১-বি',11, 'মি. মশিউল আওয়াল লিটু'),
 ('১১-সি',11, 'মি. ডাঃ বিজয় দত্ত'),
 ('১২-এ', 12, 'মিসেস রেজিনা হোসেন'),
 ('১২-বি',12, 'মি. মোঃ রেজাউল করিম'),
 ('১২-সি',12, 'মি. মোঃ আবু কালাম সিদ্দিক'),
 ('১৩-এ', 13, 'মি. সিদ্দিক আলী'),
 ('১৩-বি',13, 'মি. মহিউদ্দিন হোসেন'),
 ('১৩-সি',13, 'মি. ডাঃ তাহমিদুর রহমান'),
 ('১৪-এ', 14, 'মি. কাজী সাইফুদ্দীন হোসেন'),
 ('১৪-বি',14, 'মিসেস শাহানা রহমান'),
 ('১৪-সি',14, 'মি. আহসান তারিক'),
 ('১৫-সি',15, 'মি. মোহাম্মদ হায়দার আলী');

-- =====================================================================
-- সম্পূর্ণ
-- =====================================================================
