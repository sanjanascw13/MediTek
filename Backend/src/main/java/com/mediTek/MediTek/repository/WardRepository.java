package com.mediTek.MediTek.repository;

import com.mediTek.MediTek.domain.Ward;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface WardRepository extends JpaRepository<Ward, String> {
    Optional<Ward> findByWardName(String wardName);
}

