package com.mediTek.MediTek.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record LabTestStatusRequest(@NotNull @NotBlank @Pattern(regexp = "CANCELLED") String status) {
}
