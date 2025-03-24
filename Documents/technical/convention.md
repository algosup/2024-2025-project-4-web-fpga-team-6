# Code Conventions for FPGA Simulator Web Interface

This document outlines the code conventions and guidelines followed in the development of the FPGA Simulator Web Interface project. Adhering to these conventions ensures that the codebase remains consistent, maintainable, and easy to understand for all contributors.

## Table of Contents
<details>

- [Code Conventions for FPGA Simulator Web Interface](#code-conventions-for-fpga-simulator-web-interface)
  - [Table of Contents](#table-of-contents)
  - [1. General Guidelines](#1-general-guidelines)
    - [1.1 Consistency](#11-consistency)
    - [1.2 Keep It Simple](#12-keep-it-simple)
    - [1.3 Avoid Code Duplication](#13-avoid-code-duplication)
    - [1.4 Use Linting Tools](#14-use-linting-tools)
  - [2. File Structure](#2-file-structure)
  - [3. Naming Conventions](#3-naming-conventions)
    - [3.1 Variable and Function Naming](#31-variable-and-function-naming)
    - [3.2 Component and Service Naming](#32-component-and-service-naming)
  - [4. Code Formatting](#4-code-formatting)
    - [4.1 Indentation](#41-indentation)
    - [4.2 Line Length](#42-line-length)
    - [4.3 Braces and Parentheses](#43-braces-and-parentheses)
    - [4.4 Whitespace](#44-whitespace)
  - [5. Commenting and Documentation](#5-commenting-and-documentation)
    - [5.1 Inline Comments](#51-inline-comments)
    - [5.2 Function Documentation](#52-function-documentation)
    - [5.3 File-Level Documentation](#53-file-level-documentation)
  - [6. Version Control](#6-version-control)
    - [6.1 Commit Messages](#61-commit-messages)
    - [6.2 Branching Strategy](#62-branching-strategy)
  - [7. Error Handling](#7-error-handling)
  - [8. Testing Conventions](#8-testing-conventions)

</details>

---

## 1. General Guidelines

### 1.1 Consistency
All code should follow consistent conventions to ensure readability and maintainability. This includes naming conventions, indentation, and the usage of programming patterns. Each developer is expected to follow these guidelines throughout the project.

### 1.2 Keep It Simple
Code should be as simple and readable as possible. Complex solutions should be avoided unless absolutely necessary. If a more complex solution is required, it should be well-documented and justified.

### 1.3 Avoid Code Duplication
Duplicate code should be avoided. Reusable functions and components should be created instead of copying and pasting similar code across different files or modules.

### 1.4 Use Linting Tools
We use ESLint for JavaScript/TypeScript and TSLint for Angular TypeScript code to enforce code style and best practices. Make sure to run linting tools before committing any code to catch potential issues early.

---

## 2. File Structure

The file structure should be clean and organized. The following guidelines should be followed:

- **src/app**: Contains all Angular components, services, and modules.
  - **components**: Components are placed in the `components` folder, organized by feature.
  - **services**: Angular services go under the `services` folder.
  - **models**: All TypeScript models (interfaces, types) are stored here.
  - **assets**: Static assets (images, styles, etc.) should be placed in this directory.

Example directory structure:
```
/src
  /app
    /components
      /simulation
        simulation.component.ts
        simulation.component.html
        simulation.component.css
    /services
      simulation.service.ts
    /models
      simulation.model.ts
    /assets
      /images
        logo.png
```

---

## 3. Naming Conventions

### 3.1 Variable and Function Naming
- Use **camelCase** for variables, functions, and method names.
- Function names should be descriptive and use action verbs to indicate what the function does.
- For constants or configuration values, use **UPPER_SNAKE_CASE**.

**Examples:**
```typescript
let userCount = 5;
function calculateTotalPrice(items: Item[]): number {
    // Function code
}
const MAX_RETRIES = 3;
```

### 3.2 Component and Service Naming
- **Components** should use **PascalCase** and end with `Component`. The component file should be named accordingly.
- **Services** should also use **PascalCase**, but should end with `Service`.

**Examples:**
```typescript
@Component({
  selector: 'app-simulation',
  templateUrl: './simulation.component.html',
  styleUrls: ['./simulation.component.css']
})
export class SimulationComponent { }

@Injectable({
  providedIn: 'root'
})
export class SimulationService { }
```

---

## 4. Code Formatting

### 4.1 Indentation
- Use **2 spaces** for indentation in TypeScript, HTML, and CSS files.
- Never use tabs; always use spaces to ensure consistency across different editors and environments.

### 4.2 Line Length
- **Limit lines to 80 characters**. If a line exceeds this limit, break it into multiple lines with proper indentation.
- This helps maintain readability, especially when viewing the code in small editors or side-by-side views.

**Example:**
```typescript
const longString = 'This is a long string that should be broken down into ' +
  'multiple lines to ensure that it doesn’t exceed the 80 character limit';
```

### 4.3 Braces and Parentheses
- **Braces**: Always use braces `{}` for all control structures (`if`, `for`, etc.) even if they are optional. This avoids errors and improves readability.
- **Parentheses**: Add space after `if`, `for`, `while`, `switch`, and similar control structures before opening parentheses.

**Examples:**
```typescript
if (condition) {
  doSomething();
}
for (let i = 0; i < 10; i++) {
  console.log(i);
}
```

### 4.4 Whitespace
- Always leave a single space after keywords like `if`, `else`, `for`, `while`, etc.
- Ensure a blank line between functions or methods for better readability.
- No extra spaces before function arguments or return statements.

---

## 5. Commenting and Documentation

### 5.1 Inline Comments
- Use comments to clarify complex or non-obvious parts of the code.
- Start comments with `//` and place them above the line of code or beside it if it doesn’t clutter the line.

**Example:**
```typescript
// Calculate the total price by adding up all the item prices
let totalPrice = items.reduce((sum, item) => sum + item.price, 0);
```

### 5.2 Function Documentation
- Each function should have a JSDoc comment block before it, explaining the function’s purpose, parameters, and return value.
- Use `@param` to describe each parameter and `@returns` to describe the return value.

**Example:**
```typescript
/**
 * Calculates the total price of all items in the cart.
 * @param items - An array of Item objects.
 * @returns The total price of the items.
 */
function calculateTotalPrice(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}
```

### 5.3 File-Level Documentation
- Each major file should include a file-level comment that briefly describes the file’s purpose and any important dependencies or considerations.

**Example:**
```typescript
// simulation.component.ts
// This component handles the FPGA simulation visualization and controls.
```

---

## 6. Version Control

### 6.1 Commit Messages
- **Commit messages** should be clear and concise, describing the change being made. The message should follow the format:
  - **Present tense** (e.g., "Add new simulation controls", "Fix bug in visualization logic").
  - **Short and descriptive** (under 72 characters).
  - Include a detailed description in the body if necessary, especially for complex changes.

**Example:**
```
Add error handling for invalid Verilog files

Implemented validation for Verilog syntax errors and added user-friendly 
error messages. The simulation won't start if a file is invalid.
```

### 6.2 Branching Strategy
- **Master branch**: The stable production version of the application. All releases are merged into this branch.
- **Develop branch**: The main development branch where features are merged.
- **Feature branches**: Create a new branch for each feature or bug fix using the format `feature/<feature-name>` or `bugfix/<bug-name>`.
- **Pull Requests (PRs)**: All changes should be merged into the `develop` branch through a pull request after proper review.

---

## 7. Error Handling

- Use **try-catch** blocks for handling errors in asynchronous operations.
- Ensure that error messages are clear and provide enough context for debugging.
- Use **logging** to track errors in production environments (e.g., `console.log`, `console.error`).

**Example:**
```typescript
try {
  const result = await simulationService.startSimulation();
} catch (error) {
  console.error('Simulation failed', error);
  throw new Error('Simulation could not be started');
}
```

---

## 8. Testing Conventions

- **Unit Tests**: Each feature or service should be accompanied by unit tests. Use frameworks such as **Jasmine** or **Mocha** for writing tests.
- **Test Coverage**: Aim for a minimum of 80% test coverage across the codebase to ensure robustness.
- **Test Naming**: Test names should clearly describe the behavior being tested using the format `should <expected behavior>`.

**Example:**
```typescript
describe('SimulationService', () => {
  it('should start the simulation successfully', async () => {
    const result = await simulationService.startSimulation();
    expect(result).toBeTruthy();
  });
});
```