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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PharmacyLaboratoryWorkflowTests {

    private static final String STAFF_PASSWORD = "PharmacyStaffPassword!2026";
    private static final String DOCTOR_PASSWORD = "LaboratoryDoctorPassword!2026";
    private static final String PATIENT_PASSWORD = "LaboratoryPatientPassword!2026";

    @Autowired private MockMvc mockMvc;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private RoleRepository roleRepository;
    @Autowired private UserAccountRepository userAccountRepository;
    @Autowired private PatientRepository patientRepository;
    @Autowired private DoctorRepository doctorRepository;
    @Autowired private MedicineRepository medicineRepository;
    @Autowired private PrescriptionRepository prescriptionRepository;
    @Autowired private PrescriptionItemRepository prescriptionItemRepository;
    @Autowired private MedicineDispensationRepository dispensationRepository;
    @Autowired private LabTestRepository labTestRepository;
    @Autowired private LabReportRepository labReportRepository;
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
        for (String name : List.of("prescription", "prescription_item", "dispensation", "lab_test", "lab_report")) {
            idCounterRepository.findById(name).orElseGet(() -> {
                IdCounter counter = new IdCounter();
                counter.setEntityName(name);
                counter.setNextId(1L);
                return idCounterRepository.save(counter);
            });
        }
    }

    @Test
    void dispensesOnlyRemainingPrescriptionAndAvailableStockAndRecordsHistory() throws Exception {
        Fixture fixture = fixture("dispense");
        Medicine medicine = medicine(fixture.suffix(), "Cefalexin " + fixture.suffix(), 7);
        JsonNode prescription = createPrescription(fixture, medicine, 5);
        String itemId = prescription.path("items").get(0).path("prescriptionItemId").asText();
        String prescriptionId = prescription.path("prescriptionId").asText();
        assertTrue(prescriptionId.startsWith("PRE-"));

        JsonNode medicineSearch = getJson("/api/medicines?search=Cefalexin", fixture.staffToken());
        JsonNode searchedMedicine = findByText(medicineSearch, "medicineId", medicine.getMedicineId());
        assertEquals(7, searchedMedicine.path("quantity").asInt());

        JsonNode dispensation = postJson("/api/prescriptions/" + prescriptionId + "/dispensations",
                "{\"prescriptionItemId\":\"" + itemId + "\",\"quantity\":3}", fixture.staffToken());
        assertTrue(dispensation.path("dispensationId").asText().startsWith("DSP-"));
        assertEquals(fixture.patient().getPatientId(), dispensation.path("patientId").asText());
        assertEquals(4, medicineRepository.findById(medicine.getMedicineId()).orElseThrow().getQuantity());
        assertEquals(3, prescriptionItemRepository.findById(itemId).orElseThrow().getQuantityDispensed());
        assertEquals(1, dispensationRepository.findByPatient_PersonId(fixture.patient().getPersonId()).size());
        JsonNode listedPrescription = findByText(getJson("/api/prescriptions", fixture.staffToken()),
                "prescriptionId", prescriptionId);
        assertEquals(2, listedPrescription.path("items").get(0).path("remainingQuantity").asInt());
        assertTrue(getJson("/api/dispensations", fixture.staffToken()).toString()
                .contains(dispensation.path("dispensationId").asText()));

        mockMvc.perform(post("/api/prescriptions/{id}/dispensations", prescriptionId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"prescriptionItemId\":\"" + itemId + "\",\"quantity\":3}")
                        .header("Authorization", bearer(fixture.staffToken())))
                .andExpect(status().isConflict());
        assertEquals(4, medicineRepository.findById(medicine.getMedicineId()).orElseThrow().getQuantity());
        assertEquals(1, dispensationRepository.findByPatient_PersonId(fixture.patient().getPersonId()).size());

        JsonNode secondPrescription = createPrescription(fixture, medicine, 20);
        String secondItemId = secondPrescription.path("items").get(0).path("prescriptionItemId").asText();
        mockMvc.perform(post("/api/prescriptions/{id}/dispensations", secondPrescription.path("prescriptionId").asText())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"prescriptionItemId\":\"" + secondItemId + "\",\"quantity\":5}")
                        .header("Authorization", bearer(fixture.staffToken())))
                .andExpect(status().isConflict());
        assertEquals(4, medicineRepository.findById(medicine.getMedicineId()).orElseThrow().getQuantity());
        assertEquals(1, dispensationRepository.findByPatient_PersonId(fixture.patient().getPersonId()).size());
    }

    @Test
    void pharmacyRejectsInvalidRequestsAndProtectsPrescriptionOwnership() throws Exception {
        Fixture fixture = fixture("pharmacy-security");
        Patient otherPatient = createPatient("other-" + fixture.suffix());
        createAccount("other-patient-" + fixture.suffix(), PATIENT_PASSWORD, otherPatient, Role.RoleName.PATIENT);
        Medicine medicine = medicine(fixture.suffix(), "Vitamin " + fixture.suffix(), 10);
        JsonNode prescription = createPrescription(fixture, medicine, 5);
        String prescriptionId = prescription.path("prescriptionId").asText();
        String itemId = prescription.path("items").get(0).path("prescriptionItemId").asText();

        assertEquals(1, getJson("/api/prescriptions", fixture.patientToken()).size());
        assertEquals(0, getJson("/api/prescriptions", token("other-patient-" + fixture.suffix(), PATIENT_PASSWORD)).size());
        mockMvc.perform(post("/api/prescriptions/{id}/dispensations", prescriptionId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"prescriptionItemId\":\"" + itemId + "\",\"quantity\":1}")
                        .header("Authorization", bearer(fixture.doctorToken())))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/prescriptions/{id}/dispensations", prescriptionId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"prescriptionItemId\":\"" + itemId + "\",\"quantity\":0}")
                        .header("Authorization", bearer(fixture.staffToken())))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/medicines"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/prescriptions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"patientId\":\"" + fixture.patient().getPatientId() + "\",\"doctorId\":\""
                                + fixture.doctor().getDoctorId()
                                + "\",\"items\":[{\"medicineId\":\"" + medicine.getMedicineId()
                                + "\",\"prescribedQuantity\":1,\"dosage\":\"one tablet\","
                                + "\"frequency\":\"once daily\",\"durationDays\":1}]}")
                        .header("Authorization", bearer(fixture.staffToken())))
                .andExpect(status().isForbidden());
    }

    @Test
    void laboratoryOrdersResultsAndStatusTransitionsRespectPrivacyAndRoles() throws Exception {
        Fixture fixture = fixture("lab-workflow");
        Patient otherPatient = createPatient("lab-other-" + fixture.suffix());
        Doctor otherDoctor = createDoctor("lab-other-" + fixture.suffix());
        String otherDoctorUsername = "other-doctor-" + fixture.suffix();
        createAccount(otherDoctorUsername, "OtherDoctorPassword!2026", otherDoctor, Role.RoleName.DOCTOR);
        String otherDoctorToken = token(otherDoctorUsername, "OtherDoctorPassword!2026");
        createAccount("other-lab-patient-" + fixture.suffix(), "OtherPatientPassword!2026",
                otherPatient, Role.RoleName.PATIENT);

        JsonNode order = postJson("/api/lab-tests",
                "{\"patientId\":\"" + fixture.patient().getPatientId() + "\",\"doctorId\":\""
                        + fixture.doctor().getDoctorId() + "\",\"testName\":\"Complete Blood Count\"}",
                fixture.doctorToken());
        String testId = order.path("testId").asText();
        assertTrue(testId.startsWith("TST-"));
        assertEquals("PENDING", order.path("status").asText());
        assertEquals(1, getJson("/api/lab-tests?status=PENDING", fixture.patientToken()).size());
        assertEquals(0, getJson("/api/lab-tests?patientId=" + otherPatient.getPatientId(),
                token("other-lab-patient-" + fixture.suffix(), "OtherPatientPassword!2026")).size());

        mockMvc.perform(get("/api/lab-tests?patientId=" + otherPatient.getPatientId())
                        .header("Authorization", bearer(fixture.patientToken())))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/lab-tests")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"patientId\":\"" + fixture.patient().getPatientId()
                                + "\",\"doctorId\":\"" + fixture.doctor().getDoctorId()
                                + "\",\"testName\":\"Unauthorized\"}")
                        .header("Authorization", bearer(fixture.patientToken())))
                .andExpect(status().isForbidden());
        mockMvc.perform(patch("/api/lab-tests/{id}/status", testId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"COMPLETED\"}")
                        .header("Authorization", bearer(fixture.staffToken())))
                .andExpect(status().isBadRequest());

        JsonNode report = postJson("/api/lab-tests/" + testId + "/report",
                "{\"resultDetails\":\"All values are within reference range.\",\"result\":\"NORMAL\","
                        + "\"reviewingDoctorId\":\"" + fixture.doctor().getDoctorId() + "\"}",
                fixture.staffToken());
        assertTrue(report.path("reportId").asText().startsWith("REP-"));
        assertEquals("NORMAL", report.path("result").asText());
        assertEquals(LabTest.LabTestStatus.COMPLETED, labTestRepository.findById(testId).orElseThrow().getStatus());
        assertTrue(labReportRepository.findByLabTest_LabTestId(testId).isPresent());
        assertEquals("All values are within reference range.",
                getJson("/api/lab-tests/" + testId + "/report", fixture.patientToken())
                        .path("resultDetails").asText());
        assertEquals("COMPLETED", getJson("/api/lab-tests", fixture.patientToken()).get(0)
                .path("status").asText());

        mockMvc.perform(get("/api/lab-tests/{id}/report", testId)
                        .header("Authorization", bearer(token("other-lab-patient-" + fixture.suffix(),
                                "OtherPatientPassword!2026"))))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/lab-tests/{id}/report", testId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"resultDetails\":\"Duplicate report\",\"result\":\"ABNORMAL\","
                                + "\"reviewingDoctorId\":\"" + fixture.doctor().getDoctorId() + "\"}")
                        .header("Authorization", bearer(fixture.staffToken())))
                .andExpect(status().isConflict());
        mockMvc.perform(patch("/api/lab-tests/{id}/status", testId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"CANCELLED\"}")
                        .header("Authorization", bearer(fixture.staffToken())))
                .andExpect(status().isConflict());

        JsonNode cancellable = postJson("/api/lab-tests",
                "{\"patientId\":\"" + otherPatient.getPatientId() + "\",\"doctorId\":\""
                        + otherDoctor.getDoctorId() + "\",\"testName\":\"Metabolic panel\"}",
                otherDoctorToken);
        mockMvc.perform(patch("/api/lab-tests/{id}/status", cancellable.path("testId").asText())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"CANCELLED\"}")
                        .header("Authorization", bearer(fixture.staffToken())))
                .andExpect(status().isOk());
        assertEquals(LabTest.LabTestStatus.CANCELLED,
                labTestRepository.findById(cancellable.path("testId").asText()).orElseThrow().getStatus());
        mockMvc.perform(post("/api/lab-tests/{id}/report", cancellable.path("testId").asText())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"resultDetails\":\"Should fail\",\"result\":\"NORMAL\","
                                + "\"reviewingDoctorId\":\"" + otherDoctor.getDoctorId() + "\"}")
                        .header("Authorization", bearer(fixture.staffToken())))
                .andExpect(status().isConflict());
    }

    private Fixture fixture(String prefix) throws Exception {
        String suffix = prefix + "-" + UUID.randomUUID().toString().substring(0, 8);
        Patient patient = createPatient(suffix);
        Doctor doctor = createDoctor(suffix);
        MedicalStaff staff = createStaff(suffix);
        String staffUsername = "staff-" + suffix;
        String doctorUsername = "doctor-" + suffix;
        String patientUsername = "patient-" + suffix;
        createAccount(staffUsername, STAFF_PASSWORD, staff, Role.RoleName.STAFF);
        createAccount(doctorUsername, DOCTOR_PASSWORD, doctor, Role.RoleName.DOCTOR);
        createAccount(patientUsername, PATIENT_PASSWORD, patient, Role.RoleName.PATIENT);
        return new Fixture(suffix, patient, doctor,
                token(staffUsername, STAFF_PASSWORD),
                token(doctorUsername, DOCTOR_PASSWORD),
                token(patientUsername, PATIENT_PASSWORD));
    }

    private JsonNode createPrescription(Fixture fixture, Medicine medicine, int quantity) throws Exception {
        return postJson("/api/prescriptions",
                "{\"patientId\":\"" + fixture.patient().getPatientId() + "\",\"doctorId\":\""
                        + fixture.doctor().getDoctorId() + "\",\"instructions\":\"Take as directed\","
                        + "\"items\":[{\"medicineId\":\"" + medicine.getMedicineId()
                        + "\",\"prescribedQuantity\":" + quantity
                        + ",\"dosage\":\"one tablet\",\"frequency\":\"twice daily\",\"durationDays\":5}]}",
                fixture.doctorToken());
    }

    private Medicine medicine(String suffix, String name, int quantity) {
        Medicine medicine = new Medicine();
        medicine.setMedicineId("MED-" + suffix.toUpperCase().replaceAll("[^A-Z0-9]", "-"));
        medicine.setName(name);
        medicine.setCategory("Test");
        medicine.setPrice(new BigDecimal("2.50"));
        medicine.setQuantity(quantity);
        medicine.setIsActive(true);
        return medicineRepository.save(medicine);
    }

    private Patient createPatient(String suffix) {
        String id = suffix.toUpperCase().replaceAll("[^A-Z0-9]", "-");
        Patient patient = new Patient();
        patient.setPersonId("PER-" + id);
        patient.setPatientId("PAT-" + id);
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
        String id = suffix.toUpperCase().replaceAll("[^A-Z0-9]", "-");
        Doctor doctor = new Doctor();
        doctor.setPersonId("PER-DOC-" + id);
        doctor.setDoctorId("DOC-" + id);
        doctor.setName("Doctor " + suffix);
        doctor.setDateOfBirth(LocalDate.of(1980, 1, 1));
        doctor.setGender("OTHER");
        doctor.setPhoneNumber("0773333333");
        doctor.setEmail("doctor-" + suffix + "@example.test");
        doctor.setSpecialization("General Medicine");
        doctor.setLicenseNumber("LIC-" + id);
        doctor.setIsActive(true);
        return doctorRepository.save(doctor);
    }

    private MedicalStaff createStaff(String suffix) {
        String id = suffix.toUpperCase().replaceAll("[^A-Z0-9]", "-");
        MedicalStaff staff = new MedicalStaff();
        staff.setPersonId("PER-STF-" + id);
        staff.setStaffId("STF-" + id);
        staff.setName("Staff " + suffix);
        staff.setDateOfBirth(LocalDate.of(1985, 1, 1));
        staff.setGender("OTHER");
        staff.setPhoneNumber("0774444444");
        staff.setEmail("staff-" + suffix + "@example.test");
        staff.setRole("Pharmacist");
        staff.setIsActive(true);
        return staffRepository.save(staff);
    }

    @Autowired private MedicalStaffRepository staffRepository;

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
        return objectMapper.readTree(result.getResponse().getContentAsString())
                .path("token").asText();
    }

    private JsonNode findByText(JsonNode array, String field, String value) {
        for (JsonNode candidate : array) {
            if (value.equals(candidate.path(field).asText())) return candidate;
        }
        fail("No entry with " + field + "=" + value + " was returned.");
        return objectMapper.createObjectNode();
    }

    private String bearer(String token) {
        return "Bearer " + token;
    }

    private record Fixture(String suffix, Patient patient, Doctor doctor,
                           String staffToken, String doctorToken, String patientToken) {
    }
}
