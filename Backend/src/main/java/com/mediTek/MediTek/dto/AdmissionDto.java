package com.mediTek.MediTek.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdmissionDto {
    private String admissionId;

    @NotBlank
    private String patientPersonId;
    private String patientName;

    @NotBlank
    private String bedId;
    private String bedNumber;
    private String wardId;
    private String wardName;

    @NotBlank
    private String admittingDoctorPersonId;
    private String admittingDoctorName;

    private Instant admissionDate;
    private Instant dischargeDate;
    private String status;
    private String reason;
    private String transferFromAdmissionId;
}
