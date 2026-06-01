# 🧪 KiTA Management Software - Test Checklist

## ✅ Implementierung Status

- [x] Location System (Room → Location Rename)
- [x] Database Schema mit 5 Meal-Optionen
- [x] Child-Location Relationship
- [x] User-Location (Staff Assignment)
- [x] ExtraDay mit `type` und `actualType` Feldern
- [x] Validierung Schemas
- [x] API Endpoints
- [x] Locations Dashboard Page
- [x] Email System konfiguriert
- [x] Production Build erfolgreich
- [x] Dev Server läuft

---

## 🧑‍💻 Manuelle Test-Schritte

### Phase 1: Anwendung & Navigation
- [ ] **Browser öffnen**: http://localhost:3000
- [ ] **Login**: Mitgliedername und Passwort eingeben
- [ ] **Dashboard sehen**: Willkommen-Seite mit Modulen
- [ ] **Navigation**: "📍 Standorte & Gruppen" anklicken

### Phase 2: Location Management
- [ ] **Location erstellen**:
  - Klick auf "Neue Location hinzufügen"
  - Name eingeben: z.B. "Bärenzimmer"
  - Kapazität: z.B. 15
  - Altersgruppe: z.B. "2-3 Jahre"
  - Speichern
- [ ] **Location in Liste sehen**: Mit Kapazität und Progress-Bar
- [ ] **Location Details**: Kinder und Personal anzeigen

### Phase 3: Child Management mit Location
- [ ] **Kind erstellen**:
  - Gehe zu "👶 Kinderverwaltung"
  - Klick "Kind hinzufügen"
  - Vorname: z.B. "Anna"
  - Nachname: z.B. "Schmidt"
  - Geburtsdatum: z.B. "2021-05-15"
  - **Standort zuordnen**: "Bärenzimmer" auswählen (WICHTIG!)
  - Eltern-Email: z.B. "anna@example.com"
  - Speichern
- [ ] **Kind in Location sehen**: Gehe zurück zu Locations
- [ ] **Email-Benachrichtigung**: Log überprüfen (siehe unten)

### Phase 4: ExtraDay Booking (5 Meal Types)
- [ ] **ExtraDay buchen**:
  - Navigiere zu "📅 Belegungsplanung"
  - Wähle ein Kind aus
  - Klick "ExtraDay buchen"
- [ ] **Type 1 testen**: "FULL_DAY" (Ganztägig)
  - Buchen und speichern
- [ ] **Type 2 testen**: "MORNING_WITH_MEAL" (Vormittag mit Essen)
  - Buchen und speichern
- [ ] **Type 3 testen**: "MORNING_NO_MEAL" (Vormittag ohne Essen)
  - Buchen und speichern
- [ ] **Type 4 testen**: "AFTERNOON_WITH_MEAL" (Nachmittag mit Essen)
  - Buchen und speichern
- [ ] **Type 5 testen**: "AFTERNOON_NO_MEAL" (Nachmittag ohne Essen)
  - Buchen und speichern
- [ ] **ExtraDay in Kalender sehen**: Alle booked types anzeigen

### Phase 5: Role-Based Access (Berechtigungen)
- [ ] **Eltern-Ansicht**:
  - Logout
  - Login als Eltern-Benutzer
  - Können NUR ihre eigenen Kinder sehen? ✓
  - Können andere Kinder sehen? (sollte Nein sein) ✗
- [ ] **Betreuer-Ansicht**:
  - Login als Betreuer
  - Können Kinder ihrer Location sehen? ✓
  - Können Kinder anderer Locations sehen? (sollte Nein sein) ✗
- [ ] **Admin-Ansicht**:
  - Login als Admin
  - Können ALLE Kinder und Locations sehen? ✓

### Phase 6: Email Notifications
- [ ] **Check Server Logs**: 
  ```bash
  tail -50 ~/.pm2/logs/kita-0.log 2>/dev/null | grep -i email
  ```
  - Sollte "Sending parent invitation" oder ähnlich zeigen
- [ ] **Email Domains**:
  - ✓ Resend konfiguriert
  - ⚠️ Test-Domain: arslan@okostudio.ch (funktioniert)
  - ⚠️ Andere Emails: Brauchen verifizierte Domain in Resend

### Phase 7: Data Persistence
- [ ] **Erstelle Location**
- [ ] **Refresh Browser** (F5)
- [ ] **Location noch sichtbar?** ✓
- [ ] **Erstelle ExtraDay**
- [ ] **Refresh Browser**
- [ ] **ExtraDay noch sichtbar?** ✓

---

## 🔍 Troubleshooting

### Problem: "Location nicht sichtbar"
→ Überprüfe: Role-Based Access, Locations werden korrekt zur DB gespeichert

### Problem: "ExtraDay Type zeigt nicht alle Optionen"
→ Überprüfe: Validierung Schema in `src/lib/validation.ts`

### Problem: "Email wird nicht versendet"
→ Überprüfe: 
```bash
tail -100 /Users/olg21/.pm2/logs/kita-0.log | grep -A 5 "sendParentInvitation"
```

### Problem: "Kind-Location Zuordnung funktioniert nicht"
→ Überprüfe: POST `/api/children` akzeptiert `locationId`

---

## 📋 Test Results Template

```
Test Datum: ___________
Tester: ______________

✅ = Passed
⚠️  = Issue Found
❌ = Failed

Navigation:       [ ]
Location Create:  [ ]
Child + Location: [ ]
ExtraDay Type 1:  [ ]
ExtraDay Type 2:  [ ]
ExtraDay Type 3:  [ ]
ExtraDay Type 4:  [ ]
ExtraDay Type 5:  [ ]
Role-Based Access [ ]
Email Sent:       [ ]
Data Persists:    [ ]

Issues Found:
_______________________________
_______________________________
_______________________________
```

---

## 🚀 Next Steps After Testing

1. **Bug Fixes** (falls Probleme gefunden)
2. **Email Domain Verification** (für Produktion)
3. **Performance Testing** (unter Last)
4. **Deployment** (zu Staging/Produktion)

