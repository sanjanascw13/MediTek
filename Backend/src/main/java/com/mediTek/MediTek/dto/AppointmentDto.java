package com.mediTek.MediTek.dto;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AppointmentDto {
    private String appointmentId;

    private String patientPersonId;
    private String patientName;

    @NotBlank
    private String doctorPersonId;
    private String doctorName;

    @NotNull
    @Future
    private Instant appointmentDate;
    private String status;
    private String notes;
}
