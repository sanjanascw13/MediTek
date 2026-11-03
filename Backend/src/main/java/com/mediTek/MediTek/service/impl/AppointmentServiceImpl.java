package com.mediTek.MediTek.service.impl;

import com.mediTek.MediTek.domain.Appointment;
import com.mediTek.MediTek.domain.Doctor;
import com.mediTek.MediTek.domain.Patient;
import com.mediTek.MediTek.domain.Role;
import com.mediTek.MediTek.dto.AppointmentDto;
import com.mediTek.MediTek.exception.ResourceNotFoundException;
import com.mediTek.MediTek.repository.AppointmentRepository;
import com.mediTek.MediTek.repository.DoctorRepository;
import com.mediTek.MediTek.repository.PatientRepository;
import com.mediTek.MediTek.security.CurrentUserService;
import com.mediTek.MediTek.service.AppointmentService;
import com.mediTek.MediTek.service.BusinessIdService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class AppointmentServiceImpl implements AppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final BusinessIdService businessIdService;
    private final CurrentUserService currentUserService;

    public AppointmentServiceImpl(AppointmentRepository appointmentRepository,
                                  PatientRepository patientRepository,
                                  DoctorRepository doctorRepository,
                                  BusinessIdService businessIdService,
                                  CurrentUserService currentUserService) {
        this.appointmentRepository = appointmentRepository;
        this.patientRepository = patientRepository;
        this.doctorRepository = doctorRepository;
        this.businessIdService = businessIdService;
        this.currentUserService = currentUserService;
    }

    @Override
    @Transactional
    public AppointmentDto scheduleAppointment(AppointmentDto dto) {
        Role.RoleName role = currentUserService.role();
        Patient patient;
        if (role == Role.RoleName.PATIENT) {
            patient = patientRepository.findById(currentUserService.personId())
                    .orElseThrow(() -> new ResourceNotFoundException("Patient profile not found."));
        } else if (role == Role.RoleName.STAFF || role == Role.RoleName.SUPER_ADMIN) {
            patient = patientRepository.findById(dto.getPatientPersonId())
                    .or(() -> patientRepository.findByPatientId(dto.getPatientPersonId()))
                    .orElseThrow(() -> new ResourceNotFoundException("Patient not found."));
        } else {
            throw new AccessDeniedException("Only a Patient, Staff member, or Super Admin may book an appointment.");
        }
        Doctor doctor = doctorRepository.findById(dto.getDoctorPersonId())
                .or(() -> doctorRepository.findByDoctorId(dto.getDoctorPersonId()))
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found."));
        if (!Boolean.TRUE.equals(patient.getIsActive()) || !Boolean.TRUE.equals(doctor.getIsActive())) {
            throw new IllegalStateException("Appointments require an active Patient and active Doctor.");
        }
        if (dto.getAppointmentDate() == null || !dto.getAppointmentDate().isAfter(Instant.now())) {
            throw new IllegalArgumentException("Appointment date must be in the future.");
        }

        Appointment apt = new Appointment();
        apt.setAppointmentId(businessIdService.nextId("appointment", "APT"));
        apt.setPatient(patient);
        apt.setDoctor(doctor);
        apt.setAppointmentDate(dto.getAppointmentDate());
        apt.setStatus(Appointment.AppointmentStatus.SCHEDULED);
        apt.setNotes(dto.getNotes());

        Appointment saved = appointmentRepository.save(apt);
        return mapToDto(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AppointmentDto> getAllAppointments() {
        Role.RoleName role = currentUserService.role();
        List<Appointment> appointments;
        if (role == Role.RoleName.PATIENT) {
            appointments = appointmentRepository.findByPatient_PersonId(currentUserService.personId());
        } else if (role == Role.RoleName.DOCTOR) {
            appointments = appointmentRepository.findByDoctor_PersonId(currentUserService.personId());
        } else {
            appointments = appointmentRepository.findAll();
        }
        return appointments.stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public AppointmentDto updateStatus(String id, String status) {
        Appointment apt = appointmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment not found: " + id));
        Appointment.AppointmentStatus targetStatus;
        try {
            targetStatus = Appointment.AppointmentStatus.valueOf(status.toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Unsupported appointment status.");
        }
        if (apt.getStatus() != Appointment.AppointmentStatus.SCHEDULED) {
            throw new IllegalStateException("Only scheduled appointments can change status.");
        }
        Role.RoleName role = currentUserService.role();
        if (role == Role.RoleName.DOCTOR) {
            if (!apt.getDoctor().getPersonId().equals(currentUserService.personId())) {
                throw new AccessDeniedException("Doctors may update only their assigned appointments.");
            }
            if (targetStatus != Appointment.AppointmentStatus.COMPLETED) {
                throw new AccessDeniedException("Doctors may only mark their assigned appointment completed.");
            }
        } else if (role != Role.RoleName.SUPER_ADMIN && role != Role.RoleName.STAFF) {
            throw new AccessDeniedException("This role may not update appointment status.");
        }
        apt.setStatus(targetStatus);
        return mapToDto(appointmentRepository.save(apt));
    }

    private AppointmentDto mapToDto(Appointment a) {
        return AppointmentDto.builder()
                .appointmentId(a.getAppointmentId())
                .patientPersonId(a.getPatient().getPersonId())
                .patientName(a.getPatient().getName())
                .doctorPersonId(a.getDoctor().getPersonId())
                .doctorName(a.getDoctor().getName())
                .appointmentDate(a.getAppointmentDate())
                .status(a.getStatus().name())
                .notes(a.getNotes())
                .build();
    }
}
