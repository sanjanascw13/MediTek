package com.mediTek.MediTek.repository;

import com.mediTek.MediTek.domain.OperatingTheater;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface OperatingTheaterRepository extends JpaRepository<OperatingTheater, String> {
    List<OperatingTheater> findAllByOrderByTheaterNumberAsc();

    Optional<OperatingTheater> findByTheaterNumber(String theaterNumber);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select theater from OperatingTheater theater where theater.theaterNumber = :theaterNumber")
    Optional<OperatingTheater> findByTheaterNumberForUpdate(@Param("theaterNumber") String theaterNumber);
}
