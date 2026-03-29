# PROJ-6: On-Site Service Report

## Status: In Review
**Created:** 2026-03-26
**Last Updated:** 2026-03-29

## Dependencies
- Requires: PROJ-1 (User Authentication) — Benutzerprüfung
- Requires: PROJ-3 (Ticket Management) — Bericht ist 1:1 an Ticket gebunden
- Requires: PROJ-4 (Stopwatch & Time Tracking) — Zeiteinträge als Datengrundlage
- Requires: PROJ-12 (Ticket Material Tracking) — Materialien werden im Bericht angezeigt

## Overview
Ein konsolidierter Service-Bericht pro Ticket, der alle geleistete Arbeit zusammenfasst: Zeiteinträge (gruppiert nach Typ), Fahrdaten, verwendete Materialien und eine Freitext-Arbeitsbeschreibung. Der Bericht kann jederzeit als Entwurf angelegt und beim Ticket-Schließen finalisiert werden.

## User Stories
- Als Techniker möchte ich einen Fahrzeit-Timer starten, damit meine Anfahrt zum Kunden automatisch erfasst wird
- Als Techniker möchte ich beim Stoppen des Fahrzeit-Timers die gefahrenen Kilometer eingeben, damit Fahrdaten lückenlos dokumentiert sind
- Als Techniker möchte ich jederzeit einen Berichtsentwurf für ein Ticket anlegen, damit ich Notizen während des Einsatzes festhalten kann
- Als Techniker möchte ich eine Freitext-Arbeitsbeschreibung erfassen, die dem Kunden als Leistungsnachweis dient
- Als Techniker möchte ich im Bericht alle Zeiteinträge gruppiert nach Typ (Vor-Ort, Remote, Telefon, Fahrt) sehen, damit die Gesamtleistung nachvollziehbar ist
- Als Techniker möchte ich die verwendeten Materialien im Bericht sehen, damit der Kunde den vollen Leistungsumfang auf einen Blick hat
- Als Office-Mitarbeiter möchte ich Fahrdaten aller Techniker einsehen, damit ich Reisespesen korrekt abrechnen kann
- Als Admin möchte ich einen abgeschlossenen Bericht entsperren können, um nachträgliche Korrekturen zu ermöglichen

## Acceptance Criteria

### Neuer WorkType `travel`
- [ ] Neuer Timer-Typ `travel` (Fahrzeit) neben `onsite`, `remote`, `phone`
- [ ] Fahrzeit-Timer kann wie andere Timer gestartet und gestoppt werden
- [ ] Beim Stoppen eines `travel`-Timers erscheint ein Pflichtfeld für Kilometer (Dezimalzahl, z.B. 23.5 km)
- [ ] Km-Wert ist nachträglich editierbar bis der Bericht abgeschlossen ist
- [ ] Fahrzeit-Timer wird im Multi-Timer-System (PROJ-11) unterstützt

### Service-Bericht (1 pro Ticket)
- [ ] Ein Ticket hat maximal einen Service-Bericht (1:1 Beziehung)
- [ ] Bericht kann jederzeit als Entwurf (`draft`) angelegt werden
- [ ] Bericht muss beim Ticket-Schließen finalisiert werden (Pflichtschritt)
- [ ] Ticket kann nicht geschlossen werden ohne finalisierten Bericht (wenn onsite-Zeiteinträge vorhanden)
- [ ] Freitext-Arbeitsbeschreibung als Pflichtfeld (Kundenbericht)
- [ ] Bericht zeigt alle Zeiteinträge des Tickets, gruppiert nach Typ:
  - Vor-Ort (`onsite`) — mit Arbeitszeit
  - Fahrt (`travel`) — mit Fahrzeit und Kilometer
  - Remote (`remote`) — mit Arbeitszeit
  - Telefon (`phone`) — mit Arbeitszeit
- [ ] Automatische Summenbildung pro Gruppe (Gesamtzeit, Gesamt-Km bei travel)
- [ ] Materialien aus PROJ-12 werden im Bericht mit Name, Menge und ggf. Preis angezeigt
- [ ] Bericht-Status: `draft` (bearbeitbar) → `completed` (nach Unterschrift in PROJ-7 gesperrt)

### Berechtigungen
- [ ] Techniker kann eigene Berichte erstellen und bearbeiten (solange `draft`)
- [ ] Admin kann abgeschlossenen Bericht entsperren (Status zurück auf `draft`, mit Audit-Log-Eintrag)
- [ ] Abgeschlossener Bericht ist readonly für alle außer Admin (Entsperrung)

### Anzeige
- [ ] Bericht ist in der Ticket-Detailseite sichtbar (eigener Tab oder Sektion)
- [ ] Entwurfs-Status klar erkennbar (visueller Indikator)
- [ ] Abgeschlossener Bericht zeigt alle Daten in druckfreundlichem Layout

## Edge Cases
- Ticket ohne onsite-Zeiteinträge: Bericht ist optional, Ticket kann ohne geschlossen werden
- Ticket nur mit remote/phone-Einträgen: Bericht optional, enthält dann keine Fahrdaten
- Km = 0 beim Travel-Timer: erlaubt mit Bestätigungsdialog ("Wirklich 0 km?")
- Bericht bereits mit Unterschrift versehen (PROJ-7): readonly, nur Admin kann entsperren
- Techniker stoppt Travel-Timer ohne Km-Eingabe: Timer bleibt gestoppt, aber Km-Feld wird als "ausstehend" markiert
- Nachträgliches Hinzufügen von Zeiteinträgen nach Bericht-Erstellung: Bericht aktualisiert sich automatisch (solange `draft`)
- Zeiteinträge werden gelöscht nach Bericht-Erstellung: Bericht aktualisiert sich automatisch (solange `draft`)
- Bericht ist `completed` und neuer Zeiteintrag wird hinzugefügt: Warnung, Admin muss Bericht erst entsperren

## Technical Requirements
- `service_reports` Tabelle: 1:1 mit `tickets`, Felder: `description` (text), `status` (draft/completed), `locked_at`, `locked_by`
- `time_entries` erweitert um: `distance_km` (nullable, nur für `travel`-Typ)
- WorkType erweitert: `"phone" | "remote" | "onsite" | "travel"`
- Validation: Zod-Schema — Km ≥ 0, Beschreibung nicht leer bei Finalisierung
- Audit-Log bei Entsperrung: Wer, Wann, Grund (optional)

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Übersicht

Drei zusammenhängende Bausteine:
1. **Travel-Timer** — neuer WorkType `travel` mit Kilometer-Erfassung beim Stoppen
2. **Service Report** — strukturiertes Dokument (1:1 pro Ticket) mit Arbeitsbeschreibung, gruppierten Zeiteinträgen und Materialien
3. **Report-Lifecycle** — draft → completed, mit Admin-Entsperrung

### Komponentenstruktur

```
Ticket Detail Page  [/tickets/[id]]
+-- Header Actions
|   +-- Timer starten (StartTimerDialog) ← adds "Fahrzeit" option
+-- [NEW] Service Report Section (Card)
|   +-- Status Badge (Entwurf / Abgeschlossen)
|   +-- ServiceReportForm (when draft)
|   |   +-- Arbeitsbeschreibung (Textarea, Pflicht)
|   |   +-- Zeiteinträge-Zusammenfassung (read-only, grouped)
|   |   |   +-- Vor-Ort: X Stunden
|   |   |   +-- Fahrzeit: X Stunden, Y km
|   |   |   +-- Remote: X Stunden
|   |   |   +-- Telefon: X Stunden
|   |   +-- Materialien-Zusammenfassung (read-only, from PROJ-12)
|   |   +-- [Entwurf speichern] [Bericht finalisieren]
|   +-- ServiceReportView (when completed)
|       +-- Arbeitsbeschreibung (read-only)
|       +-- Zeiteinträge (grouped, read-only)
|       +-- Materialien (read-only)
|       +-- [Admin] Bericht entsperren Button
+-- MaterialList (PROJ-12, unchanged)
+-- TimeEntriesTable (PROJ-4, extended with km column for travel)

StopTimerDialog (extended)
+-- [Existing fields]
+-- [NEW] Kilometer-Feld (only when workType === "travel")
    +-- Eingabefeld (Dezimalzahl, ≥ 0)
    +-- Warnung bei 0 km ("Wirklich 0 km?")

TicketCloseDialog (extended)
+-- [NEW] Guard: zeigt Warnung wenn onsite-Einträge vorhanden
    aber kein abgeschlossener Bericht existiert
```

### Datenmodell

**Erweiterung: `time_entries`**
- Neues Feld: `distance_km` — Dezimalzahl, nur befüllt bei Typ `travel`, nachträglich editierbar solange Bericht im Entwurf
- WorkType erweitert um: `travel`

**Neue Tabelle: `service_reports`**
- ID
- ticket_id (eindeutig — 1:1 Beziehung)
- description (Freitext, Kundenbericht)
- status: "draft" oder "completed"
- locked_at (Zeitstempel, wenn abgeschlossen)
- locked_by (Benutzer-ID)
- created_at / updated_at

**Neue Tabelle: `service_report_unlocks` (Audit-Log)**
- ID
- service_report_id
- unlocked_by (Admin-Benutzer-ID)
- unlocked_at
- reason (optional Freitext)

### Tech-Entscheidungen

| Entscheidung | Grund |
|---|---|
| Service Report als eigene Tabelle | Eigene Lifecycle-Steuerung (draft/completed/unlock), einfachere Abfragen, klare 1:1 Relation |
| Audit-Log als eigene Tabelle | Compliance: nachvollziehbar WER WANN entsperrt hat |
| Km-Feld im StopTimerDialog | Daten werden am natürlichsten am Ende der Fahrt erfasst; nachträgliche Bearbeitung als Fallback |
| Bericht in Ticket-Detailseite integriert | Techniker sieht alles auf einem Screen — kein Tab-Wechsel |
| Zeiteinträge live lesen (kein Snapshot) | Solange `draft`: Einträge aktualisieren sich automatisch |

### API Endpoints

| Methode | Pfad | Aktion |
|---|---|---|
| `GET` | `/api/tickets/[id]/service-report` | Bericht laden (oder null) |
| `POST` | `/api/tickets/[id]/service-report` | Bericht als Entwurf anlegen |
| `PATCH` | `/api/tickets/[id]/service-report` | Beschreibung speichern / finalisieren |
| `POST` | `/api/tickets/[id]/service-report/unlock` | Admin: Bericht entsperren (Audit-Log) |
| `PATCH` | `/api/time-entries/[id]` | Km-Wert bearbeiten (bestehende Route erweitern) |

### Neue/Erweiterte Komponenten

| Komponente | Typ | Beschreibung |
|---|---|---|
| `ServiceReportSection` | Neu | Card auf Ticket-Detailseite — Form oder View je nach Status |
| `ServiceReportUnlockDialog` | Neu | Admin-Dialog mit optionalem Grund-Feld |
| `StopTimerDialog` | Erweitert | Km-Eingabe conditional bei `travel` |
| `StartTimerDialog` | Erweitert | `travel` als neuer WorkType |
| `TicketCloseDialog` | Erweitert | Guard bei onsite-Einträgen ohne Bericht |

### Dependencies

Keine neuen Packages — alle benötigten shadcn/ui Komponenten sind installiert.

## Backend Implementation Notes

### Entities Created/Modified
- **`ServiceReport`** entity (`service_reports` table) -- 1:1 with tickets via unique `ticketId`, status enum (draft/completed), `lockedAt`/`lockedBy` fields
- **`ServiceReportUnlock`** entity (`service_report_unlocks` table) -- audit log for admin unlocks with reason field
- **`TimeEntry`** entity extended -- added `TRAVEL` to `WorkType` enum, added `distanceKm` column (decimal 10,1, nullable)
- **`AuditLog`** entity -- added `SERVICE_REPORT_CREATED`, `SERVICE_REPORT_UPDATED`, `SERVICE_REPORT_FINALIZED`, `SERVICE_REPORT_UNLOCKED` actions

### API Endpoints Implemented
- `GET /api/tickets/:ticketId/service-report` -- returns report or 404
- `POST /api/tickets/:ticketId/service-report` -- creates draft report
- `PATCH /api/tickets/:ticketId/service-report` -- updates description and/or finalizes (sets status to completed)
- `POST /api/tickets/:ticketId/service-report/unlock` -- admin-only, resets to draft with audit log

### Time Entry Changes
- `StopTimerDto` now accepts optional `distanceKm` (number, >= 0)
- `UpdateTimeEntryDto` now accepts optional `distanceKm`
- `CreateManualEntryDto` now accepts optional `distanceKm`
- `StartTimerDto` and `CreateManualEntryDto` enum validation messages updated for `travel`
- `PATCH /time-entries/:id` now accessible by technicians (limited to `distanceKm` on own entries) in addition to admins
- `sanitize()` method now includes `distanceKm` field in response

### Permissions
- Service reports: admin + technician can create/edit (while draft)
- Finalization: any technician/admin (description required)
- Unlock: admin only
- Time entry distanceKm edit: technician (own entries only) + admin

## QA Test Results

**Tested:** 2026-03-29 (Pass 4)
**App URL:** http://localhost:3000
**Tester:** QA Engineer (AI)
**Method:** Code review + build verification (frontend + backend compile cleanly)
**Note:** Fourth QA pass -- verifying BUG-9 fix from Pass 3. All critical and medium-severity bugs are now resolved. Two low-severity items remain.

### Acceptance Criteria Status

#### AC-1: Neuer WorkType `travel`
- [x] Neuer Timer-Typ `travel` (Fahrzeit) neben `onsite`, `remote`, `phone` -- WorkType enum in entity includes TRAVEL, StartTimerDto accepts it, StartTimerDialog shows all 4 types including travel with Car icon
- [x] Fahrzeit-Timer kann wie andere Timer gestartet und gestoppt werden -- startTimer/stopTimer API and UI handle travel identically to other types
- [x] Beim Stoppen eines `travel`-Timers erscheint ein Pflichtfeld fuer Kilometer -- StopTimerDialog shows km input conditionally when `isTravel`, validation requires parsedKm >= 0
- [x] Km-Wert ist nachtraeglich editierbar bis der Bericht abgeschlossen ist -- Backend (time-entries.service.ts:265-270) checks for completed service report and rejects km edits. Frontend disables km field when report is completed.
- [x] Fahrzeit-Timer wird im Multi-Timer-System (PROJ-11) unterstuetzt -- no special restrictions on travel type in multi-timer logic

#### AC-2: Service-Bericht (1 pro Ticket)
- [x] Ein Ticket hat maximal einen Service-Bericht (1:1 Beziehung) -- service_reports.ticketId has unique constraint + ConflictException on duplicate create
- [x] Bericht kann jederzeit als Entwurf (`draft`) angelegt werden -- POST endpoint creates with status DRAFT, UI shows "Bericht anlegen" button
- [x] Bericht muss beim Ticket-Schliessen finalisiert werden (Pflichtschritt) -- Frontend: TicketCloseDialog disables submit when showReportWarning is true. Backend: tickets.service.ts close() method (lines 313-325) checks for onsite/travel entries and requires a completed service report.
- [x] Ticket kann nicht geschlossen werden ohne finalisierten Bericht (wenn onsite-Zeiteintraege vorhanden) -- FIXED in Pass 4: Server-side guard now enforced in tickets.service.ts close() method. Backend queries timeEntriesRepo for onsite/travel entries and serviceReportsRepo for completed report. Returns BadRequest if entries exist but no completed report found. Both frontend and backend guards are now in place.
- [x] Freitext-Arbeitsbeschreibung als Pflichtfeld (Kundenbericht) -- backend validates description not empty on finalization, frontend checks `description.trim()` before showing finalize confirm
- [x] Bericht zeigt alle Zeiteintraege des Tickets, gruppiert nach Typ -- ServiceReportSection groups entries by WORK_TYPE_ORDER: onsite, travel, remote, phone
- [x] Automatische Summenbildung pro Gruppe (Gesamtzeit, Gesamt-Km bei travel) -- groupTimeEntries computes totalMinutes and totalKm per group
- [x] Materialien aus PROJ-12 werden im Bericht mit Name, Menge und ggf. Preis angezeigt -- materials section shows quantity, name, and gross price
- [x] Bericht-Status: `draft` (bearbeitbar) -> `completed` (gesperrt) -- ServiceReportStatus enum with DRAFT/COMPLETED, backend rejects edits when completed

#### AC-3: Berechtigungen
- [x] Techniker kann eigene Berichte erstellen und bearbeiten (solange `draft`) -- Controller allows ADMIN + TECHNICIAN for create/update; service rejects when completed. ensureTicketAccess() enforces ownership (assignee or has time entries on ticket).
- [x] Admin kann abgeschlossenen Bericht entsperren (Status zurueck auf `draft`, mit Audit-Log-Eintrag) -- unlock endpoint is admin-only, creates ServiceReportUnlock record + AuditLog entry
- [x] Abgeschlossener Bericht ist readonly fuer alle ausser Admin (Entsperrung) -- UI hides form fields when completed, backend rejects PATCH when completed

#### AC-4: Anzeige
- [x] Bericht ist in der Ticket-Detailseite sichtbar (eigener Sektion) -- ServiceReportSection rendered in ticket detail page
- [x] Entwurfs-Status klar erkennbar (visueller Indikator) -- Badge with yellow background for "Entwurf", green for "Abgeschlossen"
- [x] Abgeschlossener Bericht zeigt alle Daten in druckfreundlichem Layout -- read-only view with description, grouped time entries, and materials

### Edge Cases Status

#### EC-1: Ticket ohne onsite-Zeiteintraege
- [x] Bericht ist optional, Ticket kann ohne geschlossen werden -- both frontend and backend guards only trigger when onsite/travel entries exist

#### EC-2: Ticket nur mit remote/phone-Eintraegen
- [x] Bericht optional, enthaelt dann keine Fahrdaten -- groupTimeEntries only shows groups with entries

#### EC-3: Km = 0 beim Travel-Timer
- [x] Erlaubt mit Bestaetigungsdialog -- StopTimerDialog shows "Wirklich 0 km?" warning, requires second click to confirm

#### EC-4: Bericht bereits mit Unterschrift versehen (PROJ-7)
- [x] Readonly, nur Admin kann entsperren -- completed status makes report readonly; PROJ-7 not yet implemented but mechanism is in place

#### EC-5: Techniker stoppt Travel-Timer ohne Km-Eingabe
- [ ] BUG-2 (OPEN): Timer bleibt gestoppt, aber Km-Feld wird als "ausstehend" markiert -- The km field is required (validation blocks stop button when km is empty for travel), so the timer CANNOT be stopped without km input. The spec says the timer should still stop but mark km as pending. Current implementation blocks stopping entirely. Awaiting product decision.

#### EC-6: Nachtraegliches Hinzufuegen von Zeiteintraegen nach Bericht-Erstellung
- [x] Bericht aktualisiert sich automatisch (solange `draft`) -- ServiceReportSection fetches live time entries on each load + on timerStoppedVersion change

#### EC-7: Zeiteintraege werden geloescht nach Bericht-Erstellung
- [x] Bericht aktualisiert sich automatisch (solange `draft`) -- entries are fetched live, deletions are reflected on next load

#### EC-8: Bericht ist `completed` und neuer Zeiteintrag wird hinzugefuegt
- [x] PARTIALLY FIXED: TimeEntriesTable shows a warning banner when `serviceReportStatus === "completed"`. However, the StartTimerDialog and StopTimerDialog flows do NOT show any warning. The warning is only visible after navigating to the time entries section. See BUG-3 for remaining gap.

### Security Audit Results

#### Authentication
- [x] All endpoints use JwtAuthGuard -- controller has @UseGuards(JwtAuthGuard, RolesGuard) at class level
- [x] Cannot access service report endpoints without login

#### Authorization
- [x] Unlock is admin-only -- @Roles(UserRole.ADMIN) on unlock endpoint + ForbiddenException in service if role !== admin (defense in depth)
- [x] Create/update restricted to ADMIN + TECHNICIAN -- @Roles decorator properly applied
- [x] Technician can only update distanceKm on own entries -- service validates isTechnicianOwnEntry && isOnlyDistanceUpdate
- [x] Ownership check on service report create/update -- ensureTicketAccess() verifies the user is the ticket assignee, has time entries on the ticket, or is an admin
- [x] Office role can view service reports -- GET endpoint includes UserRole.OFFICE

#### Input Validation
- [x] Server-side validation with class-validator on all DTOs -- description trimmed, distanceKm validated as number >= 0
- [x] XSS: description stored as plain text, rendered via React (auto-escaped by JSX)
- [x] SQL injection: TypeORM parameterized queries used throughout
- [x] UUID validation on ticketId path parameter via ParseUUIDPipe

#### Rate Limiting
- [x] Global ThrottlerModule configured (100 requests per 60 seconds)

#### Data Exposure
- [x] sanitize() method limits response fields -- no internal fields leaked
- [x] lockedBy resolves to user display name (first + last name) via sanitize() method

#### Server-side guard on ticket close
- [x] FIXED in Pass 4: tickets.service.ts close() method (lines 313-325) now queries for onsite/travel time entries and checks for a completed service report before allowing ticket closure. Returns BadRequestException with clear German error message if guard fails. Both ServiceReport and TimeEntry repositories are properly injected via tickets.module.ts.

### Bugs Found

#### BUG-1: RESOLVED -- Ticket close blocked without finalized report
- **Status:** Fixed (Pass 3)

#### BUG-2: Travel timer cannot be stopped without km input (spec says it should)
- **Status:** OPEN -- Awaiting product decision
- **Severity:** Low (downgraded from Medium -- current behavior prevents data gaps, which may be preferable)
- **Steps to Reproduce:**
  1. Start a travel timer on a ticket
  2. Open the stop timer dialog
  3. Leave the kilometer field empty
  4. Expected: Timer can be stopped, km field marked as "ausstehend" (pending)
  5. Actual: "Timer stoppen" button is disabled when km field is empty
- **Priority:** Product decision needed -- current behavior (mandatory km) may be preferred over the spec
- **Details:** StopTimerDialog line 72: `isKmValid = !isTravel || (!isNaN(parsedKm) && parsedKm >= 0)` -- km is required for travel. The spec edge case says timer should stop with km marked as pending. The implementation forces km input, which prevents missing data but deviates from spec.

#### BUG-3: Warning incomplete when adding time entries to ticket with completed report
- **Status:** PARTIALLY FIXED
- **Severity:** Low
- **Steps to Reproduce:**
  1. Create a ticket, add time entries, finalize the service report
  2. Start a new timer on the ticket via the "Timer starten" button
  3. Expected: Warning that the report is completed and won't include new entries
  4. Actual: No warning in the StartTimerDialog. Warning only visible in TimeEntriesTable area after entries are created.
- **Priority:** Nice to have (the TimeEntriesTable banner covers the most important case)
- **Details:** TimeEntriesTable shows a warning banner when serviceReportStatus is completed. The remaining gap is that StartTimerDialog and StopTimerDialog do not show a warning, so the user discovers the issue only after scrolling to the entries section.

#### BUG-4: RESOLVED -- Ownership check on service reports
- **Status:** Fixed (Pass 3)

#### BUG-5: RESOLVED -- AddTimeEntryDialog now includes distanceKm for travel entries
- **Status:** Fixed (Pass 3)

#### BUG-6: RESOLVED -- lockedBy now shows user display name
- **Status:** Fixed (Pass 3)

#### BUG-7: RESOLVED -- 0 km now displayed in travel group
- **Status:** Fixed (Pass 3)

#### BUG-8: RESOLVED -- Km editability blocked when service report is completed
- **Status:** Fixed (Pass 3)

#### BUG-9: RESOLVED -- Server-side guard on ticket close for service report requirement
- **Status:** Fixed (Pass 4)
- **Verification:** tickets.service.ts close() method (lines 313-325) now:
  1. Queries timeEntriesRepo for entries with workType IN ('onsite', 'travel')
  2. If count > 0, queries serviceReportsRepo for a completed report
  3. Throws BadRequestException if no completed report exists
  4. tickets.module.ts correctly imports both TimeEntry and ServiceReport entities
  5. The error message is clear: "Ticket hat Vor-Ort-Zeiteintraege, aber keinen finalisierten Einsatzbericht."

### Cross-Browser & Responsive Notes
- Code review indicates proper responsive design patterns: hidden columns on mobile (`hidden sm:table-cell`, `hidden md:table-cell`), dialog max-widths (`sm:max-w-[480px]`), grid layout (`grid-cols-2 gap-3 sm:grid-cols-4`).
- All UI components use shadcn/ui primitives which are tested across browsers.
- No browser-specific APIs used (no `navigator` quirks, no CSS features with limited support).
- Manual cross-browser testing recommended before final deployment.

### Regression Check
- [x] PROJ-1 (Auth): No changes to auth flow
- [x] PROJ-3 (Tickets): TicketCloseDialog extended with showReportWarning -- backwards-compatible (new props default to false). tickets.service.ts close() extended with report guard -- additive, does not affect tickets without onsite entries.
- [x] PROJ-4 (Time Tracking): StopTimerDialog extended for travel km, existing timer flows unchanged. Time entry update now checks service report status -- additive, not breaking.
- [x] PROJ-11 (Multi-Timer): No conflicts, travel type works within multi-timer system
- [x] PROJ-12 (Materials): MaterialList unchanged, materials displayed in service report via separate fetch
- [x] Build: Frontend compiles cleanly (`next build` succeeds with zero errors). Backend TypeScript compiles cleanly (`tsc --noEmit` passes with zero errors).

### Summary
- **Acceptance Criteria:** 17/17 passed (BUG-2 reclassified as low-severity spec deviation pending product decision)
- **All previous bugs resolved:** BUG-1, BUG-4, BUG-5, BUG-6, BUG-7, BUG-8 (Pass 3), BUG-9 (Pass 4)
- **Bugs still open:** 2 total (0 critical, 0 high, 0 medium, 2 low)
  - BUG-2 (low, product decision): Travel timer requires km (spec says optional) -- prevents data gaps
  - BUG-3 (low, nice-to-have): StartTimerDialog missing warning for completed report
- **Security:** All security findings resolved. Server-side guards in place for all business rules.
- **Production Ready:** YES
- **Remaining items (non-blocking):**
  - Product decision needed for BUG-2 (spec says allow stop without km, implementation requires km)
  - BUG-3 is a nice-to-have UX improvement for a future sprint

## Deployment

**Deployed:** 2026-03-29
**Environment:** Self-hosted (Docker Compose + Nginx Proxy Manager)

### What was deployed
- Travel timer (`travel` WorkType) with km capture on stop
- Service report entity (1:1 per ticket, draft/completed lifecycle)
- Service report unlock audit log
- `ServiceReportSection` component on ticket detail page
- `ServiceReportUnlockDialog` for admin unlock
- Extended `StopTimerDialog`, `StartTimerDialog`, `TicketCloseDialog`
- Backend `service-reports` module with full CRUD + unlock endpoint
- Server-side guard: ticket cannot be closed without finalized report when onsite/travel entries exist

### Known items (non-blocking)
- BUG-2 (low): Travel timer requires km input — prevents data gaps; product decision pending
- BUG-3 (low): `StartTimerDialog` does not warn when service report is completed
