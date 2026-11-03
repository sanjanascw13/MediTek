package com.mediTek.MediTek.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Future;

import java.time.Instant;

public record SurgeryCreateRequest(
        @NotBlank String patientId,
        String doctorId,
        @NotBlank String theaterNumber,
        @NotNull @Future Instant scheduledAt,
        @NotBlank @Size(max = 128) String surgeryType,
        @NotNull @Min(1) @Max(1440) Integer durationMinutes,
        @Size(max = 4000) String notes
) {
}
