# NUSwipe

AI-powered job application app for APAC university students (NUS, NTU, HKU).

Swipe right to instantly submit your application to MNC roles — powered by the Greenhouse and Lever public APIs. Swipe left to skip.

## Features
- **Swipe to Apply** — right = real application submitted; left = skip
- **Application Tracker** — kanban board (Applied / Interviewing / Offer / Rejected)
- **APAC Profile Builder** — SG/HK residency, NS status, university, resume upload

## Stack
- Next.js 16 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (Auth, PostgreSQL, Storage)
- Deployed on Vercel

## Setup
1. Clone the repo
2. Copy `.env.local.example` → `.env.local` and fill in your Supabase URL and anon key
3. Run `supabase/migrations/001_init.sql` in the Supabase SQL editor
4. Create a public `resumes` bucket in Supabase Storage (add RLS policies — see docs)
5. Run `supabase/seed.sql` to populate jobs
6. `npm install && npm run dev`
