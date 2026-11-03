package com.mediTek.MediTek.dto;

import java.time.Instant;

public record BloodIssueDto(
        String bloodIssueId,
        String unitId,
        String bloodType,
        String component,
        String patientId,
        String patientName,
        Integer quantityMl,
        String purpose,
        String issuedBy,
        Instant issuedAt
) {
}
