package com.mediTek.MediTek.service;

import com.mediTek.MediTek.domain.Surgery;
import com.mediTek.MediTek.dto.OperatingTheaterDto;
import com.mediTek.MediTek.dto.SurgeryCreateRequest;
import com.mediTek.MediTek.dto.SurgeryDto;

import java.util.List;

public interface SurgeryService {
    List<SurgeryDto> getSurgeries(String patientId, Surgery.SurgeryStatus status, String search);

    List<OperatingTheaterDto> getOperatingTheaters();

    SurgeryDto createSurgery(SurgeryCreateRequest request);

    SurgeryDto updateStatus(String surgeryId, Surgery.SurgeryStatus status);
}
