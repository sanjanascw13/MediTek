# MediTek Hospital Management System — Access Credentials

This document provides system access credentials for hospital staff and administrators.

---

## Access Credentials Directory

| Role / Designation | Staff Member Name | Department | Username | Password | Access Portal URL |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Super Admin** | System Administrator | Administration | `meditekadmin` | `Admin@Meditek2026!` | `http://localhost:5173/login` |
| **Pharmacist** | David Miller | Central Pharmacy (`DEP-000005`) | `meditek_pharma` | `Pharma@Meditek2026!` | `http://localhost:5173/login` |
| **Receptionist** | Emma Watson | Outpatient Department (`DEP-000003`) | `meditek_reception` | `Reception@Meditek2026!` | `http://localhost:5173/login` |
| **Laboratory Technician** | Robert Chen | Central Pathology Laboratory (`DEP-000004`) | `meditek_labtech` | `LabTech@Meditek2026!` | `http://localhost:5173/login` |
| **Billing Officer** | Grace Hopper | Outpatient Department (`DEP-000003`) | `meditek_billing` | `Billing@Meditek2026!` | `http://localhost:5173/login` |
| **Nurse** | Clara Barton | Intensive Care Unit (`DEP-000002`) | `meditek_nurse` | `Nurse@Meditek2026!` | `http://localhost:5173/login` |

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

### 2. Pharmacist (`meditek_pharma`)
- **Authority:** Staff-level pharmacy and medication management.
- **Capabilities:**
  - View doctor prescriptions.
  - Dispense medications against active prescriptions with automated stock decrement.
  - Inspect formulary medicines, stock levels, and expiry alerts.

### 3. Receptionist (`meditek_reception`)
- **Authority:** Front-desk patient admission and appointment desk.
- **Capabilities:**
  - Register new patients into the MediTek electronic health registry.
  - Schedule, view, and organize patient consultations and appointments.
  - Process patient admissions and bed transfers across wards.

### 4. Laboratory Technician (`meditek_labtech`)
- **Authority:** Diagnostic lab test processing and reporting.
- **Capabilities:**
  - Review incoming lab test requests and pending doctor orders.
  - Record specimen details, input lab test findings, and publish finalized lab reports.
  - Track order completion status.

### 5. Billing Officer (`meditek_billing`)
- **Authority:** Patient billing, invoicing, and revenue reconciliation.
- **Capabilities:**
  - Generate consolidated inpatient and outpatient bills.
  - Add billing line items for treatments, medications, procedures, and room fees.
  - Record payments (Cash, Card, Insurance) and issue receipts.

### 6. Nurse (`meditek_nurse`)
- **Authority:** Inpatient care, bedside monitoring, and clinical workflow.
- **Capabilities:**
  - Monitor ward occupancies and bed allocation.
  - Record vitals and update inpatient nursing charts.
  - Track scheduled surgeries and support doctor consultations.

---

## Authentication & Security Notes

- All accounts are authenticated against the live MediTek Spring Boot API (`POST /api/auth/login`) with BCrypt salted password verification.
- User sessions are issued stateless JWT Bearer tokens valid for 24 hours.
- Passwords can be changed anytime via the `/change-password` portal route.
