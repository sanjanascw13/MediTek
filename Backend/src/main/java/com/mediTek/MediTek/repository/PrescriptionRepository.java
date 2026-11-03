package com.mediTek.MediTek.repository;

import com.mediTek.MediTek.domain.Prescription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PrescriptionRepository extends JpaRepository<Prescription, String> {
    List<Prescription> findByPatient_PersonId(String personId);
    List<Prescription> findByDoctor_PersonId(String personId);
}

