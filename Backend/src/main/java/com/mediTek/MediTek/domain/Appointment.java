package com.mediTek.MediTek.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import java.time.Instant;

@Getter
@Setter
@ToString(exclude = {"patient", "doctor"})
@NoArgsConstructor
@Entity
@Table(name = "appointments")
public class Appointment {

    @Id
    @Column(name = "appointment_id", length = 64, nullable = false, updatable = false)
    private String appointmentId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_person_id", referencedColumnName = "person_id", foreignKey = @ForeignKey(name = "fk_appointment_patient"), nullable = false)
    private Patient patient;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "doctor_person_id", referencedColumnName = "person_id", foreignKey = @ForeignKey(name = "fk_appointment_doctor"), nullable = false)
    private Doctor doctor;

    @Column(name = "appointment_date", nullable = false)
    private Instant appointmentDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 32, nullable = false)
    private AppointmentStatus status = AppointmentStatus.SCHEDULED;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    public enum AppointmentStatus {
        SCHEDULED,
        COMPLETED,
        CANCELLED,
        NO_SHOW
    }
}

