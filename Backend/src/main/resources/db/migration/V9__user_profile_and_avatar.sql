ALTER TABLE persons ADD COLUMN IF NOT EXISTS profile_image LONGTEXT NULL AFTER is_active;

INSERT INTO persons (person_id, name, date_of_birth, gender, phone_number, email, is_active)
VALUES ('PER-000000', 'System Administrator', '1985-01-01', 'OTHER', '+94 11 000 0000', 'admin@meditek.local', 1)
ON DUPLICATE KEY UPDATE name = 'System Administrator';

INSERT INTO medical_staff (person_id, staff_id, role, department_id)
VALUES ('PER-000000', 'STF-000000', 'SUPER_ADMIN', NULL)
ON DUPLICATE KEY UPDATE role = 'SUPER_ADMIN';

UPDATE user_accounts SET person_id = 'PER-000000' WHERE username = 'meditekadmin' AND (person_id IS NULL OR person_id = '');
