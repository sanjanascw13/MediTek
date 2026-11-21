package com.mediTek.MediTek.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateProfileRequest {
    @NotBlank(message = "Name cannot be empty")
    @Size(max = 128, message = "Name must not exceed 128 characters")
    private String name;

    @NotBlank(message = "Email cannot be empty")
    @Email(message = "Invalid email address format")
    @Size(max = 128, message = "Email must not exceed 128 characters")
    private String email;

    @Size(max = 32, message = "Phone number must not exceed 32 characters")
    private String phoneNumber;

    private String profileImage;
}

