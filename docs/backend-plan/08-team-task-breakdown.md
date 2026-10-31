# MediTek — 08. Student Team Task Breakdown and Build Plan

## 1. Team Allocation and Ownership Matrix

This document outlines the division of responsibilities among the four university team members based on the project proposal (Page 15).

```
+--------------------------------------------------------------------------------------------------+
| Student 1 (242120)       | Student 2 (242036)       | Student 3 (242194)       | Student 4 (242212)       |
| Patient & OPD            | Doctors, Staff & Depts   | Pharmacy, Lab & Resources| Backend Lead & Security  |
| - Patient Entity & DTOs  | - Doctor & Staff Entities| - Medicine & Prescription| - Spring Security & JWT  |
| - Appointment Scheduling | - Nurse Entity & Shifts  | - Lab Tests & Reports    | - Database Migrations    |
| - Outpatient Records     | - 10 Department Subtypes | - Ward & Bed Inventory   | - Admission Concurrency  |
| - Patient Self-Register  | - Polymorphic Services   | - Blood Bank & Units     | - Invoicing & Billing    |
+--------------------------------------------------------------------------------------------------+
```

---

## 2. Detailed Member Responsibilities & Deliverables

### 2.1 Student 1 (242120): Patient Management & OPD Module
- **Domain Entities & JPA:** `Patient` (extending `Person`), `Appointment`, `MedicalRecord`.
- **Key Services to Implement:**
  - `PatientService`: Register patient, update demographics, search patients, get patient history.
  - `AppointmentService`: Schedule consultation, cancel appointment, filter by doctor and date.
  - `MedicalRecordService`: Author diagnosis and treatment notes for a patient.
- **REST Endpoints Owned:**
  - `GET/POST /api/v1/patients`
  - `GET /api/v1/patients/me`, `GET /api/v1/patients/me/appointments`, `GET /api/v1/patients/me/medical-records`
  - `GET /api/v1/patients/{id}`, `GET /api/v1/patients/{id}/history`
  - `GET/POST /api/v1/appointments`
  - `GET/POST /api/v1/medical-records`
- **Definition of Done:** All patient CRUD operations work; doctor assigned-patient rule is enforced on medical history; patients can view only their own records.

---

### 2.2 Student 2 (242036): Doctors, Medical Staff & Department Hierarchy
- **Domain Entities & JPA:** `Doctor`, `MedicalStaff`, `Nurse`, `Department`, and all 10 department subclasses (`EmergencyTheaterUnit`, `ICU`, `OPD`, `Laboratory`, `Pharmacy`, `Radiology`, `OperatingTheater`, `MaternityUnit`, `ClinicArea`, `MedicalUnit`).
- **Key Services to Implement:**
  - `DoctorService`: Manage doctor profiles, specializations, and departmental assignments.
  - `StaffService`: Manage medical staff and nurse shifts.
  - `DepartmentService`: Implement polymorphic `runDailyDepartmentService(departmentId)` calling each subtype's `manageService()`.
  - `Tier2Service`: Basic CRUD and status logging for Radiology, Maternity, ETU, Clinic, and Medical Unit workflows.
- **REST Endpoints Owned:**
  - `GET /api/v1/doctors`
  - `GET/POST /api/v1/staff`
  - `GET /api/v1/departments`, `GET /api/v1/departments/{id}`
  - `GET/POST /api/v1/tier2/{workflowType}`
- **Definition of Done:** `InheritanceType.JOINED` mapped properly for `Department`; dynamic dispatch verified for all 10 departments; staff profiles link to departments.

---

### 2.3 Student 3 (242194): Pharmacy, Laboratory & Medical Resources
- **Domain Entities & JPA:** `Medicine`, `Prescription`, `PrescriptionItem`, `LabTest`, `LabReport`, `Ward`, `Bed`, `BloodBank`, `BloodUnit`.
- **Key Services to Implement:**
  - `PharmacyService`: Manage medicine inventory, dispense medications, prevent negative quantities.
  - `PrescriptionService`: Issue prescriptions linking multiple medicines.
  - `LaboratoryService`: Order lab tests, record results, generate and link `LabReport`.
  - `WardBedService`: Manage wards, beds, and manual status changes (`AVAILABLE`, `MAINTENANCE`, `UNAVAILABLE`) with conflict pre-checks.
  - `BloodBankService`: Track blood units by blood group, manage expiration and reservations.
- **REST Endpoints Owned:**
  - `GET/POST /api/v1/medicines`
  - `GET/POST /api/v1/prescriptions`
  - `GET/POST /api/v1/lab-tests`, `POST /api/v1/lab-tests/{id}/report`
  - `GET/POST /api/v1/wards`, `GET /api/v1/beds`, `PATCH /api/v1/beds/{id}/status`
  - `GET/POST /api/v1/blood-bank/units`
- **Definition of Done:** Stock quantities update atomically; lab test status moves to `COMPLETED` upon report publication; beds cannot be set to maintenance while occupied.

---

### 2.4 Student 4 (242212): System Architecture, Security, Admissions & Billing
- **Role:** Technical Lead & Backend Integration Coordinator.
- **Domain Entities & JPA:** `Person` (abstract root), `UserAccount`, `Admission`, `Bill`, `Surgery`.
- **Key Infrastructure to Implement:**
  - **Database & JPA Configuration:** Set up JPA JOINED inheritance roots and MySQL generated column constraints.
  - **Security & Authentication:** Implement Spring Security filter chain, `BCryptPasswordEncoder`, `JwtTokenProvider`, and `AuthController` (`/api/v1/auth/login`, `/api/v1/auth/register`).
  - **Inpatient Admission Concurrency Engine:** Implement `@Transactional` `AdmissionService` with pessimistic locking for `admitPatient()`, `dischargePatient()`, and `transferPatient()` (Close-and-Create model).
  - **Billing Engine:** Implement `BillingService` for calculating inpatient bed days, medication charges, and issuing invoices.
  - **Operating Theater & Surgery:** Implement `SurgeryService` linking theater, lead surgeon, and patient.
- **REST Endpoints Owned:**
  - `POST /api/v1/auth/login`, `POST /api/v1/auth/register`
  - `GET/POST /api/v1/admissions`, `/admissions/{id}/discharge`, `/admissions/{id}/transfer`
  - `GET/POST /api/v1/surgeries`
  - `GET/POST /api/v1/bills`
- **Definition of Done:** Multi-threaded concurrency test for bed allocation passes on MySQL; JWT security secures all private routes; Close-and-Create transfer lifecycle functions correctly; global exception handler returns standardized `ErrorResponse` JSON.

---

## 3. Recommended Spring Boot Package Structure

> [!NOTE]
> This package structure is a design guideline for your team to implement by hand. Do not create these packages yet.

```
com.meditek.hospital/
├── config/
│   ├── SecurityConfig.java
│   ├── WebCorsConfig.java
│   └── JwtConfig.java
├── security/
│   ├── JwtTokenProvider.java
│   ├── JwtAuthenticationFilter.java
│   └── UserDetailsServiceImpl.java
├── model/
│   ├── base/
│   │   ├── Person.java
│   │   └── Department.java
│   ├── person/
│   │   ├── Patient.java
│   │   ├── Doctor.java
│   │   ├── MedicalStaff.java
│   │   └── Nurse.java
│   ├── department/
│   │   ├── EmergencyTheaterUnit.java
│   │   ├── ICU.java
│   │   ├── OPD.java
│   │   ├── Laboratory.java
│   │   └── [Other Department Subclasses]...
│   ├── clinical/
│   │   ├── Appointment.java
│   │   ├── MedicalRecord.java
│   │   ├── Prescription.java
│   │   ├── Medicine.java
│   │   ├── LabTest.java
│   │   ├── LabReport.java
│   │   └── Surgery.java
│   ├── resource/
│   │   ├── Ward.java
│   │   ├── Bed.java
│   │   ├── Admission.java
│   │   ├── BloodBank.java
│   │   └── BloodUnit.java
│   ├── billing/
│   │   └── Bill.java
│   └── user/
│       └── UserAccount.java
├── dto/
│   ├── request/
│   └── response/
├── repository/
├── service/
│   ├── impl/
└── controller/
```

---

## 4. Phased Build Order and Integration Checkpoints

```
[Phase 1: Foundation (Days 1–3)]
Student 4 builds Person root, UserAccount, Security & JWT.
Students 1, 2, 3 agree on DTO schemas matching 04-api-contract.yaml.
        ↓
[Phase 2: Core Entities & JPA (Days 4–7)]
Student 1 implements Patient & Appointments.
Student 2 implements Doctor, Staff, & Department hierarchy.
Student 3 implements Ward, Bed, Medicine, & Blood Unit.
Checkpoint 1: Verify all tables and foreign keys generate correctly in MySQL.
        ↓
[Phase 3: Operations & Business Logic (Days 8–11)]
Student 4 implements Admission concurrency engine & Billing.
Student 1 implements Medical Records.
Student 3 implements Prescriptions & Lab Reports.
Student 2 implements Polymorphic Department Services.
Checkpoint 2: Test Admission concurrency and Close-and-Create transfers with JUnit on MySQL.
        ↓
[Phase 4: API Assembly & Security Lockdown (Days 12–14)]
All members wire controllers to service methods.
Student 4 configures role-based method security (@PreAuthorize).
Checkpoint 3: Execute complete Postman integration test collection.
```

---

## 5. JUnit and Postman Test Plan

### 5.1 Unit & Service Testing (JUnit 5 + Mockito)
- `PersonValidationTest`: Asserts `validateDetails()` accepts valid phone numbers and rejects malformed inputs.
- `DepartmentPolymorphismTest`: Iterates a collection of `Department` instances, invoking `manageService()` and asserting subclass-specific behaviors without casting.
- `BedOccupancyTest`: Asserts bed availability statuses cannot be transitioned to `MAINTENANCE` when an active admission exists.
- `AdmissionConcurrencyTest`: Launches concurrent threads on MySQL to verify that zero race conditions or double-bookings occur.

### 5.2 Postman API Test Collection
Student 4 will maintain the team's Postman collection:
1. `Auth/01_AdminLogin`: Extracts JWT Bearer token into environment variable `{{adminToken}}`.
2. `Auth/02_PatientRegister`: Registers a new patient, verifies role is strictly `ROLE_PATIENT`.
3. `Patients/01_List`: Tests pagination headers and query filtering.
4. `Admissions/01_AdmitPatient`: Admits patient to `BED-0101`, verifies bed status moves to `OCCUPIED`.
5. `Admissions/02_ConflictDuplicateAdmit`: Attempts to admit a second patient to `BED-0101`, asserts HTTP `409 Conflict`.
6. `Admissions/03_TransferPatient`: Calls transfer to `BED-0201`, verifies old bed is `AVAILABLE`, new bed is `OCCUPIED`, and old admission is `TRANSFERRED`.
