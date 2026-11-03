# MediTek Hospital Management System - Development Progress

## Project Overview
MediTek is a Hospital Management System featuring a Spring Boot 4 / Java 21 REST API backend, a MySQL schema with Flyway migrations, and a responsive React + Vite + Tailwind CSS frontend.

---

## Progress Log

### Phase 0: Initial Inspection & Repository Configuration
- [x] Inspected project structure: `Backend/` (Spring Boot), `docs/` (Architecture & API contracts), and root configurations.
- [x] Initialized Git tracking across the root repository, resolved nested repository references, and linked official remote `origin` (`https://github.com/sanjanascw13/MediTek.git`).
- [x] Inspected MySQL Flyway schema `V1__init.sql` (14 domains: Persons, Departments, Doctors, Medical Staff, Nurses, Patients, Wards, Beds, Admissions, Appointments, Medical Records, Medicines, Prescriptions, Lab Tests/Reports, Surgeries, Blood Bank, Billing, Users & Roles).
- [x] Fixed compilation error in `Backend/pom.xml` by adding Project Lombok dependency (`1.18.46`). Backend successfully compiles with zero errors (`mvnw test-compile` -> BUILD SUCCESS).

---

### Phase 1: Frontend Application (`Frontend/`)
- [x] Initialized React + Vite application with Tailwind CSS, Lucide Icons, Recharts, Axios, and React Router v6.
- [x] Implemented clinical design system conforming strictly to the reference image:
  - Deep forest green gradient sidebar (`#111912` to `#0d140e`) with electric lime active pills (`#a3e635`).
  - MediTek heartbeat branding logo.
  - Dark glassmorphism Hero Card with real-time stats and dynamic mini bar charts:
    - New Patients (129)
    - Appointments (650)
    - Earnings ($201k)
    - Operations (54)
  - Interactive Patient Chart with custom donut chart and percentage breakdown (Dengue, Malaria, Typhoid, Cold).
  - Appointments timeline with June 2026 scheduling view and attendee avatar event pills.
  - AI Smart Insights panel with clinical triage alerts.
  - Operations monitoring table with patient profile avatars, surgical duration, follow-up dates, and action controls.
- [x] Implemented all 14 hospital management modules:
  - `Dashboard`: Complete reference design implementation.
  - `Appointments`: Booking modal, status filtering (SCHEDULED, COMPLETED, CANCELLED), and calendar search.
  - `Doctors`: Specialist medical officers directory, credentials, licensing, and departmental affiliations.
  - `Staff`: Nurses & clinical staff directory with shift schedules (Morning, Afternoon, Night) and on-duty statuses.
  - `Patients`: Full demographic registration modal, blood group badges, emergency contact records, and search.
  - `Departments`: All 10 schema subtypes (ICU, OPD, ETU, Labs, Pharmacy, Radiology, OR, Maternity, Clinic & Medical Units).
  - `Wards & Beds`: Ward occupancy rate gauges, bed operational states, and atomic patient bed transfer protocol modal.
  - `Pharmacy`: Medicine formulary, stock inventory tracking, unit prices, and prescription dispensing.
  - `Labs`: Clinical pathology requisitions, test lifecycle, and verified doctor laboratory reports.
  - `Surgeries`: Operating theater suite tracking and surgical procedure schedules.
  - `Blood Bank`: ABO/Rh inventory reserves in milliliters with expiration date monitoring.
  - `Billing`: Patient invoices, settled revenue, receivables, and payment reconciliation.
  - `Messages`: Inter-departmental clinical dispatches and nursing handover announcements.
  - `Settings`: RBAC role permission matrix and backend system parameters.
  - `LoginPage`: MediTek branded clinical portal sign-in with mock-mode-only demo role presets.
- [x] Tested production build: `npm run build` completed successfully (`dist/` generated with zero errors).

---

### Phase 2A: Frontend Authentication & API Integration Foundation
- [x] Made mock data opt-in with `VITE_USE_MOCKS=true`; live API/network and credential errors no longer silently return mock data.
- [x] Added consistent API base URL configuration (`VITE_API_BASE_URL`, with compatibility for `VITE_API_URL`) and aligned the default root with current Spring controller paths (`/api`).
- [x] Normalized the existing backend's top-level login response to the frontend session shape and persisted the authenticated user and token.
- [x] Protected application routes, returned unauthenticated users to login, and redirected/cleared the session when the backend responds with `401`.
- [x] Updated frontend setup and integration documentation to reflect the existing API paths and mock-mode behavior.
- [ ] Validate browser-to-backend communication against a running Spring server; no database or migration was executed.

---

### Phase 2B: Existing Frontend-to-Backend Endpoint Integration
- [x] Confirmed current controller routes and DTO property names directly from the read-only backend source.
- [x] Connected appointment creation and status updates to the existing `/api/appointments` endpoints, using backend person IDs and ISO timestamps.
- [x] Connected inpatient admission list, admit, transfer, and discharge workflows to the existing `/api/admissions` endpoints. The UI shows only active admissions and does not infer a bed catalog or availability.
- [x] Added loading, error/retry, empty, and mutation success feedback for dashboard, patients, doctors, departments, appointments, and admissions.
- [x] Removed the dashboard's fixed appointment timeline and fallback operation rows; appointments and available summary data now come from the API, while the UI identifies the backend's baseline metric/chart values as demonstration data.
- [x] Changed unsupported live modules (staff, ward/bed inventory, pharmacy, laboratory, surgeries, blood bank, billing, messages, settings) to display an explicit backend-endpoint-unavailable notice; mock screens remain available only when `VITE_USE_MOCKS=true`.
- [x] Added frontend API service methods only for existing controller routes and documented live endpoint coverage.
- [ ] Verify workflows against a running Spring server; no backend files, migrations, or database were changed.
- [x] Frontend production build succeeded after the batch; Vite reports a generated JavaScript chunk above its 500 kB advisory threshold.

---

### Phase 2C: Backend Readiness Inventory (2026-11-01)
- [x] Inspected the backend Maven manifest, runtime configuration, controller mappings, DTOs, service interfaces/implementations, repositories, entities, and the sole existing test.
- [x] Confirmed current route prefix is `/api` (not the planning contract's `/api/v1`).
- [x] Confirmed the currently implemented controller routes are authentication login; patient list/create/get/delete; doctor list/create/get; department list/create/get/delete; appointment list/create/status update; active admission list/admit/transfer/discharge; and dashboard stats/patient chart.
- [x] Confirmed backend domain entities and repositories exist for most planned hospital entities, but services/controllers/DTOs are absent for Staff, ward/bed inventory, pharmacy, laboratory, surgeries, blood bank, and billing. Messages and Settings lack domain persistence models and backend APIs.
- [x] Confirmed the backend has one existing `@SpringBootTest` context-load test and no focused service/integration tests.
- [ ] Maven compile and tests: pending owner clarification because the existing backend boundary prohibits executing commands in `Backend/`; Maven also writes generated files under `Backend/target`. The existing test starts the full Spring context; any approved run must explicitly override the datasource to in-memory H2 and disable Flyway to avoid touching an external database or executing migrations.
- [ ] Live API integration verification: not run; no running backend was tested.
- [x] Recorded API/service/repository/DTO/workflow gaps in the current implementation checklist (see response for this batch).

### Phase 2D: Authorized Backend Core Workflows
- [x] Required explicit MySQL/JWT environment configuration; enabled Flyway, schema validation, and UTC without connecting to a database.
- [x] Added forward-only V2 role/account migration and environment-driven Super Admin bootstrap; no migration was applied.
- [x] Implemented four-role authentication/authorization, password hashing/change enforcement, temporary credentials, Super Admin Doctor/Staff provisioning, and Staff Patient registration.
- [x] Implemented role-scoped patient/doctor profiles and appointment booking/completion.
- [x] Implemented Ward/Bed inventory endpoints with derived occupancy and operational status; admission, transfer, discharge, row locking, and active-admission rules are covered.
- [x] Wired the frontend Ward/Bed selectors and admission actions to the live `/api/wards`, `/api/beds`, and `/api/admissions` routes without changing demo-mode behavior.
- [x] Maven tests passed using the isolated H2 test profile: 4 tests, 0 failures, 0 errors. The test suite covers registration, role access, account provisioning/login, appointment ownership/completion/status visibility, ward/bed status, and admission lifecycle.
- [ ] MySQL/Flyway validation and live API tests are blocked pending verified datasource settings and `MEDITEK_JWT_SECRET`; no database connection or migration was attempted.
- [ ] Staff-directory UI integration, remaining hospital modules, complete OpenAPI reconciliation, and MySQL concurrency tests remain.

---

### Phase 2: Complete Backend Architecture
- [x] Core authentication/RBAC, account provisioning, patient registration, appointments, and Ward/Bed/admission workflows.
- [x] Implement service/controller/DTO workflows for prescription creation/dispensing and laboratory orders/results.
- [x] Implement service/controller/DTO workflows for surgery scheduling/status and blood-bank batch intake/issues.
- [ ] Implement service/controller/DTO workflows for medical records and billing.
- [ ] Reconcile the `/api` implementation with the planned `/api/v1` contract and complete error/API documentation.
- [ ] Validate Flyway and Hibernate mappings on a disposable MySQL instance; add MySQL concurrency/integration coverage.

---

### Phase 3: Integration, Verification & Git Deployment
- [x] Verified Frontend production build (`npm run build` -> SUCCESS).
- [ ] Stage and commit Phase 1 implementation.
- [ ] Push to `origin/master`.

### Phase 4: Frontend Demo Mode (2026-11-01)
- [x] Enabled mock mode by default for local Vite development through `Frontend/.env.development`; production builds do not load this development-only setting.
- [x] Confirmed the existing Manager and Doctor demo login buttons use mock authentication without contacting the backend and labelled the section as development-only.
- [x] Kept demo API reads and mutations in the in-memory mock store; mock sessions are cleared when switching between mock and live modes.
- [x] Confirmed the dashboard and existing module screens have mock sample data or show an explicit unavailable notice in live mode.
- [x] Refreshed dashboard appointment examples to upcoming dates and documented demo and live-mode startup instructions in `Frontend/README.md`.
- [x] Verified the Frontend production build (`npm run build` -> SUCCESS, with Vite's large-chunk advisory); no backend files, applications, or databases were accessed or changed.

### Phase 5: Role-Based Frontend Demo Login (2026-11-01)
- [x] Added visible Admin, Doctor, Staff, and Patient demo login options with role-specific identities and icons; mock login remains credential-free.
- [x] Added role-aware dashboard views and navigation, including a patient-scoped demo portal for appointments, prescriptions, bills, and records.
- [x] Restricted routes as well as visible navigation and labelled frontend role filtering as a demo convenience, not a security or authorization control.
- [x] Preserved live authentication requests when mock mode is disabled; the patient portal reports its missing live endpoint rather than substituting demo content.
- [x] Verified the Frontend production build (`npm run build` -> SUCCESS, with Vite's large-chunk advisory); Backend remains read-only and was not accessed or executed.

### Phase 6: Admin Demo Account Management (2026-11-01)
- [x] Added Admin-only User Management routing/navigation, Doctor and Staff account forms, account listing, detail editing, and deactivation.
- [x] Added collision-checked unique usernames and cryptographically random, non-reused temporary passwords; account passwords are persisted only as salted PBKDF2 hashes.
- [x] Added one-time credential display/copy after creation and enforced a password change before a new demo account can enter its dashboard.
- [x] Persisted created demo profiles in browser local storage and wired created Doctor/Staff credentials to mock-mode login without backend requests.
- [x] Documented demo account creation, sign-in, persistence, and security limitations in `Frontend/README.md`.
- [x] Browser-verified Doctor and Staff account creation, unique generated usernames, temporary-password login and forced first-login changes, password-hash-only persistence, Admin edit/deactivation, and User Management route denial for Doctor, Staff, and Patient.
- [x] Verified the Frontend production build (`npm run build` -> SUCCESS, with Vite's large-chunk advisory).
- [x] No Backend files were intentionally modified; no Maven command or database migration was intentionally run. A generic VS Code test-runner call unexpectedly launched a Java `contextLoads()` test, and its output did not identify the source root, so whether it executed from `Backend/` cannot be confirmed.

### Phase 7: Dynamic Admission and Account Dropdowns (2026-11-01)
- [x] Added ward and available-bed dropdowns for mock admissions and transfers, using ward-linked bed records and filtering operational status plus active admissions.
- [x] Added service-level validation against current bed availability; bed options refresh on ward/admission changes, so successful admissions remove the bed and discharge releases only operationally available beds.
- [x] Added explicit loading, empty, and error states for ward/bed inventory and disabled live admission/transfer rather than guessing availability; the current frontend API has no live ward/bed catalog.
- [x] Changed Doctor and Staff account forms to select departments from the department service, with Doctor specializations derived from doctors in the chosen department.
- [x] Added configurable Staff designation options (Nurse, Receptionist, Pharmacist, Laboratory Technician, Billing Officer) and selection validation.
- [x] Browser-verified ward filtering, exclusion of active beds, successful demo admission, discharge, and the bed becoming selectable again.
- [x] Browser-verified department-filtered Doctor specializations and all five Staff designation options.
- [x] Frontend production build passed (`vite build`); Vite reported only the existing advisory that the main bundle exceeds 500 kB.
- [x] No Backend files were accessed, modified, or executed.

### Phase 8: Four-Role E2E and Live-Mode Smoke Tests (2026-11-01)
- [x] Browser-tested Super Admin creation of Doctor and Staff accounts; both generated credentials logged in, completed first-login password changes, and persisted in their role directories after reload.
- [x] Staff registered a Patient; the generated account logged in after changing its temporary password. The Patient profile/account survived reload.
- [x] Verified Patient appointment booking, assignment to the created Doctor, Doctor completion, and Patient status visibility. The appointment was absent after a full reload, confirming appointments are in-memory demo data.
- [x] Verified Staff admission, bed occupancy, discharge, and return of the bed to the available choices.
- [x] Verified role menus and direct-route restrictions: Patient `/settings`, Staff `/billing`, and Doctor `/user-management` redirected to the dashboard.
- [x] Exercised Department search and demo actions in Pharmacy, Laboratory, Surgeries, Blood Bank, Billing, Messages, and Settings. Settings notification preference persisted after reload.
- [x] In isolated live mode, verified explicit unavailable notices for Staff, Pharmacy, Laboratory, Surgeries, Blood Bank, Billing, Messages, Settings, and Patient portal. API calls were blocked at a local placeholder endpoint; zero requests were made. Live backend behavior was not tested.
- [x] Demo accounts/password hashes, registered Patient profiles, and the Settings preference persist in local storage. Appointments and other module actions (admissions, inventory, lab results, surgery schedules, invoices/payment status, and messages) are session-memory-only and reset on reload.
- [x] Recorded minor follow-up: Patient registration labels are not consistently associated with inputs; animated button transitions occasionally required keyboard/DOM click fallbacks during browser automation. Neither blocked the workflows.
- [x] Backend remained strictly untouched; no Maven, Spring Boot, or database operations were run.
- [x] Final `npm.cmd run build` passed from `Frontend/` (13.44s; largest lazy-loaded chunk 370.91 kB). `git diff --check -- Frontend docs/DEVELOPMENT_PROGRESS.md` passed; only Git's existing LF-to-CRLF notices were emitted.

### Phase 9: Pharmacy and Laboratory Backend
- [x] Added additive V3 schema for medicine stock, dispensed prescription quantities, report result classification, immutable dispensing history, and a readable-ID counter. V3 has not been applied to any database.
- [x] Implemented medicine search, role-scoped prescription/history reads, Doctor/Super Admin prescription creation, and transactional Staff/Super Admin dispensing with locked prescription-item and medicine rows, remaining-quantity/stock checks, stock decrement, and audit history.
- [x] Implemented role-scoped laboratory order listing/filtering, Doctor/Super Admin ordering, pending-order cancellation, report publication/retrieval, reviewer validation, and atomic report/status updates.
- [x] Connected Pharmacy and Laboratory live screens to implemented endpoints while preserving demo-mode workflows; unrelated unsupported modules remain explicitly unavailable in live mode.
- [x] Added isolated H2 workflow tests for pharmacy dispensing/history, insufficient stock and prescribed quantity, invalid quantity, role restrictions, lab ordering/filtering, report status/retrieval/privacy, duplicate reports, and invalid/cancelled transitions.
- [x] `Backend\\mvnw.cmd test` passed with a process-only ephemeral JWT secret and isolated H2: 7 tests, 0 failures, 0 errors.
- [x] `Frontend\\npm.cmd run build` passed (Vite production build).
- [ ] V3 migration execution, MySQL schema validation/locking, and frontend-to-running-backend testing remain blocked pending verified external datasource and JWT configuration. No MySQL connection, Spring Boot launch, or Flyway migration was run.
- [ ] Live inventory receiving/restocking is not implemented. V3 initializes legacy medicine stock to zero; an approved stock-loading workflow is required before live pharmacy dispensing can operate against populated inventory.

### Phase 10: Surgery and Blood Bank
- [x] Added forward-only V4 changes to persist surgery type/duration, permit the planned IN_PROGRESS state, retain per-batch blood component and depleted-volume tracking, and record blood issues with RESTRICT-linked history.
- [x] Implemented role-scoped surgery schedules/history, theater listing, Doctor/Super Admin scheduling, serialized theater overlap checks using duration, and validated SCHEDULED → IN_PROGRESS → COMPLETED or SCHEDULED → CANCELLED transitions.
- [x] Implemented bank configuration, blood-batch receipt/filtering, transactional volume issue, expiry/quantity/exact recorded-group validation, and role-scoped issue history.
- [x] Connected Surgery and Blood Bank live screens to implemented endpoints while preserving demo workflows.
- [x] Added isolated H2 tests for scheduling, overlap, lifecycle, patient privacy, permissions, inventory intake, component filtering, successful/insufficient/expired/mismatched blood issue, and bank configuration access.
- [x] Full Maven test suite passed with isolated H2 and a process-only ephemeral JWT secret: 10 tests, 0 failures, 0 errors. The three surgery/blood-bank tests passed separately as well.
- [x] Frontend production build passed (`npm.cmd run build`).
- [x] `git diff --check` passed; only Git's existing LF-to-CRLF notices were emitted.
- [ ] V4 migration execution/MySQL validation and live backend workflow testing remain unverified; no live datasource, Spring Boot application, or Flyway migration was used. Screening/crossmatching and operating-room clinical/resource readiness are not implemented.

### Phase 11: Billing and Medical Records (2026-11-01)
- [x] Preserved the existing `Bill` and `MedicalRecord` models; added V5 billing columns, line-item/payment tables, payment idempotency, readable ID counters, and a labelled legacy-balance line for existing invoices.
- [x] Implemented invoice search and role-scoped reads, invoice creation for registered patients, item add/update/remove before payment, rounded subtotal/tax/total calculations, transactional partial/full payment recording, duplicate-request rejection, payment history, and outstanding balances.
- [x] Implemented patient-scoped medical-record reads and append-only Doctor/Staff note creation, author and optional appointment/admission links, Doctor-assigned appointment enforcement, and patient/Doctor privacy checks.
- [x] Connected Billing and Medical Records frontend workflows to the implemented live endpoints while keeping demo workflows and explicit demo/live boundaries.
- [x] Added four isolated H2 workflow tests covering invoice calculations and line management, partial/full/duplicate/excessive payments, invoice and record privacy, invalid requests, role restrictions, and record authorship/history.
- [x] Full `Backend\\mvnw.cmd test` passed using the isolated H2 test profile and process-only ephemeral JWT secret: 14 tests, 0 failures, 0 errors.
- [x] `Frontend\\npm.cmd run build` passed.
- [x] `git diff --check` passed; only existing Git LF-to-CRLF notices were emitted.
- [ ] V5 application against MySQL, migration/schema validation, and live frontend/backend testing remain unverified. No MySQL connection, real Flyway migration, or Spring Boot launch against an unverified datasource was performed.
- [ ] Legacy invoice line-item descriptions and pre-V5 payment events are unrecoverable; legacy invoices retain totals through a clearly labelled imported balance line. Payment entries remain accounting records only, without gateway/card handling. Medical records continue to store a single immutable content field; separate diagnosis/treatment fields and amendment workflows are not modeled.

### Phase 12: Project Integration and Consistency Review (2026-11-01)
- [x] Reviewed backend domain, DTO, repository, service, controller, security, exception, configuration, migration, and test layers; frontend API adapters, route/role guards, pages, and current integration documentation.
- [x] Aligned the OpenAPI server base and endpoint paths with `/api`; removed planned-only patient-specific/history and Tier 2 routes; documented actual dashboard, account management, ward/bed, admission, and status routes.
- [x] Corrected OpenAPI response/request shapes for authentication, patient provisioning, appointments, admissions, and error responses; documented route limitations and current status handling.
- [x] Reconciled the security role matrix and authentication/CORS guidance with current controller annotations, service ownership checks, JWT claims, environment configuration, and Super Admin bootstrap.
- [x] Confirmed live API request failures propagate to the UI and do not fall back to demo data; role-scoped reads are enforced in backend services for Patients, appointments, prescriptions, lab tests, surgery schedules, blood issues, billing, and medical records.
- [x] Confirmed transaction/locking or database uniqueness protections for business ID counters, active admissions, dispensing, laboratory reports/status changes, blood issuing, invoice payments, and surgery theater scheduling. H2 tests passed; MySQL locking/schema behavior remains unverified.
- [x] Full `Backend\\mvnw.cmd test` with the isolated H2 profile and a process-only ephemeral JWT secret: 14 tests, 0 failures, 0 errors.
- [x] `Frontend\\npm.cmd run build` passed. `git diff --check` passed with only Git line-ending notices.
- [ ] Flyway V1-V5 MySQL compatibility/upgrade behavior, real runtime DTO/schema validation, and browser-to-live-backend workflows remain unverified. No MySQL, real migration, or unverified datasource was used.

### Phase 13: Backend Exception Handling Hardening (2026-11-01)
- [x] Separated missing-resource errors from invalid arguments: resource lookup failures return 404 and invalid/malformed request values return 400.
- [x] Kept business-state and integrity conflicts at 409; authentication and authorization errors return 401/403 with the standard JSON error structure. Unexpected errors remain sanitized 500 responses.
- [x] Added focused exception-handler tests and verified unauthenticated API requests return structured 401 responses.
- [x] Full `Backend\\mvnw.cmd test` with isolated H2 and a process-only ephemeral JWT secret: 18 tests, 0 failures, 0 errors.
- [x] `git diff --check` passed. No frontend code changed; the frontend build was not rerun.
- [ ] MySQL connectivity/migration behavior and live frontend/backend integration remain unverified; no MySQL connection or real migration was performed.

### Phase 14: Live Account, Appointment, and Staff Integration (2026-11-01)
- [x] Connected Super Admin Doctor/Staff provisioning to the existing endpoints; display backend-generated temporary credentials only from the creation response, and refresh account lists after changes.
- [x] Connected patient appointment requests to the authenticated patient workflow and active Doctor directory; Doctor appointment reads/completion use the existing scoped endpoints.
- [x] Connected Staff directory reads and supported Super Admin activation/deactivation; profile editing remains unavailable because the API has no update endpoint.
- [x] Limited inactive Doctor visibility to Super Admin so existing deactivated accounts can be reactivated; added H2 coverage for role visibility and status authorization.
- [x] Focused `BackendCoreWorkflowTests` on isolated H2: 3 tests, 0 failures, 0 errors. JWT signing secret was process-only.
- [x] `Frontend\npm.cmd run build` passed; `git diff --check` passed.

---

### Phase 15: Live MySQL Full Integration, AI Insights Removal & Role-Specific Live Dashboard (2026-11-02)
- [x] Verified Windows User scope environment variables: `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`, `MEDITEK_JWT_SECRET`.
- [x] Verified local MySQL 8.0 server connectivity on port 3306 as `meditek_user` targeting `meditek_db`.
- [x] Verified Flyway migration history: V1–V5 applied successfully with zero pending migrations.
- [x] Completely removed AI Insights:
  - Deleted `Frontend/src/components/dashboard/AISmartInsights.jsx`.
  - Reorganized `Frontend/src/pages/DashboardPage.jsx` middle grid to 5-col Donut Chart and 7-col Appointments Timeline.
  - Removed demonstration data warning banners and dead references.
- [x] Deferred Pharmacy and Surgery per project decisions without touching schema, tables, or existing implementations.
- [x] Fully eliminated static/hardcoded dashboard numbers (129, 650, 54, $201,450.00, Dengue/Malaria/Typhoid chart) in `DashboardServiceImpl`:
  - Metrics are 100% database-backed via JPQL aggregate queries.
  - Patient chart groups live patients by `bloodGroup` with real counts and percentages.
  - Deferred operations metric returns `null` and displays as `N/A`.
- [x] Implemented role-specific dashboard behavior:
  - `SUPER_ADMIN`: Hospital-wide metrics (total patients, appointments, revenue, admissions, bed occupancy, doctor/staff counts, unexpired blood units).
  - `DOCTOR`: Assigned appointments, distinct patients under care, active inpatients, pending lab tests; confidential financials isolated.
  - `STAFF`: Registered patients, scheduled appointments, active admissions, bed availability, pending labs, blood units; financials isolated.
  - `PATIENT`: Own appointments, outstanding balance, total paid, medical records count; strictly isolated from all confidential hospital-wide data.
- [x] Executed end-to-end live MySQL integration test suite against running Spring Boot instance on port 8080:
  - Total Tests: 49
  - PASS: 47
  - FAIL: 0
  - BLOCKED: 2 (Pharmacy medicine addition & Surgery theater creation - deferred)
  - NOT IMPLEMENTED: 0
- [x] Direct SQL ground-truth comparison verified:
  - `patients`: API = 8, MySQL = 8
  - `appointments`: API = 7, MySQL = 7
  - `revenue`: API = $1,050.00, MySQL = $1,050.00
- [x] H2 unit test suite verified: `BackendCoreWorkflowTests` passed (3 tests, 0 failures, 0 errors).
- [x] Frontend production build (`Frontend\npm.cmd run build`) completed successfully with zero errors.

