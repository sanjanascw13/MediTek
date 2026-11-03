package com.mediTek.MediTek.repository;

import com.mediTek.MediTek.domain.Appointment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface AppointmentRepository extends JpaRepository<Appointment, String> {
    List<Appointment> findByPatient_PersonId(String personId);
    List<Appointment> findByDoctor_PersonId(String personId);
    List<Appointment> findByDoctor_PersonIdAndPatient_PersonId(String doctorPersonId, String patientPersonId);
    List<Appointment> findByStatus(Appointment.AppointmentStatus status);

    long countByDoctor_PersonId(String personId);
    long countByPatient_PersonId(String personId);
    long countByStatus(Appointment.AppointmentStatus status);

    @Query("SELECT COUNT(DISTINCT a.patient.personId) FROM Appointment a WHERE a.doctor.personId = :doctorPersonId")
    long countDistinctPatientsByDoctor(@Param("doctorPersonId") String doctorPersonId);
}
