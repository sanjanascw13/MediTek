package com.mediTek.MediTek.dto;

import com.mediTek.MediTek.domain.BloodUnit;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.AssertTrue;

import java.time.LocalDate;

public record BloodUnitCreateRequest(
        @NotBlank String bloodBankId,
        @NotBlank @Pattern(regexp = "A[+-]|B[+-]|AB[+-]|O[+-]") String bloodType,
        @NotNull BloodUnit.BloodComponent component,
        @NotNull @PastOrPresent LocalDate collectionDate,
        @NotNull @Future LocalDate expirationDate,
        @NotNull @Positive Integer quantityMl
) {
    @AssertTrue(message = "Expiration date must be after the collection date.")
    public boolean isExpirationAfterCollection() {
        return collectionDate == null || expirationDate == null || expirationDate.isAfter(collectionDate);
    }
}
