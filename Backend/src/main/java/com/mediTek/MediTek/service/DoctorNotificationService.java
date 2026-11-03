package com.mediTek.MediTek.service;

import com.mediTek.MediTek.domain.Doctor;
import com.mediTek.MediTek.domain.UserAccount;
import com.mediTek.MediTek.dto.DoctorActivationDetailsDto;
import com.mediTek.MediTek.dto.EmailNotificationResult;

public interface DoctorNotificationService {
    EmailNotificationResult sendDoctorAccountCreatedNotification(Doctor doctor, UserAccount account);
    EmailNotificationResult resendDoctorNotification(String doctorId);
    DoctorActivationDetailsDto verifyToken(String rawToken);
    void activateAccount(String rawToken, String newPassword);
    boolean isSmtpConfigured();
}

