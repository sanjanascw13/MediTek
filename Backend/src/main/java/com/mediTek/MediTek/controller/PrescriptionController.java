package com.mediTek.MediTek.controller;

import com.mediTek.MediTek.dto.*;
import com.mediTek.MediTek.service.PharmacyService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class PrescriptionController {

    private final PharmacyService pharmacyService;

    public PrescriptionController(PharmacyService pharmacyService) {
        this.pharmacyService = pharmacyService;
    }

    @GetMapping("/prescriptions")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'STAFF', 'PATIENT')")
    public List<PrescriptionDto> getPrescriptions() {
        return pharmacyService.getPrescriptions();
    }

    @PostMapping("/prescriptions")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'DOCTOR')")
    public PrescriptionDto createPrescription(@Valid @RequestBody PrescriptionCreateRequest request) {
        return pharmacyService.createPrescription(request);
    }

    @GetMapping("/dispensations")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'STAFF', 'PATIENT')")
    public List<DispensationDto> getDispensations() {
        return pharmacyService.getDispensations();
    }

    @PostMapping("/prescriptions/{prescriptionId}/dispensations")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'STAFF')")
    public DispensationDto dispense(@PathVariable String prescriptionId,
                                    @Valid @RequestBody DispenseRequest request) {
        return pharmacyService.dispense(prescriptionId, request);
    }
}
