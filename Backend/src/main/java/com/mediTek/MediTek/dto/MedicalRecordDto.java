package com.mediTek.MediTek.dto;

import java.time.Instant;

public record MedicalRecordDto(
        String recordId,
        String patientId,
        String patientName,
        String authorId,
        String authorName,
        String appointmentId,
        String admissionId,
        String content,
        Instant createdAt
) {
}
