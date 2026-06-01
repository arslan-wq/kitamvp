# 🔐 OAuth Setup Anleitung für KiTA Management Software

## Google OAuth - Detaillierte Anleitung

### 📍 Schritt 1-5: Google Cloud Project erstellen

1. **Google Cloud Console öffnen**
   ```
   https://console.cloud.google.com/
   ```

2. **Neues Projekt erstellen**
   - Oben links: Klick auf "Select a project"
   - "New Project" button
   - Name: `KiTA Management`
   - Create

3. **Google+ API aktivieren**
   - APIs & Services → Enabled APIs & Services
   - "+ ENABLE APIS AND SERVICES"
   - Suche: "Google+ API"
   - ENABLE

4. **OAuth Consent Screen einrichten**
   - APIs & Services → OAuth consent screen
   - User Type: External
   - Create
   - App Name: `KiTA Management Software`
   - User Support Email: deine@email.com
   - Developer Contact: deine@email.com
   - Save and Continue (Scopes können default bleiben)

5. **OAuth 2.0 Credentials erstellen**
   - APIs & Services → Credentials
   - "+ CREATE CREDENTIALS"
   - OAuth 2.0 Client ID
   - Application type: Web application
   - Name: `KiTA Development`
   - Authorized JavaScript origins:
     ```
     http://localhost:3006
     ```
   - Authorized redirect URIs:
     ```
     http://localhost:3006/api/auth/callback/google
     ```
   - CREATE

6. **Credentials kopieren**
   - Die Popup zeigt Client ID und Secret
   - **KOPIERE:** Client ID
   - **KOPIERE:** Client Secret

---

## 🍎 Apple OAuth - Detaillierte Anleitung

### 📍 Schritt 1-5: Apple Developer Setup

1. **Apple Developer Account**
   ```
   https://developer.apple.com/account/resources/identifiers/list
   ```
   - Melde dich an (brauchst Apple ID)

2. **App ID erstellen**
   - Identifiers → "+" button
   - App IDs
   - Type: App
   - Description: `KiTA Management App`
   - Bundle ID: `com.kita-management` (reverse domain style)
   - Capabilities: "Sign in with Apple"
   - Continue → Register

3. **Service ID erstellen** (für Web)
   - Identifiers → "+" button
   - Service IDs
   - Description: `KiTA Management Web`
   - Identifier: `com.kita-management.web`
   - Continue → Register

4. **Sign in with Apple konfigurieren**
   - Service ID: `com.kita-management.web`
   - Sign in with Apple → Configure
   - Primary App ID: `KiTA Management App`
   - Web Domains:
     ```
     localhost
     yourdomain.com (später)
     ```
   - Return URLs:
     ```
     http://localhost:3006/api/auth/callback/apple
     ```
   - Save

5. **Key erstellen**
   - Keys (in Account Resources)
   - "+" button
   - Key Name: `KiTA Auth Key`
   - Check: "Sign in with Apple"
   - Continue → Register
   - **KOPIERE:** Key ID
   - **DOWNLOAD:** .p8 file (Private Key)

---

## 🚀 Credentials in .env.local eintragen

```bash
# Bearbeite die Datei:
nano /Users/olg21/Downloads/kita-app/.env.local

# ERSETZE diese Zeilen:
GOOGLE_CLIENT_ID="deine-client-id-von-google.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="deine-client-secret-von-google"

APPLE_CLIENT_ID="com.kita-management.web"
APPLE_CLIENT_SECRET="dein-key-id-von-apple"

# Speichern: Ctrl+O, Enter, Ctrl+X
```

---

## 📧 Resend Email Setup

1. **Account erstellen**
   ```
   https://resend.com/
   ```

2. **API Key generieren**
   - Dashboard
   - API Keys
   - "Create New API Key"

3. **.env.local aktualisieren**
   ```bash
   RESEND_API_KEY="re_dein-api-key-von-resend"
   ```

---

## ✅ Testen

### Terminal:
```bash
cd /Users/olg21/Downloads/kita-app

# Server neu starten
npm run dev
```

### Browser:
```
http://localhost:3006/auth/login
```

### Test-Schritte:
1. Klick auf "Google" Button → sollte zu Google-Login gehen
2. Klick auf "Apple" Button → sollte zu Apple-Login gehen
3. Normale Login mit Test-Account:
   - admin@kita.ch / Admin123456

---

## 🐛 Troubleshooting

### "Invalid Client ID" Error
- Überprüfe: Client ID endet auf `.apps.googleusercontent.com`?
- Google OAuth Consent Screen aktiviert?

### "Redirect URI mismatch"
- Überprüfe: Localhost Port 3006?
- In Google Cloud: Exact URL eingegeben?

### Email wird nicht gesendet
- Überprüfe: RESEND_API_KEY korrekt?
- Server-Log: `npm run dev` Output anschauen

---

## 📚 Weitere Ressourcen

- [Google OAuth Docs](https://developers.google.com/identity/protocols/oauth2)
- [Apple Sign in Docs](https://developer.apple.com/sign-in-with-apple/)
- [Resend Docs](https://resend.com/docs)
- [NextAuth Providers](https://next-auth.js.org/providers/)

