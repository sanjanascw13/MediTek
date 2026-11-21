package com.mediTek.MediTek.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserProfileDto {
    private String username;
    private String personId;
    private String name;
    private String email;
    private String phoneNumber;
    private String gender;
    private String role;
    private String designation;
    private String profileImage;
}

