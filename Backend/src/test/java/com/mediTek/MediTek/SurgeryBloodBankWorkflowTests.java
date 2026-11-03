package com.mediTek.MediTek;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mediTek.MediTek.domain.*;
import com.mediTek.MediTek.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SurgeryBloodBankWorkflowTests {

    private static final String STAFF_PASSWORD = "SurgeryBloodStaffPassword!2026";
    private static final String DOCTOR_PASSWORD = "SurgeryBloodDoctorPassword!2026";
    private static final String PATIENT_PASSWORD = "SurgeryBloodPatientPassword!2026";
    private static final String ADMIN_PASSWORD = "SurgeryBloodAdminPassword!2026";

    @Autowired private MockMvc mockMvc;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private RoleRepository roleRepository;
    @Autowired private UserAccountRepository userAccountRepository;
    @Autowired private PatientRepository patientRepository;
    @Autowired private DoctorRepository doctorRepository;
    @Autowired private MedicalStaffRepository staffRepository;
    @Autowired private DepartmentRepository departmentRepository;
    @Autowired private OperatingTheaterRepository theaterRepository;
    @Autowired private BloodBankRepository bloodBankRepository;
    @Autowired private BloodUnitRepository bloodUnitRepository;
    @Autowired private BloodIssueRepository bloodIssueRepository;
    @Autowired private SurgeryRepository surgeryRepository;
    @Autowired private IdCounterRepository idCounterRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void prepareLookupRows() {
        for (Role.RoleName name : Role.RoleName.values()) {
            roleRepository.findByName(name).orElseGet(() -> {
                Role role = new Role();
                role.setRoleId(name.name());
                role.setName(name);
                role.setDescription(name.name());
                return roleRepository.save(role);
            });
        }
        for (String name : List.of("surgery", "blood_bank", "blood_unit", "blood_issue")) {
            idCounterRepository.findById(name).orElseGet(() -> {
                IdCounter counter = new IdCounter();
                counter.setEntityName(name);
                counter.setNextId(1L);
                return idCounterRepository.save(counter);
            });
        }
    }

    @Test
    void surgerySchedulingChecksOverlapPrivacyRolesAndLifecycle() throws Exception {
        Fixture fixture = fixture("surgery");
        OperatingTheater theater = createTheater(fixture.suffix());
        Patient otherPatient = createPatient("other-" + fixture.suffix(), "A+");
        Instant start = Instant.now().plusSeconds(3 * 24 * 60 * 60L);
        JsonNode created = postJson("/api/surgeries", surgeryRequest(
                fixture.patient().getPatientId(), fixture.doctor().getDoctorId(),
                theater.getTheaterNumber(), start, 90), fixture.doctorToken());
        String surgeryId = created.path("surgeryId").asText();
        assertTrue(surgeryId.startsWith("SRG-"));
        assertEquals("SCHEDULED", created.path("status").asText());
        assertEquals(1, getJson("/api/surgeries?search=Appendectomy", fixture.doctorToken()).size());
        assertEquals(1, getJson("/api/surgeries", fixture.patientToken()).size());
        mockMvc.perform(get("/api/surgeries?patientId=" + otherPatient.getPatientId())
                        .header("Authorization", bearer(fixture.patientToken())))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/surgeries")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(surgeryRequest(fixture.patient().getPatientId(),
                                fixture.doctor().getDoctorId(), theater.getTheaterNumber(), start, 60))
                        .header("Authorization", bearer(fixture.staffToken())))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/surgeries")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(surgeryRequest(fixture.patient().getPatientId(),
                                fixture.doctor().getDoctorId(), theater.getTheaterNumber(),
                                start.plusSeconds(45 * 60L), 60))
                        .header("Authorization", bearer(fixture.doctorToken())))
                .andExpect(status().isConflict());
        mockMvc.perform(post("/api/surgeries")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(surgeryRequest(fixture.patient().getPatientId(),
                                fixture.doctor().getDoctorId(), theater.getTheaterNumber(),
                                Instant.now().minusSeconds(10), 60))
                        .header("Authorization", bearer(fixture.doctorToken())))
                .andExpect(status().isBadRequest());

        mockMvc.perform(patch("/api/surgeries/{id}/status", surgeryId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"COMPLETED\"}")
                        .header("Authorization", bearer(fixture.staffToken())))
                .andExpect(status().isConflict());
        mockMvc.perform(patch("/api/surgeries/{id}/status", surgeryId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"IN_PROGRESS\"}")
                        .header("Authorization", bearer(fixture.staffToken())))
                .andExpect(status().isOk());
        mockMvc.perform(patch("/api/surgeries/{id}/status", surgeryId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"COMPLETED\"}")
                        .header("Authorization", bearer(fixture.staffToken())))
                .andExpect(status().isOk());
        mockMvc.perform(patch("/api/surgeries/{id}/status", surgeryId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"CANCELLED\"}")
                        .header("Authorization", bearer(fixture.staffToken())))
                .andExpect(status().isConflict());
        assertEquals(Surgery.SurgeryStatus.COMPLETED, surgeryRepository.findById(surgeryId).orElseThrow().getStatus());
    }

    @Test
    void bloodInventoryIntakeIssueAndHistoryAreTransactionalAndRoleScoped() throws Exception {
        Fixture fixture = fixture("blood");
        String bankId = postJson("/api/blood-bank/banks",
                "{\"name\":\"Central Blood Bank " + fixture.suffix() + "\",\"location\":\"Colombo\"}",
                fixture.adminToken()).path("bloodBankId").asText();
        JsonNode unit = postJson("/api/blood-bank/units", bloodUnitRequest(
                bankId, "O+", "RED_CELLS", LocalDate.now().minusDays(1),
                LocalDate.now().plusDays(20), 450), fixture.staffToken());
        String unitId = unit.path("unitId").asText();
        assertTrue(unitId.startsWith("BLD-"));
        assertEquals(BloodType.O_POSITIVE, bloodUnitRepository.findById(unitId)
                .orElseThrow().getBloodType());
        assertEquals("O+", unit.path("bloodType").asText());
        MvcResult filterResult = mockMvc.perform(get("/api/blood-bank/units")
                        .param("bloodType", "O+")
                        .param("component", "RED_CELLS")
                        .header("Authorization", bearer(fixture.doctorToken())))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode filteredUnits = objectMapper.readTree(filterResult.getResponse().getContentAsString());
        assertEquals(1, filteredUnits.size());
        assertEquals("O+", filteredUnits.get(0).path("bloodType").asText());

        JsonNode issue = postJson("/api/blood-bank/issues",
                "{\"unitId\":\"" + unitId + "\",\"patientId\":\""
                        + fixture.patient().getPatientId() + "\",\"quantityMl\":100,\"purpose\":\"Test issue\"}",
                fixture.staffToken());
        assertTrue(issue.path("bloodIssueId").asText().startsWith("BIS-"));
        assertEquals(350, bloodUnitRepository.findById(unitId).orElseThrow().getQuantityMl());
        assertEquals(1, bloodIssueRepository.findAll().size());
        assertEquals(1, getJson("/api/blood-bank/issues", fixture.patientToken()).size());

        mockMvc.perform(post("/api/blood-bank/issues")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"unitId\":\"" + unitId + "\",\"patientId\":\""
                                + fixture.patient().getPatientId() + "\",\"quantityMl\":400}")
                        .header("Authorization", bearer(fixture.staffToken())))
                .andExpect(status().isConflict());
        assertEquals(350, bloodUnitRepository.findById(unitId).orElseThrow().getQuantityMl());
        mockMvc.perform(post("/api/blood-bank/issues")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"unitId\":\"" + unitId + "\",\"patientId\":\""
                                + fixture.patient().getPatientId() + "\",\"quantityMl\":1}")
                        .header("Authorization", bearer(fixture.doctorToken())))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/blood-bank/units")
                        .header("Authorization", bearer(fixture.patientToken())))
                .andExpect(status().isForbidden());

        Patient otherPatient = createPatient("mismatch-" + fixture.suffix(), "A+");
        String otherPatientUsername = "mismatch-" + fixture.suffix();
        createAccount(otherPatientUsername, PATIENT_PASSWORD, otherPatient, Role.RoleName.PATIENT);
        mockMvc.perform(post("/api/blood-bank/issues")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"unitId\":\"" + unitId + "\",\"patientId\":\""
                                + otherPatient.getPatientId() + "\",\"quantityMl\":50}")
                        .header("Authorization", bearer(fixture.staffToken())))
                .andExpect(status().isConflict());
        assertEquals(0, getJson("/api/blood-bank/issues",
                token(otherPatientUsername, PATIENT_PASSWORD)).size());
        assertEquals(350, bloodUnitRepository.findById(unitId).orElseThrow().getQuantityMl());
        mockMvc.perform(post("/api/blood-bank/units")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(bloodUnitRequest(bankId, "A+", "PLASMA", LocalDate.now().plusDays(1),
                                LocalDate.now().plusDays(10), 300))
                        .header("Authorization", bearer(fixture.staffToken())))
                .andExpect(status().isBadRequest());
    }

    @Test
    void expiredBloodCannotBeIssuedAndBankConfigurationIsRestricted() throws Exception {
        Fixture fixture = fixture("expired-blood");
        mockMvc.perform(post("/api/blood-bank/banks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Forbidden Bank\",\"location\":\"Test\"}")
                        .header("Authorization", bearer(fixture.staffToken())))
                .andExpect(status().isForbidden());
        BloodBank bank = createBank(fixture.suffix());
        BloodUnit expired = createUnit(bank, "O+", BloodUnit.BloodComponent.WHOLE_BLOOD,
                LocalDate.now().minusDays(10), LocalDate.now().minusDays(1), 300);
        mockMvc.perform(post("/api/blood-bank/issues")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"unitId\":\"" + expired.getUnitId() + "\",\"patientId\":\""
                                + fixture.patient().getPatientId() + "\",\"quantityMl\":100}")
                        .header("Authorization", bearer(fixture.staffToken())))
                .andExpect(status().isConflict());
        assertEquals(300, bloodUnitRepository.findById(expired.getUnitId()).orElseThrow().getQuantityMl());
        assertEquals("EXPIRED", getJson("/api/blood-bank/units?search=" + expired.getUnitId(),
                fixture.staffToken()).get(0).path("availabilityStatus").asText());
        mockMvc.perform(get("/api/blood-bank/issues")
                        .header("Authorization", bearer("invalid")))
                .andExpect(status().isUnauthorized());
    }

    private Fixture fixture(String prefix) throws Exception {
        String suffix = prefix + "-" + UUID.randomUUID().toString().substring(0, 8);
        Patient patient = createPatient(suffix, "O+");
        Doctor doctor = createDoctor(suffix);
        MedicalStaff staff = createStaff(suffix);
        String staffUsername = "staff-" + suffix;
        String doctorUsername = "doctor-" + suffix;
        String patientUsername = "patient-" + suffix;
        String adminUsername = "admin-" + suffix;
        createAccount(staffUsername, STAFF_PASSWORD, staff, Role.RoleName.STAFF);
        createAccount(doctorUsername, DOCTOR_PASSWORD, doctor, Role.RoleName.DOCTOR);
        createAccount(patientUsername, PATIENT_PASSWORD, patient, Role.RoleName.PATIENT);
        createAccount(adminUsername, ADMIN_PASSWORD, null, Role.RoleName.SUPER_ADMIN);
        return new Fixture(suffix, patient, doctor,
                token(staffUsername, STAFF_PASSWORD),
                token(doctorUsername, DOCTOR_PASSWORD),
                token(patientUsername, PATIENT_PASSWORD),
                token(adminUsername, ADMIN_PASSWORD));
    }

    private OperatingTheater createTheater(String suffix) {
        String id = safeId(suffix);
        OperatingTheater theater = new OperatingTheater();
        theater.setDepartmentId("DEP-OT-" + id);
        theater.setDepartmentName("Operating Theater " + suffix);
        theater.setLocation("Test Wing");
        theater.setTheaterNumber("OT-" + id);
        return theaterRepository.save(theater);
    }

    private BloodBank createBank(String suffix) {
        BloodBank bank = new BloodBank();
        bank.setBloodBankId("BB-" + safeId(suffix));
        bank.setName("Test Bank " + suffix);
        bank.setLocation("Test Location");
        bank.setIsActive(true);
        return bloodBankRepository.save(bank);
    }

    private BloodUnit createUnit(BloodBank bank, String bloodType, BloodUnit.BloodComponent component,
                                 LocalDate collectionDate, LocalDate expirationDate, int quantity) {
        BloodUnit unit = new BloodUnit();
        unit.setUnitId("BLD-" + UUID.randomUUID());
        unit.setBloodBank(bank);
        unit.setBloodType(BloodType.fromDatabaseValue(bloodType));
        unit.setComponent(component);
        unit.setCollectionDate(collectionDate);
        unit.setExpirationDate(expirationDate);
        unit.setQuantityMl(quantity);
        return bloodUnitRepository.save(unit);
    }

    private Patient createPatient(String suffix, String bloodGroup) {
        String id = safeId(suffix);
        Patient patient = new Patient();
        patient.setPersonId("PER-" + id);
        patient.setPatientId("PAT-" + id);
        patient.setName("Patient " + suffix);
        patient.setDateOfBirth(LocalDate.of(1990, 1, 1));
        patient.setGender("OTHER");
        patient.setPhoneNumber("0771234567");
        patient.setEmail(suffix + "@example.test");
        patient.setBloodGroup(bloodGroup);
        patient.setAddress("1 Test Street");
        patient.setEmergencyContact("0771234568");
        patient.setIsActive(true);
        return patientRepository.save(patient);
    }

    private Doctor createDoctor(String suffix) {
        String id = safeId(suffix);
        Doctor doctor = new Doctor();
        doctor.setPersonId("PER-DOC-" + id);
        doctor.setDoctorId("DOC-" + id);
        doctor.setName("Doctor " + suffix);
        doctor.setDateOfBirth(LocalDate.of(1980, 1, 1));
        doctor.setGender("OTHER");
        doctor.setPhoneNumber("0773333333");
        doctor.setEmail("doctor-" + suffix + "@example.test");
        doctor.setSpecialization("General Surgery");
        doctor.setLicenseNumber("LIC-" + id);
        doctor.setIsActive(true);
        return doctorRepository.save(doctor);
    }

    private MedicalStaff createStaff(String suffix) {
        String id = safeId(suffix);
        MedicalStaff staff = new MedicalStaff();
        staff.setPersonId("PER-STF-" + id);
        staff.setStaffId("STF-" + id);
        staff.setName("Staff " + suffix);
        staff.setDateOfBirth(LocalDate.of(1985, 1, 1));
        staff.setGender("OTHER");
        staff.setPhoneNumber("0774444444");
        staff.setEmail("staff-" + suffix + "@example.test");
        staff.setRole("Nurse");
        staff.setIsActive(true);
        return staffRepository.save(staff);
    }

    private void createAccount(String username, String password, Person person, Role.RoleName roleName) {
        UserAccount account = new UserAccount();
        account.setUserAccountId("USR-" + UUID.randomUUID());
        account.setPerson(person);
        account.setUsername(username);
        account.setPasswordHash(passwordEncoder.encode(password));
        account.setRole(roleRepository.findByName(roleName).orElseThrow());
        account.setEnabled(true);
        account.setPasswordChangeRequired(false);
        userAccountRepository.save(account);
    }

    private String surgeryRequest(String patientId, String doctorId, String theaterNumber,
                                  Instant scheduledAt, int duration) {
        return "{\"patientId\":\"" + patientId + "\",\"doctorId\":\"" + doctorId
                + "\",\"theaterNumber\":\"" + theaterNumber + "\",\"scheduledAt\":\"" + scheduledAt
                + "\",\"surgeryType\":\"Laparoscopic Appendectomy\",\"durationMinutes\":" + duration
                + ",\"notes\":\"Routine test schedule\"}";
    }

    private String bloodUnitRequest(String bankId, String bloodType, String component,
                                    LocalDate collectionDate, LocalDate expirationDate, int quantityMl) {
        return "{\"bloodBankId\":\"" + bankId + "\",\"bloodType\":\"" + bloodType
                + "\",\"component\":\"" + component + "\",\"collectionDate\":\"" + collectionDate
                + "\",\"expirationDate\":\"" + expirationDate + "\",\"quantityMl\":" + quantityMl + "}";
    }

    private JsonNode postJson(String path, String json, String token) throws Exception {
        MvcResult result = mockMvc.perform(post(path)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json)
                        .header("Authorization", bearer(token)))
                .andExpect(status().is2xxSuccessful())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private JsonNode getJson(String path, String token) throws Exception {
        MvcResult result = mockMvc.perform(get(path).header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private String token(String username, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + username + "\",\"password\":\"" + password + "\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).path("token").asText();
    }

    private String safeId(String value) {
        return value.toUpperCase().replaceAll("[^A-Z0-9]", "-");
    }

    private String bearer(String token) {
        return "Bearer " + token;
    }

    private record Fixture(String suffix, Patient patient, Doctor doctor,
                           String staffToken, String doctorToken, String patientToken, String adminToken) {
    }
}
