# PROJ-7: Digital Signature Capture

## Status: Deployed
**Created:** 2026-03-26
**Last Updated:** 2026-03-29

## Dependencies
- Requires: PROJ-1 (User Authentication)
- Requires: PROJ-6 (On-Site Service Report) — Unterschrift schließt den Vor-Ort-Bericht ab
- Requires: PROJ-3 (Ticket Management)

## User Stories
- Als Techniker möchte ich dem Kunden ein Tablet hinhalten, auf dem er mit dem Finger unterschreiben kann, damit ich einen rechtssicheren Leistungsnachweis habe
- Als Techniker möchte ich vor der Unterschrift den Kundennamen erfassen, damit klar ist wer unterschrieben hat
- Als Techniker möchte ich die Unterschrift zurücksetzen können, falls der Kunde einen Fehler gemacht hat
- Als Techniker möchte ich einen Einsatzbericht auch ohne Unterschrift abschließen können, wenn der Kunde die Unterschrift verweigert
- Als Admin möchte ich gespeicherte Unterschriften einsehen können, damit ich Streitigkeiten belegen kann
- Als Techniker möchte ich nach der Unterschrift eine Bestätigung sehen, dass der Servicebericht gespeichert wurde

## Acceptance Criteria

### Finalisierungs-Flow
- [ ] Der "Bericht finalisieren"-Button öffnet direkt einen Unterschrift-Dialog (ersetzt den bisherigen Bestätigungs-Dialog)
- [ ] Der Dialog zeigt einen Canvas zum Unterschreiben sowie ein Pflichtfeld "Name des Unterzeichners"
- [ ] Der Dialog bietet alternativ einen "Unterschrift verweigert"-Modus mit Pflichtfeld "Grund"
- [ ] Nach Bestätigung (Unterschrift oder Verweigerung) wechselt der Berichts-Status zu `completed` (readonly)

### Unterschrift-Canvas
- [ ] HTML5 Canvas, optimiert für Touch (finger/stylus) und Maus
- [ ] Canvas-Größe: mindestens 400×200px, responsive für Tablets
- [ ] Zeichnen mit Touch: funktioniert auf iOS Safari und Chrome Android
- [ ] "Zurücksetzen"-Button löscht Canvas und ermöglicht neue Unterschrift
- [ ] "Bestätigen"-Button ist deaktiviert, wenn Canvas leer ist (keine Linie gezeichnet)

### Datenspeicherung (base64 in DB)
- [ ] Unterschrift wird als base64-String (PNG) direkt im `service_report`-Eintrag gespeichert
- [ ] Gespeichert wird: `signature_data` (base64 PNG), `signer_name` (Text), `signed_at` (UTC Timestamp)
- [ ] Bei Verweigerung: `signature_refused = true`, `refusal_reason` (Pflichttext), kein `signature_data`
- [ ] Unterschrift kann nicht überschrieben werden — nur Admin kann Bericht entsperren

### Anzeige im Ticket
- [ ] Abgeschlossener Bericht zeigt: Unterzeichner-Name + Datum/Uhrzeit (oder Verweigerungs-Hinweis)
- [ ] Unterschrift als Vorschau-Bild (img-Tag mit base64 src) im Ticket sichtbar
- [ ] Unterschrift wird in PDF eingebettet (PROJ-8)

## Edge Cases
- Leeres Canvas (keine Linie gezeichnet): "Bestätigen"-Button deaktiviert
- Sehr kurze Unterschrift (einzelner Punkt): Warnung "Unterschrift zu kurz, bitte erneut zeichnen"
- Netzwerkausfall beim Speichern: Fehlermeldung mit Retry-Button
- Kunde verweigert Unterschrift: Pflichtfeld "Grund" muss ausgefüllt sein, bevor Bericht abgeschlossen werden kann
- Browser-Tab geschlossen nach dem Zeichnen, vor dem Speichern: Warnung vor dem Verlassen der Seite (beforeunload)
- Sehr lange Unterschrift → base64 kann groß werden: maximale Canvas-Größe begrenzt (400×200px), JPEG-Komprimierung mit Qualität 0.8

## Technical Requirements
- Canvas-Library: `signature_pad` (npm) — bewährt, touch-optimiert
- Speicherformat: PNG als base64-String, gespeichert im `service_report`-Datenbankfeld `signature_data TEXT`
- Neue DB-Felder in `service_report`: `signature_data TEXT NULL`, `signer_name VARCHAR NULL`, `signed_at TIMESTAMPTZ NULL`, `signature_refused BOOLEAN DEFAULT false`, `refusal_reason TEXT NULL`
- Keine separate Datei oder S3-Storage nötig — base64 in DB für MVP
- Maximale Dateigröße: ~100KB (ausreichend für Unterschriften-PNG bei 400×200px)

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Overview
Replaces the existing simple "Bericht finalisieren?" confirmation dialog with a full signature capture flow. The `ServiceReportSection` component is modified; two new components are added.

### Component Structure
```
ServiceReportSection (existing – modified)
+-- "Bericht finalisieren" Button → opens SignatureDialog (replaces AlertDialog)
+-- SignatureDialog (NEW)
|   +-- Tab: "Unterschrift"
|   |   +-- SignatureCanvas (NEW – wraps signature_pad library)
|   |   |   +-- HTML5 Canvas (touch + mouse, 400×200px)
|   |   |   +-- "Zurücksetzen" Button
|   |   +-- Input: Name des Unterzeichners (required)
|   |   +-- "Bestätigen" Button (disabled when canvas empty)
|   +-- Tab: "Unterschrift verweigert"
|       +-- Textarea: Grund (required)
|       +-- "Verweigerung bestätigen" Button
+-- Signature Display (in completed-report view – NEW section)
    +-- Signer name + signed_at timestamp
    |   OR: Refusal notice + reason
    +-- Signature image preview (base64 PNG, img-tag)
+-- ServiceReportUnlockDialog (existing – unchanged)
```

### Data Model
5 new nullable columns added to the `service_report` DB table:

| Field | Type | Description |
|---|---|---|
| `signature_data` | TEXT NULL | Base64-encoded PNG of the drawn signature |
| `signer_name` | VARCHAR NULL | Name entered by the technician |
| `signed_at` | TIMESTAMPTZ NULL | UTC timestamp of finalization |
| `signature_refused` | BOOLEAN DEFAULT false | True when customer declined to sign |
| `refusal_reason` | TEXT NULL | Required text when signature_refused = true |

The `ServiceReport` TypeScript type in `src/lib/service-reports.ts` gets these 5 fields added.
`finalizeServiceReport()` updated to send signature data in the existing finalize `PATCH` request.

### API Changes (NestJS Backend)
Existing `PATCH /tickets/:id/service-report` endpoint extended to accept signature fields when `status: "completed"` is sent. No new endpoint needed.

Backend validation:
- `status: "completed"` + `signature_refused = false` → `signature_data` + `signer_name` required
- `status: "completed"` + `signature_refused = true` → `refusal_reason` required
- Once `completed`, signature fields are immutable (existing unlock mechanism handles re-opening)

### Tech Decisions
| Decision | Why |
|---|---|
| `signature_pad` npm library | Battle-tested, touch-optimized, handles iOS Safari quirks |
| Base64 PNG in DB | No file storage / S3 needed for MVP; ~30–80KB per signature acceptable |
| Canvas 400×200px | Legible signatures, keeps base64 under ~100KB |
| Tabs (sign vs. refuse) | Clear UX split — no ambiguity between signing and refusal |
| `beforeunload` warning | Prevents data loss when canvas has content but not yet confirmed |

### Dependencies
- `signature_pad` — HTML5 Canvas signature drawing, touch-optimized

## Implementation Notes (Frontend)

### What was built
- **SignatureCanvas** (`src/components/signature-canvas.tsx`): Wraps `signature_pad` library with responsive canvas (auto-resizes to container width, 200px height), HiDPI support, clear button, and stroke event forwarding.
- **SignatureDialog** (`src/components/signature-dialog.tsx`): Dialog with two tabs ("Unterschrift" / "Unterschrift verweigert"). Sign tab has canvas + signer name input; refuse tab has reason textarea. Validates minimum stroke points, empty canvas, and required fields. Includes `beforeunload` warning when canvas has content.
- **ServiceReportSection** (`src/components/service-report-section.tsx`): Modified to replace the old AlertDialog confirmation with SignatureDialog. Completed reports now show signature preview (base64 img) with signer name + timestamp, or refusal notice with reason.
- **ServiceReport type** (`src/lib/service-reports.ts`): Extended with 5 new fields (`signatureData`, `signerName`, `signedAt`, `signatureRefused`, `refusalReason`). `finalizeServiceReport()` now accepts `FinalizeData` (signature or refusal data).

### Deviations from spec
- Uses JPEG compression (quality 0.8) instead of PNG for the exported signature to keep base64 size smaller, as noted in the edge cases section of the spec.
- The `<img>` tag uses native HTML img instead of `next/image` because base64 data URLs do not benefit from Next.js image optimization.

## Implementation Notes (Backend)

### What was built
- **Entity** (`backend/src/entities/service-report.entity.ts`): Added 5 new nullable columns: `signatureData` (TEXT), `signerName` (VARCHAR), `signedAt` (TIMESTAMPTZ), `signatureRefused` (BOOLEAN DEFAULT false), `refusalReason` (TEXT).
- **DTO** (`backend/src/service-reports/dto/update-service-report.dto.ts`): Extended with signature fields. Includes `MaxLength` validation (200KB for base64 data, 200 chars for name, 1000 chars for refusal reason).
- **Service** (`backend/src/service-reports/service-reports.service.ts`):
  - `update()` now validates signature data when `status: "completed"` is sent: requires either `signatureData` + `signerName` (signing flow) or `signatureRefused` + `refusalReason` (refusal flow). Validates base64 data URL format.
  - `unlock()` now clears all 5 signature fields when an admin unlocks a report back to draft.
  - `sanitize()` returns all 5 signature fields in the API response.
- **Schema sync**: TypeORM `synchronize` adds the columns automatically in dev. For production, the migration SQL is provided below.

### Production migration SQL
```sql
ALTER TABLE service_reports
  ADD COLUMN "signatureData" TEXT,
  ADD COLUMN "signerName" VARCHAR,
  ADD COLUMN "signedAt" TIMESTAMPTZ,
  ADD COLUMN "signatureRefused" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "refusalReason" TEXT;
```

### Backend validation rules
- `status: "completed"` + `signatureRefused = false` (or not set) → `signatureData` (valid base64 data URL) + `signerName` required
- `status: "completed"` + `signatureRefused = true` → `refusalReason` required, no `signatureData` stored
- Once completed, PATCH rejected with 400 until admin unlocks
- Unlock clears all signature fields so technician can re-sign

## QA Test Results

**Tested:** 2026-03-29
**App URL:** http://localhost:3000
**Tester:** QA Engineer (AI)

### Acceptance Criteria Status

#### AC-1: Finalisierungs-Flow
- [x] "Bericht finalisieren" button opens a SignatureDialog (replaces old AlertDialog)
- [x] Dialog shows canvas for signing plus a required "Name des Unterzeichners" field
- [x] Dialog offers "Unterschrift verweigert" tab with required "Grund" field
- [x] After confirmation (signature or refusal), report status changes to `completed` (readonly)

#### AC-2: Unterschrift-Canvas
- [x] HTML5 Canvas, powered by `signature_pad` library, handles touch and mouse
- [x] Canvas width is responsive (fills container), height is 200px -- meets spec requirement
- [x] "Zuruecksetzen" button clears canvas and allows new signature
- [x] "Bestaetigen" button is disabled when canvas is empty (no strokes drawn)
- [ ] BUG: Canvas uses `touch-none` CSS class which disables default touch scrolling, but this is correct for signature drawing -- PASS (re-evaluated)

#### AC-3: Datenspeicherung (base64 in DB)
- [x] Signature stored as base64 string in `signatureData` field of `service_report` entity
- [x] `signerName` (text) and `signedAt` (UTC timestamp) stored alongside signature
- [x] Refusal stores `signatureRefused = true`, `refusalReason` (required text), no `signatureData`
- [x] Completed report rejects PATCH updates (400 error) until admin unlocks
- [x] Admin unlock clears all 5 signature fields

#### AC-4: Anzeige im Ticket
- [x] Completed report shows signer name + date/time (or refusal notice with reason)
- [x] Signature displayed as preview image using `<img>` tag with base64 `src`
- [x] Refusal shown with orange warning box, "Ban" icon, reason text, and timestamp

### Edge Cases Status

#### EC-1: Empty canvas (no stroke drawn)
- [x] "Bestaetigen" button is disabled when canvas is empty -- handled correctly

#### EC-2: Very short signature (single point)
- [x] Validation checks `MIN_STROKE_POINTS = 10`; shows "Unterschrift zu kurz, bitte erneut zeichnen" -- handled correctly

#### EC-3: Network failure during save
- [x] Error caught in `handleFinalize`, displays toast error message -- handled correctly
- [ ] BUG: No explicit retry button in the dialog after failure (see BUG-3)

#### EC-4: Customer refuses signature
- [x] "Unterschrift verweigert" tab with required "Grund" textarea -- handled correctly
- [x] Backend validates `refusalReason` is non-empty when `signatureRefused = true`

#### EC-5: Browser tab closed after drawing, before saving
- [x] `beforeunload` event listener fires when canvas is non-empty and dialog is open

#### EC-6: Large signature base64
- [ ] BUG: Spec says JPEG compression 0.8 and 400x200px max canvas size, but canvas width is dynamic/responsive (fills container width). On wide desktop monitors the canvas can exceed 400px width, producing larger base64 than expected (see BUG-1)

### Security Audit Results

- [x] Authentication: All endpoints protected by `JwtAuthGuard` -- cannot access without login
- [x] Authorization: `ensureTicketAccess` checks ticket ownership (assignee or has time entries) or admin role
- [x] Authorization: Unlock endpoint restricted to admin role both in controller (`@Roles(UserRole.ADMIN)`) and service layer
- [x] Input validation (backend): `MaxLength` on signatureData (200KB), signerName (200 chars), refusalReason (1000 chars) -- prevents oversized payloads
- [x] Input validation (backend): Base64 data URL format validated (must start with `data:image/` and contain `;base64,`)
- [ ] BUG: No client-side maxLength on signer name input or refusal textarea (see BUG-4)
- [x] XSS: Signature data rendered via `<img src={base64}>` which is safe; no `dangerouslySetInnerHTML` usage
- [ ] BUG: Base64 data URL validation is loose -- accepts `data:image/svg+xml;base64,...` which could contain SVG with embedded scripts if rendered as SVG (see BUG-5)
- [x] Rate limiting: Not explicitly implemented for this endpoint, but this is consistent with other endpoints in the project (pre-existing gap, not PROJ-7 specific)
- [x] No secrets exposed in browser console or network responses
- [x] Immutability: Completed reports cannot be modified via PATCH; 400 returned

### Cross-Browser Testing (Code Review)

- [x] Chrome: `signature_pad` is well-tested on Chrome; canvas API used correctly
- [x] Firefox: `signature_pad` supports Firefox; no Firefox-specific issues in code
- [x] Safari (iOS): `signature_pad` handles iOS Safari quirks; HiDPI scaling via `devicePixelRatio`

### Responsive Testing (Code Review)

- [x] 375px (Mobile): Dialog uses `sm:max-w-[520px]`; canvas fills container width; layout works
- [x] 768px (Tablet): Good fit for signature capture use case
- [x] 1440px (Desktop): Canvas stretches full dialog width -- functional but see BUG-1

### Bugs Found

#### BUG-1: Canvas width not capped at 400px on wide screens
- **Severity:** Low
- **Steps to Reproduce:**
  1. Open a ticket with a draft service report on a 1440px+ wide screen
  2. Click "Bericht finalisieren"
  3. Observe the signature canvas width fills the dialog (up to ~470px inside the 520px dialog)
  4. Expected: Canvas capped at 400x200px per spec
  5. Actual: Canvas width is determined by container width, which can exceed 400px
- **Impact:** Base64 output may be slightly larger than the ~100KB budget. Functionally not broken, but deviates from spec.
- **Priority:** Nice to have

#### BUG-2: Dialog can be dismissed during submission
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Draw a signature and fill in signer name
  2. Click "Bestaetigen"
  3. While the spinner is showing (submission in progress), press Escape or click the overlay
  4. Expected: Dialog should not be closable while submitting
  5. Actual: `onOpenChange` is not guarded by `isSubmitting` state, so the dialog can be closed mid-request
- **Impact:** The finalize API call continues in the background. If it succeeds, the report becomes completed but the UI may not reflect this until page reload. If the user then re-opens the dialog, they could attempt to finalize again and get a 400 error.
- **File:** `src/components/signature-dialog.tsx`, line 144
- **Priority:** Fix before deployment

#### BUG-3: No retry mechanism in signature dialog after network failure
- **Severity:** Low
- **Steps to Reproduce:**
  1. Draw a signature and fill in signer name
  2. Simulate network failure (browser DevTools offline mode)
  3. Click "Bestaetigen"
  4. Error toast appears, but the dialog remains open with the drawn signature intact
  5. Expected: Explicit retry affordance or at least the button re-enables
  6. Actual: The button does re-enable (isSubmitting resets in `finally` block), so the user CAN retry by clicking again. However, there is no explicit indication that a retry is possible.
- **Impact:** Minor UX confusion. The existing behavior is actually functional -- user can click Bestaetigen again.
- **Priority:** Nice to have (downgraded -- works but UX could be clearer)

#### BUG-4: No client-side maxLength on input fields
- **Severity:** Low
- **Steps to Reproduce:**
  1. Open the signature dialog
  2. Type more than 200 characters in the "Name des Unterzeichners" field
  3. Expected: Input should be limited to 200 characters client-side
  4. Actual: No maxLength attribute on the input; backend enforces limit but user gets no feedback until submission fails
- **Impact:** Backend validation catches this, so no security risk. Poor UX -- user could type a very long name and only learn it is too long after clicking confirm.
- **File:** `src/components/signature-dialog.tsx`, line 171 (Input element) and line 218 (Textarea element)
- **Priority:** Nice to have

#### BUG-5: Backend accepts SVG base64 data URLs
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Craft a PATCH request with `signatureData: "data:image/svg+xml;base64,PHN2ZyB4..."` containing an SVG with embedded JavaScript
  2. Submit to `PATCH /tickets/:id/service-report` with `status: "completed"`
  3. Expected: Only JPEG/PNG accepted
  4. Actual: Backend validation only checks `data:image/` prefix and `;base64,` presence -- any image MIME type is accepted
- **Impact:** The stored SVG base64 would be rendered as an `<img>` tag `src`, which browsers sandbox (no script execution in `<img>` tags). So the XSS risk is mitigated by the rendering context. However, if this data is ever used in a different context (e.g., embedded in a PDF or rendered as raw HTML), it could become exploitable.
- **File:** `backend/src/service-reports/service-reports.service.ts`, lines 147-148
- **Priority:** Fix before deployment (defense in depth -- restrict to `data:image/jpeg` and `data:image/png` only)

#### BUG-6: Validation error persists across tabs
- **Severity:** Low
- **Steps to Reproduce:**
  1. Open signature dialog, stay on "Unterschrift" tab
  2. Click "Bestaetigen" without drawing -- see validation error "Bitte zeichnen Sie eine Unterschrift"
  3. Switch to "Unterschrift verweigert" tab
  4. Switch back to "Unterschrift" tab
  5. Expected: Error message could be cleared when switching tabs for cleaner UX
  6. Actual: The error message persists (it is filtered by `activeTab === "sign"` on display, so it hides on the other tab and re-appears when switching back)
- **Impact:** The validation error only shows on its own tab, so the behavior is functional. However, the `validationError` state is shared between tabs -- setting an error on the "refuse" tab and switching to "sign" hides the refuse error and potentially shows a stale sign error.
- **Priority:** Nice to have

### Regression Testing

#### PROJ-6: On-Site Service Report
- [x] Service report creation still works (no changes to create flow)
- [x] Draft saving still works
- [x] Time entries and materials display unchanged
- [x] Admin unlock flow extended correctly (clears signature fields)

#### PROJ-1: User Authentication
- [x] All endpoints still protected by JwtAuthGuard
- [x] Role-based access unchanged

#### PROJ-3: Ticket Management
- [x] Ticket detail page loads correctly with new signature section

#### PROJ-12: Ticket Material Tracking
- [x] Materials display in service report unaffected

### Summary
- **Acceptance Criteria:** 15/15 passed (all core functionality works)
- **Edge Cases:** 5/6 passed (1 minor deviation on canvas size)
- **Bugs Found:** 6 total (0 critical, 2 medium, 4 low)
  - Medium: BUG-2 (dialog dismissible during submission), BUG-5 (SVG base64 accepted)
  - Low: BUG-1 (canvas width), BUG-3 (retry UX), BUG-4 (missing maxLength), BUG-6 (validation state)
- **Security:** Generally solid. One defense-in-depth issue (BUG-5) to address.
- **Production Ready:** NO -- fix BUG-2 and BUG-5 first, then re-test.
- **Recommendation:** Fix the 2 medium bugs before deployment. The 4 low-severity bugs can be addressed in a follow-up sprint.

## Deployment
- **Deployed:** 2026-03-29
- **Migration:** 5 new columns added to `service_reports` table (signatureData, signerName, signedAt, signatureRefused, refusalReason)
- **New dependency:** `signature_pad` npm package
- **QA Bugs addressed:** BUG-2 (dialog dismiss guard) and BUG-5 (SVG base64 restriction) fixed before deployment. 4 low-severity bugs deferred to follow-up.
