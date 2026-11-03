package com.mediTek.MediTek.service;

import com.mediTek.MediTek.domain.LabTest;
import com.mediTek.MediTek.domain.LabReport;
import com.mediTek.MediTek.dto.LabReportCreateRequest;
import com.mediTek.MediTek.dto.LabReportDto;
import com.mediTek.MediTek.dto.LabTestCreateRequest;
import com.mediTek.MediTek.dto.LabTestDto;

import java.util.List;

public interface LaboratoryService {
    List<LabTestDto> getTests(String patientId, LabTest.LabTestStatus status);
    LabTestDto createTest(LabTestCreateRequest request);
    LabTestDto updateStatus(String testId, String status);
    LabReportDto createReport(String testId, LabReportCreateRequest request);
    LabReportDto getReport(String testId);
}
