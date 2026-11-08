package com.mediTek.MediTek.service.impl;

import com.mediTek.MediTek.domain.Patient;
import com.mediTek.MediTek.domain.Role;
import com.mediTek.MediTek.domain.UserAccount;
import com.mediTek.MediTek.dto.PatientDto;
import com.mediTek.MediTek.dto.PatientRegistrationRequest;
import com.mediTek.MediTek.dto.PatientRegistrationResponse;
import com.mediTek.MediTek.exception.ResourceNotFoundException;
import com.mediTek.MediTek.repository.RoleRepository;
import com.mediTek.MediTek.repository.PatientRepository;
import com.mediTek.MediTek.repository.UserAccountRepository;
import com.mediTek.MediTek.repository.AppointmentRepository;
import com.mediTek.MediTek.security.CurrentUserService;
import com.mediTek.MediTek.service.BusinessIdService;
import com.mediTek.MediTek.service.DoctorNotificationService;
import com.mediTek.MediTek.service.PatientService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

@Service
public class PatientServiceImpl implements PatientService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private final PatientRepository patientRepository;
    private final UserAccountRepository userAccountRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final BusinessIdService businessIdService;
    private final CurrentUserService currentUserService;
    private final AppointmentRepository appointmentRepository;
    private final DoctorNotificationService doctorNotificationService;

    public PatientServiceImpl(PatientRepository patientRepository,
                              UserAccountRepository userAccountRepository,
                              RoleRepository roleRepository,
                              PasswordEncoder passwordEncoder,
                              BusinessIdService businessIdService,
                              CurrentUserService currentUserService,
                              AppointmentRepository appointmentRepository,
                              DoctorNotificationService doctorNotificationService) {
        this.patientRepository = patientRepository;
        this.userAccountRepository = userAccountRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.businessIdService = businessIdService;
        this.currentUserService = currentUserService;
        this.appointmentRepository = appointmentRepository;
        this.doctorNotificationService = doctorNotificationService;
    }

    @Override
    @Transactional
    public PatientRegistrationResponse createPatient(PatientDto dto) {
        String patientId = businessIdService.nextId("patient", "PAT");
        String username = patientId.toLowerCase(Locale.ROOT);
        if (userAccountRepository.findByUsername(username).isPresent()) {
            throw new IllegalStateException("Unable to generate a unique Patient username.");
        }
        String temporaryPassword = generateTemporaryPassword();
        Patient patient = createPatientEntity(
                dto.getName(), dto.getDateOfBirth(), dto.getGender(), dto.getPhoneNumber(), dto.getEmail(),
                dto.getBloodGroup(), dto.getAddress(), dto.getEmergencyContact(), patientId
        );
        createAccount(patient, username, temporaryPassword, true);
        doctorNotificationService.sendPatientAccountCreatedNotification(patient, username, temporaryPassword, false);
        return new PatientRegistrationResponse(mapToDto(patient), username, temporaryPassword);
    }

    @Override
    @Transactional
    public PatientDto registerPatient(PatientRegistrationRequest request) {
        Patient patient = createPatientEntity(
                request.getName(), request.getDateOfBirth(), request.getGender(), request.getPhoneNumber(),
                request.getEmail(), request.getBloodGroup(), request.getAddress(), request.getEmergencyContact(),
                businessIdService.nextId("patient", "PAT")
        );
        createAccount(patient, request.getUsername().trim(), request.getPassword(), false);
        doctorNotificationService.sendPatientAccountCreatedNotification(patient, request.getUsername().trim(), null, true);
        return mapToDto(patient);
    }

    private Patient createPatientEntity(String name, java.time.LocalDate dateOfBirth, String gender,
                                        String phoneNumber, String email, String bloodGroup, String address,
                                        String emergencyContact, String patientId) {
        Patient patient = new Patient();
        patient.setPersonId(businessIdService.nextId("person", "PER"));
        patient.setPatientId(patientId);
        patient.setName(name.trim());
        patient.setEmail(email.trim().toLowerCase(Locale.ROOT));
        patient.setPhoneNumber(phoneNumber.trim());
        patient.setDateOfBirth(dateOfBirth);
        patient.setGender(gender);
        patient.setBloodGroup(bloodGroup);
        patient.setAddress(address.trim());
        patient.setEmergencyContact(emergencyContact.trim());
        patient.setIsActive(true);
        return patientRepository.save(patient);
    }

    private void createAccount(Patient patient, String username, String password, boolean passwordChangeRequired) {
        if (userAccountRepository.findByUsername(username).isPresent()) {
            throw new IllegalStateException("Username is already registered.");
        }
        Role patientRole = roleRepository.findByName(Role.RoleName.PATIENT)
                .orElseThrow(() -> new IllegalStateException("Patient role has not been initialized."));
        UserAccount account = new UserAccount();
        account.setUserAccountId(businessIdService.nextId("user_account", "USR"));
        account.setPerson(patient);
        account.setUsername(username);
        account.setPasswordHash(passwordEncoder.encode(password));
        account.setRole(patientRole);
        account.setEnabled(true);
        account.setPasswordChangeRequired(passwordChangeRequired);
        userAccountRepository.save(account);
    }

    private String generateTemporaryPassword() {
        byte[] bytes = new byte[24];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    @Override
    @Transactional(readOnly = true)
    public PatientDto getPatientById(String id) {
        Patient p = patientRepository.findById(id)
                .or(() -> patientRepository.findByPatientId(id))
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found: " + id));
        enforcePatientReadAccess(p);
        return mapToDto(p);
    }

    @Override
    @Transactional(readOnly = true)
    public PatientDto getCurrentPatient() {
        Patient patient = patientRepository.findById(currentUserService.personId())
                .orElseThrow(() -> new ResourceNotFoundException("Patient profile not found."));
        return mapToDto(patient);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PatientDto> getAllPatients() {
        List<Patient> patients = patientRepository.findAll();
        if (currentUserService.role() == Role.RoleName.DOCTOR) {
            String doctorPersonId = currentUserService.personId();
            return patients.stream()
                    .filter(patient -> !appointmentRepository
                            .findByDoctor_PersonIdAndPatient_PersonId(doctorPersonId, patient.getPersonId()).isEmpty())
                    .map(this::mapToDto)
                    .collect(Collectors.toList());
        }
        if (currentUserService.role() == Role.RoleName.PATIENT) {
            throw new AccessDeniedException("Patients may only access their own profile.");
        }
        return patients.stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void deletePatient(String id) {
        Patient patient = patientRepository.findById(id)
                .or(() -> patientRepository.findByPatientId(id))
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found: " + id));

        try {
            userAccountRepository.findByPerson_PersonId(patient.getPersonId()).ifPresent(userAccountRepository::delete);
            patientRepository.delete(patient);
        } catch (Exception ex) {
            patient.setIsActive(false);
            patientRepository.save(patient);
            userAccountRepository.findByPerson_PersonId(patient.getPersonId()).ifPresent(account -> {
                account.setEnabled(false);
                userAccountRepository.save(account);
            });
        }
    }

    private void enforcePatientReadAccess(Patient patient) {
        Role.RoleName role = currentUserService.role();
        if (role == Role.RoleName.PATIENT && !patient.getPersonId().equals(currentUserService.personId())) {
            throw new AccessDeniedException("Patients may only access their own profile.");
        }
        if (role == Role.RoleName.DOCTOR && appointmentRepository
                .findByDoctor_PersonIdAndPatient_PersonId(currentUserService.personId(), patient.getPersonId()).isEmpty()) {
            throw new AccessDeniedException("Patient access is limited to assigned patients.");
        }
    }

    private PatientDto mapToDto(Patient p) {
        return PatientDto.builder()
                .personId(p.getPersonId())
                .patientId(p.getPatientId())
                .name(p.getName())
                .email(p.getEmail())
                .phoneNumber(p.getPhoneNumber())
                .dateOfBirth(p.getDateOfBirth())
                .gender(p.getGender())
                .bloodGroup(p.getBloodGroup())
                .address(p.getAddress())
                .emergencyContact(p.getEmergencyContact())
                .isActive(p.getIsActive())
                .build();
    }
}
