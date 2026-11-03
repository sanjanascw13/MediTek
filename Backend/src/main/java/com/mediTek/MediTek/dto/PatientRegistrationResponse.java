package com.mediTek.MediTek.dto;

public record PatientRegistrationResponse(
        PatientDto patient,
        String username,
        String temporaryPassword
) {
}
