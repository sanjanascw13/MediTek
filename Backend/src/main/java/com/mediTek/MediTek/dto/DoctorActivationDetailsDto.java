package com.mediTek.MediTek.dto;

public record DoctorActivationDetailsDto(
        String doctorName,
        String username,
        String email,
        boolean valid,
        String status
) {}

