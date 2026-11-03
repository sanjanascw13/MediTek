package com.mediTek.MediTek.service.impl;

import com.mediTek.MediTek.domain.*;
import com.mediTek.MediTek.dto.*;
import com.mediTek.MediTek.exception.ResourceNotFoundException;
import com.mediTek.MediTek.repository.*;
import com.mediTek.MediTek.security.CurrentUserService;
import com.mediTek.MediTek.service.BusinessIdService;
import com.mediTek.MediTek.service.LaboratoryService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;

@Service
public class LaboratoryServiceImpl implements LaboratoryService {

    private final LabTestRepository labTestRepository;
    private final LabReportRepository labReportRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final BusinessIdService businessIdService;
    private final CurrentUserService currentUserService;

    public LaboratoryServiceImpl(LabTestRepository labTestRepository, LabReportRepository labReportRepository,
                                 PatientRepository patientRepository, DoctorRepository doctorRepository,
                                 BusinessIdService businessIdService, CurrentUserService currentUserService) {
        this.labTestRepository = labTestRepository;
        this.labReportRepository = labReportRepository;
        this.patientRepository = patientRepository;
        this.doctorRepository = doctorRepository;
        this.businessIdService = businessIdService;
        this.currentUserService = currentUserService;
    }

    @Override
    @Transactional(readOnly = true)
    public List<LabTestDto> getTests(String patientId, LabTest.LabTestStatus status) {
        Role.RoleName role = currentUserService.role();
        List<LabTest> tests;
        if (role == Role.RoleName.PATIENT) {
            String personId = currentUserService.personId();
            if (patientId != null && !patientId.isBlank()
                    && patientRepository.findByPatientId(patientId).filter(p -> p.getPersonId().equals(personId)).isEmpty()) {
                throw new AccessDeniedException("Patients may view only their own laboratory orders.");
            }
            tests = labTestRepository.findByPatient_PersonId(personId);
        } else if (role == Role.RoleName.DOCTOR) {
            String personId = currentUserService.personId();
            tests = labTestRepository.findAll().stream()
                    .filter(test -> test.getOrderedByDoctor().getPersonId().equals(personId)
                            || reportReviewedBy(test, personId))
                    .toList();
        } else if (role == Role.RoleName.STAFF || role == Role.RoleName.SUPER_ADMIN) {
            tests = labTestRepository.findAll();
        } else {
            throw new AccessDeniedException("This role may not view laboratory orders.");
        }
        if (patientId != null && !patientId.isBlank()
                && role != Role.RoleName.PATIENT) {
            Patient patient = patientRepository.findByPatientId(patientId)
                    .orElseThrow(() -> new ResourceNotFoundException("Patient not found."));
            tests = tests.stream().filter(test -> test.getPatient().getPersonId().equals(patient.getPersonId())).toList();
            if (role == Role.RoleName.DOCTOR && tests.stream().anyMatch(
                    test -> !test.getOrderedByDoctor().getPersonId().equals(currentUserService.personId())
                            && !reportReviewedBy(test, currentUserService.personId()))) {
                throw new AccessDeniedException("Doctors may view only laboratory orders they are responsible for.");
            }
        }
        if (status != null) {
            tests = tests.stream().filter(test -> test.getStatus() == status).toList();
        }
        return tests.stream().sorted(Comparator.comparing(LabTest::getRequestedAt).reversed())
                .map(this::mapTest).toList();
    }

    @Override
    @Transactional
    public LabTestDto createTest(LabTestCreateRequest request) {
        Role.RoleName role = currentUserService.role();
        if (role != Role.RoleName.DOCTOR && role != Role.RoleName.SUPER_ADMIN) {
            throw new AccessDeniedException("Only a Doctor or Super Admin may order a laboratory test.");
        }
        Patient patient = patientRepository.findByPatientId(request.patientId())
                .filter(p -> Boolean.TRUE.equals(p.getIsActive()))
                .orElseThrow(() -> new ResourceNotFoundException("Active patient not found."));
        Doctor doctor;
        if (role == Role.RoleName.DOCTOR) {
            doctor = doctorRepository.findById(currentUserService.personId())
                    .orElseThrow(() -> new AccessDeniedException("Doctor profile not found."));
            if (request.doctorId() != null && !request.doctorId().isBlank()
                    && !doctor.getDoctorId().equals(request.doctorId())) {
                throw new AccessDeniedException("Doctors may order tests only under their own profile.");
            }
        } else {
            doctor = doctorRepository.findByDoctorId(request.doctorId())
                    .filter(d -> Boolean.TRUE.equals(d.getIsActive()))
                    .orElseThrow(() -> new ResourceNotFoundException("Active ordering Doctor not found."));
        }
        if (!Boolean.TRUE.equals(doctor.getIsActive())) {
            throw new IllegalStateException("Laboratory orders require an active Doctor.");
        }
        LabTest test = new LabTest();
        test.setLabTestId(businessIdService.nextId("lab_test", "TST"));
        test.setPatient(patient);
        test.setOrderedByDoctor(doctor);
        test.setTestType(request.testName().trim());
        test.setStatus(LabTest.LabTestStatus.PENDING);
        return mapTest(labTestRepository.save(test));
    }

    @Override
    @Transactional
    public LabTestDto updateStatus(String testId, String requestedStatus) {
        LabTest.LabTestStatus status = LabTest.LabTestStatus.valueOf(requestedStatus);
        if (status != LabTest.LabTestStatus.CANCELLED) {
            throw new IllegalArgumentException("Laboratory orders may only be cancelled through the status endpoint.");
        }
        LabTest test = labTestRepository.findByIdForUpdate(testId)
                .orElseThrow(() -> new ResourceNotFoundException("Laboratory test not found."));
        authorizeTestMutation(test);
        if (test.getStatus() != LabTest.LabTestStatus.PENDING) {
            throw new IllegalStateException("Only pending laboratory orders may be cancelled.");
        }
        test.setStatus(LabTest.LabTestStatus.CANCELLED);
        return mapTest(labTestRepository.save(test));
    }

    @Override
    @Transactional
    public LabReportDto createReport(String testId, LabReportCreateRequest request) {
        LabTest test = labTestRepository.findByIdForUpdate(testId)
                .orElseThrow(() -> new ResourceNotFoundException("Laboratory test not found."));
        authorizeTestMutation(test);
        if (test.getStatus() != LabTest.LabTestStatus.PENDING
                || labReportRepository.findByLabTest_LabTestId(testId).isPresent()) {
            throw new IllegalStateException("A report can be recorded only once for a pending laboratory order.");
        }

        Role.RoleName role = currentUserService.role();
        Doctor reviewer;
        if (role == Role.RoleName.DOCTOR) {
            reviewer = doctorRepository.findById(currentUserService.personId())
                    .orElseThrow(() -> new AccessDeniedException("Doctor profile not found."));
            if (request.reviewingDoctorId() != null && !request.reviewingDoctorId().isBlank()
                    && !reviewer.getDoctorId().equals(request.reviewingDoctorId())) {
                throw new AccessDeniedException("Doctors may review reports only under their own profile.");
            }
        } else {
            reviewer = doctorRepository.findByDoctorId(request.reviewingDoctorId())
                    .filter(d -> Boolean.TRUE.equals(d.getIsActive()))
                    .orElseThrow(() -> new ResourceNotFoundException("Active reviewing Doctor not found."));
        }
        if (!Boolean.TRUE.equals(reviewer.getIsActive())) {
            throw new IllegalStateException("Laboratory reports require an active reviewing Doctor.");
        }

        LabReport report = new LabReport();
        report.setReportId(businessIdService.nextId("lab_report", "REP"));
        report.setLabTest(test);
        report.setReviewingDoctor(reviewer);
        report.setResultSummary(request.resultDetails().trim());
        report.setResultClassification(request.result());
        test.setReport(report);
        test.setStatus(LabTest.LabTestStatus.COMPLETED);
        labReportRepository.save(report);
        labTestRepository.save(test);
        return mapReport(report);
    }

    @Override
    @Transactional(readOnly = true)
    public LabReportDto getReport(String testId) {
        LabTest test = labTestRepository.findById(testId)
                .orElseThrow(() -> new ResourceNotFoundException("Laboratory test not found."));
        authorizeTestRead(test);
        return labReportRepository.findByLabTest_LabTestId(testId)
                .map(this::mapReport)
                .orElseThrow(() -> new ResourceNotFoundException("Laboratory report not found."));
    }

    private void authorizeTestRead(LabTest test) {
        Role.RoleName role = currentUserService.role();
        if (role == Role.RoleName.SUPER_ADMIN || role == Role.RoleName.STAFF) return;
        if (role == Role.RoleName.PATIENT
                && test.getPatient().getPersonId().equals(currentUserService.personId())) return;
        if (role == Role.RoleName.DOCTOR && (test.getOrderedByDoctor().getPersonId().equals(currentUserService.personId())
                || reportReviewedBy(test, currentUserService.personId()))) return;
        throw new AccessDeniedException("You may not access this laboratory record.");
    }

    private void authorizeTestMutation(LabTest test) {
        Role.RoleName role = currentUserService.role();
        if (role == Role.RoleName.STAFF || role == Role.RoleName.SUPER_ADMIN) return;
        if (role == Role.RoleName.DOCTOR
                && test.getOrderedByDoctor().getPersonId().equals(currentUserService.personId())) return;
        throw new AccessDeniedException("You may not update this laboratory order.");
    }

    private boolean reportReviewedBy(LabTest test, String personId) {
        return test.getReport() != null && test.getReport().getReviewingDoctor().getPersonId().equals(personId);
    }

    private LabTestDto mapTest(LabTest test) {
        LabReport report = test.getReport();
        return new LabTestDto(
                test.getLabTestId(),
                test.getPatient().getPatientId(),
                test.getPatient().getName(),
                test.getOrderedByDoctor().getDoctorId(),
                test.getOrderedByDoctor().getName(),
                test.getTestType(),
                test.getRequestedAt(),
                test.getStatus(),
                report == null ? null : report.getReportId(),
                report == null ? null : report.getResultClassification());
    }

    private LabReportDto mapReport(LabReport report) {
        return new LabReportDto(
                report.getReportId(),
                report.getLabTest().getLabTestId(),
                report.getCreatedAt(),
                report.getResultSummary(),
                report.getResultClassification(),
                report.getReviewingDoctor().getDoctorId(),
                report.getReviewingDoctor().getName());
    }
}
