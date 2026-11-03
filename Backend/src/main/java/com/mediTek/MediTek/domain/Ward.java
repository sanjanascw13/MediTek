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
@Table(name = "wards")
public class Ward {

    @Id
    @Column(name = "ward_id", length = 64, nullable = false, updatable = false)
    private String wardId;

    @Column(name = "ward_name", length = 128, nullable = false, unique = true)
    private String wardName;

    @Column(name = "ward_type", length = 64, nullable = false)
    private String wardType;
}

