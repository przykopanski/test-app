# PROJ-10: Integration Adapter System

## Status: Planned
**Created:** 2026-03-26
**Last Updated:** 2026-03-26

## Dependencies
- Requires: PROJ-1 (User Authentication) — Adapter-Konfiguration nur für Admin
- Requires: PROJ-9 (Billing Data) — InvoiceProvider nutzt Billing-Daten
- Requires: PROJ-8 (PDF) — StorageProvider für Dateien
- Requires: PROJ-7 (Signature) — StorageProvider für Unterschriften

## User Stories
- Als Admin möchte ich Integrationen im System konfigurieren (API-Keys, URLs), damit ich keine Config-Dateien manuell editieren muss
- Als Entwickler möchte ich ein klares Interface implementieren, damit neue Integrations-Adapter ohne Core-Änderungen hinzugefügt werden können
- Als Admin möchte ich eine Integration testen (Verbindungstest), bevor ich sie produktiv aktiviere
- Als Admin möchte ich sehen ob eine Integration aktiv ist oder Fehler hat, damit ich Probleme schnell erkenne

## Adapter Interfaces (Core)

| Interface | Zweck | MVP-Default |
|-----------|-------|------------|
| `AuthProvider` | Authentifizierung (JWT oder Keycloak) | JwtAdapter (intern) |
| `StorageProvider` | Dateispeicherung (Unterschriften, PDFs) | LocalFileAdapter |
| `InvoiceProvider` | Rechnungs-/Abrechnungsexport | CsvExportAdapter |
| `EmailProvider` | E-Mail-Versand (Benachrichtigungen) | SmtpAdapter / null |
| `DistanceProvider` | Routenberechnung für Kilometer | ManualOnlyAdapter |
| `RemoteSupportProvider` | Deep-Link in Remote-Tools | NullAdapter |
| `ERPProvider` | ERP-Synchronisation | NullAdapter |

## Acceptance Criteria
- [ ] Jedes Interface ist als TypeScript-Interface definiert (NestJS)
- [ ] Jeder Adapter ist eine separate Klasse, die das Interface implementiert
- [ ] Aktiver Adapter wird via Umgebungsvariable oder DB-Config gewählt (kein Hard-Code)
- [ ] Admin-UI: Liste aller konfigurierbaren Integrationen mit Status (aktiv / inaktiv / Fehler)
- [ ] Admin-UI: Formular zur Konfiguration (API-Key, URL, etc.) pro Integration
- [ ] Verbindungstest-Button pro Integration (testet Konnektivität)
- [ ] Konfiguration wird verschlüsselt in DB gespeichert (API-Keys nicht im Klartext)
- [ ] System funktioniert vollständig wenn alle externen Integrationen deaktiviert sind
- [ ] Beispiel-Adapter implementiert: `LexofficeAdapter` (InvoiceProvider)
- [ ] Beispiel-Adapter implementiert: `OpenRouteServiceAdapter` (DistanceProvider)

## Edge Cases
- Adapter nicht konfiguriert: System fällt auf NullAdapter zurück (kein Fehler, nur Feature deaktiviert)
- Adapter-Fehler (API nicht erreichbar): Fehler geloggt, User bekommt klare Meldung, Core-Funktion nicht blockiert
- Adapter-Konfiguration geändert: sofort aktiv ohne Neustart (außer AuthProvider)
- API-Key abgelaufen: Fehlerstatus in Integrations-UI, E-Mail-Benachrichtigung an Admin

## Technical Requirements
- Dependency Injection via NestJS-Module — Adapter werden als Provider registriert
- Interface-Dateien in `src/adapters/interfaces/`
- Adapter-Implementierungen in `src/adapters/implementations/`
- Verschlüsselung: AES-256 für gespeicherte API-Keys (Encryption-Key via Umgebungsvariable)

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
