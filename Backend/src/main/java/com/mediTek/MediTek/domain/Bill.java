package com.mediTek.MediTek.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import java.math.BigDecimal;
import java.time.Instant;

@Getter
@Setter
@ToString(exclude = {"patient", "admission"})
@NoArgsConstructor
@Entity
@Table(name = "bills")
public class Bill {

    @Id
    @Column(name = "bill_id", length = 64, nullable = false, updatable = false)
    private String billId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_person_id", referencedColumnName = "person_id", foreignKey = @ForeignKey(name = "fk_bill_patient"), nullable = false)
    private Patient patient;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "admission_id", referencedColumnName = "admission_id", foreignKey = @ForeignKey(name = "fk_bill_admission_patient"))
    private Admission admission;

    @Column(name = "subtotal", precision = 12, scale = 2, nullable = false)
    private BigDecimal subtotal = BigDecimal.ZERO;

    @Column(name = "tax_rate_percent", precision = 5, scale = 2, nullable = false)
    private BigDecimal taxRatePercent = BigDecimal.ZERO;

    @Column(name = "tax_amount", precision = 12, scale = 2, nullable = false)
    private BigDecimal taxAmount = BigDecimal.ZERO;

    @Column(name = "amount_total", precision = 12, scale = 2, nullable = false)
    private BigDecimal amountTotal;

    @Column(name = "amount_paid", precision = 12, scale = 2, nullable = false)
    private BigDecimal amountPaid = BigDecimal.ZERO;

    @Column(name = "issued_at", nullable = false)
    private Instant issuedAt = Instant.now();

    @Column(name = "paid_at")
    private Instant paidAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 32, nullable = false)
    private BillStatus status = BillStatus.PENDING;

    public enum BillStatus {
        PENDING,
        PARTIAL,
        PAID,
        CANCELLED
    }
}
