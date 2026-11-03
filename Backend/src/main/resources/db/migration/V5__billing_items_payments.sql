ALTER TABLE bills
    ADD COLUMN subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    ADD COLUMN tax_rate_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    ADD COLUMN tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    ADD COLUMN amount_paid DECIMAL(12,2) NOT NULL DEFAULT 0.00;

UPDATE bills
SET subtotal = amount_total,
    amount_paid = CASE WHEN status = 'PAID' THEN amount_total ELSE 0.00 END;

ALTER TABLE bills
    MODIFY COLUMN status ENUM('PENDING', 'PARTIAL', 'PAID', 'CANCELLED')
        NOT NULL DEFAULT 'PENDING',
    ADD CONSTRAINT chk_bill_subtotal_nonnegative CHECK (subtotal >= 0),
    ADD CONSTRAINT chk_bill_tax_rate_range CHECK (tax_rate_percent BETWEEN 0 AND 100),
    ADD CONSTRAINT chk_bill_tax_nonnegative CHECK (tax_amount >= 0),
    ADD CONSTRAINT chk_bill_amount_paid_range CHECK (amount_paid BETWEEN 0 AND amount_total);

CREATE TABLE bill_line_items (
    line_item_id VARCHAR(64) NOT NULL PRIMARY KEY,
    bill_id      VARCHAR(64) NOT NULL,
    description  VARCHAR(255) NOT NULL,
    quantity     INT NOT NULL,
    unit_price   DECIMAL(12,2) NOT NULL,
    line_total   DECIMAL(12,2) NOT NULL,

    CONSTRAINT chk_bill_line_quantity CHECK (quantity > 0),
    CONSTRAINT chk_bill_line_price CHECK (unit_price >= 0),
    CONSTRAINT chk_bill_line_total CHECK (line_total >= 0),
    CONSTRAINT fk_bill_line_item_bill
        FOREIGN KEY (bill_id)
        REFERENCES bills(bill_id)
        ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE bill_payments (
    payment_id VARCHAR(64) NOT NULL PRIMARY KEY,
    bill_id VARCHAR(64) NOT NULL,
    recorded_by_user_account_id VARCHAR(64) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    payment_request_id VARCHAR(64) NOT NULL,
    payment_method ENUM('CASH', 'BANK_TRANSFER', 'OTHER') NOT NULL,
    paid_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    CONSTRAINT chk_bill_payment_amount CHECK (amount > 0),
    CONSTRAINT uq_bill_payment_request_key UNIQUE (payment_request_id),
    CONSTRAINT fk_bill_payment_bill
        FOREIGN KEY (bill_id)
        REFERENCES bills(bill_id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_bill_payment_account
        FOREIGN KEY (recorded_by_user_account_id)
        REFERENCES user_accounts(user_account_id)
        ON DELETE RESTRICT
) ENGINE=InnoDB;

INSERT INTO bill_line_items (line_item_id, bill_id, description, quantity, unit_price, line_total)
SELECT CONCAT('BLI-LEGACY-', LEFT(SHA2(bill_id, 256), 48)),
       bill_id,
       'Legacy invoice balance (original itemization unavailable)',
       1,
       subtotal,
       subtotal
FROM bills;

INSERT INTO id_counters (entity_name, next_id)
VALUES ('bill_line_item', 1), ('bill_payment', 1);
