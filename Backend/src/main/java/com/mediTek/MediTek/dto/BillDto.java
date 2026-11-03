package com.mediTek.MediTek.dto;

import com.mediTek.MediTek.domain.Bill;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record BillDto(
        String billId,
        String patientId,
        String patientName,
        String admissionId,
        List<BillLineItemDto> items,
        BigDecimal subtotal,
        BigDecimal taxRatePercent,
        BigDecimal taxAmount,
        BigDecimal amountTotal,
        BigDecimal amountPaid,
        BigDecimal balanceDue,
        Bill.BillStatus status,
        Instant issuedAt,
        Instant paidAt,
        List<BillPaymentDto> payments
) {
}
