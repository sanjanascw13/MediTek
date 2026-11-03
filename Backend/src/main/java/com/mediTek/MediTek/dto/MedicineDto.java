package com.mediTek.MediTek.dto;

import java.math.BigDecimal;

public record MedicineDto(
        String medicineId,
        String medicineName,
        String category,
        Integer quantity,
        BigDecimal price,
        String departmentId,
        String departmentName
) {
    public MedicineDto(String medicineId, String medicineName, String category, Integer quantity, BigDecimal price) {
        this(medicineId, medicineName, category, quantity, price, null, null);
    }
}
