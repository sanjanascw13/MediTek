package com.mediTek.MediTek.repository;

import com.mediTek.MediTek.domain.Medicine;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.List;

@Repository
public interface MedicineRepository extends JpaRepository<Medicine, String> {
    Optional<Medicine> findByName(String name);
    List<Medicine> findByIsActiveTrueOrderByNameAsc();
    List<Medicine> findByIsActiveTrueAndNameContainingIgnoreCaseOrderByNameAsc(String name);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select medicine from Medicine medicine where medicine.medicineId = :medicineId")
    Optional<Medicine> findByIdForUpdate(@Param("medicineId") String medicineId);
}
