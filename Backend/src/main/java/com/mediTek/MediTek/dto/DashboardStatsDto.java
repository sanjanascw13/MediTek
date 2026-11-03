package com.mediTek.MediTek.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardStatsDto {
    private long newPatients;
    private long appointments;
    private Double earning;
    private Long operations;
    private List<Map<String, Object>> patientDistributions;
    private List<Map<String, Object>> recentOperations;

    // Role-specific operational and clinical metrics:
    private String role;
    private Long activeAdmissions;
    private Long availableBeds;
    private Long totalBeds;
    private Long occupiedBeds;
    private Long totalDoctors;
    private Long totalStaff;
    private Long pendingLabTests;
    private Long bloodUnitsInStock;
    private Double outstandingBalance;
    private Double totalPaid;
    private Long medicalRecordsCount;
    private Long labReportsCount;
}
