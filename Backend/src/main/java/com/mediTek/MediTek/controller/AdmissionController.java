package com.mediTek.MediTek.controller;

import com.mediTek.MediTek.dto.AdmissionDto;
import com.mediTek.MediTek.dto.BedTransferRequest;
import com.mediTek.MediTek.service.AdmissionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admissions")
public class AdmissionController {

    private final AdmissionService admissionService;

    public AdmissionController(AdmissionService admissionService) {
        this.admissionService = admissionService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'STAFF')")
    public ResponseEntity<AdmissionDto> admitPatient(@Valid @RequestBody AdmissionDto dto) {
        AdmissionDto created = admissionService.admitPatient(dto);
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }

    @PostMapping("/transfer")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'STAFF')")
    public ResponseEntity<AdmissionDto> transferBed(@Valid @RequestBody BedTransferRequest request) {
        AdmissionDto transferred = admissionService.transferBed(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(transferred);
    }

    @PostMapping("/{id}/discharge")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'STAFF', 'DOCTOR')")
    public ResponseEntity<AdmissionDto> discharge(@PathVariable String id) {
        AdmissionDto discharged = admissionService.dischargePatient(id);
        return ResponseEntity.ok(discharged);
    }

    @GetMapping("/active")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'STAFF', 'DOCTOR')")
    public ResponseEntity<List<AdmissionDto>> getActiveAdmissions() {
        return ResponseEntity.ok(admissionService.getAllActiveAdmissions());
    }
}
