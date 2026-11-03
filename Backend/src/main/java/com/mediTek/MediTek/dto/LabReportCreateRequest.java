package com.mediTek.MediTek.dto;

import com.mediTek.MediTek.domain.LabReport;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record LabReportCreateRequest(
        @NotBlank @Size(max = 4000) String resultDetails,
        @NotNull LabReport.ResultClassification result,
        @NotBlank String reviewingDoctorId
) {
}
