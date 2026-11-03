package com.mediTek.MediTek.dto;

import com.mediTek.MediTek.domain.Surgery;

import java.time.Instant;

public record SurgeryDto(
        String surgeryId,
        String patientId,
        String patientName,
        String doctorId,
        String doctorName,
        String theaterNumber,
        String departmentName,
        Instant scheduledAt,
        String surgeryType,
        Integer durationMinutes,
        Surgery.SurgeryStatus status,
        String notes
) {
}
