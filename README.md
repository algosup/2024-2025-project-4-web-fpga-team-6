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

6. Parse post-synthesis data
```bash
npm run parse
```
A JSON file is generated from the .sdf and the .v file in the `public/` directory.

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

## License

This project is licensed under the MIT License - see the LICENSE file for details.

