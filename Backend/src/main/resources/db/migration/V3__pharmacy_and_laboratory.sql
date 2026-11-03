ALTER TABLE medicines
    ADD COLUMN stock_quantity INT NOT NULL DEFAULT 0,
    ADD CONSTRAINT chk_medicine_stock_nonnegative CHECK (stock_quantity >= 0);

ALTER TABLE prescription_items
    ADD COLUMN quantity_dispensed INT NOT NULL DEFAULT 0,
    ADD CONSTRAINT chk_quantity_dispensed CHECK (
        quantity_dispensed >= 0 AND quantity_dispensed <= prescribed_quantity
    );

ALTER TABLE lab_reports
    ADD COLUMN result_classification ENUM('NORMAL', 'ABNORMAL') NULL;

CREATE TABLE medicine_dispensations (
    dispensation_id VARCHAR(64) NOT NULL PRIMARY KEY,
    prescription_id VARCHAR(64) NOT NULL,
    prescription_item_id VARCHAR(64) NOT NULL,
    medicine_id VARCHAR(64) NOT NULL,
    patient_person_id VARCHAR(64) NOT NULL,
    dispensed_by_user_account_id VARCHAR(64) NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    dispensed_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    CONSTRAINT chk_dispensation_quantity CHECK (quantity > 0),
    CONSTRAINT chk_dispensation_price CHECK (unit_price >= 0),
    CONSTRAINT fk_dispensation_prescription
        FOREIGN KEY (prescription_id) REFERENCES prescriptions(prescription_id) ON DELETE RESTRICT,
    CONSTRAINT fk_dispensation_item
        FOREIGN KEY (prescription_item_id) REFERENCES prescription_items(item_id) ON DELETE RESTRICT,
    CONSTRAINT fk_dispensation_medicine
        FOREIGN KEY (medicine_id) REFERENCES medicines(medicine_id) ON DELETE RESTRICT,
    CONSTRAINT fk_dispensation_patient
        FOREIGN KEY (patient_person_id) REFERENCES patients(person_id) ON DELETE RESTRICT,
    CONSTRAINT fk_dispensation_account
        FOREIGN KEY (dispensed_by_user_account_id) REFERENCES user_accounts(user_account_id) ON DELETE RESTRICT,
    INDEX ix_dispensation_patient_date (patient_person_id, dispensed_at),
    INDEX ix_dispensation_prescription_date (prescription_id, dispensed_at)
) ENGINE=InnoDB;

INSERT INTO id_counters (entity_name, next_id) VALUES ('dispensation', 1);
