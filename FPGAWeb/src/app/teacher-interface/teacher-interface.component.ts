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
  verilogContent: string | null = null;
  sdfContent: string | null = null;
  isDragging = false;

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
      // Read file contents
      const verilogContent = await this.selectedVerilogFile!.text();
      const sdfContent = await this.selectedSdfFile!.text();
      
      // Process the files and generate JSON
      const jsonContent = await this.fileProcessingService.processFiles(
        this.selectedVerilogFile!,
        this.selectedSdfFile!
      );

      // Store all contents
      this.verilogContent = verilogContent;
      this.sdfContent = sdfContent;
      this.parsedContent = jsonContent;
      this.generatedFilename = `${this.newDesignName.toLowerCase().replace(/\s+/g, '_')}_schematics.json`;

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
        jsonContent: this.parsedContent,
        // Fix type mismatches by providing undefined instead of null
        verilogContent: this.verilogContent ?? undefined,
        sdfContent: this.sdfContent ?? undefined,
        visualizationState: {
          clockFrequency: 1000000 // Default 1MHz
        }
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
    this.verilogContent = null;
    this.sdfContent = null;
  }

  deleteDesign(id: string): void {
    this.designService.deleteDesign(id);
  }

  // Add public export method
  exportDesign(id: string): void {
    this.designService.exportDesign(id);
  }

  triggerImport(): void {
    document.getElementById('importFile')?.click();
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  async onDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const zipFiles = Array.from(files).filter(file => file.type === 'application/zip');
      if (zipFiles.length > 0) {
        await this.importMultipleDesigns(zipFiles);
      } else {
        alert('Please drop ZIP files only');
      }
    }
  }

  async onImportFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const zipFiles = Array.from(input.files).filter(file => file.type === 'application/zip');
      if (zipFiles.length > 0) {
        await this.importMultipleDesigns(zipFiles);
      }
      input.value = ''; // Reset input
    }
  }

  private async importDesign(zipFile: File): Promise<void> {
    try {
      await this.designService.importDesign(zipFile);
      // Success case - no alert, just successfully imported
    } catch (error) {
      console.error('Error importing design:', error);
      alert('Failed to import design. Please ensure the ZIP file contains valid design files.');
    }
  }

  private async importMultipleDesigns(zipFiles: File[]): Promise<void> {
    const importPromises = zipFiles.map(async (zipFile) => {
      try {
        await this.designService.importDesign(zipFile);
        return { file: zipFile.name, success: true };
      } catch (error) {
        console.error(`Error importing ${zipFile.name}:`, error);
        return { file: zipFile.name, success: false };
      }
    });

    const results = await Promise.all(importPromises);
    const failures = results.filter(r => !r.success);
    
    if (failures.length > 0) {
      const failedFiles = failures.map(f => f.file).join(', ');
      alert(`Failed to import the following designs: ${failedFiles}`);
    }
  }
}
