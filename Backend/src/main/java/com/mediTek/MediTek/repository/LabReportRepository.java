package com.mediTek.MediTek.repository;

import com.mediTek.MediTek.domain.LabReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface LabReportRepository extends JpaRepository<LabReport, String> {
    Optional<LabReport> findByLabTest_LabTestId(String labTestId);
}

