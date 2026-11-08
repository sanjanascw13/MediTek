package com.mediTek.MediTek.controller;

import com.mediTek.MediTek.dto.DoctorDto;
import com.mediTek.MediTek.dto.EmailNotificationResult;
import com.mediTek.MediTek.service.DoctorNotificationService;
import com.mediTek.MediTek.service.DoctorService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/doctors")
public class DoctorController {

    private final DoctorService doctorService;
    private final DoctorNotificationService doctorNotificationService;

    public DoctorController(DoctorService doctorService, DoctorNotificationService doctorNotificationService) {
        this.doctorService = doctorService;
        this.doctorNotificationService = doctorNotificationService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<DoctorDto> createDoctor(@Valid @RequestBody DoctorDto dto) {
        DoctorDto created = doctorService.createDoctor(dto);
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }

    @PostMapping("/{id}/resend-activation")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<EmailNotificationResult> resendActivation(@PathVariable String id) {
        EmailNotificationResult result = doctorNotificationService.resendDoctorNotification(id);
        return ResponseEntity.ok(result);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'STAFF', 'PATIENT')")
    public ResponseEntity<List<DoctorDto>> getAllDoctors() {
        return ResponseEntity.ok(doctorService.getAllDoctors());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'STAFF', 'PATIENT')")
    public ResponseEntity<DoctorDto> getDoctorById(@PathVariable String id) {
        return ResponseEntity.ok(doctorService.getDoctorById(id));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<DoctorDto> setActive(@PathVariable String id, @RequestParam boolean active) {
        return ResponseEntity.ok(doctorService.setActive(id, active));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<Void> deleteDoctor(@PathVariable String id) {
        doctorService.deleteDoctor(id);
        return ResponseEntity.noContent().build();
    }
}
