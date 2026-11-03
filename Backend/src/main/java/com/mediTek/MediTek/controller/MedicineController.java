package com.mediTek.MediTek.controller;

import com.mediTek.MediTek.dto.MedicineDto;
import com.mediTek.MediTek.service.PharmacyService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

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
}
