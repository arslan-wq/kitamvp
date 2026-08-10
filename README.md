# KitaLuna — Management & Communication App for Swiss Daycare Centres

> **Handover document for the working student.** This file explains everything you
> need to run the app locally, understand it, test it, and deploy it.
> For **App Store submission**, see the separate `docs/APP_STORE_HANDOVER.md`.

- **Live app (production):** https://kitamvp.vercel.app
- **Repository:** https://github.com/arslan-wq/kitamvp
- **App language:** German (UI) · **Market:** Switzerland (revDSG, hosting in CH/EU)

---

## 1. What is KitaLuna?

A web app that lets a daycare centre (or an operator with several locations) run
its daily operations:

- **Children** management (profile, allergies, medical data, authorized pickups)
- **Occupancy planning / bookings** (care days, extra days, occupancy %)
- **Daily reports & activities** (eating, diaper changes, sleeping, trips …)
- **Menu plans**
- **Communication** with parents (messages, announcements)
- **Invoices** (automatic calculation, PDF print, Paid/Open status)
- **Multiple locations** with dedicated location logins

**4 roles:** Admin · Location lead (KITA_LEITER) · Educator (Betreuer) · Parent.
Each role only sees what it is allowed to; parents only see their own child.

---

## 2. Tech stack

| Area | Technology |
|---|---|
| Language | TypeScript (end-to-end) |
| Framework | **Next.js 14** (App Router) + React 18 |
| UI | Tailwind CSS 3, shadcn/ui-style (Radix), lucide-react icons |
| Data/state | TanStack Query v5 |
| Forms | React Hook Form + Zod |
| Auth | NextAuth v4 (email/password, bcrypt, JWT) |
| Backend | Next.js API routes (`src/app/api/*`) |
| ORM/DB | Prisma 5 · **PostgreSQL** (Supabase, Zurich region `eu-central-2`) |
| Email | Resend (invitations, notifications) |
| Hosting | **Vercel** (Frankfurt region `fra1`) |
| Tests | Vitest |

---

## 3. Local setup (step by step)

### Prerequisites
- **Node.js 20+** (https://nodejs.org)
- **npm** (ships with Node)
- **Git**
- Access to the Supabase database **or** your own PostgreSQL database

### 3.1 Clone the project & install dependencies
```bash
git clone https://github.com/arslan-wq/kitamvp.git
cd kitamvp
npm install
```

### 3.2 Create environment variables
```bash
cp .env.local.example .env.local
```
Then fill in `.env.local` (details in section 4). **Never commit this file** — it
contains secrets and is listed in `.gitignore`.

### 3.3 Generate the Prisma client
```bash
npx prisma generate
```

### 3.4 Start the development server
```bash
npm run dev
```
The app then runs on **http://localhost:3000**.

---

## 4. Environment variables (`.env.local`)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string (Supabase **pooler**, port 6543). |
| `NEXTAUTH_URL` | ✅ | Locally `http://localhost:3000`; in prod the live URL. |
| `NEXTAUTH_SECRET` | ✅ | Random secret. Generate with `openssl rand -base64 32`. |
| `RESEND_API_KEY` | ⬜ | For sending email (invitations). Without it → no emails. |
| `RESEND_FROM_EMAIL` | ⬜ | Verified sender address in Resend. |
| `NEXT_PUBLIC_SUPABASE_URL` / `…ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | ⬜ | Only needed if image uploads via Supabase Storage are used. |

> Get the real values from **Arslan** (project owner). Do not post them in chats
> or commit them to the repo.

---

## 5. Database (Supabase)

- Hosted on **Supabase**, region **Zurich (`eu-central-2`)**.
- Connection goes through the **Transaction pooler** (host
  `…pooler.supabase.com`, port `6543`).

### ⚠️ Important: the free-tier project auto-pauses
The Supabase project is currently on the **free tier** and is **auto-paused after
a few days of inactivity**. Symptoms:
- The live app loads no data.
- Error: `FATAL: (ENOTFOUND) tenant/user postgres.<ref> not found`.

**Fix:** https://supabase.com/dashboard → open the project → click **"Resume /
Restore project"** → wait 1–3 min until the status is green **"Active/Healthy"**.

> **Recommendation for testing:** while testing is ongoing, upgrade Supabase to
> the **Pro plan (~USD 25/month)** so the database doesn't drop out mid-session.

### Database commands
```bash
npx prisma generate          # generate client (after schema changes)
npx prisma migrate dev       # apply/create a migration locally
npx prisma studio            # view the DB in the browser (very handy!)
npm run db:seed              # seed test data (see section 6)
```

---

## 6. Accounts / logins

**Real locations in the database:**

| Location | Location login (KITA_LEITER) |
|---|---|
| Kita Luna Aesch | `aesch@kitaluna.ch` |
| Kita Luna Basel St. Johan | `stjohann@kitaluna.ch` |
| Kita Luna Basel Breite | `breite@kitaluna.ch` |

**Seeded test accounts** (passwords known, from `prisma/seed*`):

| Role | Email | Password |
|---|---|---|
| Admin | `admin@kita.ch` | `Admin123456` |
| Educator | `betreuer@kita.ch` | `password123` |
| Parent | `parent@example.com` | `password123` |

> The **location logins** and the **real staff accounts** (e.g.
> `dilek.kocak@kitaluna.ch`, `sara.maragliano@kitaluna.ch`) belong to real team
> members. Their passwords were set by the team, are **bcrypt-hashed and cannot
> be recovered** — ask **Arslan** for them, or reset them via Prisma Studio.

---

## 7. Available npm scripts

```bash
npm run dev        # development server (localhost:3000)
npm run build      # production build (prisma generate + next build)
npm run start      # run the built app locally
npm run lint       # ESLint
npm run test       # unit tests (Vitest)
npm run db:seed    # seed test data
```

---

## 8. Project structure

```
kitamvp/
├─ prisma/
│  ├─ schema.prisma          # data model (children, users, bookings, invoices …)
│  ├─ migrations/            # DB migrations
│  ├─ seed.js                # admin seed
│  └─ seed-test-data.ts      # rich test data
├─ src/
│  ├─ app/
│  │  ├─ page.tsx            # landing page
│  │  ├─ auth/               # login/registration
│  │  ├─ dashboard/          # staff area (see below)
│  │  ├─ parent/             # parent area
│  │  └─ api/                # backend endpoints (REST)
│  ├─ components/            # reusable UI components
│  ├─ hooks/                 # React hooks
│  └─ lib/                   # helpers (e.g. occupancy.ts = occupancy/pricing)
├─ docs/                     # requirements spec, App Store handover, etc.
├─ .env.local.example        # template for environment variables
└─ vercel.json               # hosting region (fra1 / Frankfurt)
```

**Dashboard areas** (`src/app/dashboard/`): `children`, `activities`, `billing`,
`daily-reports`, `schedule`, `meal-plans`, `messages`, `locations`, `users`,
`documents`, `medical-records`, `contracts`.

---

## 9. Deployment (Vercel)

- On every **push to `main`**, Vercel builds automatically and deploys to
  production (https://kitamvp.vercel.app).
- The region is pinned to **Frankfurt (`fra1`)** (`vercel.json`).
- **Environment variables** are set in the Vercel dashboard
  (Project → Settings → Environment Variables), **not** in the repo.

Standard flow for a change:
```bash
git add -A
git commit -m "Describe your change"
git push origin main         # triggers an automatic deployment
```

---

## 10. Test checklist (end-to-end)

1. **Login** with all 4 roles (Admin, Location lead, Educator, Parent).
2. **Access separation:** a location login only sees its own location; a parent
   only sees their own child.
3. **Core flow:** create child → desired care days / occupancy % → booking →
   extra day (request → confirm) → activity + "open today" → daily report →
   create invoice (amount, PDF, IBAN) → change status.
4. **Email:** test a parent invitation with a real address (Resend must be
   configured).
5. **Responsive:** check on phone sizes; error/empty states.

---

## 11. Known pitfalls

- **DB paused** → see section 5 (most common cause of "app won't load").
- **No emails** → `RESEND_API_KEY` missing, or the sender domain in Resend is not
  verified.
- **`.env.local` missing** → the app starts, but login/DB won't work.
- **Port 3000 in use** → another process is running; stop it or use
  `npm run dev -- -p 3001`.

---

## 12. App Store / iOS

**Important:** KitaLuna is currently a **web app (Next.js)**, not a native iOS
project. It **cannot be submitted to the App Store as-is**. The realistic path
(Capacitor wrapper) and all prerequisites (Apple Developer Program, Mac with
Xcode, privacy details, Guideline 4.2) are described in the separate document
**`docs/APP_STORE_HANDOVER.md`**.

---

## 13. Contact

- **Project owner:** Arslan — `arslan@okostudio.ch`
- Questions about the code/data model: see `CLAUDE.md` and the `docs/` folder.
