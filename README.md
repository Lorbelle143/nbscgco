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


```

