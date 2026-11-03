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
@ToString(exclude = {"bill", "recordedBy"})
@NoArgsConstructor
@Entity
@Table(name = "bill_payments", uniqueConstraints = {
        @UniqueConstraint(name = "uq_bill_payment_request_key", columnNames = "payment_request_id")
})
public class BillPayment {

    @Id
    @Column(name = "payment_id", length = 64, nullable = false, updatable = false)
    private String paymentId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "bill_id", referencedColumnName = "bill_id",
            foreignKey = @ForeignKey(name = "fk_bill_payment_bill"), nullable = false)
    private Bill bill;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "recorded_by_user_account_id", referencedColumnName = "user_account_id",
            foreignKey = @ForeignKey(name = "fk_bill_payment_account"), nullable = false)
    private UserAccount recordedBy;

    @Column(name = "amount", precision = 12, scale = 2, nullable = false)
    private BigDecimal amount;

    @Column(name = "payment_request_id", length = 64, nullable = false, updatable = false)
    private String paymentRequestId;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", length = 32, nullable = false)
    private PaymentMethod paymentMethod;

    @Column(name = "paid_at", nullable = false, updatable = false)
    private Instant paidAt = Instant.now();

    public enum PaymentMethod {
        CASH,
        BANK_TRANSFER,
        OTHER
    }
}
