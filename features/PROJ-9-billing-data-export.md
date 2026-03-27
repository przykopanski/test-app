# PROJ-9: Billing Data Storage & Export

## Status: Planned
**Created:** 2026-03-26
**Last Updated:** 2026-03-26

## Dependencies
- Requires: PROJ-1 (User Authentication)
- Requires: PROJ-2 (Customer Management)
- Requires: PROJ-3 (Ticket Management)
- Requires: PROJ-4 (Stopwatch & Time Tracking)
- Requires: PROJ-6 (On-Site Service Report) — Fahrdaten in Abrechnungstabelle

## User Stories
- Als Office-Mitarbeiter möchte ich alle abrechnungsrelevanten Einträge eines Monats als CSV exportieren, damit ich sie in unser Buchhaltungssystem importieren kann
- Als Admin möchte ich einen Zeiteintrag als "nicht abrechenbar" markieren, damit interne Arbeiten nicht beim Kunden landen
- Als Office-Mitarbeiter möchte ich die Abrechnungsliste nach Kunde, Zeitraum und Status filtern, damit ich einen spezifischen Kunden schnell abrechnen kann
- Als Admin möchte ich sehen welche Einträge noch nicht abgerechnet wurden, damit nichts vergessen wird

## Acceptance Criteria
- [ ] `billing_entries` Tabelle aggregiert Daten aus Zeiteinträgen + Serviceberichten automatisch
- [ ] Eintrag enthält: Kunde, Ticket-Nr, Techniker, Arbeitstyp, Startdatum, Rohdauer, abrechenbare Dauer, Fahrzeit, Kilometer, Beschreibung, billable-Flag
- [ ] `billable`-Flag: Standard `true`, kann per Zeiteintrag auf `false` gesetzt werden (mit Begründungspflicht)
- [ ] Status-Feld pro Eintrag: `pending` (nicht abgerechnet), `exported` (in Export enthalten), `billed` (manuell bestätigt)
- [ ] Abrechnungsliste mit Filtern: Kunde, Techniker, Zeitraum (von–bis), Status, Arbeitstyp
- [ ] Gesamt-Summen in der gefilterten Liste: Stunden, Kilometer, Fahrstunden
- [ ] CSV-Export der gefilterten Liste: UTF-8, Semikolon-getrennt (DE-Standard), alle Felder
- [ ] Nach Export: Status der exportierten Einträge wechselt zu `exported`
- [ ] Status kann manuell zurückgesetzt werden (Admin)
- [ ] Abrechnungsdaten werden NIE gelöscht (auch nicht wenn Zeiteintrag editiert wird — Snapshot-Logik)

## Edge Cases
- Export mit 0 Einträgen: CSV mit nur Header-Zeile, Hinweis in UI
- Billing-Eintrag für gelöschten (archivierten) Kunden: Kundendaten im Snapshot erhalten
- Zeiteintrag nachträglich bearbeitet: Billing-Eintrag zeigt Originalwerte + Markierung "editiert"
- Paralleler Export durch zwei Office-Mitarbeiter: kein Datenverlust, beide bekommen gleiche Datei
- Sehr großer Export (1000+ Zeilen): Streaming-Response, kein Timeout

## Technical Requirements
- `billing_entries` wird automatisch befüllt wenn Zeiteintrag gestoppt wird (Event-basiert)
- Snapshot-Felder: alle abrechnungsrelevanten Werte zum Zeitpunkt des Stopps kopiert
- CSV-Format: Spalten auf Deutsch beschriftet (kompatibel mit DATEV/Lexoffice-Import)
- InvoiceProvider-Interface vorbereitet für PROJ-10 (Billomat, Lexoffice-Adapter)
- Performance: Export von 5000 Einträgen in < 10s

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
