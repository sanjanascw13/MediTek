package com.mediTek.MediTek.service.impl;

import com.mediTek.MediTek.domain.*;
import com.mediTek.MediTek.dto.DashboardStatsDto;
import com.mediTek.MediTek.repository.*;
import com.mediTek.MediTek.security.CurrentUserService;
import com.mediTek.MediTek.service.DashboardService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class DashboardServiceImpl implements DashboardService {

    private final PatientRepository patientRepository;
    private final AppointmentRepository appointmentRepository;
    private final BillRepository billRepository;
    private final BillPaymentRepository billPaymentRepository;
    private final SurgeryRepository surgeryRepository;
    private final AdmissionRepository admissionRepository;
    private final BedRepository bedRepository;
    private final DoctorRepository doctorRepository;
    private final MedicalStaffRepository medicalStaffRepository;
    private final LabTestRepository labTestRepository;
    private final BloodUnitRepository bloodUnitRepository;
    private final MedicalRecordRepository medicalRecordRepository;
    private final CurrentUserService currentUserService;

    public DashboardServiceImpl(PatientRepository patientRepository,
                                AppointmentRepository appointmentRepository,
                                BillRepository billRepository,
                                BillPaymentRepository billPaymentRepository,
                                SurgeryRepository surgeryRepository,
                                AdmissionRepository admissionRepository,
                                BedRepository bedRepository,
                                DoctorRepository doctorRepository,
                                MedicalStaffRepository medicalStaffRepository,
                                LabTestRepository labTestRepository,
                                BloodUnitRepository bloodUnitRepository,
                                MedicalRecordRepository medicalRecordRepository,
                                CurrentUserService currentUserService) {
        this.patientRepository = patientRepository;
        this.appointmentRepository = appointmentRepository;
        this.billRepository = billRepository;
        this.billPaymentRepository = billPaymentRepository;
        this.surgeryRepository = surgeryRepository;
        this.admissionRepository = admissionRepository;
        this.bedRepository = bedRepository;
        this.doctorRepository = doctorRepository;
        this.medicalStaffRepository = medicalStaffRepository;
        this.labTestRepository = labTestRepository;
        this.bloodUnitRepository = bloodUnitRepository;
        this.medicalRecordRepository = medicalRecordRepository;
        this.currentUserService = currentUserService;
    }

    @Override
    @Transactional(readOnly = true)
    public DashboardStatsDto getDashboardStats() {
        Role.RoleName role = Role.RoleName.SUPER_ADMIN;
        String personId = null;

        try {
            role = currentUserService.role();
            UserAccount account = currentUserService.account();
            if (account != null && account.getPerson() != null) {
                personId = account.getPerson().getPersonId();
            }
        } catch (Exception e) {
            // Unauthenticated or test context defaults to administrative view
            role = Role.RoleName.SUPER_ADMIN;
        }

        if (role == Role.RoleName.PATIENT) {
            long myAppointments = personId != null ? appointmentRepository.countByPatient_PersonId(personId) : 0;
            Double outstanding = personId != null ? billRepository.calculatePatientOutstandingBalance(personId) : 0.0;
            Double paid = personId != null ? billPaymentRepository.calculatePatientPaidTotal(personId) : 0.0;
            long activeAdmissions = personId != null ? admissionRepository.countByPatient_PersonIdAndStatus(personId, Admission.AdmissionStatus.ACTIVE) : 0;
            long medRecords = personId != null ? medicalRecordRepository.countByPatient_PersonId(personId) : 0;
            long labReports = personId != null ? labTestRepository.countByPatient_PersonId(personId) : 0;

            return DashboardStatsDto.builder()
                    .role("PATIENT")
                    .newPatients(0)
                    .appointments(myAppointments)
                    .earning(null)
                    .operations(null)
                    .outstandingBalance(outstanding)
                    .totalPaid(paid)
                    .activeAdmissions(activeAdmissions)
                    .medicalRecordsCount(medRecords)
                    .labReportsCount(labReports)
                    .patientDistributions(Collections.emptyList())
                    .recentOperations(Collections.emptyList())
                    .build();
        }

        if (role == Role.RoleName.DOCTOR) {
            long assignedAppts = personId != null ? appointmentRepository.countByDoctor_PersonId(personId) : 0;
            long distinctPatients = personId != null ? appointmentRepository.countDistinctPatientsByDoctor(personId) : 0;
            long activeInpatients = personId != null ? admissionRepository.countByAdmittingDoctor_PersonIdAndStatus(personId, Admission.AdmissionStatus.ACTIVE) : 0;
            long pendingLabs = personId != null ? labTestRepository.countByOrderedByDoctor_PersonIdAndStatus(personId, LabTest.LabTestStatus.PENDING) : 0;

            return DashboardStatsDto.builder()
                    .role("DOCTOR")
                    .newPatients(distinctPatients)
                    .appointments(assignedAppts)
                    .earning(null)
                    .operations(null)
                    .activeAdmissions(activeInpatients)
                    .pendingLabTests(pendingLabs)
                    .patientDistributions(getPatientChartData())
                    .recentOperations(Collections.emptyList())
                    .build();
        }

        if (role == Role.RoleName.STAFF) {
            long totalPatients = patientRepository.count();
            long totalAppts = appointmentRepository.count();
            long activeAdmissions = admissionRepository.countByStatus(Admission.AdmissionStatus.ACTIVE);
            long totalBeds = bedRepository.count();
            long availableOpBeds = bedRepository.countByOperationalStatus(Bed.BedOperationalStatus.AVAILABLE);
            long availableBeds = Math.max(0, availableOpBeds - activeAdmissions);
            long occupiedBeds = activeAdmissions;
            long pendingLabs = labTestRepository.countByStatus(LabTest.LabTestStatus.PENDING);
            long bloodUnits = bloodUnitRepository.countAvailableUnits();

            return DashboardStatsDto.builder()
                    .role("STAFF")
                    .newPatients(totalPatients)
                    .appointments(totalAppts)
                    .earning(null)
                    .operations(null)
                    .activeAdmissions(activeAdmissions)
                    .availableBeds(availableBeds)
                    .totalBeds(totalBeds)
                    .occupiedBeds(occupiedBeds)
                    .pendingLabTests(pendingLabs)
                    .bloodUnitsInStock(bloodUnits)
                    .patientDistributions(getPatientChartData())
                    .recentOperations(Collections.emptyList())
                    .build();
        }

        // SUPER_ADMIN / ADMIN / Default
        long totalPatients = patientRepository.count();
        long totalAppts = appointmentRepository.count();
        Double totalRevenue = billPaymentRepository.calculateTotalRevenue();
        long activeAdmissions = admissionRepository.countByStatus(Admission.AdmissionStatus.ACTIVE);
        long totalBeds = bedRepository.count();
        long availableOpBeds = bedRepository.countByOperationalStatus(Bed.BedOperationalStatus.AVAILABLE);
        long availableBeds = Math.max(0, availableOpBeds - activeAdmissions);
        long occupiedBeds = activeAdmissions;
        long activeDoctors = doctorRepository.countByIsActiveTrue();
        long activeStaff = medicalStaffRepository.countByIsActiveTrue();
        long pendingLabs = labTestRepository.countByStatus(LabTest.LabTestStatus.PENDING);
        long bloodUnits = bloodUnitRepository.countAvailableUnits();
        Double totalOutstanding = billRepository.calculateTotalOutstandingBalance();

        return DashboardStatsDto.builder()
                .role("SUPER_ADMIN")
                .newPatients(totalPatients)
                .appointments(totalAppts)
                .earning(totalRevenue != null ? totalRevenue : 0.0)
                .operations(null) // Surgery deferred: displayed as N/A
                .activeAdmissions(activeAdmissions)
                .availableBeds(availableBeds)
                .totalBeds(totalBeds)
                .occupiedBeds(occupiedBeds)
                .totalDoctors(activeDoctors)
                .totalStaff(activeStaff)
                .pendingLabTests(pendingLabs)
                .bloodUnitsInStock(bloodUnits)
                .outstandingBalance(totalOutstanding)
                .patientDistributions(getPatientChartData())
                .recentOperations(Collections.emptyList())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getPatientChartData() {
        try {
            if (currentUserService.role() == Role.RoleName.PATIENT) {
                return Collections.emptyList();
            }
        } catch (Exception ignored) {
        }

        List<Object[]> rows = patientRepository.countPatientsByBloodGroup();
        if (rows.isEmpty()) {
            return Collections.emptyList();
        }

        long total = rows.stream().mapToLong(r -> ((Number) r[1]).longValue()).sum();
        if (total == 0) {
            return Collections.emptyList();
        }

        List<Map<String, Object>> list = new ArrayList<>();
        for (Object[] row : rows) {
            String bloodGroup = (String) row[0];
            long count = ((Number) row[1]).longValue();
            int percentage = (int) Math.round((double) count * 100.0 / total);

            Map<String, Object> item = new HashMap<>();
            item.put("name", bloodGroup != null ? "Blood " + bloodGroup : "Unknown");
            item.put("value", count);
            item.put("percentage", percentage);
            item.put("color", getColorForBloodGroup(bloodGroup));
            list.add(item);
        }

        return list;
    }

    private String getColorForBloodGroup(String bloodGroup) {
        if (bloodGroup == null) return "#64748b";
        return switch (bloodGroup.trim().toUpperCase()) {
            case "A+" -> "#f97316";
            case "A-" -> "#fb923c";
            case "B+" -> "#84cc16";
            case "B-" -> "#a3e635";
            case "O+" -> "#0ea5e9";
            case "O-" -> "#38bdf8";
            case "AB+" -> "#a855f7";
            case "AB-" -> "#c084fc";
            default -> "#64748b";
        };
    }
}
