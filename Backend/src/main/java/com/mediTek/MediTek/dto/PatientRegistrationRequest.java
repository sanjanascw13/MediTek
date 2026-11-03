package com.mediTek.MediTek.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;

@Data
public class PatientRegistrationRequest {

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
    @Pattern(regexp = "A[+-]|B[+-]|AB[+-]|O[+-]")
    private String bloodGroup;

    @NotBlank
    @Size(max = 255)
    private String address;

    @NotBlank
    @Pattern(regexp = "^0[0-9]{9}$")
    private String emergencyContact;

    @NotBlank
    @Size(min = 3, max = 64)
    @Pattern(regexp = "^[a-zA-Z0-9._-]+$")
    private String username;

    @NotBlank
    @Size(min = 12, max = 128)
    private String password;
}
