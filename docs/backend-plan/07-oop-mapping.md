# MediTek — 07. Object-Oriented Programming (OOP) Mapping & Viva Guide

## 1. Introduction for the University Viva Defense

A core objective of the **MediTek** project is to demonstrate how the four foundational pillars of **Object-Oriented Programming (OOP)** solve real-world problems in hospital information management.

This guide provides clean, conceptual explanations and concrete Java code examples that you can explain directly to your university professors and examiners during your viva defense.

---

## 2. Pillar 1: Encapsulation

### 2.1 What is Encapsulation?
**Encapsulation** is the bundling of data (attributes) and the methods that operate on that data into a single unit (class), while restricting direct access to the internal state from the outside world.

### 2.2 How MediTek Applies Encapsulation
In MediTek, sensitive medical and personal data—such as patient contact details, bed availability statuses, and medicine stock—are kept `private`. Access is provided through public getters, setters, and domain validation methods (`validateDetails()`), preventing invalid states from being saved.

```java
// Encapsulation in the Person Base Class
public abstract class Person {
    private String personId;
    private String name;
    private String phoneNumber;
    private String email;

    // Public Getter
    public String getPhoneNumber() {
        return phoneNumber;
    }

    // Public Setter with Encapsulated Validation
    public void setPhoneNumber(String phoneNumber) {
        if (phoneNumber == null || !phoneNumber.matches("^0[0-9]{9}$")) {
            throw new IllegalArgumentException("Phone number must be a valid 10-digit Sri Lankan phone number.");
        }
        this.phoneNumber = phoneNumber;
    }

    // Encapsulated Business Validation
    public boolean validateDetails() {
        return name != null && !name.trim().isEmpty() 
            && email != null && email.contains("@")
            && phoneNumber != null && phoneNumber.length() == 10;
    }
}
```

#### Viva Defense Explanation:
> *"Instead of allowing external code to directly modify a patient's phone number or a bed's status, our classes encapsulate their fields as private. The setter validates that the phone number contains exactly 10 digits before changing the state. If invalid data is supplied, the object defends its own integrity."*

---

## 3. Pillar 2: Inheritance

### 3.1 What is Inheritance?
**Inheritance** is the mechanism where a new class (subclass/child) derives attributes and behaviors from an existing class (superclass/parent). This promotes code reuse and models an "IS-A" relationship.

### 3.2 How MediTek Applies Inheritance
MediTek features two major inheritance hierarchies:
1. **The `Person` Hierarchy:** `Patient`, `Doctor`, and `MedicalStaff` inherit common demographic attributes (`name`, `dateOfBirth`, `phoneNumber`, `email`) from the abstract `Person` class. Furthermore, `Nurse` inherits from `MedicalStaff`, creating a multi-level inheritance hierarchy (`Nurse IS-A MedicalStaff IS-A Person`).
2. **The `Department` Hierarchy:** Ten distinct clinical departments (e.g., `ICU`, `Pharmacy`, `Laboratory`, `OperatingTheater`) inherit common location and administrative fields from the abstract `Department` class.

```java
// Superclass
public abstract class MedicalStaff extends Person {
    private String staffId;
    private String role;
    private String departmentName;

    // Reuses person attributes and adds staff attributes
}

// Multi-Level Inheritance: Nurse extends MedicalStaff
public class Nurse extends MedicalStaff {
    private String shift; // MORNING, EVENING, NIGHT

    public void monitorPatient() {
        System.out.println("Nurse " + getName() + " is monitoring patients on " + shift + " shift.");
    }
}
```

#### Viva Defense Explanation:
> *"Without inheritance, we would have duplicated name, dateOfBirth, and contact information across Patient, Doctor, MedicalStaff, and Nurse classes. By creating an abstract Person superclass, we adhere to the DRY (Don't Repeat Yourself) principle and establish clear taxonomic relationships."*

---

## 4. Pillar 3: Abstraction

### 4.1 What is Abstraction?
**Abstraction** is the concept of hiding complex internal implementation details and exposing only the essential, high-level features of an object. In Java, abstraction is achieved using **abstract classes** and **interfaces**.

### 4.2 How MediTek Applies Abstraction
Both `Person` and `Department` are declared `abstract`. You cannot instantiate a generic "Department" or "Person"; you can only instantiate a concrete subclass like `ICU` or `Doctor`. The abstract classes define abstract method contracts that every child must implement.

```java
// Abstract Superclass
public abstract class Department {
    private String departmentId;
    private String departmentName;
    private String location;

    // Abstract method contract: Every department manages services differently
    public abstract void manageService();

    // Abstract method contract: Every department formats details differently
    public abstract String getDetails();
}
```

#### Viva Defense Explanation:
> *"Abstraction allows the rest of our system to interact with a hospital department through its common interface without needing to know the complex internal mechanics of how an ICU runs ventilators or how a Laboratory runs spectrophotometers."*

---

## 5. Pillar 4: Polymorphism

### 5.1 What is Polymorphism?
**Polymorphism** ("many forms") allows objects of different concrete classes to be treated through a common superclass reference, with the correct subclass method executing at runtime (**dynamic method dispatch**).

### 5.2 How MediTek Demonstrates Real-World Polymorphism
Rather than using a toy example, MediTek demonstrates polymorphism through a real administrative service endpoint: `DepartmentService.executeDepartmentDailyService(departmentId)`.

```java
// Polymorphic Implementation in Department Subclasses

public class ICU extends Department {
    private Integer bedCapacity;

    @Override
    public void manageService() {
        // Concrete ICU Service Behavior
        System.out.println("ICU Daily Routine: Calibrating vital sign monitors and checking ventilator oxygen supply.");
    }

    @Override
    public String getDetails() {
        return "ICU at " + getLocation() + " with " + bedCapacity + " intensive care beds.";
    }
}

public class Laboratory extends Department {
    private String laboratoryType;

    @Override
    public void manageService() {
        // Concrete Laboratory Service Behavior
        System.out.println("Laboratory Daily Routine: Running automated QC calibration on hematology analyzer.");
    }

    @Override
    public String getDetails() {
        return laboratoryType + " Lab located at " + getLocation();
    }
}

public class Pharmacy extends Department {
    private String pharmacyType;

    @Override
    public void manageService() {
        // Concrete Pharmacy Service Behavior
        System.out.println("Pharmacy Daily Routine: Checking expiration dates and reconciling narcotic medication inventory.");
    }

    @Override
    public String getDetails() {
        return pharmacyType + " Pharmacy located at " + getLocation();
    }
}
```

### 5.3 The Polymorphic Service Operation (Viva Demonstration Highlight)
```java
@Service
public class DepartmentService {
    @Autowired
    private DepartmentRepository departmentRepository;

    public void runDailyDepartmentService(String departmentId) {
        // Polymorphic reference: Variable type is the abstract superclass 'Department'
        Department dept = departmentRepository.findById(departmentId)
            .orElseThrow(() -> new ResourceNotFoundException("Department not found"));

        // DYNAMIC DISPATCH: Java automatically invokes the child's method at runtime!
        // No 'if (dept instanceof ICU)' or 'switch' statements required!
        dept.manageService();
    }
}
```

#### Viva Defense Explanation:
> *"Look at our DepartmentService. It holds a reference of type Department, not ICU or Pharmacy. When we invoke `dept.manageService()`, the Java Virtual Machine dynamically dispatches the call to the appropriate subclass method based on the actual object in memory. If our hospital opens a new department tomorrow, like an OncologyUnit, we simply create a new class extending Department without modifying existing service code, perfectly demonstrating the Open/Closed Principle (OCP)."*

---

## 6. Summary Viva Quick-Reference Card

| Pillar | How to Define It in 10 Seconds | Where It Lives in MediTek Code |
| :--- | :--- | :--- |
| **Encapsulation** | "Protecting an object's internal state using private fields and public validated accessors." | `Person.java` validating 10-digit phone numbers and email formats; `Bed.java` availability state transitions. |
| **Inheritance** | "Reusing attributes and behaviors across specialized child classes in an IS-A relationship." | `Patient`, `Doctor`, and `MedicalStaff` extending `Person`; `Nurse` extending `MedicalStaff`. |
| **Abstraction** | "Hiding implementation complexity behind abstract method contracts and interfaces." | Abstract classes `Person` and `Department`; abstract methods `manageService()` and `getDetails()`. |
| **Polymorphism** | "Treating multiple subclasses uniformly while dynamically executing specialized behavior at runtime." | Calling `department.manageService()` where ICU checks ventilators and Pharmacy checks medicine stocks with zero switch statements. |
