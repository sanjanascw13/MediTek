package com.mediTek.MediTek.service.impl;

import com.mediTek.MediTek.domain.*;
import com.mediTek.MediTek.dto.AuthRequest;
import com.mediTek.MediTek.dto.AuthResponse;
import com.mediTek.MediTek.dto.PatientDto;
import com.mediTek.MediTek.dto.PatientRegistrationRequest;
import com.mediTek.MediTek.dto.PasswordChangeRequest;
import com.mediTek.MediTek.repository.UserAccountRepository;
import com.mediTek.MediTek.security.JwtUtil;
import com.mediTek.MediTek.service.AuthService;
import com.mediTek.MediTek.service.PatientService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Service
public class AuthServiceImpl implements AuthService {
    private final UserAccountRepository userAccountRepository;
    private final PatientService patientService;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthServiceImpl(UserAccountRepository userAccountRepository,
                           PatientService patientService,
                           PasswordEncoder passwordEncoder,
                           JwtUtil jwtUtil) {
        this.userAccountRepository = userAccountRepository;
        this.patientService = patientService;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    @Override
    @Transactional(readOnly = true)
    public AuthResponse login(AuthRequest request) {
        String username = request.getUsername().trim().toLowerCase(Locale.ROOT);
        UserAccount account = userAccountRepository.findByUsername(username)
                .orElseThrow(() -> new BadCredentialsException("Invalid username or password"));

        if (!Boolean.TRUE.equals(account.getEnabled())
                || (account.getPerson() != null && !Boolean.TRUE.equals(account.getPerson().getIsActive()))
                || !passwordEncoder.matches(request.getPassword(), account.getPasswordHash())) {
            throw new BadCredentialsException("Invalid username or password");
        }

        String role = account.getRole().getName().name();
        if (role.equals("ADMIN")) role = "SUPER_ADMIN";
        String token = jwtUtil.generateToken(account.getUsername(), role);

        return createResponse(token, account.getUsername(), role,
                account.getPerson() == null ? null : account.getPerson().getPersonId(),
                account.getPerson() == null ? account.getUsername() : account.getPerson().getName(),
                Boolean.TRUE.equals(account.getPasswordChangeRequired()));
    }

    @Override
    @Transactional
    public AuthResponse registerPatient(PatientRegistrationRequest request) {
        request.setUsername(request.getUsername().trim().toLowerCase(Locale.ROOT));
        PatientDto patient = patientService.registerPatient(request);
        String role = "PATIENT";
        String token = jwtUtil.generateToken(request.getUsername().trim(), role);
        return createResponse(token, request.getUsername().trim(), role,
                patient.getPersonId(), patient.getName(), false);
    }

    @Override
    @Transactional
    public void changePassword(String username, PasswordChangeRequest request) {
        UserAccount account = userAccountRepository.findByUsername(username)
                .orElseThrow(() -> new AccessDeniedException("Authenticated account is no longer available."));
        if (!passwordEncoder.matches(request.getCurrentPassword(), account.getPasswordHash())) {
            throw new BadCredentialsException("Current password is incorrect.");
        }
        if (passwordEncoder.matches(request.getNewPassword(), account.getPasswordHash())) {
            throw new IllegalArgumentException("The new password must differ from the current password.");
        }
        account.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        account.setPasswordChangeRequired(false);
        userAccountRepository.save(account);
    }

    private AuthResponse createResponse(String token, String username, String role, String personId,
                                        String name, boolean passwordChangeRequired) {
        return AuthResponse.builder()
                .token(token)
                .tokenType("Bearer")
                .expiresIn(jwtUtil.getExpirationSeconds())
                .username(username)
                .role(role)
                .personId(personId)
                .name(name)
                .passwordChangeRequired(passwordChangeRequired)
                .build();
    }
}
