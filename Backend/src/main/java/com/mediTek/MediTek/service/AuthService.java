package com.mediTek.MediTek.service;

import com.mediTek.MediTek.dto.AuthRequest;
import com.mediTek.MediTek.dto.AuthResponse;
import com.mediTek.MediTek.dto.PatientRegistrationRequest;
import com.mediTek.MediTek.dto.PasswordChangeRequest;

public interface AuthService {
    AuthResponse login(AuthRequest request);
    AuthResponse registerPatient(PatientRegistrationRequest request);
    void changePassword(String username, PasswordChangeRequest request);
}
