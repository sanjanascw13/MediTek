package com.mediTek.MediTek.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DepartmentDto {
    private String departmentId;

    @NotBlank
    private String departmentName;

    @NotBlank
    private String location;

    private String subtype;
    private String detail;
}

