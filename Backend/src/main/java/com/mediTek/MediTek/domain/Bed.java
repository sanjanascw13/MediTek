package com.mediTek.MediTek.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString(exclude = "ward")
@NoArgsConstructor
@Entity
@Table(name = "beds", uniqueConstraints = {
        @UniqueConstraint(name = "uq_bed_ward_number", columnNames = {"ward_id", "bed_number"})
})
public class Bed {

    @Id
    @Column(name = "bed_id", length = 64, nullable = false, updatable = false)
    private String bedId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ward_id", referencedColumnName = "ward_id", foreignKey = @ForeignKey(name = "fk_bed_ward"), nullable = false)
    private Ward ward;

    @Column(name = "bed_number", length = 32, nullable = false)
    private String bedNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "operational_status", length = 32, nullable = false)
    private BedOperationalStatus operationalStatus = BedOperationalStatus.AVAILABLE;

    public enum BedOperationalStatus {
        AVAILABLE,
        MAINTENANCE,
        UNAVAILABLE
    }
}

