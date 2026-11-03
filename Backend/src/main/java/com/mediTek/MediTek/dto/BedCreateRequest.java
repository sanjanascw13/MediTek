package com.mediTek.MediTek.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record BedCreateRequest(
        @NotBlank String wardId,
        @Size(max = 32) String bedNumber
) {
    public BedCreateRequest(String wardId) {
        this(wardId, null);
    }
}
