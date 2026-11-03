package com.mediTek.MediTek.dto;

import com.mediTek.MediTek.domain.Bed;
import jakarta.validation.constraints.NotNull;

public record BedStatusUpdateRequest(@NotNull Bed.BedOperationalStatus status) {
}
