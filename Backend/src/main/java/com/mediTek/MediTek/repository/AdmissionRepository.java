package com.mediTek.MediTek.repository;

import com.mediTek.MediTek.domain.Admission;
import org.springframework.data.jpa.repository.JpaRepository;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface AdmissionRepository extends JpaRepository<Admission, String> {
    List<Admission> findByPatient_PersonId(String personId);
    Optional<Admission> findByPatient_PersonIdAndStatus(String personId, Admission.AdmissionStatus status);
    Optional<Admission> findByBed_BedIdAndStatus(String bedId, Admission.AdmissionStatus status);
    boolean existsByBed_BedIdAndStatus(String bedId, Admission.AdmissionStatus status);
    boolean existsByPatient_PersonIdAndStatus(String personId, Admission.AdmissionStatus status);
    List<Admission> findByAdmittingDoctor_PersonIdAndStatus(String personId, Admission.AdmissionStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select admission from Admission admission where admission.admissionId = :admissionId")
    Optional<Admission> findByIdForUpdate(@Param("admissionId") String admissionId);

    List<Admission> findByStatus(Admission.AdmissionStatus status);

    long countByStatus(Admission.AdmissionStatus status);
    long countByPatient_PersonIdAndStatus(String personId, Admission.AdmissionStatus status);
    long countByAdmittingDoctor_PersonIdAndStatus(String personId, Admission.AdmissionStatus status);
}
