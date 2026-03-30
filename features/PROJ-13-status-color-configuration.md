# PROJ-13: Status & Priority Color Configuration

## Status: Planned
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
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
