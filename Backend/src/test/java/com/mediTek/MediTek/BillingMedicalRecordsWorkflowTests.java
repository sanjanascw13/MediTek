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
class BillingMedicalRecordsWorkflowTests {

    private static final String STAFF_PASSWORD = "BillingStaffTestPassword!2026";
    private static final String DOCTOR_PASSWORD = "BillingDoctorTestPassword!2026";
    private static final String PATIENT_PASSWORD = "BillingPatientTestPassword!2026";
    private static final String OTHER_PATIENT_PASSWORD = "OtherPatientTestPassword!2026";
    private static final String ADMIN_PASSWORD = "BillingAdminTestPassword!2026";

    @Autowired private MockMvc mockMvc;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private RoleRepository roleRepository;
    @Autowired private UserAccountRepository userAccountRepository;
    @Autowired private PatientRepository patientRepository;
    @Autowired private DoctorRepository doctorRepository;
    @Autowired private MedicalStaffRepository staffRepository;
    @Autowired private AppointmentRepository appointmentRepository;
    @Autowired private BillRepository billRepository;
    @Autowired private BillLineItemRepository lineItemRepository;
    @Autowired private BillPaymentRepository paymentRepository;
    @Autowired private MedicalRecordRepository medicalRecordRepository;
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
        for (String name : List.of("bill", "bill_line_item", "bill_payment", "medical_record", "appointment")) {
            idCounterRepository.findById(name).orElseGet(() -> {
                IdCounter counter = new IdCounter();
                counter.setEntityName(name);
                counter.setNextId(1L);
                return idCounterRepository.save(counter);
            });
        }
    }

    @Test
    void invoiceItemsTaxPaymentsAndBalancesRemainConsistent() throws Exception {
        Fixture fixture = fixture("invoice");
        JsonNode bill = postJson("/api/bills", """
                {"patientId":"%s","taxRatePercent":10.00,"items":[
                  {"description":"Consultation","quantity":2,"unitPrice":10.00},
                  {"description":"Dressing","quantity":1,"unitPrice":5.00}]}
                """.formatted(fixture.patient().getPatientId()), fixture.staffToken());
        String billId = bill.path("billId").asText();
        assertTrue(billId.startsWith("BIL-"));
        assertEquals("25.00", money(bill, "subtotal"));
        assertEquals("2.50", money(bill, "taxAmount"));
        assertEquals("27.50", money(bill, "amountTotal"));
        assertEquals(2, bill.path("items").size());
        assertEquals(fixture.patient().getPatientId(), bill.path("patientId").asText());

        JsonNode added = postJson("/api/bills/" + billId + "/items",
                "{\"description\":\"Lab fee\",\"quantity\":1,\"unitPrice\":7.50}", fixture.staffToken());
        String addedItemId = added.path("items").get(2).path("lineItemId").asText();
        assertEquals("35.75", money(added, "amountTotal"));
        JsonNode updated = putJson("/api/bills/" + billId + "/items/" + addedItemId,
                "{\"description\":\"Lab fee\",\"quantity\":2,\"unitPrice\":7.50}", fixture.staffToken());
        assertEquals("44.00", money(updated, "amountTotal"));
        JsonNode removed = deleteJson("/api/bills/" + billId + "/items/" + addedItemId, fixture.staffToken());
        assertEquals("27.50", money(removed, "amountTotal"));

        String requestId = UUID.randomUUID().toString();
        JsonNode partial = postJson("/api/bills/" + billId + "/payments",
                paymentRequest("10.00", requestId), fixture.staffToken());
        assertEquals("PARTIAL", partial.path("status").asText());
        assertEquals("10.00", money(partial, "amountPaid"));
        assertEquals("17.50", money(partial, "balanceDue"));
        assertEquals(1, partial.path("payments").size());

        mockMvc.perform(post("/api/bills/{billId}/payments", billId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(paymentRequest("10.00", requestId))
                        .header("Authorization", bearer(fixture.staffToken())))
                .andExpect(status().isConflict());
        mockMvc.perform(post("/api/bills/{billId}/payments", billId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(paymentRequest("17.51", UUID.randomUUID().toString()))
                        .header("Authorization", bearer(fixture.staffToken())))
                .andExpect(status().isConflict());
        assertEquals(1, paymentRepository.findByBill_BillIdOrderByPaidAt(billId).size());

        JsonNode settled = postJson("/api/bills/" + billId + "/payments",
                paymentRequest("17.50", UUID.randomUUID().toString()), fixture.staffToken());
        assertEquals("PAID", settled.path("status").asText());
        assertEquals("0.00", money(settled, "balanceDue"));
        assertEquals(2, settled.path("payments").size());
        assertEquals(2, paymentRepository.findByBill_BillIdOrderByPaidAt(billId).size());
        mockMvc.perform(post("/api/bills/{billId}/items", billId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"description\":\"Late charge\",\"quantity\":1,\"unitPrice\":2.00}")
                        .header("Authorization", bearer(fixture.staffToken())))
                .andExpect(status().isConflict());

        JsonNode search = getJson("/api/bills?search=Consultation", fixture.staffToken());
        assertEquals(1, search.size());
        assertEquals(1, getJson("/api/bills?status=PAID", fixture.staffToken()).size());
        assertEquals(0, billRepository.findById(billId).orElseThrow().getAmountPaid().compareTo(
                billRepository.findById(billId).orElseThrow().getAmountTotal()));
    }

    @Test
    void billingRejectsInvalidRequestsAndProtectsPatientInvoices() throws Exception {
        Fixture fixture = fixture("bill-access");
        Patient other = createPatient("other-" + fixture.suffix());
        createAccount("other-patient-" + fixture.suffix(), OTHER_PATIENT_PASSWORD, other, Role.RoleName.PATIENT);
        JsonNode bill = postJson("/api/bills",
                "{\"patientId\":\"" + fixture.patient().getPatientId()
                        + "\",\"items\":[{\"description\":\"Visit\",\"quantity\":1,\"unitPrice\":20.00}]}",
                fixture.adminToken());
        String billId = bill.path("billId").asText();

        assertEquals(1, getJson("/api/bills", fixture.patientToken()).size());
        assertEquals(1, getJson("/api/patients/me/bills", fixture.patientToken()).size());
        assertEquals(0, getJson("/api/bills", token("other-patient-" + fixture.suffix(),
                OTHER_PATIENT_PASSWORD)).size());
        mockMvc.perform(get("/api/bills").header("Authorization", bearer(fixture.doctorToken())))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/bills?patientId=" + other.getPatientId())
                        .header("Authorization", bearer(fixture.patientToken())))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/bills")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"patientId\":\"" + fixture.patient().getPatientId()
                                + "\",\"items\":[{\"description\":\"Visit\",\"quantity\":1,\"unitPrice\":20.00}]}")
                        .header("Authorization", bearer(fixture.patientToken())))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/bills")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"patientId\":\"" + fixture.patient().getPatientId() + "\",\"items\":[]}")
                        .header("Authorization", bearer(fixture.staffToken())))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/bills/{billId}/payments", billId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(paymentRequest("0.00", UUID.randomUUID().toString()))
                        .header("Authorization", bearer(fixture.staffToken())))
                .andExpect(status().isBadRequest());
        assertTrue(billRepository.findById(billId).isPresent());
        assertEquals(0, paymentRepository.findByBill_BillIdOrderByPaidAt(billId).size());
    }

    @Test
    void medicalRecordsAreLinkedImmutableAndLimitedByPatientAndProvider() throws Exception {
        Fixture fixture = fixture("records");
        Patient other = createPatient("other-record-" + fixture.suffix());
        Appointment appointment = createAppointment(fixture.patient(), fixture.doctor(), fixture.suffix());

        JsonNode doctorRecord = postJson("/api/medical-records",
                "{\"patientId\":\"" + fixture.patient().getPatientId()
                        + "\",\"appointmentId\":\"" + appointment.getAppointmentId()
                        + "\",\"content\":\"Assessment: routine follow-up.\"}", fixture.doctorToken());
        String recordId = doctorRecord.path("recordId").asText();
        assertTrue(recordId.startsWith("REC-"));
        assertEquals(appointment.getAppointmentId(), doctorRecord.path("appointmentId").asText());
        assertEquals(fixture.doctor().getDoctorId(), doctorRecord.path("authorId").asText());
        assertEquals(1, getJson("/api/medical-records?patientId=" + fixture.patient().getPatientId(),
                fixture.doctorToken()).size());
        assertEquals(1, getJson("/api/patients/me/medical-records", fixture.patientToken()).size());
        mockMvc.perform(get("/api/medical-records?patientId=" + other.getPatientId())
                        .header("Authorization", bearer(fixture.doctorToken())))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/medical-records?patientId=" + other.getPatientId())
                        .header("Authorization", bearer(fixture.patientToken())))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/medical-records?patientId=" + fixture.patient().getPatientId())
                        .header("Authorization", bearer(fixture.adminToken())))
                .andExpect(status().isOk());

        MedicalRecord persisted = medicalRecordRepository.findById(recordId).orElseThrow();
        assertEquals("Assessment: routine follow-up.", persisted.getContent());
        assertEquals(fixture.doctor().getPersonId(), persisted.getAuthor().getPersonId());
        assertNotNull(persisted.getCreatedAt());

        mockMvc.perform(post("/api/medical-records")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"patientId\":\"" + other.getPatientId()
                                + "\",\"appointmentId\":\"" + appointment.getAppointmentId()
                                + "\",\"content\":\"Wrong patient link\"}")
                        .header("Authorization", bearer(fixture.doctorToken())))
                .andExpect(status().isNotFound());
        mockMvc.perform(post("/api/medical-records")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"patientId\":\"" + fixture.patient().getPatientId()
                                + "\",\"appointmentId\":\"" + appointment.getAppointmentId()
                                + "\",\"content\":\"Unauthorized duplicate\"}")
                        .header("Authorization", bearer(fixture.patientToken())))
                .andExpect(status().isForbidden());
        assertEquals(1, medicalRecordRepository.findByPatient_PersonId(
                fixture.patient().getPersonId()).size());
    }

    @Test
    void staffCanCreateRecordsAndInvalidClinicalRequestsAreRejected() throws Exception {
        Fixture fixture = fixture("staff-record");
        Patient other = createPatient("unassigned-" + fixture.suffix());
        JsonNode staffRecord = postJson("/api/medical-records",
                "{\"patientId\":\"" + other.getPatientId() + "\",\"content\":\"Administrative care note.\"}",
                fixture.staffToken());
        assertEquals(other.getPatientId(), staffRecord.path("patientId").asText());
        assertEquals(1, getJson("/api/medical-records?patientId=" + other.getPatientId(),
                fixture.staffToken()).size());

        mockMvc.perform(post("/api/medical-records")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"patientId\":\"" + fixture.patient().getPatientId()
                                + "\",\"content\":\"   \"}")
                        .header("Authorization", bearer(fixture.staffToken())))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/medical-records")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"patientId\":\"" + other.getPatientId()
                                + "\",\"content\":\"Wrong doctor assignment\"}")
                        .header("Authorization", bearer(fixture.doctorToken())))
                .andExpect(status().isForbidden());
        assertEquals(1, medicalRecordRepository.findByPatient_PersonId(other.getPersonId()).size());
    }

    private Fixture fixture(String prefix) throws Exception {
        String suffix = prefix + "-" + UUID.randomUUID().toString().substring(0, 8);
        Patient patient = createPatient(suffix);
        Doctor doctor = createDoctor(suffix);
        MedicalStaff staff = createStaff(suffix);
        createAccount("staff-" + suffix, STAFF_PASSWORD, staff, Role.RoleName.STAFF);
        createAccount("doctor-" + suffix, DOCTOR_PASSWORD, doctor, Role.RoleName.DOCTOR);
        createAccount("patient-" + suffix, PATIENT_PASSWORD, patient, Role.RoleName.PATIENT);
        createAccount("admin-" + suffix, ADMIN_PASSWORD, null, Role.RoleName.SUPER_ADMIN);
        return new Fixture(suffix, patient, doctor,
                token("staff-" + suffix, STAFF_PASSWORD),
                token("doctor-" + suffix, DOCTOR_PASSWORD),
                token("patient-" + suffix, PATIENT_PASSWORD),
                token("admin-" + suffix, ADMIN_PASSWORD));
    }

    private Patient createPatient(String suffix) {
        String id = safeId(suffix);
        Patient patient = new Patient();
        patient.setPersonId("PER-" + id);
        patient.setPatientId("PAT-" + id);
        patient.setName("Patient " + suffix);
        patient.setDateOfBirth(LocalDate.of(1990, 1, 1));
        patient.setGender("OTHER");
        patient.setPhoneNumber("0771234567");
        patient.setEmail("patient-" + suffix + "@example.test");
        patient.setBloodGroup("O+");
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
        doctor.setSpecialization("General Medicine");
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
        staff.setRole("Billing and Records");
        staff.setIsActive(true);
        return staffRepository.save(staff);
    }

    private Appointment createAppointment(Patient patient, Doctor doctor, String suffix) {
        Appointment appointment = new Appointment();
        appointment.setAppointmentId("APT-" + safeId(suffix));
        appointment.setPatient(patient);
        appointment.setDoctor(doctor);
        appointment.setAppointmentDate(Instant.now().plusSeconds(86_400));
        appointment.setStatus(Appointment.AppointmentStatus.COMPLETED);
        appointment.setNotes("Test encounter");
        return appointmentRepository.save(appointment);
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

    private String paymentRequest(String amount, String requestId) {
        return "{\"amount\":" + amount + ",\"paymentMethod\":\"CASH\",\"paymentRequestId\":\"" + requestId + "\"}";
    }

    private String money(JsonNode node, String field) {
        return node.path(field).decimalValue().setScale(2).toPlainString();
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

    private JsonNode putJson(String path, String json, String token) throws Exception {
        MvcResult result = mockMvc.perform(put(path)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json)
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private JsonNode deleteJson(String path, String token) throws Exception {
        MvcResult result = mockMvc.perform(delete(path)
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
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
