package com.mediTek.MediTek.service;

import com.mediTek.MediTek.dto.DoctorDto;
import java.util.List;

public interface DoctorService {
    DoctorDto createDoctor(DoctorDto dto);
    DoctorDto getDoctorById(String id);
    List<DoctorDto> getAllDoctors();
    DoctorDto setActive(String id, boolean active);
}
