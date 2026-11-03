package com.mediTek.MediTek.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import java.time.LocalDate;

@Getter
@Setter
@ToString(exclude = "bloodBank")
@NoArgsConstructor
@Entity
@Table(name = "blood_units")
public class BloodUnit {

    @Id
    @Column(name = "unit_id", length = 64, nullable = false, updatable = false)
    private String unitId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "blood_bank_id", referencedColumnName = "blood_bank_id", foreignKey = @ForeignKey(name = "fk_blood_unit_bank"), nullable = false)
    private BloodBank bloodBank;

    @Convert(converter = BloodTypeConverter.class)
    @Column(name = "blood_type", length = 8, nullable = false, columnDefinition = "ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')")
    private BloodType bloodType;

    @Enumerated(EnumType.STRING)
    @Column(name = "component", length = 24, nullable = false)
    private BloodComponent component = BloodComponent.WHOLE_BLOOD;

    @Column(name = "collection_date", nullable = false)
    private LocalDate collectionDate;

    @Column(name = "expiration_date", nullable = false)
    private LocalDate expirationDate;

    @Column(name = "quantity_ml", nullable = false)
    private Integer quantityMl;

    public enum BloodComponent {
        WHOLE_BLOOD,
        RED_CELLS,
        PLASMA,
        PLATELETS,
        CRYOPRECIPITATE
    }
}
