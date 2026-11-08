package com.mediTek.MediTek.service.impl;

import com.mediTek.MediTek.domain.Department;
import com.mediTek.MediTek.domain.MedicalStaff;
import com.mediTek.MediTek.domain.Role;
import com.mediTek.MediTek.dto.StaffDto;
import com.mediTek.MediTek.exception.ResourceNotFoundException;
import com.mediTek.MediTek.repository.DepartmentRepository;
import com.mediTek.MediTek.repository.MedicalStaffRepository;
import com.mediTek.MediTek.repository.UserAccountRepository;
import com.mediTek.MediTek.service.AccountProvisioningService;
import com.mediTek.MediTek.service.BusinessIdService;
import com.mediTek.MediTek.service.DoctorNotificationService;
import com.mediTek.MediTek.service.StaffService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class StaffServiceImpl implements StaffService {

    private static final Logger log = LoggerFactory.getLogger(StaffServiceImpl.class);

    private final MedicalStaffRepository staffRepository;
    private final DepartmentRepository departmentRepository;
    private final BusinessIdService businessIdService;
    private final AccountProvisioningService accountProvisioningService;
    private final DoctorNotificationService doctorNotificationService;
    private final UserAccountRepository userAccountRepository;

    public StaffServiceImpl(MedicalStaffRepository staffRepository,
                            DepartmentRepository departmentRepository,
                            BusinessIdService businessIdService,
                            AccountProvisioningService accountProvisioningService,
                            DoctorNotificationService doctorNotificationService,
                            UserAccountRepository userAccountRepository) {
        this.staffRepository = staffRepository;
        this.departmentRepository = departmentRepository;
        this.businessIdService = businessIdService;
        this.accountProvisioningService = accountProvisioningService;
        this.doctorNotificationService = doctorNotificationService;
        this.userAccountRepository = userAccountRepository;
    }

    @Override
    @Transactional
    public StaffDto createStaff(StaffDto dto) {
        MedicalStaff staff = new MedicalStaff();
        staff.setPersonId(businessIdService.nextId("person", "PER"));
        staff.setStaffId(businessIdService.nextId("staff", "STF"));
        staff.setName(dto.getName().trim());
        staff.setDateOfBirth(dto.getDateOfBirth());
        staff.setGender(dto.getGender());
        staff.setPhoneNumber(dto.getPhoneNumber().trim());
        staff.setEmail(dto.getEmail().trim());
        staff.setRole(dto.getRole().trim());
        staff.setIsActive(true);
        if (dto.getDepartmentId() != null && !dto.getDepartmentId().isBlank()) {
            Department department = departmentRepository.findById(dto.getDepartmentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Department not found: " + dto.getDepartmentId()));
            staff.setDepartment(department);
        }
        MedicalStaff saved = staffRepository.save(staff);
        AccountProvisioningService.InitialCredentials credentials = accountProvisioningService
                .provision(saved, saved.getStaffId(), Role.RoleName.STAFF);
        doctorNotificationService.sendStaffAccountCreatedNotification(saved, credentials.username(), credentials.temporaryPassword());
        StaffDto response = mapToDto(saved);
        response.setUsername(credentials.username());
        response.setTemporaryPassword(credentials.temporaryPassword());
        return response;
    }

    @Override
    @Transactional(readOnly = true)
    public List<StaffDto> getAllStaff() {
        return staffRepository.findAll().stream().map(this::mapToDto).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public StaffDto getStaffById(String id) {
        MedicalStaff staff = staffRepository.findById(id)
                .or(() -> staffRepository.findByStaffId(id))
                .orElseThrow(() -> new ResourceNotFoundException("Staff member not found: " + id));
        return mapToDto(staff);
    }

    @Override
    @Transactional
    public StaffDto setActive(String id, boolean active) {
        MedicalStaff staff = staffRepository.findById(id)
                .or(() -> staffRepository.findByStaffId(id))
                .orElseThrow(() -> new ResourceNotFoundException("Staff member not found: " + id));
        staff.setIsActive(active);
        MedicalStaff saved = staffRepository.save(staff);
        accountProvisioningService.setEnabled(saved.getPersonId(), active);
        return mapToDto(saved);
    }

    @Override
    @Transactional
    public void deleteStaff(String id) {
        MedicalStaff staff = staffRepository.findById(id)
                .or(() -> staffRepository.findByStaffId(id))
                .orElseThrow(() -> new ResourceNotFoundException("Staff member not found: " + id));

        try {
            userAccountRepository.findByPerson_PersonId(staff.getPersonId()).ifPresent(userAccountRepository::delete);
            staffRepository.delete(staff);
            log.info("Physically deleted staff {}", id);
        } catch (Exception ex) {
            log.warn("Cannot physically delete staff {} due to linked entities ({}). Soft-deleting instead.", id, ex.getMessage());
            staff.setIsActive(false);
            staffRepository.save(staff);
            accountProvisioningService.setEnabled(staff.getPersonId(), false);
        }
    }

    private StaffDto mapToDto(MedicalStaff staff) {
        return StaffDto.builder()
                .personId(staff.getPersonId())
                .staffId(staff.getStaffId())
                .name(staff.getName())
                .dateOfBirth(staff.getDateOfBirth())
                .gender(staff.getGender())
                .phoneNumber(staff.getPhoneNumber())
                .email(staff.getEmail())
                .role(staff.getRole())
                .departmentId(staff.getDepartment() == null ? null : staff.getDepartment().getDepartmentId())
                .departmentName(staff.getDepartment() == null ? null : staff.getDepartment().getDepartmentName())
                .isActive(staff.getIsActive())
                .build();
    }
}
