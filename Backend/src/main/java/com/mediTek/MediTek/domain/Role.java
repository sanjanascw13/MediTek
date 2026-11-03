package com.mediTek.MediTek.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
@NoArgsConstructor
@Entity
@Table(name = "roles", uniqueConstraints = {
        @UniqueConstraint(name = "uq_role_name", columnNames = {"name"})
})
public class Role {

    @Id
    @Column(name = "role_id", length = 64, nullable = false, updatable = false)
    private String roleId;

    @Enumerated(EnumType.STRING)
    @Column(name = "name", length = 32, nullable = false, unique = true)
    private RoleName name;

    @Column(name = "description", length = 256)
    private String description;

    public enum RoleName {
        ADMIN,
        SUPER_ADMIN,
        DOCTOR,
        STAFF,
        PATIENT
    }
}
