package com.mediTek.MediTek.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record DispensationDto(
        String dispensationId,
        String prescriptionId,
        String prescriptionItemId,
        String medicineId,
        String medicineName,
        String patientId,
        String patientName,
        Integer quantity,
        BigDecimal unitPrice,
        String dispensedBy,
        Instant dispensedAt
) {
}
