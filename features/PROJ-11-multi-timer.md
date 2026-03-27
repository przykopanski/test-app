# PROJ-11: Multi-Timer (Parallele Zeiterfassung)

## Status: In Review
**Created:** 2026-03-27
**Last Updated:** 2026-03-27

## Dependencies
- Requires: PROJ-4 (Stopwatch & Time Tracking) — erweitert die bestehende Timer-Logik

## Kontext
PROJ-4 beschränkte jeden Techniker auf einen einzigen aktiven Timer systemweit. PROJ-11 hebt diese Beschränkung auf: Ein Techniker darf gleichzeitig auf mehreren Tickets arbeiten und für jedes Ticket einen eigenen Timer laufen lassen. Die neue Regel lautet: **maximal 1 aktiver Timer pro Techniker pro Ticket** (statt 1 global).

## User Stories
- Als Techniker möchte ich Timer auf mehreren Tickets gleichzeitig laufen lassen, damit ich parallele Tätigkeiten (z.B. Fernwartung + Telefonat) korrekt erfassen kann
- Als Techniker möchte ich auf einem Blick alle meine laufenden Timer sehen, damit ich nichts vergesse zu stoppen
- Als Techniker möchte ich nicht versehentlich zwei Timer auf demselben Ticket starten können
- Als Techniker möchte ich jeden Timer einzeln stoppen und beschreiben können
- Als Office-Mitarbeiter möchte ich weiterhin alle Zeiteinträge eines Tickets sehen, unabhängig davon wie viele Techniker gleichzeitig daran arbeiten

## Acceptance Criteria

### Timer-Regeln
- [ ] Ein Techniker darf beliebig viele aktive Timer gleichzeitig haben (keine globale Obergrenze)
- [ ] Pro Techniker ist maximal 1 aktiver Timer pro Ticket erlaubt (DB Unique Constraint auf `technician_id` + `ticket_id` wenn `is_running = true`)
- [ ] Mehrere Techniker dürfen gleichzeitig Timer auf demselben Ticket laufen haben
- [ ] Versuch, einen zweiten Timer auf demselben Ticket zu starten → Fehlermeldung: "Du hast bereits einen aktiven Timer auf diesem Ticket"

### ActiveTimerBar (gestapelt)
- [ ] Die ActiveTimerBar zeigt alle laufenden Timer des Technikers als gestapelte Zeilen
- [ ] Jede Zeile zeigt: Ticketnummer + Betreff (als Link), Arbeitstyp-Badge, Laufzeit (HH:MM:SS live), Stop-Button
- [ ] Ticketname wird auf maximal 200px Breite abgeschnitten (truncate) — mobil kürzer
- [ ] Jeder Stop-Button öffnet den StopTimerDialog für genau diesen Timer
- [ ] Bar ist nur sichtbar wenn mindestens ein Timer aktiv ist

### Start-Button (Ticket-Liste & Ticket-Detail)
- [ ] Start-Button ist deaktiviert wenn der Techniker bereits einen aktiven Timer auf **diesem spezifischen Ticket** hat
- [ ] Start-Button ist aktiv wenn der Techniker Timer auf anderen Tickets hat, aber nicht auf diesem
- [ ] Tooltip/Hinweis am deaktivierten Button: "Bereits ein Timer auf diesem Ticket aktiv"

### Backend
- [ ] `GET /time-entries/active` gibt ein **Array** aller laufenden Timer des eingeloggten Technikers zurück (statt einzelnes Objekt)
- [ ] `POST /time-entries/start` prüft nur noch ob für diese Kombination aus `technician_id` + `ticket_id` bereits ein laufender Timer existiert
- [ ] Alter Unique Constraint (`is_running = true` pro `technician_id`) wird durch neuen Constraint (`is_running = true` pro `technician_id` + `ticket_id`) ersetzt
- [ ] Race Condition wird weiterhin per Try-Catch auf DB-Fehler `23505` abgefangen

### TimerContext (Frontend)
- [ ] `activeTimer` (einzelnes Objekt) wird zu `activeTimers` (Array)
- [ ] `elapsedSeconds` wird zu `Map<timerId, number>` — jeder Timer hat eigene Laufzeit
- [ ] `refreshTimer` lädt alle aktiven Timer des Technikers beim Seitenload
- [ ] Interval (1 Sekunde) aktualisiert alle Laufzeiten parallel

## Edge Cases
- Techniker öffnet zweites Tab und startet Timer auf gleichem Ticket: DB Constraint blockt, ConflictException → Fehlermeldung im Dialog
- Techniker hat 5+ Timer gleichzeitig: Bar scrollt oder bricht um (kein Layout-Bruch)
- Ticket wird geschlossen während ein Timer darauf läuft: orangefarbene Warnung in der jeweiligen Zeile der ActiveTimerBar (wie bisher, nur pro Timer-Zeile)
- Timer läuft länger als 8 Stunden: Warnung erscheint beim Stoppen dieses Timers (unverändert)
- Zeiteintrag < 30 Sekunden: Warnung beim Stoppen (unverändert)

## Nicht im Scope
- Priorisierung oder Sortierung der Timer-Reihenfolge in der Bar
- "Alle Timer stoppen" Sammel-Aktion
- Maximale Anzahl paralleler Timer pro Techniker (keine künstliche Grenze)

## Geänderte Dateien (Schätzung)
| Datei | Änderung |
|-------|----------|
| `backend/src/time-entries/time-entries.service.ts` | Unique-Check-Logik + `findActive` gibt Array zurück |
| `src/components/timer-context.tsx` | `activeTimer` → `activeTimers[]`, Map für elapsedSeconds |
| `src/components/active-timer-bar.tsx` | Mehrere Zeilen statt einer |
| `src/components/start-timer-dialog.tsx` | Prüft ob Timer für **dieses** Ticket aktiv (statt global) |
| `src/app/(protected)/tickets/[id]/page.tsx` | Disabled-Check angepasst |
| `src/app/(protected)/tickets/page.tsx` | Disabled-Check angepasst |

---

## QA Test Results

**Tested:** 2026-03-27
**App URL:** http://localhost:3000
**Tester:** QA Engineer (AI)
**Method:** Code review + build verification (both frontend and backend compile successfully)

### Acceptance Criteria Status

#### AC-1: Timer-Regeln

- [x] Ein Techniker darf beliebig viele aktive Timer gleichzeitig haben -- Backend `start()` only checks for existing timer on the same ticket (line 74-80 in service), no global limit enforced
- [x] Pro Techniker ist maximal 1 aktiver Timer pro Ticket erlaubt -- DB partial unique index `UQ_one_running_timer_per_technician_per_ticket` on `(technicianId, ticketId) WHERE isRunning = true` (service line 47-52)
- [x] Mehrere Techniker duerfen gleichzeitig Timer auf demselben Ticket laufen haben -- Constraint includes `technicianId`, so different technicians are not blocked
- [x] Versuch, zweiten Timer auf demselben Ticket zu starten liefert Fehlermeldung "Du hast bereits einen aktiven Timer auf diesem Ticket" -- ConflictException at service line 78-80

#### AC-2: ActiveTimerBar (gestapelt)

- [x] ActiveTimerBar zeigt alle laufenden Timer als gestapelte Zeilen -- `activeTimers.map()` renders a `TimerRow` per timer (active-timer-bar.tsx line 86-93)
- [x] Jede Zeile zeigt: Ticketnummer + Betreff (Link), Arbeitstyp-Badge, Laufzeit (HH:MM:SS live), Stop-Button -- All present in `TimerRow` component (lines 28-76)
- [x] Ticketname auf maximal 200px Breite abgeschnitten (truncate) -- `truncate max-w-[200px]` class applied (line 41)
- [ ] **BUG** Mobil kuerzer als 200px -- Spec says "mobil kuerzer", but the code uses `sm:max-w-none` which removes truncation on sm+ screens rather than making it shorter on mobile. On mobile (375px) it stays at 200px. However, on screens >= 640px the truncation is removed entirely, which means very long ticket subjects could cause layout issues on tablet.
- [x] Jeder Stop-Button oeffnet StopTimerDialog fuer genau diesen Timer -- `onStop={setStoppingTimer}` passes the specific timer, and `StopTimerDialog` receives `timer={stoppingTimer}` (lines 68, 95-101)
- [x] Bar ist nur sichtbar wenn mindestens ein Timer aktiv ist -- `if (isLoadingTimer || activeTimers.length === 0) return null` (line 82)

#### AC-3: Start-Button (Ticket-Liste & Ticket-Detail)

- [x] Start-Button ist deaktiviert wenn Techniker bereits aktiven Timer auf diesem Ticket hat -- `disabled={hasActiveTimerForTicket(ticket.id)}` in both tickets/page.tsx (line 453) and tickets/[id]/page.tsx (line 233)
- [x] Start-Button ist aktiv wenn Timer auf anderen Tickets laufen -- `hasActiveTimerForTicket` checks per-ticket via `activeTimers.some(t => t.ticketId === ticketId)` (timer-context.tsx line 56)
- [ ] **BUG** Tooltip/Hinweis am deaktivierten Button fehlt -- Spec requires: "Bereits ein Timer auf diesem Ticket aktiv" as tooltip. Neither the ticket list page nor the ticket detail page show a tooltip or title attribute on the disabled button. The start-timer-dialog does show a warning when opened, but the Play button in the ticket list has no tooltip.

#### AC-4: Backend

- [x] `GET /time-entries/active` gibt Array zurueck -- `findActive()` returns `entries.map(e => this.sanitize(e))` which is always an array (service line 174-181)
- [x] `POST /time-entries/start` prueft nur Kombination `technician_id` + `ticket_id` -- `findOne({ where: { technicianId: userId, ticketId: dto.ticketId, isRunning: true } })` (service line 74-76)
- [x] Alter Unique Constraint wird durch neuen ersetzt -- `onModuleInit()` drops old index `UQ_one_running_timer_per_technician` and creates new `UQ_one_running_timer_per_technician_per_ticket` (service lines 43-53)
- [x] Race Condition per Try-Catch auf DB-Fehler 23505 abgefangen -- Catch block at service lines 94-101

#### AC-5: TimerContext (Frontend)

- [x] `activeTimer` wird zu `activeTimers` (Array) -- `useState<TimeEntry[]>([])` at timer-context.tsx line 33
- [x] `elapsedSeconds` wird zu `Record<string, number>` (Map) -- `useState<Record<string, number>>({})` at line 35
- [x] `refreshTimer` laedt alle aktiven Timer -- calls `fetchActiveTimers()` which returns array (line 68)
- [x] Interval (1 Sekunde) aktualisiert alle Laufzeiten parallel -- `setInterval(computeAll, 1000)` iterates all running timers (lines 91-103)

### Edge Cases Status

#### EC-1: Zweites Tab startet Timer auf gleichem Ticket
- [x] DB Constraint blockt, ConflictException wird geworfen -- Race condition handling via DB error code 23505 (service lines 94-101)

#### EC-2: Techniker hat 5+ Timer gleichzeitig
- [x] Bar bricht um (kein Layout-Bruch) -- Each `TimerRow` is a separate flex row with `border-b`, they naturally stack. Flex-wrap on inner content handles wrapping.

#### EC-3: Ticket geschlossen waehrend Timer laeuft
- [x] Orangefarbene Warnung pro Timer-Zeile -- `isTicketClosed` check with orange background and AlertTriangle icon per `TimerRow` (active-timer-bar.tsx lines 28, 32, 57-62)

#### EC-4: Timer laeuft laenger als 8 Stunden
- [x] Warnung beim Stoppen -- `isLongSession = elapsedSeconds > EIGHT_HOURS_SECONDS` with warning in StopTimerDialog (stop-timer-dialog.tsx lines 62, 132-139)

#### EC-5: Zeiteintrag < 30 Sekunden
- [x] Warnung beim Stoppen -- `isShortSession = elapsedSeconds < THIRTY_SECONDS` with warning in StopTimerDialog (lines 63, 141-148)

### Cross-Browser & Responsive (Code Review)

- [x] Chrome/Firefox/Safari: No browser-specific CSS used, standard Tailwind classes only
- [x] Mobile (375px): Timer bar rows use flex-wrap, truncation at 200px, "Stoppen" text hidden on small screens (`hidden sm:inline`)
- [x] Tablet (768px): Layout works with flex
- [x] Desktop (1440px): Full layout with all elements visible
- [ ] **NOTE** Truncation behavior on sm+ screens: `sm:max-w-none` removes truncation entirely above 640px, which could cause long subjects to push other elements. Not a layout break, but potentially visually suboptimal.

### Security Audit Results

- [x] Authentication: All time-entry endpoints protected by `JwtAuthGuard` (controller line 28)
- [x] Authorization: `start` and `stop` endpoints restricted to `TECHNICIAN` role via `@Roles(UserRole.TECHNICIAN)`. Stop validates `entry.technicianId !== userId` (service line 135)
- [x] Input validation: `ParseUUIDPipe` on ID params prevents injection. DTOs validated via class-validator.
- [x] Rate limiting: Global throttle (100 req/60s) applied via `ThrottlerModule`
- [x] No dangerouslySetInnerHTML usage anywhere in the codebase
- [x] API response sanitization: `sanitize()` method strips internal entity fields, only returns whitelisted properties (service lines 314-344)
- [x] No exposed secrets in frontend code
- [ ] **FINDING (Low):** `GET /time-entries?ticketId=...` endpoint has no role restriction -- any authenticated user (admin, technician, office) can view all time entries for any ticket. This matches the user story (Office-Mitarbeiter should see all entries), but there is no explicit access control check for non-admin/non-office roles.
- [ ] **FINDING (Low):** No rate limiting specifically on `POST /time-entries/start` beyond the global throttle. A malicious technician could create many timers on different tickets rapidly (100 within 60s before throttle kicks in). The DB constraint only prevents duplicates per ticket.

### Regression Check (PROJ-4: Stopwatch & Time Tracking)

- [x] Single timer workflow still works -- start/stop/describe flow unchanged
- [x] Time entries table on ticket detail page unaffected -- `fetchTimeEntries` function unchanged
- [x] Admin update/delete of time entries unchanged
- [x] Billable minutes rounding unchanged
- [x] `fetchActiveTimers` backwards compatible -- handles both array and single object response (time-entries.ts lines 113-116)

### Bugs Found

#### BUG-1: Missing tooltip on disabled Start-Button
- **Severity:** Low
- **Steps to Reproduce:**
  1. Log in as a technician
  2. Start a timer on Ticket A
  3. Go to the ticket list
  4. Observe the Play button for Ticket A is disabled
  5. Expected: Tooltip text "Bereits ein Timer auf diesem Ticket aktiv"
  6. Actual: No tooltip or title attribute is present on the disabled button
- **Affected files:** `src/app/(protected)/tickets/page.tsx` (line 446-456), `src/app/(protected)/tickets/[id]/page.tsx` (line 229-238)
- **Priority:** Fix in next sprint (UX improvement, not blocking)

#### BUG-2: Truncation removed on sm+ screens in ActiveTimerBar
- **Severity:** Low
- **Steps to Reproduce:**
  1. Have an active timer on a ticket with a very long subject (60+ characters)
  2. View the ActiveTimerBar on a screen >= 640px wide
  3. Expected: Subject still truncated (spec says "maximal 200px Breite", with mobile even shorter)
  4. Actual: `sm:max-w-none` removes the max-width entirely, so the full subject is shown. On tablet this could push the Stop button and elapsed time off-screen.
- **Affected file:** `src/components/active-timer-bar.tsx` (line 41)
- **Priority:** Fix in next sprint (potential layout issue on tablet with very long subjects)

### Summary
- **Acceptance Criteria:** 17/19 passed (2 Low-severity issues)
- **Bugs Found:** 2 total (0 critical, 0 high, 0 medium, 2 low)
- **Security:** Pass (2 low-severity informational findings, both acceptable for current scope)
- **Build Status:** Both frontend and backend compile successfully with zero errors
- **Production Ready:** YES
- **Recommendation:** Deploy. The 2 low-severity bugs are UX polish items that can be addressed in a follow-up. No blocking issues found.
