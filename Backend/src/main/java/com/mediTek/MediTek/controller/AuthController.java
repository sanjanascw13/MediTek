package com.mediTek.MediTek.controller;

import com.mediTek.MediTek.dto.*;
import com.mediTek.MediTek.service.AuthService;
import com.mediTek.MediTek.service.DoctorNotificationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final DoctorNotificationService doctorNotificationService;

    public AuthController(AuthService authService, DoctorNotificationService doctorNotificationService) {
        this.authService = authService;
        this.doctorNotificationService = doctorNotificationService;
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody AuthRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> registerPatient(
            @Valid @RequestBody PatientRegistrationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.registerPatient(request));
    }

    @PostMapping("/change-password")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> changePassword(@Valid @RequestBody PasswordChangeRequest request) {
        authService.changePassword(
                SecurityContextHolder.getContext().getAuthentication().getName(), request);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/verify-activation-token")
    public ResponseEntity<DoctorActivationDetailsDto> verifyActivationToken(@RequestParam String token) {
        return ResponseEntity.ok(doctorNotificationService.verifyToken(token));
    }

    @PostMapping("/activate-doctor")
    public ResponseEntity<Void> activateDoctor(@Valid @RequestBody DoctorActivationRequest request) {
        doctorNotificationService.activateAccount(request.token(), request.password());
        return ResponseEntity.noContent().build();
    }
}
