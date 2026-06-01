# 🧪 KiTA Management - Complete Test Workflow

**Zeitaufwand:** ~15 Minuten  
**Ziel:** Alle Features validieren von Admin → Email → Parent

---

## 📋 Test Checklist

### Test 1: Admin Login ✓ oder ✗

```
1. Öffne: http://localhost:3006/auth/login
2. Gib ein:
   - Email: admin@kita.ch
   - Password: Admin123456
3. Klick: "✅ Anmelden"

✅ Erwartet: Redirect zu /dashboard
❌ Problem: "Invalid credentials" → Seed-Script nicht gelaufen?
   → Lösung: node prisma/seed.js
```

### Test 2: Kind erstellen mit Parent-Email ✓ oder ✗

```
1. Du bist eingeloggt als Admin
2. Gehe zu: Kinderverwaltung
3. Klick: "Kind hinzufügen"
4. Fülle aus:
   - Vorname: "Max"
   - Nachname: "Mustermann"
   - Geburtsdatum: "01.01.2020"
   - Eltern Email: "testparent@gmail.com"  ← WICHTIG: echte Email!
5. Klick: "Kind hinzufügen & Email senden"

✅ Erwartet:
   - Kind wird erstellt
   - Erfolgs-Nachricht zeigt: "Email an testparent@gmail.com gesendet"
   - (Wenn RESEND_API_KEY gesetzt: Email kommt an)

❌ Problem: Fehler beim Erstellen
   → Check Server-Logs: npm run dev output
   
❌ Problem: Email wird nicht gesendet
   → RESEND_API_KEY nicht gesetzt?
   → Überprüfe .env.local: RESEND_API_KEY=re_xxx
```

### Test 3: Parent erhält Email ✓ oder ✗

```
1. Überprüfe deine Emails (Gmail/Outlook/etc)
   - Sender: noreply@kita-pro.ch
   - Subject: "Willkommen zu KiTA Pro!"

✅ Erwartet:
   - Email mit 3-Schritt Anleitung
   - "Profil vervollständigen" Button
   - Temp-Passwort sichtbar

❌ Problem: Email kommt nicht an
   Mögliche Gründe:
   - RESEND_API_KEY nicht gesetzt
   - Domain nicht verifiziert in Resend
   - Landet in Spam-Ordner
   
   Lösung:
   1. Check Resend Dashboard: https://resend.com/
   2. Überprüfe Spam-Ordner
   3. Teste mit +test Alias: testparent+test@gmail.com
```

### Test 4: Parent Profil vervollständigen ✓ oder ✗

```
1. Klick auf Email-Button: "Profil vervollständigen"
   (oder navigiere zu: http://localhost:3006/parent/complete-profile?email=testparent@gmail.com)

2. Fülle Formular:
   - Vorname: "Test"
   - Nachname: "Parent"
   - Telefon: "0791234567"
   - Passwort: "MySecurePassword123!"
   - Passwort wiederholen: "MySecurePassword123!"

3. Klick: "Profil abschließen"

✅ Erwartet:
   - Auto-Login
   - Redirect zu /daily-reports
   - Parent Dashboard zeigt das Kind

❌ Problem: Formular-Fehler
   - Passwörter stimmen nicht überein?
   - Passwort zu kurz? (Min 8 Zeichen)
   
❌ Problem: "Email nicht gefunden"
   - Parent wurde nicht erstellt beim Kind-Anlegen
   - Überprüfe Server-Logs
```

### Test 5: Parent kann Kinder sehen (read-only) ✓ oder ✗

```
1. Du bist als Parent eingeloggt
2. Klick: "Meine Kinder" im Menu
3. Siehst du "Max Mustermann"?

✅ Erwartet:
   - Kind wird angezeigt
   - Geburtsdatum sichtbar
   - Button: "Details ansehen"
   - Button: "📋 Tagesberichte"
   - Button: "📅 Zusatztage"

❌ Problem: Kind nicht sichtbar
   - Wurde Parent wirklich mit Kind verlinkt?
   - Check Datenbank: SELECT * FROM Parent WHERE email='testparent@gmail.com';

4. Klick: "Details ansehen"

✅ Erwartet:
   - Kind-Details Seite
   - Persönliche Informationen (read-only)
   - Keine Edit-Buttons!
   - Keine Delete-Buttons!
   
❌ Problem: Edit/Delete Buttons sichtbar
   - Das sollte nicht sein! Permission-Check fehlt?
```

### Test 6: Parent KANN NICHT editieren (Security Check) ✓ oder ✗

```
WICHTIG: Das ist ein Security-Test!

1. Öffne Browser-Konsole (F12)
2. Tippe (als Parent):

fetch('/api/children/[KIND_ID]', {
  method: 'PUT',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({firstName: 'Hacked'})
})

✅ Erwartet:
   - Response: 403 Forbidden
   - Message: "Parents cannot edit child data"

❌ Problem: 200 OK oder Erfolgsmeldung
   - SICHERHEITS-LÜCKE! Kind wurde editiert
   - Überprüfe /api/children/[id]/route.ts PUT-Handler
```

### Test 7: OAuth Buttons sichtbar ✓ oder ✗

```
1. Öffne: http://localhost:3006/auth/login

✅ Erwartet auf Login-Seite:
   - "🔵 Google" Button (links)
   - "🍎 Apple" Button (rechts)
   - Buttons sind klickbar

❌ Problem: Buttons nicht sichtbar
   - Check: Wurde login/page.tsx aktualisiert?
   - npm run dev neustarten?

2. Klick auf Google Button

✅ Wenn GOOGLE_CLIENT_ID gesetzt:
   - Google Login-Popup öffnet sich
   
❌ Wenn GOOGLE_CLIENT_ID NICHT gesetzt:
   - Error: "Invalid OAuth Client ID"
   - Das ist OK für diese Phase!
   - Muss erst Google Credentials holen
```

### Test 8: Admin KANN Kinder editieren ✓ oder ✗

```
1. Logout als Parent
2. Login als Admin: admin@kita.ch / Admin123456
3. Gehe zu: Kinderverwaltung
4. Klick auf ein Kind: "Max Mustermann"
5. Klick: "Bearbeiten"

✅ Erwartet:
   - Edit-Formular öffnet sich
   - Kann Daten ändern
   - Klick: "Speichern" → erfolg

❌ Problem: Keine Edit-Option
   - Admin sollte immer editieren können!
   - Check Admin-Rechte?
```

---

## 🎯 Test Summary

Nach allen 8 Tests solltest du haben:

| Test | Result | Notes |
|------|--------|-------|
| 1. Admin Login | ✅ oder ❌ | |
| 2. Kind erstellen | ✅ oder ❌ | |
| 3. Email erhalten | ✅ oder ⏭️ | (Optional ohne RESEND_API_KEY) |
| 4. Profil vervollständigen | ✅ oder ❌ | |
| 5. Parent sieht Kind | ✅ oder ❌ | |
| 6. Parent KANN NICHT editieren | ✅ | **Sicherheit!** |
| 7. OAuth Buttons sichtbar | ✅ | |
| 8. Admin kann editieren | ✅ oder ❌ | |

---

## 🐛 Troubleshooting

### Server startet nicht
```bash
pkill -9 -f "node.*next"
npm run dev
```

### "Unauthorized" bei API-Calls
```bash
# Das ist NORMAL! NextAuth verlangt Session
# Login zuerst via Browser
```

### Database-Fehler
```bash
# Reset database:
npm run db:reset
npm run prisma seed
```

### RESEND_API_KEY nicht funktioniert
```bash
# 1. Überprüfe .env.local
RESEND_API_KEY="re_xxx"

# 2. Server neu starten
pkill -9 -f "node.*next"
npm run dev

# 3. Überprüfe Resend Dashboard auf Errors
```

---

## ✨ Success Criteria

Wenn alle 8 Tests ✅ sind:
- Parent-Onboarding funktioniert Ende-zu-Ende
- Sicherheits-Checks sind aktiv
- OAuth-Integration ist bereit
- Email-System ist vorbereitet

Glückwunsch! 🎉

