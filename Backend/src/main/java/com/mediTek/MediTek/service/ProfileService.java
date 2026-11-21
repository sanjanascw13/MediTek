package com.mediTek.MediTek.service;

import com.mediTek.MediTek.dto.UpdateProfileRequest;
import com.mediTek.MediTek.dto.UserProfileDto;

public interface ProfileService {
    UserProfileDto getProfile();
    UserProfileDto updateProfile(UpdateProfileRequest request);
}

