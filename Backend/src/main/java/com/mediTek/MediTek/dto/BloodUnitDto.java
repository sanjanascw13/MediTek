package com.mediTek.MediTek.dto;

import com.mediTek.MediTek.domain.BloodUnit;

import java.time.LocalDate;

public record BloodUnitDto(
        String unitId,
        String bloodBankId,
        String bloodBankName,
        String bloodType,
        BloodUnit.BloodComponent component,
        LocalDate collectionDate,
        LocalDate expirationDate,
        Integer quantityMl,
        String availabilityStatus
) {
}
