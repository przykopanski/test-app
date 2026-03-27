# PROJ-11: Multi-Timer (Parallele Zeiterfassung)

## Status: Planned
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
