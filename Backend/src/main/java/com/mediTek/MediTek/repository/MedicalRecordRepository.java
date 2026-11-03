package com.mediTek.MediTek.repository;

import com.mediTek.MediTek.domain.MedicalRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface MedicalRecordRepository extends JpaRepository<MedicalRecord, String> {
    List<MedicalRecord> findByPatient_PersonId(String personId);
    List<MedicalRecord> findByPatient_PersonIdOrderByCreatedAtDesc(String personId);
    List<MedicalRecord> findByAppointment_AppointmentId(String appointmentId);
    long countByPatient_PersonId(String personId);
}
