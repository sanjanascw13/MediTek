package com.mediTek.MediTek.service;

import com.mediTek.MediTek.domain.Doctor;
import com.mediTek.MediTek.domain.MedicalStaff;
import com.mediTek.MediTek.domain.Patient;
import com.mediTek.MediTek.domain.UserAccount;
import com.mediTek.MediTek.dto.DoctorActivationDetailsDto;
import com.mediTek.MediTek.dto.EmailNotificationResult;

public interface DoctorNotificationService {
    EmailNotificationResult sendDoctorAccountCreatedNotification(Doctor doctor, UserAccount account);
    EmailNotificationResult sendStaffAccountCreatedNotification(MedicalStaff staff, String username, String temporaryPassword);
    EmailNotificationResult sendPatientAccountCreatedNotification(Patient patient, String username, String temporaryPassword, boolean isSelfRegistered);
    EmailNotificationResult resendDoctorNotification(String doctorId);
    DoctorActivationDetailsDto verifyToken(String rawToken);
    void activateAccount(String rawToken, String newPassword);
    boolean isSmtpConfigured();
}

