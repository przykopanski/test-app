# Product Requirements Document

## Vision
Ein modernes IT-Service-Management-System (MSP-System) für IT-Systemhäuser, das Werkzeuge wie Visoma ersetzt. Techniker arbeiten in einer einzigen Oberfläche — ohne Tool-Wechsel — von der Ticketerfassung über die Zeiterfassung bis zur Kundenunterschrift. Das System liefert rechtssichere Leistungsnachweise und bereitet Abrechnungsdaten präzise auf.

## Target Users

| Rolle | Beschreibung | Hauptbedürfnisse |
|-------|-------------|-----------------|
| **Techniker** | Außendienst- und Remote-Techniker | Schnelle Zeiterfassung, einfache Dokumentation, mobiloptimierte Oberfläche |
| **Office / Disponenten** | Planen und koordinieren Einsätze | Ticketübersicht, Zuweisung, Statusverfolgung |
| **Admins** | Konfigurieren das System | Benutzerverwaltung, Stammdaten, Abrechnungsexport |

## Core Features (Roadmap)

| Priority | Feature | ID | Status |
|----------|---------|-----|--------|
| P0 (MVP) | User Authentication & Roles | PROJ-1 | Planned |
| P0 (MVP) | Customer & Contact Management | PROJ-2 | Planned |
| P0 (MVP) | Ticket Management | PROJ-3 | Planned |
| P0 (MVP) | Stopwatch & Time Tracking | PROJ-4 | Planned |
| P1 | Today's Work Dashboard | PROJ-5 | Planned |
| P1 | On-Site Service Report | PROJ-6 | Planned |
| P1 | Digital Signature Capture | PROJ-7 | Planned |
| P1 | PDF Service Report Generation | PROJ-8 | Planned |
| P1 | Billing Data Storage & Export | PROJ-9 | Planned |
| P2 | Integration Adapter System | PROJ-10 | Planned |
| P1 | Ticket Material Tracking | PROJ-12 | Planned |

## Success Metrics
- Techniker benötigt < 30 Sekunden, um einen Timer zu starten
- Kein Medienwechsel nötig für vollständigen Einsatzbericht
- Abrechnungsdaten sind lückenlos und sofort exportierbar
- 0 verlorene Zeiteinträge durch fehlende Sync oder Tool-Wechsel

## Constraints
- **Team:** Einzelentwickler, Priorität auf MVP-Features
- **Deployment:** Self-hosted, Docker Compose, hinter Nginx Proxy Manager (kein HTTPS-Setup nötig)
- **Tech Stack:** Next.js 16 (Frontend), NestJS (Backend), PostgreSQL, Docker
- **Single-Tenant:** Eine IT-Firma, kein SaaS-Betrieb

## Non-Goals
- Keine Rechnungserzeugung im Kernsystem (nur Abrechnungsdaten)
- Kein Multi-Tenant / SaaS-Betrieb in v1
- Kein eingebautes CRM jenseits von Kunden- und Kontaktstammdaten
- Kein eigenes Inventar-/Asset-Management in v1
- Keine mobilen Apps (Native iOS/Android) — Mobile Web reicht
