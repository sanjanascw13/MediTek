package com.mediTek.MediTek.dto;

import com.mediTek.MediTek.domain.Bed;

public record BedDto(
        String bedId,
        String wardId,
        String wardName,
        String bedNumber,
        String availabilityStatus,
        Bed.BedOperationalStatus operationalStatus,
        String currentPatientName
) {
}
