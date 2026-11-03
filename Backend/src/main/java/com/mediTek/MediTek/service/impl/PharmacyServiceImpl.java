package com.mediTek.MediTek.service.impl;

import com.mediTek.MediTek.domain.*;
import com.mediTek.MediTek.dto.*;
import com.mediTek.MediTek.exception.ResourceNotFoundException;
import com.mediTek.MediTek.repository.*;
import com.mediTek.MediTek.security.CurrentUserService;
import com.mediTek.MediTek.service.BusinessIdService;
import com.mediTek.MediTek.service.PharmacyService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class PharmacyServiceImpl implements PharmacyService {

    private final MedicineRepository medicineRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final PrescriptionItemRepository prescriptionItemRepository;
    private final MedicineDispensationRepository dispensationRepository;
    private final BusinessIdService businessIdService;
    private final CurrentUserService currentUserService;

    public PharmacyServiceImpl(MedicineRepository medicineRepository, PatientRepository patientRepository,
                              DoctorRepository doctorRepository, PrescriptionRepository prescriptionRepository,
                              PrescriptionItemRepository prescriptionItemRepository,
                              MedicineDispensationRepository dispensationRepository,
                              BusinessIdService businessIdService, CurrentUserService currentUserService) {
        this.medicineRepository = medicineRepository;
        this.patientRepository = patientRepository;
        this.doctorRepository = doctorRepository;
        this.prescriptionRepository = prescriptionRepository;
        this.prescriptionItemRepository = prescriptionItemRepository;
        this.dispensationRepository = dispensationRepository;
        this.businessIdService = businessIdService;
        this.currentUserService = currentUserService;
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
    @Transactional(readOnly = true)
    public List<PrescriptionDto> getPrescriptions() {
        Role.RoleName role = currentUserService.role();
        List<Prescription> prescriptions;
        if (role == Role.RoleName.PATIENT) {
            prescriptions = prescriptionRepository.findByPatient_PersonId(currentUserService.personId());
        } else if (role == Role.RoleName.DOCTOR) {
            prescriptions = prescriptionRepository.findByDoctor_PersonId(currentUserService.personId());
        } else if (role == Role.RoleName.STAFF || role == Role.RoleName.SUPER_ADMIN) {
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
        if (role != Role.RoleName.DOCTOR && role != Role.RoleName.SUPER_ADMIN) {
            throw new AccessDeniedException("Only a Doctor or Super Admin may issue a prescription.");
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
        for (PrescriptionCreateRequest.Item requestItem : request.items()) {
            Medicine medicine = medicineRepository.findById(requestItem.medicineId())
                    .filter(m -> Boolean.TRUE.equals(m.getIsActive()))
                    .orElseThrow(() -> new ResourceNotFoundException("Active medicine not found."));
            PrescriptionItem item = new PrescriptionItem();
            item.setItemId(businessIdService.nextId("prescription_item", "PRI"));
            item.setPrescription(prescription);
            item.setMedicine(medicine);
            item.setMedicineName(medicine.getName());
            item.setPrescribedQuantity(requestItem.prescribedQuantity());
            item.setDosage(requestItem.dosage().trim());
            item.setFrequency(requestItem.frequency().trim());
            item.setDurationDays(requestItem.durationDays());
            item.setQuantityDispensed(0);
            prescription.getItems().add(item);
        }
        return mapPrescription(prescriptionRepository.save(prescription));
    }

    @Override
    @Transactional(readOnly = true)
    public List<DispensationDto> getDispensations() {
        Role.RoleName role = currentUserService.role();
        List<MedicineDispensation> dispensations = dispensationRepository.findAllByOrderByDispensedAtDesc();
        if (role == Role.RoleName.PATIENT) {
            String personId = currentUserService.personId();
            dispensations = dispensations.stream()
                    .filter(record -> record.getPatient().getPersonId().equals(personId)).toList();
        } else if (role == Role.RoleName.DOCTOR) {
            String personId = currentUserService.personId();
            dispensations = dispensations.stream()
                    .filter(record -> record.getPrescription().getDoctor().getPersonId().equals(personId)).toList();
        } else if (role != Role.RoleName.STAFF && role != Role.RoleName.SUPER_ADMIN) {
            throw new AccessDeniedException("This role may not view dispensing history.");
        }
        return dispensations.stream().map(this::mapDispensation).toList();
    }

    @Override
    @Transactional
    public DispensationDto dispense(String prescriptionId, DispenseRequest request) {
        Role.RoleName role = currentUserService.role();
        if (role != Role.RoleName.STAFF && role != Role.RoleName.SUPER_ADMIN) {
            throw new AccessDeniedException("Only Pharmacy Staff or a Super Admin may dispense medicine.");
        }
        PrescriptionItem item = prescriptionItemRepository.findByIdForUpdate(request.prescriptionItemId())
                .orElseThrow(() -> new ResourceNotFoundException("Prescription item not found."));
        Prescription prescription = item.getPrescription();
        if (!prescription.getPrescriptionId().equals(prescriptionId)) {
            throw new IllegalArgumentException("Prescription item does not belong to the requested prescription.");
        }
        if (!Boolean.TRUE.equals(prescription.getPatient().getIsActive())) {
            throw new IllegalStateException("Medicine may not be dispensed to an inactive patient.");
        }

        Medicine medicine = medicineRepository.findByIdForUpdate(item.getMedicine().getMedicineId())
                .orElseThrow(() -> new ResourceNotFoundException("Medicine not found."));
        if (!Boolean.TRUE.equals(medicine.getIsActive())) {
            throw new IllegalStateException("Inactive medicine may not be dispensed.");
        }
        int quantity = request.quantity();
        int remaining = item.getPrescribedQuantity() - item.getQuantityDispensed();
        if (quantity > remaining) {
            throw new IllegalStateException("Dispensed quantity exceeds the remaining prescribed quantity.");
        }
        if (quantity > medicine.getQuantity()) {
            throw new IllegalStateException("Dispensed quantity exceeds available medicine stock.");
        }

        medicine.setQuantity(medicine.getQuantity() - quantity);
        item.setQuantityDispensed(item.getQuantityDispensed() + quantity);
        MedicineDispensation dispensation = new MedicineDispensation();
        dispensation.setDispensationId(businessIdService.nextId("dispensation", "DSP"));
        dispensation.setPrescription(prescription);
        dispensation.setPrescriptionItem(item);
        dispensation.setMedicine(medicine);
        dispensation.setPatient(prescription.getPatient());
        dispensation.setDispensedBy(currentUserService.account());
        dispensation.setQuantity(quantity);
        dispensation.setUnitPrice(medicine.getPrice());
        return mapDispensation(dispensationRepository.save(dispensation));
    }

    private MedicineDto mapMedicine(Medicine medicine) {
        return new MedicineDto(medicine.getMedicineId(), medicine.getName(), medicine.getCategory(),
                medicine.getQuantity(), medicine.getPrice());
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
