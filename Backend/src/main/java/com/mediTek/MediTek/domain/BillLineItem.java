package com.mediTek.MediTek.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.math.BigDecimal;

@Getter
@Setter
@ToString(exclude = "bill")
@NoArgsConstructor
@Entity
@Table(name = "bill_line_items")
public class BillLineItem {

    @Id
    @Column(name = "line_item_id", length = 64, nullable = false, updatable = false)
    private String lineItemId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "bill_id", referencedColumnName = "bill_id",
            foreignKey = @ForeignKey(name = "fk_bill_line_item_bill"), nullable = false)
    private Bill bill;

    @Column(name = "description", length = 255, nullable = false)
    private String description;

    @Column(name = "quantity", nullable = false)
    private Integer quantity;

    @Column(name = "unit_price", precision = 12, scale = 2, nullable = false)
    private BigDecimal unitPrice;

    @Column(name = "line_total", precision = 12, scale = 2, nullable = false)
    private BigDecimal lineTotal;
}
