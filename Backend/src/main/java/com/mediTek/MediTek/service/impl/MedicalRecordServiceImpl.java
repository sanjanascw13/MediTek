package com.mediTek.MediTek.service.impl;

import com.mediTek.MediTek.domain.*;
import com.mediTek.MediTek.dto.MedicalRecordCreateRequest;
import com.mediTek.MediTek.dto.MedicalRecordDto;
import com.mediTek.MediTek.exception.ResourceNotFoundException;
import com.mediTek.MediTek.repository.*;
import com.mediTek.MediTek.security.CurrentUserService;
import com.mediTek.MediTek.service.BusinessIdService;
import com.mediTek.MediTek.service.MedicalRecordService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;

@Service
public class MedicalRecordServiceImpl implements MedicalRecordService {

    private final MedicalRecordRepository medicalRecordRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final MedicalStaffRepository medicalStaffRepository;
    private final AppointmentRepository appointmentRepository;
    private final AdmissionRepository admissionRepository;
    private final CurrentUserService currentUserService;
    private final BusinessIdService businessIdService;

    public MedicalRecordServiceImpl(MedicalRecordRepository medicalRecordRepository,
                                   PatientRepository patientRepository,
                                   DoctorRepository doctorRepository,
                                   MedicalStaffRepository medicalStaffRepository,
                                   AppointmentRepository appointmentRepository,
                                   AdmissionRepository admissionRepository,
                                   CurrentUserService currentUserService,
                                   BusinessIdService businessIdService) {
        this.medicalRecordRepository = medicalRecordRepository;
        this.patientRepository = patientRepository;
        this.doctorRepository = doctorRepository;
        this.medicalStaffRepository = medicalStaffRepository;
        this.appointmentRepository = appointmentRepository;
        this.admissionRepository = admissionRepository;
        this.currentUserService = currentUserService;
        this.businessIdService = businessIdService;
    }

    @Override
    @Transactional(readOnly = true)
    public List<MedicalRecordDto> getMedicalRecords(String patientId) {
        Role.RoleName role = currentUserService.role();
        if (role == Role.RoleName.PATIENT) {
            String ownPersonId = currentUserService.personId();
            if (patientId != null && !patientId.isBlank()
                    && patientRepository.findByPatientId(patientId)
                    .filter(patient -> patient.getPersonId().equals(ownPersonId)).isEmpty()) {
                throw new AccessDeniedException("Patients may view only their own medical records.");
            }
            return mapRecords(medicalRecordRepository.findByPatient_PersonIdOrderByCreatedAtDesc(ownPersonId));
        }
        if (role != Role.RoleName.SUPER_ADMIN && role != Role.RoleName.STAFF
                && role != Role.RoleName.DOCTOR) {
            throw new AccessDeniedException("This role may not view medical records.");
        }

        List<MedicalRecord> records;
        String requestedPatientPersonId = null;
        if (patientId == null || patientId.isBlank()) {
            records = medicalRecordRepository.findAll();
        } else {
            Patient patient = patientRepository.findByPatientId(patientId)
                    .orElseThrow(() -> new ResourceNotFoundException("Patient not found."));
            requestedPatientPersonId = patient.getPersonId();
            records = medicalRecordRepository.findByPatient_PersonIdOrderByCreatedAtDesc(patient.getPersonId());
        }
        if (role == Role.RoleName.DOCTOR) {
            String doctorPersonId = currentUserService.personId();
            if (requestedPatientPersonId != null
                    && appointmentRepository.findByDoctor_PersonIdAndPatient_PersonId(
                    doctorPersonId, requestedPatientPersonId).isEmpty()) {
                throw new AccessDeniedException("Doctors may view records only for patients in their care.");
            }
            records = records.stream()
                    .filter(record -> doctorCanView(record, doctorPersonId))
                    .toList();
        }
        return mapRecords(records.stream()
                .sorted(Comparator.comparing(MedicalRecord::getCreatedAt).reversed())
                .toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<MedicalRecordDto> getCurrentPatientRecords() {
        if (currentUserService.role() != Role.RoleName.PATIENT) {
            throw new AccessDeniedException("This endpoint is available only to the authenticated patient.");
        }
        return mapRecords(medicalRecordRepository
                .findByPatient_PersonIdOrderByCreatedAtDesc(currentUserService.personId()));
    }

    @Override
    @Transactional
    public MedicalRecordDto createMedicalRecord(MedicalRecordCreateRequest request) {
        Role.RoleName role = currentUserService.role();
        if (role != Role.RoleName.DOCTOR && role != Role.RoleName.STAFF) {
            throw new AccessDeniedException("Only a Doctor or Staff member may create a medical record.");
        }
        Patient patient = patientRepository.findByPatientId(request.patientId())
                .filter(value -> Boolean.TRUE.equals(value.getIsActive()))
                .orElseThrow(() -> new ResourceNotFoundException("Active patient not found."));

        Appointment appointment = null;
        if (request.appointmentId() != null && !request.appointmentId().isBlank()) {
            appointment = appointmentRepository.findById(request.appointmentId())
                    .filter(value -> value.getPatient().getPersonId().equals(patient.getPersonId()))
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Appointment not found for the selected patient."));
            if (appointment.getStatus() == Appointment.AppointmentStatus.CANCELLED) {
                throw new IllegalStateException("A cancelled appointment cannot be linked to a medical record.");
            }
        }

        Admission admission = null;
        if (request.admissionId() != null && !request.admissionId().isBlank()) {
            admission = admissionRepository.findById(request.admissionId())
                    .filter(value -> value.getPatient().getPersonId().equals(patient.getPersonId()))
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Admission not found for the selected patient."));
        }

        Person author;
        if (role == Role.RoleName.DOCTOR) {
            Doctor doctor = doctorRepository.findById(currentUserService.personId())
                    .filter(value -> Boolean.TRUE.equals(value.getIsActive()))
                    .orElseThrow(() -> new AccessDeniedException("Active Doctor profile not found."));
            if (appointment == null || !appointment.getDoctor().getPersonId().equals(doctor.getPersonId())) {
                throw new AccessDeniedException("Doctors may document only their own patient appointments.");
            }
            author = doctor;
        } else {
            author = medicalStaffRepository.findById(currentUserService.personId())
                    .filter(value -> Boolean.TRUE.equals(value.getIsActive()))
                    .orElseThrow(() -> new AccessDeniedException("Active Staff profile not found."));
        }

        MedicalRecord record = new MedicalRecord();
        record.setRecordId(businessIdService.nextId("medical_record", "REC"));
        record.setPatient(patient);
        record.setAppointment(appointment);
        record.setAdmission(admission);
        record.setAuthor(author);
        record.setCreatedAt(Instant.now());
        record.setContent(request.content().trim());
        return mapRecord(medicalRecordRepository.save(record));
    }

    private boolean doctorCanView(MedicalRecord record, String doctorPersonId) {
        if (record.getAuthor() != null
                && doctorPersonId.equals(record.getAuthor().getPersonId())) {
            return true;
        }
        if (record.getAppointment() != null
                && doctorPersonId.equals(record.getAppointment().getDoctor().getPersonId())) {
            return true;
        }
        if (record.getAdmission() != null
                && doctorPersonId.equals(record.getAdmission().getAdmittingDoctor().getPersonId())) {
            return true;
        }
        return !appointmentRepository.findByDoctor_PersonIdAndPatient_PersonId(
                doctorPersonId, record.getPatient().getPersonId()).isEmpty();
    }

    private List<MedicalRecordDto> mapRecords(List<MedicalRecord> records) {
        return records.stream().map(this::mapRecord).toList();
    }

    private MedicalRecordDto mapRecord(MedicalRecord record) {
        Person author = record.getAuthor();
        String authorId = null;
        if (author != null) {
            authorId = doctorRepository.findById(author.getPersonId())
                    .map(Doctor::getDoctorId)
                    .orElseGet(() -> medicalStaffRepository.findById(author.getPersonId())
                            .map(MedicalStaff::getStaffId)
                            .orElse(null));
        }
        return new MedicalRecordDto(
                record.getRecordId(),
                record.getPatient().getPatientId(),
                record.getPatient().getName(),
                authorId,
                author == null ? null : author.getName(),
                record.getAppointment() == null ? null : record.getAppointment().getAppointmentId(),
                record.getAdmission() == null ? null : record.getAdmission().getAdmissionId(),
                record.getContent(),
                record.getCreatedAt());
    }
}
