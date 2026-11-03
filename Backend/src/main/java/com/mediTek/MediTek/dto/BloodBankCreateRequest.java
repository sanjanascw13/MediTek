package com.mediTek.MediTek.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record BloodBankCreateRequest(
        @NotBlank @Size(max = 128) String name,
        @NotBlank @Size(max = 128) String location
) {
}
