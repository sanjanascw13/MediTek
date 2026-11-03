package com.mediTek.MediTek.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import java.time.Instant;

@Getter
@Setter
@ToString(exclude = {"patient", "surgeon", "operatingTheater"})
@NoArgsConstructor
@Entity
@Table(name = "surgeries")
public class Surgery {

    @Id
    @Column(name = "surgery_id", length = 64, nullable = false, updatable = false)
    private String surgeryId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_person_id", referencedColumnName = "person_id", foreignKey = @ForeignKey(name = "fk_surgery_patient"), nullable = false)
    private Patient patient;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "surgeon_person_id", referencedColumnName = "person_id", foreignKey = @ForeignKey(name = "fk_surgery_surgeon"), nullable = false)
    private Doctor surgeon;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "operating_theater_id", referencedColumnName = "department_id", foreignKey = @ForeignKey(name = "fk_surgery_operating_theater"), nullable = false)
    private OperatingTheater operatingTheater;

    @Column(name = "scheduled_at", nullable = false)
    private Instant scheduledAt;

    @Column(name = "surgery_type", length = 128, nullable = false)
    private String surgeryType;

    @Column(name = "duration_minutes", nullable = false)
    private Integer durationMinutes = 60;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 32, nullable = false)
    private SurgeryStatus status = SurgeryStatus.SCHEDULED;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    public enum SurgeryStatus {
        SCHEDULED,
        IN_PROGRESS,
        COMPLETED,
        CANCELLED
    }
}
