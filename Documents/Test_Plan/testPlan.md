# Test Plan: FPGA Simulation Web Application

**Prepared by:** Rémy Charles (QA)  
**Date:** March 25, 2025  

---

## TABLE OF CONTENTS

1.0 INTRODUCTION  
2.0 OBJECTIVES AND TASKS  
3.0 SCOPE  
4.0 TESTING STRATEGY  
5.0 HARDWARE REQUIREMENTS  
6.0 ENVIRONMENT REQUIREMENTS  
7.0 TEST SCHEDULE  
8.0 CONTROL PROCEDURES  
9.0 FEATURES TO BE TESTED  
10.0 FEATURES NOT TO BE TESTED  
11.0 RESOURCES/ROLES & RESPONSIBILITIES  
12.0 SCHEDULES  
13.0 SIGNIFICANTLY IMPACTED DEPARTMENTS (SIDs)  
14.0 DEPENDENCIES  
15.0 RISKS/ASSUMPTIONS  
16.0 TOOLS  
17.0 APPROVALS  
18.0 REQUIREMENT TRACEABILITY MATRIX  
19.0 TEST DATA STRATEGY  
20.0 NON-FUNCTIONAL TESTING  
21.0 FINAL ACCEPTANCE CRITERIA  

---

## 1.0 INTRODUCTION
This test plan defines the test strategy and execution framework for the FPGA Simulation Web Application. The platform allows teachers to upload Verilog applications and students to simulate FPGA circuits via an interactive web interface.

## 2.0 OBJECTIVES AND TASKS

### Objectives
- Define scope and strategy of testing activities.  
- Establish procedures and responsibilities.  
- Serve as a reference and planning document.

### Tasks
- Create test cases and scripts.  
- Execute manual and automated tests.  
- Report, track, and validate bugs.  
- Deliver test reports and summaries.

## 3.0 SCOPE

### General
Testing includes:
- Simulation control and execution.
- File upload and validation.
- Visualization rendering and interaction.
- Backend API correctness.
- Security authentication.
- Cross-browser and platform compatibility.

## 4.0 TESTING STRATEGY

### Unit Testing
**Definition:** Test individual components (parsers, simulation modules, UI controls).  
**Participants:** Developers.  
**Methodology:** Write unit tests for backend logic and Angular components.

### System & Integration Testing
**Definition:** Validate interaction between UI, backend, and simulation tools.  
**Participants:** QA team.  
**Methodology:** End-to-end tests using mock data and real file uploads.

### Performance and Stress Testing
**Definition:** Test response time, throughput, and concurrency.  
**Participants:** QA & DevOps.  
**Methodology:** Simulate multiple concurrent users and large simulations.

### User Acceptance Testing (UAT)
**Definition:** Validate that user flows (teacher & student) meet expectations.  
**Participants:** Pilot users, teachers.  
**Methodology:** Perform scenario-based testing using real examples.

### Regression Testing
**Definition:** Verify new code does not break existing functionality.  
**Participants:** QA.  
**Methodology:** Run automated test suite before releases.

## 5.0 HARDWARE REQUIREMENTS
- Developer and tester machines with modern browsers.
- Server with Node.js and simulation toolchains (Yosys, Icarus Verilog).

## 6.0 ENVIRONMENT REQUIREMENTS
- Hosted Angular frontend (via Firebase/AWS).
- Node.js/Express backend (EC2 or similar).
- CI/CD pipeline for deployment.
- Database (MongoDB/PostgreSQL) for test data.

## 7.0 TEST SCHEDULE

| Phase                   | Dates            |
|-------------------------|------------------|
| Test Case Design        | March 3–5        |
| Functional Testing      | March 6–13       |
| Performance & Security  | March 14–16      |
| UAT & Regression        | March 17–18      |

### Entry Criteria
- All features marked “ready for QA”
- Test environment is deployed and stable
- Required documentation available (functional + tech spec)

### Exit Criteria
- 100% of High-Priority test cases executed
- All Critical bugs resolved or accepted by stakeholders
- Test Summary Report delivered and reviewed

## 8.0 CONTROL PROCEDURES

**Problem Reporting:**  
All issues will be logged on GitHub Issues with severity, steps to reproduce, and environment.

**Bug Lifecycle Stages:**
1. New – Bug is created and needs triage  
2. Open – QA lead validates and assigns priority  
3. In Progress – Developer is fixing it  
4. Resolved – Fix committed; waiting for QA retest  
5. Closed – Verified and approved by QA  
6. Reopened – If bug persists after being marked fixed  

**Change Requests:**  
All feature changes require approval from the QA and Technical Leader before testing.

## 9.0 FEATURES TO BE TESTED

- Teacher file upload, metadata management
- Student simulation controls
- Signal visualization and timing display
- API endpoints (simulate, upload, fetch files)
- SDF/Verilog parsing
- JWT authentication and access control

## 10.0 FEATURES NOT TO BE TESTED

- Internal correctness of Yosys / Icarus Verilog tools
- SEO optimization or marketing content

## 11.0 RESOURCES / ROLES & RESPONSIBILITIES

| Name               | Role                      |
|--------------------|---------------------------|
| Rémy Charles       | QA, Test Plan & Execution |
| Axel David         | Technical Lead            |
| Thomas & Evan      | Software Engineers        |
| Benoît de Keyn     | Technical Writer          |

## 12.0 SCHEDULES

### Major Deliverables
- Test Plan  
- Test Cases  
- Bug Reports  
- Test Summary Report

## 13.0 SIGNIFICANTLY IMPACTED DEPARTMENTS (SIDs)

| Department | Business Manager   | Tester(s)       |
|------------|--------------------|-----------------|
| Education  | Manech Laguens     | Rémy Charles    |

## 14.0 DEPENDENCIES

- Final integration of backend & frontend.
- Access to simulation tools and test files.

## 15.0 RISKS / ASSUMPTIONS

| Risk                        | Mitigation                            |
|-----------------------------|----------------------------------------|
| Delay in API readiness      | Use mock data or stub endpoints       |
| Simulation errors           | Run with verified test files first    |
| Team availability issues    | Define backup QA schedule             |

## 16.0 TOOLS

- **Bug Tracking:** GitHub Issues  
- **Automation Tools:** Cypress, Postman, JMeter  
- **Version Control:** GitHub  
- **CI/CD:** GitHub Actions

## 17.0 APPROVALS

| Name             | Signature | Date         |
|------------------|-----------|--------------|
| Rémy Charles     | ✅         | 2025-03-25   |
| Axel David       | ✅         | 2025-03-25   |
| Manech Laguens   | ✅         | 2025-03-25   |

## 18.0 REQUIREMENT TRACEABILITY MATRIX

| Requirement ID | Feature / Functionality             | Test Case ID(s)     |
|----------------|-------------------------------------|---------------------|
| FR-01          | Upload Verilog application          | TC-01, TC-02        |
| FR-02          | Run simulation & control it         | TC-03, TC-04, TC-05 |
| FR-03          | Display 2D signal propagation       | TC-06, TC-07        |
| FR-04          | File validation and error handling  | TC-08, TC-09        |

## 19.0 TEST DATA STRATEGY

- Use synthetic Verilog and SDF files that mimic real use cases.
- Include valid and invalid examples for validation testing.
- Create test-specific JSON schematic files to speed up regression testing.
- Back up all test data files in a dedicated `test-data/` directory in the repo.

## 20.0 NON-FUNCTIONAL TESTING

- **Accessibility Testing:** Ensure interface complies with basic a11y standards.
- **Cross-Browser Testing:** Chrome, Firefox, Safari, Edge
- **Responsiveness Testing:** Test layout on tablets, laptops, and large screens

## 21.0 FINAL ACCEPTANCE CRITERIA

- The teacher can upload, view, and manage simulation applications.
- The student can load and run a simulation with visual signal feedback.
- The simulation engine handles basic circuits with correct delay representation.
- The system performs with <2s latency during signal propagation rendering.
- All critical bugs are resolved; UI is responsive and intuitive.

---
