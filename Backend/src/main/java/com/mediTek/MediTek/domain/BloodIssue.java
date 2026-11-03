package com.mediTek.MediTek.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.time.Instant;

@Getter
@Setter
@ToString(exclude = {"bloodUnit", "patient", "issuedBy"})
@NoArgsConstructor
@Entity
@Table(name = "blood_issues")
public class BloodIssue {

    @Id
    @Column(name = "blood_issue_id", length = 64, nullable = false, updatable = false)
    private String bloodIssueId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "unit_id", referencedColumnName = "unit_id", foreignKey = @ForeignKey(name = "fk_blood_issue_unit"), nullable = false)
    private BloodUnit bloodUnit;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_person_id", referencedColumnName = "person_id", foreignKey = @ForeignKey(name = "fk_blood_issue_patient"), nullable = false)
    private Patient patient;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "issued_by_user_account_id", referencedColumnName = "user_account_id", foreignKey = @ForeignKey(name = "fk_blood_issue_account"), nullable = false)
    private UserAccount issuedBy;

    @Column(name = "quantity_ml", nullable = false)
    private Integer quantityMl;

    @Column(name = "purpose", length = 500)
    private String purpose;

    @Column(name = "issued_at", nullable = false)
    private Instant issuedAt = Instant.now();
}
