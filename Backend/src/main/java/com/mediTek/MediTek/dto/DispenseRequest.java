package com.mediTek.MediTek.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record DispenseRequest(
        @NotBlank String prescriptionItemId,
        @NotNull @Positive Integer quantity
) {
}
