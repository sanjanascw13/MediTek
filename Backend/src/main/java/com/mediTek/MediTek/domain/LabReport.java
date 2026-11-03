package com.mediTek.MediTek.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import java.time.Instant;

@Getter
@Setter
@ToString(exclude = {"labTest", "reviewingDoctor"})
@NoArgsConstructor
@Entity
@Table(name = "lab_reports", uniqueConstraints = {
        @UniqueConstraint(name = "uq_lab_report_test", columnNames = {"lab_test_id"})
})
public class LabReport {

    @Id
    @Column(name = "report_id", length = 64, nullable = false, updatable = false)
    private String reportId;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lab_test_id", referencedColumnName = "lab_test_id", foreignKey = @ForeignKey(name = "fk_lab_report_lab_test"), nullable = false)
    private LabTest labTest;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewing_doctor_person_id", referencedColumnName = "person_id", foreignKey = @ForeignKey(name = "fk_lab_report_reviewing_doctor"), nullable = false)
    private Doctor reviewingDoctor;

    @Column(name = "result_summary", columnDefinition = "TEXT", nullable = false)
    private String resultSummary;

    @Enumerated(EnumType.STRING)
    @Column(name = "result_classification", length = 16)
    private ResultClassification resultClassification;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public enum ResultClassification {
        NORMAL,
        ABNORMAL
    }
}
