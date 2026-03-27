# PROJ-5: Today's Work Dashboard

## Status: Planned
**Created:** 2026-03-26
**Last Updated:** 2026-03-26

## Dependencies
- Requires: PROJ-1 (User Authentication)
- Requires: PROJ-3 (Ticket Management)
- Requires: PROJ-4 (Stopwatch & Time Tracking)

## User Stories
- Als Techniker möchte ich auf der Startseite sofort sehen was heute bereits gearbeitet wurde, damit ich meinen Tagesfortschritt überblicke
- Als Techniker möchte ich meinen aktuell laufenden Timer prominent angezeigt bekommen, damit ich nie vergesse ihn zu stoppen
- Als Techniker möchte ich fehlende Zeitlücken während des Tages sehen (z.B. "10:00–14:00 nicht erfasst"), damit nichts verloren geht
- Als Office-Mitarbeiter möchte ich eine Tagesübersicht für alle Techniker sehen, damit ich die Auslastung im Blick habe

## Acceptance Criteria
- [ ] Dashboard als Startseite nach dem Login
- [ ] Globale Timer-Anzeige: zeigt laufenden Timer (Ticket-Name, Typ, Laufzeit) — auf jeder Seite sichtbar (Header/Topbar)
- [ ] Kein laufender Timer: Hinweis "Kein aktiver Timer" + Shortcut zum letzten offenen Ticket
- [ ] Tagesübersicht des eingeloggten Technikers: Liste aller Zeiteinträge heute (Ticket, Typ, Dauer, Beschreibung)
- [ ] Tages-Summen: Gesamt roh, gesamt abrechenbar, Aufschlüsselung nach Arbeitstyp
- [ ] Lückenerkennung: zeigt Zeiträume > 30 Minuten ohne Zeiteintrag zwischen erstem und letztem Eintrag des Tages
- [ ] Meine offenen Tickets: Liste der dem Techniker zugewiesenen offenen Tickets (max. 10, Link zur vollen Liste)
- [ ] Admin/Office sieht: Kacheln pro Techniker mit heutiger Gesamtarbeitszeit + aktiver Timer-Status

## Edge Cases
- Erster Arbeitstag (keine Zeiteinträge): leeres Dashboard mit Onboarding-Hinweis
- Lückenerkennung vor dem ersten Eintrag des Tages: keine Warnung (Arbeitsbeginn unklar)
- Techniker arbeitet nach Mitternacht: Einträge werden dem Starttag zugeordnet
- Alle Techniker-Timer gestoppt aber Ticket offen: kein falscher Alarm in Lückenerkennung

## Technical Requirements
- Performance: Dashboard lädt in < 1s (alle Daten in max. 2 API-Calls)
- Lückenerkennung: rein serverseitige Berechnung, kein Client-State nötig
- Globaler Timer im Frontend: Polling alle 30s für Timer-Sync (kein WebSocket für MVP)

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
