# PROJ-8: PDF Service Report Generation

## Status: Planned
**Created:** 2026-03-26
**Last Updated:** 2026-03-26

## Dependencies
- Requires: PROJ-3 (Ticket Management) — Ticket-Daten auf dem Bericht
- Requires: PROJ-6 (On-Site Service Report) — Fahrdaten und Beschreibung
- Requires: PROJ-7 (Digital Signature) — Unterschrift im PDF

## User Stories
- Als Techniker möchte ich nach der Kundenunterschrift sofort ein PDF erzeugen und abrufen können, damit der Kunde eine Kopie bekommt
- Als Office-Mitarbeiter möchte ich PDFs älterer Einsätze jederzeit herunterladen können, damit ich bei Rückfragen schnell reagieren kann
- Als Kunde möchte ich einen übersichtlichen Leistungsnachweis erhalten, der Datum, Beschreibung, Zeiten und meine Unterschrift enthält

## Acceptance Criteria
- [ ] PDF-Generierung serverseitig (NestJS) nach Unterschrift-Bestätigung (PROJ-7)
- [ ] PDF enthält: Firmenname (aus Systemkonfiguration), Ticketnummer, Datum des Einsatzes
- [ ] PDF enthält: Kundendaten (Name, Adresse aus PROJ-2)
- [ ] PDF enthält: Ansprechpartner (falls angegeben)
- [ ] PDF enthält: Arbeitsbeschreibung, Arbeitstyp, Startzeit, Endzeit, Dauer (abrechenbar)
- [ ] PDF enthält: Fahrzeit und Kilometer (falls `onsite`)
- [ ] PDF enthält: Unterschriftsbild + Unterzeichnername + Datum/Uhrzeit der Unterschrift
- [ ] PDF enthält: Fußzeile mit "Erstellt am [Datum] von [Techniker-Name]"
- [ ] PDF wird serverseitig gespeichert (StorageProvider) und ist per Link abrufbar
- [ ] Download-Button im Ticket für alle generierten PDFs
- [ ] PDF kann manuell neu generiert werden (Admin) bei Datenverlust
- [ ] PDF-Dateiname: `servicebericht-{ticket_nr}-{datum}.pdf`

## Edge Cases
- PDF-Generierung schlägt fehl: Fehlermeldung + Retry-Button, Unterschrift bleibt gespeichert
- Sehr langer Beschreibungstext: mehrseitiges PDF (kein Overflow / Abschneiden)
- Kein Unternehmenslogo konfiguriert: nur Text-Header (kein Fehler)
- PDF-Abruf nach langer Zeit (archivierte Daten): Datei muss dauerhaft gespeichert bleiben
- Mehrere Vor-Ort-Berichte an einem Ticket: jeder erzeugt ein eigenes PDF

## Technical Requirements
- PDF-Library: `@react-pdf/renderer` (server-side) oder `pdfkit` (Node.js) — entscheidet /architecture
- Generierung asynchron: API gibt sofort 202 zurück, PDF wird im Hintergrund erstellt
- Status-Polling oder Webhook wenn PDF fertig ist (einfach: kurzes Polling alle 2s)
- Maximale Generierungszeit: < 5 Sekunden
- Speicherung: StorageProvider-Interface (lokales Dateisystem für MVP)
- Firmenkonfiguration: `system_config` Tabelle mit `company_name`, `company_address`, `logo_path`

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
