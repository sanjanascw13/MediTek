package com.mediTek.MediTek.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import java.time.Instant;

@Getter
@Setter
@ToString(exclude = {"patient", "orderedByDoctor", "report"})
@NoArgsConstructor
@Entity
@Table(name = "lab_tests")
public class LabTest {

    @Id
    @Column(name = "lab_test_id", length = 64, nullable = false, updatable = false)
    private String labTestId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_person_id", referencedColumnName = "person_id", foreignKey = @ForeignKey(name = "fk_lab_test_patient"), nullable = false)
    private Patient patient;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ordered_by_doctor_person_id", referencedColumnName = "person_id", foreignKey = @ForeignKey(name = "fk_lab_test_ordering_doctor"), nullable = false)
    private Doctor orderedByDoctor;

    @Column(name = "test_type", length = 128, nullable = false)
    private String testType;

    @Column(name = "requested_at", nullable = false)
    private Instant requestedAt = Instant.now();

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 32, nullable = false)
    private LabTestStatus status = LabTestStatus.PENDING;

    @OneToOne(mappedBy = "labTest", cascade = CascadeType.ALL)
    private LabReport report;

    public enum LabTestStatus {
        PENDING,
        COMPLETED,
        CANCELLED
    }
}

