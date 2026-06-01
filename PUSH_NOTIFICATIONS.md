# 📲 Push-Benachrichtigungen (Firebase Cloud Messaging)

Push-Benachrichtigungen ermöglichen es Eltern, **Echtzeit-Alerts** auf ihren Geräten zu erhalten - direkt wenn Staff eine Aktivität protokolliert!

---

## Features

✅ **Echtzeit-Alerts**
- Instant notification wenn Kind etwas tut (isst, trinkt, schläft, etc.)
- Funktioniert auch wenn App nicht offen ist

✅ **Spezielle Health Alerts**
- RED ALERT für Gesundheitsprobleme
- Benötigt Benutzer-Interaktion (bleibt offen bis User es sieht)

✅ **Multi-Device Support**
- Handy, Tablet, Desktop
- Multiple Devices pro Parent möglich

✅ **Smart Handling**
- Automatisches Umleiten zur App
- Service Worker kümmert sich um Background-Delivery
- Graceful Degradation (Web Push wenn verfügbar)

---

## Komponenten

### Backend

**`src/lib/firebase.ts`**
- Firebase Admin SDK initialization
- `sendPushNotification()` - Standard Activity Notifications
- `sendHealthAlertPush()` - Health Alert mit hoher Priorität
- Fehlerbehandlung & Logging

**`src/app/api/notifications/register/route.ts`**
- POST `/api/notifications/register` - Register Device Token
- DELETE `/api/notifications/register` - Unregister Token
- Parent-Authentifizierung erforderlich
- Tokens in `ParentDeviceToken` Table gespeichert

**`src/app/api/activities/route.ts`** (Modified)
- Sendet jetzt Push + Email
- Health Issues → `sendHealthAlertPush()`
- Other Activities → `sendPushNotification()`

### Frontend

**`src/hooks/useNotifications.ts`**
- React Hook für Notification-Management
- Requests browser permission
- Registers Service Worker
- Returns token + status

**`src/app/parent/dashboard/components/NotificationSettings.tsx`**
- UI Component zum Aktivieren/Deaktivieren
- Shows permission status
- Enable/Disable buttons

**`public/service-worker.js`**
- Service Worker für Background Messages
- Zeigt Benachrichtigungen auch wenn App closed ist
- Handles notification clicks (öffnet /parent/dashboard)

### Database

**`ParentDeviceToken` Model** (Prisma Schema)
- `id`: Unique identifier
- `parentId`: Foreign key zu Parent
- `token`: Firebase Cloud Messaging Token
- `userAgent`: Device Info (Browser, OS)
- `isActive`: Soft-delete flag
- Indexes auf parentId und token

---

## Setup Steps

1. **Firebase Project erstellen** (https://console.firebase.google.com)
2. **Web App registrieren** & Config kopieren
3. **Service Account Key** generieren
4. **Environment Variablen** in `.env.local` eintragen
5. **VAPID Key** generieren und eintragen
6. **npm install firebase firebase-admin**
7. **App starten** & Benachrichtigungen testen

**Vollständiges Setup-Guide:** siehe `docs/SETUP_PUSH_NOTIFICATIONS.md`

---

## Workflow

### 1. Staff logs Aktivität

```
Staff: /dashboard/activities
→ Wählt Kind, Aktivität, Zeit, Details
→ Klickt Submit
→ POST /api/activities
```

### 2. Backend sendet Notifications

```
API Handler:
├─ Activity created in DB
├─ Query all parents für dieses Kind
└─ Für jeden Parent:
   ├─ sendActivityNotification() → Email via Resend
   └─ sendPushNotification() → FCM
       ├─ Query parent's device tokens
       ├─ Send to each token
       └─ Log failures (token might be invalid)
```

### 3. Parent empfängt Notification

**Szenario A: App ist offen**
```
Browser receives message
→ Foreground listener in useNotifications
→ Shows native Notification
→ Parent sieht sofort Update in UI
```

**Szenario B: App ist geschlossen**
```
Service Worker receives message
→ Shows native notification (OS-level)
→ Parent klickt Notification
→ Service Worker öffnet /parent/dashboard
→ Parent sieht Activity in Timeline
```

---

## Sicherheit

🔐 **Authentication**
- Nur authentifizierte Parents können Tokens registrieren
- POST `/api/notifications/register` requires `session.user.email`

🔐 **Token Management**
- Tokens eindeutig pro Device
- Können any time deaktiviert werden
- Soft-delete (isActive flag) statt hard-delete

🔐 **Firebase Security**
- Server-only Private Key (nicht exposed zu Client)
- VAPID Key nur für Web Push nötig
- Tokens sind temporary & rotatable

---

## Fehlerbehandlung

Falls Push fehlschlägt (z.B. ungültiger Token):
- Error geloggt in Server-Logs
- Email wird trotzdem gesendet (fallback)
- Token wird nicht gelöscht (automatic cleanup später)
- User sieht keine Fehler (silent fallback)

---

## Debugging

### Logs prüfen

```bash
# Server-Side Logs
# Schau in Terminal wo `npm run dev` läuft
# Suche nach:
# - "Error sending push notification:"
# - "Push notification sent"
# - "Failed to register device token"
```

### DevTools prüfen

Chrome DevTools → Application Tab:
- **Service Workers**: Sollte registriert sein
- **Storage → IndexedDB → firebase**: Should have entries
- **Notification permission**: `granted` falls enabled

### Firebase Console prüfen

Firebase Console → Cloud Messaging:
- **Messages**: Zeigt sent/delivered/opened stats
- **Device tokens**: Zeigt active tokens (falls exposed in console)

### Prisma Studio prüfen

```bash
npx prisma studio
# Navigiere zu ParentDeviceToken
# Sollte entries für registrierte Devices zeigen
```

---

## FAQ

**F: Was wenn Parent hat kein Browser-Support?**
A: Hook returns `isSupported=false`. UI versteckt sich. Email funktioniert trotzdem.

**F: Was wenn Permission abgelehnt?**
A: Hook returns `isPermissionGranted=false`. Parent kann later wieder aktivieren.

**F: Multi-Device?**
A: Ja! Jeden Device mit eigenem Token. Alle Tokens werden in Datenbank gespeichert.

**F: Offline - was passiert?**
A: Service Worker queued Benachrichtigungen. Wenn online, wird delivered.

**F: Privacy - werden Tokens tracked?**
A: Nein. Tokens sind nur für Push. Parent kann jederzeit Token deaktivieren.

---

## Performance

⚡ **Schnell**
- FCM delivery: < 1 second
- Service Worker: immediate
- No impact on Activity creation time

📊 **Skalierbar**
- Firebase handles millions of messages
- Tokens soft-deleted bei Fehler
- Batch operations nicht nötig (parallel sends)

---

## Roadmap

- [ ] Topic Subscriptions (z.B. alle Parents in Room 1 subscriben)
- [ ] Notification Categories (nur Health Alerts erhalten, nicht Meals)
- [ ] Notification History im Portal
- [ ] Deep Links zu spezifischen Activities
- [ ] Notification Sounds/Vibration
- [ ] Rich Notifications mit Bilder

---

**Ready to enable push notifications?** Start with `docs/SETUP_PUSH_NOTIFICATIONS.md`
