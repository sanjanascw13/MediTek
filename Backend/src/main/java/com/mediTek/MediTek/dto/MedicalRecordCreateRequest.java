package com.mediTek.MediTek.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record MedicalRecordCreateRequest(
        @NotBlank String patientId,
        @Size(max = 64) String appointmentId,
        @Size(max = 64) String admissionId,
        @NotBlank @Size(max = 10000) String content
) {
}
