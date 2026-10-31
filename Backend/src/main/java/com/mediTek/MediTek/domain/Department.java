package com.mediTek.MediTek.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

/**
 * Base Department entity – parent of ten subtype tables.
 * Uses JOINED inheritance as specified in the schema.
 */
@Getter
@Setter
@ToString
@NoArgsConstructor
@Entity
@Inheritance(strategy = InheritanceType.JOINED)
@Table(name = "departments")
public class Department {

    @Id
    @Column(name = "department_id", length = 64, nullable = false, updatable = false)
    private String departmentId;

    @Column(name = "department_name", length = 128, nullable = false, unique = true)
    private String departmentName;

    @Column(name = "location", length = 128, nullable = false)
    private String location;
}

