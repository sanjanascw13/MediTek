package com.mediTek.MediTek.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record MedicineCreateRequest(
        @NotBlank @Size(min = 1, max = 128) String name,
        @Size(max = 64) String category,
        @NotNull @DecimalMin("0.00") BigDecimal price,
        @NotNull @Min(0) Integer stockQuantity,
        String departmentId
) {
}
