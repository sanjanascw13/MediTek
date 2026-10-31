package com.mediTek.MediTek.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

/**
 * MedicalStaff entity – extends abstract Person via JOINED inheritance.
 * Shares the same PK (person_id) as Person.
 * Has its own business ID staff_id and a role description.
 * Optional association to a Department.
 */
@Getter
@Setter
@ToString(callSuper = true, exclude = {"department"})
@NoArgsConstructor
@Entity
@Table(name = "medical_staff", uniqueConstraints = {
        @UniqueConstraint(columnNames = "staff_id")
})
@PrimaryKeyJoinColumn(name = "person_id", referencedColumnName = "person_id")
public class MedicalStaff extends Person {

    @Column(name = "staff_id", length = 64, nullable = false, unique = true)
    private String staffId;

    @Column(name = "role", length = 64, nullable = false)
    private String role;

    // Optional Department relationship – many staff may belong to one department
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id", referencedColumnName = "department_id", foreignKey = @ForeignKey(name = "fk_medstaff_dept"), nullable = true)
    private Department department;
}

