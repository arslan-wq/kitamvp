# KitaLuna — Design System v2 (Single Source of Truth)

> Philosophie: **Design follows function.** Modern, minimalistisch, ruhig — wie eine
> erstklassige Verwaltungs-Software. Nicht verspielt-bunt, sondern klar, luftig,
> selbstbewusst. Inspiration: das Beste aus Linear, Stripe, Apple, Vercel.

## Die 7 Prinzipien (verbindlich)

1. **Fläche nutzen, nicht verschwenden.** Keine bildschirmbreiten Einzelfelder mehr.
   Verwandte Felder in 2–3-Spalten-Rastern (`grid grid-cols-1 sm:grid-cols-2 gap-4`).
2. **Hierarchie zuerst.** Pro Seite gibt es EINE Hauptsache. Sie ist groß/zentral,
   der Rest tritt zurück (kleiner, grauer, sekundär).
3. **Kontext oben.** Listen-/Verwaltungsseiten beginnen mit einer Stat-Zeile
   (2–4 KPIs) als schnelle Orientierung.
4. **Weniger Rauschen.** Kurze Labels, keine doppelten Emojis, ein Akzent pro Block.
   Großzügiger Weißraum, aber kein leerer Raum.
5. **Chips & Badges statt Listen.** Tags, Status, Zugehörigkeiten als kompakte Pills.
6. **Avatare zur Orientierung.** Personen/Kinder bekommen Initialen-Avatare.
7. **Aktionen klar platziert.** Primäraktion rechts (Header oder Fußleiste),
   niemals fette Vollbreiten-Balken. Sekundär = `btn-secondary`, daneben.

## Farben (Tailwind-Tokens — NUR diese verwenden)

- `primary-*` (Blau) — Hauptaktionen, Auswahl, Fokus
- `accent-*` (Cyan) — sekundäre Akzente (z.B. Personal)
- `secondary-*` (Slate) — Text & neutrale Flächen (`secondary-900` Text, `secondary-500` sekundär, `secondary-50` Flächen)
- `success`/`green`, `warning`/`yellow`, `error`/`red` — Status
- Hintergrund der App ist `bg-gray-50`. Karten sind weiß.

## Wiederverwendbare Klassen (in globals.css definiert — BEVORZUGT nutzen)

| Klasse | Zweck |
|--------|-------|
| `.page-title` / `.page-subtitle` | Seitenkopf |
| `.stat-card` `.stat-value` `.stat-label` | KPI-Kachel |
| `.eyebrow` | Kleine Großbuchstaben-Sektionslabel |
| `.chip` + `.chip-neutral`/`-primary`/`-accent`/`-success`/`-warning`/`-error` | Pill-Tags |
| `.avatar` + `.avatar-sm`/`-md`/`-lg` | Initialen-Avatar |
| `.tile` + `.tile-active` | Auswahl-Kachel (Optionsraster) |
| `.empty-state` + `.empty-state-icon` | Leerer Zustand |
| `.surface` | Weiche innere Fläche (graue Box) |
| `.card` `.input` `.label` `.label-required` `.btn` `.btn-primary` `.btn-secondary` `.btn-lg` `.btn-icon` `.badge*` `.alert*` | bereits vorhanden |

## Standard-Muster (Copy-Paste-Vorlagen)

### Seitenkopf mit Aktion
```tsx
<div className="flex items-center justify-between gap-4">
  <div>
    <h1 className="page-title">📋 Titel</h1>
    <p className="page-subtitle">Kurze Beschreibung</p>
  </div>
  <button className="btn btn-primary">+ Neu</button>
</div>
```

### KPI-Zeile
```tsx
<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
  <div className="stat-card"><p className="stat-value">12</p><p className="stat-label">Label</p></div>
  ...
</div>
```

### Karten-Raster
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">...</div>
```

### Avatar mit Initialen
```tsx
<div className="avatar avatar-md">{initials}</div>
```

### Formular (flächeneffizient)
```tsx
<form className="card p-6 sm:p-8">
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
    <div><label className="label">Feld A</label><input className="input" /></div>
    <div><label className="label">Feld B</label><input className="input" /></div>
  </div>
  <div className="flex justify-end gap-3 pt-2">
    <button className="btn btn-secondary">Abbrechen</button>
    <button className="btn btn-primary px-6">Speichern</button>
  </div>
</form>
```

## Harte Regeln (NICHT brechen)

- **Keine Logik/Datenflüsse ändern.** Nur Markup & Tailwind-Klassen. State, fetch,
  Props, Handler, API-Calls, Validierung bleiben 1:1 erhalten.
- **`'use client'` / Imports / Exports** unverändert lassen (außer ungenutzte entfernen).
- **Keine neuen npm-Pakete.** Nur Tailwind + bestehende Klassen.
- **Keine erfundenen Farb-Hex.** Nur die Tokens oben.
- **Deutsch** bleibt die UI-Sprache. Texte sinngemäß beibehalten.
- **Responsiv:** mobil 1 Spalte, ab `sm:`/`lg:` mehrspaltig.
- **Datei muss kompilieren** (gültiges TSX, alle Tags geschlossen, kein toter Code).
