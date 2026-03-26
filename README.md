# Guidance Counseling Inventory Management System

A web-based inventory and student management system for NBSC, built with React, TypeScript, Supabase, and Tailwind CSS.

---

## Features

- Student registration and login (NBSC institutional email required)
- Student dashboard with inventory form submission
- Profile editing with photo upload
- Mental health self-assessment
- Admin dashboard with full CRUD on student records
- Admin can set/reset student passwords
- Audit logging
- Session timeout warning
- Toast notifications
- PDF/print utilities for form submissions

---

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite
- **Styling:** Tailwind CSS
- **Backend/DB:** Supabase (PostgreSQL + Auth + Storage)
- **State Management:** Zustand
- **Routing:** React Router v6

---

## Getting Started

### 1. Clone the repo

```bash
git clone <repo-url>
cd student-inventory-system
npm install
```

### 2. Set up environment variables

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```bash
cp .env.example .env
```

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...        # anon/public key from Supabase → Settings → API
VITE_SUPABASE_SERVICE_ROLE_KEY=eyJ... # service_role key from Supabase → Settings → API
VITE_ADMIN_MASTER_KEY=your_secret_key
```

> Both keys must be JWTs starting with `eyJ...`. Get them from your Supabase project under **Settings → API**.

### 3. Set up the database

Run the following SQL files in order in your **Supabase SQL Editor**:

1. `supabase/COMPLETE_SETUP.sql` — creates all tables, disables RLS, sets up storage
2. `supabase/disable-email-confirmation.sql` — auto-confirms users (bypasses email rate limit)

### 4. Disable email confirmation (Supabase Dashboard)

Go to **Authentication → Providers → Email** and turn off **"Confirm email"**.

This prevents Supabase from sending confirmation emails, which are rate-limited to 3/hour on the free plan.

### 5. Run the dev server

```bash
npm run dev
```

---

## Project Structure

```
src/
├── pages/          # Route-level page components
├── components/     # Reusable UI components
├── store/          # Zustand auth store
├── contexts/       # Toast context
├── hooks/          # Custom hooks (session timeout, toast)
├── lib/            # Supabase client setup
└── utils/          # PDF, print, audit log utilities

supabase/
├── COMPLETE_SETUP.sql              # Full DB setup
├── disable-email-confirmation.sql  # Auto-confirm users
└── functions/set-user-password/    # Edge function for admin password reset
```

---

## Roles

| Role    | Access |
|---------|--------|
| Student | Dashboard, inventory form, profile, mental health assessment |
| Admin   | Full access — manage students, view submissions, set passwords |

Admin accounts are flagged via `is_admin = true` in the `profiles` table.

---

## Deployment

The project includes a `vercel.json` for Vercel deployment.

```bash
npm run build
```

Make sure to add all `VITE_*` environment variables in your Vercel project settings.
