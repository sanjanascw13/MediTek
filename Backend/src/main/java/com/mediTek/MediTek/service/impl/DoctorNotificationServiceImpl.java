package com.mediTek.MediTek.service.impl;

import com.mediTek.MediTek.domain.Doctor;
import com.mediTek.MediTek.domain.DoctorActivationToken;
import com.mediTek.MediTek.domain.MedicalStaff;
import com.mediTek.MediTek.domain.Patient;
import com.mediTek.MediTek.domain.UserAccount;
import com.mediTek.MediTek.dto.DoctorActivationDetailsDto;
import com.mediTek.MediTek.dto.EmailNotificationResult;
import com.mediTek.MediTek.exception.ResourceNotFoundException;
import com.mediTek.MediTek.repository.DoctorActivationTokenRepository;
import com.mediTek.MediTek.repository.DoctorRepository;
import com.mediTek.MediTek.repository.UserAccountRepository;
import com.mediTek.MediTek.service.BusinessIdService;
import com.mediTek.MediTek.service.DoctorNotificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Optional;
import java.util.Properties;

@Service
public class DoctorNotificationServiceImpl implements DoctorNotificationService {

    private static final Logger log = LoggerFactory.getLogger(DoctorNotificationServiceImpl.class);
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final DoctorRepository doctorRepository;
    private final UserAccountRepository userAccountRepository;
    private final DoctorActivationTokenRepository tokenRepository;
    private final BusinessIdService businessIdService;
    private final PasswordEncoder passwordEncoder;
    private final Optional<JavaMailSender> optionalMailSender;

    @Value("${meditek.mail.host:}")
    private String mailHost;

    @Value("${meditek.mail.port:587}")
    private int mailPort;

    @Value("${meditek.mail.username:}")
    private String mailUsername;

    @Value("${meditek.mail.password:}")
    private String mailPassword;

    @Value("${meditek.mail.from:no-reply@meditek.local}")
    private String mailFrom;

    @Value("${meditek.frontend.base-url:http://localhost:5173}")
    private String frontendBaseUrl;

    @Value("${meditek.doctor.activation.expiry-hours:48}")
    private long expiryHours;

    public DoctorNotificationServiceImpl(
            DoctorRepository doctorRepository,
            UserAccountRepository userAccountRepository,
            DoctorActivationTokenRepository tokenRepository,
            BusinessIdService businessIdService,
            PasswordEncoder passwordEncoder,
            Optional<JavaMailSender> optionalMailSender) {
        this.doctorRepository = doctorRepository;
        this.userAccountRepository = userAccountRepository;
        this.tokenRepository = tokenRepository;
        this.businessIdService = businessIdService;
        this.passwordEncoder = passwordEncoder;
        this.optionalMailSender = optionalMailSender;
    }

    @Override
    @Transactional
    public EmailNotificationResult sendDoctorAccountCreatedNotification(Doctor doctor, UserAccount account) {
        String recipientEmail = doctor.getEmail();
        if (recipientEmail == null || recipientEmail.isBlank()) {
            return new EmailNotificationResult(false, isSmtpConfigured(), "", "Doctor record has no email address.");
        }

        // Generate cryptographically random single-use activation token
        String rawToken = generateRawToken();
        String tokenHash = hashToken(rawToken);

        DoctorActivationToken tokenEntity = new DoctorActivationToken();
        tokenEntity.setTokenId(businessIdService.nextId("doctor_activation_token", "DAT"));
        tokenEntity.setUserAccount(account);
        tokenEntity.setDoctor(doctor);
        tokenEntity.setTokenHash(tokenHash);
        tokenEntity.setExpiresAt(Instant.now().plus(Duration.ofHours(expiryHours)));
        tokenEntity.setUsed(false);
        tokenRepository.save(tokenEntity);

        String activationUrl = frontendBaseUrl.replaceAll("/+$", "") + "/activate-account?token=" + rawToken;

        if (!isSmtpConfigured()) {
            log.info("SMTP is not configured in the active environment. Notification not dispatched for Doctor {} to {}.",
                    doctor.getDoctorId(), recipientEmail);
            return new EmailNotificationResult(
                    false,
                    false,
                    recipientEmail,
                    "Doctor account created successfully. SMTP is not configured in this environment; activation notification was not dispatched to " + recipientEmail + "."
            );
        }

        try {
            JavaMailSender mailSender = getMailSender();
            SimpleMailMessage mailMessage = new SimpleMailMessage();
            mailMessage.setFrom(mailFrom);
            mailMessage.setTo(recipientEmail);
            mailMessage.setSubject("Welcome to MediTek - Complete Your Doctor Account Setup");
            mailMessage.setText(
                    "Dear Dr. " + doctor.getName() + ",\n\n" +
                    "A MediTek hospital management system account has been provisioned for you by the System Administrator.\n\n" +
                    "Your Username: " + account.getUsername() + "\n" +
                    "Doctor ID: " + doctor.getDoctorId() + "\n\n" +
                    "To activate your account and securely set your password, please use the following link:\n" +
                    activationUrl + "\n\n" +
                    "This single-use link will expire in " + expiryHours + " hours.\n\n" +
                    "If you did not request or expect this account, please contact the MediTek Hospital System Administrator immediately.\n\n" +
                    "Regards,\n" +
                    "MediTek Hospital Administration Team"
            );
            mailSender.send(mailMessage);
            log.info("Successfully dispatched doctor account setup email to {}", recipientEmail);
            return new EmailNotificationResult(
                    true,
                    true,
                    recipientEmail,
                    "Account notification sent successfully to " + recipientEmail + "."
            );
        } catch (Exception ex) {
            log.warn("Failed to dispatch doctor setup email to {}: {}", recipientEmail, ex.getMessage());
            return new EmailNotificationResult(
                    false,
                    true,
                    recipientEmail,
                    "Account was created, but email notification failed: " + ex.getMessage()
            );
        }
    }

    @Override
    public EmailNotificationResult sendStaffAccountCreatedNotification(MedicalStaff staff, String username, String temporaryPassword) {
        String recipientEmail = staff.getEmail();
        if (recipientEmail == null || recipientEmail.isBlank()) {
            return new EmailNotificationResult(false, isSmtpConfigured(), "", "Staff record has no email address.");
        }

        if (!isSmtpConfigured()) {
            log.info("SMTP is not configured in the active environment. Notification not dispatched for Staff {} to {}.",
                    staff.getStaffId(), recipientEmail);
            return new EmailNotificationResult(
                    false,
                    false,
                    recipientEmail,
                    "Staff account created successfully. SMTP is not configured in this environment; credentials notification was not dispatched to " + recipientEmail + "."
            );
        }

        try {
            JavaMailSender mailSender = getMailSender();
            SimpleMailMessage mailMessage = new SimpleMailMessage();
            mailMessage.setFrom(mailFrom);
            mailMessage.setTo(recipientEmail);
            mailMessage.setSubject("Welcome to MediTek - Your Staff Account Credentials");
            mailMessage.setText(
                    "Dear " + staff.getName() + ",\n\n" +
                    "A MediTek hospital staff account has been provisioned for you by the System Administrator.\n\n" +
                    "Designation / Role: " + staff.getRole() + "\n" +
                    "Staff ID: " + staff.getStaffId() + "\n" +
                    "Username: " + username + "\n" +
                    "Temporary Password: " + temporaryPassword + "\n\n" +
                    "To sign in to the MediTek Clinical Portal, please visit:\n" +
                    frontendBaseUrl.replaceAll("/+$", "") + "/login\n\n" +
                    "You will be required to change your password upon your first sign in.\n\n" +
                    "If you did not expect this account, please contact the MediTek Hospital Administration immediately.\n\n" +
                    "Regards,\n" +
                    "MediTek Hospital Administration Team"
            );
            mailSender.send(mailMessage);
            log.info("Successfully dispatched staff account credentials email to {}", recipientEmail);
            return new EmailNotificationResult(
                    true,
                    true,
                    recipientEmail,
                    "Staff account credentials sent successfully to " + recipientEmail + "."
            );
        } catch (Exception ex) {
            log.warn("Failed to dispatch staff credentials email to {}: {}", recipientEmail, ex.getMessage());
            return new EmailNotificationResult(
                    false,
                    true,
                    recipientEmail,
                    "Staff account was created, but email notification failed: " + ex.getMessage()
            );
        }
    }

    @Override
    public EmailNotificationResult sendPatientAccountCreatedNotification(Patient patient, String username, String temporaryPassword, boolean isSelfRegistered) {
        String recipientEmail = patient.getEmail();
        if (recipientEmail == null || recipientEmail.isBlank()) {
            return new EmailNotificationResult(false, isSmtpConfigured(), "", "Patient record has no email address.");
        }

        if (!isSmtpConfigured()) {
            log.info("SMTP is not configured in the active environment. Notification not dispatched for Patient {} to {}.",
                    patient.getPatientId(), recipientEmail);
            return new EmailNotificationResult(
                    false,
                    false,
                    recipientEmail,
                    "Patient account created successfully. SMTP is not configured in this environment; notification was not dispatched to " + recipientEmail + "."
            );
        }

        try {
            JavaMailSender mailSender = getMailSender();
            SimpleMailMessage mailMessage = new SimpleMailMessage();
            mailMessage.setFrom(mailFrom);
            mailMessage.setTo(recipientEmail);

            if (isSelfRegistered) {
                mailMessage.setSubject("Welcome to MediTek - Registration Successful");
                mailMessage.setText(
                        "Dear " + patient.getName() + ",\n\n" +
                        "Your patient account at MediTek Hospital has been registered successfully.\n\n" +
                        "Patient ID: " + patient.getPatientId() + "\n" +
                        "Username: " + username + "\n\n" +
                        "You can sign in to your personal patient health portal anytime at:\n" +
                        frontendBaseUrl.replaceAll("/+$", "") + "/login\n\n" +
                        "Regards,\n" +
                        "MediTek Hospital Administration Team"
                );
            } else {
                mailMessage.setSubject("Welcome to MediTek - Your Patient Portal Account");
                mailMessage.setText(
                        "Dear " + patient.getName() + ",\n\n" +
                        "A patient portal account at MediTek Hospital has been created for you.\n\n" +
                        "Patient ID: " + patient.getPatientId() + "\n" +
                        "Username: " + username + "\n" +
                        "Temporary Password: " + temporaryPassword + "\n\n" +
                        "Please sign in to the MediTek Patient Portal at:\n" +
                        frontendBaseUrl.replaceAll("/+$", "") + "/login\n\n" +
                        "You will be required to change your password upon your first sign in.\n\n" +
                        "Regards,\n" +
                        "MediTek Hospital Administration Team"
                );
            }

            mailSender.send(mailMessage);
            log.info("Successfully dispatched patient registration email to {}", recipientEmail);
            return new EmailNotificationResult(
                    true,
                    true,
                    recipientEmail,
                    "Patient notification sent successfully to " + recipientEmail + "."
            );
        } catch (Exception ex) {
            log.warn("Failed to dispatch patient registration email to {}: {}", recipientEmail, ex.getMessage());
            return new EmailNotificationResult(
                    false,
                    true,
                    recipientEmail,
                    "Patient account was created, but email notification failed: " + ex.getMessage()
            );
        }
    }

    @Override
    @Transactional
    public EmailNotificationResult resendDoctorNotification(String doctorId) {
        Doctor doctor = doctorRepository.findByDoctorId(doctorId)
                .or(() -> doctorRepository.findById(doctorId))
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found: " + doctorId));

        UserAccount account = userAccountRepository.findByPerson_PersonId(doctor.getPersonId())
                .orElseThrow(() -> new ResourceNotFoundException("User login account not found for doctor: " + doctorId));

        return sendDoctorAccountCreatedNotification(doctor, account);
    }

    @Override
    @Transactional(readOnly = true)
    public DoctorActivationDetailsDto verifyToken(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            return new DoctorActivationDetailsDto("", "", "", false, "INVALID_TOKEN");
        }
        String tokenHash = hashToken(rawToken);
        Optional<DoctorActivationToken> tokenOpt = tokenRepository.findByTokenHash(tokenHash);
        if (tokenOpt.isEmpty()) {
            return new DoctorActivationDetailsDto("", "", "", false, "INVALID_TOKEN");
        }
        DoctorActivationToken token = tokenOpt.get();
        if (token.isUsed()) {
            return new DoctorActivationDetailsDto(
                    token.getDoctor().getName(),
                    token.getUserAccount().getUsername(),
                    token.getDoctor().getEmail(),
                    false,
                    "ALREADY_USED"
            );
        }
        if (token.getExpiresAt().isBefore(Instant.now())) {
            return new DoctorActivationDetailsDto(
                    token.getDoctor().getName(),
                    token.getUserAccount().getUsername(),
                    token.getDoctor().getEmail(),
                    false,
                    "EXPIRED"
            );
        }
        return new DoctorActivationDetailsDto(
                token.getDoctor().getName(),
                token.getUserAccount().getUsername(),
                token.getDoctor().getEmail(),
                true,
                "VALID"
        );
    }

    @Override
    @Transactional
    public void activateAccount(String rawToken, String newPassword) {
        if (rawToken == null || rawToken.isBlank()) {
            throw new IllegalArgumentException("Activation token is required.");
        }
        if (newPassword == null || newPassword.length() < 8) {
            throw new IllegalArgumentException("Password must be at least 8 characters.");
        }
        String tokenHash = hashToken(rawToken);
        DoctorActivationToken token = tokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new IllegalArgumentException("Invalid or unrecognized activation token."));

        if (token.isUsed()) {
            throw new IllegalStateException("This activation token has already been used.");
        }
        if (token.getExpiresAt().isBefore(Instant.now())) {
            throw new IllegalStateException("This activation token has expired. Please request an administrator to resend your setup link.");
        }

        UserAccount account = token.getUserAccount();
        account.setPasswordHash(passwordEncoder.encode(newPassword));
        account.setPasswordChangeRequired(false);
        account.setEnabled(true);
        userAccountRepository.save(account);

        token.setUsed(true);
        token.setUsedAt(Instant.now());
        tokenRepository.save(token);

        log.info("Successfully activated user account {} for Doctor {}", account.getUsername(), token.getDoctor().getDoctorId());
    }

    @Override
    public boolean isSmtpConfigured() {
        return mailHost != null && !mailHost.isBlank();
    }

    private JavaMailSender getMailSender() {
        if (optionalMailSender.isPresent()) {
            return optionalMailSender.get();
        }
        JavaMailSenderImpl impl = new JavaMailSenderImpl();
        impl.setHost(mailHost);
        impl.setPort(mailPort);
        if (mailUsername != null && !mailUsername.isBlank()) {
            impl.setUsername(mailUsername);
            impl.setPassword(mailPassword);
        }
        Properties props = impl.getJavaMailProperties();
        props.put("mail.transport.protocol", "smtp");
        props.put("mail.smtp.auth", String.valueOf(mailUsername != null && !mailUsername.isBlank()));
        props.put("mail.smtp.starttls.enable", "true");
        props.put("mail.smtp.connectiontimeout", "5000");
        props.put("mail.smtp.timeout", "5000");
        return impl;
    }

    private String generateRawToken() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hashToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 digest algorithm not available", e);
        }
    }
}

