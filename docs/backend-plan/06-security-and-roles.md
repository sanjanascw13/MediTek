# MediTek — 06. Security Architecture and Role Matrix

## 1. System Security Overview (Academic Demonstration Context)

> [!NOTE]
> **University Demonstration Notice:**
> The security architecture documented here is designed specifically for an academic demonstration and viva presentation. It incorporates industry-standard patterns—including stateless JWT token authentication, BCrypt password hashing, and role-based access control (RBAC)—while remaining straightforward to configure, test, and explain without corporate enterprise overhead.

---

## 2. Role-Based Access Control (RBAC) Matrix

MediTek defines four distinct system roles:

| Module / Operation | Admin (`ADMIN`) | Doctor (`DOCTOR`) | Staff (`STAFF`) | Patient (`PATIENT`) |
| :--- | :---: | :---: | :---: | :---: |
| **Authentication & Profile** | Full | Full | Full | Self profile only |
| **User & Staff Account Provisioning** | Manage All | View Directory | View Directory | None |
| **Department & Ward Infrastructure** | Manage All | View Only | View / Update Bed Status | View Departments Only |
| **Patient Registration** | Register All | Register All | Register All | Self-Registration Only |
| **Patient Medical Records** | Full | Assigned Patients Only | None | Own Records Only |
| **Prescriptions & Pharmacy** | Full | Issue / View | Dispense / Update Stock | Own Prescriptions Only |
| **Laboratory Tests & Reports** | Full | Order / View | Publish Reports | Own Reports Only |
| **Operating Theater & Surgeries** | Schedule All | Schedule / Perform | View Schedule | None |
| **Inpatient Admissions & Transfers**| Full | Admit / Transfer | Admit / Transfer / Discharge | Own Admission Only |
| **Blood Bank Management** | Full | View Stock | Manage Stock / Units | None |
| **Billing & Invoicing** | Full | View Only | Issue / Receive Payment | Own Bills Only |

---

## 3. JWT Stateless Authentication Lifecycle

MediTek uses JSON Web Tokens (JWT) for stateless session management between the React frontend and Spring Boot backend:

```mermaid
sequenceDiagram
    autonumber
    actor User as Client Browser
    participant AuthCtrl as AuthController
    participant Svc as AuthenticationService
    participant JWT as JwtTokenProvider
    participant DB as MySQL Database

    User->>AuthCtrl: POST /api/v1/auth/login { username, password }
    AuthCtrl->>Svc: authenticate(username, password)
    Svc->>DB: Query user_accounts by username
    DB-->>Svc: UserAccount entity with password_hash
    Svc->>Svc: Verify password using BCrypt.checkpw()
    alt Credentials Invalid
        Svc-->>User: Return HTTP 401 Unauthorized
    else Credentials Valid
        Svc->>JWT: generateToken(UserAccount)
        Note over JWT: Sign token with HMAC-SHA256<br/>Claims: sub, role, userId, personId
        JWT-->>Svc: Encoded JWT String
        Svc-->>User: Return HTTP 200 OK { token, userProfile }
    end
```

### 3.1 Token Claims Payload Structure
```json
{
  "sub": "sarah.smith",
  "userId": "USR-0002",
  "role": "ROLE_DOCTOR",
  "personId": "PER-0002",
  "name": "Dr. Sarah Smith",
  "iat": 1792728000,
  "exp": 1792814400
}
```

### 3.2 Authorization Header
The frontend includes the token in the HTTP `Authorization` header on all subsequent requests:
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 4. Password Security & Account Provisioning Rules

### 4.1 BCrypt Password Hashing
- Passwords must **never** be stored in plaintext.
- The future Spring Boot backend must configure a `BCryptPasswordEncoder` bean with a work factor (strength) of `10` or `12`.
- When a user logs in, the entered plaintext password is verified using `passwordEncoder.matches(rawPassword, encodedPassword)`.

### 4.2 Account Provisioning Rules
1. **Patient Self-Registration:** Public endpoint `POST /api/v1/auth/register` creates an entry in `persons`, an entry in `patients`, and an entry in `user_accounts`. The assigned role is **strictly forced to `ROLE_PATIENT`**. It is impossible for a user to self-register as an Admin, Doctor, or Staff.
2. **Doctor & Staff Provisioning:** Doctor and Staff accounts can **only be created by an authenticated `ADMIN`** via `POST /api/v1/staff` or `POST /api/v1/doctors`.

---

## 5. Frontend UX Guards vs. Backend API Enforcement

> [!WARNING]
> **Core Architectural Principle:**
> Hiding a button in React or redirecting to an `/access-denied` route is a **UX convenience only**. It prevents user frustration, but offers zero real security because any user can open their browser's Developer Tools or send HTTP requests directly via Postman or `curl`.
>
> Therefore, **every single backend REST endpoint must independently enforce security**:
> - The Spring Security filter chain validates the JWT on every request.
> - Method security annotations (`@PreAuthorize`) protect service methods.
> - Data-level checks ensure patients can only access records matching their authenticated `personId`, and doctors can only access medical records for assigned patients.

---

## 6. CORS Configuration for Local Development

To allow the Vite React frontend (`http://localhost:5173`) to communicate with the Spring Boot backend (`http://localhost:8080`), the backend must configure Cross-Origin Resource Sharing (CORS):

```java
// Recommended Spring Boot WebMvcConfigurer Implementation
@Configuration
public class WebCorsConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/v1/**")
            .allowedOrigins("http://localhost:5173")
            .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
            .allowedHeaders("Authorization", "Content-Type", "Accept")
            .allowCredentials(true)
            .maxAge(3600);
    }
}
```

---

## 7. Credential Management & Development Profiles

- **No Hardcoded Secrets:** JWT secret keys and database passwords must be loaded via environment variables or Spring `application-dev.properties`, never hardcoded into source code.
- **Development Seed Data:** Mock users and seed data must be loaded only under a Spring `@Profile("dev")` runner (`DataInitializer.java`).
- **Fictional Data Only:** All test patients, telephone numbers, and addresses must be completely fictional.
