import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-teacher-interface',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule],
  templateUrl: './teacher-interface.component.html',
  styleUrl: './teacher-interface.component.css'
})
export class TeacherInterfaceComponent {
  title = 'Teacher Interface';
  
  // Mock data for existing applications
  applications = [
    { 
      id: 'example1', 
      name: 'Basic Counter', 
      description: 'A simple counter implementation',
      files: ['counter.v', 'counter_tb.v']
    },
    { 
      id: 'example2', 
      name: 'LED Blinker', 
      description: 'Control LEDs with different patterns',
      files: ['blinker.v', 'blinker_tb.v']
    },
    { 
      id: 'example3', 
      name: 'State Machine', 
      description: 'A simple FSM implementation',
      files: ['state_machine.v', 'state_machine_tb.v']
    },
    { 
      id: 'example4', 
      name: 'ALU Implementation', 
      description: 'Arithmetic Logic Unit with multiple operations',
      files: ['alu.v', 'alu_tb.v']
    }
  ];

  // Variables for form
  newApplicationName = '';
  newApplicationDescription = '';
  selectedVerilogFile: File | null = null;
  selectedTestbenchFile: File | null = null;

  // Methods for file handling
  onVerilogFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedVerilogFile = input.files[0];
    }
  }

  onTestbenchFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedTestbenchFile = input.files[0];
    }
  }

  uploadApplication(): void {
    // Validate form
    if (!this.newApplicationName || !this.selectedVerilogFile || !this.selectedTestbenchFile) {
      alert('Please fill all required fields');
      return;
    }

    // In a real application, this would upload the files and add the application
    console.log('Uploading application:', {
      name: this.newApplicationName,
      description: this.newApplicationDescription,
      verilogFile: this.selectedVerilogFile,
      testbenchFile: this.selectedTestbenchFile
    });

    // Mock successful upload
    alert('Application uploaded successfully!');
    this.resetForm();
  }

  resetForm(): void {
    this.newApplicationName = '';
    this.newApplicationDescription = '';
    this.selectedVerilogFile = null;
    this.selectedTestbenchFile = null;

    // Reset file input elements
    const verilogInput = document.getElementById('verilogFile') as HTMLInputElement;
    const testbenchInput = document.getElementById('testbenchFile') as HTMLInputElement;
    if (verilogInput) verilogInput.value = '';
    if (testbenchInput) testbenchInput.value = '';
  }

  deleteApplication(id: string): void {
    // In a real application, this would delete the application
    console.log('Deleting application:', id);
    // Mock successful deletion
    this.applications = this.applications.filter(app => app.id !== id);
  }
}
