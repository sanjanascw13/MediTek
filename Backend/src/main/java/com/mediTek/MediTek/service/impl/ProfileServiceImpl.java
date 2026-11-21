package com.mediTek.MediTek.service.impl;

import com.mediTek.MediTek.domain.Person;
import com.mediTek.MediTek.domain.UserAccount;
import com.mediTek.MediTek.dto.UpdateProfileRequest;
import com.mediTek.MediTek.dto.UserProfileDto;
import com.mediTek.MediTek.repository.MedicalStaffRepository;
import com.mediTek.MediTek.repository.PersonRepository;
import com.mediTek.MediTek.security.CurrentUserService;
import com.mediTek.MediTek.service.ProfileService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProfileServiceImpl implements ProfileService {

    private final CurrentUserService currentUserService;
    private final PersonRepository personRepository;
    private final MedicalStaffRepository medicalStaffRepository;

    public ProfileServiceImpl(CurrentUserService currentUserService,
                              PersonRepository personRepository,
                              MedicalStaffRepository medicalStaffRepository) {
        this.currentUserService = currentUserService;
        this.personRepository = personRepository;
        this.medicalStaffRepository = medicalStaffRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public UserProfileDto getProfile() {
        UserAccount account = currentUserService.account();
        Person person = account.getPerson();

        String designation = null;
        if (person != null) {
            designation = medicalStaffRepository.findById(person.getPersonId())
                    .map(staff -> staff.getRole())
                    .orElse(null);
        }

        return UserProfileDto.builder()
                .username(account.getUsername())
                .personId(person != null ? person.getPersonId() : null)
                .name(person != null ? person.getName() : account.getUsername())
                .email(person != null ? person.getEmail() : null)
                .phoneNumber(person != null ? person.getPhoneNumber() : null)
                .gender(person != null ? person.getGender() : null)
                .role(account.getRole() != null ? account.getRole().getName().name() : null)
                .designation(designation)
                .profileImage(person != null ? person.getProfileImage() : null)
                .build();
    }

    @Override
    @Transactional
    public UserProfileDto updateProfile(UpdateProfileRequest request) {
        UserAccount account = currentUserService.account();
        Person person = account.getPerson();

        if (person == null) {
            throw new AccessDeniedException("No person record linked to this user account.");
        }

        String targetEmail = request.getEmail().trim().toLowerCase();
        personRepository.findByEmail(targetEmail).ifPresent(existing -> {
            if (!existing.getPersonId().equals(person.getPersonId())) {
                throw new IllegalArgumentException("Email address is already in use by another user: " + targetEmail);
            }
        });

        person.setName(request.getName().trim());
        person.setEmail(targetEmail);
        if (request.getPhoneNumber() != null && !request.getPhoneNumber().isBlank()) {
            person.setPhoneNumber(request.getPhoneNumber().trim());
        }
        if (request.getProfileImage() != null) {
            person.setProfileImage(request.getProfileImage());
        }

        personRepository.save(person);
        return getProfile();
    }
}
