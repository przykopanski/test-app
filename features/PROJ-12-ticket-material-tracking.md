# PROJ-12: Ticket Material Tracking

## Status: In Review
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

**Designed by /architecture on 2026-03-29**

### Component Structure

```
Ticket-Detailseite /tickets/[id]
+-- (bestehend) Ticket-Header, Timer, Zeiteinträge, Notizen
+-- MaterialSection (NEU)
    +-- MaterialList
    |   +-- MaterialRow (pro Eintrag)
    |   |   +-- Artikelname, Menge, Netto-EP, MwSt.-Satz, Brutto
    |   |   +-- Bearbeiten-Button (Rollen-abhängig)
    |   |   +-- Löschen-Button (nur Admin)
    |   +-- Gesperrter Hinweis (wenn Ticket closed + kein Admin)
    +-- Button "Material hinzufügen" (gesperrt wenn Ticket closed + kein Admin)

Material-Dialog (Hinzufügen / Bearbeiten)
+-- Artikelname (Freitext-Input)
+-- Menge (Zahlen-Input)
+-- Einzelpreis netto (Dezimal-Input, EUR)
+-- MwSt.-Satz (Dropdown → lädt aktive Sätze)
+-- Brutto-Vorschau (live berechnet, read-only)
+-- Speichern / Abbrechen

Admin-Bereich: MwSt.-Sätze /admin/vat-rates (NEU)
+-- VatRateList
|   +-- VatRateRow (Label, Prozentwert, aktiv/inaktiv, Bearbeiten)
+-- Button "Satz hinzufügen"
+-- VatRateFormDialog (Hinzufügen / Bearbeiten)
```

### Data Model

**Tabelle `ticket_material`:**
- id (UUID)
- ticketId — Fremdschlüssel auf Ticket
- name — Artikelname (Freitext)
- quantity — Menge (ganze Zahl, 1–9999)
- unitPriceNet — Einzelpreis netto (EUR, 2 Dezimalstellen)
- vatRateSnapshot — MwSt.-Prozentsatz zum Zeitpunkt der Erfassung (Snapshot)
- vatRateLabel — MwSt.-Label zum Zeitpunkt der Erfassung (Snapshot)
- vatRateId — Fremdschlüssel auf VatRate (nullable)
- createdById — Wer hat es erfasst
- createdAt / updatedAt

> Snapshot-Speicherung: Rate + Label werden beim Speichern kopiert, damit spätere Änderungen an MwSt.-Sätzen alte Einträge nicht beeinflussen (rechtssicher).

**Tabelle `vat_rate`:**
- id (UUID)
- label — Anzeigename (z.B. "MwSt. 19%")
- rate — Prozentwert (Dezimalzahl, z.B. 19.00)
- isActive — erscheint im Dropdown wenn true

Standard-Datensätze bei Erstinstallation: 19%, 7%, 0%

### API-Endpunkte

| Endpunkt | Methode | Rolle | Zweck |
|----------|---------|-------|-------|
| `/tickets/:id/materials` | GET | Alle | Materialliste eines Tickets laden |
| `/tickets/:id/materials` | POST | Alle | Material hinzufügen |
| `/tickets/:id/materials/:mid` | PATCH | Alle / nur Admin bei closed | Material bearbeiten |
| `/tickets/:id/materials/:mid` | DELETE | Admin only | Material löschen |
| `/vat-rates` | GET | Alle | Aktive MwSt.-Sätze laden (für Dropdown) |
| `/admin/vat-rates` | GET | Admin | Alle MwSt.-Sätze inkl. inaktive |
| `/admin/vat-rates` | POST | Admin | Neuen Satz anlegen |
| `/admin/vat-rates/:id` | PATCH | Admin | Satz bearbeiten / deaktivieren |

### Tech-Entscheidungen

| Entscheidung | Wahl | Warum |
|-------------|------|-------|
| MwSt. als eigene Tabelle | `vat_rate` Entity | Zu strukturiert für SystemSettings Key-Value-Store |
| Snapshot-Speicherung | Rate + Label beim Speichern kopieren | Rechtssichere Dokumentation |
| Bruttoberechnung | Frontend (live) + Backend (gespeichert) | Frontend für sofortiges Feedback; Backend speichert Kontrollwert |
| Admin-Seite für MwSt. | `/admin/vat-rates` | Passt ins bestehende `/admin/`-Muster |
| Material im Ticket | Neuer Abschnitt auf `/tickets/[id]` | Material gehört zum Ticket-Kontext, kein extra Routing |

### Neue Dateien

**Backend:** `entities/ticket-material.entity.ts`, `entities/vat-rate.entity.ts`, `materials/` (Controller, Service, DTOs, Module), `vat-rates/` (Controller, Service, DTOs, Module)

**Frontend:** `components/material-list.tsx`, `components/material-form-dialog.tsx`, `app/(protected)/admin/vat-rates/page.tsx`, `lib/materials.ts`

**Geändert:** `tickets/[id]/page.tsx`, `app-sidebar.tsx`, `backend/app.module.ts`, `backend/entities/index.ts`

### Keine neuen npm-Pakete nötig
Table, Dialog, Input, Select, Switch, AlertDialog sind bereits installiert.

## Frontend Implementation Notes

**Implemented by /frontend on 2026-03-28**

### New Files
- `src/lib/materials.ts` — Types, Zod schemas, helper functions (calculateGross, formatEur, parseDecimalInput), API functions for materials and VAT rates
- `src/components/material-list.tsx` — Material section component for ticket detail page (list, add/edit/delete with role-based permissions)
- `src/components/material-form-dialog.tsx` — Dialog form for adding/editing material entries with live gross preview
- `src/app/(protected)/admin/vat-rates/page.tsx` — Admin page for managing VAT rates (CRUD + active/inactive toggle)

### Modified Files
- `src/app/(protected)/tickets/[id]/page.tsx` — Added MaterialList section between notes and time entries
- `src/components/app-sidebar.tsx` — Added "MwSt.-Saetze" navigation item under Administration (admin only)

### Permissions Implemented
- All roles can add/edit material on open tickets
- Only admins can add/edit material on closed tickets
- Only admins can delete material (any ticket status)
- Closed ticket shows info message for non-admin users
- VAT rates admin page restricted to admin role via RoleGuard

### Notes
- Gross preview in form calculates live as user types
- VAT rate snapshot pattern: form loads active rates; saved entries store rate + label as snapshot
- Decimal input accepts both comma and dot separators (parseDecimalInput helper)
- All number fields use z.number() (not z.coerce) to avoid zod v4 type inference issues with react-hook-form

## Backend Implementation Notes

**Implemented by /backend on 2026-03-29**

### New Files (Backend)
- `backend/src/entities/vat-rate.entity.ts` — VatRate entity (id, label, rate, isActive)
- `backend/src/entities/ticket-material.entity.ts` — TicketMaterial entity with snapshot fields for VAT rate/label, FK to ticket, vatRate, createdBy
- `backend/src/vat-rates/vat-rates.service.ts` — CRUD for VAT rates + auto-seed of defaults (19%, 7%, 0%)
- `backend/src/vat-rates/vat-rates.controller.ts` — GET /vat-rates (active, all users), GET/POST/PATCH /admin/vat-rates (admin only)
- `backend/src/vat-rates/vat-rates.module.ts` — Module with OnModuleInit seed
- `backend/src/vat-rates/dto/create-vat-rate.dto.ts` — Validation DTO for creating VAT rates
- `backend/src/vat-rates/dto/update-vat-rate.dto.ts` — Validation DTO for updating VAT rates
- `backend/src/materials/materials.service.ts` — CRUD for ticket materials with role-based permission checks (closed ticket = admin only, delete = admin only)
- `backend/src/materials/materials.controller.ts` — CRUD endpoints under /tickets/:ticketId/materials
- `backend/src/materials/materials.module.ts` — Module registration
- `backend/src/materials/dto/create-material.dto.ts` — Validation DTO with class-validator
- `backend/src/materials/dto/update-material.dto.ts` — Partial update DTO

### Modified Files (Backend)
- `backend/src/entities/ticket.entity.ts` — Added OneToMany relation to TicketMaterial
- `backend/src/entities/index.ts` — Exported VatRate and TicketMaterial
- `backend/src/app.module.ts` — Registered VatRatesModule and MaterialsModule

### API Endpoints
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/vat-rates` | GET | All | Active VAT rates for dropdown |
| `/api/admin/vat-rates` | GET | Admin | All VAT rates incl. inactive |
| `/api/admin/vat-rates` | POST | Admin | Create VAT rate |
| `/api/admin/vat-rates/:id` | PATCH | Admin | Update/deactivate VAT rate |
| `/api/tickets/:id/materials` | GET | All | List materials for a ticket |
| `/api/tickets/:id/materials` | POST | All (admin if closed) | Add material to ticket |
| `/api/tickets/:id/materials/:mid` | PATCH | All (admin if closed) | Update material entry |
| `/api/tickets/:id/materials/:mid` | DELETE | Admin only | Delete material entry |

### Key Design Decisions
- VAT rate snapshot: rate + label are copied into ticket_materials at save time for legal compliance
- Default VAT rates seeded via OnModuleInit (only if table is empty)
- Decimal columns use `precision: 10, scale: 2` for prices and `precision: 5, scale: 2` for rates
- TypeORM returns decimals as strings; service sanitizes them to Number for JSON response
- Delete returns 204 No Content

## QA Test Results

**Tested:** 2026-03-29
**App URL:** http://localhost:3000
**Tester:** QA Engineer (AI)
**Method:** Code review + build verification (frontend build OK, backend build OK, lint OK for PROJ-12 files)

### Acceptance Criteria Status

#### AC-1: Materialerfassung - Material section on ticket detail page
- [x] Ticket detail page has a "Material" section with a list of all materials (`MaterialList` component rendered in `tickets/[id]/page.tsx`)
- [x] "Material hinzufuegen" button opens a form dialog with fields: Artikelname (text), Menge (number, min 1), Einzelpreis netto (decimal EUR), MwSt.-Satz (dropdown from system settings)
- [x] Gross price is calculated and displayed automatically (formula: `unitPriceNet * quantity * (1 + vatRate/100)`)
- [x] All roles (Admin, Office, Technician) can add material to open tickets (no `@Roles` decorator on POST endpoint, `assertCanModify` only blocks non-admins on closed tickets)
- [x] Each material entry displays: Artikelname, Menge, Einzelpreis netto, MwSt.-Satz, Brutto-Gesamtpreis

#### AC-2: Bearbeiten & Loeschen
- [x] Material entries on open tickets can be edited by all roles (PATCH endpoint has no role restriction, only `assertCanModify` check)
- [x] On closed tickets, only admins can edit material entries (backend `assertCanModify` throws ForbiddenException for non-admins)
- [x] Material can only be deleted by admins (backend `remove` method checks `userRole !== UserRole.ADMIN`)
- [x] Delete requires confirmation dialog (AlertDialog with "Abbrechen" and "Loeschen" buttons)

#### AC-3: MwSt.-Konfiguration
- [x] Admin area has a settings page for VAT rates at `/admin/vat-rates`
- [x] VAT rates have: Label, rate (decimal), active/inactive toggle
- [x] Default VAT rates seeded on first init: 19% ("MwSt. 19%"), 7% ("MwSt. 7%"), 0% ("Steuerfrei")
- [x] Deactivated VAT rates do not appear in dropdown (backend `findActive` filters by `isActive: true`), existing entries keep their snapshot value

#### AC-4: Validierung
- [x] Artikelname: required, min 2 chars (both frontend Zod schema and backend DTO)
- [x] Menge: required, integer >= 1 (both frontend and backend)
- [x] Einzelpreis netto: required, >= 0.00 EUR, max 2 decimal places (both frontend and backend)
- [x] MwSt.-Satz: required, must be active rate (backend validates via `getActiveVatRateOrFail`)

### Edge Cases Status

#### EC-1: Ticket closed, Technician wants to edit material
- [x] Edit/add is locked for non-admins on closed tickets; frontend shows info message "Ticket geschlossen. Nur Admins koennen Material bearbeiten."

#### EC-2: VAT rate deactivated but existing entries use it
- [x] Existing entries store snapshot (vatRateSnapshot + vatRateLabel), so they retain the correct value even after rate deactivation

#### EC-3: All VAT rates deactivated
- [x] Form shows alert "Keine MwSt.-Saetze konfiguriert. Bitte Admin kontaktieren." and submit button is disabled

#### EC-4: Very high quantities or prices
- [x] Menge maximal 9999 (frontend: z.number().max(9999), backend: @Max(9999))
- [x] Preis maximal 999.999,99 EUR (frontend: z.number().max(999999.99), backend: @Max(999999.99))

#### EC-5: Same material added multiple times
- [x] Allowed - no duplicate check exists by design

#### EC-6: Decimal separator (comma and dot)
- [ ] BUG: The `parseDecimalInput` helper function exists in `materials.ts` but is NOT used in the material form dialog. The price input uses `type="number"` with manual comma-to-dot replacement in onChange, which means the browser's native number input handles it. The `parseDecimalInput` helper is dead code. The `type="number"` input may not accept commas on all browsers/locales.

### Security Audit Results

- [x] Authentication: All endpoints use JwtAuthGuard - cannot access without login
- [x] Authorization (VAT rates): Admin-only endpoints use @Roles(UserRole.ADMIN) decorator
- [x] Authorization (materials): Delete is admin-only; closed ticket modifications are admin-only
- [x] Input validation: Server-side validation with class-validator DTOs (whitelist + forbidNonWhitelisted)
- [x] UUID validation: All ID params use ParseUUIDPipe - prevents injection via URL params
- [x] XSS: Material names are rendered as text content in React (not dangerouslySetInnerHTML) - safe
- [x] Mass assignment: ValidationPipe with whitelist=true strips unknown properties
- [x] Rate limiting: ThrottlerModule configured globally (100 requests per 60 seconds)
- [x] Data integrity: VAT rate snapshot prevents manipulation of historical records
- [ ] BUG: No authorization check ensures a user can only access materials for tickets they are authorized to see. Any authenticated user can call GET/POST/PATCH on any ticket's materials by knowing the ticket UUID. This follows the same pattern as the existing ticket system (PROJ-3), but is worth noting as a security consideration.
- [ ] BUG: The `user.role as any` cast in `materials.controller.ts` (lines 44, 55, 66) bypasses TypeScript type safety. If the JWT payload contains an unexpected role value, it would not be caught at compile time.

### Bugs Found

#### BUG-1: `parseDecimalInput` helper is dead code - comma separator may not work on all browsers
- **Severity:** Low
- **Steps to Reproduce:**
  1. Open material form dialog
  2. Try entering "12,50" in the Einzelpreis netto field
  3. Expected: Value is accepted and parsed as 12.50
  4. Actual: The `type="number"` input with manual `replace(",", ".")` in onChange handles it, but behavior depends on browser locale. The dedicated `parseDecimalInput` function from `materials.ts` is never called.
- **Priority:** Nice to have - the current implementation likely works in German locale browsers but the dead code should be either used or removed

#### BUG-2: `user.role as any` type cast in materials controller
- **Severity:** Low
- **Steps to Reproduce:**
  1. Review `backend/src/materials/materials.controller.ts` lines 44, 55, 66
  2. The controller casts `user.role` as `any` to pass to the service
  3. Expected: Strong typing through the call chain
  4. Actual: Type safety is bypassed
- **Priority:** Nice to have - this is a code quality issue, not a runtime bug since JwtAuthGuard ensures valid roles

#### BUG-3: No DELETE endpoint for VAT rates
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Navigate to /admin/vat-rates
  2. Try to delete a VAT rate
  3. Expected: Should be possible to delete unused VAT rates
  4. Actual: No delete button in UI, no DELETE endpoint in backend. Only deactivation is possible.
- **Note:** This may be intentional by design (deactivation instead of deletion to preserve referential integrity). However, the spec says "CRUD fuer MwSt.-Saetze (Admin)" which implies Delete should exist. The current behavior of deactivation-only is actually safer for data integrity.
- **Priority:** Fix in next sprint (if full CRUD is desired per spec)

#### BUG-4: VatRate entity decimal columns may return strings from TypeORM
- **Severity:** Medium
- **Steps to Reproduce:**
  1. GET /api/vat-rates or GET /api/admin/vat-rates
  2. Check the `rate` field in the JSON response
  3. Expected: `rate` should be a number (e.g., 19.0)
  4. Actual: TypeORM returns decimal columns as strings. The `MaterialsService` has a `sanitize()` method that converts to Number, but `VatRatesService` does NOT sanitize - it returns raw TypeORM entities. The `rate` field may be returned as string "19.00" instead of number 19.
- **Note:** The frontend `fetchActiveVatRates()` declares `rate: number` in the TypeScript interface, so if the backend returns a string, comparisons and calculations may behave unexpectedly (e.g., string concatenation instead of addition).
- **Priority:** Fix before deployment - could cause calculation errors in gross price preview

#### BUG-5: Editing material with a deactivated VAT rate re-validates the original vatRateId
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Add material with VAT rate "MwSt. 19%"
  2. Deactivate "MwSt. 19%" in admin settings
  3. Edit the material entry (change only the name or quantity, keeping the same vatRateId)
  4. Expected: Update should succeed since vatRateId is unchanged
  5. Actual: If the frontend sends the original `vatRateId` in the PATCH payload, the backend checks `dto.vatRateId !== material.vatRateId` - this correctly skips re-validation when the ID hasn't changed. However, the frontend form always submits all fields including vatRateId. If the user selects a different active rate and then switches back (which is impossible since the old rate is no longer in the dropdown), this is fine. But the edit form pre-fills `vatRateId` from `material.vatRateId` and if that rate is now inactive, the dropdown won't show it - so the user MUST select a new rate to submit.
- **Note:** This is actually correct behavior per spec: "Bestehende Eintraege behalten den gespeicherten MwSt.-Satz. Der Satz wird im Dropdown nicht mehr angeboten." But there is a UX issue: when editing a material that has a deactivated VAT rate, the dropdown will show no selection (since the old rate ID is not in the active rates list), forcing the user to choose a new rate. There is no visual indication that the original rate was deactivated.
- **Priority:** Fix in next sprint - UX improvement to show the old rate label as disabled info text

### Regression Testing

- [x] Frontend build succeeds (all existing pages compile)
- [x] Backend build succeeds (no TypeScript errors)
- [x] Ticket detail page still renders all existing sections (description, notes, time entries)
- [x] Sidebar navigation unchanged for existing items; new "MwSt.-Saetze" item correctly restricted to admin role
- [x] No changes to existing PROJ-1 through PROJ-11 code (only additions)
- [x] Lint: No new lint errors introduced by PROJ-12 files (existing errors in sidebar.tsx and ticket-form-sheet.tsx are pre-existing)

### Cross-Browser & Responsive Notes (Code Review)

- [x] Table columns hide responsively: "EP netto" hidden below `sm`, "MwSt." hidden below `md` - good responsive design
- [x] Form layout uses `grid grid-cols-2 gap-4` for quantity/price side by side
- [x] Dialog uses `sm:max-w-[480px]` - responsive width
- [x] Admin page uses `flex-col gap-4 sm:flex-row` for header layout - responsive
- **Note:** Actual cross-browser testing (Chrome, Firefox, Safari) and responsive testing (375px, 768px, 1440px) requires a running application. Code review shows responsive patterns are in place.

### Summary
- **Acceptance Criteria:** 16/16 passed (all core criteria met)
- **Edge Cases:** 5/6 passed (1 minor issue with decimal separator dead code)
- **Bugs Found:** 5 total (0 critical, 0 high, 3 medium, 2 low)
- **Security:** Mostly good - standard pattern matches existing codebase, no critical vulnerabilities found
- **Production Ready:** NO - BUG-4 (VatRate decimal serialization) should be fixed before deployment as it could cause incorrect calculations in the frontend
- **Recommendation:** Fix BUG-4 first (VatRatesService needs a sanitize step like MaterialsService has), then deploy. BUG-3 and BUG-5 can be addressed in the next sprint.

## Deployment
_To be added by /deploy_
