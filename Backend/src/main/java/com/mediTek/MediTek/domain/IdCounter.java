package com.mediTek.MediTek.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "id_counters")
@Getter
@Setter
@NoArgsConstructor
public class IdCounter {

    @Id
    @Column(name = "entity_name", length = 64, nullable = false)
    private String entityName;

    @Column(name = "next_id", nullable = false)
    private Long nextId;
}
