package com.mediTek.MediTek.repository;

import com.mediTek.MediTek.domain.Surgery;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Collection;
import java.util.Optional;

@Repository
public interface SurgeryRepository extends JpaRepository<Surgery, String> {
    List<Surgery> findByPatient_PersonIdOrderByScheduledAtDesc(String personId);
    List<Surgery> findBySurgeon_PersonIdOrderByScheduledAtDesc(String personId);
    List<Surgery> findByStatus(Surgery.SurgeryStatus status);
    List<Surgery> findByOperatingTheater_DepartmentIdAndStatusIn(
            String departmentId, Collection<Surgery.SurgeryStatus> statuses);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select surgery from Surgery surgery where surgery.surgeryId = :surgeryId")
    Optional<Surgery> findByIdForUpdate(@Param("surgeryId") String surgeryId);
}
