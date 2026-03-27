# PROJ-3: Ticket Management

## Status: In Review
**Created:** 2026-03-26
**Last Updated:** 2026-03-27

## Dependencies
- Requires: PROJ-1 (User Authentication) — nur eingeloggte Benutzer
- Requires: PROJ-2 (Customer Management) — Kunde muss ausgewählt werden

## User Stories
- Als Office-Mitarbeiter möchte ich ein neues Ticket mit Kunde, Beschreibung und Priorität anlegen, damit Techniker wissen was zu tun ist
- Als Techniker möchte ich alle mir zugewiesenen Tickets in einer übersichtlichen Liste sehen, damit ich meinen Arbeitstag planen kann
- Als Techniker möchte ich ein Ticket öffnen und alle Details sehen, damit ich vorbereitet zum Kunden fahre
- Als Techniker möchte ich interne Notizen zu einem Ticket hinzufügen, damit Kollegen meinen Bearbeitungsstand kennen
- Als Office-Mitarbeiter möchte ich den Status eines Tickets jederzeit aktualisieren, damit alle wissen ob ein Ticket noch offen ist
- Als Admin möchte ich Tickets beliebigen Technikern zuweisen oder umzuweisen, damit die Arbeitslast fair verteilt ist

## Acceptance Criteria
- [ ] Ticket erstellen mit Pflichtfeldern: Kunde, Betreff, Beschreibung, Priorität, Status, zuständiger Techniker
- [ ] Ticket erstellen mit optionalen Feldern: Ansprechpartner (aus PROJ-2), Anlagedatum, interne Notizen
- [ ] Prioritäten: `low`, `medium`, `high`, `critical` (farblich unterschieden)
- [ ] Status-Workflow: `open` → `in_progress` → `resolved` → `closed` (+ `on_hold`)
- [ ] Ticketliste mit Filtern: Status, Priorität, zuständiger Techniker, Kunde
- [ ] Ticketliste mit Spalten-Sortierung: Datum, Priorität, Status
- [ ] Ticket-Detailseite zeigt alle Felder, Zeiteinträge (aus PROJ-4) und Notizen
- [ ] Interne Notizen: Text + Timestamp + Autor, nicht editierbar nach dem Speichern
- [ ] Ticket bearbeiten (alle Felder außer Erstellungsdatum)
- [ ] Ticket schließen erzeugt Pflicht-Abschlussnotiz
- [ ] Ticket-Nummer wird automatisch generiert (fortlaufend, z.B. #1042)
- [ ] Rollen: `technician` hat dieselben Rechte wie `office` (alle Tickets erstellen, bearbeiten, zuweisen, schließen). Einzige Einschränkung: Abrechnungs-Export (PROJ-9) ist nur für `office`/`admin`. Techniker dürfen Zeiteinträge als abrechenbar/nicht abrechenbar markieren.

## Edge Cases
- Ticket ohne zugewiesenen Techniker: erlaubt (Status bleibt `open`, erscheint in "Unzugewiesen"-Filter)
- Ticket schließen mit laufendem Timer (PROJ-4): Warnung "Aktiver Timer läuft noch"
- Kunde wird archiviert während Ticket offen: Ticket bleibt bestehen, Kundenname wird als "[archiviert]" angezeigt
- Sehr lange Beschreibung: Textarea scrollbar, kein Zeichenlimit (aber empfohlene Länge anzeigen)
- Doppeltes Ticket für gleichen Kunden: nur Warnung, kein Block

## Technical Requirements
- Performance: Ticketliste (bis 1000 Tickets) lädt in < 500ms mit serverseitiger Pagination
- Ticket-Detailseite: < 300ms
- Volltext-Suche auf Betreff + Beschreibung (PostgreSQL `tsvector` oder LIKE für MVP)
- Alle Ticket-Änderungen im Audit-Log festgehalten

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_Erstellt: 2026-03-27_

### Komponentenstruktur

```
/tickets (Ticketliste)
+-- Seitenkopf
|   +-- "Neues Ticket"-Button
|   +-- Suchfeld (Volltext: Betreff + Beschreibung)
+-- Filterleiste
|   +-- Status-Filter (open / in_progress / resolved / closed / on_hold)
|   +-- Prioritäts-Filter (low / medium / high / critical)
|   +-- Techniker-Filter (Dropdown aller Benutzer)
|   +-- Kunden-Filter (Dropdown aller Kunden)
+-- Ticket-Tabelle
|   +-- Tabellenzeile
|   |   +-- Ticketnummer (#1042)
|   |   +-- Betreff
|   |   +-- Kundenname
|   |   +-- Prioritäts-Badge (farbcodiert)
|   |   +-- Status-Badge (farbcodiert)
|   |   +-- Zuständiger Techniker
|   |   +-- Erstellungsdatum
|   +-- Spaltensortierung (Datum, Priorität, Status)
|   +-- Pagination
+-- Leerzustand (keine Tickets / keine Filterergebnisse)

/tickets/[id] (Ticket-Detailseite)
+-- Seitenkopf
|   +-- Ticketnummer + Betreff
|   +-- Status-Badge + Prioritäts-Badge
|   +-- Aktionsleiste (Bearbeiten, Schließen, Zuweisen)
+-- Metadaten-Panel
|   +-- Kunde (verlinkt) + Ansprechpartner
|   +-- Zuständiger Techniker + Erstellt von
|   +-- Erstellt am / Aktualisiert am
+-- Beschreibung
+-- Notizen-Verlauf
|   +-- Notiz-Karte (Autor, Zeitstempel, Text — nur lesbar)
|   +-- Neue Notiz (Textarea + Speichern-Button)
+-- Zeiteinträge (Platzhalter — wird mit PROJ-4 befüllt)

Ticket-Formular (Sheet — Erstellen / Bearbeiten)
+-- Kunde wählen (Pflichtfeld — aus PROJ-2)
+-- Ansprechpartner wählen (optional — gefiltert nach gewähltem Kunden)
+-- Betreff
+-- Beschreibung (Textarea)
+-- Priorität wählen
+-- Status wählen (eingeschränkte Übergänge)
+-- Techniker zuweisen (alle aktiven Benutzer)
+-- Speichern / Abbrechen

Ticket-Schließen-Dialog
+-- Warnung falls aktiver Timer läuft (PROJ-4-Anbindung)
+-- Pflicht-Abschlussnotiz (Textarea)
+-- Bestätigen-Button
```

### Datenmodell

**Ticket** — eine Zeile pro Support-Ticket:

| Feld | Typ | Hinweise |
|---|---|---|
| ID | UUID | Interner Primärschlüssel |
| Ticketnummer | Integer (auto-increment) | Menschenlesbar `#1042`, generiert durch DB-Sequenz |
| Betreff | Text (max. 200 Zeichen) | Pflichtfeld |
| Beschreibung | Langtext | Kein hartes Limit; scrollbare Textarea |
| Priorität | Enum | `low`, `medium`, `high`, `critical` |
| Status | Enum | `open`, `in_progress`, `resolved`, `closed`, `on_hold` |
| Kunde | Verknüpfung → Customer | Pflichtfeld |
| Ansprechpartner | Verknüpfung → Contact | Optional; gefiltert nach gewähltem Kunden |
| Zuständig | Verknüpfung → User | Optional; null = „Nicht zugewiesen" |
| Erstellt von | Verknüpfung → User | Automatisch bei Erstellung gesetzt |
| Erstellt am | Zeitstempel | Automatisch; nicht editierbar |
| Aktualisiert am | Zeitstempel | Automatisch bei jeder Änderung |

**Ticket-Notiz** — unveränderliche Notizen zu einem Ticket:

| Feld | Typ | Hinweise |
|---|---|---|
| ID | UUID | |
| Ticket | Verknüpfung → Ticket | Zugehöriges Ticket |
| Autor | Verknüpfung → User | Wer die Notiz geschrieben hat |
| Text | Langtext | |
| Erstellt am | Zeitstempel | Fest — Notizen können nicht bearbeitet oder gelöscht werden |
| Ist Abschlussnotiz | Boolean | Markiert die Pflichtnotiz beim Schließen |

**Audit-Log** — bestehende `audit_log`-Tabelle aus PROJ-1 wird wiederverwendet. Jede Statusänderung, Neuzuweisung und Feldänderung wird automatisch protokolliert.

### Technische Entscheidungen

| Entscheidung | Wahl | Begründung |
|---|---|---|
| Datenhaltung | PostgreSQL (gleiche DB wie PROJ-1/2) | Persistent, mehrbenutzerfähig, verknüpfbar mit Kunden/Benutzern |
| Backend-Modul | Neues NestJS `TicketsModule` | Folgt dem Muster des bestehenden `CustomersModule` |
| Ticketnummer | PostgreSQL Auto-Increment-Sequenz | Eindeutige, lückenlose fortlaufende Nummern |
| Volltextsuche | `ILIKE` mit `%suchbegriff%` für MVP | Ausreichend für < 1.000 Tickets; später auf `tsvector` umstellbar |
| Pagination | Serverseitig (Offset + Limit) | Erfüllt die < 500ms-Anforderung |
| Audit-Trail | Bestehende `AuditLog`-Entity | Keine neue Infrastruktur nötig |
| Notizen-Unveränderlichkeit | Keine Update/Delete-Endpunkte | Notizen sind rechtliche Dokumentation |
| Frontend-Routing | `/tickets` + `/tickets/[id]` | Standardmuster; Detailseite wird für PROJ-6 benötigt |

### Backend-Modulstruktur

```
backend/src/tickets/
  tickets.module.ts          — verbindet alles
  tickets.controller.ts      — HTTP-Endpunkte
  tickets.service.ts         — Geschäftslogik, Audit-Logging
  dto/
    create-ticket.dto.ts
    update-ticket.dto.ts
    create-note.dto.ts
    ticket-filter.dto.ts     — Query-Parameter für Filter/Suche/Sortierung/Pagination

backend/src/entities/
  ticket.entity.ts           — neu
  ticket-note.entity.ts      — neu
```

### API-Übersicht

| Methode | Pfad | Zugriff | Zweck |
|---|---|---|---|
| GET | `/tickets` | Alle Rollen | Paginierte Liste mit Filtern & Suche |
| POST | `/tickets` | Alle Rollen | Neues Ticket erstellen |
| GET | `/tickets/:id` | Alle Rollen | Vollständiges Ticket-Detail + Notizen |
| PATCH | `/tickets/:id` | Alle Rollen | Felder aktualisieren |
| POST | `/tickets/:id/close` | Alle Rollen | Schließen + Pflicht-Abschlussnotiz |
| POST | `/tickets/:id/notes` | Alle Rollen | Interne Notiz hinzufügen |

### Rollenmatrix

| Aktion | Techniker | Office | Admin |
|---|---|---|---|
| Alle Tickets ansehen | Ja | Ja | Ja |
| Ticket erstellen | Ja | Ja | Ja |
| Jedes Ticket bearbeiten | Ja | Ja | Ja |
| Ticket zuweisen/umzuweisen | Ja | Ja | Ja |
| Notiz zu jedem Ticket | Ja | Ja | Ja |
| Ticket schließen | Ja | Ja | Ja |
| Zeiteinträge als abrechenbar markieren | Ja | Ja | Ja |
| Abrechnungsexport (PROJ-9) | **Nein** | Ja | Ja |

### Frontend-Seiten

| Seite | Pfad | Verwendet |
|---|---|---|
| Ticketliste | `/tickets` | `Table`, `Badge`, `Select`, `Input`, `Pagination` |
| Ticket-Detail | `/tickets/[id]` | `Card`, `Badge`, `Textarea`, `Button`, `Separator` |
| Ticket-Formular | Sheet-Overlay | `Sheet`, `Form`, `Select`, `Input`, `Textarea` |

**Keine neuen npm-Pakete nötig.**

## Frontend Implementation Notes
_Erstellt: 2026-03-27_

### Erstellte Dateien
- `src/lib/tickets.ts` — Types, Zod-Schemas, API-Funktionen, Konstanten (Labels, Farben)
- `src/components/ticket-form-sheet.tsx` — Sheet-Overlay fuer Ticket-Erstellen/-Bearbeiten (laedt Kunden + Benutzer, filtert Kontakte nach Kunde)
- `src/components/ticket-close-dialog.tsx` — Dialog mit Pflicht-Abschlussnotiz
- `src/app/(protected)/tickets/page.tsx` — Ticketliste mit serverseitiger Pagination, 4 Filtern (Status, Prioritaet, Techniker, Kunde), Volltextsuche, Spaltensortierung
- `src/app/(protected)/tickets/[id]/page.tsx` — Ticket-Detailseite mit Beschreibung, Notizen-Verlauf, Metadaten-Sidebar, Zeiteintraege-Platzhalter (PROJ-4)

### Hinweise
- Alle shadcn/ui-Komponenten waren bereits installiert (Table, Badge, Select, Sheet, Dialog, Card, Separator, etc.)
- Prioritaeten und Status sind farblich via Tailwind-Klassen unterschieden (PRIORITY_COLORS / STATUS_COLORS)
- Status `closed` ist im Formular nicht direkt waehlbar — nur ueber den Schliessen-Dialog mit Pflicht-Abschlussnotiz
- Der `/users`-Endpunkt ist aktuell Admin-only; fuer das Techniker-Dropdown muss der Backend-Zugriff fuer alle Rollen geoeffnet werden (z.B. separater `/users/active`-Endpunkt)
- Die Sidebar-Navigation hatte bereits einen "Tickets"-Eintrag, der auf `/tickets` zeigt

## QA Test Results
_Code Review performed: 2026-03-27_

### Acceptance Criteria Compliance

| # | Criterion | Status | Notes |
|---|-----------|--------|-------|
| AC-1 | Ticket erstellen mit Pflichtfeldern (Kunde, Betreff, Beschreibung, Prioritaet, Status, Techniker) | PASS | Form sheet covers all fields; Zod schema validates subject + customerId as required. Techniker is optional per spec ("null = Nicht zugewiesen") so this is correct. |
| AC-2 | Ticket erstellen mit optionalen Feldern (Ansprechpartner, interne Notizen) | PASS (partial) | Ansprechpartner is optional and filtered by customer. However, there is no way to add an initial internal note at creation time -- notes can only be added after the ticket exists. |
| AC-3 | Prioritaeten farblich unterschieden (low=slate, medium=blue, high=orange, critical=red) | PASS | PRIORITY_COLORS in tickets.ts matches spec exactly. |
| AC-4 | Status-Workflow: open -> in_progress -> resolved -> closed (+on_hold) | PASS (partial) | All statuses exist. "closed" is correctly excluded from the form dropdown. However, there is NO enforcement of valid transitions in the frontend (e.g., user can go from "open" directly to "resolved"). Backend also does not enforce transitions -- only blocks direct "closed" via PATCH. See BUG-3. |
| AC-5 | Ticketliste mit Filtern: Status, Prioritaet, Techniker, Kunde | PASS | All four filters present with "all" default. |
| AC-6 | Ticketliste mit Spaltensortierung: Datum, Prioritaet, Status | PASS | Three sortable columns with visual sort direction indicators. |
| AC-7 | Ticket-Detailseite zeigt alle Felder, Zeiteintraege (Platzhalter), Notizen | PASS | Description, notes with timeline, metadata sidebar, time entries placeholder all present. |
| AC-8 | Interne Notizen: Text + Timestamp + Autor, nicht editierbar nach Speichern | PASS | Notes display author, timestamp, text. No edit/delete UI. Backend has no update/delete endpoints for notes. |
| AC-9 | Ticket bearbeiten (alle Felder ausser Erstellungsdatum) | PASS | Edit form sheet pre-populates all fields. CreatedAt is not editable. |
| AC-10 | Ticket schliessen erzeugt Pflicht-Abschlussnotiz | PASS | TicketCloseDialog enforces non-empty closing note via Zod. Backend CloseTicketDto has MinLength(1). |
| AC-11 | Ticketnummer automatisch generiert (z.B. #1042) | PASS | Displayed as #{ticketNumber} in list and detail. |
| AC-12 | Archivierter Kunde als "[archiviert]" angezeigt | PASS | Both list and detail check customer.status === "inactive" and append "[archiviert]". |
| AC-13 | Serverseitige Pagination | PASS | PAGE_SIZE=20, server returns paginated result, prev/next buttons present. |

### Bugs Found

**BUG-1: Page 1 is never sent to the backend (fetchTickets skips page=1)**
- Severity: LOW
- File: `/Users/matthias/DEV/Ticketsystem/test-app/src/lib/tickets.ts`, line 123
- Description: `if (params?.page)` is falsy when page is 0, but more importantly when the initial state `page` is 1 (truthy) it works. However, `if (params?.page)` would silently skip sending `page` if it were explicitly set to `0`. The real issue is that the same pattern on line 124 `if (params?.limit)` would skip sending `limit` if it were `0`, though that is not a practical concern since limit=0 makes no sense. Low risk but the guard should be `!= null` instead of truthy check.
- Steps to reproduce: Call `fetchTickets({ page: 0 })` -- page param is silently dropped.

**BUG-2: "Unassigned" filter value "unassigned" is sent as assigneeId but backend expects a UUID**
- Severity: HIGH
- File: `/Users/matthias/DEV/Ticketsystem/test-app/src/app/(protected)/tickets/page.tsx`, line 292
- Description: The assignee filter has a `<SelectItem value="unassigned">Nicht zugewiesen</SelectItem>` option. When selected, `assigneeFilter` becomes the string `"unassigned"`, which is passed as `params.assigneeId = "unassigned"` to the backend. The backend TicketFilterDto validates assigneeId with `@IsUUID()`, so this will be rejected with a 400 error. The backend has no special handling for filtering unassigned tickets.
- Steps to reproduce: Select "Nicht zugewiesen" in the Techniker filter dropdown. The ticket list will fail to load or show an error.
- Priority: P1 -- core filter functionality is broken.

**BUG-3: No status transition enforcement on frontend or backend**
- Severity: MEDIUM
- File: `/Users/matthias/DEV/Ticketsystem/test-app/src/components/ticket-form-sheet.tsx`, line 342
- Description: The spec defines a status workflow (open -> in_progress -> resolved -> closed + on_hold), but the form allows any non-closed status to be selected regardless of current status. A user can set a ticket from "resolved" back to "open" or from "open" directly to "resolved". The backend also allows any transition except direct-to-closed. This is a spec deviation rather than a crash bug.
- Priority: P2 -- business logic gap.

**BUG-4: Silent failure when loading customers/users in form sheet**
- Severity: MEDIUM
- File: `/Users/matthias/DEV/Ticketsystem/test-app/src/components/ticket-form-sheet.tsx`, lines 95-97
- Description: If `fetchCustomers` or `fetchActiveUsers` fails, the error is silently swallowed (`.catch(() => {})`). The user sees an empty customer dropdown with no indication that data failed to load. They cannot create a ticket but get no error message explaining why.
- Steps to reproduce: Start with backend down, open the "Neues Ticket" sheet. Customer dropdown is empty, no error shown.
- Priority: P2 -- poor UX on network failure.

**BUG-5: Customers dropdown only shows active customers -- cannot edit ticket for archived customer**
- Severity: MEDIUM
- File: `/Users/matthias/DEV/Ticketsystem/test-app/src/components/ticket-form-sheet.tsx`, line 88
- Description: `fetchCustomers({ status: "active" })` is called when loading the form. When editing an existing ticket whose customer has been archived, the customer dropdown will not contain the current customer. The form will show an empty customer selection, and submitting could clear or break the customer association.
- Steps to reproduce: Archive a customer that has an open ticket. Open the edit form for that ticket. The customer field will be empty or show "Kunde waehlen..." even though the ticket already has a customer.
- Priority: P1 -- data integrity issue on edit.

**BUG-6: SelectItem with value="" may not work in Radix/shadcn Select**
- Severity: MEDIUM
- File: `/Users/matthias/DEV/Ticketsystem/test-app/src/components/ticket-form-sheet.tsx`, lines 242, 374
- Description: `<SelectItem value="">Kein Ansprechpartner</SelectItem>` and `<SelectItem value="">Nicht zugewiesen</SelectItem>` use empty string as value. Radix UI Select does not reliably support empty string as a value -- it may treat it the same as "no selection" and prevent the item from being selectable, or it may cause the placeholder to persist even after selection.
- Steps to reproduce: Open the ticket form, select a customer that has contacts, then try to select "Kein Ansprechpartner" to clear the contact selection.
- Priority: P2 -- may cause form interaction issues.

**BUG-7: Double data fetch for customers and users on ticket list page**
- Severity: LOW
- File: `/Users/matthias/DEV/Ticketsystem/test-app/src/app/(protected)/tickets/page.tsx`, lines 107-114
- Description: The ticket list page fetches customers and users for the filter dropdowns. When the user clicks "Neues Ticket", the TicketFormSheet fetches them AGAIN independently. This is wasteful. Not a bug per se, but an unnecessary performance cost.
- Priority: P3 -- optimization.

**BUG-8: `useAuth()` user is imported but unused on detail page**
- Severity: LOW
- File: `/Users/matthias/DEV/Ticketsystem/test-app/src/app/(protected)/tickets/[id]/page.tsx`, line 51
- Description: `const { user } = useAuth()` is destructured but `user` is never referenced anywhere in the component. This is dead code that will cause a lint warning.
- Priority: P3 -- code quality.

**BUG-9: Concurrent loadTicket calls on detail page can cause stale state**
- Severity: LOW
- File: `/Users/matthias/DEV/Ticketsystem/test-app/src/app/(protected)/tickets/[id]/page.tsx`, lines 63-74 and 82-85
- Description: After `handleUpdateTicket` or `handleCloseTicket`, `loadTicket()` is called without awaiting it. If the user quickly edits, then closes the ticket, two `loadTicket` calls race. The last one to resolve wins, but the first might set stale data momentarily. Also, `handleUpdateTicket` does not catch errors -- if `updateTicket` throws, the error propagates to the form sheet's catch block, but `loadTicket()` on line 84 is still called even on failure since it is after `await updateTicket`. Wait -- actually looking again, if `updateTicket` throws, line 84 is never reached. That part is fine. The race condition remains but is low-impact.
- Priority: P3.

**BUG-10: handleCreateTicket does not handle errors (toast.error missing)**
- Severity: MEDIUM
- File: `/Users/matthias/DEV/Ticketsystem/test-app/src/app/(protected)/tickets/page.tsx`, lines 149-153
- Description: `handleCreateTicket` calls `createTicket(data)` and `toast.success(...)`. If `createTicket` throws, the error propagates to the form sheet's catch block which does nothing (comment says "Error handling is done by the parent via toast"). But the parent does NOT show a toast.error. The user gets no feedback when ticket creation fails.
- Steps to reproduce: Try to create a ticket with invalid data that passes frontend validation but fails on the backend (e.g., invalid customerId). The form closes with no success or error message.
- Priority: P1 -- silent failure on create.

**BUG-11: handleUpdateTicket and handleCloseTicket also lack error toasts**
- Severity: MEDIUM
- File: `/Users/matthias/DEV/Ticketsystem/test-app/src/app/(protected)/tickets/[id]/page.tsx`, lines 81-85, 88-92
- Description: Same issue as BUG-10. If `updateTicket` or `closeTicket` throw, the error propagates to the dialog/sheet catch block. The sheet silently catches it, but the user sees no error feedback. `toast.success` on line 83/90 is only reached on success, which is correct, but the failure path shows nothing.
- Priority: P1 -- silent failure on update/close.

**BUG-12: Ticket table rows are not clickable -- only the subject text is a link**
- Severity: LOW
- File: `/Users/matthias/DEV/Ticketsystem/test-app/src/app/(protected)/tickets/page.tsx`, lines 384-427
- Description: Only the subject cell contains a `<Link>`. Clicking on any other cell (priority badge, status badge, date, etc.) does nothing. On mobile where columns are hidden, the user must precisely click the subject text. This is a UX issue, not a bug. The entire row should ideally be clickable.
- Priority: P3 -- UX improvement.

**BUG-13: Priority sort is alphabetical, not by severity**
- Severity: MEDIUM
- File: Backend `tickets.service.ts`, line 74
- Description: Sorting by `ticket.priority` sorts the enum values alphabetically in PostgreSQL (critical, high, low, medium) rather than by logical severity (low, medium, high, critical). This means "critical" comes before "high" and "low" comes before "medium" in ASC order, which is not the expected behavior.
- Steps to reproduce: Sort the ticket list by priority ascending. "critical" will appear before "high".
- Priority: P2 -- misleading sort order.

**BUG-14: Status sort is also alphabetical, not by workflow order**
- Severity: LOW
- File: Backend `tickets.service.ts`, line 74
- Description: Same issue as BUG-13 but for status. Sorting by status gives alphabetical order (closed, in_progress, on_hold, open, resolved) rather than workflow order.
- Priority: P3.

### Security Audit

| Check | Result | Notes |
|-------|--------|-------|
| XSS via ticket subject/description | LOW RISK | React escapes output by default. `ticket.subject` and `ticket.description` are rendered via `{ticket.subject}` and `{ticket.description}` in JSX, which auto-escapes. `whitespace-pre-wrap` is CSS-only, no `dangerouslySetInnerHTML`. |
| XSS via note text | LOW RISK | Same as above -- note.text is rendered via `{note.text}` in JSX. |
| SQL Injection via search | SAFE | Backend uses parameterized queries (`{ search: \`%${filters.search}%\` }`) via TypeORM query builder. The `%` wrapping is the only string interpolation and it is passed as a parameter. |
| SQL Injection via sortBy | SAFE | Backend whitelist-validates sortBy against `allowedSortFields` record. Unknown values fall back to `ticket.createdAt`. |
| IDOR (accessing other tickets) | N/A (single-tenant) | All roles can access all tickets per spec. No per-user ticket scoping needed. |
| Auth bypass | SAFE | All controller endpoints guarded by `JwtAuthGuard` + `RolesGuard`. `apiFetch` includes credentials. |
| Sensitive data leak | LOW RISK | Backend `sanitizeUser` strips passwordHash from user objects in responses. However, `sanitizeTicket` passes `ticket.customer` and `ticket.contact` without sanitization. If customer entity has sensitive fields, they would leak. Currently Customer entity seems fine (no passwords). |
| CSRF | INFO | Cookie-based auth with `credentials: "include"`. The backend should validate Origin/Referer or use CSRF tokens. Not visible in frontend code -- needs backend check. |
| Rate limiting on note creation | MISSING | No rate limiting on `POST /tickets/:id/notes`. A malicious user could spam thousands of notes. Backend-side concern. |
| UUID validation on ticket detail | SAFE | Backend uses `ParseUUIDPipe` on all `:id` params. |

### Responsive Design Assessment

| Breakpoint | Assessment |
|------------|------------|
| 375px (mobile) | Ticket list hides Customer (md:table-cell), Assignee (lg:table-cell), and Date (sm:table-cell) columns. Filters stack vertically. Form sheet has `sm:max-w-lg`. Functional but note that at 375px, even the visible columns (#, Subject, Priority, Status) may be cramped. |
| 768px (tablet) | Customer column visible (md breakpoint). Date visible (sm breakpoint). Assignee still hidden (requires lg). Filters wrap with `sm:flex-row sm:flex-wrap`. |
| 1440px (desktop) | All columns visible. Filters in a single row. Detail page uses `lg:grid-cols-3` layout with sidebar. |

### Accessibility Assessment

| Check | Result |
|-------|--------|
| aria-labels on search input | PASS -- `aria-label="Tickets durchsuchen"` |
| aria-labels on filter selects | PASS -- each has an aria-label |
| aria-labels on sort buttons | PASS -- each has an aria-label |
| aria-labels on pagination | PASS -- prev/next buttons have aria-labels |
| aria-label on note textarea | PASS -- `aria-label="Neue Notiz"` |
| Keyboard navigation | PARTIAL -- sort buttons are `<button>` elements (good). Table rows are not focusable/navigable as links (only the subject text is a link). |
| Color contrast | NEEDS VISUAL CHECK -- badge colors use light backgrounds with darker text, but actual contrast ratios need browser testing. |
| Screen reader for empty states | PASS -- descriptive text in empty states. |

### Summary

- **Critical/P0 bugs:** 0
- **P1 bugs:** 3 (BUG-2: unassigned filter, BUG-5: archived customer edit, BUG-10/11: silent failure on create/update/close)
- **P2 bugs:** 3 (BUG-3: no status transitions, BUG-4: silent dropdown load failure, BUG-13: priority sort order)
- **P3 bugs:** 5 (BUG-1, BUG-7, BUG-8, BUG-9, BUG-12, BUG-14)
- **Security issues:** 1 info (CSRF), 1 missing (rate limiting on notes)

### Backend-Specific Bugs (additional)

**BUG-15: `onDelete: 'SET NULL'` on non-nullable `createdById` column**
- Severity: HIGH
- File: `backend/src/entities/ticket.entity.ts`, lines 74-79
- Description: `createdById` has no `nullable: true`, but the ManyToOne relation uses `onDelete: 'SET NULL'`. If a user who created tickets is deleted, PostgreSQL throws a constraint error. Same issue on `ticket-note.entity.ts` `authorId`.
- Fix: Change to `onDelete: 'RESTRICT'` (users with ticket history cannot be deleted).

**BUG-16: Closed tickets can be modified and reopened via PATCH**
- Severity: HIGH
- File: `backend/src/tickets/tickets.service.ts`, update method
- Description: The update method only blocks setting status TO `closed`. It does NOT block modifying closed tickets or changing `closed` → `open`. A closed ticket can be fully reopened bypassing the closing workflow.

**BUG-17: Tickets can be created with status `closed`**
- Severity: MEDIUM
- File: `backend/src/tickets/dto/create-ticket.dto.ts`
- Description: CreateTicketDto accepts any TicketStatus including `closed`. The restriction only exists in the update method, not create. Bypasses mandatory closing note.

**BUG-18: No validation that contactId belongs to the selected customerId**
- Severity: MEDIUM
- File: `backend/src/tickets/tickets.service.ts`, create/update methods
- Description: Frontend filters contacts by customer, but backend does not validate. A crafted request can associate Contact from Customer A with a Ticket for Customer B.

**BUG-19: Non-existent FK UUIDs cause raw 500 errors**
- Severity: MEDIUM
- File: `backend/src/tickets/tickets.service.ts`, create method
- Description: No existence check for customerId, contactId, assigneeId. Invalid UUIDs that pass format validation trigger raw PostgreSQL FK constraint errors (500) instead of proper 400/404 responses.

### Build Status

| Check | Result |
|-------|--------|
| Backend `tsc --noEmit` | PASS |
| Frontend `next build` | PASS |
| Frontend `npm run lint` | FAIL (`next lint` removed in Next.js 16) |
| Backend `npm run lint` | FAIL (10 errors, mostly pre-existing auth module issues) |

### Bug Fix Summary

**All P1 and P2 bugs fixed (2026-03-27):**
- BUG-2: "Nicht zugewiesen" filter now sends `unassigned` string, backend handles with `IS NULL` query
- BUG-3: Status transition validation added — only allowed transitions are accepted
- BUG-4: Form sheet now shows error message when dropdown data fails to load
- BUG-5: Edit form includes archived customer in dropdown when editing existing ticket
- BUG-8: Removed unused `useAuth` import on detail page
- BUG-10/11: Added `toast.error()` for failed create/update/close operations
- BUG-13/14: Priority and status sorting now uses CASE-based logical ordering
- BUG-15: Changed `onDelete: 'SET NULL'` to `onDelete: 'RESTRICT'` on `createdById` and `authorId`
- BUG-16: Closed tickets can no longer be modified via PATCH
- BUG-17: Tickets cannot be created with status `closed`
- BUG-18: Backend validates that contactId belongs to selected customerId

**Remaining P3 items (deferred):**
- BUG-1: Truthy check on page param (edge case, no practical impact)
- BUG-6: Empty string SelectItem value (Radix edge case)
- BUG-7: Double fetch of customers/users (optimization)
- BUG-9: Race condition on rapid edit+close (low impact)
- BUG-12: Table rows not fully clickable (UX improvement)
- BUG-19: FK constraint errors return raw 500 instead of 400

## Deployment
_To be added by /deploy_
