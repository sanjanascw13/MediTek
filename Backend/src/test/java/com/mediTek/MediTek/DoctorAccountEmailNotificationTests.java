package com.mediTek.MediTek;

import com.mediTek.MediTek.domain.Doctor;
import com.mediTek.MediTek.domain.IdCounter;
import com.mediTek.MediTek.domain.Role;
import com.mediTek.MediTek.domain.UserAccount;
import com.mediTek.MediTek.dto.DoctorActivationDetailsDto;
import com.mediTek.MediTek.dto.EmailNotificationResult;
import com.mediTek.MediTek.repository.DoctorActivationTokenRepository;
import com.mediTek.MediTek.repository.DoctorRepository;
import com.mediTek.MediTek.repository.IdCounterRepository;
import com.mediTek.MediTek.repository.RoleRepository;
import com.mediTek.MediTek.repository.UserAccountRepository;
import com.mediTek.MediTek.service.BusinessIdService;
import com.mediTek.MediTek.service.DoctorNotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@SpringBootTest(properties = {
        "meditek.mail.host=smtp.test.local",
        "meditek.mail.username=testuser",
        "meditek.mail.from=no-reply@meditek.local"
})
@ActiveProfiles("test")
@Transactional
public class DoctorAccountEmailNotificationTests {

    @MockitoBean
    private JavaMailSender javaMailSender;

    @Autowired
    private DoctorNotificationService doctorNotificationService;

    @Autowired
    private DoctorRepository doctorRepository;

    @Autowired
    private UserAccountRepository userAccountRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private IdCounterRepository idCounterRepository;

    @Autowired
    private BusinessIdService businessIdService;

    @Autowired
    private DoctorActivationTokenRepository tokenRepository;

    private Doctor testDoctor;
    private UserAccount testAccount;

    @BeforeEach
    void setUp() {
        for (String name : List.of("person", "doctor", "user_account", "doctor_activation_token")) {
            idCounterRepository.findById(name).orElseGet(() -> {
                IdCounter counter = new IdCounter();
                counter.setEntityName(name);
                counter.setNextId(1L);
                return idCounterRepository.save(counter);
            });
        }

        Role doctorRole = roleRepository.findByName(Role.RoleName.DOCTOR)
                .orElseGet(() -> {
                    Role r = new Role();
                    r.setRoleId("DOCTOR");
                    r.setName(Role.RoleName.DOCTOR);
                    r.setDescription("Doctor");
                    return roleRepository.save(r);
                });

        testDoctor = new Doctor();
        testDoctor.setPersonId(businessIdService.nextId("person", "PER"));
        testDoctor.setDoctorId(businessIdService.nextId("doctor", "DOC"));
        testDoctor.setName("Dr. Test Notification");
        testDoctor.setEmail("test.doctor.email." + System.currentTimeMillis() + "@example.com");
        testDoctor.setPhoneNumber("0712345678");
        testDoctor.setDateOfBirth(LocalDate.of(1982, 3, 15));
        testDoctor.setGender("FEMALE");
        testDoctor.setSpecialization("Pediatrics");
        testDoctor.setLicenseNumber("LIC-TEST-8899");
        testDoctor.setIsActive(true);
        testDoctor = doctorRepository.save(testDoctor);

        testAccount = new UserAccount();
        testAccount.setUserAccountId(businessIdService.nextId("user_account", "USR"));
        testAccount.setPerson(testDoctor);
        testAccount.setUsername(testDoctor.getDoctorId().toLowerCase());
        testAccount.setPasswordHash("temporary-hash");
        testAccount.setRole(doctorRole);
        testAccount.setEnabled(true);
        testAccount.setPasswordChangeRequired(true);
        testAccount = userAccountRepository.save(testAccount);
    }

    @Test
    void testDoctorAccountCreationTriggersEmailWithActivationLinkWhenConfigured() {
        // Send email
        EmailNotificationResult result = doctorNotificationService.sendDoctorAccountCreatedNotification(testDoctor, testAccount);

        assertThat(result.recipientEmail()).isEqualTo(testDoctor.getEmail());
        assertThat(result.configured()).isTrue();
        assertThat(result.sent()).isTrue();

        ArgumentCaptor<SimpleMailMessage> captor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(javaMailSender, times(1)).send(captor.capture());

        SimpleMailMessage sentMessage = captor.getValue();
        assertThat(sentMessage.getTo()).contains(testDoctor.getEmail());
        assertThat(sentMessage.getSubject()).contains("MediTek");
        assertThat(sentMessage.getText()).contains(testAccount.getUsername());
        assertThat(sentMessage.getText()).contains("/activate-account?token=");

        // Extract raw token from body
        String body = sentMessage.getText();
        String tokenPrefix = "/activate-account?token=";
        int tokenStart = body.indexOf(tokenPrefix) + tokenPrefix.length();
        int tokenEnd = body.indexOf("\n", tokenStart);
        if (tokenEnd == -1) tokenEnd = body.length();
        String rawToken = body.substring(tokenStart, tokenEnd).trim();

        // Verify token status
        DoctorActivationDetailsDto details = doctorNotificationService.verifyToken(rawToken);
        assertThat(details.valid()).isTrue();
        assertThat(details.status()).isEqualTo("VALID");
        assertThat(details.doctorName()).isEqualTo(testDoctor.getName());
        assertThat(details.username()).isEqualTo(testAccount.getUsername());

        // Complete activation with single-use setup
        doctorNotificationService.activateAccount(rawToken, "NewSecurePass123!");

        UserAccount updatedAccount = userAccountRepository.findByUsername(testAccount.getUsername()).orElseThrow();
        assertThat(updatedAccount.getPasswordChangeRequired()).isFalse();
        assertThat(updatedAccount.getEnabled()).isTrue();

        // Verify token is now invalid (single-use)
        DoctorActivationDetailsDto usedDetails = doctorNotificationService.verifyToken(rawToken);
        assertThat(usedDetails.valid()).isFalse();
        assertThat(usedDetails.status()).isEqualTo("ALREADY_USED");

        assertThatThrownBy(() -> doctorNotificationService.activateAccount(rawToken, "AnotherPassword!"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("already been used");
    }

    @Test
    void testResendNotificationPreservesAccount() {
        EmailNotificationResult resendResult = doctorNotificationService.resendDoctorNotification(testDoctor.getDoctorId());

        assertThat(resendResult.recipientEmail()).isEqualTo(testDoctor.getEmail());
        verify(javaMailSender, atLeastOnce()).send(any(SimpleMailMessage.class));

        // Ensure no duplicate account or doctor was created
        long doctorCount = doctorRepository.findAll().stream()
                .filter(d -> d.getDoctorId().equals(testDoctor.getDoctorId()))
                .count();
        assertThat(doctorCount).isEqualTo(1);
    }

    @Test
    void testUnconfiguredSmtpDoesNotFailAccountCreation() {
        ReflectionTestUtils.setField(doctorNotificationService, "mailHost", "");
        try {
            EmailNotificationResult result = doctorNotificationService.sendDoctorAccountCreatedNotification(testDoctor, testAccount);
            assertThat(result.configured()).isFalse();
            assertThat(result.sent()).isFalse();
            assertThat(result.message()).contains("SMTP is not configured");
        } finally {
            ReflectionTestUtils.setField(doctorNotificationService, "mailHost", "smtp.test.local");
        }
    }
}
