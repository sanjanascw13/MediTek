package com.mediTek.MediTek.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BedTransferRequest {
    @NotBlank
    private String currentAdmissionId;

    @NotBlank
    private String targetBedId;

    private String reason;
}

