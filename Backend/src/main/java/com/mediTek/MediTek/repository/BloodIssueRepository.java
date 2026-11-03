package com.mediTek.MediTek.repository;

import com.mediTek.MediTek.domain.BloodIssue;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BloodIssueRepository extends JpaRepository<BloodIssue, String> {
    List<BloodIssue> findAllByOrderByIssuedAtDesc();

    List<BloodIssue> findByPatient_PersonIdOrderByIssuedAtDesc(String personId);
}
