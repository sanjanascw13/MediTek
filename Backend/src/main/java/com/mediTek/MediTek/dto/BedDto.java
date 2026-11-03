package com.mediTek.MediTek.dto;

import com.mediTek.MediTek.domain.Bed;

public record BedDto(
        String bedId,
        String wardId,
        String wardName,
        String bedNumber,
        String availabilityStatus,
        Bed.BedOperationalStatus operationalStatus,
        String currentPatientName,
        String departmentId,
        String departmentName
) {
    public BedDto(String bedId, String wardId, String wardName, String bedNumber, String availabilityStatus, Bed.BedOperationalStatus operationalStatus, String currentPatientName) {
        this(bedId, wardId, wardName, bedNumber, availabilityStatus, operationalStatus, currentPatientName, null, null);
    }
}
