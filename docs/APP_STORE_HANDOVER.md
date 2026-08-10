# KitaLuna — Tech Stack & App Store Handover

_Prepared for the working student handling testing and App Store submission._

## 1. What the app is (short description)

**KitaLuna** is a management and communication platform for Swiss daycare centres
(Kitas / Horte). It lets a centre manage children, staff, attendance/booking
plans, daily reports, activities, menu plans, parent communication and billing —
across multiple locations of one operator, with strict per-tenant (per-Kita)
data separation.

**Roles:** Admin, Location lead (KITA_LEITER / "Standort"), Educator (Betreuer),
Parent. Authorization is enforced **server-side per endpoint**. Parents only ever
see their own child and content explicitly shared with them.

**Compliance context:** built for the Swiss market (revDSG / data protection).
The database is hosted in **Switzerland** (Supabase, AWS eu-central-2 / Zurich);
app compute runs in the EU (Vercel, Frankfurt).

## 2. Tech stack

| Layer | Technology |
|---|---|
| Language | TypeScript (end-to-end) |
| Framework | **Next.js 14** (App Router, React 18 Server + Client Components) |
| UI | Tailwind CSS 3, shadcn/ui-style components (Radix + class-variance-authority), lucide-react icons |
| Data fetching / state | TanStack Query (React Query) v5 |
| Forms & validation | React Hook Form + Zod (shared schemas) |
| Auth | NextAuth v4 — email/password, argon2/bcrypt hashing, JWT sessions (no US auth SaaS) |
| ORM / DB | Prisma 5 · **PostgreSQL** (Supabase) |
| Email | Resend (transactional: invitations, notifications, password reset) |
| Hosting | **Vercel** (Serverless Functions, region `fra1` / Frankfurt) |
| Database hosting | **Supabase** (PostgreSQL, region `eu-central-2` / Zurich) |
| Repo | GitHub `arslan-wq/kitamvp` · CI/CD: Vercel auto-build from `main` |
| Tests | Vitest (unit), intended Playwright (E2E) |

**Production URL:** https://kitamvp.vercel.app

## 3. IMPORTANT — this is a web app, not a native iOS app yet

KitaLuna is currently a **responsive web application (PWA-style)**. It runs in the
browser and is installable to the home screen, but there is **no native iOS
(Xcode) project and no `.ipa` build** today. Two consequences the student must
know **before** planning an App Store submission:

1. **You cannot upload a Next.js web app to App Store Connect directly.** The App
   Store only accepts native binaries (`.ipa`) built with Xcode.
2. Apple does **not** accept Progressive Web Apps into the App Store, and Apple
   **Review Guideline 4.2 ("Minimum Functionality")** frequently **rejects thin
   web-view wrappers** that just load a website.

So the realistic path is one of:

- **Option A — Capacitor wrapper (recommended, fastest):** wrap the existing web
  app in a native shell (Ionic **Capacitor**), which generates an Xcode project
  you can build and submit. To pass review 4.2, add real native value:
  native push notifications, offline handling, camera/photo access, proper app
  icon/splash, and native navigation feel — not just a full-screen web view.
- **Option B — Native / React Native rebuild:** the long-term plan (internally
  "EPIC 17"). Highest effort, best App Store fit. Not required for a first launch.
- **Interim — PWA:** parents can already "Add to Home Screen" from Safari today.
  This needs **no** App Store submission, but is not a store listing.

> Recommendation for the student: start with **Option A (Capacitor)**. Budget
> time for a possible 4.2 rejection and have the native features above ready.

## 4. Prerequisites for App Store submission

- **Apple Developer Program** membership (USD 99/year) for the Kita/operator.
- A **Mac with Xcode** (latest stable).
- **App Store Connect** access (created under the developer account).
- App metadata: name, subtitle, description (DE), keywords, category
  (Education / Business), screenshots for required device sizes, privacy policy
  URL, and a **completed App Privacy questionnaire** (the app processes children's
  and parents' personal data — declare data types & usage honestly).
- Since it handles personal data of minors, expect Apple to scrutinize the
  **privacy** and **account/login** sections; provide a working demo login for
  the reviewer.

## 5. Suggested submission steps (Option A / Capacitor)

1. Test the web app thoroughly on production (all roles, all flows).
2. Add Capacitor to the project, configure the iOS platform, point it at the
   production URL (or a bundled build), add app icon + splash.
3. Implement native push (APNs) and any camera/photo permissions with usage
   strings in `Info.plist`.
4. Open the generated project in Xcode, set bundle ID, signing team, version.
5. Archive → upload to App Store Connect → fill metadata & privacy → submit for
   review. Provide reviewer demo credentials.

## 6. Test checklist before submitting

- Login for all four roles (Admin, Location lead, Educator, Parent).
- Per-tenant isolation: a location login sees only its own location's data;
  a parent sees only their own child.
- Core flows: add child → desired care days / occupancy % → booking → extra day
  (request → confirm) → activity + "today open" → daily report (with logged
  activities) → invoice creation (auto amount, PDF, IBAN) → status change.
- Email delivery (invitations, notifications) with a real address.
- Responsive layout on phone sizes; dark mode; error/empty states.

---
_Questions on the codebase: see `CLAUDE.md` and `/docs` in the repo._
