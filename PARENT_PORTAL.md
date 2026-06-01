# 👨‍👩‍👧 Parent Portal - Dokumentation

Das **Parent Portal** ermöglicht es Eltern, die täglichen Aktivitäten ihrer Kinder in der KiTA einzusehen und Echtzeit-Benachrichtigungen zu erhalten.

---

## Features

✅ **Login & Authentifizierung**
- Eltern melden sich mit E-Mail an
- Sichere JWT-basierte Sessions
- Rolle-basierter Zugriff (nur PARENT)

✅ **Kind-Übersicht**
- Mehrere Kinder pro Elternkonto möglich
- Kind-Informationen (Geburtstag, Allergien)
- Allergie-Warnung prominently angezeigt

✅ **Aktivitäts-Timeline**
- Tagesansicht mit allen protokollierten Aktivitäten
- Emojis für schnelle visuelle Erkennung
- Details und Notizen anzeigen
- Datumswechsel möglich (auch historische Daten ansehen)

✅ **Email-Benachrichtigungen**
- Automatische Benachrichtigung bei neuer Aktivität
- Spezielle Alert-E-Mails für HEALTH_ISSUE
- Benachrichtigungen via Resend

---

## Aktivitätstypen

Folgende Aktivitätstypen werden unterstützt:

| Emoji | Aktivitätstyp | Deutsch |
|-------|---|---|
| 🍽️ | EATING | Essen |
| 🥤 | DRINKING | Trinken |
| 🧷 | CHANGING_DIAPER | Wickeln |
| 😴 | SLEEPING | Schlafen |
| 🎨 | ACTIVITY | Beschäftigung |
| 💬 | DISCUSSION | Besprechung |
| 📝 | NOTE | Bemerkung |
| 🏥 | HEALTH_ISSUE | Gesundheitsproblem |
| 🚌 | TRIP | Ausflug |
| ❌ | ABSENT | Abwesend |
| 🎉 | HOLIDAY | Ferien |
| 🖍️ | DRAWING | Zeichnen/Foto |

---

## Architektur

### Pages & Components

```
src/app/parent/
├── page.tsx                                    # Landing Page (öffentlich)
├── layout.tsx                                  # Parent Layout
└── dashboard/
    ├── page.tsx                                # Dashboard Server Component
    └── components/
        └── ParentDashboardClient.tsx           # Client Component mit Interaktivität
```

### API Endpoints

**Für Eltern verfügbar:**

- `GET /api/activities?childId=xyz&date=2025-05-31` - Aktivitäten abrufen

**Zugriffskontrolle:**
- Eltern können NUR ihre eigenen Kinder und deren Aktivitäten sehen
- Datenbankqueries filtern automatisch nach `parent.id`

---

## Setup & Konfiguration

### 1. Umgebungsvariablen

Kopiere `.env.local.example` zu `.env.local`:

```bash
cp .env.local.example .env.local
```

Fülle diese Variablen aus:

```env
# Resend Email Service
RESEND_API_KEY="re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
RESEND_FROM_EMAIL="noreply@yourdomain.com"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"  # Production: "https://yourdomain.com"
NEXTAUTH_SECRET="generate-a-random-secret"
```

### 2. Datenbank-Migration

```bash
npx prisma db push --skip-generate
# oder
npx prisma migrate deploy
```

### 3. Test Parent erstellen

```bash
# Via Prisma Studio
npx prisma studio

# Oder via SQL
INSERT INTO "Parent" (id, email, password, "firstName", "lastName", phone)
VALUES ('parent1', 'parent@example.com', 'hashed_password', 'Max', 'Mustermann', '0791234567');

-- Link zu Kind
UPDATE "Child" SET "parents" = ARRAY['parent1'] WHERE id = 'child1';
```

### 4. App starten

```bash
npm run dev
# http://localhost:3000/parent
```

---

## Workflow für Eltern

### Schritt 1: Anmeldung
1. Öffne `/parent` oder `/auth/login?role=parent`
2. Melde dich mit E-Mail an
3. Werde weitergeleitet zu `/parent/dashboard`

### Schritt 2: Kind wählen
- Dropdown oben: Kind auswählen
- Informationen werden aktualisiert:
  - Name, Geburtstag
  - Allergien (falls vorhanden)

### Schritt 3: Aktivitäten ansehen
- **Datum wählen**: Eingabe oben
- **Aktivitäten sehen**: Timeline mit allen Einträgen
- **Details anschauen**: Hover/Click auf Aktivitäten

### Schritt 4: Abmelden
- Button oben rechts: "Abmelden"
- Session wird gelöscht

---

## Email-Benachrichtigungen

### Standard-Aktivitäts-Email

**Auslöser:** Neue Aktivität (außer HEALTH_ISSUE)

**Inhalt:**
- Emoji + Aktivitätstyp
- Kind-Name
- Zeitstempel (lokale Zeit)
- Optional: Details & Notizen
- Link zum App-Login

**Design:**
- Gradient Purple Header
- Clean White Body
- Responsive Styling

### Health Alert Email

**Auslöser:** Neue Aktivität vom Typ `HEALTH_ISSUE`

**Inhalt:**
- Red Alert-Header
- Prominente Problembeschreibung
- Aufforderung zur Kontaktaufnahme

**Styling:**
- Red/White Design
- Dringlichkeits-Signale

---

## Datenbank-Schema (Parent Portal)

```prisma
model Parent {
  id            String    @id @default(cuid())
  email         String    @unique
  password      String    // bcrypt hashed
  firstName     String
  lastName      String
  phone         String
  children      Child[]   @relation("ParentChildren")
  createdAt     DateTime  @default(now())
}

model Child {
  // ... existing fields ...
  parents       Parent[]  @relation("ParentChildren")
  activities    Activity[] @relation("ChildActivities")
  allergies     Allergy[]
}

model Activity {
  id            String    @id @default(cuid())
  childId       String
  kitaId        String
  child         Child     @relation("ChildActivities", fields: [childId], references: [id])
  kita          KiTA      @relation("KiTAActivities", fields: [kitaId], references: [id])
  type          ActivityType
  timestamp     DateTime
  details       String?
  notes         String?
  photoUrl      String?
  createdBy     String    // User ID
  createdAt     DateTime  @default(now())
}
```

---

## Sicherheit & Datenschutz

✅ **Authentifizierung**
- JWT-Tokens in HTTP-Only Cookies
- Automatische Session-Verifikation

✅ **Zugriffskontrolle**
- Eltern sehen NUR ihre eigenen Kinder
- Datenbankqueries filtern nach `parent.id`
- API validiert `session.user.id` bei jedem Request

✅ **Datenschutz**
- Keine sensiblen Daten in URLs
- Sichere Passwort-Hashing (bcrypt)
- Abmeldung löscht Session

---

## Debugging & Fehlerbehandlung

### Eltern sehen "Zugriff verweigert"
- Parent-Record existiert nicht in Datenbank
- Kontaktiere KiTA-Admin, um Parent-Account zu erstellen

### Keine Aktivitäten angezeigt
- Betreuer haben noch keine Aktivitäten protokolliert
- Überprüfe Datum (möglicherweise falsches Datum gewählt)
- Wähle aktuelles Datum: `new Date().toISOString().split('T')[0]`

### Email-Benachrichtigungen nicht erhalten
- RESEND_API_KEY nicht gesetzt oder ungültig
- E-Mail-Adresse falsch in Datenbank
- Überprüfe SPAM/Junk Folder
- Logs in `src/lib/email.ts` konsultieren

### Fehler beim Login
- Cookie-Problem: Browser Private Mode?
- Unterschiedliche Domain in NEXTAUTH_URL
- Session expired: Anmelden

---

## Roadmap & TODOs

- [ ] Push-Benachrichtigungen (Firebase Cloud Messaging)
- [ ] Foto-Galerie mit Datenschutz-Optionen
- [ ] Speiseplan-Anzeige
- [ ] Direktes Messaging mit Betreuern
- [ ] Dokument-Downloads (Abrechnung, etc.)
- [ ] Multi-Language Support (FR, IT)
- [ ] Mobile App (React Native)

---

## Kontakt & Support

Für Fragen oder Fehler:
- Öffne ein Issue im GitHub-Repo
- Kontaktiere den KiTA-Administrator
- Email: support@kita-luna.de

---

**Version:** 1.0.0  
**Letzte Aktualisierung:** Mai 2025
