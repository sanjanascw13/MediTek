package com.mediTek.MediTek.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class StaffDto {

    private String personId;
    private String staffId;

    @NotBlank
    @Size(min = 3, max = 128)
    private String name;

    @NotNull
    @Past
    private LocalDate dateOfBirth;

    @NotBlank
    @Pattern(regexp = "MALE|FEMALE|OTHER")
    private String gender;

    @NotBlank
    @Pattern(regexp = "^0[0-9]{9}$")
    private String phoneNumber;

    @NotBlank
    @Email
    @Size(max = 128)
    private String email;

    @NotBlank
    @Size(min = 2, max = 64)
    private String role;

    private String departmentId;
    private String departmentName;
    private Boolean isActive;
    private String username;
    private String temporaryPassword;
}
