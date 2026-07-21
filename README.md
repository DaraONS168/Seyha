# Customer Follow Up Management System

ប្រព័ន្ធ CRM responsive សម្រាប់ក្រុម Sales កត់ត្រាអតិថិជន ការហៅ និង Follow Up។ UI ប្រើភាសាខ្មែរជាចម្បង និងភ្ជាប់ទិន្នន័យដោយផ្ទាល់ជាមួយ Supabase។

## Technology

- React 18 + Vite 6
- Tailwind CSS 3
- Supabase Database, Auth និង Row Level Security
- Lucide React, date-fns, Recharts, SheetJS និង Sonner
- Browser Notification API

## មុខងារសំខាន់

- Username/password authentication, persistent session, protected routes និង role Admin/Sales
- Customer CRUD, search/filter/sort/pagination, phone validation និង duplicate warning
- Call history timeline; RPC មួយកត់ត្រាការហៅ, update status និងបង្កើត follow-up ជា transaction
- Today/overdue/upcoming/completed follow-ups ជាមួយ complete, reschedule និង click-to-call
- Database-backed notification center និង browser notifications មិនផ្ញើស្ទួន
- Dashboard cards/charts, recent activity និង sales performance
- Customer report filters និង CSV/Excel/print export
- Admin-only sales performance និង company settings
- PostgreSQL constraints, indexes, triggers, RLS និង seed data

## Folder structure

```text
.
├── supabase/
│   ├── migrations/001_initial_schema.sql
│   └── seed.sql
├── src/
│   ├── components/
│   │   ├── calls/CallRecordModal.jsx
│   │   ├── common/{AdminRoute,Badge,ConfirmDialog,EmptyState,LoadingState,Modal,ProtectedRoute}.jsx
│   │   └── customers/CustomerForm.jsx
│   ├── contexts/AuthContext.jsx
│   ├── hooks/useNotifications.js
│   ├── layouts/DashboardLayout.jsx
│   ├── pages/
│   │   ├── LoginPage.jsx
│   │   ├── DashboardPage.jsx
│   │   ├── CustomersPage.jsx
│   │   ├── CustomerDetailPage.jsx
│   │   ├── FollowUpsPage.jsx
│   │   ├── CallHistoryPage.jsx
│   │   ├── ReportsPage.jsx
│   │   ├── SalesTeamPage.jsx
│   │   ├── NotificationsPage.jsx
│   │   ├── SettingsPage.jsx
│   │   └── NotFoundPage.jsx
│   ├── services/{supabase,customerService,callService,followUpService,dashboardService,reportService}.js
│   ├── utils/{constants,formatters}.js
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
├── .env.example
├── package.json
├── tailwind.config.js
└── vite.config.js
```

## 1. Installation

Requirements: Node.js 18.18+ (Node 20 LTS recommended), npm និង Supabase project។

```bash
npm install
```

## 2. Supabase setup

1. បង្កើត project នៅ Supabase Dashboard។
2. ចូល **SQL Editor** ហើយ run files ក្នុង `supabase/migrations/` តាមលំដាប់លេខ រួមទាំង `005_username_auth.sql`។
3. ចូល **Authentication > Providers > Email** ហើយបើក Email provider។ សម្រាប់ demo អាចបិទ Confirm email ជាបណ្ដោះអាសន្ន។
4. ចូល **Authentication > Users > Add user** ហើយបង្កើត Admin ដំបូង៖
   - `admin@demo.com` / password ដែលមានសុវត្ថិភាព
   - `sales@demo.com` / password ដែលមានសុវត្ថិភាព
5. Run `supabase/seed.sql` ក្នុង SQL Editor។ Script នេះកំណត់ Admin/Sales roles និងបញ្ចូល sample customers។ Password មិនត្រូវបាន hard-code ក្នុង repository ទេ។

បើប្រើ Supabase CLI៖

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

> `profiles` row បង្កើតដោយ trigger ពេលបង្កើត Auth user។ User ថ្មីមាន role `sales` ដោយ default។ មានតែ Admin ទេដែលគួរកែ role។

## 3. Environment variables

ចម្លង `.env.example` ទៅ `.env` ហើយដាក់ Project URL និង anon/publishable key ពី **Project Settings > API**៖

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

កុំដាក់ `service_role` key នៅ frontend ឬ environment variable ដែលចាប់ផ្ដើមដោយ `VITE_`។ Anon key មានសុវត្ថិភាពសម្រាប់ browser នៅពេល RLS ត្រូវបានបើកដូច migration នេះ។

## 4. Run locally

```bash
npm run dev
```

បើក URL ដែល Vite បង្ហាញ (ជាទូទៅ `http://localhost:5173`)។ Admin ចាស់អាច login ដោយ email បានដដែល ហើយគណនី Sales ដែលបង្កើតពីទំព័រ **ក្រុម Sales** នឹង login ដោយ Username និងពាក្យសម្ងាត់។

## 5. Production build

```bash
npm run build
npm run preview
```

Output នៅក្នុង `dist/`។

## Notification behavior

ពេល app បើក វាហៅ database function `sync_due_notifications()`។ Function បង្កើត notifications តែ Follow Up ដែលដល់ពេល/ហួសពេល និងមិនមែន Converted/Cancelled។ `notified_at` ត្រូវបាន update បន្ទាប់ពី Browser Notification ផ្ញើ ដូច្នេះ refresh មិនផ្ញើស្ទួន។ User ត្រូវចុច **អនុញ្ញាត Browser Notification** ម្ដង។ Browser notifications ត្រូវការ HTTPS លើ production (localhost ត្រូវបានអនុញ្ញាតសម្រាប់ development)។

## Security model

- Admin អាចអាន/កែទិន្នន័យទាំងអស់។
- Sales អាចអាន និងកែតែ customers/follow-ups ដែល assign ឱ្យខ្លួន និងកត់ត្រាការហៅសម្រាប់ customers ទាំងនោះ។
- រាល់ tables បានបើក RLS; UI role checks គ្រាន់តែសម្រាប់ UX ប៉ុណ្ណោះ។
- Input ត្រូវបាន validate/sanitize នៅ client ហើយ database មាន constraints បន្ថែម។
- Customer deletion ប្រើ confirmation dialog ហើយ related rows លុបតាម foreign-key cascade។

## Deployment

### Vercel

1. Push repository ទៅ GitHub ហើយ Import project ក្នុង Vercel។
2. Framework preset: **Vite**; Build command: `npm run build`; Output: `dist`។
3. បន្ថែម `VITE_SUPABASE_URL` និង `VITE_SUPABASE_ANON_KEY` ក្នុង Project Environment Variables។
4. Deploy ហើយបន្ថែម production URL ទៅ Supabase **Authentication > URL Configuration > Redirect URLs**។

### Netlify

Build command `npm run build`, publish directory `dist`, បន្ថែម environment variables ដូចខាងលើ។ សម្រាប់ client-side routes បង្កើត rewrite `/* /index.html 200` ក្នុង Netlify dashboard។

### Static Apache/XAMPP

Run `npm run build`, serve contents ក្នុង `dist`, បើក `mod_rewrite` ហើយ rewrite routes ដែលមិនមែន file ទៅ `index.html`។ Production ត្រូវប្រើ HTTPS ដើម្បីឱ្យ Browser Notification ដំណើរការ។

## Useful commands

```bash
npm run dev      # development server
npm run build    # production build
npm run preview  # preview build
npm run lint     # ESLint
```
