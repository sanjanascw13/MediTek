package com.mediTek.MediTek.service;

import com.mediTek.MediTek.dto.DepartmentDto;
import java.util.List;

public interface DepartmentService {
    DepartmentDto createDepartment(DepartmentDto dto);
    DepartmentDto getDepartmentById(String id);
    List<DepartmentDto> getAllDepartments();
    void deleteDepartment(String id);
}

