package com.mediTek.MediTek.service.impl;

import com.mediTek.MediTek.domain.Admission;
import com.mediTek.MediTek.domain.Bed;
import com.mediTek.MediTek.domain.Department;
import com.mediTek.MediTek.domain.Ward;
import com.mediTek.MediTek.dto.BedCreateRequest;
import com.mediTek.MediTek.dto.BedDto;
import com.mediTek.MediTek.dto.WardCreateRequest;
import com.mediTek.MediTek.dto.WardDto;
import com.mediTek.MediTek.exception.ResourceNotFoundException;
import com.mediTek.MediTek.repository.AdmissionRepository;
import com.mediTek.MediTek.repository.BedRepository;
import com.mediTek.MediTek.repository.DepartmentRepository;
import com.mediTek.MediTek.repository.WardRepository;
import com.mediTek.MediTek.service.BusinessIdService;
import com.mediTek.MediTek.service.FacilityService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class FacilityServiceImpl implements FacilityService {

    private final WardRepository wardRepository;
    private final BedRepository bedRepository;
    private final AdmissionRepository admissionRepository;
    private final DepartmentRepository departmentRepository;
    private final BusinessIdService businessIdService;

    public FacilityServiceImpl(WardRepository wardRepository, BedRepository bedRepository,
                               AdmissionRepository admissionRepository, DepartmentRepository departmentRepository,
                               BusinessIdService businessIdService) {
        this.wardRepository = wardRepository;
        this.bedRepository = bedRepository;
        this.admissionRepository = admissionRepository;
        this.departmentRepository = departmentRepository;
        this.businessIdService = businessIdService;
    }

    @Override
    @Transactional(readOnly = true)
    public List<WardDto> getWards() {
        List<Admission> activeAdmissions = admissionRepository.findByStatus(Admission.AdmissionStatus.ACTIVE);
        Map<String, Admission> activeByBed = activeAdmissions.stream()
                .collect(Collectors.toMap(admission -> admission.getBed().getBedId(), Function.identity()));
        return wardRepository.findAll().stream()
                .map(ward -> mapWard(ward, bedRepository.findByWard_WardId(ward.getWardId()), activeByBed))
                .toList();
    }

    @Override
    @Transactional
    public WardDto createWard(WardCreateRequest request) {
        Department department = null;
        if (request.departmentId() != null && !request.departmentId().isBlank()) {
            department = departmentRepository.findById(request.departmentId().trim())
                    .orElseThrow(() -> new ResourceNotFoundException("Department not found: " + request.departmentId()));
        }
        Ward ward = new Ward();
        ward.setWardId(businessIdService.nextId("ward", "WRD"));
        ward.setWardName(request.wardName().trim());
        ward.setWardType(request.wardType().trim());
        ward.setDepartment(department);
        return mapWard(wardRepository.save(ward), List.of(), Map.of());
    }

    @Override
    @Transactional(readOnly = true)
    public List<BedDto> getBeds(String wardId, String status) {
        List<Admission> activeAdmissions = admissionRepository.findByStatus(Admission.AdmissionStatus.ACTIVE);
        Map<String, Admission> activeByBed = activeAdmissions.stream()
                .collect(Collectors.toMap(admission -> admission.getBed().getBedId(), Function.identity()));
        List<Bed> beds = wardId == null || wardId.isBlank()
                ? bedRepository.findAll()
                : bedRepository.findByWard_WardId(wardId);
        return beds.stream()
                .map(bed -> mapBed(bed, activeByBed.get(bed.getBedId())))
                .filter(bed -> status == null || status.isBlank()
                        || status.equalsIgnoreCase(bed.availabilityStatus()))
                .toList();
    }

    @Override
    @Transactional
    public BedDto createBed(BedCreateRequest request) {
        Ward ward = wardRepository.findById(request.wardId())
                .orElseThrow(() -> new ResourceNotFoundException("Ward not found: " + request.wardId()));
        Bed bed = new Bed();
        String bedId = businessIdService.nextId("bed", "BED");
        bed.setBedId(bedId);
        bed.setWard(ward);

        String bedNumber = request.bedNumber();
        if (bedNumber == null || bedNumber.isBlank()) {
            long existingCount = bedRepository.countByWard_WardId(ward.getWardId());
            long candidateNumber = existingCount + 1;
            bedNumber = String.format("B-%02d", candidateNumber);
            while (bedRepository.existsByWard_WardIdAndBedNumber(ward.getWardId(), bedNumber)) {
                candidateNumber++;
                bedNumber = String.format("B-%02d", candidateNumber);
            }
        }
        bed.setBedNumber(bedNumber.trim());
        bed.setOperationalStatus(Bed.BedOperationalStatus.AVAILABLE);
        return mapBed(bedRepository.save(bed), null);
    }

    @Override
    @Transactional
    public BedDto updateBedStatus(String bedId, Bed.BedOperationalStatus status) {
        Bed bed = bedRepository.findByIdForUpdate(bedId)
                .orElseThrow(() -> new ResourceNotFoundException("Bed not found: " + bedId));
        if (admissionRepository.existsByBed_BedIdAndStatus(bedId, Admission.AdmissionStatus.ACTIVE)) {
            throw new IllegalStateException("Cannot change an occupied bed's operational status.");
        }
        bed.setOperationalStatus(status);
        return mapBed(bedRepository.save(bed), null);
    }

    private WardDto mapWard(Ward ward, List<Bed> beds, Map<String, Admission> activeByBed) {
        long occupied = beds.stream().filter(bed -> activeByBed.containsKey(bed.getBedId())).count();
        long maintenance = beds.stream()
                .filter(bed -> bed.getOperationalStatus() == Bed.BedOperationalStatus.MAINTENANCE).count();
        long unavailable = beds.stream()
                .filter(bed -> bed.getOperationalStatus() == Bed.BedOperationalStatus.UNAVAILABLE).count();
        long available = beds.stream()
                .filter(bed -> bed.getOperationalStatus() == Bed.BedOperationalStatus.AVAILABLE)
                .filter(bed -> !activeByBed.containsKey(bed.getBedId()))
                .count();
        return new WardDto(
                ward.getWardId(),
                ward.getWardName(),
                ward.getWardType(),
                beds.size(),
                available,
                occupied,
                maintenance,
                unavailable,
                ward.getDepartment() != null ? ward.getDepartment().getDepartmentId() : null,
                ward.getDepartment() != null ? ward.getDepartment().getDepartmentName() : null
        );
    }

    private BedDto mapBed(Bed bed, Admission activeAdmission) {
        String availability = activeAdmission == null
                ? bed.getOperationalStatus().name() : "OCCUPIED";
        Ward ward = bed.getWard();
        String departmentId = ward != null && ward.getDepartment() != null ? ward.getDepartment().getDepartmentId() : null;
        String departmentName = ward != null && ward.getDepartment() != null ? ward.getDepartment().getDepartmentName() : null;
        return new BedDto(
                bed.getBedId(),
                ward != null ? ward.getWardId() : null,
                ward != null ? ward.getWardName() : null,
                bed.getBedNumber(),
                availability,
                bed.getOperationalStatus(),
                activeAdmission == null ? null : activeAdmission.getPatient().getName(),
                departmentId,
                departmentName
        );
    }
}
