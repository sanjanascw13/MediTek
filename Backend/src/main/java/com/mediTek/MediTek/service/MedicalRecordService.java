package com.mediTek.MediTek.service;

import com.mediTek.MediTek.dto.MedicalRecordCreateRequest;
import com.mediTek.MediTek.dto.MedicalRecordDto;

import java.util.List;

public interface MedicalRecordService {
    List<MedicalRecordDto> getMedicalRecords(String patientId);
    List<MedicalRecordDto> getCurrentPatientRecords();
    MedicalRecordDto createMedicalRecord(MedicalRecordCreateRequest request);
}
