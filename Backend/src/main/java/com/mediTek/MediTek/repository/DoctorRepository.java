package com.mediTek.MediTek.repository;

import com.mediTek.MediTek.domain.Doctor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

/**
 * Repository for Doctor entities.
 */
@Repository
public interface DoctorRepository extends JpaRepository<Doctor, String> {
    Optional<Doctor> findByDoctorId(String doctorId);
    Optional<Doctor> findByEmail(String email);
}

