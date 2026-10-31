package com.mediTek.MediTek.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

/**
 * Nurse entity – subclass of MedicalStaff.
 * Uses the same primary key (person_id) inherited from MedicalStaff/Person.
 * Contains a shift field.
 */
@Getter
@Setter
@ToString(callSuper = true, exclude = {"medicalStaff"})
@NoArgsConstructor
@Entity
@Table(name = "nurses")
@PrimaryKeyJoinColumn(name = "person_id", referencedColumnName = "person_id")
public class Nurse extends MedicalStaff {

    @Column(name = "shift", length = 32, nullable = false)
    private String shift;
}

