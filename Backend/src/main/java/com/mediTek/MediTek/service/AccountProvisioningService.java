package com.mediTek.MediTek.service;

import com.mediTek.MediTek.domain.Person;
import com.mediTek.MediTek.domain.Role;
import com.mediTek.MediTek.domain.UserAccount;
import com.mediTek.MediTek.repository.RoleRepository;
import com.mediTek.MediTek.repository.UserAccountRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.Locale;

@Service
public class AccountProvisioningService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private final UserAccountRepository userAccountRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final BusinessIdService businessIdService;

    public AccountProvisioningService(UserAccountRepository userAccountRepository,
                                      RoleRepository roleRepository,
                                      PasswordEncoder passwordEncoder,
                                      BusinessIdService businessIdService) {
        this.userAccountRepository = userAccountRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.businessIdService = businessIdService;
    }

    @Transactional
    public InitialCredentials provision(Person person, String businessId, Role.RoleName roleName) {
        return provisionAccount(person, businessId, roleName).credentials();
    }

    @Transactional
    public ProvisionedAccount provisionAccount(Person person, String businessId, Role.RoleName roleName) {
        String username = businessId.toLowerCase(Locale.ROOT);
        if (userAccountRepository.findByUsername(username).isPresent()) {
            throw new IllegalStateException("A login account already exists for this business identifier.");
        }
        Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new IllegalStateException(roleName + " role is missing."));
        String password = generateTemporaryPassword();
        UserAccount account = new UserAccount();
        account.setUserAccountId(businessIdService.nextId("user_account", "USR"));
        account.setPerson(person);
        account.setUsername(username);
        account.setPasswordHash(passwordEncoder.encode(password));
        account.setRole(role);
        account.setEnabled(true);
        account.setPasswordChangeRequired(true);
        UserAccount savedAccount = userAccountRepository.save(account);
        InitialCredentials credentials = new InitialCredentials(username, password);
        return new ProvisionedAccount(savedAccount, credentials);
    }

    @Transactional
    public void setEnabled(String personId, boolean enabled) {
        userAccountRepository.findByPerson_PersonId(personId).ifPresent(account -> {
            account.setEnabled(enabled);
            userAccountRepository.save(account);
        });
    }

    private String generateTemporaryPassword() {
        byte[] bytes = new byte[24];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    public record InitialCredentials(String username, String temporaryPassword) {
    }

    public record ProvisionedAccount(UserAccount userAccount, InitialCredentials credentials) {
    }
}
