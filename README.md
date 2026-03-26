# Church Directory

A private, admin-only web app for managing your church family directory. Built with Next.js 14, Supabase, and shadcn/ui.

## Features

- **Family profiles** — photo, mailing address, notes
- **Member profiles** — headshot, name, role, bio, member since, phone, email
- **Inline editing** — edit any field directly on the profile page
- **Spreadsheet import** — drag & drop .xlsx or .csv, map columns visually, preview before importing
- **Multi-admin auth** — invite staff by email via Supabase Auth
- **Print-ready data** — structured for future PDF/print directory export

## Setup

### 1. Create a Supabase project

Go to [supabase.com](https://supabase.com) → New project.

### 2. Run the database migration

In the Supabase dashboard → SQL Editor, paste and run the contents of:

```
supabase/migrations/001_initial.sql
```

### 3. Create storage buckets

In Supabase → Storage, create two **public** buckets:
- `family-photos`
- `member-photos`

> Set both to public so images can be displayed without auth tokens.

### 4. Configure environment variables

Copy `.env.local` and fill in your values from Supabase → Settings → API:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # Keep this secret — server-only
```

### 5. Create your first admin

In Supabase → Authentication → Users → Invite user, enter your email.

### 5b. Google sign-in (optional)

1. **Google Cloud Console** — Create an OAuth 2.0 Client ID (Web application). Under **Authorized redirect URIs**, add:
   - `https://<your-project-ref>.supabase.co/auth/v1/callback`  
     (`<your-project-ref>` is the subdomain in your Supabase project URL.)

2. **Supabase** — Authentication → **Providers** → **Google**: enable and paste the **Client ID** and **Client secret**.

3. **Supabase redirect URLs** — Authentication → **URL Configuration**:
   - **Site URL**: your app origin (e.g. `http://localhost:3000` locally, or your production URL).
   - **Redirect URLs**: add:
     - `http://localhost:3000/auth/callback`
     - `https://<your-production-domain>/auth/callback`

After deploy, anyone who can complete Google OAuth gets a Supabase session. Your Row Level Security policies still gate data to the `authenticated` role; restrict who may sign in via **Supabase** (e.g. allowlist emails) if you need a closed admin set.

### 6. Run locally

```bash
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Deploy to Vercel

1. Push this folder to a GitHub repo
2. Import the repo in [vercel.com](https://vercel.com)
3. Add the three environment variables from step 4
4. Deploy

## Spreadsheet Import Format

Your spreadsheet can have columns in any order and any column names — you'll map them to fields after uploading. The required fields are:

| Field | Required |
|-------|----------|
| Family Name | ✅ |
| First Name | ✅ |
| Last Name | ✅ |
| Role (head/spouse/child/other) | — |
| Street Address | — |
| City | — |
| State | — |
| ZIP Code | — |
| Phone | — |
| Email | — |
| Member Since (YYYY-MM-DD) | — |
| Bio | — |

Each row is one person. Members with the same Family Name will be grouped into the same family.
