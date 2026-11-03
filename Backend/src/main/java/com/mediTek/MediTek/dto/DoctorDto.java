package com.mediTek.MediTek.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.constraints.*;
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
public class DoctorDto {
    private String personId;
    private String doctorId;

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
    private String specialization;

    @NotBlank
    @Size(min = 5, max = 64)
    private String licenseNumber;

    private String departmentId;
    private String departmentName;
    private Boolean isActive;
    private String username;
    private String temporaryPassword;

    // Doctor Email Notification Result details
    private Boolean emailSent;
    private Boolean smtpConfigured;
    private String emailNotificationMessage;
}
