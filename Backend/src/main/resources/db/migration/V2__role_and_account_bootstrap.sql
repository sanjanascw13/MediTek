-- Add the approved Super Admin role without rewriting existing ADMIN rows.
ALTER TABLE roles
    MODIFY name ENUM('ADMIN', 'SUPER_ADMIN', 'DOCTOR', 'STAFF', 'PATIENT') NOT NULL;

INSERT INTO roles (role_id, name, description)
VALUES ('SUPER_ADMIN', 'SUPER_ADMIN', 'Super administrator account');

-- A system administrator account need not impersonate a clinical Person.
ALTER TABLE user_accounts
    MODIFY person_id VARCHAR(64) NULL,
    ADD COLUMN password_change_required BOOLEAN NOT NULL DEFAULT FALSE;
