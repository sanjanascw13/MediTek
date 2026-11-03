package com.mediTek.MediTek.repository;

import com.mediTek.MediTek.domain.PrescriptionItem;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PrescriptionItemRepository extends JpaRepository<PrescriptionItem, String> {
    List<PrescriptionItem> findByPrescription_PrescriptionId(String prescriptionId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select item from PrescriptionItem item where item.itemId = :itemId")
    Optional<PrescriptionItem> findByIdForUpdate(@Param("itemId") String itemId);
}
