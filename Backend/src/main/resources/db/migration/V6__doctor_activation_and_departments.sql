-- V6: Doctor Account Activation Tokens and Dedicated Departments
-- 1. Create table for doctor account setup / activation tokens
CREATE TABLE doctor_activation_tokens (
    token_id            VARCHAR(64) NOT NULL PRIMARY KEY,
    user_account_id     VARCHAR(64) NOT NULL,
    doctor_id           VARCHAR(64) NOT NULL,
    token_hash          VARCHAR(64) NOT NULL,
    expires_at          TIMESTAMP(6) NOT NULL,
    used                BOOLEAN NOT NULL DEFAULT FALSE,
    used_at             TIMESTAMP(6) NULL,
    created_at          TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    CONSTRAINT uq_token_hash UNIQUE (token_hash),
    CONSTRAINT fk_dat_user_account
        FOREIGN KEY (user_account_id)
        REFERENCES user_accounts(user_account_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_dat_doctor
        FOREIGN KEY (doctor_id)
        REFERENCES doctors(doctor_id)
        ON DELETE CASCADE
) ENGINE=InnoDB;

INSERT INTO id_counters (entity_name, next_id)
VALUES ('doctor_activation_token', 1);

-- 2. Populate standard dedicated hospital departments
INSERT INTO departments (department_id, department_name, location)
VALUES
    ('DEP-000001', 'Emergency Theater Unit', 'Ground Floor Block A'),
    ('DEP-000002', 'Intensive Care Unit (ICU)', '2nd Floor Block B'),
    ('DEP-000003', 'Outpatient Department (OPD)', '1st Floor Block A'),
    ('DEP-000004', 'Central Pathology Laboratory', 'Basement 1 Block C'),
    ('DEP-000005', 'Central Pharmacy', 'Ground Floor Lobby'),
    ('DEP-000006', 'Diagnostic Radiology', '1st Floor Block C'),
    ('DEP-000007', 'Operating Theaters (OR)', '3rd Floor Block B'),
    ('DEP-000008', 'Maternity & Neonatal Unit', '4th Floor Block A'),
    ('DEP-000009', 'Cardiology Center', '2nd Floor Block B'),
    ('DEP-000010', 'Neuroscience Wing', '3rd Floor Block C'),
    ('DEP-000011', 'Orthopedic Unit', '2nd Floor Block A')
ON DUPLICATE KEY UPDATE
    department_name = VALUES(department_name),
    location = VALUES(location);

-- Populate department subtype records where applicable
INSERT INTO emergency_theater_units (department_id, emergency_level)
VALUES ('DEP-000001', 'LEVEL_1_TRAUMA')
ON DUPLICATE KEY UPDATE emergency_level = VALUES(emergency_level);

INSERT INTO icus (department_id, bed_capacity)
VALUES ('DEP-000002', 24)
ON DUPLICATE KEY UPDATE bed_capacity = VALUES(bed_capacity);

INSERT INTO opds (department_id, consultation_room_count)
VALUES ('DEP-000003', 16)
ON DUPLICATE KEY UPDATE consultation_room_count = VALUES(consultation_room_count);

INSERT INTO laboratories (department_id, laboratory_type)
VALUES ('DEP-000004', 'CLINICAL_PATHOLOGY')
ON DUPLICATE KEY UPDATE laboratory_type = VALUES(laboratory_type);

INSERT INTO pharmacies (department_id, pharmacy_type)
VALUES ('DEP-000005', 'CENTRAL_DISPENSING')
ON DUPLICATE KEY UPDATE pharmacy_type = VALUES(pharmacy_type);

INSERT INTO radiologies (department_id, equipment_name)
VALUES ('DEP-000006', 'MRI 3T / CT 128 Slice')
ON DUPLICATE KEY UPDATE equipment_name = VALUES(equipment_name);

INSERT INTO operating_theaters (department_id, theater_number)
VALUES ('DEP-000007', 'OR-SUITE-4')
ON DUPLICATE KEY UPDATE theater_number = VALUES(theater_number);

INSERT INTO maternity_units (department_id, maternity_type)
VALUES ('DEP-000008', 'NEONATAL_CARE')
ON DUPLICATE KEY UPDATE maternity_type = VALUES(maternity_type);

INSERT INTO clinic_areas (department_id, clinic_type)
VALUES ('DEP-000009', 'CARDIAC_CONSULTATIONS')
ON DUPLICATE KEY UPDATE clinic_type = VALUES(clinic_type);

INSERT INTO medical_units (department_id, unit_type)
VALUES ('DEP-000010', 'NEUROLOGY_SPECIALTY')
ON DUPLICATE KEY UPDATE unit_type = VALUES(unit_type);

UPDATE id_counters
SET next_id = GREATEST(next_id, 12)
WHERE entity_name = 'department';

