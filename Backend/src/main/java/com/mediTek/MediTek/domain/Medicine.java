package com.mediTek.MediTek.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import java.math.BigDecimal;

@Getter
@Setter
@ToString
@NoArgsConstructor
@Entity
@Table(name = "medicines")
public class Medicine {

    @Id
    @Column(name = "medicine_id", length = 64, nullable = false, updatable = false)
    private String medicineId;

    @Column(name = "name", length = 128, nullable = false, unique = true)
    private String name;

    @Column(name = "category", length = 64)
    private String category;

    @Column(name = "price", precision = 10, scale = 2, nullable = false)
    private BigDecimal price;

    @Column(name = "stock_quantity", nullable = false)
    private Integer quantity = 0;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;
}
