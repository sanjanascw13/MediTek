# MediTek — 03. Relational Database Schema Design

## 1. Schema Strategy & Identifier Conventions

### 1.1 Strict String Identifier Convention

All primary keys and business identifiers are readable strings stored as `VARCHAR(64)`. Examples include `PER-0001`, `PAT-0001`, `DOC-0001`, `DEP-0001`, `WRD-0001`, `BED-0001`, `ADM-0001`, `BIL-0001`, and `APT-0001`.

No auto-increment numeric surrogate keys or UUIDs are introduced.

The Person hierarchy uses `persons.person_id` as the shared primary key inherited by `patients`, `doctors`, and `medical_staff`. Each subtype also has its own unique business identifier (`patient_id`, `doctor_id`, or `staff_id`). These business identifiers are not the foreign-key targets for relationships in this schema: relationships reference the shared `person_id`.

#### Identifier format and future generation strategy

The future Spring Boot backend should generate identifiers using a thread-safe identifier-generation service or custom JPA identifier generator.

- Format: `[PREFIX]-[0-9]{4,6}` (for example, `PAT-0042`, `DOC-0010`, `BED-0105`).
- Mock data and initial seeds may use fixed readable strings.
- Do not implement generation by simply reading `MAX(suffix) + 1` without concurrency protection. Concurrent transactions can otherwise generate the same value.
- A database-backed sequence/counter row per prefix, updated transactionally with locking, is a suitable approach. The final mechanism is a backend implementation decision.

### 1.2 JPA `JOINED` Inheritance

Use `InheritanceType.JOINED` for both the `Person` and `Department` hierarchies.

#### Advantages

1. **Normalization:** shared fields reside in the parent table, while subtype-specific fields reside in their corresponding child tables.
2. **Reduced sparse columns:** subtype-specific fields do not create a large set of nullable columns in one parent table.
3. **Referential integrity:** foreign keys can reference the parent table or, where subtype membership must be enforced, the relevant subtype table.

#### Trade-offs

- Polymorphic queries over all Persons or Departments may require joins across subtype tables.
- Queries targeting a known subtype can join the relevant child table to its parent table.
- Actual query performance depends on indexes, data volume, query plans, and workload. Do not guarantee sub-millisecond execution without measurement.

### 1.3 Database Conventions

- Use InnoDB tables and enforce foreign keys.
- Use `DECIMAL` for monetary values.
- Use `DATE` for date-only values and `DATETIME` for timestamps.
- The application/database timezone policy must be documented before implementation. MySQL `DATETIME` does not itself store timezone information.
- Add indexes to foreign-key columns and frequently filtered columns. `INDEX` in the tables below denotes a required lookup index; primary keys and unique constraints already create indexes.
- Apply explicit `ON DELETE` behavior to every foreign key. Use `RESTRICT` for clinical/financial history unless a documented retention policy permits another behavior.

---

## 2. Table Specifications

### 2.1 Person Hierarchy and Security Tables

#### Table: `persons` (parent table)

| Column | Data type | Nullable | Key / constraint | Description |
|---|---|---:|---|---|
| `person_id` | `VARCHAR(64)` | NO | PRIMARY KEY | Shared Person hierarchy key, e.g. `PER-0001` |
| `name` | `VARCHAR(128)` | NO | INDEX | Full legal name |
| `date_of_birth` | `DATE` | NO | — | Date of birth |
| `gender` | `VARCHAR(16)` | NO | — | `MALE`, `FEMALE`, or `OTHER` |
| `phone_number` | `VARCHAR(32)` | NO | — | Contact telephone number |
| `email` | `VARCHAR(128)` | NO | UNIQUE | Contact email address |

> **Decision to confirm:** A unique, non-null email on `persons` means every person must have an email and no two persons may share one. Confirm this is a valid hospital policy before implementation.

#### Table: `patients` (Person subtype)

| Column | Data type | Nullable | Key / constraint | Description |
|---|---|---:|---|---|
| `person_id` | `VARCHAR(64)` | NO | PRIMARY KEY, FK → `persons.person_id` | Shared Person key; `ON DELETE CASCADE` only if parent deletion is permitted by the retention policy |
| `patient_id` | `VARCHAR(64)` | NO | UNIQUE | Patient business identifier, e.g. `PAT-0001` |
| `blood_group` | `VARCHAR(8)` | NO | — | `A+`, `O+`, `B+`, `AB+`, `A-`, `O-`, `B-`, or `AB-` |
| `address` | `VARCHAR(255)` | NO | — | Residential address |
| `emergency_contact` | `VARCHAR(32)` | NO | — | Emergency telephone number |

#### Table: `doctors` (Person subtype)

| Column | Data type | Nullable | Key / constraint | Description |
|---|---|---:|---|---|
| `person_id` | `VARCHAR(64)` | NO | PRIMARY KEY, FK → `persons.person_id` | Shared Person key |
| `doctor_id` | `VARCHAR(64)` | NO | UNIQUE | Doctor business identifier, e.g. `DOC-0001` |
| `specialization` | `VARCHAR(64)` | NO | INDEX | Medical specialty |
| `license_number` | `VARCHAR(64)` | NO | UNIQUE | Official medical council license number |
| `department_id` | `VARCHAR(64)` | YES | FK → `departments.department_id` | Assigned department, if department assignment is optional |

#### Table: `medical_staff` (Person subtype)

| Column | Data type | Nullable | Key / constraint | Description |
|---|---|---:|---|---|
| `person_id` | `VARCHAR(64)` | NO | PRIMARY KEY, FK → `persons.person_id` | Shared Person key |
| `staff_id` | `VARCHAR(64)` | NO | UNIQUE | Staff business identifier, e.g. `STF-0001` |
| `role` | `VARCHAR(64)` | NO | INDEX | Job role, e.g. Receptionist, Lab Technician, Pharmacist |
| `department_id` | `VARCHAR(64)` | YES | FK → `departments.department_id` | Assigned department, if department assignment is optional |

`department_name` is intentionally not stored in `medical_staff`; it is derivable through `department_id` and would otherwise duplicate department data.

#### Table: `nurses` (subtype of `medical_staff`)

| Column | Data type | Nullable | Key / constraint | Description |
|---|---|---:|---|---|
| `person_id` | `VARCHAR(64)` | NO | PRIMARY KEY, FK → `medical_staff.person_id` | Shared Person key |
| `shift` | `VARCHAR(32)` | NO | — | `MORNING`, `EVENING`, or `NIGHT` |

#### Table: `user_accounts` (technical addition)

| Column | Data type | Nullable | Key / constraint | Description |
|---|---|---:|---|---|
| `user_id` | `VARCHAR(64)` | NO | PRIMARY KEY | Account identifier, e.g. `USR-0001` |
| `username` | `VARCHAR(64)` | NO | UNIQUE | Login username |
| `email` | `VARCHAR(128)` | NO | UNIQUE | Login email |
| `password_hash` | `VARCHAR(255)` | NO | — | BCrypt password hash; never store plaintext passwords |
| `role` | `VARCHAR(32)` | NO | INDEX | System role, e.g. `ADMIN`, `DOCTOR`, `STAFF`, `PATIENT` |
| `person_id` | `VARCHAR(64)` | YES | UNIQUE, FK → `persons.person_id` | Optional linked person; UNIQUE enforces at most one account per person |
| `is_active` | `BOOLEAN` | NO | DEFAULT TRUE | Account active flag |

A nullable unique `person_id` permits multiple unlinked/system accounts while allowing at most one account per linked person. Confirm whether all accounts must be linked to a Person and whether account roles must match the linked Person subtype.

### 2.2 Department Hierarchy Tables

#### Table: `departments` (parent table)

| Column | Data type | Nullable | Key / constraint | Description |
|---|---|---:|---|---|
| `department_id` | `VARCHAR(64)` | NO | PRIMARY KEY | Department identifier, e.g. `DEP-0001` |
| `department_name` | `VARCHAR(128)` | NO | UNIQUE | Department name |
| `location` | `VARCHAR(128)` | NO | — | Building/floor location |

#### Department subtype tables (`JOINED` inheritance)

Each subtype table has `department_id VARCHAR(64) NOT NULL PRIMARY KEY`, referencing `departments(department_id)`.

| Subtype table | Additional column | Data type | Description |
|---|---|---|---|
| `emergency_theater_units` | `emergency_level` | `VARCHAR(32) NOT NULL` | e.g. `Level-1 Trauma` |
| `icus` | `bed_capacity` | `INT NOT NULL` | ICU bed capacity |
| `opds` | `consultation_room_count` | `INT NOT NULL` | Number of consultation rooms |
| `laboratories` | `laboratory_type` | `VARCHAR(64) NOT NULL` | e.g. `Biochemistry` |
| `pharmacies` | `pharmacy_type` | `VARCHAR(64) NOT NULL` | e.g. `Inpatient Dispensing` |
| `radiologies` | `equipment_name` | `VARCHAR(128) NOT NULL` | e.g. `Siemens 3T MRI` |
| `operating_theaters` | `theater_number` | `VARCHAR(32) NOT NULL` | e.g. `OT-01 Suite` |
| `maternity_units` | `maternity_type` | `VARCHAR(64) NOT NULL` | e.g. `Labor & Delivery` |
| `clinic_areas` | `clinic_type` | `VARCHAR(64) NOT NULL` | e.g. `Pediatric Cardiology` |
| `medical_units` | `unit_type` | `VARCHAR(64) NOT NULL` | e.g. `Internal Medicine` |

The model requires each concrete Department to belong to exactly one of these ten subtypes. Ordinary foreign keys do not enforce the “exactly one subtype row” rule across ten tables. Enforce it through a documented application transaction/service rule or database triggers, and include integrity tests.

### 2.3 Wards, Beds, and Admissions

#### Table: `wards`

| Column | Data type | Nullable | Key / constraint | Description |
|---|---|---:|---|---|
| `ward_id` | `VARCHAR(64)` | NO | PRIMARY KEY | Ward identifier, e.g. `WRD-0001` |
| `ward_name` | `VARCHAR(128)` | NO | UNIQUE | Ward name |
| `ward_type` | `VARCHAR(64)` | NO | INDEX | e.g. `GENERAL`, `ICU`, `SURGICAL`, `MATERNITY` |

#### Table: `beds`

| Column | Data type | Nullable | Key / constraint | Description |
|---|---|---:|---|---|
| `bed_id` | `VARCHAR(64)` | NO | PRIMARY KEY | Bed identifier, e.g. `BED-0001` |
| `ward_id` | `VARCHAR(64)` | NO | FK → `wards.ward_id`, INDEX | Owning ward; use `ON DELETE RESTRICT` |
| `bed_number` | `VARCHAR(32)` | NO | — | Room/bed label |
| `operational_status` | `VARCHAR(32)` | NO | INDEX | `AVAILABLE`, `MAINTENANCE`, or `UNAVAILABLE` |

Add `UNIQUE (ward_id, bed_number)` so a bed label cannot be duplicated within the same ward.

**Bed status is deliberately not persisted as `OCCUPIED`.** The stored operational status is restricted to `AVAILABLE`, `MAINTENANCE`, and `UNAVAILABLE`. The displayed status is derived:

1. If an active admission exists for the bed, display `OCCUPIED`.
2. Otherwise, display the stored `operational_status`.
3. A bed is assignable only when it has no active admission and its stored operational status is `AVAILABLE`.
4. Discharge or transfer must not overwrite the stored operational status.

#### Table: `admissions` (technical addition and source of inpatient occupancy)

| Column | Data type | Nullable | Key / constraint | Description |
|---|---|---:|---|---|
| `admission_id` | `VARCHAR(64)` | NO | PRIMARY KEY | Admission identifier, e.g. `ADM-0001` |
| `patient_person_id` | `VARCHAR(64)` | NO | FK → `patients.person_id`, INDEX | Patient's shared Person key |
| `bed_id` | `VARCHAR(64)` | NO | FK → `beds.bed_id`, INDEX | Assigned bed |
| `admitting_doctor_person_id` | `VARCHAR(64)` | NO | FK → `doctors.person_id`, INDEX | Admitting doctor's shared Person key |
| `admission_date` | `DATETIME` | NO | INDEX | Admission timestamp |
| `discharge_date` | `DATETIME` | YES | — | Discharge/transfer timestamp; NULL while active |
| `status` | `VARCHAR(32)` | NO | INDEX | `ACTIVE`, `DISCHARGED`, or `TRANSFERRED` |
| `reason` | `TEXT` | YES | — | Admission diagnosis/reason |
| `transfer_from_admission_id` | `VARCHAR(64)` | YES | FK → `admissions.admission_id`, INDEX | Previous admission when this admission resulted from a transfer |
| `active_bed_id` | `VARCHAR(64)` | YES | GENERATED, UNIQUE | `CASE WHEN status = 'ACTIVE' THEN bed_id ELSE NULL END` |
| `active_patient_person_id` | `VARCHAR(64)` | YES | GENERATED, UNIQUE | `CASE WHEN status = 'ACTIVE' THEN patient_person_id ELSE NULL END` |

The generated columns are intended to be virtual or stored generated columns supported by the chosen MySQL version. Add separate unique indexes to `active_bed_id` and `active_patient_person_id`. MySQL unique indexes allow multiple `NULL` values but reject duplicate non-NULL values. This enforces at most one active admission per bed and at most one active admission per patient.

The generated-column expressions do not replace validation of admission state. Add database/application constraints or transactional service validation so that:

- `status = 'ACTIVE'` requires `discharge_date IS NULL`.
- `status IN ('DISCHARGED', 'TRANSFERRED')` requires `discharge_date IS NOT NULL`.
- `discharge_date` is not earlier than `admission_date`.
- A transfer closes the source admission and creates a new admission linked through `transfer_from_admission_id`.
- The new admission must not reuse an occupied bed.
- Transfer chains must not contain cycles. Whether one admission may have multiple successor admissions remains a domain decision.

The unique generated columns enforce the active-admission limits under concurrent writes at the database level. The application must handle duplicate-key errors as a failed admission/transfer operation.

### 2.4 Clinical Operations and Billing Tables

#### Table: `appointments`

| Column | Data type | Nullable | Key / constraint | Description |
|---|---|---:|---|---|
| `appointment_id` | `VARCHAR(64)` | NO | PRIMARY KEY | Appointment identifier, e.g. `APT-0001` |
| `patient_person_id` | `VARCHAR(64)` | NO | FK → `patients.person_id`, INDEX | Patient |
| `doctor_person_id` | `VARCHAR(64)` | NO | FK → `doctors.person_id`, INDEX | Doctor |
| `appointment_date` | `DATETIME` | NO | INDEX | Scheduled consultation timestamp |
| `status` | `VARCHAR(32)` | NO | INDEX | `SCHEDULED`, `COMPLETED`, `CANCELLED`, `NO_SHOW` |

#### Table: `medical_records`

| Column | Data type | Nullable | Key / constraint | Description |
|---|---|---:|---|---|
| `record_id` | `VARCHAR(64)` | NO | PRIMARY KEY | Record identifier, e.g. `REC-0001` |
| `patient_person_id` | `VARCHAR(64)` | NO | FK → `patients.person_id`, INDEX | Patient |
| `authoring_doctor_person_id` | `VARCHAR(64)` | NO | FK → `doctors.person_id`, INDEX | Authoring doctor |
| `appointment_id` | `VARCHAR(64)` | YES | FK → `appointments.appointment_id`, INDEX | Related appointment, if any |
| `diagnosis` | `TEXT` | NO | — | Clinical diagnosis |
| `treatment` | `TEXT` | NO | — | Treatment plan |
| `record_date` | `DATETIME` | NO | INDEX | Record creation timestamp |

#### Table: `prescriptions`

| Column | Data type | Nullable | Key / constraint | Description |
|---|---|---:|---|---|
| `prescription_id` | `VARCHAR(64)` | NO | PRIMARY KEY | Prescription identifier, e.g. `PRE-0001` |
| `patient_person_id` | `VARCHAR(64)` | NO | FK → `patients.person_id`, INDEX | Patient |
| `doctor_person_id` | `VARCHAR(64)` | NO | FK → `doctors.person_id`, INDEX | Prescribing doctor |
| `prescription_date` | `DATETIME` | NO | INDEX | Issuance timestamp |
| `instructions` | `TEXT` | NO | — | General prescription instructions |

#### Table: `medicines`

| Column | Data type | Nullable | Key / constraint | Description |
|---|---|---:|---|---|
| `medicine_id` | `VARCHAR(64)` | NO | PRIMARY KEY | Medicine identifier, e.g. `MED-0001` |
| `medicine_name` | `VARCHAR(128)` | NO | UNIQUE | Brand/generic medicine name |
| `category` | `VARCHAR(64)` | NO | INDEX | Medicine category |
| `quantity` | `INT` | NO | — | In-stock count; unit of measure must be defined |
| `price` | `DECIMAL(10,2)` | NO | — | Unit price |

#### Table: `prescription_items` (associative table)

| Column | Data type | Nullable | Key / constraint | Description |
|---|---|---:|---|---|
| `prescription_id` | `VARCHAR(64)` | NO | PK component, FK → `prescriptions.prescription_id` | Parent prescription |
| `medicine_id` | `VARCHAR(64)` | NO | PK component, FK → `medicines.medicine_id` | Prescribed medicine |
| `prescribed_quantity` | `INT` | NO | — | Number of units prescribed |

Use composite primary key `(prescription_id, medicine_id)`. This allows a medicine to occur at most once in a prescription. If repeated lines for the same medicine are required, add a readable `prescription_item_id` primary key or a line number and revise the key design. Dosage, frequency, route, and duration are not represented in the current specification and require a scope decision.

#### Table: `lab_tests`

| Column | Data type | Nullable | Key / constraint | Description |
|---|---|---:|---|---|
| `test_id` | `VARCHAR(64)` | NO | PRIMARY KEY | Test identifier, e.g. `TST-0001` |
| `patient_person_id` | `VARCHAR(64)` | NO | FK → `patients.person_id`, INDEX | Patient |
| `ordering_doctor_person_id` | `VARCHAR(64)` | NO | FK → `doctors.person_id`, INDEX | Doctor who ordered the test |
| `test_name` | `VARCHAR(128)` | NO | INDEX | Test name |
| `test_date` | `DATETIME` | NO | INDEX | Order timestamp |
| `result` | `VARCHAR(64)` | YES | — | Summary status, e.g. `PENDING`, `NORMAL`, `ABNORMAL` |

#### Table: `lab_reports`

| Column | Data type | Nullable | Key / constraint | Description |
|---|---|---:|---|---|
| `report_id` | `VARCHAR(64)` | NO | PRIMARY KEY | Report identifier, e.g. `REP-0001` |
| `test_id` | `VARCHAR(64)` | NO | UNIQUE, FK → `lab_tests.test_id` | Test associated with this report; enforces at most one report per test |
| `reviewing_doctor_person_id` | `VARCHAR(64)` | YES | FK → `doctors.person_id`, INDEX | Reviewing doctor, if required by workflow |
| `report_date` | `DATETIME` | NO | INDEX | Report generation timestamp |
| `result_details` | `TEXT` | NO | — | Detailed results and technician notes |

The ordering doctor and reviewing doctor are separate roles. A report may have no reviewing doctor until review is completed, if the workflow permits that.

#### Table: `surgeries`

| Column | Data type | Nullable | Key / constraint | Description |
|---|---|---:|---|---|
| `surgery_id` | `VARCHAR(64)` | NO | PRIMARY KEY | Surgery identifier, e.g. `SRG-0001` |
| `patient_person_id` | `VARCHAR(64)` | NO | FK → `patients.person_id`, INDEX | Patient |
| `lead_surgeon_person_id` | `VARCHAR(64)` | NO | FK → `doctors.person_id`, INDEX | Lead surgeon |
| `operating_theater_department_id` | `VARCHAR(64)` | NO | FK → `operating_theaters.department_id`, INDEX | Must reference an OperatingTheater subtype row, not merely any Department |
| `surgery_date` | `DATETIME` | NO | INDEX | Scheduled surgery timestamp |
| `surgery_type` | `VARCHAR(128)` | NO | — | Procedure type |
| `status` | `VARCHAR(32)` | NO | INDEX | `SCHEDULED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED` |

#### Tables: `blood_banks` and `blood_units`

`blood_banks`:

| Column | Data type | Nullable | Key / constraint | Description |
|---|---|---:|---|---|
| `blood_bank_id` | `VARCHAR(64)` | NO | PRIMARY KEY | Blood bank identifier |
| `location` | `VARCHAR(128)` | NO | — | Physical location |

`blood_units`:

| Column | Data type | Nullable | Key / constraint | Description |
|---|---|---:|---|---|
| `blood_id` | `VARCHAR(64)` | NO | PRIMARY KEY | Identifier for a physical blood unit or inventory lot; confirm intended meaning |
| `blood_bank_id` | `VARCHAR(64)` | NO | FK → `blood_banks.blood_bank_id`, INDEX | Owning blood bank |
| `blood_group` | `VARCHAR(8)` | NO | INDEX | Blood group |
| `quantity` | `INT` | NO | — | Quantity represented by this record; define unit/lot semantics before implementation |
| `availability_status` | `VARCHAR(32)` | NO | INDEX | `AVAILABLE`, `RESERVED`, `DISPENSED`, `EXPIRED` |

> **Decision to confirm:** If each row represents one physical blood unit, `quantity` is likely redundant and should be fixed at one or removed. If each row represents a batch/lot, add the required collection, expiry, component, and traceability fields. Do not implement the table until the intended inventory unit is settled.

#### Table: `bills`

| Column | Data type | Nullable | Key / constraint | Description |
|---|---|---:|---|---|
| `bill_id` | `VARCHAR(64)` | NO | PRIMARY KEY | Bill identifier, e.g. `BIL-0001` |
| `patient_person_id` | `VARCHAR(64)` | NO | FK → `patients.person_id`, INDEX | Billed patient |
| `amount` | `DECIMAL(10,2)` | NO | — | Total billed amount |
| `payment_status` | `VARCHAR(32)` | NO | INDEX | `PAID`, `PENDING`, `PARTIAL`, `CANCELLED` |
| `bill_date` | `DATETIME` | NO | INDEX | Invoice timestamp |
| `description` | `VARCHAR(255)` | YES | — | Summary of billed items |

This is a summary-level billing model. It does not yet define bill line items, payment transactions, refunds, or payment methods.

---

## 3. Referential Integrity and Delete Policy

The foreign keys listed in the table specifications are mandatory relationships unless the column is explicitly nullable.

Recommended baseline:

- Person subtype rows reference `persons` through their shared `person_id`.
- `nurses.person_id` references `medical_staff.person_id`.
- Clinical, admission, surgery, prescription, laboratory, and billing records should generally use `ON DELETE RESTRICT` for referenced patients, doctors, beds, departments, and other historical records.
- `user_accounts.person_id` may be `NULL`; its unique constraint allows at most one account per linked Person.
- `transfer_from_admission_id` references another admission and should use `ON DELETE RESTRICT`.
- `surgeries.operating_theater_department_id` references the subtype table `operating_theaters`, ensuring the selected Department is actually an OperatingTheater.
- Define explicit `ON UPDATE` behavior consistently; identifiers should normally be immutable.

The final SQL migration must declare every foreign key and index explicitly. The table descriptions above are logical specifications, not executable DDL.

---

## 4. Integrity Rules That Need More Than Ordinary Foreign Keys

1. **Person subtype exclusivity:** each Person must belong to exactly one direct subtype (`Patient`, `Doctor`, or `MedicalStaff`); a Nurse must also be a MedicalStaff member. Standard foreign keys do not enforce exactly one subtype row across multiple tables.
2. **Department subtype completeness:** each Department must belong to exactly one of the ten concrete Department subtypes. Enforce and test this rule.
3. **Bed occupancy:** active admissions are the source of truth for occupancy. Generated unique columns enforce at most one active admission per bed and patient.
4. **Admission state consistency:** enforce valid combinations of `status`, `admission_date`, and `discharge_date`.
5. **Transfer integrity:** transfer closes the previous admission and creates a successor admission. Prevent cycles and define whether branching is permitted.
6. **Bed assignment:** a new active admission may use only a bed with no active admission and stored operational status `AVAILABLE`. Perform this check transactionally; retain the unique generated-column constraints as the final concurrency guard.
7. **Ward bed labels:** enforce `UNIQUE (ward_id, bed_number)`.
8. **Account/person relationship:** enforce at most one account per Person with a unique nullable `person_id`; define whether unlinked accounts are permitted.
9. **Operating theater subtype:** surgery must reference `operating_theaters.department_id`, not the generic Department parent.
10. **Prescription line rules:** enforce positive `prescribed_quantity`; define dosage/frequency/duration requirements.
11. **Inventory quantities:** enforce non-negative medicine and blood inventory values. Define units and stock movement/audit requirements.
12. **Monetary values:** enforce non-negative bill amounts unless credits/refunds are explicitly represented.

Some cross-row rules may require transactional application logic, triggers, or a different schema design. The selected enforcement mechanism must be documented and tested.

---

## 5. Mapping Notes

- `Person.personId` maps to `persons.person_id` and is the shared primary key in the Person hierarchy.
- `Patient.patientId`, `Doctor.doctorId`, and `MedicalStaff.staffId` are unique business identifiers stored in their subtype tables. Relationships in this schema reference the shared `person_id`, not those business codes.
- `Department.departmentId` maps to `departments.department_id`; each Department subtype shares that primary key.
- ICU `bed_capacity` and OPD `consultation_room_count` use `INT` because they represent whole-number counts.
- Date-only values use `DATE`; event timestamps use `DATETIME`, subject to the unresolved timezone policy.
- Monetary values use `DECIMAL(10,2)`.
- The `admissions` table is the source of truth for active inpatient occupancy.
- Bed operational status persists only as `AVAILABLE`, `MAINTENANCE`, or `UNAVAILABLE`; `OCCUPIED` is derived.
- `department_name` is not duplicated in `medical_staff`; retrieve it through the Department relationship.
- `lab_tests.ordering_doctor_person_id` and `lab_reports.reviewing_doctor_person_id` represent different responsibilities.
- Surgery references the `operating_theaters` subtype table to ensure subtype correctness.
- Blood inventory semantics remain unresolved and must be decided before implementation.

---

## 6. Open Design Decisions

1. **Department assignment:** Are doctors and medical staff assigned to exactly one department, optionally one department, or multiple departments? The current columns allow zero or one department per doctor/staff member.
2. **Person email policy:** Must every Person have a unique email? If not, should `email` be nullable or should uniqueness be scoped differently?
3. **Person subtype enforcement:** Which mechanism will enforce exactly one direct Person subtype and exactly one Department subtype?
4. **Account policy:** Must every UserAccount link to a Person? Can one Person have multiple accounts? Should the account role be constrained by the Person subtype?
5. **Admission transfers:** Can an admission have multiple successor admissions, or must transfer history be a single linear chain?
6. **Timestamp policy:** Which timezone is authoritative? Should the application use UTC consistently, and should any timestamps use `TIMESTAMP` or `Instant` instead of `DATETIME`?
7. **Medicine inventory:** What is the unit of `quantity` (tablets, packs, bottles, etc.)? Are dosage, frequency, route, and duration required on prescription items?
8. **Blood inventory:** Does one `blood_units` row represent one physical unit or a batch/lot? What collection, component, expiry, reservation, and traceability fields are required?
9. **Laboratory review:** Is a reviewing doctor mandatory before a report is finalized? Can a report be generated before review?
10. **Billing scope:** Is a bill summary sufficient, or are bill line items, payment transactions, refunds, and payment methods required?
11. **Deletion and retention:** What is the hospital's retention policy for persons and clinical/financial history? Confirm before choosing cascading deletes.
12. **Identifier generation:** Confirm the database-backed counter/sequence strategy and whether the numeric suffix is unique per table or per identifier prefix.

---

## 7. Review Status

This document defines the proposed relational schema and key integrity rules. It is a planning specification, not an executable migration.

**Do not begin database implementation until:**

- File 01 requirements and File 02 domain model are approved.
- The open decisions that affect table structure and constraints are resolved.
- The schema is checked against the approved UML/domain model.
- SQL DDL and migration tests are prepared and reviewed.
- The project owner explicitly approves implementation.
