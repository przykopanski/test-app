# PROJ-1: User Authentication & Role Management

## Status: Deployed
**Created:** 2026-03-26
**Last Updated:** 2026-03-26

## Implementation Notes (Backend)
- NestJS Backend im `backend/` Ordner als separater Service (Port 3001)
- TypeORM mit PostgreSQL direkt (kein Supabase)
- Entities: User, RefreshToken, AuditLog
- Auth-Modul: POST /api/auth/login, /api/auth/refresh, /api/auth/logout
- Users-Modul: GET/POST /api/users, GET/PUT /api/users/:id, POST /api/users/:id/deactivate
- JWT Access Token (15 Min.) + Refresh Token (7 Tage, Rotation)
- bcrypt 12 Rounds, Refresh Token als SHA-256 Hash gespeichert
- RolesGuard + JwtAuthGuard für rollenbasierte Autorisierung
- Audit-Logging für Login, Logout, User-CRUD, Rollenwechsel
- Seed-Script: `npm run seed` erstellt Admin-User (admin@example.com / admin123)
- Frontend auth.ts auf echte API-Calls umgestellt (apiLogin, apiRefresh, apiLogout, apiFetch mit auto-refresh)

## Dependencies
- None

## User Stories
- Als Techniker möchte ich mich mit E-Mail und Passwort einloggen, damit nur ich auf meine Daten zugreifen kann
- Als Admin möchte ich neue Benutzer anlegen und ihnen Rollen zuweisen, damit ich steuern kann, wer was sieht
- Als Admin möchte ich Benutzer deaktivieren, ohne sie zu löschen, damit Historiendaten erhalten bleiben
- Als Office-Mitarbeiter möchte ich nur Tickets und Zeiteinträge sehen, aber keine Systemeinstellungen, damit die Oberfläche für mich nicht überladen ist
- Als Techniker möchte ich angemeldet bleiben (Token-Refresh), damit ich auf dem Tablet nicht ständig neu einloggen muss

## Acceptance Criteria
- [ ] Login-Seite mit E-Mail + Passwort (JWT-basiert)
- [ ] JWT Access Token (15 min) + Refresh Token (7 Tage) werden ausgestellt
- [ ] Drei Rollen vorhanden: `admin`, `technician`, `office`
- [ ] Rollenbasierter Zugriff: API-Endpunkte prüfen Rolle via Guard
- [ ] Admin kann Benutzer erstellen, bearbeiten, deaktivieren
- [ ] Deaktivierte Benutzer können sich nicht einloggen
- [ ] Passwort-Hashing mit bcrypt (min. 12 Rounds)
- [ ] Logout invalidiert Refresh Token serverseitig
- [ ] Benutzerprofilseite zeigt Name, E-Mail, Rolle (nur lesbar für Techniker)

## Edge Cases
- Login mit falschem Passwort: generische Fehlermeldung (kein Hinweis ob E-Mail existiert)
- Abgelaufenes Access Token: automatischer Refresh via Refresh Token
- Abgelaufenes Refresh Token: Weiterleitung zur Login-Seite mit Hinweis
- Deaktivierter Benutzer versucht Refresh: sofortige Ablehnung
- Admin löscht eigenen Account: nicht erlaubt (mind. 1 Admin muss existieren)

## Technical Requirements
- AuthProvider-Interface vorbereiten (für späteren Keycloak-Tausch via PROJ-10)
- Passwörter werden niemals im Klartext gespeichert oder geloggt
- HTTPS wird vom Nginx Proxy Manager erledigt (kein TLS im App-Layer nötig)
- Audit-Log: Login, Logout, Passwortwechsel, Rollenwechsel

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### A) Komponentenstruktur

**Frontend (Next.js):**
```
/login                    — Öffentliche Login-Seite
  +-- LoginForm           — E-Mail + Passwort Felder, Fehleranzeige

/                         — Geschützter Bereich (Weiterleitung zu /login falls nicht angemeldet)
  +-- AuthProvider        — Globaler Kontext: Token-Speicherung, automatischer Refresh
  +-- RoleGuard           — Seitensperre je nach Rolle
  +-- AppNavigation       — Rollenabhängige Navigation (Admin sieht "Benutzer", Techniker nicht)

/profile                  — Profilseite (alle Rollen)
  +-- ProfileCard         — Name, E-Mail, Rolle (nur lesbar für Techniker/Office)
  +-- ChangePasswordForm  — Passwort ändern (für alle Rollen)

/admin/users              — Benutzerverwaltung (nur Admin)
  +-- UserTable           — Liste aller Benutzer mit Status + Rollen-Badge
  +-- CreateUserDialog    — Dialog: E-Mail, Name, Rolle, Initialpasswort
  +-- EditUserDialog      — Dialog: Name, Rolle bearbeiten, Aktiv/Inaktiv-Schalter
```

**Backend (NestJS):**
```
Auth-Modul
  +-- POST /auth/login          — Anmeldedaten prüfen, Tokens zurückgeben
  +-- POST /auth/refresh        — Refresh Token gegen neues Access Token tauschen
  +-- POST /auth/logout         — Refresh Token serverseitig widerrufen

Users-Modul
  +-- GET  /users               — Benutzerliste (nur Admin)
  +-- POST /users               — Benutzer anlegen (nur Admin)
  +-- GET  /users/:id           — Benutzerprofil abrufen
  +-- PUT  /users/:id           — Benutzer bearbeiten (nur Admin)
  +-- POST /users/:id/deactivate — Benutzer deaktivieren (nur Admin)

Guards (global angewendet)
  +-- JwtAuthGuard     — Prüft Access Token bei jeder geschützten Route
  +-- RolesGuard       — Prüft die benötigte Rolle pro Route
```

### B) Datenmodell

**Benutzer (Users)**
| Feld | Beschreibung |
|---|---|
| ID | Eindeutige Kennung (UUID) |
| E-Mail | Einzigartige Login-Adresse |
| Passwort-Hash | bcrypt-gehasht, nie im Klartext gespeichert |
| Vorname, Nachname | Anzeigename |
| Rolle | Eine von: `admin`, `technician`, `office` |
| Aktiv | Ja/Nein — deaktivierte Benutzer können sich nicht anmelden |
| Erstellt am, Aktualisiert am | Zeitstempel |

**Refresh Tokens**
| Feld | Beschreibung |
|---|---|
| ID | Eindeutige Kennung |
| Benutzer-ID | Verweis auf den Benutzer |
| Token-Hash | Als Hash gespeichert, nicht im Klartext |
| Gültig bis | 7 Tage nach Erstellung |
| Widerrufen am | Wird bei Logout gesetzt — Token wird sofort ungültig |

**Audit-Log**
| Feld | Beschreibung |
|---|---|
| Benutzer-ID | Wer hat die Aktion durchgeführt |
| Aktion | `login`, `logout`, `passwort_geändert`, `rolle_geändert`, `benutzer_deaktiviert` |
| Zeitstempel | Wann es passiert ist |
| Metadaten | IP-Adresse, Browser-Info (optional) |

**Gespeichert in:** PostgreSQL (gemeinsame Datenbank, `auth`-Schema)

### C) Technische Entscheidungen

| Entscheidung | Wahl | Warum |
|---|---|---|
| Token-Strategie | JWT Access (15 Min.) + Refresh (7 Tage) | Kurzlebige Access Tokens minimieren das Risiko bei Kompromittierung; Refresh Tokens erlauben Technikern, auf dem Tablet angemeldet zu bleiben |
| Refresh Token Speicherung | Serverseitig in der Datenbank | Ermöglicht echten Logout — ein Refresh Token kann sofort widerrufen werden, auch bei Benutzer-Deaktivierung |
| Passwort-Hashing | bcrypt, 12 Runden | Branchenstandard; 12 Runden bieten gute Balance zwischen Sicherheit und Geschwindigkeit |
| AuthProvider-Interface | Abstraktionsschicht in NestJS | PROJ-10 sieht eine mögliche Keycloak-Migration vor — saubere Schnittstelle ermöglicht den Wechsel ohne den Rest der App anzufassen |
| Routenschutz | Next.js Middleware | Wird vor dem Seitenaufbau ausgeführt, unautorisierte Nutzer sehen nie geschützte Inhalte |
| Rollendurchsetzung | Backend-Guards (nicht nur Frontend) | Rollen-Ausblendung im Frontend ist nur Kosmetik; echte Durchsetzung muss auf der API-Ebene passieren |

### D) Benötigte Pakete

**Frontend (Next.js):**
- `js-cookie` — Sichere Cookie-Verwaltung für Tokens

**Backend (NestJS):**
- `@nestjs/passport` + `passport-jwt` — JWT-Authentifizierungsstrategie
- `@nestjs/jwt` — Token-Erstellung und -Überprüfung
- `bcrypt` — Passwort-Hashing
- `@nestjs/typeorm` + `typeorm` + `pg` — PostgreSQL ORM und Treiber

### E) Ablaufdiagramm (Login → Geschützte Seite)

```
Benutzer gibt E-Mail + Passwort ein
  → POST /auth/login
  → NestJS prüft Anmeldedaten und isActive-Status
  → Antwort: Access Token (15 Min.) + Refresh Token (7 Tage)
  → Frontend speichert Tokens (idealerweise als httpOnly-Cookie)

Benutzer navigiert zu /admin/users
  → Next.js Middleware prüft Token-Vorhandensein
  → API-Aufruf enthält Access Token im Authorization-Header
  → NestJS JwtAuthGuard prüft Token
  → RolesGuard prüft Rolle === 'admin'
  → Antwort zurückgegeben (oder 403 bei falscher Rolle)

Access Token läuft ab
  → Frontend erkennt 401-Antwort
  → Ruft automatisch POST /auth/refresh mit Refresh Token auf
  → Neues Access Token wird ausgestellt, Anfrage wird wiederholt
  → Benutzer bemerkt nichts, kein erneuter Login nötig
```

## QA Test Results (Re-Test #3)

**Tested:** 2026-03-26
**App URL:** http://localhost:3000 (Frontend), http://localhost:3001 (Backend)
**Tester:** QA Engineer (AI)
**Method:** Code review + build verification (both frontend and backend build successfully)
**Previous Tests:** Re-Test #1 (15 bugs), Re-Test #2 (12 remaining). This is Re-Test #3 verifying latest fixes.

### Fixes Verified Since Re-Test #2

| Previous Bug | Status | Verification |
|---|---|---|
| BUG-R1 (EditUserDialog reactivation) | FIXED | `admin/users/page.tsx` line 289 now conditionally includes `isActive` in PUT body: `...(values.isActive !== user.isActive ? { isActive: values.isActive } : {})`. Reactivation will send `isActive: true` when toggled. |
| BUG-R2 (refresh leaks deactivation status) | FIXED | `auth.service.ts` line 68 now throws `'Ungueltiger Refresh Token'` (generic message) for deactivated users, consistent with login endpoint. |
| BUG-R5 (weak JWT_SECRET) | FIXED | `backend/.env` now contains a proper 64-character hex string (`6e533751e...586e`), which is a 256-bit random value. No longer a placeholder. |
| BUG-R6 (synchronize:true hardcoded) | PARTIALLY FIXED | `app.module.ts` now reads `config.get('DB_SYNCHRONIZE', 'false') === 'true'`, defaulting to `false`. However, `backend/.env` still sets `DB_SYNCHRONIZE=true`. The `seed.ts` also has `synchronize: true` hardcoded (acceptable for a one-time seed script). For production, `.env` must be changed. |
| BUG-R12 (cookie secure flag) | FIXED | `auth.controller.ts` now uses `secure: process.env.COOKIE_SECURE === 'true'`, which is explicitly controllable via environment variable rather than tied to `NODE_ENV`. This solves the Nginx Proxy Manager HTTP-backend issue. |

### Acceptance Criteria Status

#### AC-1: Login-Seite mit E-Mail + Passwort (JWT-basiert)
- [x] Login page exists at `/login` with email and password fields
- [x] Uses Zod validation for email format and password presence
- [x] Calls `POST /api/auth/login` and receives JWT tokens as httpOnly cookies
- [x] Uses shadcn/ui components (Card, Input, Button, Form)
- [x] Loading state shown during login
- [x] Error messages displayed on failure
- **PASS**

#### AC-2: JWT Access Token (15 min) + Refresh Token (7 Tage) werden ausgestellt
- [x] Access Token configured with 15m expiration via `JWT_ACCESS_EXPIRATION` env var
- [x] Refresh Token created with 7-day expiry
- [x] Refresh Token rotation implemented (old token revoked, new issued)
- [x] Refresh Token stored as SHA-256 hash in database
- [x] Tokens delivered as httpOnly cookies (access_token: 15min maxAge, refresh_token: 7d maxAge)
- **PASS**

#### AC-3: Drei Rollen vorhanden: admin, technician, office
- [x] `UserRole` enum defines all three roles in `user.entity.ts`
- [x] Default role is `technician`
- [x] Role labels defined in frontend (`ROLE_LABELS`)
- **PASS**

#### AC-4: Rollenbasierter Zugriff: API-Endpunkte pruefen Rolle via Guard
- [x] `JwtAuthGuard` applied to `UsersController` at class level
- [x] `RolesGuard` applied to `UsersController` at class level
- [x] `GET /users` restricted to `admin` role
- [x] `POST /users` restricted to `admin` role
- [x] `PUT /users/:id` restricted to `admin` role
- [x] `POST /users/:id/deactivate` restricted to `admin` role
- [x] `GET /users/:id` allows own profile for any role, admin can view all (ForbiddenException for others)
- [x] `POST /users/me/change-password` available to any authenticated user
- **PASS**

#### AC-5: Admin kann Benutzer erstellen, bearbeiten, deaktivieren
- [x] `CreateUserDialog` component with form for email, name, role, initial password
- [x] `EditUserDialog` component with form for name, role, active toggle
- [x] Deactivation handled via `POST /users/:id/deactivate` endpoint
- [x] Reactivation sends `isActive: true` via PUT when toggle changes (line 289)
- [x] User table shows all users with status badges
- [x] Frontend guarded by `RoleGuard` component (admin only)
- **PASS**

#### AC-6: Deaktivierte Benutzer koennen sich nicht einloggen
- [x] `auth.service.ts` login checks `user.isActive` and throws generic `UnauthorizedException`
- [x] Same error message "Ungueltige Anmeldedaten" for both wrong password and deactivated account
- **PASS**

#### AC-7: Passwort-Hashing mit bcrypt (min. 12 Rounds)
- [x] `BCRYPT_ROUNDS = 12` constant in `users.service.ts`
- [x] Seed script uses `bcrypt.hash('admin123', 12)`
- [x] `sanitize()` method strips `passwordHash` from all API responses
- [x] `changePassword()` method also uses BCRYPT_ROUNDS
- **PASS**

#### AC-8: Logout invalidiert Refresh Token serverseitig
- [x] `POST /auth/logout` protected by `JwtAuthGuard`
- [x] Sets `revokedAt` timestamp on the refresh token record
- [x] Audit log entry created for logout
- [x] Frontend clears cookies via backend `res.clearCookie()`
- **PASS**

#### AC-9: Benutzerprofilseite zeigt Name, E-Mail, Rolle (nur lesbar fuer Techniker)
- [x] Profile page at `/profile` shows firstName, lastName, email, role
- [x] All profile fields are read-only (displayed as text, not inputs)
- [x] Description says "Aenderungen koennen nur durch einen Admin vorgenommen werden"
- [x] Password change form calls real API `POST /users/me/change-password`
- [x] Password form shows error messages from backend and success confirmation
- **PASS**

### Edge Cases Status

#### EC-1: Login mit falschem Passwort: generische Fehlermeldung
- [x] Wrong password returns "Ungueltige Anmeldedaten"
- [x] Deactivated account returns same "Ungueltige Anmeldedaten"
- [x] Non-existent email returns same "Ungueltige Anmeldedaten"
- **PASS**

#### EC-2: Abgelaufenes Access Token: automatischer Refresh via Refresh Token
- [x] `apiFetch` detects 401 response and calls `apiRefresh()`
- [x] On successful refresh, original request is retried with new token
- [ ] BUG: No mutex/lock on refresh -- multiple concurrent 401s can trigger parallel refresh attempts causing race conditions (see BUG-R3)
- **PARTIAL PASS**

#### EC-3: Abgelaufenes Refresh Token: Weiterleitung zur Login-Seite mit Hinweis
- [x] `apiRefresh()` clears stored user on failure
- [x] `AuthProvider` useEffect redirects to `/login` when user becomes null
- [ ] BUG: No visible "session expired" message shown to user after redirect (see BUG-R4)
- **PARTIAL PASS**

#### EC-4: Deaktivierter Benutzer versucht Refresh: sofortige Ablehnung
- [x] `auth.service.ts` refresh method checks `stored.user.isActive`
- [x] If not active, revokes the token and throws `UnauthorizedException`
- [x] Error message is now generic "Ungueltiger Refresh Token" (BUG-R2 fixed)
- **PASS**

#### EC-5: Admin loescht eigenen Account: nicht erlaubt (mind. 1 Admin muss existieren)
- [x] `deactivate` method counts active admins and rejects if `activeAdmins <= 1`
- [x] `update` method also checks admin count before role change away from admin
- [x] `update` method also checks admin count before deactivation via `isActive: false`
- **PASS**

### Security Audit Results

- [x] Authentication: Protected routes require valid JWT via `JwtAuthGuard`
- [x] Token storage: Tokens stored as httpOnly cookies with configurable `secure` flag via `COOKIE_SECURE` env var
- [x] IDOR protection: `GET /users/:id` restricted to own profile or admin role
- [x] Account enumeration: Generic error message for all login failures and refresh failures
- [x] Input validation: class-validator DTOs with whitelist and forbidNonWhitelisted in ValidationPipe
- [x] Password hashing: bcrypt 12 rounds, password hash never returned in API responses
- [x] CORS: Configured to allow only the frontend origin with `credentials: true`
- [x] Rate limiting: ThrottlerModule configured globally (10/60s), login endpoint stricter (5/60s)
- [x] SQL injection: TypeORM parameterized queries prevent SQL injection
- [x] `.gitignore`: `backend/.env` properly excluded from version control
- [x] Last-admin protection: Covers both deactivation and role changes
- [x] JWT_SECRET: Now a proper 256-bit random hex value
- [ ] BUG: `DB_SYNCHRONIZE=true` still set in `.env` file (see BUG-R6-v2)
- [ ] BUG: No security headers configured (see BUG-R7, unchanged)
- [ ] BUG: No Next.js middleware for server-side route protection (see BUG-R8, unchanged)
- [ ] BUG: `auth_user` data still stored in localStorage -- leaks user PII to XSS (see BUG-R9, unchanged)
- [ ] BUG: `POST /auth/refresh` not protected by ThrottlerGuard (see BUG-R13, NEW)
- [ ] BUG: `RefreshDto` is defined but unused -- refresh reads token from cookie, not request body (see BUG-R14, NEW)

### Bugs Found (Remaining + New)

#### BUG-R3: Race condition on concurrent token refresh (UNCHANGED)
- **Severity:** Low
- **Steps to Reproduce:**
  1. Have multiple API calls in-flight when access token expires
  2. All receive 401 simultaneously
  3. All call `apiRefresh()` concurrently
  4. First refresh succeeds and rotates the token; subsequent refreshes fail because the old refresh token cookie was already revoked
  5. Expected: Only one refresh attempt, others wait for the result
  6. Actual: No mutex/lock in `apiFetch` or `apiRefresh` -- each 401 triggers its own independent refresh
- **Priority:** Fix in next sprint

#### BUG-R4: No "session expired" message after token expiry redirect (UNCHANGED)
- **Severity:** Low
- **Steps to Reproduce:**
  1. Be logged in with an expired refresh token
  2. AuthProvider fails to refresh and redirects to `/login`
  3. Expected: Login page shows a message like "Sitzung abgelaufen, bitte erneut anmelden"
  4. Actual: User is redirected to plain login page with no explanation
- **Priority:** Fix in next sprint

#### BUG-R6-v2: DB_SYNCHRONIZE=true still in .env
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Read `backend/.env`: `DB_SYNCHRONIZE=true`
  2. The `app.module.ts` code now correctly reads this env var (fix from Re-Test #2), but the `.env` file still enables synchronize
  3. If this `.env` file is copied to production as-is, TypeORM will auto-modify schema
- **Priority:** Fix before deployment
- **Note:** Change to `DB_SYNCHRONIZE=false` in the `.env` file and use migrations for production. This is a configuration issue, not a code issue.

#### BUG-R7: No security headers configured (UNCHANGED)
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Make any request to the NestJS backend
  2. Check response headers
  3. Expected: X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security, Referrer-Policy
  4. Actual: No security headers set by the app itself
- **Priority:** Fix in next sprint
- **Note:** Consider using `helmet` middleware for NestJS. Some headers may be added by Nginx Proxy Manager, but defense-in-depth is recommended.

#### BUG-R8: No Next.js middleware for server-side route protection (UNCHANGED)
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Navigate directly to a protected URL (e.g., `/admin/users`) while not logged in
  2. Expected: Server-side middleware redirects to `/login` before any page content is rendered
  3. Actual: Page HTML is served, client-side JavaScript checks auth state, then redirects. Brief flash of loading skeleton visible.
- **Priority:** Fix in next sprint
- **Note:** Tech design specifies "Next.js Middleware" for route protection, but no `middleware.ts` file exists.

#### BUG-R9: User profile data stored in localStorage (UNCHANGED)
- **Severity:** Low
- **Steps to Reproduce:**
  1. Login successfully
  2. Open browser DevTools > Application > Local Storage
  3. Observe `auth_user` key contains JSON with id, email, firstName, lastName, role
  4. Expected: No sensitive data in localStorage
  5. Actual: User profile data (PII) is accessible to any XSS payload via localStorage
- **Priority:** Fix in next sprint

#### BUG-R10: EditUserDialog deactivation + update are non-atomic (UNCHANGED)
- **Severity:** Low
- **Steps to Reproduce:**
  1. Edit a user and toggle "Aktiv" switch to off while also changing name/role
  2. Frontend sends `POST /users/:id/deactivate` first, then `PUT /users/:id` second
  3. If the second request fails, user is deactivated but name/role change is lost
  4. No rollback mechanism exists
- **Priority:** Nice to have

#### BUG-R11: Dashboard shows hardcoded user count (UNCHANGED)
- **Severity:** Low
- **Steps to Reproduce:**
  1. Navigate to the dashboard (`/`)
  2. "Benutzer" card shows "4" and "3 aktiv, 1 deaktiviert"
  3. Expected: Dynamic count from API
  4. Actual: Hardcoded values that will always be wrong
- **Priority:** Nice to have (will be replaced by PROJ-5)

#### BUG-R13: Refresh endpoint not protected by ThrottlerGuard (NEW)
- **Severity:** Medium
- **Steps to Reproduce:**
  1. The `POST /auth/refresh` endpoint in `auth.controller.ts` has no `@UseGuards(ThrottlerGuard)` or `@Throttle()` decorator
  2. An attacker with a stolen refresh token cookie could attempt rapid brute-force refresh calls
  3. The global ThrottlerModule may apply (depends on NestJS ThrottlerGuard auto-binding config), but there is no explicit guard on this endpoint unlike the login endpoint
  4. Expected: Rate limiting on refresh endpoint, similar to login
  5. Actual: No explicit rate limiting on refresh endpoint
- **Priority:** Fix in next sprint
- **Note:** The global ThrottlerModule is configured in `app.module.ts` but `ThrottlerGuard` is not set as a global guard via `APP_GUARD`. It is only explicitly applied to the login endpoint. The refresh endpoint should also have rate limiting.

#### BUG-R14: RefreshDto defined but unused (NEW)
- **Severity:** Low
- **Steps to Reproduce:**
  1. File `auth/dto/refresh.dto.ts` defines a `RefreshDto` with `refreshToken` string field
  2. The `refresh()` method in `auth.controller.ts` reads the token from `req.cookies?.refresh_token` instead
  3. The DTO is never imported or used by any controller
- **Priority:** Nice to have (dead code cleanup)

### Cross-Browser Testing
- **Note:** Code review only; no live browser testing performed (requires running PostgreSQL + backend + frontend). Code uses standard HTML/CSS/JS features and shadcn/ui components. Cookie-based auth uses standard `credentials: "include"` which works across all modern browsers. No browser-specific APIs detected.

### Responsive Testing
- Login page: `max-w-sm` card centered with `min-h-svh` -- works on all viewports
- Dashboard: Grid uses `sm:grid-cols-2 lg:grid-cols-4` -- responsive
- Profile: `max-w-2xl` with `sm:grid-cols-2` for name fields -- responsive
- Admin Users: Table may overflow horizontally on 375px mobile (no `overflow-x-auto` wrapper on the outer `rounded-md border` div) -- potential issue but needs live verification
- Sidebar: Uses shadcn `SidebarProvider` with collapsible rail -- handles responsive correctly

### Summary
- **Acceptance Criteria:** 9/9 fully passed
- **Edge Cases:** 3/5 fully passed, 2/5 partial pass (EC-2 race condition, EC-3 no session-expired message)
- **Bugs Fixed Since Re-Test #2:** 5 fixed (BUG-R1, BUG-R2, BUG-R5, BUG-R6 code fix, BUG-R12)
- **Remaining Bugs:** 10 total (0 critical, 0 high, 4 medium, 6 low)
  - Medium: BUG-R6-v2 (env config), BUG-R7, BUG-R8, BUG-R13 (NEW)
  - Low: BUG-R3, BUG-R4, BUG-R9, BUG-R10, BUG-R11, BUG-R14 (NEW)
- **Security:** Strong. All critical and high security issues resolved. JWT secret is now strong. Token storage is secure. Rate limiting is in place for login. Remaining items are defense-in-depth improvements.
- **Production Ready:** YES (conditional) -- The only blocking item is BUG-R6-v2 (change `DB_SYNCHRONIZE=false` in production `.env`). All other remaining bugs are Medium/Low severity improvements that can be addressed post-deployment.

## Deployment

**Deployed:** 2026-03-26
**Environment:** Self-hosted, Docker Compose + Nginx Proxy Manager
**Infrastructure:** PostgreSQL 16, NestJS (port 3001), Next.js (port 3000)

### Pre-Deployment Checklist
- [x] `npm run build` passes (TypeScript clean, all routes generated)
- [x] QA Re-Test #3 complete (0 critical, 0 high bugs)
- [x] BUG-R6-v2 fixed: `DB_SYNCHRONIZE=false` in `backend/.env`
- [x] Security headers added to `next.config.ts` (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy)
- [x] `next.config.ts` uses `output: "standalone"` for optimized Docker image
- [x] `.env.local.example` updated with `NEXT_PUBLIC_API_URL`
- [x] `backend/.env.example` updated with all required vars and comments
- [x] `backend/.env` excluded from version control via `.gitignore`

### Deployment Files Created
| File | Purpose |
|------|---------|
| `docker-compose.yml` | Orchestrates db, backend, frontend services |
| `Dockerfile` | Frontend Next.js standalone image (Node 22 Alpine) |
| `backend/Dockerfile` | Backend NestJS image (Node 22 Alpine) |
| `.dockerignore` | Excludes node_modules, .next, .env from frontend image |
| `backend/.dockerignore` | Excludes node_modules, dist, .env from backend image |
| `.env.production.example` | Template for production environment variables |

### How to Deploy

**First deployment on server:**
```bash
# 1. Clone repo onto server
git clone <repo> && cd <repo>

# 2. Create production env file
cp .env.production.example .env
# → Edit .env: set strong DB_PASSWORD, generate JWT_SECRET with: openssl rand -hex 32

# 3. Run database migrations (after first startup with DB_SYNCHRONIZE=true once)
# Or use seed: docker compose exec backend node dist/seed.js

# 4. Start all services
docker compose up -d --build

# 5. In Nginx Proxy Manager, create two Proxy Hosts:
#    - your-domain.com → frontend container:3000
#    - (or configure /api path to route to backend:3001)
```

**Subsequent deployments:**
```bash
git pull && docker compose up -d --build
```

### Known Issues (post-deployment backlog)
- BUG-R3: Race condition on concurrent token refresh (Low)
- BUG-R4: No "session expired" message on redirect to login (Low)
- BUG-R7: Security headers on NestJS backend (helmet) not yet configured (Medium)
- BUG-R8: No Next.js `middleware.ts` for server-side route protection (Medium)
- BUG-R9: User PII stored in localStorage (Low)
- BUG-R13: Refresh endpoint not explicitly rate-limited (Medium)
