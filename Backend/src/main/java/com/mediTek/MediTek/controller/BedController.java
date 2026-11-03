package com.mediTek.MediTek.controller;

import com.mediTek.MediTek.domain.Bed;
import com.mediTek.MediTek.dto.BedCreateRequest;
import com.mediTek.MediTek.dto.BedDto;
import com.mediTek.MediTek.dto.BedStatusUpdateRequest;
import com.mediTek.MediTek.service.FacilityService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/beds")
public class BedController {

    private final FacilityService facilityService;

    public BedController(FacilityService facilityService) {
        this.facilityService = facilityService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'STAFF')")
    public ResponseEntity<List<BedDto>> getBeds(
            @RequestParam(required = false) String wardId,
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(facilityService.getBeds(wardId, status));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<BedDto> createBed(@Valid @RequestBody BedCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(facilityService.createBed(request));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'STAFF')")
    public ResponseEntity<BedDto> updateStatus(
            @PathVariable String id,
            @Valid @RequestBody BedStatusUpdateRequest request) {
        return ResponseEntity.ok(facilityService.updateBedStatus(id, request.status()));
    }
}
