package com.mediTek.MediTek.service;

import com.mediTek.MediTek.dto.DispensationDto;
import com.mediTek.MediTek.dto.DispenseRequest;
import com.mediTek.MediTek.dto.MedicineCreateRequest;
import com.mediTek.MediTek.dto.MedicineDto;
import com.mediTek.MediTek.dto.PrescriptionCreateRequest;
import com.mediTek.MediTek.dto.PrescriptionDto;

import java.util.List;

public interface PharmacyService {
    List<MedicineDto> getMedicines(String search);
    MedicineDto createMedicine(MedicineCreateRequest request);
    MedicineDto updateStock(String medicineId, int quantityChange);
    List<PrescriptionDto> getPrescriptions();
    PrescriptionDto createPrescription(PrescriptionCreateRequest request);
    List<DispensationDto> getDispensations();
    DispensationDto dispense(String prescriptionId, DispenseRequest request);
}
