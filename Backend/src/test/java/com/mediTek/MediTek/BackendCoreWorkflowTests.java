package com.mediTek.MediTek;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mediTek.MediTek.domain.*;
import com.mediTek.MediTek.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class BackendCoreWorkflowTests {

    private static final String STAFF_PASSWORD = "StaffTestPassword!2026";
    private static final String DOCTOR_PASSWORD = "DoctorTestPassword!2026";
    private static final String ADMIN_PASSWORD = "SuperAdminTestPassword!2026";

    @Autowired private MockMvc mockMvc;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private RoleRepository roleRepository;
    @Autowired private UserAccountRepository userAccountRepository;
    @Autowired private PatientRepository patientRepository;
    @Autowired private DoctorRepository doctorRepository;
    @Autowired private MedicalStaffRepository staffRepository;
    @Autowired private WardRepository wardRepository;
    @Autowired private BedRepository bedRepository;
    @Autowired private AdmissionRepository admissionRepository;
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
        for (String name : List.of("person", "patient", "doctor", "staff", "user_account", "appointment",
                "admission", "ward", "bed")) {
            idCounterRepository.findById(name).orElseGet(() -> {
                IdCounter counter = new IdCounter();
                counter.setEntityName(name);
                counter.setNextId(1L);
                return idCounterRepository.save(counter);
            });
        }
    }

    @Test
    void protectsPatientDataAndRegistersPatientAccounts() throws Exception {
        mockMvc.perform(get("/api/patients"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.error").value("Unauthorized"));
        mockMvc.perform(get("/api/dashboard/stats"))
                .andExpect(status().isUnauthorized());

        JsonNode selfRegistration = postJson("/api/auth/register", patientRegistration("self.patient", "self"));
        assertEquals("PATIENT", selfRegistration.path("role").asText());
        assertTrue(selfRegistration.path("token").asText().length() > 20);
        Patient self = patientRepository.findByEmail("self@example.test").orElseThrow();
        UserAccount selfAccount = userAccountRepository.findByUsername("self.patient").orElseThrow();
        assertEquals(self.getPersonId(), selfAccount.getPerson().getPersonId());
        assertNotEquals("SelfPatientPassword!2026", selfAccount.getPasswordHash());
        assertTrue(passwordEncoder.matches("SelfPatientPassword!2026", selfAccount.getPasswordHash()));

        MedicalStaff staff = createStaff("fixture.staff", "STAFF-TEST", "fixture.staff@example.test");
        createAccount("fixture.staff", STAFF_PASSWORD, staff, Role.RoleName.STAFF, "USR-STAFF-TEST");
        JsonNode registration = postJson("/api/patients", patientRegistrationBody("registered", false),
                token("fixture.staff", STAFF_PASSWORD));
        JsonNode registeredPatient = registration.path("patient");
        String temporaryUsername = registration.path("username").asText();
        String temporaryPassword = registration.path("temporaryPassword").asText();
        assertTrue(temporaryPassword.length() >= 24);
        UserAccount patientAccount = userAccountRepository.findByUsername(temporaryUsername).orElseThrow();
        assertTrue(passwordEncoder.matches(temporaryPassword, patientAccount.getPasswordHash()));
        assertNotEquals(temporaryPassword, patientAccount.getPasswordHash());
        assertTrue(patientAccount.getPasswordChangeRequired());
        assertEquals(registeredPatient.path("personId").asText(), patientAccount.getPerson().getPersonId());
        JsonNode patientLogin = postJson("/api/auth/login",
                "{\"username\":\"" + temporaryUsername + "\",\"password\":\"" + temporaryPassword + "\"}");
        assertEquals("PATIENT", patientLogin.path("role").asText());

        createPatient("other.patient");
        mockMvc.perform(get("/api/patients/{id}", patientRepository.findByEmail("other.patient@example.test")
                        .orElseThrow().getPersonId())
                        .header("Authorization", bearer(selfRegistration.path("token").asText())))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/patients")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(patientRegistrationBody("unauthorized", false))
                        .header("Authorization", bearer(selfRegistration.path("token").asText())))
                .andExpect(status().isForbidden());
    }

    @Test
    void superAdminProvisionsDoctorAndStaffAccounts() throws Exception {
        createAccount("initial.superadmin", ADMIN_PASSWORD, null, Role.RoleName.SUPER_ADMIN, "USR-ADMIN-TEST");
        String adminToken = token("initial.superadmin", ADMIN_PASSWORD);

        JsonNode ward = postJson("/api/wards",
                "{\"wardName\":\"Provisioned ward\",\"wardType\":\"GENERAL\"}", adminToken);
        assertTrue(ward.path("wardId").asText().startsWith("WRD-"));
        JsonNode bed = postJson("/api/beds",
                "{\"wardId\":\"" + ward.path("wardId").asText() + "\",\"bedNumber\":\"A-01\"}", adminToken);
        assertTrue(bed.path("bedId").asText().startsWith("BED-"));
        assertEquals("AVAILABLE", bed.path("availabilityStatus").asText());
        assertEquals(1, getJson("/api/beds?wardId=" + ward.path("wardId").asText()
                + "&status=AVAILABLE", adminToken).size());
        mockMvc.perform(patch("/api/beds/{id}/status", bed.path("bedId").asText())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"MAINTENANCE\"}")
                        .header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk());
        JsonNode wardInventory = null;
        for (JsonNode candidate : getJson("/api/wards", adminToken)) {
            if (ward.path("wardId").asText().equals(candidate.path("wardId").asText())) {
                wardInventory = candidate;
                break;
            }
        }
        assertNotNull(wardInventory);
        assertEquals(1, wardInventory.path("maintenanceBeds").asInt());
        assertEquals(0, wardInventory.path("availableBeds").asInt());

        JsonNode doctor = postJson("/api/doctors", doctorBody("provisioned.doctor"), adminToken);
        String doctorUsername = doctor.path("username").asText();
        String doctorPassword = doctor.path("temporaryPassword").asText();
        assertTrue(doctor.path("doctorId").asText().startsWith("DOC-"));
        assertNotNull(userAccountRepository.findByUsername(doctorUsername).orElseThrow().getPerson());
        JsonNode doctorLogin = postJson("/api/auth/login",
                "{\"username\":\"" + doctorUsername + "\",\"password\":\"" + doctorPassword + "\"}");
        assertEquals("DOCTOR", doctorLogin.path("role").asText());
        mockMvc.perform(get("/api/doctors")
                        .header("Authorization", bearer(doctorLogin.path("token").asText())))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/auth/change-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"" + doctorPassword
                                + "\",\"newPassword\":\"DoctorUpdatedPassword!2026\"}")
                        .header("Authorization", bearer(doctorLogin.path("token").asText())))
                .andExpect(status().isNoContent());
        String updatedDoctorToken = token(doctorUsername, "DoctorUpdatedPassword!2026");
        mockMvc.perform(get("/api/doctors")
                        .header("Authorization", bearer(updatedDoctorToken)))
                .andExpect(status().isOk());

        JsonNode staff = postJson("/api/staff", staffBody("provisioned.staff"), adminToken);
        String staffUsername = staff.path("username").asText();
        String staffPassword = staff.path("temporaryPassword").asText();
        assertTrue(staff.path("staffId").asText().startsWith("STF-"));
        JsonNode staffLogin = postJson("/api/auth/login",
                "{\"username\":\"" + staffUsername + "\",\"password\":\"" + staffPassword + "\"}");
        assertEquals("STAFF", staffLogin.path("role").asText());
        Patient directoryViewer = createPatient("directory.viewer");
        createAccount("directory.viewer", "DirectoryViewerPassword!2026", directoryViewer,
                Role.RoleName.PATIENT, "USR-DIRECTORY-VIEWER");
        String patientToken = token("directory.viewer", "DirectoryViewerPassword!2026");

        mockMvc.perform(post("/api/staff")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(staffBody("denied.staff"))
                        .header("Authorization", bearer(updatedDoctorToken)))
                .andExpect(status().isForbidden());
        mockMvc.perform(patch("/api/doctors/{id}/status", doctor.path("doctorId").asText())
                        .param("active", "false")
                        .header("Authorization", bearer(updatedDoctorToken)))
                .andExpect(status().isForbidden());
        mockMvc.perform(patch("/api/doctors/{id}/status", doctor.path("doctorId").asText())
                        .param("active", "false")
                        .header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk());
        JsonNode adminDoctorDirectory = getJson("/api/doctors", adminToken);
        JsonNode inactiveDoctor = null;
        for (JsonNode candidate : adminDoctorDirectory) {
            if (doctor.path("doctorId").asText().equals(candidate.path("doctorId").asText())) {
                inactiveDoctor = candidate;
                break;
            }
        }
        assertNotNull(inactiveDoctor);
        assertFalse(inactiveDoctor.path("isActive").asBoolean());
        assertFalse(getJson("/api/doctors", patientToken)
                .findValuesAsText("doctorId").contains(doctor.path("doctorId").asText()));
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + doctorUsername + "\",\"password\":\"" + doctorPassword + "\"}"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(patch("/api/doctors/{id}/status", doctor.path("doctorId").asText())
                        .param("active", "true")
                        .header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isActive").value(true));
        mockMvc.perform(patch("/api/staff/{id}/status", staff.path("staffId").asText())
                        .param("active", "false")
                        .header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isActive").value(false));
        mockMvc.perform(patch("/api/staff/{id}/status", staff.path("staffId").asText())
                        .param("active", "true")
                        .header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isActive").value(true));
    }

    @Test
    void scopesAppointmentsAndEnforcesAdmissionLifecycle() throws Exception {
        Patient patient = createPatient("workflow.patient");
        Patient otherPatient = createPatient("workflow.other");
        Doctor doctor = createDoctor("workflow.doctor");
        Doctor otherDoctor = createDoctor("workflow.otherdoctor");
        MedicalStaff staff = createStaff("workflow.staff", "STAFF-WORKFLOW", "workflow.staff@example.test");
        createAccount("workflow.patient", "WorkflowPatientPassword!2026", patient,
                Role.RoleName.PATIENT, "USR-WF-PAT");
        createAccount("workflow.doctor", DOCTOR_PASSWORD, doctor, Role.RoleName.DOCTOR, "USR-WF-DOC");
        createAccount("workflow.otherdoctor", "OtherDoctorPassword!2026", otherDoctor,
                Role.RoleName.DOCTOR, "USR-WF-OTHERDOC");
        createAccount("workflow.staff", STAFF_PASSWORD, staff, Role.RoleName.STAFF, "USR-WF-STAFF");

        String patientToken = token("workflow.patient", "WorkflowPatientPassword!2026");
        String doctorToken = token("workflow.doctor", DOCTOR_PASSWORD);
        String otherDoctorToken = token("workflow.otherdoctor", "OtherDoctorPassword!2026");
        String staffToken = token("workflow.staff", STAFF_PASSWORD);

        String appointmentJson = "{\"doctorPersonId\":\"" + doctor.getPersonId()
                + "\",\"appointmentDate\":\"" + Instant.now().plusSeconds(86400)
                + "\",\"notes\":\"workflow test\"}";
        JsonNode appointment = postJson("/api/appointments", appointmentJson, patientToken);
        assertEquals(patient.getPersonId(), appointment.path("patientPersonId").asText());
        assertEquals(1, getJson("/api/appointments", patientToken).size());
        assertEquals(1, getJson("/api/appointments", doctorToken).size());
        mockMvc.perform(patch("/api/appointments/{id}/status", appointment.path("appointmentId").asText())
                        .param("status", "COMPLETED")
                        .header("Authorization", bearer(otherDoctorToken)))
                .andExpect(status().isForbidden());
        mockMvc.perform(patch("/api/appointments/{id}/status", appointment.path("appointmentId").asText())
                        .param("status", "COMPLETED")
                        .header("Authorization", bearer(doctorToken)))
                .andExpect(status().isOk());
        assertEquals("COMPLETED", getJson("/api/appointments", patientToken).get(0)
                .path("status").asText());

        Ward ward = new Ward();
        ward.setWardId("WRD-WORKFLOW");
        ward.setWardName("Workflow ward");
        ward.setWardType("GENERAL");
        wardRepository.save(ward);
        Bed firstBed = createBed("BED-WORKFLOW-1", ward);
        Bed targetBed = createBed("BED-WORKFLOW-2", ward);

        String admissionJson = "{\"patientPersonId\":\"" + patient.getPersonId()
                + "\",\"bedId\":\"" + firstBed.getBedId()
                + "\",\"admittingDoctorPersonId\":\"" + doctor.getPersonId()
                + "\",\"reason\":\"workflow test\"}";
        JsonNode admitted = postJson("/api/admissions", admissionJson, staffToken);
        assertEquals("ACTIVE", admitted.path("status").asText());
        assertEquals(Bed.BedOperationalStatus.AVAILABLE, bedRepository.findById(firstBed.getBedId())
                .orElseThrow().getOperationalStatus());
        assertEquals("OCCUPIED", getJson("/api/beds?wardId=" + ward.getWardId(), staffToken).get(0)
                .path("availabilityStatus").asText());
        mockMvc.perform(patch("/api/beds/{id}/status", firstBed.getBedId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"MAINTENANCE\"}")
                        .header("Authorization", bearer(staffToken)))
                .andExpect(status().isConflict());
        assertEquals(Bed.BedOperationalStatus.AVAILABLE, bedRepository.findById(firstBed.getBedId())
                .orElseThrow().getOperationalStatus());

        String secondAdmission = "{\"patientPersonId\":\"" + patient.getPersonId()
                + "\",\"bedId\":\"" + targetBed.getBedId()
                + "\",\"admittingDoctorPersonId\":\"" + doctor.getPersonId()
                + "\",\"reason\":\"duplicate test\"}";
        mockMvc.perform(post("/api/admissions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(secondAdmission)
                        .header("Authorization", bearer(staffToken)))
                .andExpect(status().isConflict());
        String otherPatientAdmission = "{\"patientPersonId\":\"" + otherPatient.getPersonId()
                + "\",\"bedId\":\"" + firstBed.getBedId()
                + "\",\"admittingDoctorPersonId\":\"" + doctor.getPersonId()
                + "\",\"reason\":\"occupied bed test\"}";
        mockMvc.perform(post("/api/admissions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(otherPatientAdmission)
                        .header("Authorization", bearer(staffToken)))
                .andExpect(status().isConflict());

        JsonNode transferred = postJson("/api/admissions/transfer",
                "{\"currentAdmissionId\":\"" + admitted.path("admissionId").asText()
                        + "\",\"targetBedId\":\"" + targetBed.getBedId()
                        + "\",\"reason\":\"transfer test\"}", staffToken);
        assertEquals("ACTIVE", transferred.path("status").asText());
        assertEquals(ward.getWardId(), transferred.path("wardId").asText());
        assertEquals(Admission.AdmissionStatus.TRANSFERRED,
                admissionRepository.findById(admitted.path("admissionId").asText()).orElseThrow().getStatus());
        assertEquals(Bed.BedOperationalStatus.AVAILABLE, bedRepository.findById(firstBed.getBedId())
                .orElseThrow().getOperationalStatus());

        postJson("/api/admissions/" + transferred.path("admissionId").asText() + "/discharge", "{}", staffToken);
        assertEquals(Admission.AdmissionStatus.DISCHARGED,
                admissionRepository.findById(transferred.path("admissionId").asText()).orElseThrow().getStatus());
        assertEquals(Bed.BedOperationalStatus.AVAILABLE, bedRepository.findById(targetBed.getBedId())
                .orElseThrow().getOperationalStatus());
        assertEquals(2, getJson("/api/beds?wardId=" + ward.getWardId() + "&status=AVAILABLE", staffToken).size());
    }

    private JsonNode postJson(String path, String json) throws Exception {
        return postJson(path, json, null);
    }

    private JsonNode postJson(String path, String json, String token) throws Exception {
        var request = post(path).contentType(MediaType.APPLICATION_JSON).content(json);
        if (token != null) request.header("Authorization", bearer(token));
        MvcResult result = mockMvc.perform(request).andExpect(status().is2xxSuccessful()).andReturn();
        String body = result.getResponse().getContentAsString();
        return body.isBlank() ? objectMapper.createObjectNode() : objectMapper.readTree(body);
    }

    private JsonNode getJson(String path, String token) throws Exception {
        MvcResult result = mockMvc.perform(get(path).header("Authorization", bearer(token)))
                .andExpect(status().isOk()).andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private String token(String username, String password) throws Exception {
        JsonNode response = postJson("/api/auth/login",
                "{\"username\":\"" + username + "\",\"password\":\"" + password + "\"}");
        return response.path("token").asText();
    }

    private String bearer(String token) {
        return "Bearer " + token;
    }

    private String patientRegistration(String username, String suffix) throws Exception {
        var node = objectMapper.createObjectNode();
        node.put("name", "Patient " + suffix);
        node.put("dateOfBirth", "1990-01-01");
        node.put("gender", "OTHER");
        node.put("phoneNumber", "0771234567");
        node.put("email", suffix + "@example.test");
        node.put("bloodGroup", "O+");
        node.put("address", "1 Test Street");
        node.put("emergencyContact", "0771234568");
        node.put("username", username);
        node.put("password", "SelfPatientPassword!2026");
        return objectMapper.writeValueAsString(node);
    }

    private String patientRegistrationBody(String suffix, boolean includeCredentials) throws Exception {
        var node = objectMapper.createObjectNode();
        node.put("name", "Patient " + suffix);
        node.put("dateOfBirth", "1990-01-01");
        node.put("gender", "OTHER");
        node.put("phoneNumber", "0771234567");
        node.put("email", suffix + "@example.test");
        node.put("bloodGroup", "O+");
        node.put("address", "1 Test Street");
        node.put("emergencyContact", "0771234568");
        if (includeCredentials) {
            node.put("username", suffix + ".patient");
            node.put("password", "SelfPatientPassword!2026");
        }
        return objectMapper.writeValueAsString(node);
    }

    private String doctorBody(String username) throws Exception {
        return "{\"name\":\"Provisioned Doctor\",\"dateOfBirth\":\"1985-03-14\","
                + "\"gender\":\"FEMALE\",\"phoneNumber\":\"0771111111\","
                + "\"email\":\"" + username + "@example.test\","
                + "\"specialization\":\"Cardiology\",\"licenseNumber\":\"LIC-" + username + "\"}";
    }

    private String staffBody(String username) {
        return "{\"name\":\"Provisioned Staff\",\"dateOfBirth\":\"1986-04-15\","
                + "\"gender\":\"FEMALE\",\"phoneNumber\":\"0772222222\","
                + "\"email\":\"" + username + "@example.test\",\"role\":\"Receptionist\"}";
    }

    private Patient createPatient(String suffix) {
        Patient patient = new Patient();
        patient.setPersonId("PER-" + suffix.toUpperCase().replace('.', '-'));
        patient.setPatientId("PAT-" + suffix.toUpperCase().replace('.', '-'));
        patient.setName("Patient " + suffix);
        patient.setDateOfBirth(LocalDate.of(1990, 1, 1));
        patient.setGender("OTHER");
        patient.setPhoneNumber("0771234567");
        patient.setEmail(suffix + "@example.test");
        patient.setBloodGroup("O+");
        patient.setAddress("1 Test Street");
        patient.setEmergencyContact("0771234568");
        patient.setIsActive(true);
        return patientRepository.save(patient);
    }

    private Doctor createDoctor(String suffix) {
        Doctor doctor = new Doctor();
        doctor.setPersonId("PER-" + suffix.toUpperCase().replace('.', '-'));
        doctor.setDoctorId("DOC-" + suffix.toUpperCase().replace('.', '-'));
        doctor.setName("Doctor " + suffix);
        doctor.setDateOfBirth(LocalDate.of(1980, 1, 1));
        doctor.setGender("OTHER");
        doctor.setPhoneNumber("0773333333");
        doctor.setEmail(suffix + "@example.test");
        doctor.setSpecialization("General Medicine");
        doctor.setLicenseNumber("LIC-" + suffix.toUpperCase().replace('.', '-'));
        doctor.setIsActive(true);
        return doctorRepository.save(doctor);
    }

    private MedicalStaff createStaff(String username, String staffId, String email) {
        MedicalStaff staff = new MedicalStaff();
        staff.setPersonId("PER-" + staffId);
        staff.setStaffId(staffId);
        staff.setName("Staff " + username);
        staff.setDateOfBirth(LocalDate.of(1985, 1, 1));
        staff.setGender("OTHER");
        staff.setPhoneNumber("0774444444");
        staff.setEmail(email);
        staff.setRole("Receptionist");
        staff.setIsActive(true);
        return staffRepository.save(staff);
    }

    private void createAccount(String username, String password, Person person, Role.RoleName roleName, String id) {
        UserAccount account = new UserAccount();
        account.setUserAccountId(id);
        account.setPerson(person);
        account.setUsername(username);
        account.setPasswordHash(passwordEncoder.encode(password));
        account.setRole(roleRepository.findByName(roleName).orElseThrow());
        account.setEnabled(true);
        account.setPasswordChangeRequired(false);
        userAccountRepository.save(account);
    }

    private Bed createBed(String bedId, Ward ward) {
        Bed bed = new Bed();
        bed.setBedId(bedId);
        bed.setBedNumber(bedId);
        bed.setWard(ward);
        bed.setOperationalStatus(Bed.BedOperationalStatus.AVAILABLE);
        return bedRepository.save(bed);
    }
}
