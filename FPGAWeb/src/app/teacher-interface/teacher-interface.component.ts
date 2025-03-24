import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FileProcessingService } from '../services/file-processing.service';
import { PrettyJsonPipe } from '../pipes/pretty-json.pipe';


@Component({
  selector: 'app-teacher-interface',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule, PrettyJsonPipe],
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
  selectedSdfFile: File | null = null;
  isProcessing = false;

  // Add new properties
  parsedContent: string | null = null;
  generatedFilename: string | null = null;

  constructor(private fileProcessingService: FileProcessingService) {}

  // Methods for file handling
  onVerilogFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedVerilogFile = input.files[0];
    }
  }

  onSdfFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedSdfFile = input.files[0];
    }
  }

  async uploadApplication(): Promise<void> {
    if (!this.selectedVerilogFile || !this.selectedSdfFile) {
      alert('Please select both Verilog and SDF files');
      return;
    }

    // If no name is provided, use the Verilog file name without extension
    if (!this.newApplicationName.trim()) {
      this.newApplicationName = this.selectedVerilogFile.name.replace(/\.v$/, '');
    }

    this.isProcessing = true;
    try {
      // Process the files and generate JSON
      const jsonContent = await this.fileProcessingService.processFiles(
        this.selectedVerilogFile,
        this.selectedSdfFile
      );

      // Generate filename based on application name
      this.generatedFilename = `${this.newApplicationName.toLowerCase().replace(/\s+/g, '_')}_schematics.json`;
      
      // Store parsed content instead of downloading directly
      this.parsedContent = jsonContent;

    } catch (error) {
      console.error('Error processing files:', error);
      alert('Error processing files. Please try again or contact support if the issue persists.');
    } finally {
      this.isProcessing = false;
    }
  }

  saveApplication(): void {
    if (this.parsedContent && this.generatedFilename) {
      // Add to applications list
      this.applications.push({
        id: `app_${Date.now()}`,
        name: this.newApplicationName,
        description: this.newApplicationDescription,
        files: [
          this.selectedVerilogFile!.name,
          this.selectedSdfFile!.name,
          this.generatedFilename
        ]
      });

      // Reset form
      this.resetForm();
    }
  }

  downloadJson(): void {
    if (this.parsedContent && this.generatedFilename) {
      this.fileProcessingService.downloadJson(this.parsedContent, this.generatedFilename);
    }
  }

  resetForm(): void {
    this.newApplicationName = '';
    this.newApplicationDescription = '';
    this.selectedVerilogFile = null;
    this.selectedSdfFile = null;

    // Reset file input elements
    const verilogInput = document.getElementById('verilogFile') as HTMLInputElement;
    const sdfInput = document.getElementById('sdfFile') as HTMLInputElement;
    if (verilogInput) verilogInput.value = '';
    if (sdfInput) sdfInput.value = '';

    this.parsedContent = null;
    this.generatedFilename = null;
  }

  deleteApplication(id: string): void {
    // In a real application, this would delete the application
    console.log('Deleting application:', id);
    // Mock successful deletion
    this.applications = this.applications.filter(app => app.id !== id);
  }
}
