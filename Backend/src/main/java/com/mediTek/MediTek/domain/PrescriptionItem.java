package com.mediTek.MediTek.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString(exclude = {"prescription", "medicine"})
@NoArgsConstructor
@Entity
@Table(name = "prescription_items")
public class PrescriptionItem {

    @Id
    @Column(name = "item_id", length = 64, nullable = false, updatable = false)
    private String itemId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "prescription_id", referencedColumnName = "prescription_id", foreignKey = @ForeignKey(name = "fk_prescription_item_prescription"), nullable = false)
    private Prescription prescription;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "medicine_id", referencedColumnName = "medicine_id", foreignKey = @ForeignKey(name = "fk_prescription_item_medicine"), nullable = false)
    private Medicine medicine;

    @Column(name = "medicine_name", length = 128, nullable = false)
    private String medicineName;

    @Column(name = "prescribed_quantity", nullable = false)
    private Integer prescribedQuantity;

    @Column(name = "quantity_dispensed", nullable = false)
    private Integer quantityDispensed = 0;

    @Column(name = "dosage", length = 64, nullable = false)
    private String dosage;

    @Column(name = "frequency", length = 64, nullable = false)
    private String frequency;

    @Column(name = "duration_days", nullable = false)
    private Integer durationDays;
}
