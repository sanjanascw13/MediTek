package com.mediTek.MediTek.security;

import com.mediTek.MediTek.domain.UserAccount;
import com.mediTek.MediTek.repository.UserAccountRepository;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UserAccountRepository userAccountRepository;

    public CustomUserDetailsService(UserAccountRepository userAccountRepository) {
        this.userAccountRepository = userAccountRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        UserAccount account = userAccountRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));

        if (account.getRole() == null) {
            throw new UsernameNotFoundException("User account has no assigned role.");
        }
        String role = account.getRole().getName().name();
        if (role.equals("ADMIN")) role = "SUPER_ADMIN";
        List<SimpleGrantedAuthority> authorities = new ArrayList<>();
        authorities.add(new SimpleGrantedAuthority("ROLE_" + role));
        if (Boolean.TRUE.equals(account.getPasswordChangeRequired())) {
            authorities.add(new SimpleGrantedAuthority("ROLE_PASSWORD_CHANGE_REQUIRED"));
        }
        return new User(
                account.getUsername(),
                account.getPasswordHash(),
                account.getEnabled(),
                true,
                true,
                true,
                authorities
        );
    }
}
