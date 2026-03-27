# PROJ-6: On-Site Service Report

## Status: Planned
**Created:** 2026-03-26
**Last Updated:** 2026-03-26

## Dependencies
- Requires: PROJ-1 (User Authentication)
- Requires: PROJ-3 (Ticket Management)
- Requires: PROJ-4 (Stopwatch & Time Tracking) — nur für `onsite` Zeiteinträge relevant

## User Stories
- Als Techniker möchte ich nach einem Vor-Ort-Einsatz Fahrzeit und Kilometer eingeben, damit der Aufwand vollständig dokumentiert ist
- Als Techniker möchte ich eine strukturierte Arbeitsbeschreibung für den Kunden erfassen, die später auf dem Servicebericht erscheint
- Als Office-Mitarbeiter möchte ich Fahrdaten aller Techniker einsehen, damit ich Reisespesen korrekt abrechnen kann
- Als Techniker möchte ich optional die Route automatisch berechnen lassen, damit ich Kilometer nicht manuell schätzen muss

## Acceptance Criteria
- [ ] Vor-Ort-Bericht-Formular erscheint nur bei Zeiteinträgen vom Typ `onsite`
- [ ] Pflichtfelder: Arbeitsbeschreibung (für Kundenbericht), Fahrzeit (Minuten), Kilometer (km)
- [ ] Kilometer: manuelle Eingabe (Dezimalzahl, z.B. 23.5 km)
- [ ] Fahrzeit: manuelle Eingabe in Minuten
- [ ] Optionales Feld: Startadresse (für spätere Routenberechnung via PROJ-10)
- [ ] Optionales Feld: Endadresse (vorausgefüllt aus Kundenadresse aus PROJ-2)
- [ ] Formular-Status: `draft` (kann bearbeitet werden), `completed` (nach Unterschrift in PROJ-7 gesperrt)
- [ ] Abgeschlossener Bericht erscheint in Ticket-Detailseite mit allen Daten
- [ ] Admin kann abgeschlossenen Bericht entsperren (mit Audit-Eintrag)
- [ ] Fahrdaten werden in Billing-Tabelle übertragen (PROJ-9)

## Edge Cases
- Techniker vergisst Kilometer einzugeben: Bericht kann nicht abgeschlossen werden (Pflichtfeld)
- Kilometer = 0: erlaubt (z.B. Kunde direkt nebenan), aber Bestätigungsdialog
- Fahrzeit = 0: erlaubt mit Bestätigungsdialog
- Bericht bereits mit Unterschrift versehen (PROJ-7): Formular readonly, nur Admin kann entsperren
- Mehrere `onsite` Zeiteinträge am selben Ticket: jeder Eintrag hat eigenen Bericht

## Technical Requirements
- `service_reports` Tabelle verknüpft 1:1 mit `time_entries` (nur Typ `onsite`)
- Felder: `description`, `travel_time_minutes`, `distance_km`, `start_address`, `end_address`, `status`
- Validation: Zod-Schema mit Minimalwerten (km ≥ 0, fahrzeit ≥ 0)

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
