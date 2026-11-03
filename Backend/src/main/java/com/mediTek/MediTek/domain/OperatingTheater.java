package com.mediTek.MediTek.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString(callSuper = true)
@NoArgsConstructor
@Entity
@Table(name = "operating_theaters", uniqueConstraints = {
        @UniqueConstraint(name = "uq_operating_theater_number", columnNames = {"theater_number"})
})
@PrimaryKeyJoinColumn(name = "department_id", referencedColumnName = "department_id")
public class OperatingTheater extends Department {

    @Column(name = "theater_number", length = 32, nullable = false, unique = true)
    private String theaterNumber;
}

