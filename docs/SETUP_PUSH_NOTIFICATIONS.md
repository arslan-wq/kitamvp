# 📲 Push-Benachrichtigungen (Firebase Cloud Messaging) - Setup Guide

Dieses Guide erklärt wie man Push-Benachrichtigungen für das Parent Portal via Firebase Cloud Messaging (FCM) einrichtet.

---

## Was sind Push-Benachrichtigungen?

📱 **Echtzeit-Alerts** statt nur E-Mails  
- Eltern sehen Benachrichtigungen in Echtzeit auf Handy, Tablet, Desktop
- Funktioniert auch wenn die App nicht offen ist
- Spezielle "Urgent"-Alerts für Gesundheitsprobleme

---

## Voraussetzungen

✅ Firebase Project erstellt  
✅ Cloud Messaging aktiviert  
✅ Service Worker kann registriert werden  

---

## Step 1: Firebase Project erstellen

### 1.1 Firebase Console öffnen

Gehe zu: https://console.firebase.google.com

Klick "+ Create Project" und:
1. **Project Name**: `kita-luna` (oder dein Projekt-Name)
2. **Analytics**: optional (deaktivierbar)
3. **Create Project**

### 1.2 Web App registrieren

Nach Project-Erstellung:
1. Klick `</>` Icon um Web App zu registrieren
2. **App nickname**: `KiTA Luna Web`
3. **Register App**

Du erhältst Firebase Config - MERKE DIESE WERTE!

```javascript
// Beispiel Config:
{
  apiKey: "AIzaSyDxxxxxxxxxxxx",
  authDomain: "project-id.firebaseapp.com",
  projectId: "project-id",
  storageBucket: "project-id.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
}
```

### 1.3 Service Account erstellen

1. Gehe zu **Project Settings** (Zahnrad Icon oben links)
2. Tab **Service Accounts**
3. Klick **Generate new private key**
4. Speichere die JSON-Datei (du brauchst sie für `.env`)

---

## Step 2: Environment Variablen

### 2.1 Firebase Config in `.env.local` eintragen

Öffne `.env.local` und update diese Variablen mit deinen Firebase-Werten:

```env
# PUSH NOTIFICATIONS (Firebase Cloud Messaging)
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'  # Komplette JSON aus Step 1.3
NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSyDxxxxxxxxxxxx"            # Aus Step 1.2
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="project-id.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="project-id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="project-id.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="123456789012"
NEXT_PUBLIC_FIREBASE_APP_ID="1:123456789012:web:..."
NEXT_PUBLIC_FIREBASE_VAPID_KEY="BDxxxxxxxxxxxxxxxxx"
```

### 2.2 VAPID Key erstellen

Der VAPID Key ist erforderlich für Web Push:

1. Firebase Console → **Cloud Messaging** Tab
2. Scroll zu **Web Configuration**
3. Falls kein Key existiert, klick **Generate Key Pair**
4. Kopiere den generierten Key in `NEXT_PUBLIC_FIREBASE_VAPID_KEY`

---

## Step 3: Dependencies installieren

```bash
npm install firebase firebase-admin
```

---

## Step 4: Service Worker registrieren

### 4.1 Service Worker aktivieren

Erstelle/update `public/service-worker.js` (siehe vorlage):

```javascript
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js');

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Handle background notifications
messaging.onBackgroundMessage(payload => {
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
  });
});
```

### 4.2 Service Worker Client-seitig registrieren

In der Parent Dashboard wird automatisch registriert mit dem `useNotifications` Hook:

```typescript
const { requestPermission } = useNotifications();

// User klickt "Enable Notifications"
await requestPermission();
// → Browser fragt nach Benachrichtigungen-Erlaubnis
// → Service Worker wird registriert
// → Device Token wird an Backend gesendet
```

---

## Step 5: Testen

### 5.1 App starten

```bash
npm run dev
```

Gehe zu: http://localhost:3000/parent/dashboard

### 5.2 Benachrichtigungen aktivieren

1. Klick **"🔔 Push-Benachrichtigungen → Aktivieren"**
2. Browser fragt nach Erlaubnis → **Erlauben**
3. Device Token wird registriert

### 5.3 Test-Benachrichtigung senden

Benachrichtigungen werden automatisch gesendet wenn:
- Betreuer eine Aktivität protokolliert → Parent erhält Push + Email
- HEALTH_ISSUE aktivität → Spezielle Alert-Benachrichtigung

Oder manuell via Firebase Console:

1. Firebase Console → **Cloud Messaging**
2. **Send your first message**
3. Fülle aus:
   - **Notification title**: `Test from KiTA`
   - **Notification text**: `Dies ist eine Test-Nachricht`
   - **Target**: Wähle Web
   - **User conditions**: Oder lassen Sie es leer
4. **Send**

Du solltest sofort eine Benachrichtigung sehen!

---

## Architektur

### Backend Flow

```
POST /api/activities (Staff logs activity)
  ↓
Activity created in DB
  ↓
For each parent:
  ├─ sendActivityNotification() → Email via Resend
  └─ sendPushNotification() → FCM via Firebase
      ├─ Query parent.deviceTokens
      ├─ Send to each registered device
      └─ Log failures
```

### Frontend Flow

```
Parent Portal
  ↓
useNotifications Hook
  ├─ Checks browser support (serviceWorker, Notification)
  ├─ Initializes Firebase
  ├─ Gets Firebase Messaging instance
  └─ Requests notification permission

User grants permission
  ├─ Get FCM token from Firebase
  ├─ POST /api/notifications/register {token}
  ├─ Register Service Worker
  └─ Listen for foreground messages

Background message arrives
  ├─ Service Worker handles (service-worker.js)
  └─ Shows notification

User clicks notification
  ├─ Opens /parent/dashboard
  └─ Service Worker focus/opens window
```

### Files Involved

```
src/
  lib/
    firebase.ts                          # Server-side FCM functions
  app/
    api/
      notifications/
        register/
          route.ts                       # Register/unregister tokens
      activities/
        route.ts                         # Modified to send push
    parent/
      dashboard/
        components/
          NotificationSettings.tsx       # UI for enabling notifications
  hooks/
    useNotifications.ts                  # Client-side hook

public/
  service-worker.js                      # Background notification handler

.env.local                               # Firebase credentials
```

---

## Häufige Probleme

### ❌ "Firebase is not defined"

**Ursache:** `useNotifications` wird auf Server-Komponente called

**Lösung:** Nutze `'use client'` directive:

```typescript
'use client';
import { useNotifications } from '@/hooks/useNotifications';
```

### ❌ Benachrichtigungen nicht ankommen

**Checkliste:**

1. ✓ Firebase-Config korrekt in `.env.local`?
2. ✓ VAPID Key gesetzt?
3. ✓ Service Worker registered? (DevTools → Application → Service Workers)
4. ✓ Notification permission granted? (Browser Einstellungen prüfen)
5. ✓ Device Token in DB? (Prisma Studio → ParentDeviceToken)
6. ✓ Logs in Firebase Console?

### ❌ Service Worker nicht registriert

**Ursache:** HTTPS nicht verfügbar oder `.serviceWorker` nicht supported

**Lösung:**
- `localhost:3000` ist OK (fallback)
- Production muss HTTPS sein
- Chrome DevTools → Application → Service Workers prüfen

### ❌ Device Token ungültig

**Ursache:** Token abgelaufen oder deaktiviert

**Lösung:**
- Firebase erneuert Tokens automatisch
- Alte Tokens werden soft-deleted (isActive = false)
- Logs zeigen wenn Token fehlschlägt

---

## Production Checklist

- [ ] Firebase Project in Production-Umgebung
- [ ] VAPID Key sicher gespeichert
- [ ] Service Account Key sicher gespeichert (nie in Git!)
- [ ] HTTPS aktiviert
- [ ] Notification Icon/Badge hochgeladen (`/icon-192x192.png`, `/badge-72x72.png`)
- [ ] Datenschutz Policy updated (Benachrichtigungen erwähnen)
- [ ] Testing mit echten Devices durchgeführt
- [ ] Error Handling & Logging funktioniert

---

## Weitere Ressourcen

- Firebase Docs: https://firebase.google.com/docs/cloud-messaging
- Web Push Docs: https://developer.mozilla.org/en-US/docs/Web/API/Push_API
- Service Worker: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API

---

**Version:** 1.0.0  
**Letzte Aktualisierung:** Mai 2025
