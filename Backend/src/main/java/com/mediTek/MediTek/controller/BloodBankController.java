package com.mediTek.MediTek.controller;

import com.mediTek.MediTek.domain.BloodUnit;
import com.mediTek.MediTek.dto.*;
import com.mediTek.MediTek.service.BloodBankService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/blood-bank")
public class BloodBankController {

    private final BloodBankService bloodBankService;

    public BloodBankController(BloodBankService bloodBankService) {
        this.bloodBankService = bloodBankService;
    }

    @GetMapping("/banks")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'STAFF')")
    public List<BloodBankDto> getBloodBanks() {
        return bloodBankService.getBloodBanks();
    }

    @PostMapping("/banks")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public BloodBankDto createBloodBank(@Valid @RequestBody BloodBankCreateRequest request) {
        return bloodBankService.createBloodBank(request);
    }

    @GetMapping("/units")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'STAFF')")
    public List<BloodUnitDto> getBloodUnits(
            @RequestParam(required = false) String bloodType,
            @RequestParam(required = false) BloodUnit.BloodComponent component,
            @RequestParam(required = false) String search) {
        return bloodBankService.getBloodUnits(bloodType, component, search);
    }

    @PostMapping("/units")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'STAFF')")
    public BloodUnitDto receiveBloodUnit(@Valid @RequestBody BloodUnitCreateRequest request) {
        return bloodBankService.receiveBloodUnit(request);
    }

    @GetMapping("/issues")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'STAFF', 'PATIENT')")
    public List<BloodIssueDto> getBloodIssues() {
        return bloodBankService.getBloodIssues();
    }

    @PostMapping("/issues")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'STAFF')")
    public BloodIssueDto issueBlood(@Valid @RequestBody BloodIssueCreateRequest request) {
        return bloodBankService.issueBlood(request);
    }
}
