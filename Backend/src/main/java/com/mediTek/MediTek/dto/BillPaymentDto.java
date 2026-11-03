package com.mediTek.MediTek.dto;

import com.mediTek.MediTek.domain.BillPayment;

import java.math.BigDecimal;
import java.time.Instant;

public record BillPaymentDto(
        String paymentId,
        BigDecimal amount,
        BillPayment.PaymentMethod paymentMethod,
        String recordedBy,
        Instant paidAt
) {
}
