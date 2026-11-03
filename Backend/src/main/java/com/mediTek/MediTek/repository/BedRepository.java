package com.mediTek.MediTek.repository;

import com.mediTek.MediTek.domain.Bed;
import org.springframework.data.jpa.repository.JpaRepository;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface BedRepository extends JpaRepository<Bed, String> {
    List<Bed> findByWard_WardId(String wardId);
    List<Bed> findByOperationalStatus(Bed.BedOperationalStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select bed from Bed bed where bed.bedId = :bedId")
    java.util.Optional<Bed> findByIdForUpdate(@Param("bedId") String bedId);

    long countByOperationalStatus(Bed.BedOperationalStatus status);
}
