package com.mediTek.MediTek.dto;

public record WardDto(
        String wardId,
        String wardName,
        String wardType,
        long totalBeds,
        long availableBeds,
        long occupiedBeds,
        long maintenanceBeds,
        long unavailableBeds,
        String departmentId,
        String departmentName
) {
    public WardDto(String wardId, String wardName, String wardType, long totalBeds, long availableBeds, long occupiedBeds, long maintenanceBeds, long unavailableBeds) {
        this(wardId, wardName, wardType, totalBeds, availableBeds, occupiedBeds, maintenanceBeds, unavailableBeds, null, null);
    }
}
