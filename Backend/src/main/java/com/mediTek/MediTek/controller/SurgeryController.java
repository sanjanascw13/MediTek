package com.mediTek.MediTek.controller;

import com.mediTek.MediTek.domain.Surgery;
import com.mediTek.MediTek.dto.OperatingTheaterDto;
import com.mediTek.MediTek.dto.SurgeryCreateRequest;
import com.mediTek.MediTek.dto.SurgeryDto;
import com.mediTek.MediTek.dto.SurgeryStatusRequest;
import com.mediTek.MediTek.service.SurgeryService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class SurgeryController {

    private final SurgeryService surgeryService;

    public SurgeryController(SurgeryService surgeryService) {
        this.surgeryService = surgeryService;
    }

    @GetMapping("/operating-theaters")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'STAFF')")
    public List<OperatingTheaterDto> getOperatingTheaters() {
        return surgeryService.getOperatingTheaters();
    }

    @GetMapping("/surgeries")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'STAFF', 'PATIENT')")
    public List<SurgeryDto> getSurgeries(
            @RequestParam(required = false) String patientId,
            @RequestParam(required = false) Surgery.SurgeryStatus status,
            @RequestParam(required = false) String search) {
        return surgeryService.getSurgeries(patientId, status, search);
    }

    @PostMapping("/surgeries")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'DOCTOR')")
    public SurgeryDto createSurgery(@Valid @RequestBody SurgeryCreateRequest request) {
        return surgeryService.createSurgery(request);
    }

    @PatchMapping("/surgeries/{surgeryId}/status")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'STAFF')")
    public SurgeryDto updateStatus(@PathVariable String surgeryId,
                                   @Valid @RequestBody SurgeryStatusRequest request) {
        return surgeryService.updateStatus(surgeryId, request.status());
    }
}
