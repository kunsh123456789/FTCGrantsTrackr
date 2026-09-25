# FTC Grants Tracker

A website for tracking grants and sponsorships for a FIRST Tech Challenge team.
Built with Next.js, Supabase and Vercel. All three have free plans that are plenty for one team.

- **Next.js** (App Router, TypeScript, Tailwind CSS) — the website itself
- **Supabase** — the database, Google sign-in and file storage
- **Vercel** — hosts the website at a URL anyone on the team can open on a phone or laptop

> **Status:** Phase 1 of 5 — sign-in, team members and roles, team settings (name, colors, seasons), dark mode.
> The complete database is already in place for later phases.

---

## One-time setup (about 30 minutes)

You'll create three free accounts: **Supabase**, **Google Cloud** (just for the "Sign in with Google" button) and **Vercel**.
Keep a notes file open. You'll copy a few values between sites.

### 1. Put the code on a `main` branch

Vercel deploys whatever is on your repository's main branch.

1. On GitHub, open the repository → **Pull requests** (or **Branches**).
2. If there's no `main` branch yet: **Branches → New branch**, name it `main`, source `claude/gracious-galileo-guq30q`.
   Then **Settings → General → Default branch** → switch to `main`.
3. From then on, each phase comes in as a pull request into `main`. Merging it redeploys the site automatically.

### 2. Create the Supabase project

1. Go to [supabase.com](https://supabase.com) → **Start your project** → sign in with GitHub.
2. **New project**:
   - Name: `ftc-grants` (anything works)
   - Database password: click **Generate** and save it in your notes (you probably won't need it, but keep it)
   - Region: **West US (North California)**, the closest one to the Bay Area
3. Wait about 2 minutes for it to finish setting up.
4. Click **Connect** at the top of the dashboard, or go to **Project Settings → API Keys**. Copy these two values into your notes:
   - **Project URL**, like `https://abcdefghijklmno.supabase.co`
   - **Publishable key**, which starts with `sb_publishable_`. If you only see an "anon" key, that one works too.

   ⚠️ Never copy the **secret** / **service_role** key anywhere. This app doesn't need it.

### 3. Create the database tables

1. In Supabase, open **SQL Editor** (left sidebar) → **New query**.
2. Open [`supabase/migrations/0001_initial_schema.sql`](supabase/migrations/0001_initial_schema.sql) on GitHub,
   click the **copy raw file** button, paste everything into the editor and click **Run**.
3. You should see `Success. No rows returned`. Check **Table Editor**: you should see tables like `opportunities`,
   `applications` and `members`.

Only run each migration file once. Later phases may add new numbered files (`0002_...sql`), and you run just the new one.

### 4. Set up "Sign in with Google"

**a. Get the callback URL from Supabase**

In Supabase: **Authentication → Sign In / Providers → Google**. Copy the **Callback URL (for OAuth)**, like
`https://abcdefghijklmno.supabase.co/auth/v1/callback`. Leave this tab open.

**b. Create a Google OAuth client**

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and sign in with your Google account.
2. Top bar → project picker → **New project** → name it `FTC Grants` → **Create**, then make sure it's selected.
3. Search for **Google Auth Platform** (or go to **APIs & Services → OAuth consent screen**) → **Get started**:
   - App name: `FTC Grants Tracker`; support email: your email
   - Audience: **External**
   - Contact email: your email → agree → **Create**
4. **Clients → Create client**:
   - Application type: **Web application**, name: `Grants tracker`
   - **Authorized JavaScript origins**: add `http://localhost:3000`. You'll add your Vercel URL in step 6.
   - **Authorized redirect URIs**: paste the Supabase callback URL from step 4a
   - **Create**, then copy the **Client ID** and **Client secret**
5. **Audience → Publish app → Confirm**. While the app is in "Testing" mode, only people you list as test
   users can sign in. Publishing doesn't need a Google review, because the app only asks for name and email.

**c. Give the keys to Supabase**

Back in Supabase's Google provider page: turn it **on**, paste the **Client ID** and **Client secret** → **Save**.

### 5. Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) → **Sign up** → **Continue with GitHub** (choose the free Hobby plan).
2. **Add New… → Project** → find `FTCGrantsTrackr` → **Import**.
3. Open **Environment Variables** and add both:

   | Name                                   | Value                          |
   | -------------------------------------- | ------------------------------ |
   | `NEXT_PUBLIC_SUPABASE_URL`             | your Project URL from step 2   |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | your publishable (or anon) key |

4. **Deploy**. After about a minute you get a URL like `https://ftc-grants-tracker.vercel.app`. Copy it.

If you ever change an environment variable, go to **Deployments → ⋯ → Redeploy** so the change takes effect.

### 6. Tell Supabase and Google about your URL

1. **Supabase → Authentication → URL Configuration**:
   - **Site URL**: your Vercel URL, e.g. `https://ftc-grants-tracker.vercel.app`
   - **Redirect URLs** → add: `https://ftc-grants-tracker.vercel.app/**` and `http://localhost:3000/**`
2. **Google Cloud → Google Auth Platform → Clients → your client**: under **Authorized JavaScript origins**,
   add your Vercel URL → **Save**.

### 7. Sign in — you become the admin

Open your Vercel URL and click **Continue with Google**. **The first person to sign in becomes the admin**, so do this
before sharing the link. You'll see the dashboard with a short "Getting started" checklist.

Then go to **Settings** to set your team name, number, colors and this season's fundraising goal.

---

## Adding teammates, mentors and parents

There are two ways. Both happen on the **Members** page, which only admins can manage.

**Invite first (recommended):** type the person's Google account email, pick a role and click **Invite**. They get
access the moment they first sign in with that account.

**Approve after:** send them the link. When they sign in they see "Waiting for approval", and they show up at the
top of your Members page. Click **Approve as viewer** or **Approve as editor**, or **Decline**.

| Role       | Can do                                                                        |
| ---------- | ----------------------------------------------------------------------------- |
| **Viewer** | Read everything and leave comments. Good for mentors and parents.             |
| **Editor** | Everything a viewer can, plus add and edit grants, files, budget and outreach |
| **Admin**  | Everything, plus manage members and settings and delete grants                |

- You can change someone's role or remove them any time. Removed people lose access immediately. If they sign in
  again, they're back to "waiting for approval".
- The team always keeps at least one admin. To hand over the admin role, make someone else admin first.
- People must sign in with the **exact** Google account you invited. Some school Google accounts block
  outside apps. If a teammate can't sign in with their school account, have them use a personal Gmail.

---

## How the data is protected

- Every table uses Supabase **Row Level Security**. The database itself checks each request, so even someone who
  knows the URL and the publishable key gets nothing unless an admin approved their account.
- People who aren't signed in, and "waiting for approval" accounts, can't read any grant data. The only exception
  is the team name and colors, so the waiting screen can show them.
- Files will go in a **private** storage bucket (50 MB per file, 1 GB total on the free plan).
- Every change to a grant is written to an **activity log** by the database, including who made it. Nobody can
  edit or delete the log.

## Free-plan notes

- **Supabase pauses free projects after 7 days with no visits.** If the site shows errors after a quiet week (like
  summer), open the Supabase dashboard and click **Restore project**. Your data is safe. Opening the app at least
  once a week keeps it awake.
- Vercel's free Hobby plan is for non-commercial projects, which a student team tracker is.

---

## Running it on your own computer (optional)

You only need this to change the code yourself.

1. Install [Node.js](https://nodejs.org) version 20 or newer.
2. In the project folder:
   ```bash
   npm install
   cp .env.example .env.local   # then fill in the two values from step 2
   npm run dev
   ```
3. Open [http://localhost:3000](http://localhost:3000).

Useful commands:

| Command             | What it does                                     |
| ------------------- | ------------------------------------------------ |
| `npm run dev`       | Starts the site locally with live reload         |
| `npm run typecheck` | Checks the TypeScript for mistakes               |
| `npm run lint`      | Checks code style and common bugs                |
| `npm run format`    | Auto-formats the code                            |
| `npm run build`     | Builds the production version (what Vercel runs) |

### Testing the database rules

[`supabase/tests/`](supabase/tests) has a test suite that runs the migration on a plain local PostgreSQL 16 and
checks the security rules. For example, it checks that the first user becomes admin, pending users see nothing,
viewers can't edit, editors can't delete, and every change is logged.

```bash
PGHOST=localhost PGUSER=postgres supabase/tests/run.sh   # prints "ALL RLS TESTS PASSED"
```

## Project layout

```
src/
  app/
    (app)/          pages that need an approved member: dashboard, members, settings
    auth/           Google sign-in callback and sign-out
    login/          sign-in page
    pending/        "waiting for approval" page
  components/       shared UI (buttons, cards, navigation, theme toggle)
  lib/
    supabase/       Supabase clients for browser, server and proxy
    data.ts         current member, team settings, current season
  proxy.ts          runs before every page: refreshes the session, sends signed-out visitors to /login
supabase/
  migrations/       the database: tables, security rules, activity log (run in the SQL Editor)
  tests/            local tests for the security rules
```

## Roadmap

1. ✅ Setup, sign-in, roles, team settings, dark mode
2. Grants: add/edit, table view (sort, filter, search, saved presets, bulk edit), detail page, CSV import, sample data
3. Dashboard stats, Kanban pipeline, calendar and Google Calendar feed
4. Season rollover, answer library
5. Budget tracker, outreach log, sponsor recognition, CSV/Excel export, printable report, link checker
