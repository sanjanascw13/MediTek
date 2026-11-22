-- Resync ID counters to prevent primary key collision upon entity creation
UPDATE id_counters c
JOIN (
    SELECT 'person' AS entity_name, IFNULL(MAX(CAST(SUBSTRING(person_id, 5) AS UNSIGNED)), 0) + 1 AS safe_next
    FROM persons
) m ON c.entity_name = m.entity_name
SET c.next_id = GREATEST(c.next_id, m.safe_next);

UPDATE id_counters c
JOIN (
    SELECT 'user_account' AS entity_name, IFNULL(MAX(CAST(SUBSTRING(user_account_id, 5) AS UNSIGNED)), 0) + 1 AS safe_next
    FROM user_accounts
) m ON c.entity_name = m.entity_name
SET c.next_id = GREATEST(c.next_id, m.safe_next);

UPDATE id_counters c
JOIN (
    SELECT 'patient' AS entity_name, IFNULL(MAX(CAST(SUBSTRING(patient_id, 5) AS UNSIGNED)), 0) + 1 AS safe_next
    FROM patients
) m ON c.entity_name = m.entity_name
SET c.next_id = GREATEST(c.next_id, m.safe_next);

UPDATE id_counters c
JOIN (
    SELECT 'staff' AS entity_name, IFNULL(MAX(CAST(SUBSTRING(staff_id, 5) AS UNSIGNED)), 0) + 1 AS safe_next
    FROM medical_staff
) m ON c.entity_name = m.entity_name
SET c.next_id = GREATEST(c.next_id, m.safe_next);

UPDATE id_counters c
JOIN (
    SELECT 'doctor' AS entity_name, IFNULL(MAX(CAST(SUBSTRING(doctor_id, 5) AS UNSIGNED)), 0) + 1 AS safe_next
    FROM doctors
) m ON c.entity_name = m.entity_name
SET c.next_id = GREATEST(c.next_id, m.safe_next);
