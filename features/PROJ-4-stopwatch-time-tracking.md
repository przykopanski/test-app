# PROJ-4: Stopwatch & Time Tracking

## Status: Planned
**Created:** 2026-03-26
**Last Updated:** 2026-03-26

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
- [ ] Wenn Techniker auf anderen Ticket navigiert, läuft Timer weiter (globale Timer-Anzeige)

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
- API-Endpunkte: `POST /time-entries/start`, `POST /time-entries/:id/stop`, `GET /time-entries?ticketId=`

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
