package com.mediTek.MediTek.repository;

import com.mediTek.MediTek.domain.Patient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

/**
 * Repository for Patient entities.
 */
@Repository
public interface PatientRepository extends JpaRepository<Patient, String> {
    Optional<Patient> findByPatientId(String patientId);
    Optional<Patient> findByEmail(String email);
}

