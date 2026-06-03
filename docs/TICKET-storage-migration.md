# TICKET: Bilder & Dateien nach Supabase Storage auslagern (statt Base64 in DB)

**Priorität:** Hoch (größter Skalierungs-Hebel bei vielen Usern)
**Aufwand:** ~2–3 Dev-Tage · **Risiko:** mittel · **Reversibel:** ja
**Bester Zeitpunkt:** JETZT — aktuell nur 4 Bilder in der DB (Test), Migration trivial.

---

## Problem (Ist-Zustand)
Bilder/Dateien liegen als **Base64-Data-URL** in Postgres-`TEXT`-Spalten:

| Tabelle.Feld | Inhalt |
|---|---|
| `Child.photoUrl` | Kind-Profilfoto |
| `User.photoUrl` | Personal-Profilfoto |
| `Parent.photoUrl` | Eltern-Profilfoto |
| `Document.storageUrl` | Galerie-Bilder & Dokumente (bis 2,5 MB) |
| `Activity.photoUrl` | (vorbereitet, ungenutzt) |

**Folgen bei 100 Usern:**
- Jede Listen-Query zieht die Bild-Bytes mit (z. B. `/api/children` = 62 KB/9 Kinder → ~0,5–1 MB bei 60–100 Kindern).
- Keine CDN-Auslieferung, kein Browser-Cache, kein `next/image`.
- DB-CPU/Bandbreite + Funktionslaufzeit steigen linear mit Bildanzahl/Größe.

**6 Upload-Endpunkte** erzeugen aktuell Data-URLs:
`api/children/[id]/photo`, `api/me`, `api/users`, `api/users/[id]`, `api/children`, `api/documents`.

---

## Ziel (Soll-Zustand)
- Datei-Bytes liegen in **Supabase Storage** (CDN-backed).
- DB speichert nur noch eine **kurze URL** (bzw. den Storage-Pfad).
- Upload **serverseitig** über die bestehenden API-Routen (Mandanten-Scoping + Foto-Einwilligung bleiben serverseitig erzwungen → revDSG/T13 unverändert eingehalten).
- Anzeige unverändert über `<img src=…>` (funktioniert für alte Data-URLs UND neue Storage-URLs → **keine Anzeige-Brüche während der Umstellung**).

---

## Entscheidungspunkt: Sichtbarkeit der Dateien (revDSG)
Kinderfotos sind besondere Personendaten. Zwei Optionen:

**A) Privater Bucket + signierte URLs (empfohlen, revDSG-konform)**
- Bytes nie öffentlich; Server erzeugt zeitlich begrenzte Signed-URLs (z. B. 1 h) — gebündelt in den Listen-Endpunkten.
- Supabase liefert auch Signed-URLs über CDN aus → DB wird trotzdem entlastet.
- Nachteil: Signed-URLs laufen ab → kürzeres Client-Caching, leichte Zusatzlogik.

**B) Öffentlicher Bucket + unrät­bare UUID-Pfade (einfacher)**
- Maximale CDN-Cache-Wirkung, simpelste Implementierung.
- Aber: wer die URL hat, sieht das Bild → für Kinderfotos datenschutzrechtlich grenzwertig.

→ **Empfehlung:** Bucket `documents` (Dokumente/Galerie) und `avatars` (Profilfotos) **privat** mit Signed-URLs. Falls später Performance kritischer als Strenge: Profil-Avatare in einen Public-Bucket verschieben.

---

## Umsetzung (Phasen)

### Phase 0 — Setup (~0,5 Tag)
- [ ] `npm i @supabase/supabase-js`
- [ ] Supabase Storage Buckets anlegen: `avatars` (privat), `documents` (privat).
- [ ] Env-Variablen (Vercel + `.env.local`): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (nur serverseitig!).
- [ ] `src/lib/storage.ts`: Helper `uploadDataUrl(bucket, path, dataUrl)`, `signedUrl(bucket, path, ttl)`, `deleteObject(bucket, path)` mit Service-Role-Client.

### Phase 1 — Upload-Routen umstellen (~1 Tag)
Pro Endpunkt: Data-URL annehmen → `uploadDataUrl(...)` → **Storage-Pfad** in DB speichern (statt Base64). Pfad-Schema mandantengescoped, z. B. `avatars/<kitaId>/child-<id>.jpg`, `documents/<kitaId>/<uuid>.<ext>`.
- [ ] `api/children/[id]/photo` (Child.photoUrl)
- [ ] `api/me` (User/Parent.photoUrl)
- [ ] `api/users` + `api/users/[id]` (User/Parent.photoUrl)
- [ ] `api/children` (Child.photoUrl beim Anlegen)
- [ ] `api/documents` (Document.storageUrl + `kind`)
- [ ] Beim **Löschen** (`api/documents/[id]`, Foto entfernen) das Storage-Objekt mitlöschen (Orphan-Vermeidung).

### Phase 2 — Lesen / URL-Auslieferung (~0,5 Tag)
- [ ] In Listen-/Detail-Endpunkten Storage-Pfad → **Signed-URL** auflösen (gebündelt, nicht pro Bild einzeln).
- [ ] Antworten kurz cachen (z. B. `Cache-Control` passend zur Signed-TTL).
- [ ] Optional: Anzeige auf `next/image` umstellen (Lazy-Load, Responsive) — separat, nicht blockierend.

### Phase 3 — Migration bestehender Base64-Bilder (~0,5 Tag)
Einmaliges, idempotentes Skript (über Pooler):
1. Alle Rows mit `startsWith('data:')` in `Child/User/Parent.photoUrl` und `Document.storageUrl` lesen.
2. Base64 dekodieren → in den passenden Bucket hochladen.
3. Feld auf Storage-Pfad/URL aktualisieren.
4. Rows ohne `data:` überspringen (idempotent, mehrfach lauffähig).
- Aktueller Umfang: **Child 3, User 1, Parent 0, Document 0** → in Sekunden erledigt.

### Phase 4 — Test & Deploy (~0,5 Tag)
- [ ] Hochladen/Anzeigen/Löschen je Rolle (Admin/Betreuer/Leitung/Eltern), Desktop + Handy.
- [ ] Foto-Einwilligung (T13) weiterhin greifend.
- [ ] Alte Data-URLs (falls Migration teilweise) zeigen weiterhin an.

---

## Erwarteter Effekt
- `/api/children` & Co.: Payload von ~0,5–1 MB → **wenige KB** (nur URLs).
- Bilder kommen vom **CDN mit Browser-Cache** statt aus der DB durch die Funktion.
- DB-Größe/CPU + Funktionslaufzeit sinken deutlich → trägt 100+ User klar besser.

## Risiken & Gegenmaßnahmen
- **Service-Role-Key-Leak** → nur serverseitig nutzen, nie an den Client.
- **Signed-URL-Ablauf** → TTL ≥ typische Sitzungsdauer + Refetch bei 403.
- **Orphan-Dateien** → beim Löschen/Ersetzen Storage-Objekt mitentfernen.
- **Rollback** → Display akzeptiert weiter Data-URLs; Migration ist additiv (alte Spalten bleiben gültig, bis Storage-URL gesetzt ist).

## Nicht im Scope (separat)
Quick Wins, die parallel mitlaufen können: Glocken-Polling 30 s→90 s + Tab-Visibility, `next/font` statt CSS-`@import`, Pooler-Poolgröße prüfen.
