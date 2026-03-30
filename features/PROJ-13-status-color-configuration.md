# PROJ-13: Status & Priority Color Configuration

## Status: In Progress
**Created:** 2026-03-30
**Last Updated:** 2026-03-30

## Dependencies
- Requires: PROJ-1 (User Authentication & Roles) — nur Admins können Farben konfigurieren
- Requires: PROJ-3 (Ticket Management) — Farben werden für Ticket-Status und -Priorität verwendet

## User Stories
- Als Admin möchte ich die Farbe jedes Ticket-Status (Offen, In Bearbeitung, Gelöst, Geschlossen, On Hold) aus einer vordefinierten Palette wählen, damit die Oberfläche zur Corporate Identity passt
- Als Admin möchte ich die Farbe jeder Ticket-Priorität (Niedrig, Mittel, Hoch, Kritisch) konfigurieren, damit wichtige Tickets visuell hervorgehoben sind
- Als Admin möchte ich alle Farben auf den Standardwert zurücksetzen, damit ich Fehler rückgängig machen kann
- Als Techniker möchte ich die konfigurierten Farben sofort in der Ticket-Liste und Ticket-Detailansicht sehen, damit ich den Status auf einen Blick erfasse
- Als Admin möchte ich eine Vorschau der Farbe sehen bevor ich speichere, damit ich das Ergebnis einschätzen kann

## Acceptance Criteria

### AC-1: Admin-Konfigurationsseite
- [ ] Neue Seite unter `/admin/colors` (oder als Tab auf einer bestehenden Admin-Seite)
- [ ] Nur für Admins zugänglich (andere Rollen sehen 403 / werden weitergeleitet)
- [ ] Zwei Sektionen: "Ticket-Status" und "Ticket-Priorität"
- [ ] Jeder Status/jede Priorität zeigt den aktuellen Farbwert als Badge-Vorschau an

### AC-2: Farbpalette
- [ ] Auswahl aus mindestens 10 vordefinierten Farben (z.B. Grau, Rot, Orange, Gelb, Grün, Blau, Lila, Pink, Teal, Indigo)
- [ ] Jede Farbe als klickbares Farbfeld dargestellt
- [ ] Aktuell ausgewählte Farbe wird visuell markiert (z.B. Häkchen oder Ring)
- [ ] Badge-Vorschau aktualisiert sich sofort bei Auswahl (live preview)

### AC-3: Speichern
- [ ] "Speichern"-Button speichert alle Änderungen gleichzeitig
- [ ] Erfolgs-Toast bei erfolgreichem Speichern
- [ ] Fehler-Toast wenn Speichern fehlschlägt
- [ ] Farben werden in der Datenbank persistiert

### AC-4: Zurücksetzen
- [ ] "Auf Standard zurücksetzen"-Button pro Sektion (Status / Priorität) ODER global
- [ ] Bestätigungs-Dialog vor dem Zurücksetzen ("Wirklich zurücksetzen?")
- [ ] Nach Reset werden die Standard-Farben wieder angezeigt und gespeichert

### AC-5: Anwendung der Farben
- [ ] Ticket-Liste zeigt Status- und Prioritäts-Badges in den konfigurierten Farben
- [ ] Ticket-Detailansicht verwendet dieselben konfigurierten Farben
- [ ] Änderungen sind nach Seitenreload für alle Nutzer sichtbar
- [ ] Farben gelten für Light Mode und Dark Mode (ggf. angepasst)

## Edge Cases
- Admin speichert ohne Änderungen: Button bleibt aktiv, aber kein unnötiger API-Call
- Zwei Admins ändern gleichzeitig: Last-Write-Wins (kein Locking nötig für MVP)
- Datenbank nicht erreichbar beim Laden: Fallback auf Standardfarben, Fehlermeldung
- Ungültiger Farbwert in der DB (z.B. nach manuellem Edit): Fallback auf Standardfarbe für diesen Eintrag
- Farbpalette für Dark Mode: Dieselben Farben werden verwendet, aber mit angepasster Helligkeit/Sättigung durch Tailwind dark:-Varianten

## Technical Requirements
- Farben werden als Tailwind-Farb-Token gespeichert (z.B. `"green"`, `"red"`, `"blue"`) — keine Hex-Codes
- Backend: neue Tabelle `system_settings` (Key-Value) oder eigene `color_settings`-Tabelle
- Frontend: Farben werden beim App-Start oder beim Laden der Ticket-Seite vom Backend geladen und gecacht
- API: `GET /admin/color-settings` und `PATCH /admin/color-settings`
- Änderungen gelten systemweit (Single-Tenant)

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Key Discovery: Infrastructure Already Exists
The backend already has a `system_settings` table (key-value, PostgreSQL), a `SystemSettingsController` at `/admin/settings`, and a `SystemSettingsService` with `seedDefaults()`. No new table needed.

### Component Structure
```
Admin Section
+-- /admin/colors (new page, admin-only)
    +-- ColorConfigSection ("Ticket-Status")
    |   +-- StatusColorRow (×5: open, in_progress, resolved, closed, on_hold)
    |       +-- ColorPalette (10 clickable swatches)
    |       +-- BadgePreview (live-updated)
    +-- ColorConfigSection ("Ticket-Priorität")
    |   +-- PriorityColorRow (×4: low, medium, high, critical)
    +-- ActionBar (ResetButton + SaveButton)

Existing ticket pages: Badge uses dynamic color from context
```

### Data Model
Colors stored in existing `system_settings` table as key-value pairs:
- Keys: `ticket_status_color_{status}` and `ticket_priority_color_{priority}`
- Values: Tailwind color token names (e.g. `"green"`, `"red"`) — not hex codes
- 9 entries total (5 status + 4 priority)
- Seeded as defaults in `SystemSettingsService.seedDefaults()`

### API Design
| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `GET` | `/color-settings` | All authenticated users | Read the 9 color token values |
| `PUT` | `/admin/settings/ticket_*_color_*` | Admin only | Update one color (existing endpoint) |

A new `GET /color-settings` endpoint is added (accessible to all auth users) because technicians need colors to render ticket badges, but the existing `/admin/settings` is admin-only.

### Tailwind Dynamic Classes Strategy
Tailwind purges unused classes at build time — runtime class composition like `bg-${color}-100` doesn't work. Solution: a static lookup table (`src/lib/ticket-colors.ts`) maps every allowed token name to its full Tailwind class string. The DB stores the token name; the frontend looks up the full class. All 11 color variations are statically present in the bundle.

### Color Loading
A React Context/Hook (`useColorSettings`) loads colors once at app startup (in the auth layout). Falls back to hardcoded defaults if the API fails. Avoids redundant API calls across pages.

### Color Palette (11 tokens)
`gray`, `slate`, `red`, `orange`, `yellow`, `green`, `teal`, `blue`, `indigo`, `purple`, `pink`

### Files to Create / Modify
| File | Action |
|---|---|
| `src/lib/ticket-colors.ts` | **New** — static color lookup table + default color map |
| `src/hooks/useColorSettings.ts` | **New** — fetches colors, returns dynamic color maps |
| `src/app/(protected)/admin/colors/page.tsx` | **New** — admin color configuration UI |
| `src/lib/tickets.ts` | **Modify** — `STATUS_COLORS`/`PRIORITY_COLORS` become dynamic |
| `backend/.../system-settings.service.ts` | **Modify** — add 9 color defaults to `DEFAULT_SETTINGS` |
| `backend/.../system-settings.controller.ts` | **Modify** — add `GET /color-settings` for all auth users |

### Dependencies
No new npm packages — uses existing shadcn/ui Badge, React Context, and `api.ts`.

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
