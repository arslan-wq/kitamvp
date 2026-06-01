# 🧑‍💻 KiTA Management Software - Test Benutzer & Login Daten

## ✅ System Status
- **Dev Server**: Läuft auf http://localhost:3000
- **Datenbank**: PostgreSQL
- **Email-System**: Resend konfiguriert mit Domain kitaluna-app.ch
- **Authentifizierung**: NextAuth.js

---

## 👤 Test Benutzer Anmeldedaten

### 1️⃣ ADMIN - Vollständiger Zugriff
```
Email:     admin@test.ch
Passwort:  AdminTest123!
Rolle:     ADMIN
Zugriff:   Alle Features, alle Kinder, alle Locations
```

### 2️⃣ KITA-LEITER - Führungsrolle
```
Email:     leiter@test.ch
Passwort:  BetreuerTest123!
Rolle:     KITA_LEITER
Zugriff:   Standorte erstellen/bearbeiten, Personalverwaltung, Reports
```

### 3️⃣ BETREUER - Tägliche Betreuung
```
Email:     betreuer@test.ch
Passwort:  BetreuerTest123!
Rolle:     BETREUER
Zugriff:   Nur eigene Standort-Kinder sehen, Check-In/Check-Out
```

### 4️⃣ ELTERN - Kinderportale
```
Email:     eltern@test.ch
Passwort:  ElternTest123!
Rolle:     PARENT
Zugriff:   Nur eigene Kinder, ExtraDay buchen, Nachrichten, Reports
Test-Kind: Tim Testuser (geb. 15.05.2020)
```

---

## 🧪 Test-Szenarien

### Szenario 1: Als Admin - Alles konfigurieren ✅
1. **Login** mit admin@test.ch
2. **Gehe zu** Dashboard → 📍 Standorte & Gruppen
3. **Erstelle Location**: "Bärenzimmer"
   - Kapazität: 15
   - Altersgruppe: 2-3 Jahre
4. **Erstelle Location**: "Schmetterlingsgruppe"
   - Kapazität: 12
   - Altersgruppe: 3-4 Jahre
5. **Gehe zu** 👥 Betreuer-Verwaltung
6. **Zuweise Betreuer** zu Locations

### Szenario 2: Als KITA-Leiter - Standorte verwalten ✅
1. **Login** mit leiter@test.ch
2. **Gehe zu** 📍 Standorte
3. **Bearbeite Location**: Tim's Kapazität ändern
4. **Gehe zu** 👶 Kinderverwaltung
5. **Erstelle neues Kind**: "Anna Schmidt"
   - Standort: Bärenzimmer
   - Eltern-Email: anna@test.ch
6. **Überprüfe**: Ist Tim der Location zugeordnet?

### Szenario 3: Als BETREUER - Tägliche Arbeit ✅
1. **Login** mit betreuer@test.ch
2. **Gehe zu** Dashboard
3. **Überprüfe**: Sehe ich nur Tim (meine Location)?
4. **Gehe zu** 📅 Belegungsplanung
5. **Check-In** für Tim:
   - Uhrzeit: 08:30
6. **Check-Out** für Tim:
   - Uhrzeit: 16:30

### Szenario 4: Als ELTERN - Kind & ExtraDay Booking ✅
1. **Login** mit eltern@test.ch
2. **Gehe zu** 👶 Meine Kinder
3. **Überprüfe**: Sehe ich nur Tim?
4. **Gehe zu** 📅 Belegungsplanung
5. **Buche ExtraDay** für Tim - **ALLE 5 TYPEN TESTEN**:
   - ☐ FULL_DAY (Ganztägig)
   - ☐ MORNING_WITH_MEAL (Vormittag mit Essen)
   - ☐ MORNING_NO_MEAL (Vormittag ohne Essen)
   - ☐ AFTERNOON_WITH_MEAL (Nachmittag mit Essen)
   - ☐ AFTERNOON_NO_MEAL (Nachmittag ohne Essen)

### Szenario 5: Email-Versand testen ✅
1. **Erstelle neues Kind** als ADMIN/LEITER:
   - Name: "Lena Mustermann"
   - Eltern-Email: **DEINE ECHTE EMAIL** (z.B. deine@email.ch)
2. **Überprüfe Email**:
   - Du solltest eine Einladungs-Email erhalten
   - Von: noreply@kitaluna-app.ch
   - Mit temporärem Passwort

---

## 🔐 Berechtigungen - Was kann jede Rolle sehen?

| Feature | Admin | Leiter | Betreuer | Eltern |
|---------|-------|--------|----------|--------|
| Alle Kinder | ✅ | ✅ | ❌ (nur eigene Location) | ❌ (nur eigene) |
| Alle Locations | ✅ | ✅ | ✅ (nur eigene) | ❌ |
| Standort erstellen | ✅ | ✅ | ❌ | ❌ |
| Check-In/Out | ✅ | ✅ | ✅ | ❌ |
| ExtraDay buchen | ✅ | ✅ | ✅ | ✅ |
| Betreuer verwalten | ✅ | ✅ | ❌ | ❌ |
| Dashboard | ✅ | ✅ | ✅ | ✅ |

---

## 📋 Test-Checkliste

### Phase 1: Login & Navigation
- [ ] Admin Login funktioniert
- [ ] Leiter Login funktioniert
- [ ] Betreuer Login funktioniert
- [ ] Eltern Login funktioniert
- [ ] Dashboard zeigt korrekte Module

### Phase 2: Berechtigungen
- [ ] Admin sieht alle Kinder
- [ ] Leiter sieht alle Kinder
- [ ] Betreuer sieht nur Kinder seiner Location
- [ ] Eltern sehen nur ihre eigenen Kinder
- [ ] Betreuer kann Check-In/Out
- [ ] Eltern können ExtraDay buchen

### Phase 3: Location Management
- [ ] Admin kann Locations erstellen
- [ ] Leiter kann Locations erstellen
- [ ] Betreuer kann Locations nicht erstellen
- [ ] Location zeigt Kapazität und Progress-Bar
- [ ] Location zeigt Kinder-Liste
- [ ] Location zeigt Betreuer-Liste

### Phase 4: Child Management
- [ ] Kinder können erstellt werden
- [ ] Kinder können zu Location zugeordnet werden
- [ ] Parent Invitation Email wird versendet
- [ ] Kind zeigt Parent-Informationen
- [ ] Kind zeigt zugewiesene Location

### Phase 5: ExtraDay - Alle 5 Meal-Typen
- [ ] FULL_DAY kann gebucht werden
- [ ] MORNING_WITH_MEAL kann gebucht werden
- [ ] MORNING_NO_MEAL kann gebucht werden
- [ ] AFTERNOON_WITH_MEAL kann gebucht werden
- [ ] AFTERNOON_NO_MEAL kann gebucht werden
- [ ] ExtraDay zeigt korrekten Typ an
- [ ] ExtraDay kann bearbeitet werden
- [ ] ExtraDay kann storniert werden

### Phase 6: Email-System
- [ ] Resend Domain ist konfiguriert (kitaluna-app.ch)
- [ ] Parent Invitation Email wird versendet
- [ ] Email wird an richtige Adresse versendet
- [ ] Email enthält temporäres Passwort
- [ ] Eltern können sich mit Passwort anmelden

### Phase 7: Daten-Persistenz
- [ ] Erstellte Locations bleiben nach Refresh
- [ ] Erstellte Kinder bleiben nach Refresh
- [ ] Erstellte ExtraDays bleiben nach Refresh
- [ ] User-Zuordnungen bleiben nach Refresh

---

## 🐛 Troubleshooting

### Problem: "Passwort ist falsch"
→ Kopiere exakt aus dieser Datei (case-sensitive!)

### Problem: "Child zeigt keine Location"
→ Überprüfe: Bei Child-Erstellung wurde Standort ausgewählt?

### Problem: "ExtraDay Type zeigt nicht alle Optionen"
→ Server neustarten: `npm run dev`

### Problem: "Email wird nicht versendet"
→ Überprüfe: `tail -50 /tmp/kita-dev.log | grep -i email`

### Problem: "Betreuer sieht Kinder von anderer Location"
→ Überprüfe: Betreuer hat `locationId` zugewiesen?

---

## 📞 Support

Bei Problemen:
1. Dev Server neustarten: `npm run dev`
2. Browser-Cache löschen (Strg+Shift+Entf)
3. Logs überprüfen: `/tmp/kita-dev.log`
4. Datenbank Status: `node test-db.js`

