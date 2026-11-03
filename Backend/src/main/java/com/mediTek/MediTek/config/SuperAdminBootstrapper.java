package com.mediTek.MediTek.config;

import com.mediTek.MediTek.domain.Role;
import com.mediTek.MediTek.domain.UserAccount;
import com.mediTek.MediTek.repository.RoleRepository;
import com.mediTek.MediTek.repository.UserAccountRepository;
import com.mediTek.MediTek.service.BusinessIdService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class SuperAdminBootstrapper implements ApplicationRunner {

    private final String username;
    private final String password;
    private final UserAccountRepository userAccountRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final BusinessIdService businessIdService;

    public SuperAdminBootstrapper(
            @Value("${MEDITEK_BOOTSTRAP_SUPER_ADMIN_USERNAME:}") String username,
            @Value("${MEDITEK_BOOTSTRAP_SUPER_ADMIN_PASSWORD:}") String password,
            UserAccountRepository userAccountRepository,
            RoleRepository roleRepository,
            PasswordEncoder passwordEncoder,
            BusinessIdService businessIdService) {
        this.username = username.trim().toLowerCase(java.util.Locale.ROOT);
        this.password = password;
        this.userAccountRepository = userAccountRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.businessIdService = businessIdService;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (username.isEmpty() && password.isEmpty()) return;
        if (username.length() < 3 || username.length() > 64 || password == null
                || password.length() < 12 || password.length() > 128) {
            throw new IllegalStateException(
                    "Initial Super Admin provisioning requires a 3-64 character username and a 12-128 character password.");
        }
        if (userAccountRepository.existsByRole_Name(Role.RoleName.SUPER_ADMIN)
                || userAccountRepository.existsByRole_Name(Role.RoleName.ADMIN)) {
            return;
        }
        if (userAccountRepository.findByUsername(username).isPresent()) {
            throw new IllegalStateException("Initial Super Admin username is already assigned to another account.");
        }
        Role role = roleRepository.findByName(Role.RoleName.SUPER_ADMIN)
                .orElseThrow(() -> new IllegalStateException("Super Admin role is missing; apply the approved Flyway migrations."));
        UserAccount account = new UserAccount();
        account.setUserAccountId(businessIdService.nextId("user_account", "USR"));
        account.setUsername(username);
        account.setPasswordHash(passwordEncoder.encode(password));
        account.setRole(role);
        account.setEnabled(true);
        userAccountRepository.save(account);
    }
}
