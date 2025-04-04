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
  - [2. Naming Conventions](#2-naming-conventions)
    - [2.1 Variable and Function Naming](#21-variable-and-function-naming)
    - [2.2 Component and Service Naming](#22-component-and-service-naming)
  - [3. Code Formatting](#3-code-formatting)
    - [3.1 Indentation](#31-indentation)
    - [3.2 Line Length](#32-line-length)
    - [3.3 Braces and Parentheses](#33-braces-and-parentheses)
    - [3.4 Whitespace](#34-whitespace)
  - [4. Commenting and Documentation](#4-commenting-and-documentation)
    - [4.1 Inline Comments](#41-inline-comments)
    - [4.2 Function Documentation](#42-function-documentation)
    - [4.3 File-Level Documentation](#43-file-level-documentation)
  - [5. Version Control](#5-version-control)
    - [5.1 Commit Messages](#51-commit-messages)
    - [5.2 Branching Strategy](#52-branching-strategy)
  - [6. Error Handling](#6-error-handling)
  - [7. Testing Conventions](#7-testing-conventions)

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

## 2. Naming Conventions

### 2.1 Variable and Function Naming
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

### 2.2 Component and Service Naming
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

## 3. Code Formatting

### 3.1 Indentation
- Use **2 spaces** for indentation in TypeScript, HTML, and CSS files.
- Never use tabs; always use spaces to ensure consistency across different editors and environments.

### 3.2 Line Length
- **Limit lines to 80 characters**. If a line exceeds this limit, break it into multiple lines with proper indentation.
- This helps maintain readability, especially when viewing the code in small editors or side-by-side views.

**Example:**
```typescript
const longString = 'This is a long string that should be broken down into ' +
  'multiple lines to ensure that it doesn’t exceed the 80 character limit';
```

### 3.3 Braces and Parentheses
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

### 3.4 Whitespace
- Always leave a single space after keywords like `if`, `else`, `for`, `while`, etc.
- Ensure a blank line between functions or methods for better readability.
- No extra spaces before function arguments or return statements.

---

## 4. Commenting and Documentation

### 4.1 Inline Comments
- Use comments to clarify complex or non-obvious parts of the code.
- Start comments with `//` and place them above the line of code or beside it if it doesn’t clutter the line.

**Example:**
```typescript
// Calculate the total price by adding up all the item prices
let totalPrice = items.reduce((sum, item) => sum + item.price, 0);
```

### 4.2 Function Documentation
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

### 4.3 File-Level Documentation
- Each major file should include a file-level comment that briefly describes the file’s purpose and any important dependencies or considerations.

**Example:**
```typescript
// simulation.component.ts
// This component handles the FPGA simulation visualization and controls.
```

---

## 5. Version Control

### 5.1 Commit Messages
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

### 5.2 Branching Strategy
- **Master branch**: The stable production version of the application. All releases are merged into this branch.
- **Develop branch**: The main development branch where features are merged.
- **Feature branches**: Create a new branch for each feature or bug fix using the format `feature/<feature-name>` or `bugfix/<bug-name>`.
- **Pull Requests (PRs)**: All changes should be merged into the `develop` branch through a pull request after proper review.

---

## 6. Error Handling

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

## 7. Testing Conventions

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