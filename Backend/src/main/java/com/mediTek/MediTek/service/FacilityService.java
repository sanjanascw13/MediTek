package com.mediTek.MediTek.service;

import com.mediTek.MediTek.dto.BedCreateRequest;
import com.mediTek.MediTek.dto.BedDto;
import com.mediTek.MediTek.dto.WardCreateRequest;
import com.mediTek.MediTek.dto.WardDto;
import com.mediTek.MediTek.domain.Bed;

import java.util.List;

public interface FacilityService {
    List<WardDto> getWards();
    WardDto createWard(WardCreateRequest request);
    List<BedDto> getBeds(String wardId, String status);
    BedDto createBed(BedCreateRequest request);
    BedDto updateBedStatus(String bedId, Bed.BedOperationalStatus status);
}
