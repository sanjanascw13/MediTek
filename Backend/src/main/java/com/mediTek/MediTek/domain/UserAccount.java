package com.mediTek.MediTek.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString(exclude = {"person", "role", "passwordHash"})
@NoArgsConstructor
@Entity
@Table(name = "user_accounts", uniqueConstraints = {
        @UniqueConstraint(name = "uq_user_account_person", columnNames = {"person_id"}),
        @UniqueConstraint(name = "uq_user_account_username", columnNames = {"username"})
})
public class UserAccount {

    @Id
    @Column(name = "user_account_id", length = 64, nullable = false, updatable = false)
    private String userAccountId;

    @OneToOne(fetch = FetchType.LAZY, optional = true)
    @JoinColumn(name = "person_id", referencedColumnName = "person_id", foreignKey = @ForeignKey(name = "fk_user_account_person"))
    private Person person;

    @Column(name = "username", length = 64, nullable = false, unique = true)
    private String username;

    @Column(name = "password_hash", length = 255, nullable = false)
    private String passwordHash;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "role_id", referencedColumnName = "role_id", foreignKey = @ForeignKey(name = "fk_user_account_role"), nullable = false)
    private Role role;

    @Column(name = "enabled", nullable = false)
    private Boolean enabled = true;

    @Column(name = "password_change_required", nullable = false)
    private Boolean passwordChangeRequired = false;
}
