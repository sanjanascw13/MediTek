package com.mediTek.MediTek.service;

import com.mediTek.MediTek.dto.BillCreateRequest;
import com.mediTek.MediTek.dto.BillDto;
import com.mediTek.MediTek.dto.BillLineItemRequest;
import com.mediTek.MediTek.dto.BillPaymentRequest;
import com.mediTek.MediTek.domain.Bill;

import java.util.List;

public interface BillingService {
    List<BillDto> getBills(String patientId, Bill.BillStatus status, String search);
    BillDto createBill(BillCreateRequest request);
    BillDto addLineItem(String billId, BillLineItemRequest request);
    BillDto updateLineItem(String billId, String lineItemId, BillLineItemRequest request);
    BillDto removeLineItem(String billId, String lineItemId);
    BillDto recordPayment(String billId, BillPaymentRequest request);
}
