package com.mediTek.MediTek.dto;

import com.mediTek.MediTek.domain.Surgery;
import jakarta.validation.constraints.NotNull;

public record SurgeryStatusRequest(@NotNull Surgery.SurgeryStatus status) {
}
