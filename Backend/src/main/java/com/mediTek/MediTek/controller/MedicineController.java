package com.mediTek.MediTek.controller;

import com.mediTek.MediTek.dto.MedicineCreateRequest;
import com.mediTek.MediTek.dto.MedicineDto;
import com.mediTek.MediTek.service.PharmacyService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/medicines")
public class MedicineController {

    private final PharmacyService pharmacyService;

    public MedicineController(PharmacyService pharmacyService) {
        this.pharmacyService = pharmacyService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'STAFF', 'PATIENT')")
    public List<MedicineDto> getMedicines(@RequestParam(required = false) String search) {
        return pharmacyService.getMedicines(search);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<MedicineDto> createMedicine(@Valid @RequestBody MedicineCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(pharmacyService.createMedicine(request));
    }
}
