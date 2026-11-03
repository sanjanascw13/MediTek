package com.mediTek.MediTek.repository;

import com.mediTek.MediTek.domain.BloodUnit;
import com.mediTek.MediTek.domain.BloodType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import jakarta.persistence.LockModeType;

import java.util.List;
import java.util.Optional;

@Repository
public interface BloodUnitRepository extends JpaRepository<BloodUnit, String> {
    List<BloodUnit> findByBloodType(BloodType bloodType);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select unit from BloodUnit unit where unit.unitId = :unitId")
    Optional<BloodUnit> findByIdForUpdate(@Param("unitId") String unitId);

    @Query("SELECT COUNT(u) FROM BloodUnit u WHERE u.expirationDate >= CURRENT_DATE AND u.quantityMl > 0")
    long countAvailableUnits();
}
