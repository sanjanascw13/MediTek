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
@Table(name = "blood_banks")
public class BloodBank {

    @Id
    @Column(name = "blood_bank_id", length = 64, nullable = false, updatable = false)
    private String bloodBankId;

    @Column(name = "name", length = 128, nullable = false)
    private String name;

    @Column(name = "location", length = 128, nullable = false)
    private String location;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;
}

