# Team 6 - FPGA Visualization Platform

A web-based platform for visualizing FPGA (Field-Programmable Gate Array) applications, designed for educational purposes. This application provides interfaces for both students and teachers.

## Features

### Student Interface
- 2D visualization of BELs (Basic Element Logics) inside the FPGA
- View routes used by each signal
- Navigate (zoom, move) inside the 2D view
- Run simulations at different speeds (x1, x2, x4, x8)
- Step-by-step execution
- Pause and resume functionality
- Authentication system with student role

### Teacher Interface
- Upload Verilog applications
- Provide testbenches
- Generate visualization data
- Manage preloaded applications
- Authentication system with teacher role

## Getting Started

### Prerequisites
- Node.js (v14 or later)
- npm (v6 or later)

This project was generated with [Angular CLI](https://github.com/angular/angular-cli).

### Installation

1. Clone the repository
```bash
git clone https://github.com/your-username/2024-2025-project-4-web-fpga-team-6.git
```

2. Go to the project directory
```bash
cd FPGAWeb
```

3. Install dependencies
```bash
npm install
```

4. Start the development server
```bash
npm start
# or
ng serve
```

5. Access the interface  
   Open your browser and navigate to `http://localhost:4200`

## Usage

### Student Interface
1. From the home page, select "Student Interface"
2. Choose an example application from the sidebar
3. Use the control buttons to play, pause, step, or adjust the simulation speed
4. Navigate the FPGA visualization using mouse controls

### Teacher Interface
1. From the home page, select "Teacher Interface"
2. Upload new Verilog applications and testbenches using the form
3. Manage existing applications

## Technologies Used

- Angular
- TypeScript
- Angular Router
- Tailwind CSS

## Project Structure
- `FPGAWeb/`: Angular application
  - `src/`: Source code
    - `app/`: Angular components and modules
    - `assets/`: Static assets like images
    - `parser.ts`: Utility for parsing Verilog files
  - `public/`: Public assets
    - `verilog_post_synthesis_examples/`: Example Verilog files
    - `schematics/`: Generated JSON schematics

## Team 6 involves few coworkers, handling different roles:

| Role              | Name            | Picture                                                                                                              |
| ----------------- | --------------- | -------------------------------------------------------------------------------------------------------------------- |
| Project Manager   | Manech LAGUENS  | [<img src="https://ca.slack-edge.com/T019N8PRR7W-U05SJQY4YNT-b9fc406d8169-50">](https://github.com/Manech-Laguens)   |
| Program Manager   | Elon DELLILE    | [<img src="https://ca.slack-edge.com/T019N8PRR7W-U05SJR05FL7-464fe5ab420c-50">](https://github.com/HiNett)           |
| Technical Leader  | Axel DAVID      | [<img src="https://ca.slack-edge.com/T019N8PRR7W-U07D74Y2FN3-c49f70489f3b-50">](https://github.com/Fus1onAxel)       |
| Software Engineer | Thomas PLANCHAD | [<img src="https://ca.slack-edge.com/T019N8PRR7W-U02EY24GTT8-d1e0d5d26fcb-50">](https://github.com/thomas-planchard) |
| Software Engineer | Evan UHRING     | [<img src="https://ca.slack-edge.com/T019N8PRR7W-U05SZB90074-d12b12264117-50">](https://github.com/Evan-UHRING)      |
| Quality Assurance | Rémy Charles    | [<img src="https://ca.slack-edge.com/T019N8PRR7W-U0338M4B32R-c0f60ab9ca33-50">](https://github.com/RemyCHARLES)      |
| Technical Writer  | Benoît de Keyn  | [<img src="https://ca.slack-edge.com/T019N8PRR7W-U05SZ8EGZLK-4aa6205b5986-50">](https://github.com/benoitdekeyn)     |

[Here](https://github.com/algosup/2024-2025-project-4-web-fpga-team-6/graphs/contributors) are their contributions to the project!

## License

This project is licensed under the MIT License - see the LICENSE file for details.

