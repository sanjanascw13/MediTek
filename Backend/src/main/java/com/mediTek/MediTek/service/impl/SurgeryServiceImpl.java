package com.mediTek.MediTek.service.impl;

import com.mediTek.MediTek.domain.*;
import com.mediTek.MediTek.dto.OperatingTheaterDto;
import com.mediTek.MediTek.dto.SurgeryCreateRequest;
import com.mediTek.MediTek.dto.SurgeryDto;
import com.mediTek.MediTek.exception.ResourceNotFoundException;
import com.mediTek.MediTek.repository.DoctorRepository;
import com.mediTek.MediTek.repository.OperatingTheaterRepository;
import com.mediTek.MediTek.repository.PatientRepository;
import com.mediTek.MediTek.repository.SurgeryRepository;
import com.mediTek.MediTek.security.CurrentUserService;
import com.mediTek.MediTek.service.BusinessIdService;
import com.mediTek.MediTek.service.SurgeryService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Locale;

@Service
public class SurgeryServiceImpl implements SurgeryService {

    private static final Collection<Surgery.SurgeryStatus> SCHEDULED_STATUSES =
            List.of(Surgery.SurgeryStatus.SCHEDULED, Surgery.SurgeryStatus.IN_PROGRESS);

    private final SurgeryRepository surgeryRepository;
    private final OperatingTheaterRepository theaterRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final BusinessIdService businessIdService;
    private final CurrentUserService currentUserService;

    public SurgeryServiceImpl(SurgeryRepository surgeryRepository,
                              OperatingTheaterRepository theaterRepository,
                              PatientRepository patientRepository,
                              DoctorRepository doctorRepository,
                              BusinessIdService businessIdService,
                              CurrentUserService currentUserService) {
        this.surgeryRepository = surgeryRepository;
        this.theaterRepository = theaterRepository;
        this.patientRepository = patientRepository;
        this.doctorRepository = doctorRepository;
        this.businessIdService = businessIdService;
        this.currentUserService = currentUserService;
    }

    @Override
    @Transactional(readOnly = true)
    public List<SurgeryDto> getSurgeries(String patientId, Surgery.SurgeryStatus status, String search) {
        Role.RoleName role = currentUserService.role();
        List<Surgery> surgeries;
        if (role == Role.RoleName.PATIENT) {
            String personId = currentUserService.personId();
            if (patientId != null && !patientId.isBlank()
                    && patientRepository.findByPatientId(patientId)
                    .filter(patient -> patient.getPersonId().equals(personId)).isEmpty()) {
                throw new AccessDeniedException("Patients may view only their own surgery records.");
            }
            surgeries = surgeryRepository.findByPatient_PersonIdOrderByScheduledAtDesc(personId);
        } else if (role == Role.RoleName.DOCTOR) {
            surgeries = surgeryRepository.findBySurgeon_PersonIdOrderByScheduledAtDesc(
                    currentUserService.personId());
        } else if (role == Role.RoleName.STAFF || role == Role.RoleName.SUPER_ADMIN) {
            surgeries = surgeryRepository.findAll();
        } else {
            throw new AccessDeniedException("This role may not view surgery records.");
        }

        if (patientId != null && !patientId.isBlank() && role != Role.RoleName.PATIENT) {
            Patient patient = patientRepository.findByPatientId(patientId)
                    .orElseThrow(() -> new ResourceNotFoundException("Patient not found."));
            surgeries = surgeries.stream()
                    .filter(surgery -> surgery.getPatient().getPersonId().equals(patient.getPersonId()))
                    .toList();
        }
        String query = search == null ? "" : search.trim().toLowerCase(Locale.ROOT);
        return surgeries.stream()
                .filter(surgery -> status == null || surgery.getStatus() == status)
                .filter(surgery -> query.isEmpty() || searchMatches(surgery, query))
                .sorted((first, second) -> second.getScheduledAt().compareTo(first.getScheduledAt()))
                .map(this::mapSurgery)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<OperatingTheaterDto> getOperatingTheaters() {
        requireClinicalRole();
        return theaterRepository.findAllByOrderByTheaterNumberAsc().stream()
                .map(theater -> new OperatingTheaterDto(
                        theater.getTheaterNumber(), theater.getDepartmentName(), theater.getLocation()))
                .toList();
    }

    @Override
    @Transactional
    public SurgeryDto createSurgery(SurgeryCreateRequest request) {
        Role.RoleName role = currentUserService.role();
        if (role != Role.RoleName.DOCTOR && role != Role.RoleName.SUPER_ADMIN) {
            throw new AccessDeniedException("Only a Doctor or Super Admin may schedule surgery.");
        }
        Instant now = Instant.now();
        if (!request.scheduledAt().isAfter(now)) {
            throw new IllegalArgumentException("Surgery must be scheduled for a future date and time.");
        }
        Patient foundPatient = patientRepository.findByPatientId(request.patientId())
                .filter(item -> Boolean.TRUE.equals(item.getIsActive()))
                .orElseThrow(() -> new ResourceNotFoundException("Active patient not found."));
        Patient patient = patientRepository.findByIdForUpdate(foundPatient.getPersonId())
                .filter(item -> Boolean.TRUE.equals(item.getIsActive()))
                .orElseThrow(() -> new ResourceNotFoundException("Active patient not found."));

        Doctor foundSurgeon;
        if (role == Role.RoleName.DOCTOR) {
            foundSurgeon = doctorRepository.findById(currentUserService.personId())
                    .orElseThrow(() -> new AccessDeniedException("Doctor profile not found."));
            if (request.doctorId() != null && !request.doctorId().isBlank()
                    && !foundSurgeon.getDoctorId().equals(request.doctorId())) {
                throw new AccessDeniedException("Doctors may schedule only under their own profile.");
            }
        } else {
            foundSurgeon = doctorRepository.findByDoctorId(request.doctorId())
                    .filter(item -> Boolean.TRUE.equals(item.getIsActive()))
                    .orElseThrow(() -> new ResourceNotFoundException("Active surgeon not found."));
        }
        Doctor surgeon = doctorRepository.findByIdForUpdate(foundSurgeon.getPersonId())
                .filter(item -> Boolean.TRUE.equals(item.getIsActive()))
                .orElseThrow(() -> new ResourceNotFoundException("Active surgeon not found."));
        if (!Boolean.TRUE.equals(surgeon.getIsActive())) {
            throw new IllegalStateException("Surgery requires an active Doctor.");
        }

        OperatingTheater theater = theaterRepository.findByTheaterNumberForUpdate(request.theaterNumber())
                .orElseThrow(() -> new ResourceNotFoundException("Operating theater not found."));
        Instant requestedEnd = request.scheduledAt().plusSeconds(request.durationMinutes() * 60L);
        boolean overlaps = hasOverlap(
                surgeryRepository.findByOperatingTheater_DepartmentIdAndStatusIn(
                        theater.getDepartmentId(), SCHEDULED_STATUSES),
                request.scheduledAt(), requestedEnd)
                || hasOverlap(surgeryRepository.findBySurgeon_PersonIdOrderByScheduledAtDesc(
                        surgeon.getPersonId()), request.scheduledAt(), requestedEnd)
                || hasOverlap(surgeryRepository.findByPatient_PersonIdOrderByScheduledAtDesc(
                        patient.getPersonId()), request.scheduledAt(), requestedEnd);
        if (overlaps) {
            throw new IllegalStateException("The operating theater already has a surgery during this time.");
        }

        Surgery surgery = new Surgery();
        surgery.setSurgeryId(businessIdService.nextId("surgery", "SRG"));
        surgery.setPatient(patient);
        surgery.setSurgeon(surgeon);
        surgery.setOperatingTheater(theater);
        surgery.setScheduledAt(request.scheduledAt());
        surgery.setSurgeryType(request.surgeryType().trim());
        surgery.setDurationMinutes(request.durationMinutes());
        surgery.setNotes(request.notes() == null || request.notes().isBlank() ? null : request.notes().trim());
        surgery.setStatus(Surgery.SurgeryStatus.SCHEDULED);
        return mapSurgery(surgeryRepository.save(surgery));
    }

    @Override
    @Transactional
    public SurgeryDto updateStatus(String surgeryId, Surgery.SurgeryStatus requestedStatus) {
        Surgery surgery = surgeryRepository.findByIdForUpdate(surgeryId)
                .orElseThrow(() -> new ResourceNotFoundException("Surgery not found."));
        authorizeMutation(surgery);
        Surgery.SurgeryStatus currentStatus = surgery.getStatus();
        boolean validTransition = (currentStatus == Surgery.SurgeryStatus.SCHEDULED
                && (requestedStatus == Surgery.SurgeryStatus.IN_PROGRESS
                || requestedStatus == Surgery.SurgeryStatus.CANCELLED))
                || (currentStatus == Surgery.SurgeryStatus.IN_PROGRESS
                && requestedStatus == Surgery.SurgeryStatus.COMPLETED);
        if (!validTransition) {
            throw new IllegalStateException("The requested surgery status transition is not allowed.");
        }
        surgery.setStatus(requestedStatus);
        return mapSurgery(surgeryRepository.save(surgery));
    }

    private boolean overlaps(Instant requestedStart, Instant requestedEnd, Surgery existing) {
        Instant existingEnd = existing.getScheduledAt().plusSeconds(existing.getDurationMinutes() * 60L);
        return requestedStart.isBefore(existingEnd) && existing.getScheduledAt().isBefore(requestedEnd);
    }

    private boolean hasOverlap(List<Surgery> surgeries, Instant requestedStart, Instant requestedEnd) {
        return surgeries.stream()
                .filter(surgery -> SCHEDULED_STATUSES.contains(surgery.getStatus()))
                .anyMatch(surgery -> overlaps(requestedStart, requestedEnd, surgery));
    }

    private boolean searchMatches(Surgery surgery, String query) {
        return contains(surgery.getPatient().getName(), query)
                || contains(surgery.getPatient().getPatientId(), query)
                || contains(surgery.getSurgeon().getName(), query)
                || contains(surgery.getSurgeon().getDoctorId(), query)
                || contains(surgery.getOperatingTheater().getTheaterNumber(), query)
                || contains(surgery.getSurgeryType(), query)
                || contains(surgery.getNotes(), query);
    }

    private boolean contains(String value, String query) {
        return value != null && value.toLowerCase(Locale.ROOT).contains(query);
    }

    private void authorizeMutation(Surgery surgery) {
        Role.RoleName role = currentUserService.role();
        if (role == Role.RoleName.SUPER_ADMIN || role == Role.RoleName.STAFF) return;
        if (role == Role.RoleName.DOCTOR
                && surgery.getSurgeon().getPersonId().equals(currentUserService.personId())) return;
        throw new AccessDeniedException("You may not update this surgery.");
    }

    private void requireClinicalRole() {
        Role.RoleName role = currentUserService.role();
        if (role != Role.RoleName.SUPER_ADMIN && role != Role.RoleName.STAFF
                && role != Role.RoleName.DOCTOR) {
            throw new AccessDeniedException("This role may not view operating theaters.");
        }
    }

    private SurgeryDto mapSurgery(Surgery surgery) {
        return new SurgeryDto(
                surgery.getSurgeryId(),
                surgery.getPatient().getPatientId(),
                surgery.getPatient().getName(),
                surgery.getSurgeon().getDoctorId(),
                surgery.getSurgeon().getName(),
                surgery.getOperatingTheater().getTheaterNumber(),
                surgery.getOperatingTheater().getDepartmentName(),
                surgery.getScheduledAt(),
                surgery.getSurgeryType(),
                surgery.getDurationMinutes(),
                surgery.getStatus(),
                surgery.getNotes());
    }
}
