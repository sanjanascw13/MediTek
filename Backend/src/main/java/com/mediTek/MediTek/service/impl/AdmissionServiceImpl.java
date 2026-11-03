package com.mediTek.MediTek.service.impl;

import com.mediTek.MediTek.domain.*;
import com.mediTek.MediTek.dto.AdmissionDto;
import com.mediTek.MediTek.dto.BedTransferRequest;
import com.mediTek.MediTek.exception.ResourceNotFoundException;
import com.mediTek.MediTek.repository.*;
import com.mediTek.MediTek.security.CurrentUserService;
import com.mediTek.MediTek.service.AdmissionService;
import com.mediTek.MediTek.service.BusinessIdService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class AdmissionServiceImpl implements AdmissionService {

    private final AdmissionRepository admissionRepository;
    private final PatientRepository patientRepository;
    private final BedRepository bedRepository;
    private final DoctorRepository doctorRepository;
    private final BusinessIdService businessIdService;
    private final CurrentUserService currentUserService;

    public AdmissionServiceImpl(AdmissionRepository admissionRepository,
                                PatientRepository patientRepository,
                                BedRepository bedRepository,
                                DoctorRepository doctorRepository,
                                BusinessIdService businessIdService,
                                CurrentUserService currentUserService) {
        this.admissionRepository = admissionRepository;
        this.patientRepository = patientRepository;
        this.bedRepository = bedRepository;
        this.doctorRepository = doctorRepository;
        this.businessIdService = businessIdService;
        this.currentUserService = currentUserService;
    }

    @Override
    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public AdmissionDto admitPatient(AdmissionDto dto) {
        Patient requestedPatient = patientRepository.findById(dto.getPatientPersonId())
                .or(() -> patientRepository.findByPatientId(dto.getPatientPersonId()))
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found."));
        Patient patient = patientRepository.findByIdForUpdate(requestedPatient.getPersonId())
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found."));
        if (!Boolean.TRUE.equals(patient.getIsActive())) {
            throw new IllegalStateException("Inactive patients cannot be admitted.");
        }

        Bed bed = bedRepository.findByIdForUpdate(dto.getBedId())
                .orElseThrow(() -> new ResourceNotFoundException("Bed not found."));

        if (bed.getOperationalStatus() != Bed.BedOperationalStatus.AVAILABLE) {
            throw new IllegalStateException("Bed is not AVAILABLE for admission.");
        }
        if (admissionRepository.existsByBed_BedIdAndStatus(bed.getBedId(), Admission.AdmissionStatus.ACTIVE)) {
            throw new IllegalStateException("Bed already has an active admission.");
        }
        if (admissionRepository.existsByPatient_PersonIdAndStatus(
                patient.getPersonId(), Admission.AdmissionStatus.ACTIVE)) {
            throw new IllegalStateException("Patient already has an active admission.");
        }
        Doctor doctor = doctorRepository.findById(dto.getAdmittingDoctorPersonId())
                .or(() -> doctorRepository.findByDoctorId(dto.getAdmittingDoctorPersonId()))
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found."));
        if (!Boolean.TRUE.equals(doctor.getIsActive())) {
            throw new IllegalStateException("Inactive doctors cannot be assigned to an admission.");
        }

        Admission adm = new Admission();
        adm.setAdmissionId(businessIdService.nextId("admission", "ADM"));
        adm.setPatient(patient);
        adm.setBed(bed);
        adm.setAdmittingDoctor(doctor);
        adm.setAdmissionDate(Instant.now());
        adm.setStatus(Admission.AdmissionStatus.ACTIVE);
        adm.setReason(dto.getReason());

        Admission saved = admissionRepository.save(adm);
        return mapToDto(saved);
    }

    @Override
    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public AdmissionDto transferBed(BedTransferRequest request) {
        Admission currentSnapshot = admissionRepository.findById(request.getCurrentAdmissionId())
                .orElseThrow(() -> new ResourceNotFoundException("Current admission not found: " + request.getCurrentAdmissionId()));
        patientRepository.findByIdForUpdate(currentSnapshot.getPatient().getPersonId())
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found."));
        Admission currentAdmission = admissionRepository.findByIdForUpdate(request.getCurrentAdmissionId())
                .orElseThrow(() -> new ResourceNotFoundException("Current admission not found: " + request.getCurrentAdmissionId()));

        if (currentAdmission.getStatus() != Admission.AdmissionStatus.ACTIVE) {
            throw new IllegalStateException("Cannot transfer a non-active admission.");
        }

        Bed targetBed = bedRepository.findByIdForUpdate(request.getTargetBedId())
                .orElseThrow(() -> new ResourceNotFoundException("Target bed not found: " + request.getTargetBedId()));

        if (targetBed.getOperationalStatus() != Bed.BedOperationalStatus.AVAILABLE) {
            throw new IllegalStateException("Target bed is not AVAILABLE.");
        }

        if (admissionRepository.existsByBed_BedIdAndStatus(targetBed.getBedId(), Admission.AdmissionStatus.ACTIVE)) {
            throw new IllegalStateException("Target bed already has an active admission.");
        }
        if (!Boolean.TRUE.equals(currentAdmission.getPatient().getIsActive())) {
            throw new IllegalStateException("Inactive patients cannot be transferred.");
        }

        Instant now = Instant.now();
        currentAdmission.setStatus(Admission.AdmissionStatus.TRANSFERRED);
        currentAdmission.setDischargeDate(now);

        Admission newAdmission = new Admission();
        newAdmission.setAdmissionId(businessIdService.nextId("admission", "ADM"));
        newAdmission.setPatient(currentAdmission.getPatient());
        newAdmission.setBed(targetBed);
        newAdmission.setAdmittingDoctor(currentAdmission.getAdmittingDoctor());
        newAdmission.setAdmissionDate(now);
        newAdmission.setStatus(Admission.AdmissionStatus.ACTIVE);
        newAdmission.setReason(request.getReason() != null ? request.getReason() : currentAdmission.getReason());
        newAdmission.setTransferFromAdmissionId(currentAdmission.getAdmissionId());

        admissionRepository.saveAndFlush(currentAdmission);
        Admission saved = admissionRepository.save(newAdmission);
        return mapToDto(saved);
    }

    @Override
    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public AdmissionDto dischargePatient(String admissionId) {
        Admission snapshot = admissionRepository.findById(admissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Admission not found: " + admissionId));
        patientRepository.findByIdForUpdate(snapshot.getPatient().getPersonId())
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found."));
        Admission adm = admissionRepository.findByIdForUpdate(admissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Admission not found: " + admissionId));
        if (adm.getStatus() != Admission.AdmissionStatus.ACTIVE) {
            throw new IllegalStateException("Only active admissions can be discharged.");
        }
        adm.setStatus(Admission.AdmissionStatus.DISCHARGED);
        adm.setDischargeDate(Instant.now());
        return mapToDto(admissionRepository.save(adm));
    }

    @Override
    @Transactional(readOnly = true)
    public List<AdmissionDto> getAllActiveAdmissions() {
        List<Admission> admissions = currentUserService.role() == Role.RoleName.DOCTOR
                ? admissionRepository.findByAdmittingDoctor_PersonIdAndStatus(
                        currentUserService.personId(), Admission.AdmissionStatus.ACTIVE)
                : admissionRepository.findByStatus(Admission.AdmissionStatus.ACTIVE);
        return admissions.stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    private AdmissionDto mapToDto(Admission a) {
        return AdmissionDto.builder()
                .admissionId(a.getAdmissionId())
                .patientPersonId(a.getPatient().getPersonId())
                .patientName(a.getPatient().getName())
                .bedId(a.getBed().getBedId())
                .bedNumber(a.getBed().getBedNumber())
                .wardId(a.getBed().getWard() != null ? a.getBed().getWard().getWardId() : null)
                .wardName(a.getBed().getWard() != null ? a.getBed().getWard().getWardName() : null)
                .admittingDoctorPersonId(a.getAdmittingDoctor().getPersonId())
                .admittingDoctorName(a.getAdmittingDoctor().getName())
                .admissionDate(a.getAdmissionDate())
                .dischargeDate(a.getDischargeDate())
                .status(a.getStatus().name())
                .reason(a.getReason())
                .transferFromAdmissionId(a.getTransferFromAdmissionId())
                .build();
    }
}
