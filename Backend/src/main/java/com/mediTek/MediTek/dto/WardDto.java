package com.mediTek.MediTek.dto;

public record WardDto(
        String wardId,
        String wardName,
        String wardType,
        long totalBeds,
        long availableBeds,
        long occupiedBeds,
        long maintenanceBeds,
        long unavailableBeds
) {
}
