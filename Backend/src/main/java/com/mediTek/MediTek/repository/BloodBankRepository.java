package com.mediTek.MediTek.repository;

import com.mediTek.MediTek.domain.BloodBank;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BloodBankRepository extends JpaRepository<BloodBank, String> {
}

