package com.mediTek.MediTek.service.impl;

import com.mediTek.MediTek.domain.Department;
import com.mediTek.MediTek.dto.DepartmentDto;
import com.mediTek.MediTek.exception.ResourceNotFoundException;
import com.mediTek.MediTek.repository.DepartmentRepository;
import com.mediTek.MediTek.service.DepartmentService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class DepartmentServiceImpl implements DepartmentService {

    private final DepartmentRepository departmentRepository;

    public DepartmentServiceImpl(DepartmentRepository departmentRepository) {
        this.departmentRepository = departmentRepository;
    }

    @Override
    @Transactional
    public DepartmentDto createDepartment(DepartmentDto dto) {
        Department dept = new Department();
        dept.setDepartmentId(dto.getDepartmentId() != null ? dto.getDepartmentId() : "DEP-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase());
        dept.setDepartmentName(dto.getDepartmentName());
        dept.setLocation(dto.getLocation());

        Department saved = departmentRepository.save(dept);
        return mapToDto(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public DepartmentDto getDepartmentById(String id) {
        Department dept = departmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department not found: " + id));
        return mapToDto(dept);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DepartmentDto> getAllDepartments() {
        return departmentRepository.findAll().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void deleteDepartment(String id) {
        departmentRepository.deleteById(id);
    }

    private DepartmentDto mapToDto(Department d) {
        return DepartmentDto.builder()
                .departmentId(d.getDepartmentId())
                .departmentName(d.getDepartmentName())
                .location(d.getLocation())
                .subtype("CLINICAL")
                .detail("Standard Division")
                .build();
    }
}
