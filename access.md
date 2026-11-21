# MediTek Hospital Management System — Access Credentials

This document provides system access credentials for hospital staff and administrators.

---

## Access Credentials Directory

| Role / Designation | Staff Member Name | Department | Username | Password | Access Portal URL |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Super Admin** | System Administrator | Administration | `meditekadmin` | `Admin@Meditek2026!` | `http://localhost:5173/login` |
| **Doctor** | Dr. Gregory House | Diagnostics & Nephrology (`DOC-000001`) | `meditek_doctor` | `Admin@Meditek2026!` | `http://localhost:5173/login` |
| **Pharmacist** | David Miller | Central Pharmacy (`DEP-000005`) | `meditek_pharma` | `Pharma@Meditek2026!` | `http://localhost:5173/login` |
| **Receptionist** | Emma Watson | Outpatient Department (`DEP-000003`) | `meditek_reception` | `Admin@Meditek2026!` | `http://localhost:5173/login` |
| **Laboratory Technician** | Robert Chen | Central Pathology Laboratory (`DEP-000004`) | `meditek_labtech` | `LabTech@Meditek2026!` | `http://localhost:5173/login` |
| **Billing Officer** | Grace Hopper | Outpatient Department (`DEP-000003`) | `meditek_reception` | `Admin@Meditek2026!` | `http://localhost:5173/login` |
| **Nurse** | Clara Barton | Intensive Care Unit (`DEP-000002`) | `meditek_nurse` | `Nurse@Meditek2026!` | `http://localhost:5173/login` |
| **Patient** | Alice TestPatient | Patient Portal (`PAT-000001` / `PER-000001`) | `alicetestpatient` | `Admin@Meditek2026!` | `http://localhost:5173/login` |

---

## Role Capabilities & Overview

### 1. Super Admin (`meditekadmin`)
- **Authority:** Full system administration and RBAC management.
- **Capabilities:**
  - Create and manage Doctors and Staff accounts.
  - Create and configure hospital Departments, Wards, and Beds.
  - Manage Pharmacy Medicine Formulary and inventory items.
  - Review all hospital appointments, admissions, surgeries, lab tests, and billing items.
  - Access system settings and audit configurations.

### 2. Doctor (`meditek_doctor`)
- **Authority:** Clinical consultations, e-prescribing, inpatient rounds, and patient discharge.
- **Capabilities:**
  - Manage today's consultation schedule and patient queue.
  - Record diagnoses, clinical notes, and vital checks.
  - Write e-prescriptions directly linked to the central pharmacy.
  - Order diagnostic laboratory tests and review test findings.
  - Inpatient rounds management and **discharge active inpatients**.

### 3. Pharmacist (`meditek_pharma`)
- **Authority:** Staff-level pharmacy and medication management.
- **Capabilities:**
  - View doctor prescriptions.
  - Dispense medications against active prescriptions with automated stock decrement.
  - Inspect formulary medicines, stock levels, and expiry alerts.

### 4. Laboratory Technician (`meditek_labtech`)
- **Authority:** Diagnostic laboratory processing, specimen analysis, and report publication.
- **Capabilities:**
  - Review incoming doctor lab orders and STAT/urgent diagnostic requests.
  - Record specimen analysis metrics, quantitative findings, and technician remarks.
  - Verify and publish finalized lab reports (synchronizing with doctors and patient health portals).

### 5. Receptionist (`meditek_reception`)
- **Authority:** Front-desk patient registration, admissions, and billing cashier.
- **Capabilities:**
  - Register new patients into the electronic health record.
  - Schedule consultations and organize doctor queues.
  - Check ward bed availability, assign beds, and admit inpatients.
  - Collect payments and issue billing invoices/receipts.

### 6. Patient (`alicetestpatient`)
- **Authority:** Self-service health access for registered patients.
- **Capabilities:**
  - View upcoming appointments and schedule new doctor consultations.
  - Review active e-prescriptions and medication instructions issued by attending physicians.
  - Access verified diagnostic laboratory reports and test results from the central lab.
  - Review hospital billing invoices in **LKR** and pay balances online.
  - Access and print official receipts and medical record summaries.

---

## Authentication & Security Notes

- All accounts are authenticated against the live MediTek Spring Boot API (`POST /api/auth/login`) with BCrypt salted password verification.
- User sessions are issued stateless JWT Bearer tokens valid for 24 hours.
- Passwords can be changed anytime via the `/change-password` portal route.

