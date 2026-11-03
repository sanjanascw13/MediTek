package com.mediTek.MediTek.security;

import com.mediTek.MediTek.domain.Role;
import com.mediTek.MediTek.domain.UserAccount;
import com.mediTek.MediTek.repository.UserAccountRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
public class CurrentUserService {

    private final UserAccountRepository userAccountRepository;

    public CurrentUserService(UserAccountRepository userAccountRepository) {
        this.userAccountRepository = userAccountRepository;
    }

    public UserAccount account() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userAccountRepository.findByUsername(username)
                .orElseThrow(() -> new AccessDeniedException("Authenticated account is no longer available."));
    }

    public Role.RoleName role() {
        Role.RoleName role = account().getRole().getName();
        return role == Role.RoleName.ADMIN ? Role.RoleName.SUPER_ADMIN : role;
    }

    public String personId() {
        UserAccount current = account();
        if (current.getPerson() == null) {
            throw new AccessDeniedException("This account is not linked to a person record.");
        }
        return current.getPerson().getPersonId();
    }
}
