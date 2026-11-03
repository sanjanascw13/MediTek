package com.mediTek.MediTek.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record WardCreateRequest(
        @NotBlank @Size(min = 2, max = 128) String wardName,
        @NotBlank @Size(min = 2, max = 64) String wardType
) {
}
