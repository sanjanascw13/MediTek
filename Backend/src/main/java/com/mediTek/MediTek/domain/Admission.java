package com.mediTek.MediTek.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import java.time.Instant;

@Getter
@Setter
@ToString(exclude = {"patient", "bed", "admittingDoctor"})
@NoArgsConstructor
@Entity
@Table(name = "admissions")
public class Admission {

    @Id
    @Column(name = "admission_id", length = 64, nullable = false, updatable = false)
    private String admissionId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_person_id", referencedColumnName = "person_id", foreignKey = @ForeignKey(name = "fk_admission_patient"), nullable = false)
    private Patient patient;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bed_id", referencedColumnName = "bed_id", foreignKey = @ForeignKey(name = "fk_admission_bed"), nullable = false)
    private Bed bed;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "admitting_doctor_person_id", referencedColumnName = "person_id", foreignKey = @ForeignKey(name = "fk_admission_doctor"), nullable = false)
    private Doctor admittingDoctor;

    @Column(name = "admission_date", nullable = false)
    private Instant admissionDate;

    @Column(name = "discharge_date")
    private Instant dischargeDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 32, nullable = false)
    private AdmissionStatus status = AdmissionStatus.ACTIVE;

    @Column(name = "reason", columnDefinition = "TEXT")
    private String reason;

    @Column(name = "transfer_from_admission_id", length = 64)
    private String transferFromAdmissionId;

    public enum AdmissionStatus {
        ACTIVE,
        DISCHARGED,
        TRANSFERRED
    }
}

