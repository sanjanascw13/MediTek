# MediTek — 09. Frontend to Backend Integration Guide

## 1. Integration Architecture Overview

The MediTek system is designed with a **Decoupled Dual-Adapter Architecture**. The React frontend can operate in two distinct modes without changing a single line of component code:

```mermaid
graph TD
    UI[React Page / Component] --> Svc[Module Service e.g., admissionService.js]
    Svc --> Check{Check VITE_USE_MOCKS}
    Check -->|true| MockAdapter[Mock Adapter: In-Memory / LocalStorage Engine]
    Check -->|false| HttpAdapter[HTTP Adapter: Real REST Calls via Fetch]
    HttpAdapter --> HttpClient[Shared HttpClient: Bearer Token, 401 Interceptor]
    HttpClient --> LiveBackend[(Future Spring Boot REST API: http://localhost:8080/api/v1)]
```

> [!WARNING]
> **Honest Engineering Status:**
> The frontend HTTP service adapters in `src/services/http/` are written strictly to adhere to `04-api-contract.yaml`. However, because the backend is being implemented by your team and has not yet been started, **the HTTP adapters have not yet been tested against a live Spring Boot server**. When your team finishes the backend, use this guide to connect and verify live communication.

---

## 2. Environment Configuration

The frontend controls its communication mode through Vite environment variables located in `d:\Project\Frontend\.env`:

### 2.1 Switching from Mock Mode to Live Backend
When your team is ready to test against the Spring Boot backend:

```env
# Change this from true to false:
VITE_USE_MOCKS=false

# Point this to your local Spring Boot server URL:
VITE_API_BASE_URL=http://localhost:8080/api/v1
```

Once updated, restart the Vite development server (`npm run dev`). The frontend UI will automatically display a status badge indicating that it is running in **Live Backend Mode**.

---

## 3. Authentication & JWT Token Flow

### 3.1 Token Storage & Injection
1. Upon successful login (`POST /api/v1/auth/login`), the backend returns:
   ```json
   {
     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
     "tokenType": "Bearer",
     "expiresIn": 86400,
     "user": {
       "userId": "USR-0001",
       "username": "admin",
       "role": "ADMIN",
       "personId": "PER-0001"
     }
   }
   ```
2. The frontend `AuthContext` stores the token in browser `localStorage` under the key `meditek_token`.
3. The shared `httpClient.js` interceptor automatically reads `localStorage.getItem('meditek_token')` and attaches it to every subsequent HTTP request:
   ```http
   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
4. If the backend returns `401 Unauthorized` (indicating the token expired or signature failed), `httpClient.js` automatically clears local session state and redirects the user to `/login` with an informative toast message.

---

## 4. Error Handling and Status Code Expectations

The frontend services expect standardized HTTP status codes matching `04-api-contract.yaml`:

| Status Code | Meaning | Frontend Behavior |
| :--- | :--- | :--- |
| **`200 OK`** | Request succeeded | Updates view, renders data table or details. |
| **`201 Created`** | New entity created | Closes modal, renders success toast notification, refetches list. |
| **`204 No Content`** | Action completed without body | Closes modal, renders success toast. |
| **`400 Bad Request`** | Validation failure | Parses `validationErrors[]` and highlights individual form input fields with red error messages. |
| **`401 Unauthorized`** | Missing or expired token | Clears authentication state and routes to `/login`. |
| **`403 Forbidden`** | Role unauthorized / unassigned doctor | Renders a styled, friendly `AccessDenied` view explaining the permission violation. |
| **`404 Not Found`** | Resource missing | Renders `NotFound` or empty state. |
| **`409 Conflict`** | Concurrency or state collision | Renders a high-visibility warning toast (e.g., *"Bed is currently occupied"* or *"Patient already admitted"*). |
| **`500 Internal Error`**| Unexpected server failure | Renders a friendly error card advising the user to contact the system administrator. |

---

## 5. Pagination & Data Envelope Expectations

When querying paginated lists (`GET /api/v1/patients`, `GET /api/v1/appointments`), the frontend expects Spring Data's standard `Page<T>` JSON envelope:

```json
{
  "content": [
    {
      "patientId": "PAT-0001",
      "name": "John Doe",
      "phoneNumber": "0771234567"
    }
  ],
  "page": 0,
  "size": 10,
  "totalElements": 42,
  "totalPages": 5,
  "last": false
}
```

The frontend `DataTable` component uses `totalElements`, `page`, and `totalPages` to dynamically configure the pagination controls (`Previous`, `Page 1 of 5`, `Next`).

---

## 6. Live Backend Conformance Checklist for Team Members

Before declaring the integration complete, your team should execute this step-by-step verification checklist:

- [ ] **CORS Verification:** Verify that requests from `http://localhost:5173` do not trigger browser CORS errors in the Developer Tools Console.
- [ ] **Patient Registration:** Verify that submitting the frontend self-registration form creates entries in `persons`, `patients`, and `user_accounts` in MySQL with role `PATIENT`.
- [ ] **Admin Authentication:** Verify that logging in as `admin` unlocks the complete administrative navigation menu.
- [ ] **Doctor History Privacy:** Verify that when logged in as a Doctor, accessing `/patients/PAT-XXXX/history` for a non-assigned patient returns HTTP `403 Forbidden` and displays the Access Denied UI.
- [ ] **Bed Availability Calculation:** Verify that the dashboard metric for available beds accurately matches the formula: `Total Beds - (Occupied Beds + Maintenance Beds)`.
- [ ] **Double-Booking Rejection:** Attempt to admit two patients to the same bed concurrently; verify that the backend returns HTTP `409 Conflict` and the frontend renders the conflict toast.
- [ ] **Transfer Lifecycle Audit:** Verify that transferring a patient from Bed A to Bed B updates the existing admission status to `TRANSFERRED`, frees Bed A to `AVAILABLE`, marks Bed B as `OCCUPIED`, and creates a new active admission in MySQL.
- [ ] **Billing Line Items:** Verify that generating a patient invoice correctly aggregates the charges from admissions, lab tests, and dispensed medications.
