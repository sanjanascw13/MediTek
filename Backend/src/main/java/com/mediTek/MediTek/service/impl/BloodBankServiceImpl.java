package com.mediTek.MediTek.service.impl;

import com.mediTek.MediTek.domain.*;
import com.mediTek.MediTek.dto.*;
import com.mediTek.MediTek.exception.ResourceNotFoundException;
import com.mediTek.MediTek.repository.BloodBankRepository;
import com.mediTek.MediTek.repository.BloodIssueRepository;
import com.mediTek.MediTek.repository.BloodUnitRepository;
import com.mediTek.MediTek.repository.PatientRepository;
import com.mediTek.MediTek.security.CurrentUserService;
import com.mediTek.MediTek.service.BloodBankService;
import com.mediTek.MediTek.service.BusinessIdService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Locale;

@Service
public class BloodBankServiceImpl implements BloodBankService {

    private final BloodBankRepository bloodBankRepository;
    private final BloodUnitRepository bloodUnitRepository;
    private final BloodIssueRepository bloodIssueRepository;
    private final PatientRepository patientRepository;
    private final BusinessIdService businessIdService;
    private final CurrentUserService currentUserService;

    public BloodBankServiceImpl(BloodBankRepository bloodBankRepository,
                                BloodUnitRepository bloodUnitRepository,
                                BloodIssueRepository bloodIssueRepository,
                                PatientRepository patientRepository,
                                BusinessIdService businessIdService,
                                CurrentUserService currentUserService) {
        this.bloodBankRepository = bloodBankRepository;
        this.bloodUnitRepository = bloodUnitRepository;
        this.bloodIssueRepository = bloodIssueRepository;
        this.patientRepository = patientRepository;
        this.businessIdService = businessIdService;
        this.currentUserService = currentUserService;
    }

    @Override
    @Transactional(readOnly = true)
    public List<BloodBankDto> getBloodBanks() {
        requireInventoryRole();
        return bloodBankRepository.findAll().stream()
                .filter(bank -> Boolean.TRUE.equals(bank.getIsActive()))
                .map(this::mapBloodBank)
                .toList();
    }

    @Override
    @Transactional
    public BloodBankDto createBloodBank(BloodBankCreateRequest request) {
        requireSuperAdmin();
        BloodBank bank = new BloodBank();
        bank.setBloodBankId(businessIdService.nextId("blood_bank", "BB"));
        bank.setName(request.name().trim());
        bank.setLocation(request.location().trim());
        bank.setIsActive(true);
        return mapBloodBank(bloodBankRepository.save(bank));
    }

    @Override
    @Transactional(readOnly = true)
    public List<BloodUnitDto> getBloodUnits(String bloodType, BloodUnit.BloodComponent component, String search) {
        requireInventoryRole();
        String typeFilter = bloodType == null ? "" : bloodType.trim();
        String query = search == null ? "" : search.trim().toLowerCase(Locale.ROOT);
        return bloodUnitRepository.findAll().stream()
                .filter(unit -> Boolean.TRUE.equals(unit.getBloodBank().getIsActive()))
                .filter(unit -> typeFilter.isEmpty()
                        || unit.getBloodType().databaseValue().equalsIgnoreCase(typeFilter))
                .filter(unit -> component == null || unit.getComponent() == component)
                .filter(unit -> query.isEmpty()
                        || unit.getUnitId().toLowerCase(Locale.ROOT).contains(query)
                        || unit.getBloodBank().getName().toLowerCase(Locale.ROOT).contains(query))
                .sorted((first, second) -> first.getExpirationDate().compareTo(second.getExpirationDate()))
                .map(this::mapBloodUnit)
                .toList();
    }

    @Override
    @Transactional
    public BloodUnitDto receiveBloodUnit(BloodUnitCreateRequest request) {
        requireStaffOrAdmin();
        LocalDate today = LocalDate.now();
        if (request.collectionDate().isAfter(today)) {
            throw new IllegalArgumentException("Collection date cannot be in the future.");
        }
        if (!request.expirationDate().isAfter(today)
                || !request.expirationDate().isAfter(request.collectionDate())) {
            throw new IllegalArgumentException("Expiration date must be after today and the collection date.");
        }
        BloodBank bank = bloodBankRepository.findById(request.bloodBankId())
                .filter(item -> Boolean.TRUE.equals(item.getIsActive()))
                .orElseThrow(() -> new ResourceNotFoundException("Active blood bank not found."));
        BloodUnit unit = new BloodUnit();
        unit.setUnitId(businessIdService.nextId("blood_unit", "BLD"));
        unit.setBloodBank(bank);
        unit.setBloodType(BloodType.fromDatabaseValue(request.bloodType()));
        unit.setComponent(request.component());
        unit.setCollectionDate(request.collectionDate());
        unit.setExpirationDate(request.expirationDate());
        unit.setQuantityMl(request.quantityMl());
        return mapBloodUnit(bloodUnitRepository.save(unit));
    }

    @Override
    @Transactional(readOnly = true)
    public List<BloodIssueDto> getBloodIssues() {
        Role.RoleName role = currentUserService.role();
        List<BloodIssue> issues;
        if (role == Role.RoleName.PATIENT) {
            issues = bloodIssueRepository.findByPatient_PersonIdOrderByIssuedAtDesc(currentUserService.personId());
        } else if (role == Role.RoleName.STAFF || role == Role.RoleName.SUPER_ADMIN) {
            issues = bloodIssueRepository.findAllByOrderByIssuedAtDesc();
        } else {
            throw new AccessDeniedException("This role may not view blood issue history.");
        }
        return issues.stream().map(this::mapBloodIssue).toList();
    }

    @Override
    @Transactional
    public BloodIssueDto issueBlood(BloodIssueCreateRequest request) {
        requireStaffOrAdmin();
        BloodUnit unit = bloodUnitRepository.findByIdForUpdate(request.unitId())
                .orElseThrow(() -> new ResourceNotFoundException("Blood unit not found."));
        if (unit.getExpirationDate().isBefore(LocalDate.now())) {
            throw new IllegalStateException("Expired blood units may not be issued.");
        }
        if (!Boolean.TRUE.equals(unit.getBloodBank().getIsActive())) {
            throw new IllegalStateException("Blood units from an inactive bank may not be issued.");
        }
        if (request.quantityMl() > unit.getQuantityMl()) {
            throw new IllegalStateException("Issue quantity exceeds the available blood volume.");
        }
        Patient patient = patientRepository.findByPatientId(request.patientId())
                .filter(item -> Boolean.TRUE.equals(item.getIsActive()))
                .orElseThrow(() -> new ResourceNotFoundException("Active patient not found."));
        if (!unit.getBloodType().databaseValue().equals(patient.getBloodGroup())) {
            throw new IllegalStateException("Blood unit type must match the patient's recorded blood group.");
        }

        unit.setQuantityMl(unit.getQuantityMl() - request.quantityMl());
        bloodUnitRepository.save(unit);
        BloodIssue issue = new BloodIssue();
        issue.setBloodIssueId(businessIdService.nextId("blood_issue", "BIS"));
        issue.setBloodUnit(unit);
        issue.setPatient(patient);
        issue.setIssuedBy(currentUserService.account());
        issue.setQuantityMl(request.quantityMl());
        issue.setPurpose(request.purpose() == null || request.purpose().isBlank()
                ? null : request.purpose().trim());
        return mapBloodIssue(bloodIssueRepository.save(issue));
    }

    private void requireInventoryRole() {
        Role.RoleName role = currentUserService.role();
        if (role != Role.RoleName.SUPER_ADMIN && role != Role.RoleName.STAFF
                && role != Role.RoleName.DOCTOR) {
            throw new AccessDeniedException("This role may not view blood inventory.");
        }
    }

    private void requireStaffOrAdmin() {
        Role.RoleName role = currentUserService.role();
        if (role != Role.RoleName.SUPER_ADMIN && role != Role.RoleName.STAFF) {
            throw new AccessDeniedException("Only Staff or Super Admin may manage blood inventory.");
        }
    }

    private void requireSuperAdmin() {
        if (currentUserService.role() != Role.RoleName.SUPER_ADMIN) {
            throw new AccessDeniedException("Only Super Admin may configure blood banks.");
        }
    }

    private BloodBankDto mapBloodBank(BloodBank bank) {
        return new BloodBankDto(bank.getBloodBankId(), bank.getName(), bank.getLocation());
    }

    private BloodUnitDto mapBloodUnit(BloodUnit unit) {
        String availability = unit.getExpirationDate().isBefore(LocalDate.now())
                ? "EXPIRED" : unit.getQuantityMl() == 0 ? "DEPLETED" : "AVAILABLE";
        return new BloodUnitDto(
                unit.getUnitId(),
                unit.getBloodBank().getBloodBankId(),
                unit.getBloodBank().getName(),
                unit.getBloodType().databaseValue(),
                unit.getComponent(),
                unit.getCollectionDate(),
                unit.getExpirationDate(),
                unit.getQuantityMl(),
                availability);
    }

    private BloodIssueDto mapBloodIssue(BloodIssue issue) {
        return new BloodIssueDto(
                issue.getBloodIssueId(),
                issue.getBloodUnit().getUnitId(),
                issue.getBloodUnit().getBloodType().databaseValue(),
                issue.getBloodUnit().getComponent().name(),
                issue.getPatient().getPatientId(),
                issue.getPatient().getName(),
                issue.getQuantityMl(),
                issue.getPurpose(),
                issue.getIssuedBy().getUsername(),
                issue.getIssuedAt());
    }
}
