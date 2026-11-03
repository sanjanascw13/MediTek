package com.mediTek.MediTek.repository;

import com.mediTek.MediTek.domain.IdCounter;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface IdCounterRepository extends JpaRepository<IdCounter, String> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select counter from IdCounter counter where counter.entityName = :entityName")
    Optional<IdCounter> findByEntityNameForUpdate(@Param("entityName") String entityName);
}
