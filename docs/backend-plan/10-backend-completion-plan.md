# MediTek Backend Assessment and Completion Plan

## Status and safety boundaries

This plan reflects a source-only assessment of the current backend and the
approved workflows supplied by the project owner. The backend has not been
connected to MySQL. Do not run Flyway or application startup until a database
URL, driver, username, and password are explicitly configured through
environment variables and the target database is confirmed. Never reset,
drop, or recreate an existing database.

The assessment below is the original baseline. The implementation status after
the authorized work is recorded under [Current implementation status](#current-implementation-status).

The approved roles are `SUPER_ADMIN`, `DOCTOR`, `STAFF`, and `PATIENT`.
Existing committed planning artifacts contain an older `ADMIN` role and
historical read-only instructions; the current project-owner authorization
supersedes those instructions. Preserve `ADMIN` values in existing databases
through forward-only compatibility migrations.

## Existing implementation assessment

### Domain and persistence

- `Person` uses JPA `JOINED` inheritance with `Patient`, `Doctor`, and
  `MedicalStaff`; `Nurse` extends `MedicalStaff`.
- `Department` is the only implemented Department type. The ten planned
  concrete department subclasses are absent.
- Additional JPA entities exist for `Role`, `UserAccount`, `Appointment`,
  `Admission`, `Ward`, `Bed`, `MedicalRecord`, `Medicine`, `Prescription`,
  `PrescriptionItem`, `LabTest`, `LabReport`, `OperatingTheater`, `Surgery`,
  `BloodBank`, `BloodUnit`, and `Bill`.
- Spring Data repositories exist for these core entities, including
  `id_counters` support in the V1 SQL migration, but no counter repository or
  identifier service currently uses it.
- The V1 Flyway SQL describes the broader schema, foreign-key `RESTRICT`
  policies, readable IDs, UTC timestamps, and generated unique keys for active
  admissions. Runtime Flyway dependencies/configuration are missing.

### Services, controllers, and APIs

Controllers exist for authentication login, patients, doctors, departments,
appointments, admissions, and dashboard. Matching service implementations
exist for these areas. Admission transfer uses close-and-create, but service
checks do not lock rows or verify one active admission per patient; admission
lookup filters all rows in memory.

There is no Staff controller/service, account provisioning API, public
patient-registration endpoint, patient self-service API, ward/bed inventory
API, or controller/service for the other clinical/resource entities.
Dashboard methods currently return hard-coded baseline/chart values.

The API uses `/api`, while the OpenAPI contract uses `/api/v1`. Existing
frontend integration uses `/api`; maintain it while documenting and testing
any future versioned aliases. Current DTOs expose internal `personId` fields
where the contract asks for business IDs such as `patientId` and `doctorId`.
List endpoints return bare arrays rather than the contract's paginated
envelope. The frontend auth client accepts the current top-level login
response.

### Security and configuration

- JWT parsing/issuance and BCrypt exist, but the JWT secret has a source-code
  fallback and bootstrap code creates default accounts with hard-coded
  passwords.
- The filter chain permits all GET requests and dashboard endpoints without
  authentication, and does not apply endpoint-specific role restrictions.
- CORS currently accepts arbitrary origins with credentials.
- Account lookup does not reject disabled accounts at login.
- Patient creation does not create an account. Doctor creation likewise does
  not create an account. Staff account creation is absent.
- `application.properties` defaults to an in-memory H2 database and uses
  Hibernate `ddl-auto=update`; MySQL configuration is not required and
  Flyway is not enabled.
- Several DTOs have only partial bean validation. Error responses do not
  consistently match the OpenAPI error schema and the generic handler risks
  exposing internal exception messages.

### Build and tests

The only existing test is a Spring application-context smoke test. The first
backend compile attempt found compile errors in Patient/Doctor services:
`Person` has no `isActive` property although those services call
`setIsActive`/`getIsActive`. Maven reached compilation; no application or
database was started.

## Reusable work

Keep the current JPA entities, repositories, service/controller interfaces,
V1 relational design, BCrypt encoder, JWT library, and close-and-create
admission model where they conform. Use `id_counters` for concurrency-safe
human-readable IDs. Preserve the frontend's current `/api` route prefix and
top-level login response while adding contract fields compatibly.

## Implementation batches and dependencies

| Batch | Work | Dependencies |
|---|---|---|
| 1. Runtime foundation | Require MySQL connection and JWT secret from environment; add Flyway and MySQL driver support; disable schema auto-update; UTC; define an isolated H2 test profile. | None |
| 2. Authentication/RBAC | Remove default plaintext-password bootstrap; support `SUPER_ADMIN`; secure every API route; constrain roles and patient/doctor data access; add configurable one-time initial Super Admin provisioning without source credentials. | Batch 1; forward role/account migration |
| 3. Account workflows | Patient self-registration and Staff registration with linked Patient login; Super Admin Doctor/Staff account provisioning; status/activation management; generated credentials returned only at creation. | Batch 2; ID allocator |
| 4. Core clinical workflows | Appointment ownership, active-doctor booking and completion; patient-scoped views; ward/bed catalog and status; locked admission, transfer, discharge. | Batches 1–3; migration constraints |
| 5. Remaining modules | Medical records, prescriptions/pharmacy, laboratory, surgery, blood bank, billing, and Tier 2 workflows; replace dashboard placeholders with persisted aggregates. | Batches 1–4; endpoint-specific DTOs |
| 6. Contract and operations | Align response/error envelopes and OpenAPI paths; add operational configuration, API docs, and real-MySQL concurrency/integration verification. | Batches 1–5 |

### Database migration requirements

Never edit an already-applied migration. Preserve V1 and add forward-only
migrations for:

1. `SUPER_ADMIN` role compatibility while retaining existing `ADMIN` data.
2. Safe initial-account provisioning support if nullable/unlinked admin
   accounts are used; otherwise define an approved administrator Person subtype
   first.
3. Any missing account flags, status/audit columns, indexes, or constraints
   discovered by comparing JPA mappings with the V1 schema.
4. Domain changes required by account provisioning, patient/doctor active
   status, and module APIs.

Migration application must be separately authorized after environment and
target-database verification. Run migration validation against a disposable
test database, never against an unknown existing database.

## Required verification

- Compile and unit-test with Maven without requiring MySQL.
- Use an explicit ephemeral H2 test profile for service/controller tests; do
  not treat H2 as evidence of MySQL concurrency semantics.
- Verify public registration cannot assign privileged roles; reject invalid
  credentials and disabled accounts; verify role-level 401/403 behavior.
- Verify Super Admin Doctor/Staff provisioning and Staff Patient registration
  persist BCrypt hashes only and return temporary credentials only once.
- Verify a Patient cannot access another Patient's records and a Doctor can
  complete only their assigned appointments.
- Verify bed assignment, one active admission per patient/bed, atomic
  close-and-create transfer, discharge, and preservation of bed operational
  status.
- Run concurrent admission/transfer integration tests on MySQL or Testcontainers
  before claiming database-level race safety.
- Test the frontend against a deliberately configured local backend only after
  safe database setup; demo mode must remain unaffected.

## Current implementation status

- Runtime foundation, required environment-backed MySQL/JWT configuration,
  Flyway dependency/configuration, UTC settings, and isolated H2 test profile
  are implemented. The application refuses to use a guessed datasource or JWT
  key.
- Authentication, four-role authorization, Super Admin bootstrap, temporary
  account credentials, password-change enforcement, Patient self-registration,
  Staff Patient registration, and Super Admin Doctor/Staff provisioning are
  implemented and exercised by MockMvc tests.
- Patient/Doctor profile scoping, appointment booking and assigned-Doctor
  completion, ward/bed inventory, derived occupancy, operational status,
  admission, transfer, and discharge are implemented and covered by tests.
- V2 is a forward-only additive migration for the Super Admin role/account
  changes; it has not been applied to any database.
- `mvnw.cmd test` passed against the isolated H2 profile: 4 tests, 0 failures,
  0 errors. This does not verify MySQL migrations, MySQL-specific behavior, or
  concurrency under production database isolation.
- The frontend is wired to live ward/bed inventory and admission endpoints,
  while preserving mock mode. No live frontend/backend workflow was tested.
- MySQL URL/username/password and `MEDITEK_JWT_SECRET` are not configured in
  the environment. No MySQL connection, Flyway execution, or Spring Boot
  application startup was attempted.
- Remaining work includes the other hospital modules, staff-directory and
  broader frontend live integration, OpenAPI `/api/v1` reconciliation, MySQL
  migration validation and concurrency tests, and live API workflow testing.
