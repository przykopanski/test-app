# PROJ-4: Stopwatch & Time Tracking

## Status: Deployed
**Created:** 2026-03-26
**Last Updated:** 2026-03-27

## Dependencies
- Requires: PROJ-1 (User Authentication) — Timer ist techniker-gebunden
- Requires: PROJ-3 (Ticket Management) — Timer läuft immer auf ein Ticket

## User Stories
- Als Techniker möchte ich innerhalb eines Tickets einen Timer starten, damit meine Arbeitszeit sekundengenau erfasst wird
- Als Techniker möchte ich den Arbeitstyp (Telefon / Remote / Vor-Ort) vor dem Start auswählen, damit die Zeit korrekt kategorisiert wird
- Als Techniker möchte ich den Timer stoppen und eine kurze Beschreibung eingeben, damit klar ist was ich gemacht habe
- Als Techniker möchte ich sehen dass meine Zeit auf 15-Minuten aufgerundet wird, damit ich die Abrechnung verstehe
- Als Techniker möchte ich keinen zweiten Timer starten können solange einer läuft, damit ich nie vergesse einen Timer zu stoppen
- Als Admin möchte ich Zeiteinträge nachträglich bearbeiten oder löschen, damit Fehleingaben korrigiert werden können
- Als Office-Mitarbeiter möchte ich alle Zeiteinträge eines Tickets sehen, damit ich den Aufwand überblicke

## Acceptance Criteria
- [ ] Timer-Start-Button im Ticket (sichtbar für Techniker mit Rolle `technician`)
- [ ] Timer-Start-Button auch in der Ticket-Liste (pro Zeile) — nicht nur auf der Detailseite
- [ ] Vor dem Start: Pflichtauswahl des Arbeitstyps (`phone`, `remote`, `onsite`)
- [ ] Nur ein aktiver Timer pro Techniker systemweit (Enforce via DB unique constraint + API check)
- [ ] Timer läuft sichtbar in der UI (Sekundenanzeige, aktualisiert sich live)
- [ ] Timer-Stop öffnet Modal: Beschreibung (Pflicht, min. 10 Zeichen), Bestätigung der Zeiten
- [ ] Speicherung: Startzeit, Endzeit, Rohdauer (Sekunden), gerundete Dauer (Minuten)
- [ ] Rundungslogik: 1–15 min → 15, 16–30 → 30, 31–45 → 45, 46–60 → 60 (immer aufrunden)
- [ ] Zeiteinträge erscheinen in der Ticket-Detailseite chronologisch
- [ ] Zeiteintrag-Liste zeigt: Datum, Techniker, Typ, Rohzeit, gerundete Zeit, Beschreibung
- [ ] Admin kann Zeiteintrag bearbeiten (Beschreibung, gerundete Zeit override) und löschen
- [ ] Timer-Zustand wird serverseitig persistiert (Browser-Refresh verliert keinen Timer)
- [ ] Globale Timer-Anzeige: Persistent Header-Bar oben auf jeder Seite (im Protected Layout)
- [ ] Header-Bar zeigt: Ticketname (als Link), Arbeitstyp-Badge, Laufzeit (Sekunden), Stop-Button
- [ ] Header-Bar nur sichtbar wenn Techniker einen aktiven Timer hat

## Rounding Logic (Detail)
```
raw_seconds → raw_minutes (ceil to full minute)
raw_minutes:
  1–15   → billable: 15
  16–30  → billable: 30
  31–45  → billable: 45
  46–60  → billable: 60
  61–75  → billable: 75
  ...pattern continues in 15-min blocks...
```
Admin-Override: billable_minutes kann manuell auf beliebigen Wert gesetzt werden (mit Notiz-Pflichtfeld).

## Work Type Rules
| Typ | Unterschrift erforderlich | Kilometer erforderlich |
|-----|--------------------------|----------------------|
| `phone` | Nein | Nein |
| `remote` | Nein | Nein |
| `onsite` | Ja (PROJ-7) | Ja (PROJ-6) |

## Edge Cases
- Techniker öffnet zweites Browser-Tab und versucht zweiten Timer: API blockt, Fehlermeldung
- Timer läuft länger als 8 Stunden: Warnung beim Stoppen ("Ungewöhnlich lange Sitzung – korrekt?")
- Timer-Start aber Browser geschlossen: Timer läuft serverseitig weiter, beim nächsten Login sichtbar
- Zeiteintrag mit 0 Minuten (< 30 Sekunden gestoppt): minimale Abrechnung 15 min, Warnung
- Ticket wird geschlossen während Timer läuft: Timer weiterhin stoppbar, Warnung im Ticket

## Technical Requirements
- Timer-Zustand in DB: `time_entries` Tabelle mit `started_at`, `stopped_at`, `is_running` Flag
- Unique constraint: nur eine Zeile mit `is_running = true` pro `technician_id`
- Echtzeit-Anzeige im Frontend: client-side Interval (kein WebSocket für MVP nötig)
- API-Endpunkte: `POST /time-entries/start`, `POST /time-entries/:id/stop`, `GET /time-entries?ticketId=`, `GET /time-entries/active`
- `GET /time-entries/active` gibt den laufenden Timer des eingeloggten Technikers zurück (für Header-Bar beim Seitenload)
- Frontend-Komponente: `ActiveTimerBar` in `src/components/active-timer-bar.tsx`, eingebunden in `src/app/(protected)/layout.tsx`
- Timer-State via React Context API (kein Zustand/Redux nötig)

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Component Structure (UI)

```
Protected Layout (src/app/(protected)/layout.tsx)
+-- ActiveTimerBar [NEW — persistent, always on top]
|   +-- Ticket name (link)
|   +-- Work type badge (phone / remote / onsite)
|   +-- Live elapsed time (ticking seconds)
|   +-- Stop button → opens StopTimerDialog
|
+-- AppSidebar (existing)
+-- Page Content
    |
    +-- Ticket List Page (existing)
    |   +-- Each ticket row [MODIFIED]
    |       +-- Start Timer button → opens StartTimerDialog
    |
    +-- Ticket Detail Page (existing) [MODIFIED]
        +-- Ticket Header
        |   +-- Start Timer button → opens StartTimerDialog
        |
        +-- Time Entries Section [NEW]
            +-- TimeEntriesTable
            |   +-- Row: Date | Technician | Type | Raw time | Billable | Description
            |   +-- Admin row actions: Edit | Delete
            +-- Edit Zeiteintrag Dialog [Admin only]

StartTimerDialog
+-- Work type selector (phone / remote / onsite) [required]
+-- Confirm button

StopTimerDialog
+-- Shows: start time, elapsed time, billable time (rounded)
+-- Description textarea (required, min 10 chars)
+-- Warning if > 8h or < 30 seconds
+-- Confirm Stop button
```

### Data Model

**`TimeEntry` — one row per work session:**

| Field | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| ticket_id | UUID | Which ticket this work belongs to |
| technician_id | UUID | Who did the work |
| work_type | Enum | `phone`, `remote`, or `onsite` |
| started_at | Timestamp | When the timer was started |
| stopped_at | Timestamp | When the timer was stopped (null while running) |
| is_running | Boolean | True = active timer |
| raw_seconds | Integer | Exact duration in seconds |
| billable_minutes | Integer | Rounded up to next 15-min block |
| description | Text | Required work summary (min 10 chars) |
| billable_override | Boolean | Whether an admin manually changed billable_minutes |
| override_note | Text | Required note when admin overrides |

**Database constraint:** Maximum one row with `is_running = true` per `technician_id`.

**Stored in:** PostgreSQL (NestJS backend, same DB as existing entities).

### API Endpoints (NestJS backend)

| Method | Endpoint | Who | Purpose |
|---|---|---|---|
| POST | `/time-entries/start` | Technician | Start timer (workType + ticketId) |
| POST | `/time-entries/:id/stop` | Technician | Stop timer (description) |
| GET | `/time-entries/active` | Technician | Get own running timer (for page load) |
| GET | `/time-entries?ticketId=` | All | List entries for a ticket |
| PATCH | `/time-entries/:id` | Admin | Edit description / billable override |
| DELETE | `/time-entries/:id` | Admin | Delete a time entry |

### Tech Decisions

- **Server-side persistence:** Timer `started_at` is stored in DB immediately on start. Frontend computes elapsed time as `now - started_at` client-side every second — no data lost on browser close/refresh.
- **React Context (TimerContext):** Simple single-object state (active timer or null). Wraps the protected layout, consistent with existing `AuthProvider` pattern.
- **Client-side interval (no WebSocket):** Backend only records start/stop times. Frontend ticks once per second via `setInterval`. Sufficient for MVP.
- **Persistent ActiveTimerBar in layout:** Prevents "losing" a running timer while navigating between pages.

### Files to Create / Modify

| Action | File |
|---|---|
| NEW backend module | `backend/src/time-entries/` (entity, service, controller, DTOs) |
| NEW frontend context | `src/components/timer-context.tsx` |
| NEW component | `src/components/active-timer-bar.tsx` |
| NEW component | `src/components/start-timer-dialog.tsx` |
| NEW component | `src/components/stop-timer-dialog.tsx` |
| NEW component | `src/components/time-entries-table.tsx` |
| MODIFY | `src/app/(protected)/layout.tsx` — add TimerProvider + ActiveTimerBar |
| MODIFY | Ticket list page — add Start button per row |
| MODIFY | Ticket detail page — add Start button + time entries section |

### Dependencies

No new packages needed. All required shadcn/ui components (Dialog, Badge, Textarea, Select) are already installed.

## QA Test Results

**Tested:** 2026-03-27
**App URL:** http://localhost:3000
**Tester:** QA Engineer (AI)
**Method:** Code review + build verification (no running instance)

### Build Verification
- [x] Frontend builds successfully (`npm run build` -- no errors)
- [x] Backend type-checks successfully (`npx tsc --noEmit` -- no errors)
- [x] TimeEntriesModule registered in AppModule
- [x] TimeEntry entity exported from entities/index.ts
- [x] Audit log actions added (TIMER_STARTED, TIMER_STOPPED, TIME_ENTRY_UPDATED, TIME_ENTRY_DELETED)

### Acceptance Criteria Status

#### AC-1: Timer-Start-Button im Ticket (sichtbar fuer Techniker mit Rolle `technician`)
- [x] Start button present on ticket detail page (line 228-234 of tickets/[id]/page.tsx)
- [x] Button disabled when activeTimer exists
- [x] ~~BUG-1~~ FIXED: Button now only visible to technician role (hasRole check added)

#### AC-2: Timer-Start-Button auch in der Ticket-Liste (pro Zeile)
- [x] Play button present in each ticket row (line 441-454 of tickets/page.tsx)
- [x] Button disabled when activeTimer exists
- [x] Button hidden for closed tickets
- [x] ~~BUG-1~~ FIXED: Button now only visible to technician role

#### AC-3: Vor dem Start: Pflichtauswahl des Arbeitstyps
- [x] RadioGroup with phone/remote/onsite options in StartTimerDialog
- [x] Start button disabled when no workType selected
- [x] WorkType reset on dialog open

#### AC-4: Nur ein aktiver Timer pro Techniker systemweit
- [x] Application-level check in service (findOne where isRunning=true)
- [x] Database-level partial unique index created in onModuleInit
- [x] ConflictException thrown with descriptive message
- [x] Frontend disables start button when activeTimer exists
- [x] Frontend shows warning message in dialog when timer already active

#### AC-5: Timer laeuft sichtbar in der UI (Sekundenanzeige, live)
- [x] TimerContext computes elapsedSeconds with setInterval(1000)
- [x] formatElapsedTime displays HH:MM:SS format
- [x] Elapsed time shown in ActiveTimerBar with tabular-nums for stable layout

#### AC-6: Timer-Stop oeffnet Modal: Beschreibung (Pflicht, min. 10 Zeichen)
- [x] StopTimerDialog opens from ActiveTimerBar stop button
- [x] Description textarea with min 10 chars validation
- [x] Character count feedback shown when < 10 chars
- [x] Stop button disabled until description is valid
- [x] Backend DTO validates MinLength(10) on description

#### AC-7: Speicherung: Startzeit, Endzeit, Rohdauer, gerundete Dauer
- [x] startedAt set on start, stoppedAt set on stop
- [x] rawSeconds computed server-side: (now - startedAt) / 1000
- [x] billableMinutes computed via roundToBillableMinutes

#### AC-8: Rundungslogik korrekt
- [x] Backend: Math.ceil(rawSeconds/60) -> Math.ceil(rawMinutes/15)*15
- [x] Frontend: identical rounding function for preview in StopTimerDialog
- [x] Minimum 15 minutes for rawSeconds <= 0

#### AC-9: Zeiteintraege erscheinen in Ticket-Detailseite chronologisch
- [x] TimeEntriesTable component rendered on ticket detail page
- [x] Backend orders by startedAt DESC
- [x] ~~BUG-2~~ FIXED: Order changed to ASC (chronological, oldest first)

#### AC-10: Zeiteintrag-Liste zeigt alle geforderten Felder
- [x] Datum (date + time range)
- [x] Techniker (firstName lastName) -- hidden on mobile (responsive)
- [x] Typ (Badge with color)
- [x] Rohzeit (formatElapsedTime) -- hidden on small screens
- [x] Abrechenbar (formatMinutes, orange if override)
- [x] Beschreibung -- hidden on small screens (truncated)

#### AC-11: Admin kann Zeiteintrag bearbeiten und loeschen
- [x] Edit dialog with description + billable minutes + override note
- [x] Delete with AlertDialog confirmation
- [x] Backend enforces admin role check (ForbiddenException)
- [x] Cannot edit/delete running timers (BadRequestException)
- [x] Override note required when changing billable minutes

#### AC-12: Timer-Zustand wird serverseitig persistiert
- [x] startedAt stored in DB on timer start
- [x] Frontend computes elapsed from startedAt (no local state dependency)
- [x] GET /time-entries/active fetches running timer on page load
- [x] TimerProvider calls refreshTimer on mount

#### AC-13: Globale Timer-Anzeige (Persistent Header-Bar)
- [x] ActiveTimerBar component in protected layout
- [x] Rendered inside SidebarInset, above page header
- [x] Wrapped in TimerProvider context

#### AC-14: Header-Bar zeigt Ticketname, Arbeitstyp-Badge, Laufzeit, Stop-Button
- [x] Ticket name as Link to /tickets/:id
- [x] Work type Badge with color
- [x] Elapsed time in mono font, updating live
- [x] Stop button (destructive variant)
- [x] "Stoppen" text hidden on small screens (icon only)

#### AC-15: Header-Bar nur sichtbar wenn aktiver Timer
- [x] ActiveTimerBar returns null if !activeTimer or isLoadingTimer

### Edge Cases Status

#### EC-1: Zweites Browser-Tab versucht zweiten Timer
- [x] Backend check + DB unique constraint both enforce single timer
- [x] Frontend shows "bereits ein aktiver Timer" message in dialog

#### EC-2: Timer laeuft laenger als 8 Stunden
- [x] Warning shown in StopTimerDialog when elapsedSeconds > 8*60*60
- [x] Warning is informational only (does not block stopping)

#### EC-3: Timer-Start aber Browser geschlossen
- [x] Timer stored server-side with startedAt
- [x] GET /time-entries/active fetches running timer on next login/page load

#### EC-4: Zeiteintrag mit < 30 Sekunden
- [x] Warning shown in StopTimerDialog when elapsedSeconds < 30
- [x] Minimum billable time is 15 minutes (rounding logic)

#### EC-5: Ticket wird geschlossen waehrend Timer laeuft
- [x] ~~BUG-3~~ FIXED: ActiveTimerBar now shows orange warning "Ticket geschlossen" when ticket status is closed

### Security Audit Results

#### Authentication
- [x] All endpoints protected by JwtAuthGuard via @UseGuards on controller class
- [x] Timer start/stop operations use CurrentUser decorator for user identification

#### Authorization
- [x] ~~BUG-4 (CRITICAL)~~ FIXED: @Roles(TECHNICIAN) added to start/stop/findActive, @Roles(ADMIN) added to update/remove
- [x] Stop endpoint correctly checks technicianId === userId (only owner can stop)
- [x] Update/delete endpoints check userRole !== 'admin' in service layer
- [x] ~~BUG-5 (MEDIUM)~~ ACCEPTED: Single-tenant system — all authenticated users can view time entries. JwtAuthGuard ensures authentication.

#### Input Validation
- [x] StartTimerDto validates ticketId (UUID) and workType (enum)
- [x] StopTimerDto validates description (MinLength 10)
- [x] UpdateTimeEntryDto validates optional fields with proper decorators
- [x] ParseUUIDPipe on route params prevents invalid UUIDs
- [x] ~~BUG-6 (LOW)~~ FIXED: encodeURIComponent added to fetchTimeEntries

#### Injection
- [x] TypeORM parameterized queries prevent SQL injection
- [x] No raw SQL except the CREATE INDEX statement (hardcoded, not user-input driven)
- [x] Frontend uses React JSX (auto-escapes XSS)

#### Data Exposure
- [x] sanitize() method strips sensitive fields, only returns id/firstName/lastName for technician
- [x] No password hashes or tokens exposed in time entry responses

#### Rate Limiting
- [x] ThrottlerModule configured globally (60s window, 10 requests) -- but this is very aggressive for normal use. Starting a timer + stopping it + loading entries could hit the limit quickly.
- [x] ~~BUG-7 (MEDIUM)~~ FIXED: Rate limit increased from 10 to 100 requests per 60 seconds

#### Partial Unique Index
- [x] Database constraint enforced via raw SQL in onModuleInit
- [x] Application-level check as fallback before DB insert

### Cross-Browser / Responsive Notes (Code Review)

#### Responsive Design (375px / 768px / 1440px)
- [x] ActiveTimerBar uses flex-wrap, truncates ticket name on mobile
- [x] "Stoppen" text hidden on small screens (icon-only button)
- [x] TimeEntriesTable hides columns progressively (sm: technician, md: raw time, lg: description)
- [x] Filters on ticket list page stack vertically on mobile
- [x] Start timer dialog is responsive (sm:max-w-[425px])

#### Accessibility
- [x] ARIA labels on timer bar (role="status", aria-label)
- [x] ARIA labels on buttons (aria-label="Timer starten", "Timer stoppen")
- [x] Form labels associated with inputs via htmlFor

### Bugs Found

#### BUG-1: Timer Start Button Visible to All Roles -- FIXED
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Log in as an office user
  2. Navigate to any ticket detail page or ticket list
  3. Expected: Timer start button should only be visible to technicians
  4. Actual: Timer start button is visible and functional for all roles
- **Root Cause:** Frontend does not check user role before showing the button. Backend does not restrict the POST /time-entries/start endpoint to technicians only.
- **Priority:** Fix before deployment

#### BUG-2: Time Entries Order May Be Inverted -- FIXED
- **Severity:** Low
- **Steps to Reproduce:**
  1. Create multiple time entries for a ticket
  2. View the time entries table
  3. Expected: Chronological order (oldest first, per spec "chronologisch")
  4. Actual: Reverse chronological (newest first, `order: { startedAt: 'DESC' }`)
- **Note:** DESC may be intentional for UX. Confirm with product owner.
- **Priority:** Nice to have (clarify spec intent)

#### BUG-3: No Warning When Timer Runs on Closed Ticket -- FIXED
- **Severity:** Low
- **Steps to Reproduce:**
  1. Start a timer on an open ticket
  2. Have another user (or admin) close the ticket while timer is running
  3. Expected: Warning displayed in timer bar or stop dialog
  4. Actual: No indication that the ticket is now closed
- **Priority:** Fix in next sprint

#### BUG-4: Missing Role Restrictions on Timer Endpoints -- FIXED
- **Severity:** Critical
- **Steps to Reproduce:**
  1. Log in as an office user (not technician)
  2. Send POST /time-entries/start with valid ticketId and workType
  3. Expected: 403 Forbidden (only technicians can start timers)
  4. Actual: Timer starts successfully for any authenticated user
- **Root Cause:** No @Roles('technician') decorator on start/stop endpoints. The RolesGuard falls through when no roles metadata is set.
- **Priority:** Fix before deployment

#### BUG-5: Time Entries Listing Has No Authorization Scope -- ACCEPTED
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Log in as any authenticated user
  2. Call GET /time-entries?ticketId=<any-valid-uuid>
  3. Expected: Only return entries for tickets the user has access to
  4. Actual: Returns all entries for any ticket regardless of user's relationship to it
- **Note:** In a single-tenant system with all internal users this is acceptable but not best practice.
- **Priority:** Fix in next sprint

#### BUG-6: Missing URL Encoding in fetchTimeEntries -- FIXED
- **Severity:** Low
- **Steps to Reproduce:**
  1. Code review: `src/lib/time-entries.ts` line 117
  2. `ticketId` is interpolated directly into URL without `encodeURIComponent()`
  3. Not exploitable with UUID values, but bad practice
- **Priority:** Nice to have

#### BUG-7: Overly Aggressive Global Rate Limiting -- FIXED
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Navigate rapidly between ticket pages
  2. Each page load triggers 3+ API requests (ticket, time entries, active timer)
  3. Expected: Normal browsing works without hitting rate limits
  4. Actual: After ~3 page loads in 60 seconds, rate limit kicks in (10 req/60s)
- **Root Cause:** ThrottlerModule configured with limit:10 in app.module.ts, applied globally
- **Note:** This is a pre-existing issue (PROJ-1 era) but now more impactful with additional API calls from PROJ-4
- **Priority:** Fix before deployment

#### BUG-8: Time Entries Table Does Not Refresh After Stopping Timer -- FIXED
- **Severity:** High
- **Steps to Reproduce:**
  1. Start a timer on a ticket
  2. Navigate to that ticket's detail page
  3. Stop the timer via the ActiveTimerBar
  4. Expected: TimeEntriesTable updates to show the new completed entry
  5. Actual: Table still shows old data; requires manual page refresh
- **Root Cause:** StopTimerDialog in ActiveTimerBar does not communicate back to TimeEntriesTable. There is an `onStopped` callback prop on StopTimerDialog, but ActiveTimerBar does not pass it, and even if it did, there is no mechanism to trigger a reload of the TimeEntriesTable from the layout level.
- **Priority:** Fix before deployment

#### BUG-9: Frontend Description Validation Mismatch -- FIXED
- **Severity:** Low
- **Steps to Reproduce:**
  1. Open stop timer dialog
  2. Enter exactly 10 spaces
  3. Frontend checks `description.trim().length >= 10` (correct, would reject)
  4. However, `handleStop` sends `description.trim()` to the backend
  5. Backend MinLength(10) checks the received (already trimmed) string
  6. This is actually correct but the edit dialog (TimeEntriesTable) does NOT trim before sending and has no minimum length check in the UI for the description field
- **Root Cause:** In the edit dialog, admin can change description to any length including empty -- backend requires MinLength(10) but UI does not enforce it.
- **Priority:** Nice to have

### Regression Testing (Deployed Features)

#### PROJ-1: User Authentication & Roles
- [x] AuthProvider still wraps protected layout correctly
- [x] JwtAuthGuard still applied to all time-entries endpoints
- [x] No changes to auth flow
- [x] Login/logout/refresh unaffected

#### PROJ-2: Customer & Contact Management
- [x] No modifications to customer-related files
- [x] Customer display in ticket detail page unchanged

#### PROJ-3: Ticket Management
- [x] Ticket list page: only added timer button column (non-breaking)
- [x] Ticket detail page: added timer button and TimeEntriesTable (non-breaking)
- [x] Ticket CRUD operations unaffected
- [x] Ticket notes functionality unchanged
- [x] Ticket close functionality unchanged
- [x] Ticket filters and sorting still work (no changes to underlying logic)

### Summary
- **Acceptance Criteria:** 15/15 passed (all bugs fixed)
- **Edge Cases:** 5/5 passed (BUG-3 fixed)
- **Bugs Found:** 9 total — all resolved (8 fixed, 1 accepted as designed)
- **Security:** All issues resolved (BUG-4 critical role restrictions fixed)
- **Regression:** No regressions detected
- **Production Ready:** YES (pending re-QA)
- **Bug Fix Round:** 2026-03-27 — all 9 bugs addressed

---

## Re-QA Test Results (Round 2)

**Tested:** 2026-03-27
**App URL:** http://localhost:3000
**Tester:** QA Engineer (AI)
**Method:** Code review + build verification (frontend build + backend tsc --noEmit)

### Build Verification
- [x] Frontend builds successfully (`npm run build` -- no errors)
- [x] Backend type-checks successfully (`npx tsc --noEmit` -- no errors)
- [x] TimeEntriesModule registered in AppModule
- [x] TimeEntry entity exported from entities/index.ts
- [x] Rate limit updated to 100 req/60s (BUG-7 fix verified)

### Previous Bug Fix Verification

| Bug | Status | Verified |
|-----|--------|----------|
| BUG-1: Timer visible to all roles | FIXED | [x] `isTechnician` check on detail page (line 229) and list page (line 442) |
| BUG-2: Time entries order inverted | FIXED | [x] `order: { startedAt: 'ASC' }` in service (line 177) |
| BUG-3: No warning on closed ticket | FIXED | [x] Orange warning shown in ActiveTimerBar (line 54-58) |
| BUG-4: Missing role restrictions | FIXED | [x] `@Roles(UserRole.TECHNICIAN)` on start/stop/findActive, `@Roles(UserRole.ADMIN)` on update/remove |
| BUG-5: No authorization scope on listing | ACCEPTED | [x] Single-tenant design decision documented |
| BUG-6: Missing URL encoding | FIXED | [x] `encodeURIComponent(ticketId)` on line 118 of time-entries.ts |
| BUG-7: Aggressive rate limiting | FIXED | [x] ThrottlerModule limit changed from 10 to 100 |
| BUG-8: Table not refreshing after stop | FIXED | [x] `timerStoppedVersion` context value triggers `loadEntries()` via useEffect (line 103-107 of time-entries-table.tsx) |
| BUG-9: Edit dialog description validation | FIXED | [x] Save button disabled when `editDescription.trim().length < 10` (line 408) |

### Acceptance Criteria Re-Verification (All 15)

- [x] AC-1: Timer-Start-Button visible only to technicians on ticket detail page
- [x] AC-2: Timer-Start-Button visible only to technicians on ticket list (per row)
- [x] AC-3: Work type selection required before start (RadioGroup, button disabled without selection)
- [x] AC-4: Single active timer enforced (DB unique index + app check + frontend disables button)
- [x] AC-5: Live elapsed time ticking via setInterval(1000) in TimerContext
- [x] AC-6: Stop dialog with required description (min 10 chars, trimmed, character count shown)
- [x] AC-7: startedAt/stoppedAt/rawSeconds/billableMinutes all computed and stored
- [x] AC-8: Rounding logic correct (Math.ceil(rawSeconds/60) -> Math.ceil(rawMinutes/15)*15, min 15)
- [x] AC-9: Time entries in ticket detail page, ordered ASC (chronological)
- [x] AC-10: Table shows all required fields with responsive column hiding
- [x] AC-11: Admin can edit (description, billable override with note) and delete (with confirmation)
- [x] AC-12: Server-side persistence -- startedAt in DB, frontend computes elapsed, refreshTimer on mount
- [x] AC-13: ActiveTimerBar in protected layout (inside SidebarInset, above header)
- [x] AC-14: Header-bar shows ticket link, work type badge, elapsed time, stop button
- [x] AC-15: Header-bar hidden when no active timer (returns null)

### Edge Cases Re-Verification (All 5)

- [x] EC-1: Second browser tab blocked by DB constraint + app check + frontend warning
- [x] EC-2: >8h warning shown in StopTimerDialog
- [x] EC-3: Browser closed -- timer persists server-side, loaded via GET /active on next visit
- [x] EC-4: <30s warning shown, minimum billing 15 min
- [x] EC-5: Closed ticket -- orange warning in ActiveTimerBar

### New Bugs Found (Round 2)

#### BUG-10: TimerProvider calls /active endpoint for non-technician users
- **Severity:** Low
- **Steps to Reproduce:**
  1. Log in as an admin or office user
  2. Navigate to any protected page
  3. Open browser DevTools network tab
  4. Expected: No call to /time-entries/active (only technicians have timers)
  5. Actual: GET /time-entries/active is called and returns 403 Forbidden
- **Root Cause:** `TimerProvider.refreshTimer()` calls `fetchActiveTimer()` for all authenticated users without checking role. The endpoint `@Roles(UserRole.TECHNICIAN)` rejects non-technicians with 403. The error is silently caught, so no user-visible issue, but it generates unnecessary 403 errors in server logs on every page load for admin/office users.
- **Fix:** Check `user.role === 'technician'` in `refreshTimer()` before calling `fetchActiveTimer()`.
- **Priority:** Nice to have

#### BUG-11: Backend accepts whitespace-only descriptions via direct API call
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Start a timer via the UI
  2. Send a direct API request: `POST /api/time-entries/:id/stop` with body `{"description": "          "}` (10 spaces)
  3. Expected: Validation error (description should contain meaningful content)
  4. Actual: Description is accepted because `@MinLength(10)` counts spaces
- **Root Cause:** `StopTimerDto` and `UpdateTimeEntryDto` use `@MinLength(10)` but do not trim whitespace. Frontend correctly trims before sending, but the backend itself does not enforce trimming. A direct API caller could store meaningless whitespace descriptions.
- **Fix:** Add `@Transform(({ value }) => value?.trim())` from `class-transformer` to the `description` field in both DTOs, or add a `@Matches(/\S/)` validator.
- **Priority:** Fix before deployment (data integrity concern for billing documentation)

#### BUG-12: Race condition on timer start produces unhelpful 500 error
- **Severity:** Low
- **Steps to Reproduce:**
  1. Open two browser tabs as the same technician
  2. Click "Start Timer" on different tickets in both tabs simultaneously
  3. Expected: One succeeds, the other shows "Es laeuft bereits ein Timer" (409 Conflict)
  4. Actual: One succeeds, the other may get a 500 Internal Server Error (unhandled unique constraint violation from the DB partial unique index)
- **Root Cause:** `TimeEntriesService.start()` has a TOCTOU race between the `findOne` check (line 65) and `save` (line 82). The DB partial unique index correctly prevents the second insert, but the resulting `QueryFailedError` is not caught and mapped to a user-friendly `ConflictException`.
- **Fix:** Wrap the `save()` call in a try-catch that catches the unique constraint violation error and throws `ConflictException` instead.
- **Priority:** Nice to have (unlikely in normal usage, DB constraint prevents data corruption)

### Security Audit (Round 2)

#### Authentication
- [x] All endpoints protected by `@UseGuards(JwtAuthGuard, RolesGuard)` at controller class level
- [x] `CurrentUser` decorator used for user identification in start/stop

#### Authorization
- [x] `@Roles(UserRole.TECHNICIAN)` on start, stop, findActive
- [x] `@Roles(UserRole.ADMIN)` on update, remove
- [x] Stop checks `entry.technicianId !== userId` (IDOR protection)
- [x] Update/delete double-checks `userRole !== 'admin'` in service layer
- [x] GET /time-entries has no role restriction (any authenticated user can list) -- accepted for single-tenant

#### Input Validation
- [x] `StartTimerDto`: ticketId (@IsUUID), workType (@IsEnum)
- [x] `StopTimerDto`: description (@IsString, @MinLength(10))
- [x] `UpdateTimeEntryDto`: optional fields with proper validators, billableMinutes (@Min(15))
- [x] `TimeEntryFilterDto`: ticketId (@IsUUID, @IsOptional)
- [x] `ParseUUIDPipe` on route params
- [x] `ValidationPipe` with `whitelist: true` and `forbidNonWhitelisted: true` (prevents extra fields)
- [ ] BUG-11: No whitespace trimming on description fields

#### Injection Prevention
- [x] TypeORM parameterized queries (no raw SQL with user input)
- [x] Partial unique index creation uses hardcoded SQL (no user input)
- [x] React JSX auto-escapes XSS in frontend rendering

#### Data Exposure
- [x] `sanitize()` method strips sensitive fields from user relation (only id/firstName/lastName)
- [x] No password hashes or tokens in responses
- [x] Ticket relation only exposes id/ticketNumber/subject/status

#### Rate Limiting
- [x] ThrottlerModule: 100 requests per 60 seconds (reasonable for normal use)
- [x] Applied globally via module import

### Regression Testing (Deployed Features)

#### PROJ-1: User Authentication & Roles
- [x] AuthProvider wraps protected layout correctly
- [x] JwtAuthGuard applied on all time-entries endpoints
- [x] RolesGuard correctly reads `@Roles()` metadata and falls through when no roles set
- [x] Login/logout flow unaffected (no auth file changes)

#### PROJ-2: Customer & Contact Management
- [x] No modifications to customer-related files
- [x] Customer display in ticket detail page unchanged

#### PROJ-3: Ticket Management
- [x] Ticket list page: timer button column added (non-breaking, technician-only)
- [x] Ticket detail page: timer button + TimeEntriesTable added (non-breaking)
- [x] Ticket CRUD operations unaffected
- [x] Ticket notes functionality unchanged
- [x] Ticket close functionality unchanged

### Summary (Round 2)
- **Acceptance Criteria:** 15/15 passed
- **Edge Cases:** 5/5 passed
- **Previous Bugs (1-9):** All verified fixed/accepted
- **New Bugs Found:** 3 total (0 critical, 0 high, 1 medium, 2 low)
  - BUG-10 (Low): Unnecessary 403 for non-technician users on timer endpoint
  - BUG-11 (Medium): Whitespace-only descriptions accepted by backend
  - BUG-12 (Low): Race condition yields 500 instead of 409
- **Security:** One medium input validation gap (BUG-11), otherwise solid
- **Regression:** No regressions detected
- **Production Ready:** YES -- with recommendation to fix BUG-11 before deployment

## QA Test Results (Round 3 -- Full Re-verification)

**Tested:** 2026-03-27
**App URL:** http://localhost:3000
**Tester:** QA Engineer (AI)
**Method:** Code review + build verification (npm run build + tsc --noEmit)

### Build Verification

- [x] Frontend builds successfully (`npm run build` -- no errors, Turbopack 3.7s)
- [x] Backend type-checks successfully (`npx tsc --noEmit` -- no errors)
- [x] TimeEntriesModule registered in AppModule (line 37)
- [x] TimeEntry entity exported from entities/index.ts (line 8)
- [x] All 4 audit actions present: TIMER_STARTED, TIMER_STOPPED, TIME_ENTRY_UPDATED, TIME_ENTRY_DELETED
- [x] Rate limit set to 100 req/60s (BUG-7 fix confirmed)

### Previous Bug Fix Verification (Bugs 1-12)

| Bug | Status | Verification Details |
|-----|--------|---------------------|
| BUG-1: Timer visible to all roles | FIXED | `isTechnician` check in ticket detail (line 229) and ticket list (line 442) |
| BUG-2: Time entries order inverted | FIXED | `order: { startedAt: 'ASC' }` in service (line 188) |
| BUG-3: No warning on closed ticket | FIXED | Orange warning in ActiveTimerBar (line 54-58, AlertTriangle icon) |
| BUG-4: Missing role restrictions | FIXED | `@Roles(UserRole.TECHNICIAN)` on start/stop/findActive, `@Roles(UserRole.ADMIN)` on update/remove |
| BUG-5: No authorization scope on listing | ACCEPTED | Single-tenant design decision |
| BUG-6: Missing URL encoding | FIXED | `encodeURIComponent(ticketId)` in fetchTimeEntries (line 118) |
| BUG-7: Aggressive rate limiting | FIXED | ThrottlerModule limit: 100 (app.module.ts line 17) |
| BUG-8: Table not refreshing after stop | FIXED | `timerStoppedVersion` context triggers `loadEntries()` (time-entries-table.tsx line 103-107) |
| BUG-9: Edit dialog description validation | FIXED | Save button disabled when `editDescription.trim().length < 10` (line 408) |
| BUG-10: /active called for non-technicians | FIXED | `user.role !== "technician"` check in refreshTimer (timer-context.tsx line 41) |
| BUG-11: Whitespace-only descriptions via API | FIXED | `@Transform(({ value }) => value.trim())` on StopTimerDto (line 6) and UpdateTimeEntryDto (line 6) |
| BUG-12: Race condition 500 error | FIXED | Try-catch in start() catches DB error code 23505 and throws ConflictException (service line 85-93) |

### Acceptance Criteria Re-Verification (All 15)

#### AC-1: Timer-Start-Button im Ticket (sichtbar fuer Techniker)
- [x] PASS -- Button visible only when `isTechnician` is true (line 229)
- [x] PASS -- Button disabled when `!!activeTimer` (line 233)

#### AC-2: Timer-Start-Button in Ticket-Liste (pro Zeile)
- [x] PASS -- Play button in each row, wrapped in `isTechnician &&` check (line 442)
- [x] PASS -- Hidden for closed tickets (line 444)
- [x] PASS -- Disabled when activeTimer exists (line 453)

#### AC-3: Pflichtauswahl des Arbeitstyps
- [x] PASS -- RadioGroup with phone/remote/onsite (start-timer-dialog.tsx line 94-117)
- [x] PASS -- Start button disabled when `!workType` (line 129)
- [x] PASS -- WorkType reset on dialog open (line 47-51)

#### AC-4: Nur ein aktiver Timer pro Techniker systemweit
- [x] PASS -- Application check: findOne where isRunning=true (service line 65-72)
- [x] PASS -- DB partial unique index created in onModuleInit (service line 40-48)
- [x] PASS -- Race condition handled with try-catch for error code 23505 (service line 85-93)
- [x] PASS -- Frontend disables start button (line 233/453)
- [x] PASS -- Warning message shown in dialog when timer active (start-timer-dialog.tsx line 81-89)

#### AC-5: Timer laeuft sichtbar in der UI (Sekundenanzeige, live)
- [x] PASS -- setInterval(1000) in TimerContext computes elapsed (timer-context.tsx line 64-79)
- [x] PASS -- formatElapsedTime shows HH:MM:SS (time-entries.ts line 59-65)
- [x] PASS -- tabular-nums class for stable layout (active-timer-bar.tsx line 50)

#### AC-6: Timer-Stop oeffnet Modal mit Pflichtbeschreibung (min. 10 Zeichen)
- [x] PASS -- StopTimerDialog opens from ActiveTimerBar stop button (line 65, 73-76)
- [x] PASS -- Textarea with min 10 chars validation (stop-timer-dialog.tsx line 60)
- [x] PASS -- Character count feedback when < 10 chars (line 159-163)
- [x] PASS -- Stop button disabled until description valid (line 174)
- [x] PASS -- Backend validates MinLength(10) with trim transform (stop-timer.dto.ts line 6-7)

#### AC-7: Speicherung: Startzeit, Endzeit, Rohdauer, gerundete Dauer
- [x] PASS -- startedAt set on start (service line 78)
- [x] PASS -- stoppedAt set on stop (service line 138)
- [x] PASS -- rawSeconds computed: (now - startedAt) / 1000 (service line 133-135)
- [x] PASS -- billableMinutes via roundToBillableMinutes (service line 136)

#### AC-8: Rundungslogik korrekt
- [x] PASS -- Backend: Math.ceil(rawSeconds/60) -> Math.ceil(rawMinutes/15)*15 (service line 289-293)
- [x] PASS -- Frontend: identical function (time-entries.ts line 51-55)
- [x] PASS -- Minimum 15 min for rawSeconds <= 0

#### AC-9: Zeiteintraege in Ticket-Detailseite chronologisch
- [x] PASS -- TimeEntriesTable rendered on ticket detail page (line 362)
- [x] PASS -- Backend orders by startedAt ASC (service line 188)

#### AC-10: Zeiteintrag-Liste zeigt alle geforderten Felder
- [x] PASS -- Datum (date + time range, line 264-269)
- [x] PASS -- Techniker (firstName lastName, hidden on mobile, line 271-273)
- [x] PASS -- Typ (Badge with color, line 274-280)
- [x] PASS -- Rohzeit (formatElapsedTime, hidden on sm, line 282-289)
- [x] PASS -- Abrechenbar (formatMinutes, orange if override, line 291-302)
- [x] PASS -- Beschreibung (hidden on lg, truncated, line 303-305)

#### AC-11: Admin kann Zeiteintrag bearbeiten und loeschen
- [x] PASS -- Edit dialog with description, billable minutes, override note (line 342-413)
- [x] PASS -- Delete with AlertDialog confirmation (line 417-437)
- [x] PASS -- Backend enforces admin role (service line 198, 252)
- [x] PASS -- Cannot edit/delete running timers (service line 209-213, 263-266)
- [x] PASS -- Override note required when changing billable minutes (service line 216-224)

#### AC-12: Timer-Zustand serverseitig persistiert
- [x] PASS -- startedAt stored in DB on start (service line 74-80)
- [x] PASS -- Frontend computes elapsed from startedAt (timer-context.tsx line 70-73)
- [x] PASS -- GET /time-entries/active fetches on mount (timer-context.tsx line 47)
- [x] PASS -- refreshTimer called on mount after auth loads (line 57-61)

#### AC-13: Globale Timer-Anzeige (Persistent Header-Bar)
- [x] PASS -- ActiveTimerBar in protected layout (layout.tsx line 35)
- [x] PASS -- Inside SidebarInset, above page header (line 34-35)
- [x] PASS -- Wrapped in TimerProvider context (line 31)

#### AC-14: Header-Bar zeigt Ticketname, Arbeitstyp-Badge, Laufzeit, Stop-Button
- [x] PASS -- Ticket name as Link (active-timer-bar.tsx line 36-41)
- [x] PASS -- Work type Badge with color (line 43-48)
- [x] PASS -- Elapsed time in mono font (line 50-52)
- [x] PASS -- Stop button (destructive variant, line 62-70)
- [x] PASS -- "Stoppen" text hidden on small screens (line 69)

#### AC-15: Header-Bar nur sichtbar wenn aktiver Timer
- [x] PASS -- Returns null if `isLoadingTimer || !activeTimer` (line 22)

### Edge Cases Re-Verification (All 5)

#### EC-1: Zweites Browser-Tab versucht zweiten Timer
- [x] PASS -- Backend app-level check (service line 65-72)
- [x] PASS -- DB unique constraint (service line 40-48)
- [x] PASS -- DB constraint violation caught and mapped to ConflictException (service line 85-93)
- [x] PASS -- Frontend shows warning (start-timer-dialog.tsx line 81-89)

#### EC-2: Timer laeuft laenger als 8 Stunden
- [x] PASS -- Warning shown in StopTimerDialog (stop-timer-dialog.tsx line 128-135)
- [x] PASS -- Informational only, does not block stopping

#### EC-3: Timer-Start aber Browser geschlossen
- [x] PASS -- Timer in DB with startedAt
- [x] PASS -- GET /time-entries/active fetches on next visit (timer-context.tsx line 47)

#### EC-4: Zeiteintrag mit < 30 Sekunden
- [x] PASS -- Warning shown (stop-timer-dialog.tsx line 137-144)
- [x] PASS -- Minimum billable time is 15 min

#### EC-5: Ticket geschlossen waehrend Timer laeuft
- [x] PASS -- Orange warning in ActiveTimerBar (line 24, 54-58)
- [x] PASS -- Timer still stoppable (stop button remains functional)

### New Bugs Found (Round 3)

#### BUG-13: Override note field not trimmed in UpdateTimeEntryDto
- **Severity:** Low
- **Steps to Reproduce:**
  1. As admin, edit a time entry and change the billable minutes
  2. Enter only spaces in the override note field via direct API call: `PATCH /api/time-entries/:id` with `{"billableMinutes": 30, "overrideNote": " "}`
  3. Expected: Validation error (override note should contain meaningful content)
  4. Actual: Passes `@MinLength(1)` validation because whitespace is counted
- **Root Cause:** `overrideNote` in `UpdateTimeEntryDto` has `@MinLength(1)` but no `@Transform` for trimming, unlike the `description` field which was fixed with `@Transform(({ value }) => value.trim())`.
- **Impact:** Minor data quality issue. Admin could store meaningless whitespace-only override notes when adjusting billable minutes.
- **Priority:** Nice to have

#### BUG-14: Edit dialog billable minutes input allows values below 15
- **Severity:** Low
- **Steps to Reproduce:**
  1. As admin, open the edit dialog for a time entry
  2. Change billable minutes to 5 (below the 15-minute minimum)
  3. Expected: Frontend prevents values below 15
  4. Actual: Frontend allows the value (HTML `min={0}` instead of `min={15}`). Backend correctly rejects with `@Min(15)`.
- **Root Cause:** `time-entries-table.tsx` line 373 has `min={0}` instead of `min={15}`.
- **Impact:** Users see a generic error from backend instead of clear frontend validation. Backend correctly prevents bad data.
- **Priority:** Nice to have (UX improvement)

#### BUG-15: Empty payload submission allowed in edit dialog
- **Severity:** Low
- **Steps to Reproduce:**
  1. As admin, open the edit dialog for a time entry
  2. Do not change any values
  3. Click "Speichern"
  4. Expected: Button disabled when no changes are made, or a "no changes" message
  5. Actual: An empty `{}` is sent to the PATCH endpoint. Backend saves with no changes and creates an audit log entry saying "time entry updated" with no actual changes.
- **Root Cause:** `handleSaveEdit()` does not check if `payload` is empty before sending. No frontend guard to prevent no-op submissions.
- **Impact:** Creates misleading audit log entries. No data corruption risk.
- **Priority:** Nice to have

### Security Audit (Round 3)

#### Authentication
- [x] All endpoints protected by `@UseGuards(JwtAuthGuard, RolesGuard)` at controller class level
- [x] `CurrentUser` decorator used for user identification in start/stop
- [x] Cookie-based JWT with httpOnly cookies (from PROJ-1 auth system)

#### Authorization
- [x] `@Roles(UserRole.TECHNICIAN)` on start, stop, findActive
- [x] `@Roles(UserRole.ADMIN)` on update, remove
- [x] Stop checks `entry.technicianId !== userId` (IDOR protection -- only owner stops own timer)
- [x] Update/delete double-checks `userRole !== 'admin'` in service layer (defense in depth)
- [x] GET /time-entries has no role restriction -- accepted for single-tenant environment
- [x] RolesGuard correctly falls through (allows access) when no `@Roles()` metadata is set

#### Input Validation
- [x] `StartTimerDto`: ticketId (@IsUUID), workType (@IsEnum)
- [x] `StopTimerDto`: description (@IsString, @Transform trim, @MinLength(10))
- [x] `UpdateTimeEntryDto`: description with trim transform, billableMinutes (@Min(15)), overrideNote (@MinLength(1))
- [x] `TimeEntryFilterDto`: ticketId (@IsUUID, @IsOptional)
- [x] `ParseUUIDPipe` on all route params
- [x] `ValidationPipe` with `whitelist: true` and `forbidNonWhitelisted: true` (main.ts line 13-17)
- [ ] BUG-13: overrideNote not trimmed (minor)

#### Injection Prevention
- [x] TypeORM parameterized queries -- no raw SQL with user input
- [x] Partial unique index creation uses hardcoded SQL only (service line 40-48)
- [x] React JSX auto-escapes XSS in all frontend rendering
- [x] No `dangerouslySetInnerHTML` usage anywhere

#### Data Exposure
- [x] `sanitize()` method strips sensitive fields -- only returns id/firstName/lastName for technician
- [x] Ticket relation only exposes id/ticketNumber/subject/status
- [x] No password hashes, tokens, or internal fields in API responses
- [x] No createdAt/updatedAt timestamps leaked from time entry entity

#### Rate Limiting
- [x] ThrottlerModule: 100 requests per 60 seconds (reasonable for normal use)
- [x] Applied globally via module import

#### CORS
- [x] CORS origin restricted to `CORS_ORIGIN` env var or localhost:3000 default (main.ts line 20-23)

### Cross-Browser / Responsive Notes (Code Review)

#### Responsive Design (375px / 768px / 1440px)
- [x] ActiveTimerBar: flex-wrap layout, ticket name truncated to max-w-[200px] on mobile, full width on desktop
- [x] "Stoppen" text hidden on small screens via `hidden sm:inline` (icon-only button)
- [x] TimeEntriesTable: progressive column hiding (sm: technician, md: raw time, lg: description)
- [x] Start timer dialog: responsive with `sm:max-w-[425px]`
- [x] Stop timer dialog: responsive with `sm:max-w-[480px]`
- [x] Edit dialog: responsive with `sm:max-w-[480px]`
- [x] Timer button on ticket list: small icon-only button (h-8 w-8)

#### Accessibility
- [x] `role="status"` and `aria-label="Aktiver Timer"` on timer bar
- [x] `aria-label="Timer starten"` on start buttons
- [x] `aria-label="Timer stoppen"` on stop button
- [x] `aria-label="Zeiteintrag bearbeiten"` and `aria-label="Zeiteintrag loeschen"` on admin actions
- [x] Form labels with `htmlFor` on all inputs
- [x] Character count feedback for description validation

### Regression Testing (Deployed Features)

#### PROJ-1: User Authentication & Roles
- [x] AuthProvider still wraps protected layout correctly (layout.tsx line 53)
- [x] JwtAuthGuard applied on all time-entries endpoints
- [x] RolesGuard properly reads @Roles metadata
- [x] Login/logout/refresh flows unaffected (no auth file changes in this diff)

#### PROJ-2: Customer & Contact Management
- [x] No modifications to customer-related files
- [x] Customer display in ticket detail page unchanged (line 372-386)

#### PROJ-3: Ticket Management
- [x] Ticket list page: timer button column added (non-breaking, technician-only)
- [x] Ticket detail page: timer button + TimeEntriesTable added (non-breaking additions)
- [x] Ticket CRUD operations unaffected (no changes to ticket service/controller)
- [x] Ticket notes functionality unchanged
- [x] Ticket close functionality unchanged
- [x] Ticket filters and sorting still work

### Summary (Round 3)
- **Acceptance Criteria:** 15/15 passed
- **Edge Cases:** 5/5 passed
- **Previous Bugs (1-12):** All verified fixed/accepted
- **New Bugs Found:** 3 total (0 critical, 0 high, 0 medium, 3 low)
  - BUG-13 (Low): Override note field not trimmed in UpdateTimeEntryDto
  - BUG-14 (Low): Edit dialog billable minutes min=0 instead of min=15
  - BUG-15 (Low): Empty payload submission allowed in edit dialog
- **Security:** Solid -- no critical or high issues. One minor trim gap (BUG-13).
- **Regression:** No regressions detected
- **Production Ready:** YES

## Deployment
- **Deployed:** 2026-03-27
- **Method:** Docker Compose (self-hosted, hinter Nginx Proxy Manager)
- **QA Runden:** 3 (alle 15 ACs bestanden, 12 Bugs gefixed, 3 Low-Prio offen)
- **Offene Low-Prio Bugs:** BUG-13 (overrideNote trim), BUG-14 (min=0 statt min=15 im Edit-Dialog), BUG-15 (leere Payload im Edit-Dialog)
