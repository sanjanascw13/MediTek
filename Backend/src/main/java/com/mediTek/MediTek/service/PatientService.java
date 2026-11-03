package com.mediTek.MediTek.service;

import com.mediTek.MediTek.dto.PatientDto;
import com.mediTek.MediTek.dto.PatientRegistrationRequest;
import com.mediTek.MediTek.dto.PatientRegistrationResponse;
import java.util.List;

public interface PatientService {
    PatientRegistrationResponse createPatient(PatientDto dto);
    PatientDto registerPatient(PatientRegistrationRequest request);
    PatientDto getCurrentPatient();
    PatientDto getPatientById(String id);
    List<PatientDto> getAllPatients();
    void deletePatient(String id);
}
