package com.mediTek.MediTek.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LabTestCreateRequest(
        @NotBlank String patientId,
        @NotBlank String doctorId,
        @NotBlank @Size(max = 128) String testName
) {
}
