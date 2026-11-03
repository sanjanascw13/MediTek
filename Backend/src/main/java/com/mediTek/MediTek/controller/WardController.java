package com.mediTek.MediTek.controller;

import com.mediTek.MediTek.dto.WardCreateRequest;
import com.mediTek.MediTek.dto.WardDto;
import com.mediTek.MediTek.service.FacilityService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/wards")
public class WardController {

    private final FacilityService facilityService;

    public WardController(FacilityService facilityService) {
        this.facilityService = facilityService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'STAFF')")
    public ResponseEntity<List<WardDto>> getWards() {
        return ResponseEntity.ok(facilityService.getWards());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<WardDto> createWard(@Valid @RequestBody WardCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(facilityService.createWard(request));
    }
}
