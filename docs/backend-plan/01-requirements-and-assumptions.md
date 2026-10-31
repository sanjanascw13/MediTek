# MediTek — 01. Requirements and Assumptions

## 1. Project Purpose and Implementation Boundaries
- Build a **React** frontend for the MediTek Hospital Information Management System. Backend will be manually implemented in **Spring Boot 3+** (Java 21, MySQL) by the student team.
- The backend directory `d:\Project\Backend` is **strictly read‑only** for the AI assistant. No files will be created, edited, or executed there.
- All planning artifacts reside in `d:\Project\docs\backend-plan\`.

## 2. Functional Requirements by Module
### 2.1 Person & User Management (Core Inheritance)
- **FR-01 (Person Base Entity):** `personId`, `name`, `dateOfBirth`, `gender`, `phoneNumber`, `email`.
- **FR-02 (Patient Management):** `patientId` (unique business code), `bloodGroup`, `address`, `emergencyContact`. Self‑registration assigns the `PATIENT` role.
- **FR-03 (Doctor Management):** `doctorId`, `specialization`, `licenseNumber`.
- **FR-04 (Medical Staff & Nurses):** `staffId`, `role`, `departmentName`; nurses have a `shift` (Morning, Evening, Night).
- **FR-05 (User Authentication & Accounts):** `username`, `email`, `passwordHash` (BCrypt), roles `ADMIN`, `DOCTOR`, `STAFF`, `PATIENT`.

### 2.2 Department & Facility Hierarchy
- **FR-06 (Department Base Entity):** `departmentId`, `departmentName`, `location`.
- **FR-07 (Ten Department Subclasses):**
  1. `EmergencyTheaterUnit (ETU)` – `emergencyLevel`.
  2. `ICU (Intensive Care Unit)` – `bedCapacity`.
  3. `OPD (Outpatient Department)` – `consultationRoomCount`.
  4. `Laboratory` – `laboratoryType`.
  5. `Pharmacy` – `pharmacyType`.
  6. `Radiology` – `equipmentName`.
  7. `OperatingTheater` – `theaterNumber`.
  8. `MaternityUnit` – `maternityType`.
  9. `ClinicArea` – `clinicType`.
  10. `MedicalUnit` – `unitType`.

### 2.3 Operations & Clinical Care
- **FR-08 (Appointments):** `appointmentId`, `appointmentDate`, `status` (`SCHEDULED`, `COMPLETED`, `CANCELLED`, `NO_SHOW`).
- **FR-09 (Medical Records):** Clinical diagnoses, treatment plans, and notes linked to a patient and optionally an appointment.
- **FR-10 (Prescriptions & Medicines):** Doctors issue `Prescription` records; prescriptions link to one or more `Medicine` records (`medicineId`, `medicineName`, `category`, `quantity`, `price`). Pharmacy staff dispense medications.
- **FR-11 (Laboratory Tests & Reports):** Doctors request `LabTest`; technicians generate `LabReport` and set test status to `COMPLETED`.
- **FR-12 (Surgeries):** Schedule surgeries in an `OperatingTheater` linking patient and lead surgeon (`Doctor`).

### 2.4 Resources, Inpatient Admissions & Billing
- **FR-13 (Wards & Beds):** Manage wards (`wardId`, `wardName`, `wardType`). Manage beds (`bedId`, `bedNumber`) with `availabilityStatus` values `AVAILABLE`, `MAINTENANCE`, `UNAVAILABLE`. *Invariant:* **Ward is NOT a Department**. **Operational bed state does NOT include `OCCUPIED`; occupancy is derived from active admissions.**
  - `OCCUPIED` is a derived display state determined by an active admission.
  - `MAINTENANCE` and `UNAVAILABLE` are operational restrictions maintained separately.
  - A bed is assignable only if it has no active admission and no operational restriction.
  - `AVAILABLE` is shown only when the bed is unoccupied and has no operational restriction.
  - Discharge and transfer must not erase existing operational restrictions.
- **Bed‑state rule:** If an active admission exists, the displayed bed state is `OCCUPIED`. If no active admission exists, the displayed bed state equals the stored operational state: `AVAILABLE`, `MAINTENANCE`, or `UNAVAILABLE`. A bed is assignable only if no active admission exists and its stored operational state is `AVAILABLE`. Discharge and transfer must never overwrite the stored operational state.
- **FR-14 (Inpatient Admissions):** `Admission` records (`admissionId`, `patient`, `bed`, `doctor`, `admissionDate`, `dischargeDate`, `status` (`ACTIVE`, `DISCHARGED`, `TRANSFERRED`), `reason`).
  - Active admissions (`status = 'ACTIVE'`) are the sole source of truth for bed occupancy.
  - A patient and a bed may each have at most one active admission.
  - **Transfer model:** close‑and‑create – the current admission is closed with `TRANSFERRED` (audit kept) and a new active admission is created for the target bed. The operation must be atomic and rolled back on failure.
- **FR-15 (Blood Bank):** Manage `BloodBank` facilities and `BloodUnit` inventory (`bloodId`, `bloodGroup`, `quantity`, `availabilityStatus`).
- **FR-16 (Billing):** Generate patient invoices (`Bill` `billId`, `amount`, `paymentStatus`, `billDate`) reflecting consultations, admissions, lab tests, and dispensed medications.

## 3. Non‑Functional Requirements
- **NFR-01 (Demonstrability & Simplicity):** Prioritize clear, readable code with student‑friendly comments.
- **NFR-02 (Stateless REST Communication):** JSON over HTTP with standard status codes (`200`, `201`, `204`, `400`, `401`, `403`, `404`, `409`, `422`, `500`).
- **NFR-03 (Authentication & Security):** Stateless JWT Bearer tokens, BCrypt password hashing, frontend UI guards plus backend enforcement.
- **NFR-04 (Data Integrity & Concurrency):** MySQL unique constraints and Spring `@Transactional` (`READ_COMMITTED`) to prevent race conditions in bed allocation and admissions.
- **NFR-05 (Zero Direct Database Access):** Browser never connects directly to MySQL; all access goes through the REST API.

## 4. Scope Categorization: Tier 1 and Tier 2
### Tier 1 (Core Demonstration Modules)

- Authentication & Patient Registration
- Dashboard with dynamic metrics
- Patients Management
- Doctors Management
- Staff & Nurses Management
- Departments (all 10 subclasses)
- Appointments
- Wards & Beds
- Inpatient Admissions (Admit, Transfer, Discharge)
- Medical Records
- Pharmacy & Prescriptions
- Laboratory Tests & Reports
- Surgeries & Operating Theaters
- Blood Bank & Units
- Patient Billing & Invoicing

**Functional Depth:** Full interactive workflows appropriate to each module, including create, read, update, delete, or controlled status transitions as defined by the approved API contract. Clinical records, admissions, billing records, and other audit‑sensitive data must not be assumed to support unrestricted deletion. Search, filtering, modal dialogs, validation, and status‑control requirements are retained.

### Tier 2 (Specialized Department Workflows)

- Radiology (imaging requests & scan report generation)
- Maternity Unit (pregnancy records & delivery logs)
- Emergency Theater Unit (triage cases & emergency transfers)
- Clinic Area (specialty outpatient schedules)
- Medical Unit (inpatient medical care cases)

**Functional Depth:** Structured List/Create operational views demonstrating specialized subtype behaviors, with clearly documented extension points.

## 5. Identifier Conventions and Data Integrity
- **Primary Key:** `personId` is the shared primary key for the Person inheritance hierarchy.
- **Business identifiers:** `patientId`, `doctorId`, `staffId`, `admissionId`, `bedId`, etc., are readable String identifiers (`VARCHAR(64)`).
- **API identifier mapping:** Public API paths and relationship fields use the documented business identifier for the relevant entity (e.g., `patientId`, `doctorId`, `bedId`, `admissionId`). The internal `personId` remains the shared primary key. Every request DTO, response DTO, path parameter, and database foreign key must follow this distinction.
- **Concurrency‑safe ID generation:** All identifiers must be readable String values. The backend must use a concurrency‑safe sequence allocation strategy (database‑backed counter or other synchronized allocator). `SELECT MAX(...)+1` is not sufficient. Unique constraints must remain, and duplicate‑key conflicts must be returned as HTTP 409 without exposing DB internals.
- Identifiers are **not** numeric surrogate keys or UUIDs; they are human‑readable strings used directly in API contracts.
- **Identifier convention:** All entity primary keys and business identifiers use readable String identifiers. `personId` is the shared primary key for the Person inheritance hierarchy. No numeric or UUID-based identifiers are used. Public API business identifiers remain distinct from internal entity‑key mapping.

## 6. Admission and Bed Occupancy Rules
- **Active Admission** (`status = 'ACTIVE'`) is the authoritative source of occupancy.
- **Bed state model:** `OCCUPIED` is a derived display state; `MAINTENANCE` and `UNAVAILABLE` are separate operational restrictions. A bed is assignable only when it has no active admission and no operational restriction. Discharge and transfer release occupancy but must not erase existing maintenance or unavailable restrictions.
- **Bed‑state rule:** If an active admission exists, the displayed bed state is `OCCUPIED`. If no active admission exists, the displayed bed state equals the stored operational state: `AVAILABLE`, `MAINTENANCE`, or `UNAVAILABLE`. A bed is assignable only if no active admission exists and its stored operational state is `AVAILABLE`. Discharge and transfer must never overwrite the stored operational state.
- **Database protection:** Generated columns `active_bed_id` and `active_patient_id` with `UNIQUE` constraints prevent multiple active admissions for the same bed or patient.
- **Transfer model:** close‑and‑create – the current admission is closed with `TRANSFERRED` (audit kept) and a new active admission is created for the target bed. The operation must be atomic and roll back on failure.
- **Authentication & Self‑Registration** (Patient role only).
- **Core modules:** Person/Users, Departments, Appointments, Wards & Beds, Admissions, Medical Records, Pharmacy, Labs, Surgeries, Blood Bank, Billing.
- **Tier 2 extensions (deferred):** Radiology, Maternity, Emergency Theater, Clinic Area, Medical Unit.

## 7. Assumptions and Constraints
1. All entity primary keys and business identifiers use readable String identifiers. `personId` is the shared primary key for the Person inheritance hierarchy. No numeric or UUID-based identifiers are used. Public API business identifiers remain distinct from internal entity‑key mapping.
2. Bed occupancy is derived solely from `Admission` records with status `ACTIVE`.
3. Transfer follows the close‑and‑create model preserving audit trail.
4. Security roles map to Spring authorities: `ADMIN`, `DOCTOR`, `STAFF`, `PATIENT` → `ROLE_ADMIN`, etc.
5. The planning documents represent the *source of truth* for the upcoming backend implementation.

## 8. Unresolved Decisions and Open Questions
1. **Surgical Team Participation:** Add a `SurgicalTeamMember` entity or keep assistants as free‑text notes? *(Recommendation: free‑text notes.)*
2. **Blood Unit Allocation:** For the initial university demonstration, use a simplified allocation workflow without temporary reservation holds unless the team explicitly approves reservations. Define valid status transitions consistently across requirements, database schema, API, and UI. Distinguish dispensing or issuing a unit from marking it as used. Do not introduce a `USED` status unless adopted uniformly throughout the contract.
3. **Billing Automation:** Manual invoice creation with automated fee‑calculation helpers vs. fully automated aggregation? *(Recommendation: manual with helpers.)*
