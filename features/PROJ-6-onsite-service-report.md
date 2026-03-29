# PROJ-6: On-Site Service Report

## Status: In Progress
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

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
