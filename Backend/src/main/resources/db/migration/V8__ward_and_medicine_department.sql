-- V8__ward_and_medicine_department.sql
-- Add department association to wards and medicines

ALTER TABLE wards
    ADD COLUMN department_id VARCHAR(64) NULL,
    ADD CONSTRAINT fk_ward_department
        FOREIGN KEY (department_id)
        REFERENCES departments(department_id)
        ON DELETE SET NULL;

ALTER TABLE medicines
    ADD COLUMN department_id VARCHAR(64) NULL,
    ADD CONSTRAINT fk_medicine_department
        FOREIGN KEY (department_id)
        REFERENCES departments(department_id)
        ON DELETE SET NULL;

-- Default existing formulary medicines to Central Pharmacy if it exists
UPDATE medicines
SET department_id = 'DEP-000005'
WHERE department_id IS NULL AND EXISTS (SELECT 1 FROM departments WHERE department_id = 'DEP-000005');
