package com.mediTek.MediTek.service.impl;

import com.mediTek.MediTek.domain.*;
import com.mediTek.MediTek.dto.*;
import com.mediTek.MediTek.exception.ResourceNotFoundException;
import com.mediTek.MediTek.repository.*;
import com.mediTek.MediTek.security.CurrentUserService;
import com.mediTek.MediTek.service.BillingService;
import com.mediTek.MediTek.service.BusinessIdService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

@Service
public class BillingServiceImpl implements BillingService {

    private static final BigDecimal ZERO = new BigDecimal("0.00");
    private static final BigDecimal MAX_PERCENT = new BigDecimal("100.00");

    private final BillRepository billRepository;
    private final BillLineItemRepository lineItemRepository;
    private final BillPaymentRepository paymentRepository;
    private final PatientRepository patientRepository;
    private final AdmissionRepository admissionRepository;
    private final CurrentUserService currentUserService;
    private final BusinessIdService businessIdService;

    public BillingServiceImpl(BillRepository billRepository,
                              BillLineItemRepository lineItemRepository,
                              BillPaymentRepository paymentRepository,
                              PatientRepository patientRepository,
                              AdmissionRepository admissionRepository,
                              CurrentUserService currentUserService,
                              BusinessIdService businessIdService) {
        this.billRepository = billRepository;
        this.lineItemRepository = lineItemRepository;
        this.paymentRepository = paymentRepository;
        this.patientRepository = patientRepository;
        this.admissionRepository = admissionRepository;
        this.currentUserService = currentUserService;
        this.businessIdService = businessIdService;
    }

    @Override
    @Transactional(readOnly = true)
    public List<BillDto> getBills(String patientId, Bill.BillStatus status, String search) {
        Role.RoleName role = currentUserService.role();
        List<Bill> bills;
        if (role == Role.RoleName.PATIENT) {
            String personId = currentUserService.personId();
            if (patientId != null && !patientId.isBlank()
                    && patientRepository.findByPatientId(patientId)
                    .filter(patient -> patient.getPersonId().equals(personId)).isEmpty()) {
                throw new AccessDeniedException("Patients may view only their own invoices.");
            }
            bills = billRepository.findByPatient_PersonId(personId);
        } else if (role == Role.RoleName.SUPER_ADMIN || role == Role.RoleName.STAFF) {
            bills = billRepository.findAll();
            if (patientId != null && !patientId.isBlank()) {
                Patient patient = patientRepository.findByPatientId(patientId)
                        .orElseThrow(() -> new ResourceNotFoundException("Patient not found."));
                bills = bills.stream()
                        .filter(bill -> bill.getPatient().getPersonId().equals(patient.getPersonId()))
                        .toList();
            }
        } else {
            throw new AccessDeniedException("This role may not view invoices.");
        }

        String query = search == null ? "" : search.trim().toLowerCase(Locale.ROOT);
        return bills.stream()
                .filter(bill -> status == null || bill.getStatus() == status)
                .filter(bill -> query.isEmpty() || searchMatches(bill, query))
                .sorted(Comparator.comparing(Bill::getIssuedAt).reversed())
                .map(this::mapBill)
                .toList();
    }

    @Override
    @Transactional
    public BillDto createBill(BillCreateRequest request) {
        requireBillingRole();
        Patient patient = patientRepository.findByPatientId(request.patientId())
                .filter(value -> Boolean.TRUE.equals(value.getIsActive()))
                .orElseThrow(() -> new ResourceNotFoundException("Active patient not found."));

        Admission admission = null;
        if (request.admissionId() != null && !request.admissionId().isBlank()) {
            admission = admissionRepository.findById(request.admissionId())
                    .filter(value -> value.getPatient().getPersonId().equals(patient.getPersonId()))
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Admission not found for the selected patient."));
        }

        BigDecimal taxRate = request.taxRatePercent() == null
                ? ZERO : request.taxRatePercent().setScale(2, RoundingMode.UNNECESSARY);
        if (taxRate.compareTo(ZERO) < 0 || taxRate.compareTo(MAX_PERCENT) > 0) {
            throw new IllegalArgumentException("Tax rate must be between 0 and 100 percent.");
        }

        Bill bill = new Bill();
        bill.setBillId(businessIdService.nextId("bill", "BIL"));
        bill.setPatient(patient);
        bill.setAdmission(admission);
        bill.setIssuedAt(Instant.now());
        bill.setTaxRatePercent(taxRate);
        bill.setSubtotal(ZERO);
        bill.setTaxAmount(ZERO);
        bill.setAmountTotal(ZERO);
        bill.setAmountPaid(ZERO);
        bill.setStatus(Bill.BillStatus.PENDING);
        billRepository.save(bill);

        for (BillLineItemRequest itemRequest : request.items()) {
            lineItemRepository.save(createLineItem(bill, itemRequest));
        }
        recalculate(bill);
        return mapBill(billRepository.save(bill));
    }

    @Override
    @Transactional
    public BillDto addLineItem(String billId, BillLineItemRequest request) {
        Bill bill = editableBill(billId);
        lineItemRepository.save(createLineItem(bill, request));
        recalculate(bill);
        return mapBill(billRepository.save(bill));
    }

    @Override
    @Transactional
    public BillDto updateLineItem(String billId, String lineItemId, BillLineItemRequest request) {
        Bill bill = editableBill(billId);
        BillLineItem item = lineItemRepository.findById(lineItemId)
                .filter(value -> value.getBill().getBillId().equals(billId))
                .orElseThrow(() -> new ResourceNotFoundException("Invoice line item not found."));
        applyLineItem(item, request);
        lineItemRepository.save(item);
        recalculate(bill);
        return mapBill(billRepository.save(bill));
    }

    @Override
    @Transactional
    public BillDto removeLineItem(String billId, String lineItemId) {
        Bill bill = editableBill(billId);
        BillLineItem item = lineItemRepository.findById(lineItemId)
                .filter(value -> value.getBill().getBillId().equals(billId))
                .orElseThrow(() -> new ResourceNotFoundException("Invoice line item not found."));
        if (lineItemRepository.countByBill_BillId(billId) <= 1) {
            throw new IllegalStateException("An invoice must retain at least one line item.");
        }
        lineItemRepository.delete(item);
        recalculate(bill);
        return mapBill(billRepository.save(bill));
    }

    @Override
    @Transactional
    public BillDto recordPayment(String billId, BillPaymentRequest request) {
        Role.RoleName callerRole = currentUserService.role();
        if (callerRole == Role.RoleName.PATIENT) {
            Bill checkBill = billRepository.findById(billId)
                    .orElseThrow(() -> new ResourceNotFoundException("Invoice not found."));
            if (!checkBill.getPatient().getPersonId().equals(currentUserService.personId())) {
                throw new AccessDeniedException("Patients may only pay their own invoices.");
            }
        } else if (callerRole != Role.RoleName.SUPER_ADMIN && callerRole != Role.RoleName.STAFF) {
            throw new AccessDeniedException("This role may not record invoice payments.");
        }
        Bill bill = billRepository.findByIdForUpdate(billId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found."));
        if (bill.getStatus() == Bill.BillStatus.CANCELLED || bill.getStatus() == Bill.BillStatus.PAID) {
            throw new IllegalStateException("Payments are not accepted for this invoice.");
        }
        if (paymentRepository.existsByPaymentRequestId(request.paymentRequestId())) {
            throw new IllegalStateException("This payment request has already been recorded.");
        }

        BigDecimal requestedAmount = request.amount().setScale(2, RoundingMode.UNNECESSARY);
        BigDecimal balance = bill.getAmountTotal().subtract(bill.getAmountPaid());
        if (requestedAmount.compareTo(balance) > 0) {
            throw new IllegalStateException("Payment amount exceeds the outstanding balance.");
        }

        BillPayment payment = new BillPayment();
        payment.setPaymentId(businessIdService.nextId("bill_payment", "PAY"));
        payment.setBill(bill);
        payment.setRecordedBy(currentUserService.account());
        payment.setPaymentRequestId(request.paymentRequestId());
        payment.setAmount(requestedAmount);
        payment.setPaymentMethod(request.paymentMethod());
        payment.setPaidAt(Instant.now());
        paymentRepository.save(payment);

        bill.setAmountPaid(bill.getAmountPaid().add(requestedAmount).setScale(2, RoundingMode.HALF_UP));
        if (bill.getAmountPaid().compareTo(bill.getAmountTotal()) == 0) {
            bill.setStatus(Bill.BillStatus.PAID);
            bill.setPaidAt(payment.getPaidAt());
        } else {
            bill.setStatus(Bill.BillStatus.PARTIAL);
            bill.setPaidAt(null);
        }
        return mapBill(billRepository.save(bill));
    }

    private Bill editableBill(String billId) {
        requireBillingRole();
        Bill bill = billRepository.findByIdForUpdate(billId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found."));
        if (bill.getStatus() != Bill.BillStatus.PENDING
                || bill.getAmountPaid().compareTo(BigDecimal.ZERO) != 0) {
            throw new IllegalStateException("Invoice line items can be changed only before payments begin.");
        }
        return bill;
    }

    private BillLineItem createLineItem(Bill bill, BillLineItemRequest request) {
        BillLineItem item = new BillLineItem();
        item.setLineItemId(businessIdService.nextId("bill_line_item", "BLI"));
        item.setBill(bill);
        applyLineItem(item, request);
        return item;
    }

    private void applyLineItem(BillLineItem item, BillLineItemRequest request) {
        BigDecimal unitPrice = request.unitPrice().setScale(2, RoundingMode.UNNECESSARY);
        BigDecimal lineTotal = unitPrice.multiply(BigDecimal.valueOf(request.quantity()))
                .setScale(2, RoundingMode.HALF_UP);
        requireStorableAmount(lineTotal);
        item.setDescription(request.description().trim());
        item.setQuantity(request.quantity());
        item.setUnitPrice(unitPrice);
        item.setLineTotal(lineTotal);
    }

    private void recalculate(Bill bill) {
        BigDecimal subtotal = lineItemRepository.findByBill_BillIdOrderByLineItemId(bill.getBillId()).stream()
                .map(BillLineItem::getLineTotal)
                .reduce(ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
        requireStorableAmount(subtotal);
        if (subtotal.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalStateException("Invoice subtotal must be greater than zero.");
        }
        BigDecimal tax = subtotal.multiply(bill.getTaxRatePercent())
                .divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
        BigDecimal total = subtotal.add(tax).setScale(2, RoundingMode.HALF_UP);
        requireStorableAmount(tax);
        requireStorableAmount(total);
        bill.setSubtotal(subtotal);
        bill.setTaxAmount(tax);
        bill.setAmountTotal(total);
    }

    private void requireStorableAmount(BigDecimal amount) {
        if (amount.precision() - amount.scale() > 10) {
            throw new IllegalArgumentException("Invoice amount exceeds the supported maximum.");
        }
    }

    private boolean searchMatches(Bill bill, String query) {
        if (contains(bill.getBillId(), query)
                || contains(bill.getPatient().getPatientId(), query)
                || contains(bill.getPatient().getName(), query)) {
            return true;
        }
        return lineItemRepository.findByBill_BillIdOrderByLineItemId(bill.getBillId()).stream()
                .anyMatch(item -> contains(item.getDescription(), query));
    }

    private boolean contains(String value, String query) {
        return value != null && value.toLowerCase(Locale.ROOT).contains(query);
    }

    private void requireBillingRole() {
        Role.RoleName role = currentUserService.role();
        if (role != Role.RoleName.SUPER_ADMIN && role != Role.RoleName.STAFF) {
            throw new AccessDeniedException("This role may not manage invoices or payments.");
        }
    }

    private BillDto mapBill(Bill bill) {
        List<BillLineItemDto> items = lineItemRepository
                .findByBill_BillIdOrderByLineItemId(bill.getBillId()).stream()
                .map(item -> new BillLineItemDto(item.getLineItemId(), item.getDescription(),
                        item.getQuantity(), item.getUnitPrice(), item.getLineTotal()))
                .toList();
        List<BillPaymentDto> payments = paymentRepository
                .findByBill_BillIdOrderByPaidAt(bill.getBillId()).stream()
                .map(payment -> new BillPaymentDto(payment.getPaymentId(), payment.getAmount(),
                        payment.getPaymentMethod(), paymentName(payment.getRecordedBy()), payment.getPaidAt()))
                .toList();
        BigDecimal amountPaid = bill.getAmountPaid() == null ? ZERO : bill.getAmountPaid();
        BigDecimal total = bill.getAmountTotal() == null ? ZERO : bill.getAmountTotal();
        return new BillDto(
                bill.getBillId(),
                bill.getPatient().getPatientId(),
                bill.getPatient().getName(),
                bill.getAdmission() == null ? null : bill.getAdmission().getAdmissionId(),
                items,
                bill.getSubtotal(),
                bill.getTaxRatePercent(),
                bill.getTaxAmount(),
                total,
                amountPaid,
                total.subtract(amountPaid).setScale(2, RoundingMode.HALF_UP),
                bill.getStatus(),
                bill.getIssuedAt(),
                bill.getPaidAt(),
                payments);
    }

    private String paymentName(UserAccount account) {
        return account.getPerson() == null ? account.getUsername() : account.getPerson().getName();
    }
}
