package com.mediTek.MediTek.controller;

import com.mediTek.MediTek.dto.BillDto;
import com.mediTek.MediTek.service.BillingService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/patients/me/bills")
public class PatientBillingController {

    private final BillingService billingService;

    public PatientBillingController(BillingService billingService) {
        this.billingService = billingService;
    }

    @GetMapping
    @PreAuthorize("hasRole('PATIENT')")
    public List<BillDto> getCurrentPatientBills() {
        return billingService.getBills(null, null, null);
    }
}
