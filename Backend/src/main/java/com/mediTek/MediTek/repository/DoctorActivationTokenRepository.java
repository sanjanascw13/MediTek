package com.mediTek.MediTek.repository;

import com.mediTek.MediTek.domain.Doctor;
import com.mediTek.MediTek.domain.DoctorActivationToken;
import com.mediTek.MediTek.domain.UserAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DoctorActivationTokenRepository extends JpaRepository<DoctorActivationToken, String> {
    Optional<DoctorActivationToken> findByTokenHash(String tokenHash);
    void deleteByDoctor(Doctor doctor);
    void deleteByUserAccount(UserAccount userAccount);
}
