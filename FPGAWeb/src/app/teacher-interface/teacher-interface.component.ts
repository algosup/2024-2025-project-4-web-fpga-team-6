import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FileProcessingService } from '../services/file-processing.service';
import { PrettyJsonPipe } from '../pipes/pretty-json.pipe';
import { DesignService, Design } from '../services/design.service';

@Component({
  selector: 'app-teacher-interface',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule, PrettyJsonPipe],
  templateUrl: './teacher-interface.component.html',
  styleUrl: './teacher-interface.component.css'
})

export class TeacherInterfaceComponent implements OnInit {
  title = 'Teacher Interface';
  
  // Mock data for existing applications
  designs: Design[] = [];

  // Variables for form
  newDesignName = '';
  newDesignDescription = '';
  selectedVerilogFile: File | null = null;
  selectedSdfFile: File | null = null;
  isProcessing = false;

  // Add new properties
  parsedContent: string | null = null;
  generatedFilename: string | null = null;

  constructor(
    private fileProcessingService: FileProcessingService,
    private designService: DesignService
  ) {}

  ngOnInit() {
    // Subscribe to designs updates
    this.designService.getDesigns().subscribe(designs => {
      this.designs = designs;
    });
  }

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

  async uploadDesign(): Promise<void> {
    if (!this.selectedVerilogFile || !this.selectedSdfFile) {
      alert('Please select both Verilog and SDF files');
      return;
    }

    // If no name is provided, use the Verilog file name without extension
    if (!this.newDesignName.trim()) {
      this.newDesignName = this.selectedVerilogFile.name.replace(/\.v$/, '');
    }

    this.isProcessing = true;
    try {
      // Process the files and generate JSON
      const jsonContent = await this.fileProcessingService.processFiles(
        this.selectedVerilogFile,
        this.selectedSdfFile
      );

      // Generate filename based on application name
      this.generatedFilename = `${this.newDesignName.toLowerCase().replace(/\s+/g, '_')}_schematics.json`;
      
      // Store parsed content instead of downloading directly
      this.parsedContent = jsonContent;

    } catch (error) {
      console.error('Error processing files:', error);
      alert('Error processing files. Please try again or contact support if the issue persists.');
    } finally {
      this.isProcessing = false;
    }
  }

  saveDesign(): void {
    if (this.parsedContent && this.generatedFilename) {
      const newDesign: Design = {
        id: `design_${Date.now()}`,
        name: this.newDesignName,
        description: this.newDesignDescription,
        files: [
          this.selectedVerilogFile!.name,
          this.selectedSdfFile!.name,
          this.generatedFilename
        ],
        jsonContent: this.parsedContent
      };

      this.designService.addDesign(newDesign);
      this.resetForm();
    }
  }

  downloadJson(): void {
    if (this.parsedContent && this.generatedFilename) {
      this.fileProcessingService.downloadJson(this.parsedContent, this.generatedFilename);
    }
  }

  resetForm(): void {
    this.newDesignName = '';
    this.newDesignDescription = '';
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

  deleteDesign(id: string): void {
    this.designService.deleteDesign(id);
  }
}
