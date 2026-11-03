# MediTek — 06. Security Architecture and Role Matrix

## 1. System Security Overview (Academic Demonstration Context)

This document describes the current backend source. The role annotations and
service-level ownership checks are implemented, but they have only been
verified with isolated H2 tests; live MySQL and deployment behavior remain
unverified. `ADMIN` is retained as a legacy role and treated as
`SUPER_ADMIN`; the four current roles are `SUPER_ADMIN`, `DOCTOR`, `STAFF`, and
`PATIENT`.

---

## 2. Role-Based Access Control (RBAC) Matrix

MediTek defines four distinct system roles:

| Module / Operation | Super Admin | Doctor | Staff | Patient |
| :--- | :---: | :---: | :---: | :---: |
| **Authentication** | Login; change own password | Login; change own password | Login; change own password | Login/self-registration; change own password |
| **Doctor and Staff accounts** | Create, activate/deactivate, view | View permitted directories | View permitted directory | No access |
| **Departments** | Manage and view | View | View | View |
| **Wards and beds** | Create/manage/view | View | View/update bed operational status | No access |
| **Patient profiles** | Register, list, deactivate | List/get patients in own care | Register/list/get | Own profile only |
| **Appointments** | Book/update/list | Assigned list; complete assigned appointment | Book/update/list | Book and view own appointments |
| **Admissions** | Admit, transfer, discharge, list | View active admissions assigned to Doctor | Admit, transfer, discharge, list | No dedicated self-admission endpoint |
| **Prescriptions and pharmacy** | Read all, prescribe, dispense | Read own, prescribe | Read all, dispense | Own prescriptions and dispensing history |
| **Laboratory** | Read/order/update/publish | Read responsible tests; order/update/publish | Read/update/publish | Own tests and reports |
| **Surgeries** | Schedule/update/read | Schedule own work/update assigned/read own | Read/update status | Read own surgery history |
| **Blood bank** | Manage banks/inventory/issues | Read banks/inventory | Read, receive, issue | Read own issue history |
| **Billing** | Manage invoices and payments | No invoice access | Manage invoices and payments | Read own invoices |
| **Medical records** | Operational read | Assigned-patient read and own appointment notes | Operational read/create notes | Own records only |

This table summarizes controller role allow-lists plus service-level ownership
checks; it does not make frontend route restrictions a security boundary.

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

    User->>AuthCtrl: POST /api/auth/login { username, password }
    AuthCtrl->>Svc: authenticate(username, password)
    Svc->>DB: Query user_accounts by username
    DB-->>Svc: UserAccount entity with password_hash
    Svc->>Svc: Verify password using BCrypt.checkpw()
    alt Credentials Invalid
        Svc-->>User: Return HTTP 401 Unauthorized
    else Credentials Valid
        Svc->>JWT: generateToken(UserAccount)
        Note over JWT: Sign token with configured HMAC key<br/>Claims: sub, role, iat, exp
        JWT-->>Svc: Encoded JWT String
        Svc-->>User: Return HTTP 200 OK { token, username, role, personId, name, passwordChangeRequired }
    end
```

### 3.1 Token Claims Payload Structure
```json
{
  "sub": "<account-username>",
  "role": "DOCTOR",
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
- The backend configures BCrypt strength through `MEDITEK_BCRYPT_STRENGTH` (default `12`, allowed range `10`–`14`).
- When a user logs in, the entered plaintext password is verified using `passwordEncoder.matches(rawPassword, encodedPassword)`.

### 4.2 Account Provisioning Rules
1. **Patient Self-Registration:** Public `POST /api/auth/register` forces the `PATIENT` role. Staff/Super Admin can also provision a Patient through `POST /api/patients`; this returns a one-time temporary password that must be changed before other API use.
2. **Doctor & Staff Provisioning:** `POST /api/doctors` and `POST /api/staff` are restricted to Super Admin (including the legacy `ADMIN` alias). They return temporary credentials once; plaintext passwords are not stored.

---

## 5. Frontend UX Guards vs. Backend API Enforcement

> [!WARNING]
> **Core Architectural Principle:**
> Hiding a button in React or redirecting to an `/access-denied` route is a **UX convenience only**. It prevents user frustration, but offers zero real security because any user can open their browser's Developer Tools or send HTTP requests directly via Postman or `curl`.
>
> Therefore, **every single backend REST endpoint must independently enforce security**:
> - The Spring Security filter chain validates the JWT on every request.
> - Method security annotations (`@PreAuthorize`) protect controller methods.
> - Service-level ownership checks ensure patients can only access records matching their authenticated `personId`, and Doctors can only access scoped patient records.

---

## 6. CORS Configuration for Local Development

The current `CorsConfig` reads the explicit comma-separated
`MEDITEK_CORS_ALLOWED_ORIGINS` setting (defaults to the local Vite origins),
allows the API methods and authorization/content headers, and does not allow
wildcard origins. Configure the production origin explicitly.

---

## 7. Credential Management & Development Profiles

- **No Hardcoded Secrets:** JWT secret keys and database passwords must be loaded via environment variables or Spring `application-dev.properties`, never hardcoded into source code.
- **Bootstrap:** `SuperAdminBootstrapper` provisions the initial Super Admin only when `MEDITEK_BOOTSTRAP_SUPER_ADMIN_USERNAME` and `MEDITEK_BOOTSTRAP_SUPER_ADMIN_PASSWORD` are provided. The credentials are read from the environment, validated, hashed, and never written in source. No general demo-data initializer is configured in the backend.
- **Fictional Data Only:** All test patients, telephone numbers, and addresses must be completely fictional.
