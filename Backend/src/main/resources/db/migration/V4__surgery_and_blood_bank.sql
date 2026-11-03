ALTER TABLE surgeries
    MODIFY COLUMN status ENUM('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')
        NOT NULL DEFAULT 'SCHEDULED',
    ADD COLUMN surgery_type VARCHAR(128) NOT NULL DEFAULT 'UNSPECIFIED',
    ADD COLUMN duration_minutes INT NOT NULL DEFAULT 60,
    ADD CONSTRAINT chk_surgery_duration CHECK (duration_minutes BETWEEN 1 AND 1440);

ALTER TABLE blood_units
    DROP CHECK chk_blood_unit_quantity,
    ADD COLUMN component ENUM(
        'WHOLE_BLOOD',
        'RED_CELLS',
        'PLASMA',
        'PLATELETS',
        'CRYOPRECIPITATE'
    ) NOT NULL DEFAULT 'WHOLE_BLOOD',
    ADD CONSTRAINT chk_blood_unit_quantity CHECK (quantity_ml >= 0);

CREATE TABLE blood_issues (
    blood_issue_id VARCHAR(64) NOT NULL PRIMARY KEY,
    unit_id VARCHAR(64) NOT NULL,
    patient_person_id VARCHAR(64) NOT NULL,
    issued_by_user_account_id VARCHAR(64) NOT NULL,
    quantity_ml INT NOT NULL,
    purpose VARCHAR(500) NULL,
    issued_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    CONSTRAINT chk_blood_issue_quantity CHECK (quantity_ml > 0),
    CONSTRAINT fk_blood_issue_unit
        FOREIGN KEY (unit_id) REFERENCES blood_units(unit_id) ON DELETE RESTRICT,
    CONSTRAINT fk_blood_issue_patient
        FOREIGN KEY (patient_person_id) REFERENCES patients(person_id) ON DELETE RESTRICT,
    CONSTRAINT fk_blood_issue_account
        FOREIGN KEY (issued_by_user_account_id) REFERENCES user_accounts(user_account_id) ON DELETE RESTRICT,
    INDEX ix_blood_issue_patient_date (patient_person_id, issued_at),
    INDEX ix_blood_issue_unit_date (unit_id, issued_at)
) ENGINE=InnoDB;

INSERT INTO id_counters (entity_name, next_id) VALUES ('blood_issue', 1);
