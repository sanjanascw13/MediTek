package com.mediTek.MediTek.dto;

public record EmailNotificationResult(
        boolean sent,
        boolean configured,
        String recipientEmail,
        String message
) {}

