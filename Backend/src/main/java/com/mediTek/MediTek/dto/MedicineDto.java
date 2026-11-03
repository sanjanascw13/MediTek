package com.mediTek.MediTek.dto;

import java.math.BigDecimal;

public record MedicineDto(
        String medicineId,
        String medicineName,
        String category,
        Integer quantity,
        BigDecimal price
) {
}
