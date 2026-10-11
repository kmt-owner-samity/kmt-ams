# কাজী মোশাররফ টাওয়ার ভবন মালিক সমিতি — অ্যাকাউন্টিং সিস্টেম

আয়-ব্যয়ের হিসাব, তিন হিসাব (নগদ / ন্যাশনাল ব্যাংক / পূবালী ব্যাংক), ইনভয়েস-ভাউচার, মাসিক রিপোর্ট ও সামারি শীট।

- **Frontend:** Static HTML + ES Modules (GitHub Pages)
- **Backend:** Supabase (PostgreSQL + Auth + RLS)
- **PWA:** Installable, offline-capable

## Quick Start

১. Supabase প্রজেক্ট তৈরি করুন
২. `supabase/schema.sql`, `supabase/seed.sql` চালান
৩. `js/supabase-config.example.js` কপি করে `js/supabase-config.js` বানান
৪. নিজের URL ও Key বসান
৫. GitHub Pages চালু করুন

বিস্তারিত: `docs/SUPABASE_SETUP.md`

## Tech Stack

- Vanilla JavaScript (ES Modules)
- Supabase (PostgreSQL)
- html2canvas + jsPDF (PDF generation)
- Service Worker (PWA)

## License

Private — শুধু সমিতির অভ্যন্তরীণ ব্যবহারের জন্য।
