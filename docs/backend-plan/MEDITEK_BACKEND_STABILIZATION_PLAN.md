# MediTek --- Backend and Frontend Reliability Stabilization Plan

**Status:** Proposed \| **Priority:** Critical

## 1. Problem

Users still report that Super Admin cannot reliably create users and
some pages render blank or fail. A successful build or API-only test is
not proof that the real browser workflows work.

## 2. Non-negotiable constraints

-   Work in the existing project; do not recreate/restart it.
-   Preserve all current source changes and the existing `meditek_db`
    database.
-   Never reset, recreate, truncate, clean, or seed the database; do not
    delete existing/test records.
-   Never edit applied Flyway V1--V5 migrations. Add a new migration
    only if genuinely needed.
-   Keep live mode enabled (`VITE_USE_MOCKS=false`); no silent mock/demo
    fallback or fake data.
-   Pharmacy and Surgery are deferred: do not work on them in this
    phase.
-   AI Insights was intentionally removed: do not reintroduce it.
-   Do not commit, push, reset, or force-push Git.
-   Never request or print passwords, JWT secrets, SMTP credentials, or
    other secrets.
-   Use fictional test data only. Keep API prefix `/api`, readable
    business IDs, and existing role mappings.

## 3. Phase A --- Reproduce and collect evidence first

Before editing: - Record Git branch and `git status --short`; preserve
all existing modifications. - Confirm backend and frontend startup;
capture relevant server stack traces. - Reproduce each failure in the
actual browser using the correct role. - Capture browser console errors
and Network requests (method, URL, status, sanitized response). - Record
`VITE_USE_MOCKS` and `VITE_API_BASE_URL` (not secrets). - Inspect Flyway
status and database connectivity read-only.

For each issue record exact steps, role, expected/actual result,
request/response, and console error. Rank root causes by impact. Do not
make speculative broad refactors.

## 4. Phase B --- Fix user creation end to end

Test Super Admin create Doctor and Staff, list/search,
deactivate/reactivate, role assignment, and login.

Trace each request through: 1. Frontend form state and submitted JSON.
2. API method, URL, headers, and authenticated role. 3. Controller DTO
and validation annotations. 4. Service mapping and transaction. 5.
Person/subtype/UserAccount persistence and business ID generation. 6. DB
constraints and foreign keys. 7. Response DTO. 8. Frontend parsing,
state refresh, and success/error rendering.

Check JSON field names, enum values, required/optional fields
(especially optional `departmentId`), phone format, email uniqueness,
password policy, Person shared PK, UserAccount `person_id`
uniqueness/non-null, role/subtype mapping, 401/403 handling,
constraint-to-400/409 mapping, double submits, and list refresh.

Do not weaken backend validation to accommodate a bad frontend form.
Align the frontend with the real backend contract.

## 5. Phase C --- Fix blank/broken pages in the browser

Test Dashboard, Doctors, Appointments, Patients, Staff/User Management,
Departments, Wards/Beds, Admissions, Laboratory, Blood Bank, Billing,
and Medical Records for each permitted role.

For each page test direct URL and navigation; loading, empty, populated,
API-error, and expired-session states. Inspect console and Network tab.
Verify role-specific pages do not call forbidden endpoints. Guard
nullable fields, arrays, dates, and missing optional values. Ensure
genuine empty results are distinct from request failures; do not hide
failures by returning empty arrays. Confirm no mock data appears in live
mode.

Fix root causes, not just symptoms. Ensure loading, empty, and
actionable error states render rather than a blank screen.

## 6. Phase D --- Audit frontend/backend contracts and authorization

Create a page-to-API dependency matrix listing method, exact `/api/...`
path, allowed roles, request/response DTOs, status codes, and
implementation/support status.

Verify frontend service methods match backend routes and verbs. Backend
authorization is authoritative; hiding a button is not security.
Preserve field-level validation errors. Never expose stack traces, SQL,
secrets, or sensitive patient data to the browser. Clearly label
deferred/unsupported modules.

## 7. Phase E --- Regression tests

Add/update tests using the existing test framework: - Backend
service/business-rule tests. - Controller/security tests for role access
and status codes. - Repository/integration tests. - Frontend
form/loading/error/empty-state tests where supported. - Actual
live-browser regression checklist.

At minimum verify: Super Admin login; Doctor creation; Staff creation;
Doctor and Staff login/pages; Patient registration/login/isolation;
appointments; ward/bed/admission; Laboratory; Blood Bank;
Billing/payments; Medical Records. Test invalid inputs and forbidden
access too. Use unique fictional test records; do not delete existing
data.

A test is PASS only if executed and verified. Separate source
inspection, build-only, API-only, browser, and DB reconciliation
results.

## 8. Phase F --- Dashboard correctness

All dashboard values must come from real DB data. Reconcile each metric
with independent read-only SQL: - Patient and appointment
counts/statuses. - Actual successful payments/revenue, not bill
totals. - Active admissions. - Available beds: count beds whose
operational status is AVAILABLE **and** which have no active admission
assigned to that specific bed. Do not blindly subtract all active
admissions from all available beds. - Available, non-expired blood
units. - Pending laboratory tests. - Blood-group distribution.

Use zero/empty state for genuine empty data and N/A/null when a metric
is not meaningful or supported for a role. Never fabricate values.

## 9. Phase G --- Diagnostics and error quality

Use safe structured logs and request/correlation IDs where practical.
Never log credentials, tokens, or sensitive patient data. Return a
consistent sanitized JSON error shape distinguishing validation,
conflict, not-found, authentication, authorization, and unexpected
errors. Preserve field-level errors for frontend display.

## 10. Required completion report

Provide: 1. Reproduced issues and exact root cause for each. 2. Exact
files changed and reason. 3. DB changes (or explicitly "none"). 4. API
routes/roles verified. 5. Browser workflows actually executed and
results. 6. Backend test totals and whether the full Maven suite passed.
7. Frontend test/build result. 8. Remaining console errors and failed
requests. 9. Known limitations/blocked tests. 10. Explicit confirmation
Pharmacy/Surgery untouched, AI Insights not reintroduced, live mode
remained enabled, DB records preserved, and no Git commit/push.

**Done means:** reported user-creation and blank-page issues are
reproducibly fixed in the real browser and core implemented role
workflows pass. A successful build alone is not completion.
