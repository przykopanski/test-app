# PROJ-7: Digital Signature Capture

## Status: Planned
**Created:** 2026-03-26
**Last Updated:** 2026-03-26

## Dependencies
- Requires: PROJ-1 (User Authentication)
- Requires: PROJ-6 (On-Site Service Report) — Unterschrift schließt den Vor-Ort-Bericht ab
- Requires: PROJ-3 (Ticket Management)

## User Stories
- Als Techniker möchte ich dem Kunden ein Tablet hinhalten, auf dem er mit dem Finger unterschreiben kann, damit ich einen rechtssicheren Leistungsnachweis habe
- Als Techniker möchte ich vor der Unterschrift den Kundennamen erfassen, damit klar ist wer unterschrieben hat
- Als Techniker möchte ich die Unterschrift zurücksetzen können, falls der Kunde einen Fehler gemacht hat
- Als Admin möchte ich gespeicherte Unterschriften einsehen, damit ich Streitigkeiten belegen kann
- Als Techniker möchte ich nach der Unterschrift eine Bestätigung sehen, dass der Servicebericht gespeichert wurde

## Acceptance Criteria
- [ ] Unterschrift-Canvas: HTML5 Canvas, optimiert für Touch (finger/stylus) und Maus
- [ ] Vor der Unterschrift: Pflichtfeld "Name des Unterzeichners" (Freitext)
- [ ] Canvas-Größe: mindestens 400×200px, responsive für Tablets
- [ ] Zeichnen mit Touch: funktioniert auf iOS Safari und Chrome Android
- [ ] "Zurücksetzen"-Button löscht Canvas und ermöglicht neue Unterschrift
- [ ] "Unterschrift bestätigen"-Button: speichert Unterschrift als PNG (base64 → Datei im StorageProvider)
- [ ] Gespeichert wird: PNG-Datei, Unterzeichner-Name, Timestamp (UTC), Techniker-ID
- [ ] Nach Speichern: Service-Report-Status wechselt zu `completed` (readonly)
- [ ] Unterschrift im Ticket einsehbar (Thumbnail + Name + Datum)
- [ ] Unterschrift wird in PDF eingebettet (PROJ-8)
- [ ] Unterschrift kann nicht überschrieben werden — nur Admin kann Bericht entsperren

## Edge Cases
- Leeres Canvas (keine Linie gezeichnet): "Unterschrift bestätigen" deaktiviert
- Sehr kurze Unterschrift (einzelner Punkt): Warnung "Unterschrift zu kurz, bitte erneut zeichnen"
- Netzwerkausfall beim Speichern: lokaler Retry, Fehlermeldung wenn nicht möglich
- Kunde verweigert Unterschrift: Bericht kann ohne Unterschrift als "Unterschrift verweigert" markiert werden (Pflichtfeld: Grund)
- Browser-Tab geschlossen nach dem Zeichnen, vor dem Speichern: Daten gehen verloren (Warnung vor Verlassen)

## Technical Requirements
- Canvas-Library: `signature_pad` (npm) — bewährt, touch-optimiert
- Speicherformat: PNG, gespeichert via StorageProvider-Interface (Dateisystem für MVP, S3-kompatibel via PROJ-10)
- Dateiname: `signature-{ticket_id}-{time_entry_id}-{timestamp}.png`
- Keine rohen Canvas-Daten in DB — nur Dateipfad / URL
- Maximale Dateigröße: 500KB (ausreichend für Unterschriften-PNG)

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
