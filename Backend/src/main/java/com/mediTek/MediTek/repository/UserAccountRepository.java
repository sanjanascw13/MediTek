package com.mediTek.MediTek.repository;

import com.mediTek.MediTek.domain.UserAccount;
import com.mediTek.MediTek.domain.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface UserAccountRepository extends JpaRepository<UserAccount, String> {
    Optional<UserAccount> findByUsername(String username);
    Optional<UserAccount> findByPerson_PersonId(String personId);
    boolean existsByRole_Name(Role.RoleName name);
}
