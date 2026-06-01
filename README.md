# KiTA Management Software

Moderne, cloud-basierte Verwaltungssoftware für Kindertagesstätten in der Schweiz.

## 🚀 Schnellstart

### Voraussetzungen
- Node.js 20+ (https://nodejs.org/)
- npm oder yarn
- PostgreSQL Datenbank (lokal oder cloud wie Supabase)
- Git

### Installation

1. **Projekt klonen und Dependencies installieren**
```bash
cd kita-app
npm install
```

2. **Umgebungsvariablen einrichten**
```bash
cp .env.example .env.local
```

Dann `.env.local` mit deinen Werten ausfüllen:
- `DATABASE_URL`: PostgreSQL Connection String
- `NEXTAUTH_SECRET`: Mit `openssl rand -base64 32` generieren
- Andere Services (optional für MVP)

3. **Datenbank initialisieren**
```bash
npx prisma migrate dev --name init
```

4. **Development Server starten**
```bash
npm run dev
```

App öffnet sich auf http://localhost:3000

## 📁 Projektstruktur

```
src/
  ├── app/                 # Next.js App Router
  │   ├── api/            # API Routes
  │   ├── (auth)/         # Auth Pages
  │   └── (dashboard)/    # Main App Pages
  ├── components/         # React Components
  ├── lib/               # Utilities (Prisma, Auth, Validation)
  ├── hooks/             # Custom Hooks (React Query)
  └── types/             # TypeScript Types
prisma/
  └── schema.prisma      # Datenbank Schema
```

## 🔧 Wichtige Commands

| Command | Beschreibung |
|---------|-------------|
| `npm run dev` | Start Development Server |
| `npm run build` | Production Build |
| `npm run start` | Starte Production Server |
| `npm run lint` | ESLint Prüfung |
| `npm run test` | Unit Tests mit Vitest |
| `npx prisma studio` | Datenbank GUI |
| `npx prisma migrate dev` | Neue Migration erstellen |

## 📝 Entwicklungs-Workflow

### Git Workflow
```bash
# Feature Branch erstellen
git checkout -b feature/xyz

# Commits (Conventional Commits)
git commit -m "feat: add child management"

# PR erstellen
git push origin feature/xyz
```

### Code Quality
- **Linting**: `npm run lint` vor jedem Commit
- **Types**: Strict TypeScript - Keine `any` Types
- **Testing**: Unit Tests für Business Logic

## 🗄️ Datenbank

### Lokale PostgreSQL (Optional für MVP)
```bash
# Mit Docker
docker run --name kita-db -e POSTGRES_PASSWORD=password -d postgres:15

# Connection String
postgresql://postgres:password@localhost:5432/kita_db
```

### Cloud Alternativen
- **Supabase**: https://supabase.com (PostgreSQL + Auth)
- **Vercel Postgres**: https://vercel.com/postgres
- **Railway**: https://railway.app

## 📚 API Dokumentation

API basiert auf REST mit JSON. Alle Routes sind in `src/app/api/` dokumentiert.

### Authentifizierung
Alle Protected Routes benötigen ein gültiges JWT Token im `Authorization` Header:
```
Authorization: Bearer <token>
```

## 🧪 Testing

### Unit Tests
```bash
npm run test                 # Run all tests once
npm run test:watch          # Watch mode
npm run test:ui             # UI Dashboard
```

## 🚀 Deployment

### Vercel (Empfohlen für Next.js)
```bash
npm i -g vercel
vercel
```

### Railway oder Fly.io
Siehe deren Dokumentation für Next.js Deployment.

## 📋 MVP Checklist

Phase 1 (Woche 1-8):
- [ ] Project Setup + Auth
- [ ] Kinderverwaltung CRUD
- [ ] Belegungsplanung Basics
- [ ] UI Komponenten

Phase 1b (Woche 9-10):
- [ ] Elternkommunikation
- [ ] Benachrichtigungen
- [ ] Dokumenten-Gallery

Phase 2:
- [ ] Abrechnung
- [ ] Reports
- [ ] Mobile App

## 🐛 Debugging

### Logs anzeigen
```bash
# Terminal logs für Dev Server
npm run dev

# Datenbank queries anzeigen
DATABASE_LOG=query npm run dev
```

### Prisma Studio
```bash
npx prisma studio
# Browser öffnet sich auf http://localhost:5555
```

## 📖 Weitere Ressourcen

- [Next.js Doku](https://nextjs.org/docs)
- [Prisma Doku](https://www.prisma.io/docs)
- [NextAuth Doku](https://next-auth.js.org)
- [React Hook Form](https://react-hook-form.com)
- [TanStack Query](https://tanstack.com/query)

## 📧 Support

Bei Fragen: Siehe Development Plan in `/claude/plans/dreamy-shimmying-tarjan.md`

## 📄 Lizenz

Proprietär - KiTA Management Software
