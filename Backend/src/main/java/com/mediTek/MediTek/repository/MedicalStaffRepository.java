package com.mediTek.MediTek.repository;

import com.mediTek.MediTek.domain.MedicalStaff;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MedicalStaffRepository extends JpaRepository<MedicalStaff, String> {
    Optional<MedicalStaff> findByStaffId(String staffId);
    long countByIsActiveTrue();
}
