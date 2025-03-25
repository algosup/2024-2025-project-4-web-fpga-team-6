# Technical Specification: FPGA Simulator Web Interface

This document provides a detailed technical specification for the FPGA Simulator Web Interface, an educational platform designed to help users simulate and analyze digital circuits within an FPGA environment. The system combines modern web technologies with robust backend processing and simulation tools to deliver a comprehensive learning experience.

## Table of Contents
<details>

- [Technical Specification: FPGA Simulator Web Interface](#technical-specification-fpga-simulator-web-interface)
  - [Table of Contents](#table-of-contents)
  - [Document Tracking and Version (Revision History)](#document-tracking-and-version-revision-history)
  - [Points of Contact](#points-of-contact)
  - [Assumptions and Constraints](#assumptions-and-constraints)
    - [Assumptions](#assumptions)
    - [Constraints](#constraints)
  - [Risk Assessment](#risk-assessment)
  - [1. Introduction](#1-introduction)
    - [1.1 Purpose](#11-purpose)
    - [1.2 Scope](#12-scope)
    - [1.3 Target Users](#13-target-users)
      - [Students](#students)
      - [Teachers](#teachers)
  - [2. System Overview](#2-system-overview)
    - [2.1 Architectural Overview](#21-architectural-overview)
    - [2.2 Core Components](#22-core-components)
      - [Frontend (Web Interface)](#frontend-web-interface)
      - [Backend](#backend)
      - [External Tools](#external-tools)
  - [3. Functional Specifications](#3-functional-specifications)
    - [3.1 Student Interface](#31-student-interface)
      - [3.1.1 Interactive 2D Visualization](#311-interactive-2d-visualization)
      - [3.1.2 Simulation Controls](#312-simulation-controls)
    - [3.2 Teacher Interface](#32-teacher-interface)
      - [3.2.1 Application Management](#321-application-management)
      - [3.2.2 Automated Backend Processing](#322-automated-backend-processing)
  - [4. Frontend Design and Implementation](#4-frontend-design-and-implementation)
    - [4.1 User Interface Components](#41-user-interface-components)
    - [4.2 Data Flow in the Frontend](#42-data-flow-in-the-frontend)
  - [5. Backend Architecture and Functionality](#5-backend-architecture-and-functionality)
    - [5.1 API Design and Endpoints](#51-api-design-and-endpoints)
    - [5.2 Data Storage and Management](#52-data-storage-and-management)
    - [5.3 Simulation Engine and Processing](#53-simulation-engine-and-processing)
  - [6. Security Considerations](#6-security-considerations)
  - [7. Performance and Scalability](#7-performance-and-scalability)
  - [8. Deployment and Hosting Strategy](#8-deployment-and-hosting-strategy)
  - [9. Testing and Debugging](#9-testing-and-debugging)
  - [10. Future Enhancements](#10-future-enhancements)
  - [11. Glossary](#11-glossary)
    - [Conclusion](#conclusion)
</details>

---

## Document Tracking and Version (Revision History)
| Version | Author       | Date       |
|---------|--------------|------------|
| 1.4.3   | Axel DAVID   | 2025-03-25 |

---

| Role                | Name            | Signature | Date       |
|---------------------|-----------------|-----------|------------|
| Project Manager     | Manech LAGUENS | ✅         | 2025-03-25 |
| Program Manager     | Elon DELLILE   | ✅         | 2025-03-25 |
| Technical Leader    | Axel DAVID     | ✅         | 2025-03-25 |
| Software Engineer   | Thomas PLANCHAD| ✅         | 2025-03-25 |
| Software Engineer   | Evan UHRING    | ✅         | 2025-03-25 |
| Quality Assurance   | Rémy Charles   | ✅         | 2025-03-25 |
| Technical Writer    | Benoît de Keyn | ✅         | 2025-03-25 |

---

## Points of Contact
| Role | Name | Picture and github link |
| --- | --- | --- |
| Project Manager   | Manech LAGUENS  | [<img src="https://ca.slack-edge.com/T019N8PRR7W-U05SJQY4YNT-b9fc406d8169-50">](https://github.com/Manech-Laguens)   |
| Program Manager   | Elon DELLILE    | [<img src="https://ca.slack-edge.com/T019N8PRR7W-U05SJR05FL7-464fe5ab420c-50">](https://github.com/HiNett)           |
| Technical Leader  | Axel DAVID      | [<img src="https://ca.slack-edge.com/T019N8PRR7W-U07D74Y2FN3-c49f70489f3b-50">](https://github.com/Fus1onAxel)       |
| Software Engineer | Thomas PLANCHAD | [<img src="https://ca.slack-edge.com/T019N8PRR7W-U02EY24GTT8-d1e0d5d26fcb-50">](https://github.com/thomas-planchard) |
| Software Engineer | Evan UHRING     | [<img src="https://ca.slack-edge.com/T019N8PRR7W-U05SZB90074-d12b12264117-50">](https://github.com/Evan-UHRING)      |
| Quality Assurance | Rémy Charles    | [<img src="https://ca.slack-edge.com/T019N8PRR7W-U0338M4B32R-c0f60ab9ca33-50">](https://github.com/RemyCHARLES)      |
| Technical Writer  | Benoît de Keyn  | [<img src="https://ca.slack-edge.com/T019N8PRR7W-U05SZ8EGZLK-4aa6205b5986-50">](https://github.com/benoitdekeyn)     |

---

## Assumptions and Constraints

### Assumptions
- Users have basic knowledge of Verilog and FPGA concepts.
- The backend tools (e.g., Yosys, ModelSim) are stable and compatible with the system.
- The platform will primarily be used in educational environments.

### Constraints
- The system is limited to simulation and visualization; it does not replace physical FPGA hardware.
- The platform must support scalability for concurrent users but is not designed for industrial-scale deployment.
- The project must adhere to the timeline and resource limitations defined by the team.

---

## Risk Assessment

| Risk                     | Mitigation Strategy                     |
|--------------------------|------------------------------------------|
| Security vulnerabilities | Implement JWT-based authentication and input validation. |
| Performance bottlenecks  | Optimize backend processing pipelines and use caching mechanisms. |
| Compatibility issues     | Conduct thorough testing across supported environments. |
| Limited resources         | Prioritize critical features and maintain regular communication with stakeholders. |

---

## 1. Introduction

### 1.1 Purpose
The FPGA Simulator Web Interface is envisioned as a state-of-the-art educational platform that brings FPGA simulation and visualization into the digital classroom. The primary purpose of this system is to enable both students and teachers to interact with and analyze FPGA circuits using a web-based interface. By leveraging Verilog for circuit design and a suite of simulation tools, the platform allows users to observe the dynamic behavior of digital circuits and understand how signal propagation occurs within an FPGA. This initiative aims to transform traditional learning methods into an interactive, practical experience, making complex concepts more accessible through visual and hands-on simulation.

### 1.2 Scope
The scope of this project encompasses several key functionalities:
- **Simulation and Visualization:** Users can upload Verilog-based designs, execute simulations, and view real-time signal propagation on an interactive 2D grid that represents the FPGA layout.
- **User Interaction:** The platform supports various simulation controls including starting, pausing, stepping through the simulation, and adjusting simulation speeds. This interactivity is central to the learning process.
- **File Management:** Teachers are provided with an interface to upload and manage Verilog files and testbenches, allowing them to curate educational content and assignments.
- **Backend Processing:** The system incorporates a robust backend that validates, parses, and processes Verilog and SDF files, transforming them into JSON schematic representations that can be used for visualization.
- **Server-Side Rendering:** Using Angular Universal, the application renders pages on the server to improve performance and search engine optimization (SEO).

The platform is designed for educational purposes and does not intend to replace physical FPGA hardware; rather, it serves as a simulation tool that enhances theoretical learning with practical insights.

### 1.3 Target Users

#### Students
Students are the primary beneficiaries of this platform. They will be able to:
- **Interact with FPGA simulations:** Students can run simulations of FPGA circuits, enabling them to visualize the behavior of digital components in a highly interactive manner.
- **Experiment with control settings:** By adjusting simulation speeds and stepping through execution, students can explore how changes affect signal propagation and circuit timing.
- **Gain practical insights:** The real-time visual feedback helps in reinforcing theoretical concepts learned in class, leading to a deeper understanding of digital design principles.

#### Teachers
Teachers play a critical role in utilizing this platform for educational purposes. Their capabilities include:
- **Uploading and Managing Content:** Teachers can upload Verilog applications and testbenches, making them available to students for simulation. This allows teachers to provide a curated set of learning materials.
- **Monitoring Student Progress:** Through the platform, teachers can track how students interact with simulations, offering insights into student performance and comprehension.
- **Creating Educational Assignments:** The teacher interface is designed to facilitate the creation and management of FPGA-based assignments, enhancing the overall learning experience.

---

## 2. System Overview

### 2.1 Architectural Overview
The FPGA Simulator Web Interface is built upon a modern client-server architecture that integrates both frontend and backend components seamlessly. The frontend is developed using Angular, making extensive use of standalone components and lazy loading to optimize performance. The backend is powered by Node.js and Express.js, handling API requests, file processing, and simulation execution.

Key architectural elements include:
- **Client-Side Rendering and SSR:** The use of Angular Universal allows for server-side rendering (SSR), providing fast initial page loads and improved SEO while still delivering a dynamic user experience.
- **API-Driven Communication:** The frontend and backend communicate over a well-defined RESTful API, ensuring that data such as simulation results and file metadata can be efficiently transferred between client and server.
- **Integration with Simulation Tools:** External tools such as Yosys for Verilog synthesis and ModelSim/Icarus Verilog for circuit simulation are integrated into the backend processing pipeline, providing accurate simulation results.

### 2.2 Core Components

#### Frontend (Web Interface)
- **Angular Application:** The entire user interface is built using Angular with standalone components for various sections, including home, FPGA visualization, and teacher interface components.
- **Routing and Navigation:** The application employs Angular's routing mechanism with lazy-loaded modules to ensure optimal performance. Routes are clearly defined to separate student and teacher functionalities.
- **Interactive Visualization:** A dedicated visualization panel renders the FPGA floorplan in 2D, dynamically updating to reflect real-time simulation data. Users can interact with the visualization through zooming and panning functionalities.

#### Backend
- **Node.js and Express.js Server:** The backend is developed using Express.js and provides RESTful API endpoints to support simulation control, file uploads, and data retrieval.
- **SSR and API Integration:** Separate entry points (`main.ts` for client-side and `main.server.ts` for server-side) ensure the Angular application is rendered efficiently. The server also handles API requests for simulation data and file management.
- **File Processing Engine:** A specialized parser (`parser.ts`) processes Verilog and SDF files. This script converts circuit descriptions and timing information into JSON schematics that the frontend can use for visualization.

#### External Tools
- **Yosys:** Utilized for synthesizing Verilog designs and optimizing logic circuits before simulation.
- **ModelSim/Icarus Verilog:** These tools run the actual simulation of the FPGA circuits, providing critical timing and behavioral data.
- **SDF Timing Analysis:** The parser extracts timing delays from SDF files to accurately depict signal propagation delays within the circuit.

---

## 3. Functional Specifications

### 3.1 Student Interface

#### 3.1.1 Interactive 2D Visualization
The simulation visualization panel is one of the most crucial components of the student interface. It provides:
- **A Graphical FPGA Floorplan:** The panel displays a 2D grid representing the FPGA's physical layout, highlighting Basic Elements (BELs) and the interconnections between them.
- **Real-Time Signal Updates:** As the simulation runs, active signals and propagating paths are dynamically highlighted, allowing students to visually track the behavior of their circuit.
- **Intuitive Navigation:** Features such as zoom and pan enable students to explore different sections of the FPGA layout in detail, improving the overall user experience and understanding.

#### 3.1.2 Simulation Controls
To facilitate an interactive learning environment, the simulation controls include:
- **Start, Pause, and Resume:** These buttons allow students to initiate the simulation, temporarily halt it, or resume after pausing, giving them complete control over the simulation timeline.
- **Step Execution:** For detailed analysis, students can advance the simulation one step at a time. This is particularly useful for debugging and understanding how specific changes affect circuit behavior.
- **Speed Adjustment:** The interface provides multiple speed settings (e.g., x1, x2, x4, x8) to let users observe the simulation at different paces, enabling both high-level overviews and detailed analysis.

### 3.2 Teacher Interface

#### 3.2.1 Application Management
The teacher interface is designed to support educators in managing simulation content effectively:
- **File Upload and Management:** Teachers can upload Verilog and testbench files using an intuitive form. The interface displays the name, description, and a list of associated files, allowing for easy management and categorization.
- **Metadata Handling:** Teachers can provide descriptive metadata for each application, which aids in organizing and retrieving simulation resources.
- **Deletion and Updates:** The interface allows teachers to delete outdated or incorrect files, ensuring that only valid and up-to-date simulation content is available for student use.

#### 3.2.2 Automated Backend Processing
To streamline the simulation process, the backend performs several automated tasks:
- **File Validation:** Uploaded Verilog files are automatically validated for syntax errors and structural integrity, reducing the chances of simulation failures.
- **Schematic Generation:** The system parses Verilog and SDF files to extract circuit details and timing information, converting them into JSON schematics that are used for visualization.
- **Seamless Integration:** This automated processing ensures that once files are uploaded, the necessary simulation data is immediately available to the frontend for display.

more information about functional Specification in the [functional specification](../Functional_Specifications/functionalSpecifications.md).

---

## 4. Frontend Design and Implementation

### 4.1 User Interface Components
The frontend of the FPGA Simulator Web Interface is composed of several key components:
- **Home Component:** Serves as the entry point of the application, providing a role selection screen (student or teacher) and introductory information about the platform.
- **FPGA Visualization Component:** This is the main interface for students. It includes an interactive grid that displays the FPGA layout and real-time signal propagation, as well as simulation control buttons.
- **Teacher Interface Component:** This component provides a comprehensive file management system for teachers. It includes forms for file uploads, lists of existing applications, and controls to manage simulation content.
- **Global Styling:** Global CSS styles, defined in `styles.css`, establish the visual identity of the application. The styles include a custom CNES color palette, typography settings, and button styles, ensuring a cohesive look and feel throughout the platform.

### 4.2 Data Flow in the Frontend
Data flow in the frontend is structured to maximize responsiveness and interactivity:
- **User Actions:** When a user interacts with the interface (e.g., clicking the play button or uploading a file), Angular captures these events and triggers corresponding service calls.
- **API Communication:** The Angular application communicates with the backend through HTTP requests. For instance, starting a simulation or uploading a file sends a request to a designated API endpoint.
- **Dynamic Updates:** The simulation results and file management updates are processed in real time, and the UI components are dynamically refreshed to reflect the latest data. This ensures that users always see up-to-date simulation statuses and file information.

---

## 5. Backend Architecture and Functionality

### 5.1 API Design and Endpoints
The backend exposes several RESTful API endpoints to facilitate interaction between the frontend and simulation engine:
| Endpoint                | Method | Description                                                  |
|-------------------------|--------|--------------------------------------------------------------|
| `/api/simulations`      | GET    | Retrieve a list of available FPGA simulations.             |
| `/api/simulate`         | POST   | Initiate a new simulation using the provided parameters.     |
| `/api/simulation/:id`   | GET    | Fetch the results of a specific simulation by its unique ID.  |
| `/api/upload`           | POST   | Upload Verilog and testbench files for simulation processing.|
| `/api/files`            | GET    | Retrieve a list of uploaded files along with their metadata. |

These endpoints ensure that the frontend can efficiently request simulation data, manage file uploads, and retrieve processed results.

### 5.2 Data Storage and Management
- **Database Layer:** The system uses a database (such as MongoDB or PostgreSQL) to store metadata related to simulations, user information, and simulation results. This supports quick retrieval and management of simulation records.
- **File Storage:** Uploaded Verilog files and generated JSON schematics are stored in a dedicated file storage system. This could be on a local server or cloud storage such as AWS S3, ensuring that files are securely maintained and easily accessible.

### 5.3 Simulation Engine and Processing
The simulation engine is a critical component that converts uploaded Verilog designs into actionable simulation data:
- **Verilog Parsing:** A specialized parser (`parser.ts`) reads Verilog and SDF files, extracting key information such as module definitions, port assignments, cell connections, and timing delays.
- **Schematic Generation:** The parser transforms the extracted data into a JSON schematic format that can be rendered by the frontend visualization component.
- **Integration with Simulation Tools:** External tools like Yosys, ModelSim, or Icarus Verilog are integrated into the backend process to synthesize and simulate the Verilog designs. This ensures that the simulation results are accurate and reflective of real-world FPGA behavior.

---

## 6. Security Considerations
Security is a paramount concern in the design and implementation of the FPGA Simulator Web Interface:
- **Authentication:** The backend employs JWT-based authentication to secure API endpoints and ensure that only authorized users can access simulation data.
- **Role-Based Access Control:** Different permissions are granted based on user roles (students vs. teachers), preventing unauthorized actions such as file uploads or deletion by non-admin users.
- **Input Validation:** All API endpoints rigorously validate input data, especially file uploads, to prevent security vulnerabilities such as code injection or file tampering.
- **Data Encryption:** Sensitive data, including authentication tokens and user credentials, are encrypted both in transit and at rest to maintain confidentiality and integrity.

---

## 7. Performance and Scalability
The platform is engineered with performance and scalability in mind:
- **Efficient Caching:** Static assets are served with caching policies (up to 1 year) to reduce load times and improve user experience.
- **Real-Time Communication:** The use of WebSockets or similar technologies is considered to provide real-time simulation updates and notifications.
- **Cloud Deployment:** The architecture supports deployment on scalable cloud platforms such as AWS or Heroku, ensuring that the system can handle high volumes of concurrent users without performance degradation.
- **Optimized Backend Processing:** The simulation engine and file parsing routines are optimized to handle complex Verilog designs efficiently, enabling rapid processing even under heavy load.

---

## 8. Deployment and Hosting Strategy
The deployment strategy is designed to ensure high availability and reliability:
- **Frontend Hosting:** The Angular application is hosted on platforms like AWS S3, Firebase Hosting, or similar services that provide global distribution and fast load times.
- **Backend Hosting:** The Node.js backend is deployed on cloud platforms (such as AWS EC2 or Heroku) that support scaling and robust API performance. Server-side rendering (SSR) is implemented using Angular Universal to improve initial load performance and SEO.
- **Continuous Deployment:** Integration with CI/CD pipelines allows for automated testing and deployment, ensuring that updates can be rolled out seamlessly without disrupting the user experience.
- **Static File Delivery:** The build process generates both browser and server bundles. The browser bundle is served as static assets from the designated distribution folder, ensuring efficient content delivery.

---

## 9. Testing and Debugging
A comprehensive testing and debugging strategy is in place to ensure system reliability:
- **Unit Testing:** Angular components, services, and backend API endpoints are covered by unit tests (e.g., using Jasmine and Karma for Angular, and Mocha/Chai for Node.js).
- **Integration Testing:** End-to-end testing is performed to validate the complete flow from user action on the frontend to simulation processing on the backend.
- **SSR and Routing Tests:** Special attention is given to ensure that server-side rendering and lazy loading of routes function correctly across different environments.
- **Logging and Monitoring:** Both the frontend and backend incorporate logging mechanisms to capture errors and performance metrics, enabling rapid debugging and continuous improvement.

more information about tests in the [test plan](../Test_Plan/testPlan.md).

---

## 10. Future Enhancements
The following enhancements are planned to extend the capabilities of the FPGA Simulator Web Interface:
- **3D FPGA Visualization:** Expanding the visualization component from 2D to 3D, providing a more immersive and detailed representation of FPGA circuits.
- **Collaborative Simulation:** Enabling multi-user sessions where students can work together on simulations in real time.
- **Advanced Analytics:** Implementing detailed analytics to track simulation performance and user interactions, offering insights into learning outcomes and system efficiency.
- **Enhanced File Management:** Integrating more sophisticated file handling techniques, such as Angular’s ViewChild for managing file inputs, and supporting additional file formats for simulation.
- **Mobile Optimization:** Further refining the UI and interaction model to ensure a seamless experience on mobile devices and tablets.

---

## 11. Glossary
| Term            | Description                                                    |
|-----------------|----------------------------------------------------------------|
| **FPGA**        | Field-Programmable Gate Array, a reconfigurable hardware device.|
| **Verilog**     | A hardware description language used for designing FPGA circuits.|
| **SDF**         | Standard Delay Format, a file format for specifying timing information.|
| **Yosys**       | An open-source framework for Verilog synthesis and optimization.|
| **ModelSim**    | A simulation tool for verifying Verilog designs.               |
| **Angular SSR** | Server-Side Rendering in Angular, which improves performance and SEO. |

---

### Conclusion
This Technical Specification provides an in-depth overview of the FPGA Simulator Web Interface project. It outlines the purpose, scope, architecture, and functional requirements of the system while detailing the technical implementation of both the frontend and backend components. By integrating modern web technologies with robust simulation and processing tools, the platform offers an interactive and educational environment for students and teachers alike. This comprehensive guide serves as a roadmap for the development, deployment, and future enhancement of the FPGA simulation platform.
