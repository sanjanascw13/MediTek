package com.mediTek.MediTek.service.impl;

import com.mediTek.MediTek.domain.Department;
import com.mediTek.MediTek.domain.Doctor;
import com.mediTek.MediTek.domain.Role;
import com.mediTek.MediTek.dto.DoctorDto;
import com.mediTek.MediTek.dto.EmailNotificationResult;
import com.mediTek.MediTek.exception.ResourceNotFoundException;
import com.mediTek.MediTek.repository.DepartmentRepository;
import com.mediTek.MediTek.repository.DoctorRepository;
import com.mediTek.MediTek.security.CurrentUserService;
import com.mediTek.MediTek.service.AccountProvisioningService;
import com.mediTek.MediTek.service.BusinessIdService;
import com.mediTek.MediTek.service.DoctorNotificationService;
import com.mediTek.MediTek.service.DoctorService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class DoctorServiceImpl implements DoctorService {

    private final DoctorRepository doctorRepository;
    private final DepartmentRepository departmentRepository;
    private final BusinessIdService businessIdService;
    private final AccountProvisioningService accountProvisioningService;
    private final CurrentUserService currentUserService;
    private final DoctorNotificationService doctorNotificationService;

    public DoctorServiceImpl(DoctorRepository doctorRepository,
                             DepartmentRepository departmentRepository,
                             BusinessIdService businessIdService,
                             AccountProvisioningService accountProvisioningService,
                             CurrentUserService currentUserService,
                             DoctorNotificationService doctorNotificationService) {
        this.doctorRepository = doctorRepository;
        this.departmentRepository = departmentRepository;
        this.businessIdService = businessIdService;
        this.accountProvisioningService = accountProvisioningService;
        this.currentUserService = currentUserService;
        this.doctorNotificationService = doctorNotificationService;
    }

    @Override
    @Transactional
    public DoctorDto createDoctor(DoctorDto dto) {
        Doctor doc = new Doctor();
        doc.setPersonId(businessIdService.nextId("person", "PER"));
        doc.setDoctorId(businessIdService.nextId("doctor", "DOC"));
        doc.setName(dto.getName());
        doc.setEmail(dto.getEmail());
        doc.setPhoneNumber(dto.getPhoneNumber());
        doc.setDateOfBirth(dto.getDateOfBirth());
        doc.setGender(dto.getGender());
        doc.setSpecialization(dto.getSpecialization());
        doc.setLicenseNumber(dto.getLicenseNumber());
        doc.setIsActive(true);

        if (dto.getDepartmentId() != null && !dto.getDepartmentId().isBlank()) {
            Department dept = departmentRepository.findById(dto.getDepartmentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Department not found: " + dto.getDepartmentId()));
            doc.setDepartment(dept);
        }

        Doctor saved = doctorRepository.save(doc);
        AccountProvisioningService.ProvisionedAccount provisioned = accountProvisioningService
                .provisionAccount(saved, saved.getDoctorId(), Role.RoleName.DOCTOR);

        // Dispatches email notification with single-use setup token (or reports unconfigured SMTP safely)
        EmailNotificationResult emailResult = doctorNotificationService.sendDoctorAccountCreatedNotification(
                saved, provisioned.userAccount()
        );

        DoctorDto response = mapToDto(saved);
        response.setUsername(provisioned.credentials().username());
        response.setTemporaryPassword(provisioned.credentials().temporaryPassword());
        response.setEmailSent(emailResult.sent());
        response.setSmtpConfigured(emailResult.configured());
        response.setEmailNotificationMessage(emailResult.message());
        return response;
    }

    @Override
    @Transactional(readOnly = true)
    public DoctorDto getDoctorById(String id) {
        Doctor doc = doctorRepository.findById(id)
                .or(() -> doctorRepository.findByDoctorId(id))
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found: " + id));
        return mapToDto(doc);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DoctorDto> getAllDoctors() {
        boolean includeInactive = currentUserService.role() == Role.RoleName.SUPER_ADMIN;
        return doctorRepository.findAll().stream()
                .filter(doctor -> includeInactive || Boolean.TRUE.equals(doctor.getIsActive()))
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public DoctorDto setActive(String id, boolean active) {
        Doctor doctor = doctorRepository.findById(id)
                .or(() -> doctorRepository.findByDoctorId(id))
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found: " + id));
        doctor.setIsActive(active);
        Doctor saved = doctorRepository.save(doctor);
        accountProvisioningService.setEnabled(saved.getPersonId(), active);
        return mapToDto(saved);
    }

    private DoctorDto mapToDto(Doctor doc) {
        DoctorDto dto = new DoctorDto();
        dto.setPersonId(doc.getPersonId());
        dto.setDoctorId(doc.getDoctorId());
        dto.setName(doc.getName());
        dto.setDateOfBirth(doc.getDateOfBirth());
        dto.setGender(doc.getGender());
        dto.setPhoneNumber(doc.getPhoneNumber());
        dto.setEmail(doc.getEmail());
        dto.setSpecialization(doc.getSpecialization());
        dto.setLicenseNumber(doc.getLicenseNumber());
        dto.setIsActive(doc.getIsActive());
        if (doc.getDepartment() != null) {
            dto.setDepartmentId(doc.getDepartment().getDepartmentId());
            dto.setDepartmentName(doc.getDepartment().getDepartmentName());
        }
        return dto;
    }
}
