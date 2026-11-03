package com.mediTek.MediTek.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

public record PrescriptionCreateRequest(
        @NotBlank String patientId,
        @NotBlank String doctorId,
        @Size(max = 2000) String instructions,
        @NotEmpty List<@Valid Item> items
) {
    public record Item(
            @NotBlank String medicineId,
            @jakarta.validation.constraints.NotNull @jakarta.validation.constraints.Positive Integer prescribedQuantity,
            @NotBlank @Size(max = 64) String dosage,
            @NotBlank @Size(max = 64) String frequency,
            @jakarta.validation.constraints.NotNull @jakarta.validation.constraints.Positive Integer durationDays
    ) {
    }
}
