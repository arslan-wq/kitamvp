# 🚀 Parent Portal - Setup Guide

Dieser Guide zeigt dir Schritt für Schritt, wie du das Parent Portal zum Laufen bringst.

---

## Voraussetzungen

✅ Datenbank-Migrations abgeschlossen (aus Phase 1)  
✅ Activity Logger funktioniert (Staff kann Aktivitäten protokollieren)  
✅ Resend API Key vorhanden

---

## Schritt 1: Environment Variablen

### 1.1 `.env.local` aktualisieren

Öffne deine `.env.local` und füge diese Variablen hinzu (oder aktualisiere sie):

```env
# Parent Portal Access
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-random-secret-here"

# Email Notifications (Resend)
RESEND_API_KEY="re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
RESEND_FROM_EMAIL="noreply@yourdomain.com"
```

### 1.2 Resend API Key besorgen

Falls du noch keinen hast:

1. Gehe zu https://resend.com
2. Registriere dich (kostenlos)
3. Erstelle ein Projekt
4. Kopiere den API Key
5. Füge ihn in `.env.local` ein

### 1.3 App neustarten

```bash
npm run dev
```

Der Server sollte automatisch die neuen Umgebungsvariablen laden.

---

## Schritt 2: Parent-Konten erstellen

### 2.1 Via Prisma Studio (einfach)

```bash
npx prisma studio
```

Dann:
1. Navigiere zu `Parent` Tabelle
2. Klick "+ Add record"
3. Fülle folgende Felder aus:
   - **email**: `parent@example.com`
   - **firstName**: `Max`
   - **lastName**: `Mustermann`
   - **phone**: `079 123 45 67`
   - **password**: `(wird später gehashed)`

4. Speichern und die neue Parent ID kopieren (z.B. `clxyz123...`)

### 2.2 Parent zu Kind verknüpfen

Im selben Prisma Studio:

1. Navigiere zu `Child` Tabelle
2. Wähle ein Kind aus (z.B. `Alice Müller`)
3. Scroll zu `parents` Feld
4. Füge die Parent ID aus Schritt 2.1 hinzu
5. Speichern

### 2.3 Oder: Via SQL

Falls du SQL bevorzugst:

```sql
-- 1. Parent erstellen
INSERT INTO "Parent" (id, email, password, "firstName", "lastName", phone, "createdAt")
VALUES (
  'parent_' || substr(md5(random()::text), 1, 12),
  'parent@example.com',
  'placeholder', -- Password wird später gehashed
  'Max',
  'Mustermann',
  '079 123 45 67',
  NOW()
);

-- 2. Parent zu Kind verknüpfen
UPDATE "Child"
SET "parents" = array_append("parents", 'parent_xyz123')  -- ersetze mit real Parent ID
WHERE "firstName" = 'Alice' AND "lastName" = 'Müller';
```

---

## Schritt 3: Parent Portal testen

### 3.1 Login-Seite aufrufen

Öffne: http://localhost:3000/parent

Du solltest sehen:
- **Willkommen-Seite** mit Features
- **"Als Elternteil anmelden"** Button

### 3.2 Login versuchen

1. Klick "Als Elternteil anmelden"
2. Email: `parent@example.com`
3. Passwort: (auf der Konsole prüfen, falls ein Fehler kommt)

**Problem: Passwort-Hash fehlt?**
- Parent-Konten benötigen gehashte Passwörter
- Verwende einen Passwort-Hash-Generator oder ein Script

### 3.3 Parent-Dashboard testen

Nach erfolgreichem Login solltest du sehen:
- Kind in Dropdown aufgelistet
- Kind-Informationen (Geburtstag, Allergien)
- Heute's Aktivitäten angezeigt
- Datumswechsel möglich

---

## Schritt 4: Staff-Seite aktivitäten testen

Damit Eltern etwas zu sehen bekommen, müssen Betreuer zunächst Aktivitäten protokollieren.

### 4.1 Betreuer-Account verwenden

1. Logout aus Parent Account
2. Melde dich als BETREUER/ADMIN an
3. Gehe zu `/dashboard/activities`

### 4.2 Aktivitäten für das Kind protokollieren

1. **Kind auswählen**: Das Kind, das auch mit dem Parent verknüpft ist
2. **Aktivität wählen**: Z.B. "🍽️ Essen"
3. **Zeit**: Jetzt oder vor kurzer Zeit
4. **Details**: Z.B. "Porridge mit Milch"
5. **Submit**: Aktivität wird erstellt
6. **Email-Benachrichtigung**: Parent sollte eine E-Mail erhalten

### 4.3 Parent Email prüfen

Überprüfe die Mailbox des Parent:
- Betreff: `🍽️ Alice Müller: Essen um 10:23`
- Inhalt: Aktivitätsdetails + Link zum Login

Wenn die E-Mail NICHT ankommt, schau nach:
- RESEND_API_KEY gültig?
- RESEND_FROM_EMAIL korrekt?
- Spam-Folder prüfen

---

## Schritt 5: Allergie-Daten hinzufügen (optional)

Um Allergie-Warnung im Parent Portal zu testen:

### Via Prisma Studio:

1. Navigiere zu `Allergy` Tabelle
2. Klick "+ Add record"
3. Fülle aus:
   - **childId**: Kind-ID
   - **allergen**: `Nussallergie`
   - **severity**: `SEVERE`
   - **notes**: `Erdnüsse und Baumnüsse`

4. Speichern

### In Parent Portal:

1. Melde dich wieder als Parent an
2. Wähle das Kind
3. **Du solltest jetzt sehen**: "⚠️ Allergien: Nussallergie (SEVERE)"

---

## Schritt 6: Deployment vorbereiten

Bevor du zum Production gehst:

### 6.1 Passwort-Hashing

Statt Plaintext-Passwörter brauchst du bcrypt-gehashte:

```bash
npm install bcryptjs
```

Erstelle ein Script (`scripts/hash-password.js`):

```javascript
const bcrypt = require('bcryptjs');

const password = process.argv[2];
if (!password) {
  console.error('Usage: node scripts/hash-password.js "password"');
  process.exit(1);
}

bcrypt.hash(password, 10, (err, hash) => {
  if (err) throw err;
  console.log('Hashed:', hash);
});
```

Dann:
```bash
node scripts/hash-password.js "parent-password-123"
```

Nutze den Output als `password` in der Parent-Tabelle.

### 6.2 NEXTAUTH_SECRET setzen

```bash
# Generiere einen zufälligen Secret
openssl rand -base64 32
```

Kopiere das Ergebnis in `.env.local`:
```env
NEXTAUTH_SECRET="KZGjCg4qMt..."
```

### 6.3 NEXTAUTH_URL anpassen

Für Production:
```env
NEXTAUTH_URL="https://yourdomain.com"  # Nicht localhost!
```

---

## Häufige Probleme & Lösungen

### ❌ "Zugriff verweigert" beim Parent Login

**Ursache:** Parent-Record existiert nicht

**Lösung:**
```sql
SELECT * FROM "Parent" WHERE email = 'parent@example.com';
```
Falls leer, Parent erstellen (siehe Schritt 2)

### ❌ Falsche Seite nach Login

**Ursache:** NEXTAUTH_URL nicht korrekt

**Lösung:** Prüfe `.env.local`:
```env
# Richtig:
NEXTAUTH_URL="http://localhost:3000"

# Falsch:
NEXTAUTH_URL="http://localhost:3000/"  # Kein Slash am Ende!
```

### ❌ Email nicht ankommen

**Ursachen & Lösungen:**

1. **RESEND_API_KEY nicht gesetzt**
   ```bash
   echo $RESEND_API_KEY  # sollte nicht leer sein
   ```

2. **API Key ungültig**
   - Prüfe auf https://resend.com ob Key aktiv ist

3. **RESEND_FROM_EMAIL nicht verifiziert**
   - Bei Resend: "Domain" Seite prüfen
   - Email-Domain muss verifiziert sein

4. **Logs prüfen**
   ```bash
   # Im Server Output schauen nach:
   # "Error sending activity notification:"
   # dann Error-Details
   ```

### ❌ Aktivitäten nicht angezeigt

**Ursachen & Lösungen:**

1. **Kind nicht mit Parent verknüpft**
   ```sql
   SELECT * FROM "Child" WHERE id = 'childid';
   -- parents Feld sollte Parent-IDs enthalten
   ```

2. **Falsch Datum**
   - Betreuer haben Activity für anderes Datum erstellt

3. **Kind-ID falsch**
   - Vergleiche in beiden Konten die Kind-ID

---

## Nächste Schritte

✅ Parent Portal ist am Laufen!

Mögliche nächste Features:

1. **Push-Benachrichtigungen** (Firebase Cloud Messaging)
   - Statt nur E-Mail auch App-Benachrichtigungen
   
2. **Foto-Galerie**
   - Betreuer können Fotos mit Aktivitäten hochladen
   
3. **Direktes Messaging**
   - Eltern ↔ Betreuer Chat in der App
   
4. **Speiseplan**
   - Tägliche Speisen-Übersicht für Eltern

---

## Debugging-Tipps

### Server-Logs prüfen

```bash
# Terminal wo `npm run dev` läuft
# Schau nach Errors bei:
# - Activity POST
# - Email sending
# - Parent login
```

### Datenbank State prüfen

```bash
npx prisma studio

# Schau:
# 1. Parent exists?
# 2. Child.parents contains Parent ID?
# 3. Activity exists for Child?
# 4. Activity.timestamp is today?
```

### Network Requests prüfen

Browser DevTools (F12):
```
Network Tab → Filter auf "api/activities"
→ POST Request klick → Prüfe Response
```

---

**Setup komplett!** 🎉

Weitere Fragen? Schau PARENT_PORTAL.md an oder öffne ein GitHub Issue.
