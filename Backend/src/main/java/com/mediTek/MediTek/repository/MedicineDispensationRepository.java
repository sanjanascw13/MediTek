package com.mediTek.MediTek.repository;

import com.mediTek.MediTek.domain.MedicineDispensation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MedicineDispensationRepository extends JpaRepository<MedicineDispensation, String> {
    List<MedicineDispensation> findAllByOrderByDispensedAtDesc();
    List<MedicineDispensation> findByPatient_PersonIdOrderByDispensedAtDesc(String personId);
    List<MedicineDispensation> findByPatient_PersonId(String personId);
}
