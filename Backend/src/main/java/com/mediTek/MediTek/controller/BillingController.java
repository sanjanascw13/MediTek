package com.mediTek.MediTek.controller;

import com.mediTek.MediTek.domain.Bill;
import com.mediTek.MediTek.dto.BillCreateRequest;
import com.mediTek.MediTek.dto.BillDto;
import com.mediTek.MediTek.dto.BillLineItemRequest;
import com.mediTek.MediTek.dto.BillPaymentRequest;
import com.mediTek.MediTek.service.BillingService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bills")
public class BillingController {

    private final BillingService billingService;

    public BillingController(BillingService billingService) {
        this.billingService = billingService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'STAFF', 'PATIENT')")
    public List<BillDto> getBills(
            @RequestParam(required = false) String patientId,
            @RequestParam(required = false) Bill.BillStatus status,
            @RequestParam(required = false) String search) {
        return billingService.getBills(patientId, status, search);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'STAFF')")
    public BillDto createBill(@Valid @RequestBody BillCreateRequest request) {
        return billingService.createBill(request);
    }

    @PostMapping("/{billId}/items")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'STAFF')")
    public BillDto addLineItem(@PathVariable String billId,
                               @Valid @RequestBody BillLineItemRequest request) {
        return billingService.addLineItem(billId, request);
    }

    @PutMapping("/{billId}/items/{lineItemId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'STAFF')")
    public BillDto updateLineItem(@PathVariable String billId,
                                  @PathVariable String lineItemId,
                                  @Valid @RequestBody BillLineItemRequest request) {
        return billingService.updateLineItem(billId, lineItemId, request);
    }

    @DeleteMapping("/{billId}/items/{lineItemId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'STAFF')")
    public BillDto removeLineItem(@PathVariable String billId,
                                  @PathVariable String lineItemId) {
        return billingService.removeLineItem(billId, lineItemId);
    }

    @PostMapping("/{billId}/payments")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'STAFF', 'PATIENT')")
    public BillDto recordPayment(@PathVariable String billId,
                                 @Valid @RequestBody BillPaymentRequest request) {
        return billingService.recordPayment(billId, request);
    }
}
