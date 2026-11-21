package com.mediTek.MediTek.service.impl;

import com.mediTek.MediTek.domain.*;
import com.mediTek.MediTek.dto.*;
import com.mediTek.MediTek.exception.ResourceNotFoundException;
import com.mediTek.MediTek.repository.*;
import com.mediTek.MediTek.security.CurrentUserService;
import com.mediTek.MediTek.service.BillingService;
import com.mediTek.MediTek.service.BusinessIdService;
import com.mediTek.MediTek.service.PharmacyService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Service
public class PharmacyServiceImpl implements PharmacyService {

    private static final Logger log = LoggerFactory.getLogger(PharmacyServiceImpl.class);

    private final MedicineRepository medicineRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final PrescriptionItemRepository prescriptionItemRepository;
    private final MedicineDispensationRepository dispensationRepository;
    private final DepartmentRepository departmentRepository;
    private final BusinessIdService businessIdService;
    private final CurrentUserService currentUserService;
    private final BillRepository billRepository;
    private final BillingService billingService;

    public PharmacyServiceImpl(MedicineRepository medicineRepository, PatientRepository patientRepository,
                              DoctorRepository doctorRepository, PrescriptionRepository prescriptionRepository,
                              PrescriptionItemRepository prescriptionItemRepository,
                              MedicineDispensationRepository dispensationRepository,
                              DepartmentRepository departmentRepository,
                              BusinessIdService businessIdService, CurrentUserService currentUserService,
                              BillRepository billRepository, BillingService billingService) {
        this.medicineRepository = medicineRepository;
        this.patientRepository = patientRepository;
        this.doctorRepository = doctorRepository;
        this.prescriptionRepository = prescriptionRepository;
        this.prescriptionItemRepository = prescriptionItemRepository;
        this.dispensationRepository = dispensationRepository;
        this.departmentRepository = departmentRepository;
        this.businessIdService = businessIdService;
        this.currentUserService = currentUserService;
        this.billRepository = billRepository;
        this.billingService = billingService;
    }

    @Override
    @Transactional(readOnly = true)
    public List<MedicineDto> getMedicines(String search) {
        String query = search == null ? "" : search.trim();
        List<Medicine> medicines = query.isEmpty()
                ? medicineRepository.findByIsActiveTrueOrderByNameAsc()
                : medicineRepository.findByIsActiveTrueAndNameContainingIgnoreCaseOrderByNameAsc(query);
        return medicines.stream().map(this::mapMedicine).toList();
    }

    @Override
    @Transactional
    public MedicineDto createMedicine(MedicineCreateRequest request) {
        Department department = null;
        if (request.departmentId() != null && !request.departmentId().isBlank()) {
            department = departmentRepository.findById(request.departmentId().trim())
                    .orElseThrow(() -> new ResourceNotFoundException("Department not found: " + request.departmentId()));
        }
        Medicine medicine = new Medicine();
        medicine.setMedicineId(businessIdService.nextId("medicine", "MED"));
        medicine.setName(request.name().trim());
        medicine.setCategory(request.category() != null ? request.category().trim() : null);
        medicine.setPrice(request.price());
        medicine.setQuantity(request.stockQuantity() != null ? request.stockQuantity() : 0);
        medicine.setIsActive(true);
        medicine.setDepartment(department);
        return mapMedicine(medicineRepository.save(medicine));
    }

    @Override
    @Transactional
    public MedicineDto updateStock(String medicineId, int quantityChange) {
        Role.RoleName role = currentUserService.role();
        if (role != Role.RoleName.STAFF && role != Role.RoleName.SUPER_ADMIN && role != Role.RoleName.ADMIN) {
            throw new AccessDeniedException("Only staff and administrators may update medicine stock.");
        }
        Medicine medicine = medicineRepository.findByIdForUpdate(medicineId)
                .orElseThrow(() -> new ResourceNotFoundException("Medicine not found: " + medicineId));
        int updated = Math.max(0, medicine.getQuantity() + quantityChange);
        medicine.setQuantity(updated);
        log.info("Updated medicine {} stock by {} -> new stock: {}", medicineId, quantityChange, updated);
        return mapMedicine(medicineRepository.save(medicine));
    }

    @Override
    @Transactional(readOnly = true)
    public List<PrescriptionDto> getPrescriptions() {
        Role.RoleName role = currentUserService.role();
        List<Prescription> prescriptions;
        if (role == Role.RoleName.PATIENT) {
            prescriptions = prescriptionRepository.findByPatient_PersonId(currentUserService.personId());
        } else if (role == Role.RoleName.DOCTOR) {
            prescriptions = prescriptionRepository.findByDoctor_PersonId(currentUserService.personId());
        } else if (role == Role.RoleName.STAFF || role == Role.RoleName.SUPER_ADMIN || role == Role.RoleName.ADMIN) {
            prescriptions = prescriptionRepository.findAll();
        } else {
            throw new AccessDeniedException("This role may not view prescriptions.");
        }
        return prescriptions.stream().map(this::mapPrescription).toList();
    }

    @Override
    @Transactional
    public PrescriptionDto createPrescription(PrescriptionCreateRequest request) {
        Role.RoleName role = currentUserService.role();
        if (role != Role.RoleName.DOCTOR && role != Role.RoleName.SUPER_ADMIN && role != Role.RoleName.ADMIN) {
            throw new AccessDeniedException("Only a Doctor or Administrator may issue a prescription.");
        }
        Patient patient = patientRepository.findByPatientId(request.patientId())
                .filter(p -> Boolean.TRUE.equals(p.getIsActive()))
                .orElseThrow(() -> new ResourceNotFoundException("Active patient not found."));
        Doctor doctor;
        if (role == Role.RoleName.DOCTOR) {
            doctor = doctorRepository.findById(currentUserService.personId())
                    .orElseThrow(() -> new AccessDeniedException("Doctor profile not found."));
            if (request.doctorId() != null && !request.doctorId().isBlank()
                    && !doctor.getDoctorId().equals(request.doctorId())) {
                throw new AccessDeniedException("Doctors may issue prescriptions only under their own profile.");
            }
        } else {
            doctor = doctorRepository.findByDoctorId(request.doctorId())
                    .filter(d -> Boolean.TRUE.equals(d.getIsActive()))
                    .orElseThrow(() -> new ResourceNotFoundException("Active prescribing Doctor not found."));
        }
        if (!Boolean.TRUE.equals(doctor.getIsActive())) {
            throw new IllegalStateException("Prescriptions require an active Doctor.");
        }

        Prescription prescription = new Prescription();
        prescription.setPrescriptionId(businessIdService.nextId("prescription", "PRE"));
        prescription.setPatient(patient);
        prescription.setDoctor(doctor);
        prescription.setNotes(request.instructions());

        Prescription saved = prescriptionRepository.save(prescription);

        for (PrescriptionCreateRequest.Item itemReq : request.items()) {
            Medicine medicine = medicineRepository.findById(itemReq.medicineId())
                    .filter(m -> Boolean.TRUE.equals(m.getIsActive()))
                    .orElseThrow(() -> new ResourceNotFoundException("Active medicine not found: " + itemReq.medicineId()));

            PrescriptionItem item = new PrescriptionItem();
            item.setItemId(businessIdService.nextId("prescription_item", "PRI"));
            item.setPrescription(saved);
            item.setMedicine(medicine);
            item.setMedicineName(medicine.getName());
            item.setPrescribedQuantity(itemReq.prescribedQuantity());
            item.setQuantityDispensed(0);
            item.setDosage(itemReq.dosage());
            item.setFrequency(itemReq.frequency());
            item.setDurationDays(itemReq.durationDays());

            PrescriptionItem savedItem = prescriptionItemRepository.save(item);
            saved.getItems().add(savedItem);
        }

        return mapPrescription(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DispensationDto> getDispensations() {
        Role.RoleName role = currentUserService.role();
        if (role == Role.RoleName.PATIENT) {
            return dispensationRepository.findByPatient_PersonIdOrderByDispensedAtDesc(currentUserService.personId())
                    .stream().map(this::mapDispensation).toList();
        } else if (role == Role.RoleName.STAFF || role == Role.RoleName.SUPER_ADMIN || role == Role.RoleName.ADMIN || role == Role.RoleName.DOCTOR) {
            return dispensationRepository.findAllByOrderByDispensedAtDesc()
                    .stream().map(this::mapDispensation).toList();
        }
        throw new AccessDeniedException("This role may not view dispensations.");
    }

    @Override
    @Transactional
    public DispensationDto dispense(String prescriptionId, DispenseRequest request) {
        Role.RoleName role = currentUserService.role();
        if (role != Role.RoleName.STAFF && role != Role.RoleName.SUPER_ADMIN && role != Role.RoleName.ADMIN) {
            throw new AccessDeniedException("Only staff may record medicine dispensations.");
        }

        Prescription prescription = prescriptionRepository.findById(prescriptionId)
                .orElseThrow(() -> new ResourceNotFoundException("Prescription not found: " + prescriptionId));

        PrescriptionItem item = prescriptionItemRepository.findById(request.prescriptionItemId())
                .orElseThrow(() -> new ResourceNotFoundException("Prescription line item not found: " + request.prescriptionItemId()));

        if (!item.getPrescription().getPrescriptionId().equals(prescription.getPrescriptionId())) {
            throw new IllegalArgumentException("Prescription line item does not belong to this prescription.");
        }

        int quantity = request.quantity();
        int remaining = item.getPrescribedQuantity() - item.getQuantityDispensed();
        if (quantity <= 0 || quantity > remaining) {
            throw new IllegalArgumentException("Invalid dispensation quantity. Remaining: " + remaining);
        }

        Medicine medicine = medicineRepository.findByIdForUpdate(item.getMedicine().getMedicineId())
                .orElseThrow(() -> new ResourceNotFoundException("Medicine not found."));

        if (medicine.getQuantity() < quantity) {
            throw new IllegalStateException("Insufficient inventory. In stock: " + medicine.getQuantity());
        }

        medicine.setQuantity(medicine.getQuantity() - quantity);
        medicineRepository.save(medicine);

        item.setQuantityDispensed(item.getQuantityDispensed() + quantity);
        prescriptionItemRepository.save(item);

        UserAccount dispensedBy = currentUserService.account();

        MedicineDispensation dispensation = new MedicineDispensation();
        dispensation.setDispensationId(businessIdService.nextId("dispensation", "DSP"));
        dispensation.setPrescription(prescription);
        dispensation.setPrescriptionItem(item);
        dispensation.setMedicine(medicine);
        dispensation.setPatient(prescription.getPatient());
        dispensation.setDispensedBy(dispensedBy);
        dispensation.setQuantity(quantity);
        dispensation.setUnitPrice(medicine.getPrice());
        MedicineDispensation savedDispensation = dispensationRepository.save(dispensation);

        // Automatically dispatch medication bill line item to the Billing Officer
        try {
            String itemDesc = "Prescription " + prescription.getPrescriptionId() + ": " + medicine.getName() + " (" + medicine.getCategory() + ")";
            BillLineItemRequest itemReq = new BillLineItemRequest(itemDesc, quantity, medicine.getPrice());
            List<Bill> patientBills = billRepository.findByPatient_PersonId(prescription.getPatient().getPersonId());
            Optional<Bill> pendingBillOpt = patientBills.stream()
                    .filter(b -> b.getStatus() == Bill.BillStatus.PENDING)
                    .findFirst();

            if (pendingBillOpt.isPresent()) {
                billingService.addLineItem(pendingBillOpt.get().getBillId(), itemReq);
                log.info("Appended medication dispensation {} to pending bill {}", savedDispensation.getDispensationId(), pendingBillOpt.get().getBillId());
            } else {
                BillCreateRequest createReq = new BillCreateRequest(
                        prescription.getPatient().getPatientId(),
                        null,
                        BigDecimal.ZERO,
                        List.of(itemReq)
                );
                BillDto createdBill = billingService.createBill(createReq);
                log.info("Created new pharmacy bill {} for patient {}", createdBill.billId(), prescription.getPatient().getPatientId());
            }
        } catch (Exception billingEx) {
            log.warn("Could not automatically create/attach bill for dispensation {}: {}",
                    savedDispensation.getDispensationId(), billingEx.getMessage());
        }

        return mapDispensation(savedDispensation);
    }

    private MedicineDto mapMedicine(Medicine medicine) {
        String departmentId = medicine.getDepartment() != null ? medicine.getDepartment().getDepartmentId() : null;
        String departmentName = medicine.getDepartment() != null ? medicine.getDepartment().getDepartmentName() : null;
        return new MedicineDto(
                medicine.getMedicineId(),
                medicine.getName(),
                medicine.getCategory(),
                medicine.getQuantity(),
                medicine.getPrice(),
                departmentId,
                departmentName
        );
    }

    private PrescriptionDto mapPrescription(Prescription prescription) {
        List<PrescriptionDto.Item> items = prescription.getItems().stream()
                .map(item -> new PrescriptionDto.Item(
                        item.getItemId(),
                        item.getMedicine().getMedicineId(),
                        item.getMedicineName(),
                        item.getPrescribedQuantity(),
                        item.getQuantityDispensed(),
                        item.getPrescribedQuantity() - item.getQuantityDispensed(),
                        item.getDosage(),
                        item.getFrequency(),
                        item.getDurationDays()))
                .toList();
        return new PrescriptionDto(
                prescription.getPrescriptionId(),
                prescription.getPatient().getPatientId(),
                prescription.getPatient().getName(),
                prescription.getDoctor().getDoctorId(),
                prescription.getDoctor().getName(),
                prescription.getIssuedAt(),
                prescription.getNotes(),
                items);
    }

    private DispensationDto mapDispensation(MedicineDispensation record) {
        return new DispensationDto(
                record.getDispensationId(),
                record.getPrescription().getPrescriptionId(),
                record.getPrescriptionItem().getItemId(),
                record.getMedicine().getMedicineId(),
                record.getMedicine().getName(),
                record.getPatient().getPatientId(),
                record.getPatient().getName(),
                record.getQuantity(),
                record.getUnitPrice(),
                record.getDispensedBy().getUsername(),
                record.getDispensedAt());
    }
}
