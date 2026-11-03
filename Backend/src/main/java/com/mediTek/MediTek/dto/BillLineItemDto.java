package com.mediTek.MediTek.dto;

import java.math.BigDecimal;

public record BillLineItemDto(
        String lineItemId,
        String description,
        Integer quantity,
        BigDecimal unitPrice,
        BigDecimal lineTotal
) {
}
