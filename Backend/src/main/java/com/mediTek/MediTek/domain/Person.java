package com.mediTek.MediTek.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import java.time.LocalDate;

/**
 * Abstract base class for all person types. Uses JOINED inheritance.
 * The shared primary key is {@code personId} (readable ID, e.g. PER-000001).
 */
@Getter
@Setter
@ToString
@NoArgsConstructor
@Entity
@Inheritance(strategy = InheritanceType.JOINED)
@Table(name = "persons", uniqueConstraints = {
        @UniqueConstraint(columnNames = "email")
})
public abstract class Person {

    @Id
    @Column(name = "person_id", length = 64, nullable = false, updatable = false)
    private String personId;

    @Column(name = "name", length = 128, nullable = false)
    private String name;

    @Column(name = "date_of_birth", nullable = false)
    private LocalDate dateOfBirth;

    @Column(name = "gender", length = 16, nullable = false)
    private String gender; // could be an enum in full implementation

    @Column(name = "phone_number", length = 32, nullable = false)
    private String phoneNumber;

    @Column(name = "email", length = 128, nullable = false, unique = true)
    private String email;
}

