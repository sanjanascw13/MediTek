package com.mediTek.MediTek.dto;

import com.mediTek.MediTek.domain.LabReport;

import java.time.Instant;

public record LabReportDto(
        String reportId,
        String testId,
        Instant reportDate,
        String resultDetails,
        LabReport.ResultClassification result,
        String reviewingDoctorId,
        String reviewingDoctorName
) {
}
