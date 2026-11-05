package com.mediTek.MediTek.dto;

import java.time.Instant;
import java.util.List;

public record PrescriptionDto(
        String prescriptionId,
        String patientId,
        String patientName,
        String doctorId,
        String doctorName,
        Instant prescriptionDate,
        String instructions,
        List<Item> items
) {
    public record Item(
            String prescriptionItemId,
            String medicineId,
            String medicineName,
            Integer prescribedQuantity,
            Integer quantityDispensed,
            Integer remainingQuantity,
            String dosage,
            String frequency,
            Integer durationDays
    ) {
    }
}
