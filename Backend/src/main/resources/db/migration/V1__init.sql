-- -------------------------------------------------------------
-- V1__init.sql – MediTek initial Flyway migration
-- MySQL 8.0.16+
-- -------------------------------------------------------------

-- Use UTC for this migration connection.
-- Configure the application/JDBC connections to use UTC as well.
SET time_zone = '+00:00';


-- -------------------------------------------------------------
-- 0. Business ID counters
-- -------------------------------------------------------------

CREATE TABLE id_counters (
    entity_name VARCHAR(64) NOT NULL PRIMARY KEY,
    next_id     BIGINT NOT NULL,
    CONSTRAINT chk_id_counter_positive CHECK (next_id > 0)
) ENGINE=InnoDB;

INSERT INTO id_counters (entity_name, next_id) VALUES
    ('person',            1),
    ('patient',           1),
    ('doctor',            1),
    ('staff',             1),
    ('department',        1),
    ('ward',              1),
    ('bed',               1),
    ('admission',         1),
    ('appointment',       1),
    ('medical_record',    1),
    ('prescription',      1),
    ('prescription_item', 1),
    ('medicine',          1),
    ('lab_test',          1),
    ('lab_report',        1),
    ('surgery',           1),
    ('blood_bank',        1),
    ('blood_unit',        1),
    ('bill',              1),
    ('user_account',      1);


-- -------------------------------------------------------------
-- 1. Base Person table
-- -------------------------------------------------------------

CREATE TABLE persons (
    person_id     VARCHAR(64) NOT NULL PRIMARY KEY,
    name          VARCHAR(128) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender        VARCHAR(16) NOT NULL,
    phone_number  VARCHAR(32) NOT NULL,
    email         VARCHAR(128) NOT NULL,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at    TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
                  ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT uq_person_email UNIQUE (email)
) ENGINE=InnoDB;


-- -------------------------------------------------------------
-- 2. Department hierarchy
-- Create the parent table before doctors and medical_staff,
-- because those tables reference departments.
-- -------------------------------------------------------------

CREATE TABLE departments (
    department_id   VARCHAR(64) NOT NULL PRIMARY KEY,
    department_name VARCHAR(128) NOT NULL,
    location        VARCHAR(128) NOT NULL,

    CONSTRAINT uq_department_name UNIQUE (department_name)
) ENGINE=InnoDB;


-- Department subtype tables – JOINED inheritance.

CREATE TABLE emergency_theater_units (
    department_id   VARCHAR(64) NOT NULL PRIMARY KEY,
    emergency_level VARCHAR(32) NOT NULL,

    CONSTRAINT fk_etu_department
        FOREIGN KEY (department_id)
        REFERENCES departments(department_id)
        ON DELETE RESTRICT
) ENGINE=InnoDB;


CREATE TABLE icus (
    department_id VARCHAR(64) NOT NULL PRIMARY KEY,
    bed_capacity  INT NOT NULL,

    CONSTRAINT chk_icu_bed_capacity CHECK (bed_capacity > 0),

    CONSTRAINT fk_icu_department
        FOREIGN KEY (department_id)
        REFERENCES departments(department_id)
        ON DELETE RESTRICT
) ENGINE=InnoDB;


CREATE TABLE opds (
    department_id             VARCHAR(64) NOT NULL PRIMARY KEY,
    consultation_room_count   INT NOT NULL,

    CONSTRAINT chk_opd_room_count CHECK (consultation_room_count > 0),

    CONSTRAINT fk_opd_department
        FOREIGN KEY (department_id)
        REFERENCES departments(department_id)
        ON DELETE RESTRICT
) ENGINE=InnoDB;


CREATE TABLE laboratories (
    department_id   VARCHAR(64) NOT NULL PRIMARY KEY,
    laboratory_type VARCHAR(64) NOT NULL,

    CONSTRAINT fk_laboratory_department
        FOREIGN KEY (department_id)
        REFERENCES departments(department_id)
        ON DELETE RESTRICT
) ENGINE=InnoDB;


CREATE TABLE pharmacies (
    department_id VARCHAR(64) NOT NULL PRIMARY KEY,
    pharmacy_type VARCHAR(64) NOT NULL,

    CONSTRAINT fk_pharmacy_department
        FOREIGN KEY (department_id)
        REFERENCES departments(department_id)
        ON DELETE RESTRICT
) ENGINE=InnoDB;


CREATE TABLE radiologies (
    department_id  VARCHAR(64) NOT NULL PRIMARY KEY,
    equipment_name VARCHAR(128) NOT NULL,

    CONSTRAINT fk_radiology_department
        FOREIGN KEY (department_id)
        REFERENCES departments(department_id)
        ON DELETE RESTRICT
) ENGINE=InnoDB;


CREATE TABLE operating_theaters (
    department_id  VARCHAR(64) NOT NULL PRIMARY KEY,
    theater_number VARCHAR(32) NOT NULL,

    CONSTRAINT uq_operating_theater_number UNIQUE (theater_number),

    CONSTRAINT fk_operating_theater_department
        FOREIGN KEY (department_id)
        REFERENCES departments(department_id)
        ON DELETE RESTRICT
) ENGINE=InnoDB;


CREATE TABLE maternity_units (
    department_id  VARCHAR(64) NOT NULL PRIMARY KEY,
    maternity_type VARCHAR(64) NOT NULL,

    CONSTRAINT fk_maternity_department
        FOREIGN KEY (department_id)
        REFERENCES departments(department_id)
        ON DELETE RESTRICT
) ENGINE=InnoDB;


CREATE TABLE clinic_areas (
    department_id VARCHAR(64) NOT NULL PRIMARY KEY,
    clinic_type   VARCHAR(64) NOT NULL,

    CONSTRAINT fk_clinic_department
        FOREIGN KEY (department_id)
        REFERENCES departments(department_id)
        ON DELETE RESTRICT
) ENGINE=InnoDB;


CREATE TABLE medical_units (
    department_id VARCHAR(64) NOT NULL PRIMARY KEY,
    unit_type     VARCHAR(64) NOT NULL,

    CONSTRAINT fk_medical_unit_department
        FOREIGN KEY (department_id)
        REFERENCES departments(department_id)
        ON DELETE RESTRICT
) ENGINE=InnoDB;


-- -------------------------------------------------------------
-- 3. Person subtypes – JOINED inheritance
-- -------------------------------------------------------------

CREATE TABLE patients (
    person_id         VARCHAR(64) NOT NULL PRIMARY KEY,
    patient_id        VARCHAR(64) NOT NULL,
    blood_group       VARCHAR(8) NOT NULL,
    address           VARCHAR(255) NOT NULL,
    emergency_contact VARCHAR(32) NOT NULL,

    CONSTRAINT uq_patient_business_id UNIQUE (patient_id),

    CONSTRAINT fk_patient_person
        FOREIGN KEY (person_id)
        REFERENCES persons(person_id)
        ON DELETE RESTRICT
) ENGINE=InnoDB;


CREATE TABLE doctors (
    person_id      VARCHAR(64) NOT NULL PRIMARY KEY,
    doctor_id      VARCHAR(64) NOT NULL,
    specialization VARCHAR(64) NOT NULL,
    license_number VARCHAR(64) NOT NULL,
    department_id  VARCHAR(64) NULL,

    CONSTRAINT uq_doctor_business_id UNIQUE (doctor_id),
    CONSTRAINT uq_doctor_license UNIQUE (license_number),

    CONSTRAINT fk_doctor_person
        FOREIGN KEY (person_id)
        REFERENCES persons(person_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_doctor_department
        FOREIGN KEY (department_id)
        REFERENCES departments(department_id)
        ON DELETE RESTRICT
) ENGINE=InnoDB;


CREATE TABLE medical_staff (
    person_id     VARCHAR(64) NOT NULL PRIMARY KEY,
    staff_id      VARCHAR(64) NOT NULL,
    role          VARCHAR(64) NOT NULL,
    department_id VARCHAR(64) NULL,

    CONSTRAINT uq_staff_business_id UNIQUE (staff_id),

    CONSTRAINT fk_medical_staff_person
        FOREIGN KEY (person_id)
        REFERENCES persons(person_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_medical_staff_department
        FOREIGN KEY (department_id)
        REFERENCES departments(department_id)
        ON DELETE RESTRICT
) ENGINE=InnoDB;


CREATE TABLE nurses (
    person_id VARCHAR(64) NOT NULL PRIMARY KEY,
    shift     VARCHAR(32) NOT NULL,

    CONSTRAINT fk_nurse_medical_staff
        FOREIGN KEY (person_id)
        REFERENCES medical_staff(person_id)
        ON DELETE RESTRICT
) ENGINE=InnoDB;


-- IMPORTANT:
-- The rule that a Person must belong to exactly one direct subtype
-- (Patient, Doctor, or MedicalStaff) must be enforced by the
-- application service layer in a transaction.
--
-- Nurse is a subtype of MedicalStaff, not a direct Person subtype.


-- -------------------------------------------------------------
-- 4. Physical facilities
-- -------------------------------------------------------------

CREATE TABLE wards (
    ward_id   VARCHAR(64) NOT NULL PRIMARY KEY,
    ward_name VARCHAR(128) NOT NULL,
    ward_type VARCHAR(64) NOT NULL,

    CONSTRAINT uq_ward_name UNIQUE (ward_name)
) ENGINE=InnoDB;


CREATE TABLE beds (
    bed_id             VARCHAR(64) NOT NULL PRIMARY KEY,
    ward_id            VARCHAR(64) NOT NULL,
    bed_number         VARCHAR(32) NOT NULL,
    operational_status ENUM(
        'AVAILABLE',
        'MAINTENANCE',
        'UNAVAILABLE'
    ) NOT NULL DEFAULT 'AVAILABLE',

    CONSTRAINT uq_bed_ward_number UNIQUE (ward_id, bed_number),

    CONSTRAINT fk_bed_ward
        FOREIGN KEY (ward_id)
        REFERENCES wards(ward_id)
        ON DELETE RESTRICT
) ENGINE=InnoDB;


-- -------------------------------------------------------------
-- 5. Admissions
-- Active admissions determine bed occupancy.
-- OCCUPIED is a derived display state, not a stored bed status.
-- -------------------------------------------------------------

CREATE TABLE admissions (
    admission_id               VARCHAR(64) NOT NULL PRIMARY KEY,
    patient_person_id          VARCHAR(64) NOT NULL,
    bed_id                     VARCHAR(64) NOT NULL,
    admitting_doctor_person_id VARCHAR(64) NOT NULL,

    admission_date TIMESTAMP(6) NOT NULL,
    discharge_date TIMESTAMP(6) NULL,

    status ENUM(
        'ACTIVE',
        'DISCHARGED',
        'TRANSFERRED'
    ) NOT NULL DEFAULT 'ACTIVE',

    reason                     TEXT NULL,
    transfer_from_admission_id VARCHAR(64) NULL,

    active_patient_person_id VARCHAR(64)
        GENERATED ALWAYS AS (
            CASE
                WHEN status = 'ACTIVE' THEN patient_person_id
                ELSE NULL
            END
        ) STORED,

    active_bed_id VARCHAR(64)
        GENERATED ALWAYS AS (
            CASE
                WHEN status = 'ACTIVE' THEN bed_id
                ELSE NULL
            END
        ) STORED,

    CONSTRAINT uq_admission_patient_pair
        UNIQUE (admission_id, patient_person_id),

    CONSTRAINT chk_admission_state CHECK (
        (
            status = 'ACTIVE'
            AND discharge_date IS NULL
        )
        OR
        (
            status IN ('DISCHARGED', 'TRANSFERRED')
            AND discharge_date IS NOT NULL
        )
    ),

    CONSTRAINT chk_admission_dates CHECK (
        discharge_date IS NULL
        OR discharge_date >= admission_date
    ),

    CONSTRAINT chk_admission_no_self_transfer CHECK (
        transfer_from_admission_id IS NULL
        OR transfer_from_admission_id <> admission_id
    ),

    CONSTRAINT fk_admission_patient
        FOREIGN KEY (patient_person_id)
        REFERENCES patients(person_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_admission_bed
        FOREIGN KEY (bed_id)
        REFERENCES beds(bed_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_admission_doctor
        FOREIGN KEY (admitting_doctor_person_id)
        REFERENCES doctors(person_id)
        ON DELETE RESTRICT,

    -- A transfer predecessor must belong to the same patient.
    CONSTRAINT fk_admission_transfer_predecessor
        FOREIGN KEY (transfer_from_admission_id, patient_person_id)
        REFERENCES admissions(admission_id, patient_person_id)
        ON DELETE RESTRICT
) ENGINE=InnoDB;


-- At most one active admission per patient.
CREATE UNIQUE INDEX uq_active_patient
    ON admissions(active_patient_person_id);

-- At most one active admission per bed.
CREATE UNIQUE INDEX uq_active_bed
    ON admissions(active_bed_id);

-- At most one successor per predecessor: linear transfer chain.
CREATE UNIQUE INDEX uq_transfer_successor
    ON admissions(transfer_from_admission_id);


-- IMPORTANT:
-- Admission transfer must be implemented as one database transaction:
-- 1. Validate the existing active admission.
-- 2. Validate the same patient and target bed.
-- 3. Close the old admission with status TRANSFERRED and discharge_date.
-- 4. Create the new ACTIVE admission with transfer_from_admission_id.
-- 5. Ensure the target bed has operational_status AVAILABLE.
--
-- The application must also prevent cycles and validate that the
-- predecessor is in the correct lifecycle state.


-- -------------------------------------------------------------
-- 6. Appointments
-- -------------------------------------------------------------

CREATE TABLE appointments (
    appointment_id VARCHAR(64) NOT NULL PRIMARY KEY,
    patient_person_id VARCHAR(64) NOT NULL,
    doctor_person_id  VARCHAR(64) NOT NULL,
    appointment_date TIMESTAMP(6) NOT NULL,

    status ENUM(
        'SCHEDULED',
        'COMPLETED',
        'CANCELLED',
        'NO_SHOW'
    ) NOT NULL DEFAULT 'SCHEDULED',

    notes TEXT NULL,

    CONSTRAINT fk_appointment_patient
        FOREIGN KEY (patient_person_id)
        REFERENCES patients(person_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_appointment_doctor
        FOREIGN KEY (doctor_person_id)
        REFERENCES doctors(person_id)
        ON DELETE RESTRICT
) ENGINE=InnoDB;


-- -------------------------------------------------------------
-- 7. Medical records
-- One appointment may be associated with multiple medical records.
-- -------------------------------------------------------------

CREATE TABLE medical_records (
    record_id         VARCHAR(64) NOT NULL PRIMARY KEY,
    patient_person_id VARCHAR(64) NOT NULL,
    admission_id      VARCHAR(64) NULL,
    appointment_id    VARCHAR(64) NULL,
    author_id         VARCHAR(64) NULL,

    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    content    TEXT NOT NULL,

    CONSTRAINT fk_medical_record_patient
        FOREIGN KEY (patient_person_id)
        REFERENCES patients(person_id)
        ON DELETE RESTRICT,

    -- If an admission is supplied, it must belong to this patient.
    CONSTRAINT fk_medical_record_admission_patient
        FOREIGN KEY (admission_id, patient_person_id)
        REFERENCES admissions(admission_id, patient_person_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_medical_record_appointment
        FOREIGN KEY (appointment_id)
        REFERENCES appointments(appointment_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_medical_record_author
        FOREIGN KEY (author_id)
        REFERENCES persons(person_id)
        ON DELETE RESTRICT
) ENGINE=InnoDB;


-- -------------------------------------------------------------
-- 8. Medicines
-- -------------------------------------------------------------

CREATE TABLE medicines (
    medicine_id VARCHAR(64) NOT NULL PRIMARY KEY,
    name        VARCHAR(128) NOT NULL,
    category    VARCHAR(64) NULL,
    price       DECIMAL(10,2) NOT NULL,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT uq_medicine_name UNIQUE (name),
    CONSTRAINT chk_medicine_price CHECK (price >= 0)
) ENGINE=InnoDB;


-- -------------------------------------------------------------
-- 9. Prescriptions and prescription items
-- -------------------------------------------------------------

CREATE TABLE prescriptions (
    prescription_id  VARCHAR(64) NOT NULL PRIMARY KEY,
    patient_person_id VARCHAR(64) NOT NULL,
    doctor_person_id  VARCHAR(64) NOT NULL,

    issued_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    notes     TEXT NULL,

    CONSTRAINT fk_prescription_patient
        FOREIGN KEY (patient_person_id)
        REFERENCES patients(person_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_prescription_doctor
        FOREIGN KEY (doctor_person_id)
        REFERENCES doctors(person_id)
        ON DELETE RESTRICT
) ENGINE=InnoDB;


CREATE TABLE prescription_items (
    item_id             VARCHAR(64) NOT NULL PRIMARY KEY,
    prescription_id     VARCHAR(64) NOT NULL,
    medicine_id         VARCHAR(64) NOT NULL,
    medicine_name       VARCHAR(128) NOT NULL,
    prescribed_quantity INT NOT NULL,
    dosage              VARCHAR(64) NOT NULL,
    frequency           VARCHAR(64) NOT NULL,
    duration_days       INT NOT NULL,

    CONSTRAINT chk_prescribed_quantity
        CHECK (prescribed_quantity > 0),

    CONSTRAINT chk_prescription_duration
        CHECK (duration_days > 0),

    CONSTRAINT fk_prescription_item_prescription
        FOREIGN KEY (prescription_id)
        REFERENCES prescriptions(prescription_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_prescription_item_medicine
        FOREIGN KEY (medicine_id)
        REFERENCES medicines(medicine_id)
        ON DELETE RESTRICT
) ENGINE=InnoDB;


-- -------------------------------------------------------------
-- 10. Laboratory tests and reports
-- Each LabTest may have at most one LabReport.
-- The ordering doctor and reviewing doctor are separate fields.
-- -------------------------------------------------------------

CREATE TABLE lab_tests (
    lab_test_id VARCHAR(64) NOT NULL PRIMARY KEY,
    patient_person_id VARCHAR(64) NOT NULL,
    ordered_by_doctor_person_id VARCHAR(64) NOT NULL,

    test_type    VARCHAR(128) NOT NULL,
    requested_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    status ENUM(
        'PENDING',
        'COMPLETED',
        'CANCELLED'
    ) NOT NULL DEFAULT 'PENDING',

    CONSTRAINT fk_lab_test_patient
        FOREIGN KEY (patient_person_id)
        REFERENCES patients(person_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_lab_test_ordering_doctor
        FOREIGN KEY (ordered_by_doctor_person_id)
        REFERENCES doctors(person_id)
        ON DELETE RESTRICT
) ENGINE=InnoDB;


CREATE TABLE lab_reports (
    report_id VARCHAR(64) NOT NULL PRIMARY KEY,
    lab_test_id VARCHAR(64) NOT NULL,
    reviewing_doctor_person_id VARCHAR(64) NOT NULL,

    result_summary TEXT NOT NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    CONSTRAINT uq_lab_report_test UNIQUE (lab_test_id),

    CONSTRAINT fk_lab_report_lab_test
        FOREIGN KEY (lab_test_id)
        REFERENCES lab_tests(lab_test_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_lab_report_reviewing_doctor
        FOREIGN KEY (reviewing_doctor_person_id)
        REFERENCES doctors(person_id)
        ON DELETE RESTRICT
) ENGINE=InnoDB;


-- IMPORTANT:
-- Creating a LabReport and updating its LabTest status to COMPLETED
-- must happen in the same application transaction.


-- -------------------------------------------------------------
-- 11. Surgeries
-- operating_theater_id references the OperatingTheater subtype PK,
-- which is also the Department ID.
-- -------------------------------------------------------------

CREATE TABLE surgeries (
    surgery_id           VARCHAR(64) NOT NULL PRIMARY KEY,
    patient_person_id    VARCHAR(64) NOT NULL,
    surgeon_person_id    VARCHAR(64) NOT NULL,
    operating_theater_id VARCHAR(64) NOT NULL,

    scheduled_at TIMESTAMP(6) NOT NULL,

    status ENUM(
        'SCHEDULED',
        'COMPLETED',
        'CANCELLED'
    ) NOT NULL DEFAULT 'SCHEDULED',

    notes TEXT NULL,

    CONSTRAINT fk_surgery_patient
        FOREIGN KEY (patient_person_id)
        REFERENCES patients(person_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_surgery_surgeon
        FOREIGN KEY (surgeon_person_id)
        REFERENCES doctors(person_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_surgery_operating_theater
        FOREIGN KEY (operating_theater_id)
        REFERENCES operating_theaters(department_id)
        ON DELETE RESTRICT
) ENGINE=InnoDB;


-- -------------------------------------------------------------
-- 12. Blood banks and blood units
-- Quantity is measured in millilitres.
-- -------------------------------------------------------------

CREATE TABLE blood_banks (
    blood_bank_id VARCHAR(64) NOT NULL PRIMARY KEY,
    name          VARCHAR(128) NOT NULL,
    location      VARCHAR(128) NOT NULL,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;


CREATE TABLE blood_units (
    unit_id       VARCHAR(64) NOT NULL PRIMARY KEY,
    blood_bank_id VARCHAR(64) NOT NULL,

    blood_type ENUM(
        'A+',
        'A-',
        'B+',
        'B-',
        'AB+',
        'AB-',
        'O+',
        'O-'
    ) NOT NULL,

    collection_date DATE NOT NULL,
    expiration_date DATE NOT NULL,
    quantity_ml     INT NOT NULL,

    CONSTRAINT chk_blood_unit_quantity CHECK (quantity_ml > 0),

    CONSTRAINT chk_blood_unit_dates
        CHECK (expiration_date > collection_date),

    CONSTRAINT fk_blood_unit_bank
        FOREIGN KEY (blood_bank_id)
        REFERENCES blood_banks(blood_bank_id)
        ON DELETE RESTRICT
) ENGINE=InnoDB;


-- -------------------------------------------------------------
-- 13. Billing
-- Multiple bills may be associated with one admission.
-- -------------------------------------------------------------

CREATE TABLE bills (
    bill_id         VARCHAR(64) NOT NULL PRIMARY KEY,
    patient_person_id VARCHAR(64) NOT NULL,
    admission_id    VARCHAR(64) NULL,

    amount_total DECIMAL(12,2) NOT NULL,
    issued_at    TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    paid_at      TIMESTAMP(6) NULL,

    status ENUM(
        'PENDING',
        'PAID',
        'CANCELLED'
    ) NOT NULL DEFAULT 'PENDING',

    CONSTRAINT chk_bill_amount CHECK (amount_total >= 0),

    CONSTRAINT chk_bill_payment_date CHECK (
        paid_at IS NULL OR paid_at >= issued_at
    ),

    CONSTRAINT fk_bill_patient
        FOREIGN KEY (patient_person_id)
        REFERENCES patients(person_id)
        ON DELETE RESTRICT,

    -- If an admission is supplied, it must belong to this patient.
    CONSTRAINT fk_bill_admission_patient
        FOREIGN KEY (admission_id, patient_person_id)
        REFERENCES admissions(admission_id, patient_person_id)
        ON DELETE RESTRICT
) ENGINE=InnoDB;


-- -------------------------------------------------------------
-- 14. Roles and user accounts
-- -------------------------------------------------------------

CREATE TABLE roles (
    role_id     VARCHAR(64) NOT NULL PRIMARY KEY,
    name        ENUM(
        'ADMIN',
        'DOCTOR',
        'STAFF',
        'PATIENT'
    ) NOT NULL,
    description VARCHAR(256) NULL,

    CONSTRAINT uq_role_name UNIQUE (name)
) ENGINE=InnoDB;


-- Seed the four approved application roles.
-- role_id values are intentionally the same as their role names.

INSERT INTO roles (role_id, name, description) VALUES
    ('ADMIN',   'ADMIN',   'System administrator'),
    ('DOCTOR',  'DOCTOR',  'Doctor account'),
    ('STAFF',   'STAFF',   'Medical staff account'),
    ('PATIENT', 'PATIENT', 'Patient account');


CREATE TABLE user_accounts (
    user_account_id VARCHAR(64) NOT NULL PRIMARY KEY,
    person_id       VARCHAR(64) NOT NULL,
    username        VARCHAR(64) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    role_id         VARCHAR(64) NOT NULL,
    enabled         BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT uq_user_account_person UNIQUE (person_id),
    CONSTRAINT uq_user_account_username UNIQUE (username),

    CONSTRAINT fk_user_account_person
        FOREIGN KEY (person_id)
        REFERENCES persons(person_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_user_account_role
        FOREIGN KEY (role_id)
        REFERENCES roles(role_id)
        ON DELETE RESTRICT
) ENGINE=InnoDB;


-- IMPORTANT:
-- Enforce role-to-Person subtype matching in the application service:
-- DOCTOR  -> Doctor
-- STAFF   -> MedicalStaff (including Nurse)
-- PATIENT -> Patient
-- ADMIN   -> May be linked to any Person for audit purposes.
--
-- Every UserAccount must reference exactly one Person.
-- The UNIQUE constraint on person_id enforces at most one account
-- per Person.


-- -------------------------------------------------------------
-- End of V1__init.sql
-- -------------------------------------------------------------