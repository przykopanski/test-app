# PROJ-12: Ticket Material Tracking

## Status: Planned
**Created:** 2026-03-29
**Last Updated:** 2026-03-29

## Dependencies
- Requires: PROJ-1 (User Authentication) - Rollenprüfung (Admin, Office, Technician)
- Requires: PROJ-3 (Ticket Management) - Material wird pro Ticket erfasst

## User Stories
- Als Techniker möchte ich verwendetes Material zu einem Ticket hinzufügen (Name, Menge, Einzelpreis netto, MwSt.-Satz), damit die eingesetzten Materialien dokumentiert sind
- Als Office-Mitarbeiter möchte ich Material zu einem Ticket erfassen können, damit ich Bestellungen oder Lieferungen nachträglich zuordnen kann
- Als Admin möchte ich Materialeinträge auch bei geschlossenen Tickets bearbeiten und löschen können, damit Korrekturen jederzeit möglich sind
- Als Benutzer möchte ich den MwSt.-Satz pro Artikel aus einer konfigurierbaren Liste wählen, damit unterschiedliche Steuersätze korrekt abgebildet werden
- Als Admin möchte ich die verfügbaren MwSt.-Sätze in den Systemeinstellungen verwalten, damit das System an steuerliche Anforderungen angepasst werden kann

## Acceptance Criteria

### Materialerfassung
- [ ] Auf der Ticket-Detailseite gibt es einen Bereich "Material" mit einer Liste aller erfassten Materialien
- [ ] Button "Material hinzufügen" öffnet ein Formular/Dialog mit den Feldern: Artikelname (Freitext), Menge (Zahl, min 1), Einzelpreis netto (Dezimalzahl in EUR), MwSt.-Satz (Dropdown aus Systemeinstellungen)
- [ ] Der Bruttopreis pro Position wird automatisch berechnet und angezeigt (Einzelpreis netto × Menge × (1 + MwSt.-Satz/100))
- [ ] Alle Rollen (Admin, Office, Technician) können Material zu offenen Tickets hinzufügen
- [ ] Jeder Materialeintrag zeigt: Artikelname, Menge, Einzelpreis netto, MwSt.-Satz, Brutto-Gesamtpreis

### Bearbeiten & Löschen
- [ ] Materialeinträge bei offenen Tickets können von allen Rollen bearbeitet werden
- [ ] Bei geschlossenen Tickets können nur Admins Materialeinträge bearbeiten
- [ ] Materialeinträge können nur von Admins gelöscht werden (unabhängig vom Ticket-Status)
- [ ] Löschen erfordert eine Bestätigung (Confirm-Dialog)

### MwSt.-Konfiguration
- [ ] Admin-Bereich hat eine Einstellungsseite für MwSt.-Sätze (z.B. unter `/admin/settings` oder bestehende Systemeinstellungen)
- [ ] MwSt.-Sätze bestehen aus: Name/Label (z.B. "19% MwSt."), Prozentwert (Dezimalzahl), aktiv/inaktiv
- [ ] Standard-MwSt.-Sätze bei Erstinstallation: 19% ("MwSt. 19%"), 7% ("MwSt. 7%"), 0% ("Steuerfrei")
- [ ] Deaktivierte MwSt.-Sätze erscheinen nicht im Dropdown, bestehende Einträge behalten ihren Wert

### Validierung
- [ ] Artikelname: Pflichtfeld, min. 2 Zeichen
- [ ] Menge: Pflichtfeld, ganze Zahl >= 1
- [ ] Einzelpreis netto: Pflichtfeld, >= 0.00 EUR (Dezimalzahl, 2 Nachkommastellen)
- [ ] MwSt.-Satz: Pflichtfeld, muss ein aktiver Satz aus den Systemeinstellungen sein

## Edge Cases
- **Ticket geschlossen, Techniker will Material ändern:** Bearbeiten/Hinzufügen ist gesperrt, Hinweis "Ticket ist geschlossen. Nur Admins können Material bearbeiten."
- **MwSt.-Satz wird deaktiviert, aber existierende Einträge nutzen ihn:** Bestehende Einträge behalten den gespeicherten MwSt.-Satz. Der Satz wird im Dropdown nicht mehr angeboten, aber im Eintrag weiterhin korrekt angezeigt.
- **Alle MwSt.-Sätze deaktiviert:** Formular zeigt Hinweis "Keine MwSt.-Sätze konfiguriert. Bitte Admin kontaktieren." Button "Hinzufügen" ist deaktiviert.
- **Sehr hohe Mengen oder Preise:** Menge maximal 9999, Preis maximal 999.999,99 EUR — Eingaben darüber werden abgelehnt
- **Gleiches Material mehrfach erfasst:** Erlaubt — kein Duplikat-Check, da gleiche Artikel zu verschiedenen Zeiten/Preisen erfasst werden können
- **Dezimaltrennzeichen:** System akzeptiert Komma und Punkt als Dezimaltrenner für Preiseingabe

## Technical Requirements
- Materialeinträge werden in einer eigenen DB-Tabelle gespeichert (Fremdschlüssel auf Ticket)
- MwSt.-Sätze werden in der bestehenden SystemSettings oder eigener Tabelle verwaltet
- Bruttoberechnung erfolgt im Frontend (Anzeige) UND Backend (Validierung/Speicherung)
- API-Endpunkte: CRUD für Materialeinträge, CRUD für MwSt.-Sätze (Admin)
- Alle Endpunkte sind authentifiziert, Rollen-Guards wie oben beschrieben

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
