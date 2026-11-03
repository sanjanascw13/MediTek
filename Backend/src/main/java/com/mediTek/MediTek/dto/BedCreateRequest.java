package com.mediTek.MediTek.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record BedCreateRequest(
        @NotBlank String wardId,
        @NotBlank @Size(min = 1, max = 32) String bedNumber
) {
}
