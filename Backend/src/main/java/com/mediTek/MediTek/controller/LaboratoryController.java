package com.mediTek.MediTek.controller;

import com.mediTek.MediTek.domain.LabTest;
import com.mediTek.MediTek.dto.*;
import com.mediTek.MediTek.service.LaboratoryService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/lab-tests")
public class LaboratoryController {

    private final LaboratoryService laboratoryService;

    public LaboratoryController(LaboratoryService laboratoryService) {
        this.laboratoryService = laboratoryService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'STAFF', 'PATIENT')")
    public List<LabTestDto> getTests(
            @RequestParam(required = false) String patientId,
            @RequestParam(required = false) LabTest.LabTestStatus status) {
        return laboratoryService.getTests(patientId, status);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'DOCTOR')")
    public LabTestDto createTest(@Valid @RequestBody LabTestCreateRequest request) {
        return laboratoryService.createTest(request);
    }

    @PatchMapping("/{testId}/status")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'STAFF')")
    public LabTestDto updateStatus(@PathVariable String testId,
                                   @Valid @RequestBody LabTestStatusRequest request) {
        return laboratoryService.updateStatus(testId, request.status());
    }

    @PostMapping("/{testId}/report")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'STAFF')")
    public LabReportDto createReport(@PathVariable String testId,
                                     @Valid @RequestBody LabReportCreateRequest request) {
        return laboratoryService.createReport(testId, request);
    }

    @GetMapping("/{testId}/report")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'STAFF', 'PATIENT')")
    public LabReportDto getReport(@PathVariable String testId) {
        return laboratoryService.getReport(testId);
    }
}
