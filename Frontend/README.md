# MediTek Frontend

React, Vite, and Tailwind-based frontend for the MediTek Hospital Management System.

## Run locally

```powershell
npm.cmd install
npm.cmd run dev
```

Vite development mode loads `Frontend/.env.development`, which configures live
API mode (`VITE_USE_MOCKS=false`) at `http://localhost:8080/api`. To explicitly
use offline demo data, create `Frontend/.env.development.local` with
`VITE_USE_MOCKS=true` and restart Vite. Live mode never falls back to demo data
when the backend is unavailable. Override the API root with
`VITE_API_BASE_URL`; the Spring Boot project exposes its controllers beneath
`/api`.

## Demo mode

Run `npm.cmd run dev`, open the Vite URL (usually `http://localhost:5173`), and
select one of **Super Admin**, **Doctor**, **Staff**, or **Patient** under
**Development Demo Access (Mock Mode)**. No backend or real credentials are
required. Each role has a separate demo workspace; Patient shows only the
associated sample patient's appointments, prescriptions, bills, and records.
Staff can register a demo patient and copy the generated patient ID and
temporary password once; the patient must change that password on first login.
The demo Doctor/Staff accounts and registered patient profiles/password hashes
persist in this browser's local storage. Module actions (appointments,
admissions, inventory, messages, invoices, and schedules) are session-only and
reset on reload. Mock authentication sessions are cleared rather than reused
if the app is later started in live mode.

Role-based route and menu visibility is a frontend demo convenience only. It
does not provide authorization or protect data; do not use demo permissions or
sample records as a security boundary or with real patient information.

## Demo account management

Sign in with the **Admin** demo role and open **User Management** in the
sidebar. Create a Doctor or Staff account, generate a unique username and
secure temporary password, then copy the credentials from the one-time
confirmation panel. The new user signs in on the regular login form and must
change the temporary password before continuing. Created account profiles and
salted password hashes persist in this browser's local storage; plaintext
passwords are not stored. Activation, deactivation, and account-detail edits
affect only these local demo records. No demo account data is sent to the
backend.

With `VITE_USE_MOCKS=false`, User Management provisions real Doctor and Staff
accounts through the existing backend endpoints. The server generates the
login username and temporary password; the UI displays these only from the
creation response, and the new user must change the password at first sign-in.
Super Admin can activate/deactivate accounts. Profile editing is not supported
by the current API. Staff directory and patient appointment booking use live
backend data when mock mode is disabled.

These are development-only accounts, not real hospital accounts. The demo
credential store and frontend role restrictions are not suitable for real
authentication, authorization, or patient data.

The production build does not load `.env.development`, so mock mode remains
disabled there unless explicitly enabled in the production environment.

## Dynamic dropdowns

Demo patient admissions use the mock ward and bed records. The bed selector
filters to operationally `AVAILABLE` records without an active admission and
rechecks availability when the ward changes, before admission, and after
admission/discharge/transfer. Doctor and Staff demo-account forms load
departments from the department data service; Doctor specializations are
derived from doctors linked to that department. Staff designation options are
centralized in `STAFF_DESIGNATION_TYPES` in the frontend API service.

Live mode now reads wards, beds, derived occupancy, and available-bed choices
from the backend and enables admission, transfer, and discharge actions. These
live workflows have not been verified against a running backend.

## Role workflows and demo modules

- **Super Admin:** hospital-wide demo dashboard; create, edit, activate, and
  deactivate Doctor/Staff demo accounts. New profiles are included in the
  Doctor/Staff directories and the related selectors.
- **Doctor:** own permitted contact profile, assigned appointment worklist and
  history, and completion of only appointments assigned to that demo profile.
- **Staff:** staff directory, patient registration with one-time demo
  credentials, active admissions, bed availability, admission, and discharge.
- **Patient:** own profile, active-doctor appointment booking, appointment
  history, and patient-scoped prescriptions, bills, and records.

Pharmacy supports demo stock dispensing and live medicine search, prescription
reads, and prescription-linked dispensing. Laboratory supports demo workflows
and live test ordering, cancellation, report publication, and role-scoped report
reads. Surgeries supports demo theater scheduling and live role-scoped
scheduling/history/status transitions. Blood Bank supports demo inventory
intake and live batch-level intake, search, stock issue, and issue history.
Billing supports itemized demo/live invoices, two-decimal subtotal and tax
calculation, pending-invoice line-item management, partial/full payment
entries, payment history, and outstanding balances. Live payment entries are
accounting records only: no money is processed, and card data/payment gateway
integration is not supported. Medical Records provides an append-only clinical
note workflow for Doctors and Staff with patient and optional encounter links;
patients can read only their own records. Doctor-created notes must link to the
Doctor's own appointment. Messages supports local demo notes; Settings stores a
browser-only notification preference and displays integration status. Demo
actions are labelled and never send sample action data to the backend.

The backend exposes Billing and Medical Records endpoints and both modules have
isolated H2 workflow tests. The V5 billing migration has not been applied to
MySQL, and the endpoints have not been tested against a running backend. Existing
invoices are migrated with a labelled legacy-balance line because their original
line-item detail is unavailable; historical payment events cannot be recreated.
Medical Records use the existing single clinical-note content model rather than
separate diagnosis/treatment fields.

The backend's Pharmacy API currently has no medicine receiving/restocking
endpoint. V3 initializes legacy medicine stock to zero, so live dispensing
requires inventory to be populated through an approved operational process
before this module can dispense. Do not treat demo inventory as clinical stock.
Surgery schedule conflicts are checked using the supplied duration and theater
schedule; the backend does not track operating-room clearance, equipment, or
staff availability. Blood issue checks enforce expiry, remaining volume, and
exact match with the patient's recorded blood group, but do not perform donor
screening or clinical crossmatching. Blood inventory intake does not capture
donor identity or screening results.

## End-to-end demo verification (2026-11-01)

The four-role browser test verified Super Admin login and Doctor/Staff account
creation, generated-credential login, and first-login password changes. A
Staff-created Patient account also signed in after its required password
change. The created Doctor and Staff profiles remained in local storage and
appeared in their directories after a reload.

| Workflow | Result |
| --- | --- |
| Patient registration and login | Passed; the registered profile and account survived reload. |
| Patient appointment booking → assigned Doctor worklist → Doctor completion → Patient status | Passed across all three roles. The appointment disappeared after a full reload; appointment actions are session-only. |
| Staff admission → occupied bed → discharge → bed selectable again | Passed. |
| Super Admin creates Doctor and Staff accounts | Passed; generated credentials logged in and the directory entries persisted after reload. |
| Role navigation and direct-route restrictions | Passed for Patient (`/settings`), Staff (`/billing`), and Doctor (`/user-management`); each unauthorized route returned to the dashboard. These frontend checks are not a security boundary. |
| Departments | Passed; directory loaded and search filtered to Cardiology. |
| Pharmacy, Laboratory, Surgeries, Blood Bank, Billing, Messages | Passed demo actions: dispense/stock update, order/result completion, theater scheduling, blood-unit intake, invoice/payment update, and local message. |
| Settings | Passed; notification preference remained set after reload. |
| Live-mode unavailable states (Phase 8 snapshot) | At that earlier verification, Staff, Pharmacy, Laboratory, Surgeries, Blood Bank, Billing, Messages, Settings, and Patient portal displayed explicit limitations; the smoke test made zero API requests. Later batches added live APIs for Pharmacy, Laboratory, Surgery, Blood Bank, Billing, and patient-scoped portal reads; these have H2 coverage but still need live-backend verification. |

Demo accounts/password hashes and registered Patient profiles persist in this
browser. The notification preference also persists. Appointments, admissions,
inventory changes, laboratory results, surgery schedules, bills/payment
changes, and messages use the in-memory demo store and reset on reload; the
appointment loss was directly verified. Demo mode is not a durable record
store.

Minor follow-up: the Patient registration form has labels that are not
consistently associated with their inputs. Browser automation also needed
keyboard/DOM click fallbacks for buttons with transitions. These did not block
the workflows. Live API integration and live Wards/Bed behavior remain
unverified; the backend currently requires explicit external datasource and
JWT configuration.

## Authentication

Successful login responses are stored in browser `localStorage` as
`meditek_token` and `meditek_user`. Protected application routes redirect
unauthenticated users to `/login`; a `401 Unauthorized` response clears the
stored session and returns the browser to the login page.
Live API requests and authentication remain enabled when `VITE_USE_MOCKS` is
false; request failures do not silently switch to demo data.

## Build

```powershell
npm.cmd run build
```

## Integration status

The API client currently integrates with authentication, patients, doctors,
departments, appointments, admissions, ward/bed inventory, dashboard data,
Pharmacy medicine search/prescription reads/dispensing/history, Laboratory test
orders/reports/cancellation, Surgery theater/schedule/lifecycle workflows, and
Blood Bank bank/batch/issue workflows, itemized Billing/payment history, and
role-scoped Medical Records. Messages, Settings, and profile updates remain
unavailable in live mode. User Management connects Super-Admin account
creation and activation/deactivation to the existing Doctor and Staff
endpoints; account profile editing is unsupported. Patient appointment booking
uses the authenticated patient identity and active Doctor directory, while
Doctor worklists and completion use backend-assigned appointments. Live mode
never falls back to demo data. The OpenAPI contract
and backend/frontend use the `/api` route prefix. These integrations have not
been verified against the running backend in this task. The project owner
reports V1-V5 applied and startup/schema validation successful; this task did
not independently verify MySQL. The dashboard endpoints currently return
baseline/demo metrics, not verified live aggregates. Backend invalid requests
return `400`, missing resources return `404`, and business conflicts return
`409` using the documented error shape. Do not treat demo-mode data as
clinical or production data.
