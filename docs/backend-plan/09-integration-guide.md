# MediTek — 09. Frontend to Backend Integration Guide

## 1. Integration Architecture Overview

The frontend API client in `Frontend/src/services/api.js` supports live API mode
and an explicitly enabled in-memory demo mode:

```mermaid
graph TD
    UI[React Page / Component] --> Svc[Shared API Service]
    Svc --> Check{Check VITE_USE_MOCKS}
    Check -->|true| MockAdapter[In-memory demo data]
    Check -->|false| HttpAdapter[Axios HTTP client]
    HttpAdapter --> HttpClient[Shared HttpClient: Bearer Token, 401 Interceptor]
    HttpClient --> LiveBackend[(Spring Boot REST API: http://localhost:8080/api)]
```

Mock data is used only when `VITE_USE_MOCKS=true`. Live API failures are surfaced
to the caller and do not silently fall back to demo data. The OpenAPI contract
and frontend default now use the actual controller prefix `/api` (there is no
`/api/v1` prefix in the current backend).

---

## 2. Environment Configuration

The frontend controls its communication mode through Vite environment variables located in `Frontend/.env`:

### 2.1 Switching from Mock Mode to Live Backend
When your team is ready to test against the Spring Boot backend:

```env
# Optional. Mock mode is off unless explicitly enabled.
VITE_USE_MOCKS=false

# The current backend controller prefix is /api.
VITE_API_BASE_URL=http://localhost:8080/api
```

Restart the Vite development server after changing environment variables.

### 2.2 Backend runtime requirements

Spring Boot does not load `Frontend/.env`. Configure these variables in the
Windows environment inherited by the process that starts the backend:

| Variable | Required | Notes |
|---|---|---|
| `SPRING_DATASOURCE_URL` | Yes | JDBC URL for the existing MySQL `meditek_db`; do not point live mode at the H2 test database. |
| `SPRING_DATASOURCE_USERNAME` | Yes | MySQL account with the required application and Flyway permissions. |
| `SPRING_DATASOURCE_PASSWORD` | Yes | Supply through the environment; never put the value in source, command history, or logs. |
| `MEDITEK_JWT_SECRET` | Yes | Stable signing secret with at least 32 UTF-8 bytes. Do not generate a new value at each startup. |
| `MEDITEK_JWT_EXPIRATION_MS` | No | Token lifetime in milliseconds; defaults to `86400000`. |
| `MEDITEK_BCRYPT_STRENGTH` | No | BCrypt cost from 10 through 14; defaults to `12`. |
| `MEDITEK_CORS_ALLOWED_ORIGINS` | No | Comma-separated origins; defaults to the local Vite origins. |
| `MEDITEK_BOOTSTRAP_SUPER_ADMIN_USERNAME` | Initial setup only | Set with the password below only when no administrator account already exists. |
| `MEDITEK_BOOTSTRAP_SUPER_ADMIN_PASSWORD` | Initial setup only | Securely supply the initial password; it is hashed before persistence. Do not store or print it. |

The bootstrap variables are optional as a pair. The bootstrapper does not
create a second administrator when an administrator role already exists.
For Windows user or machine environment changes, start a new terminal or
restart VS Code so the backend process inherits them. Verify configuration
presence without printing variable values. Missing datasource or JWT
configuration must stop startup; there is no generated-secret or mock-data
fallback in live mode.

The `test` profile uses an isolated in-memory H2 database and disables Flyway.
It validates application workflows, not MySQL connectivity, migration
compatibility, or production schema state.

### 2.3 Implemented Backend Endpoint Inventory

This is the backend route inventory, not a claim that every route is wired to a
frontend screen:

| Backend module | Implemented controller routes |
|---|---|
| Dashboard | `GET /dashboard/stats`, `GET /dashboard/patient-chart` (baseline/demo metrics) |
| Authentication | `POST /auth/login`, `POST /auth/register`, `POST /auth/change-password` |
| Patients | `GET/POST /patients`, `GET /patients/{id}`, `GET /patients/me`, `DELETE /patients/{id}` |
| Doctors | `GET/POST /doctors`, `GET /doctors/{id}`, `PATCH /doctors/{id}/status?active=...` |
| Staff | `GET/POST /staff`, `GET /staff/{id}`, `PATCH /staff/{id}/status?active=...` |
| Departments | `GET/POST /departments`, `GET /departments/{id}`, `DELETE /departments/{id}` |
| Appointments | `GET/POST /appointments`, `PATCH /appointments/{id}/status?status=...` |
| Wards and beds | `GET/POST /wards`, `GET/POST /beds`, `PATCH /beds/{id}/status` |
| Inpatient admissions | `GET /admissions/active`, `POST /admissions`, `POST /admissions/transfer`, `POST /admissions/{id}/discharge` |
| Pharmacy | `GET /medicines?search=...`, `GET/POST /prescriptions`, `POST /prescriptions/{id}/dispensations`, `GET /dispensations` |
| Laboratory | `GET/POST /lab-tests`, `PATCH /lab-tests/{id}/status` (cancel pending order), `POST/GET /lab-tests/{id}/report` |
| Surgeries | `GET /operating-theaters`, `GET/POST /surgeries`, `PATCH /surgeries/{id}/status` |
| Blood bank | `GET/POST /blood-bank/banks`, `GET/POST /blood-bank/units`, `GET/POST /blood-bank/issues` |
| Billing | `GET /bills`, `POST /bills`, `POST/PUT/DELETE /bills/{billId}/items`, `POST /bills/{billId}/payments`, `GET /patients/me/bills` |
| Medical records | `GET/POST /medical-records`, `GET /patients/me/medical-records` |

This route inventory reflects controller mappings, including endpoints that
the current frontend does not consume. There is no generic Tier 2 workflow
endpoint, no patient-specific admission or appointment route, and no
`/patients/{id}/history` endpoint. Patient appointment reads are scoped through
`GET /appointments`; active admissions are currently exposed through the
staff/Doctor `/admissions/active` endpoint.

The live frontend's Super Admin User Management screen posts Doctor and Staff
creation DTOs to `/doctors` and `/staff`. The backend generates usernames and
one-time temporary passwords and requires password change at first sign-in;
the frontend keeps the credential response only in component state. Account
activation is supported through the existing status PATCH routes, while
profile editing is not exposed because no update endpoint exists. Super Admin
doctor listings include inactive profiles for reactivation; other roles see
active Doctors only. Staff listings include the `isActive` status field.

Patient appointment booking loads active Doctors from `GET /doctors` and posts
only the selected Doctor, requested time, and notes. The backend determines
the Patient identity from the authenticated account and scopes Patient and
Doctor appointment history to their own records. Doctor completion is
restricted server-side to the Doctor assigned to the appointment. These
frontend workflows have not been verified against a running backend.

The frontend connects Pharmacy medicine search, role-scoped prescription and
dispensation reads, and staff dispensing; dispensing is prescription-linked
and the backend updates stock and history in one transaction. The frontend
connects Laboratory test listing/ordering, cancellation, and result publication
and retrieval. Patient and Doctor reads are scoped by the backend. Prescription
creation is available through the backend endpoint but is not yet surfaced in a
frontend prescribing workflow. The backend has no medicine receiving/restocking
endpoint; V3 initializes legacy stock to zero, so inventory must be loaded
through an approved operational process before live dispensing is usable.

The frontend Staff directory reads backend staff profiles and the Super Admin
can activate or deactivate accounts using the supported status endpoint;
neither Staff nor Doctor profile editing is implemented by the API. Ward/Bed
screens connect to the existing endpoints. Surgery screens connect to
search/list, theater listing, scheduling, and lifecycle
updates. Theater overlap checks use caller-supplied duration and serialize on
the theater row. The schema has no clearance, equipment-readiness, staffing, or
resource booking model; these are not verified by scheduling. Blood-bank
screens connect to batch intake, group/component filtering, volume issue, and
issue history. Issue updates are transactional and validate expiry, stock, and
exact equality to the patient's recorded blood group; screening and clinical
crossmatching remain outside this API, and intake does not store donor identity
or screening data. Surgery reads are visible to Super Admin/Staff across
patients, Doctors for their own procedures, and Patients for their own records;
only Doctors/Super Admin schedule, while Staff/Super Admin and assigned Doctors
advance status. Blood inventory reads are limited to Doctor/Staff/Super Admin;
Staff/Super Admin receive or issue batches and configure banks (bank creation
is Super Admin-only); Patients can read only their own issue history. Other
Billing supports patient-scoped invoice reads, Staff/Super Admin invoice
creation, line-item changes before payment begins, percentage tax calculation,
and transactional partial/full payment entries with outstanding-balance and
idempotency checks. Payment methods are limited to CASH, BANK_TRANSFER, and
OTHER; the API does not accept card details or call a payment gateway.
Patients can read only their own bills. Medical records reuse the existing
single-content, patient/appointment/admission/author model: Doctors can create
notes only for their own patient appointments, Staff can create notes, and
Patients can read only their own history. Doctor reads are restricted to
records associated with patients in their care; Staff/Super Admin have
operational reads. Records are append-only; corrections require a new entry.
Messages and Settings remain unavailable in live mode. Pharmacy, Laboratory,
Surgery, Blood Bank, Billing, and Medical Records have isolated H2 tests but
have not been verified against a running server.

Migration V5 is forward-only and adds bill subtotals/tax/paid amounts,
line-item and payment history tables, the PARTIAL status, and readable ID
counters. Existing invoices receive a clearly labelled legacy-balance line;
their original itemization and historical payment events cannot be reconstructed.
The project owner reports that V1-V5 were applied to `meditek_db` and backend
startup/schema validation succeeded. This integration work did not connect to
that database, run Flyway, or independently verify the live environment.

The existing dashboard routes are callable, but the current dashboard service
returns baseline fallback metrics and fixed patient-category chart values.
The frontend marks these figures as demonstration data in live mode; they are
not yet proof of real-time hospital aggregates.

---

## 3. Authentication & JWT Token Flow

### 3.1 Token Storage & Injection
1. Upon successful login (`POST /api/auth/login`), the current backend returns token and user fields at the top level:
   ```json
   {
     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
     "username": "<configured-account>",
     "role": "SUPER_ADMIN",
     "personId": null,
     "name": "<configured-account>",
     "passwordChangeRequired": false
   }
   ```
2. The frontend stores the token and normalized user profile in browser `localStorage` under `meditek_token` and `meditek_user`.
   The current response also includes `passwordChangeRequired`; legacy `ADMIN`
   accounts are normalized to `SUPER_ADMIN`. Newly provisioned accounts are
   required to change their temporary password before using other API routes.
3. The shared Axios request interceptor reads `meditek_token` and attaches it to subsequent HTTP requests:
   ```http
   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
4. If the backend returns `401 Unauthorized`, the client clears the stored session and redirects the user to `/login`.

---

## 4. Error Handling and Status Code Expectations

The frontend services expect standardized HTTP status codes matching `04-api-contract.yaml`:

| Status Code | Meaning | Frontend Behavior |
| :--- | :--- | :--- |
| **`200 OK`** | Request succeeded | Updates view, renders data table or details. |
| **`201 Created`** | New entity created | Closes modal, renders success toast notification, refetches list. |
| **`204 No Content`** | Action completed without body | Closes modal, renders success toast. |
| **`400 Bad Request`** | Invalid, malformed, or Bean-validation failure | Bean validation includes `fieldErrors`; other invalid requests return a safe message. |
| **`401 Unauthorized`** | Missing/expired token or invalid credentials | Returns the standard JSON error shape; clients clear authentication state and route to `/login`. |
| **`403 Forbidden`** | Role unauthorized / unassigned doctor | Returns the standard JSON error shape; route-level friendly handling remains frontend follow-up. |
| **`404 Not Found`** | Resource missing | Explicit resource-not-found exceptions return 404; renders `NotFound` or empty state. |
| **`409 Conflict`** | Concurrency or state collision | Renders a high-visibility warning toast (e.g., *"Bed is currently occupied"* or *"Patient already admitted"*). |
| **`500 Internal Error`**| Unexpected server failure | Displays a request error; friendly production error handling remains follow-up. |

Invalid arguments and request-binding failures return `400`; missing resources
use a dedicated exception and return `404`. Business-state conflicts and
database integrity conflicts return `409`. Error bodies use `timestamp`,
`status`, `error`, `message`, and `path`; validation errors additionally include
`fieldErrors`. Unexpected server errors return a generic message without
exposing internal exception details.

---

## 5. Pagination & Data Envelope Expectations

The current `/api` list endpoints return bare arrays and are not paginated.
The envelope below is a possible future pagination shape, not the current
`/api` response shape consumed by the frontend.

When pagination is implemented for lists such as patients or appointments,
the planned response shape is:

```json
{
  "content": [
    {
      "patientId": "PAT-0001",
      "name": "John Doe",
      "phoneNumber": "0771234567"
    }
  ],
  "page": 0,
  "size": 10,
  "totalElements": 42,
  "totalPages": 5,
  "last": false
}
```

Pagination UI and server-side paging remain future work.

---

## 6. Live Backend Conformance Checklist for Team Members

Before declaring integration complete, execute the remaining verification
after configuring a verified disposable MySQL database and JWT secret:

- [ ] **Environment and migrations:** Configure datasource and JWT settings explicitly, validate V1–V5 against a disposable MySQL instance, and verify Hibernate schema validation.
- [ ] **Live frontend:** Exercise login, registration, appointments, and admission flows from the browser against the configured backend.
- [ ] **Role workflows:** Verify Super Admin provisioning, Staff registration, Patient booking, assigned Doctor completion, and Patient status visibility through the live frontend.
- [ ] **Ward/Bed lifecycle:** Verify status-filtered availability, occupied-bed status rejection, transfer, discharge, and operational-status preservation on MySQL.
- [ ] **Concurrency:** Attempt simultaneous admission/transfer against the same patient or bed; verify one active admission per patient/bed with production MySQL locking.
- [ ] **Billing/medical records:** Run the implemented invoice, payment, patient-privacy, and clinical-note workflows through a live server; confirm V5 migration behavior against the approved disposable MySQL datasource.

The current Maven suite uses an isolated H2 database. The latest full-suite test
count and result are recorded in `DEVELOPMENT_PROGRESS.md`.
This is not evidence that migrations, locking, or runtime mappings work on
MySQL. V3, V4, and V5 have not been applied. Do not start the application or run Flyway
until required configuration is present and the database target is confirmed.
