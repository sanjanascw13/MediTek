package com.mediTek.MediTek.service;

import com.mediTek.MediTek.dto.AdmissionDto;
import com.mediTek.MediTek.dto.BedTransferRequest;
import java.util.List;

public interface AdmissionService {
    AdmissionDto admitPatient(AdmissionDto dto);
    AdmissionDto transferBed(BedTransferRequest request);
    AdmissionDto dischargePatient(String admissionId);
    List<AdmissionDto> getAllActiveAdmissions();
}

