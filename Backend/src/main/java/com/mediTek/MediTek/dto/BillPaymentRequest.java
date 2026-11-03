package com.mediTek.MediTek.dto;

import com.mediTek.MediTek.domain.BillPayment;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record BillPaymentRequest(
        @NotNull @DecimalMin("0.01") @Digits(integer = 10, fraction = 2) BigDecimal amount,
        @NotNull BillPayment.PaymentMethod paymentMethod,
        @NotBlank @Size(max = 64) String paymentRequestId
) {
}
