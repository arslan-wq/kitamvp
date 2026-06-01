# KitaLuna – Deployment (Testdomain)

Stack: **Next.js 14 + Prisma + Supabase (Postgres) + Resend (E-Mail)**
Empfohlenes Hosting: **Vercel** (DB liegt bereits in der Cloud → kein Umzug nötig).

---

## 1. Code zu GitHub

Auf github.com ein **leeres privates Repo** anlegen, dann lokal:

```bash
cd /Users/olg21/Downloads/kita-app
git add -A
git commit -m "Deploy-bereit: KitaLuna"
git remote add origin https://github.com/<dein-user>/kitaluna.git
git push -u origin main
```

> `.env.local` wird **nicht** gepusht (steht in `.gitignore`). Secrets bleiben geheim.

## 2. Vercel-Projekt

1. Auf **vercel.com** mit GitHub anmelden → **Add New… → Project**
2. Das Repo importieren → Framework wird automatisch als **Next.js** erkannt
3. Build-Command/Output: Standard lassen
   (Build ist bereits `prisma generate && next build`, `postinstall` generiert den Prisma-Client)

## 3. Environment-Variablen (Settings → Environment Variables)

Werte siehe `.env.example`. Mindestens:

| Variable | Hinweis |
|----------|---------|
| `DATABASE_URL` | Supabase-Pooler (Port 6543, `?pgbouncer=true`) empfohlen |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | **https://<live-domain>** – nicht localhost! |
| `NEXT_PUBLIC_APP_URL` | gleiche Live-Domain |
| `NEXT_PUBLIC_APP_NAME` | `KitaLuna Management` |
| `RESEND_API_KEY` | aus Resend |
| `RESEND_FROM_EMAIL` | `noreply@kitaluna-app.ch` (verifizierte Domain) |
| `NEXT_PUBLIC_RESEND_DOMAIN` | `kitaluna-app.ch` |

## 4. Deploy

**Deploy** klicken → URL wie `kitaluna-xxx.vercel.app`. Testen: Login mit einem der Konten.

## 5. Eigene Testdomain (optional)

1. **Vercel → Settings → Domains** → z. B. `app.kitaluna-app.ch` hinzufügen
2. Angezeigten **CNAME/A-Record** beim Domain-Anbieter eintragen
3. `NEXTAUTH_URL` + `NEXT_PUBLIC_APP_URL` auf diese Domain setzen → **Redeploy**

---

## Wichtige Hinweise

- **`NEXTAUTH_URL` = echte Domain** (https), sonst schlägt der Login fehl.
- **Supabase + Serverless:** Connection-Pooler verwenden (Port 6543), sonst drohen „too many connections".
- **E-Mails:** Funktionieren produktiv über die verifizierte Domain. Onboarding-Links nutzen `NEXT_PUBLIC_APP_URL`.
- **Datenbank-Schema:** Bereits via `prisma db push` synchronisiert. Bei Schemaänderungen erneut pushen oder Migrations einführen.

## Vor dem echten Produktiv-Launch (offene Punkte)

- In `next.config.js` ist für den Testbetrieb `typescript.ignoreBuildErrors` + `eslint.ignoreDuringBuilds` aktiv.
  → Vor Produktion die ~28 vorbestehenden Typfehler beheben und beides wieder entfernen.
- **Nachrichten-Feature** ist datenseitig defekt (Prisma `Message`/`child`-Relation) – reparieren.
- Fehlendes Modul `@/lib/types` (in `MedicalRecordsForm`) und `firebase`-Referenz in `useNotifications` bereinigen.
- Test-Accounts (`*@test.ch`) vor Produktion entfernen/ersetzen.
