package com.mediTek.MediTek.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

/**
 * Doctor entity – extends abstract Person using JOINED inheritance.
 * Shares the same PK (person_id) as the Person table.
 * Contains a separate business identifier doctor_id.
 * Optional association to a Department (department_id nullable).
 */
@Getter
@Setter
@ToString(callSuper = true, exclude = {"department"})
@NoArgsConstructor
@Entity
@Table(name = "doctors", uniqueConstraints = {
        @UniqueConstraint(columnNames = "doctor_id")
})
@PrimaryKeyJoinColumn(name = "person_id", referencedColumnName = "person_id")
public class Doctor extends Person {

    // No need to redeclare person_id – inherited via @PrimaryKeyJoinColumn

    @Column(name = "doctor_id", length = 64, nullable = false, unique = true)
    private String doctorId;

    @Column(name = "specialization", length = 64, nullable = false)
    private String specialization;

    @Column(name = "license_number", length = 64, nullable = false, unique = true)
    private String licenseNumber;

    // Optional Department relationship – many doctors may belong to one department
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id", referencedColumnName = "department_id", foreignKey = @ForeignKey(name = "fk_doctors_dept"), nullable = true)
    private Department department;
}

