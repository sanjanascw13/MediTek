-- V7__medicines_and_theaters_seed.sql
-- Seed initial hospital formulary medicines and operating theater suites

INSERT INTO medicines (medicine_id, name, category, price, is_active, stock_quantity)
VALUES
    ('MED-000001', 'Paracetamol 500mg', 'Analgesic', 15.00, TRUE, 250),
    ('MED-000002', 'Amoxicillin 500mg', 'Antibiotic', 45.00, TRUE, 150),
    ('MED-000003', 'Metformin 500mg', 'Antidiabetic', 20.00, TRUE, 200),
    ('MED-000004', 'Atorvastatin 20mg', 'Cardiovascular', 55.00, TRUE, 180),
    ('MED-000005', 'Omeprazole 20mg', 'Gastrointestinal', 30.00, TRUE, 160),
    ('MED-000006', 'Ciprofloxacin 500mg', 'Antibiotic', 65.00, TRUE, 120),
    ('MED-000007', 'Ibuprofen 400mg', 'NSAID', 25.00, TRUE, 220),
    ('MED-000008', 'Salbutamol 100mcg Inhaler', 'Respiratory', 450.00, TRUE, 60),
    ('MED-000009', 'Losartan Potassium 50mg', 'Antihypertensive', 35.00, TRUE, 175),
    ('MED-000010', 'Azithromycin 500mg', 'Antibiotic', 85.00, TRUE, 100)
ON DUPLICATE KEY UPDATE
    price = VALUES(price),
    stock_quantity = VALUES(stock_quantity),
    is_active = TRUE;

INSERT INTO id_counters (entity_name, next_id)
VALUES ('medicine', 11)
ON DUPLICATE KEY UPDATE next_id = GREATEST(next_id, 11);

INSERT INTO operating_theaters (department_id, theater_number)
VALUES
    ('DEP-000007', 'OR-SUITE-1'),
    ('DEP-000007', 'OR-SUITE-2'),
    ('DEP-000007', 'OR-SUITE-3')
ON DUPLICATE KEY UPDATE department_id = VALUES(department_id);
