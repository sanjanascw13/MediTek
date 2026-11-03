package com.mediTek.MediTek.dto;

import com.mediTek.MediTek.domain.LabReport;
import com.mediTek.MediTek.domain.LabTest;

import java.time.Instant;

public record LabTestDto(
        String testId,
        String patientId,
        String patientName,
        String doctorId,
        String doctorName,
        String testName,
        Instant testDate,
        LabTest.LabTestStatus status,
        String reportId,
        LabReport.ResultClassification result
) {
}
