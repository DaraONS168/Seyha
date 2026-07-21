# Customer Follow Up Management System

Responsive CRM សម្រាប់ក្រុម Sales គ្រប់គ្រងអតិថិជន ការហៅ Follow Up ផែនការចុះសួរសុខទុក្ខ ការជូនដំណឹង របាយការណ៍ និងសិទ្ធិអ្នកប្រើប្រាស់។ UI ប្រើភាសាខ្មែរជាចម្បង ហើយភ្ជាប់ទិន្នន័យជាមួយ Supabase។

## Technology

- React 18 + Vite 6
- Tailwind CSS 3
- Supabase Database, Auth, Edge Functions និង Row Level Security
- React Router, Lucide React, date-fns, Recharts និង Sonner
- Browser Notification API

## Main Features

- Username/password authentication with persistent sessions and protected routes
- Admin, manager, sales, user, custom roles and permission-based navigation
- Customer CRUD with search, filters, sorting, pagination, phone validation and duplicate warnings
- Call records with status updates, follow-up creation and call history timelines
- Follow-up queues for today, overdue, upcoming and completed work
- Visit planning for field activity and route/schedule tracking
- Database-backed notification center plus browser notifications
- Dashboard metrics, charts, recent activity and sales performance
- Reports with filters and export/print workflows
- Admin tools for sales team, users, permissions, roles and company settings
- PostgreSQL constraints, indexes, triggers, RLS policies and seed data

## Project Structure

```text
.
├── src/
│   ├── components/
│   │   ├── calls/
│   │   ├── common/
│   │   └── customers/
│   ├── contexts/
│   ├── hooks/
│   ├── layouts/
│   ├── pages/
│   ├── services/
│   ├── utils/
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
├── scripts/
│   ├── create-admin.mjs
│   ├── create-sales-via-function.mjs
│   ├── diagnose-notifications.mjs
│   ├── verify-admin.mjs
│   ├── verify-notifications.mjs
│   ├── verify-sales-function.mjs
│   └── verify-visit-plans.mjs
├── supabase/
│   ├── functions/
│   │   ├── manage-sales/
│   │   └── manage-users/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_bootstrap_demo_admin.sql
│   │   ├── 003_visit_planning.sql
│   │   ├── 004_improve_notifications.sql
│   │   ├── 005_username_auth.sql
│   │   ├── 006_user_roles_permissions.sql
│   │   ├── 007_permission_rls_and_user_audit.sql
│   │   ├── 008_add_user_role.sql
│   │   └── 009_custom_roles.sql
│   └── seed.sql
├── .env.example
├── package.json
├── tailwind.config.js
└── vite.config.js
```

## Requirements

- Node.js 18.18+; Node 20 LTS is recommended
- npm
- Supabase project
- Supabase CLI if you want to push migrations or deploy Edge Functions from the terminal

## Installation

```bash
npm install
```

## Environment Variables

Copy `.env.example` to `.env` and fill in the Supabase project values from Project Settings > API:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Do not expose the Supabase `service_role` key in frontend code or in any `VITE_` environment variable. The anon key is intended for browser use when RLS policies are configured correctly.

## Supabase Setup

Run the migrations in order:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Or run each SQL file manually in the Supabase SQL Editor from `001_initial_schema.sql` through `009_custom_roles.sql`.

Then seed demo/reference data:

```sql
-- Run in Supabase SQL Editor
-- File: supabase/seed.sql
```

For authentication, enable the Email provider in Supabase Authentication. During local development you can temporarily disable email confirmation.

## Edge Functions

This project includes Supabase Edge Functions for privileged user-management workflows:

- `manage-sales`
- `manage-users`

Deploy them with the Supabase CLI:

```bash
supabase functions deploy manage-sales
supabase functions deploy manage-users
```

These functions require server-side Supabase secrets in the Supabase project. Keep service keys in Supabase function secrets, not in frontend `.env` files.

## Run Locally

```bash
npm run dev
```

Open the URL printed by Vite, usually `http://localhost:5173`.

## Production Build

```bash
npm run build
npm run preview
```

The production output is generated in `dist/`.

## Useful Commands

```bash
npm run dev      # Start the development server
npm run build    # Create a production build
npm run preview  # Preview the production build
npm run lint     # Run ESLint
```

Project verification helpers:

```bash
node scripts/verify-admin.mjs
node scripts/verify-notifications.mjs
node scripts/verify-sales-function.mjs
node scripts/verify-visit-plans.mjs
node scripts/diagnose-notifications.mjs
```

## Notification Behavior

When the app runs, it syncs due and overdue follow-up notifications from the database. Browser notifications are sent only when the user grants permission, and production browser notifications require HTTPS. Localhost is allowed for development.

## Security Model

- Admin users can manage all data, users, permissions and settings.
- Manager and Sales access is controlled through database-backed permissions.
- Sales users should only work with assigned customers, follow-ups, calls and visit plans.
- RLS policies protect data at the database layer; frontend permission checks are for user experience.
- User and sales account creation is handled through privileged Supabase Edge Functions.

## Deployment

### Vercel

1. Import the repository into Vercel.
2. Use the Vite framework preset.
3. Set build command to `npm run build` and output directory to `dist`.
4. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
5. Add the production URL to Supabase Authentication > URL Configuration > Redirect URLs.

### Netlify

Use build command `npm run build` and publish directory `dist`. Add the same environment variables. For client-side routing, configure a rewrite from `/*` to `/index.html` with status `200`.

### Static Apache/XAMPP

Run `npm run build`, serve the `dist/` contents, enable `mod_rewrite`, and rewrite non-file routes to `index.html`. Use HTTPS in production so browser notifications can work.
