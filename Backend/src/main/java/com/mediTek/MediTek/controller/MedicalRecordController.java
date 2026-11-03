package com.mediTek.MediTek.controller;

import com.mediTek.MediTek.dto.MedicalRecordCreateRequest;
import com.mediTek.MediTek.dto.MedicalRecordDto;
import com.mediTek.MediTek.service.MedicalRecordService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class MedicalRecordController {

    private final MedicalRecordService medicalRecordService;

    public MedicalRecordController(MedicalRecordService medicalRecordService) {
        this.medicalRecordService = medicalRecordService;
    }

    @GetMapping("/medical-records")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'STAFF', 'PATIENT')")
    public List<MedicalRecordDto> getMedicalRecords(
            @RequestParam(required = false) String patientId) {
        return medicalRecordService.getMedicalRecords(patientId);
    }

    @GetMapping("/patients/me/medical-records")
    @PreAuthorize("hasRole('PATIENT')")
    public List<MedicalRecordDto> getCurrentPatientRecords() {
        return medicalRecordService.getCurrentPatientRecords();
    }

    @PostMapping("/medical-records")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('DOCTOR', 'STAFF')")
    public MedicalRecordDto createMedicalRecord(
            @Valid @RequestBody MedicalRecordCreateRequest request) {
        return medicalRecordService.createMedicalRecord(request);
    }
}
