package com.mediTek.MediTek.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

/**
 * Patient entity – extends the abstract Person.
 * Uses the same primary key (person_id) as defined in the Person table.
 */
@Getter
@Setter
@ToString(callSuper = true)
@NoArgsConstructor
@Entity
@Table(name = "patients", uniqueConstraints = {
        @UniqueConstraint(columnNames = "patient_id")
})
public class Patient extends Person {

    @Id
    @Column(name = "person_id", length = 64, nullable = false, updatable = false)
    private String personId; // overrides inherited mapping for clarity

    @Column(name = "patient_id", length = 64, nullable = false, unique = true)
    private String patientId;

    @Column(name = "blood_group", length = 8, nullable = false)
    private String bloodGroup;

    @Column(name = "address", length = 255, nullable = false)
    private String address;

    @Column(name = "emergency_contact", length = 32, nullable = false)
    private String emergencyContact;
}

