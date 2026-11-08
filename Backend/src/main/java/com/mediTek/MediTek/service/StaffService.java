package com.mediTek.MediTek.service;

import com.mediTek.MediTek.dto.StaffDto;

import java.util.List;

public interface StaffService {
    StaffDto createStaff(StaffDto dto);
    List<StaffDto> getAllStaff();
    StaffDto getStaffById(String id);
    StaffDto setActive(String id, boolean active);
    void deleteStaff(String id);
}
