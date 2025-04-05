# Management Artifacts

This document is used to centralize all the management artifacts as listed below:

- [Management Artifacts](#management-artifacts)
    - [RACI Matrix](#raci-matrix)
    - [Risks \& Mitigations](#risks--mitigations)
    - [Key Performance Indicators](#key-performance-indicators)
    - [Weekly Reports](#weekly-reports)


## RACI Matrix

| Name                     | Project Manager | Program Manager | Technical Leader | Software engineer | Quality assurance | Technical Writer | Client | Stakeholders |
| ------------------------ | --------------- | --------------- | ---------------- | ----------------- | ----------------- | ---------------- | ------ | ------------ |
| Call for tender          | I               | I               | I                | I                 | I                 | I                | R      | C            |
| Project charter          | R               | A               | C                | C                 | C                 | C                | I      | I            |
| Schedule creation        | R               | C               | C                | C                 | C                 | C                | /      | I            |
| Functional specification | A               | R               | C                |                   | C                 | /                | C      | I            |
| Technical specification  | A               | C               | R/A              | I                 | C                 | /                | C      | I            |
| Coding process           | A               | I               | R                | R/A               | C                 | /                | /      | /            |
| Testing planification    | A               | /               | C                | C                 | R/A               | I                | /      | /            |
| Usage instructions       | A               | C               | C                | C                 | I                 | R/A              | I      | I            |


| Letter | Full name   | Description                                     |
| ------ | ----------- | ----------------------------------------------- |
| R      | Responsible | Executes the task or activity                   |
| A      | Accountant  | Ultimately answerable for the task's completion |
| C      | Consulted   | Provides input and/or advice on the task        |
| I      | Informed    | Kept updated on progress and decisions          |
| /      | /           | No interaction with this role for this task     |


## Risks & Mitigations

| Risk                                            | Consequence                                                             | Impact | Mitigation                                                                                                            |
| ----------------------------------------------- | ----------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------- |
| A team member is absent                         | Project tasks get delayed, potentially affecting deadlines              | High   | Distribute tasks so work can be taken over if someone is unavailable. Maintain clear documentation for easy handover. |
| Incorrect or incomplete Verilog/SDF files       | The simulation may produce incorrect results or fail to run             | High   | Implement a validation step to check the integrity and format of uploaded files before processing.                    |
| Misinterpretation of client requirements        | Development may go in the wrong direction, leading to rework and delays | Medium | Maintain regular check-ins with the client to clarify expectations and confirm implementation details.                |
| Integration issues between frontend and backend | Features may not function properly, leading to broken workflows         | High   | Plan early integration tests, use API contracts, and conduct frequent debugging sessions.                             |
| Cross-browser compatibility issues              | The interface may not work correctly on all browsers                    | Medium | Test on multiple browsers early and use standardized web technologies.                                                |
| Time constraints due to fixed deadlines         | The project may not be completed as expected                            | High   | Focus on an MVP-first approach, prioritize essential features, and iterate gradually.                                 |

## Key Performance Indicators

### KPIs Definition

This section tracks the progress of essential categories such as:

#### Document

- Project charter
- Functional specifications
- Technical specifications
- Test plan
- User manual

#### Development

- Frontend UI Implementation
- Backend & File Handling
- Signal Propagation Simulation

#### Human Resources

- Overtime (in hours)



[Link to the project's KPIs](https://docs.google.com/spreadsheets/d/1lKQXDnr6URSxp91wiu2Fs49hylzF8wXtzzzS_iBUTE4/edit?usp=sharing)


## Weekly reports


Each week will be resumed in weekly documents listed [here](https://github.com/algosup/2024-2025-project-4-web-fpga-team-6/blob/Management/Management/Weekly_Reports/cumulative.md), or by following a precise week using the following links:

- [Weekly Report 1](https://github.com/algosup/2024-2025-project-4-web-fpga-team-6/blob/Management/Management/Weekly_Reports/weeklyReport1.md)

- [Weekly Report 2](https://github.com/algosup/2024-2025-project-4-web-fpga-team-6/blob/Management/Management/Weekly_Reports/weeklyReport2.md)

- [Weekly Report 3](https://github.com/algosup/2024-2025-project-4-web-fpga-team-6/blob/Management/Management/Weekly_Reports/weeklyReport3.md)

- [Weekly Report 4](https://github.com/algosup/2024-2025-project-4-web-fpga-team-6/blob/Management/Management/Weekly_Reports/weeklyReport4.md)

- [Weekly Report 5](https://github.com/algosup/2024-2025-project-4-web-fpga-team-6/blob/Management/Management/Weekly_Reports/weeklyReport5.md)

- [Weekly Report 6](https://github.com/algosup/2024-2025-project-4-web-fpga-team-6/blob/Management/Management/Weekly_Reports/weeklyReport6.md)


