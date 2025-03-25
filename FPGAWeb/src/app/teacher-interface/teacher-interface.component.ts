import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { marked } from 'marked';
import JSZip from 'jszip';

// Services
import { FileProcessingService } from '../services/file-processing.service';
import { DesignService } from '../services/design.service';
import { ExamplesLoaderService } from '../services/examples-loader.service';
import { AppInitializerService } from '../services/app-initializer.service';

// Models
import { Design } from '../models/design.model';

/**
 * TeacherInterfaceComponent - Provides functionality for teachers to 
 * upload, manage, import and export FPGA designs.
 */
@Component({
  selector: 'app-teacher-interface',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule, HttpClientModule],
  templateUrl: './teacher-interface.component.html',
  styleUrl: './teacher-interface.component.css'
})
export class TeacherInterfaceComponent implements OnInit {
  // Simplified properties by grouping related items
  title = 'Teacher Interface';
  
  // Design data
  designs: Design[] = [];
  
  // Form state
  newDesignName = '';
  newDesignDescription = '';
  selectedVerilogFile: File | null = null;
  selectedSdfFile: File | null = null;
  markdownPreview: string | null = null;
  
  // Processing state
  isProcessing = false;
  isLoading = false;
  
  // Processed content
  parsedContent: string | null = null;
  generatedFilename: string | null = null;
  verilogContent: string | null = null;
  sdfContent: string | null = null;
  
  // Drag and drop state
  isDragging = false;
  isDraggingVerilog = false;
  isDraggingSdf = false;

  // Add these properties to track validation errors
  missingVerilogFile = false;
  missingSdfFile = false;

  // Edit state
  editingDesign: Design | null = null;
  editDesignName = '';
  editDesignDescription = '';

  constructor(
    private fileProcessingService: FileProcessingService,
    private designService: DesignService,
    private examplesLoader: ExamplesLoaderService,
    private appInitializer: AppInitializerService
  ) {
    // Configure markdown options once during initialization
    marked.setOptions({
      breaks: true,
      gfm: true
    });
  }

  ngOnInit() {
    // Track loading state from app initializer service
    this.appInitializer.isLoading$.subscribe(
      (loading: boolean) => this.isLoading = loading
    );
    
    // Get designs with optimized change detection
    this.designService.getDesigns().pipe(
      distinctUntilChanged((prev, curr) => 
        JSON.stringify(prev) === JSON.stringify(curr)
      ),
      map(designs => designs.map(design => ({
        ...design,
        // Provide default values for optional fields
        verilogContent: design.verilogContent || '',
        sdfContent: design.sdfContent || '',
        jsonContent: design.jsonContent || {},
        description: design.description || '',
        files: design.files || [],
        visualizationState: design.visualizationState || {
          clockFrequency: 1000000
        }
      })))
    ).subscribe(designs => {
      this.designs = designs;
    });
  }

  // File handling methods consolidated into a cleaner pattern
  onFileSelected(event: Event, type: 'verilog' | 'sdf'): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    if (type === 'verilog') {
      this.selectedVerilogFile = file;
    } else {
      this.selectedSdfFile = file;
    }
  }

  async uploadDesign(): Promise<void> {
    if (!this.selectedVerilogFile || !this.selectedSdfFile) {
      alert('Please select both Verilog and SDF files');
      return;
    }

    // Since we've checked they're not null above
    const selectedVerilogFile = this.selectedVerilogFile!;
    const selectedSdfFile = this.selectedSdfFile!;

    // If no name is provided, use the Verilog file name without extension
    if (!this.newDesignName.trim()) {
      this.newDesignName = selectedVerilogFile.name.replace(/\.v$/, '');
    }

    this.isProcessing = true;
    try {
      // Read file contents
      const verilogContent = await selectedVerilogFile.text();
      const sdfContent = await selectedSdfFile.text();
      
      // Process the files and generate JSON
      const jsonContent = await this.fileProcessingService.processFiles(
        selectedVerilogFile,
        selectedSdfFile
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

  async saveDesign(): Promise<void> {
    this.missingVerilogFile = !this.selectedVerilogFile;
    this.missingSdfFile = !this.selectedSdfFile;

    if (this.missingVerilogFile || this.missingSdfFile) {
      return;
    }

    try {
      this.isProcessing = true;

      const selectedVerilogFile = this.selectedVerilogFile!;
      const selectedSdfFile = this.selectedSdfFile!;

      // Read file contents directly
      const verilogContent = await this.fileProcessingService.readFileAsText(selectedVerilogFile);
      const sdfContent = await this.fileProcessingService.readFileAsText(selectedSdfFile);
      
      // Process files using FileProcessingService
      const parsedContent = await this.fileProcessingService.processFiles(
        selectedVerilogFile,
        selectedSdfFile
      );
      
      // Generate filename for JSON
      const designName = this.newDesignName || selectedVerilogFile.name.replace('.v', '');
      const generatedFilename = `${designName.toLowerCase().replace(/\s+/g, '_')}_schematics.json`;

      // Create and save the design
      const newDesign: Design = {
        id: `design_${Date.now()}`,
        name: designName,
        description: this.newDesignDescription ? 
          String(marked.parse(this.newDesignDescription, { async: false })) : '',
        files: [
          selectedVerilogFile.name,
          selectedSdfFile.name,
          generatedFilename
        ],
        verilogContent: verilogContent,
        sdfContent: sdfContent,
        jsonContent: JSON.parse(parsedContent), 
        visualizationState: {
          clockFrequency: 1000000
        }
      };

      // Add new design at the beginning
      this.designService.addDesign(newDesign, true);
      
      // Store parsed content for preview - retain this but don't clear it
      this.parsedContent = parsedContent;
      this.generatedFilename = generatedFilename;
      
      // Reset form WITHOUT clearing parsed content
      this.selectedVerilogFile = null;
      this.selectedSdfFile = null;
      this.newDesignName = '';
      this.newDesignDescription = '';
      this.markdownPreview = null;
      this.missingVerilogFile = false;
      this.missingSdfFile = false;

    } catch (error) {
      console.error('Error processing and saving design:', error);
      alert('Error processing files. Please try again or contact support if the issue persists.');
    } finally {
      this.isProcessing = false;
    }
  }

  // Only clear JSON preview when explicitly requested
  clearJsonPreview(): void {
    this.parsedContent = null;
    this.generatedFilename = null;
  }

  // Update resetForm to clear the JSON preview
  resetForm(): void {
    this.selectedVerilogFile = null;
    this.selectedSdfFile = null;
    this.newDesignName = '';
    this.newDesignDescription = '';
    this.markdownPreview = null;

    // Clear files content
    this.verilogContent = null;
    this.sdfContent = null;
    
    // Reset validation states
    this.missingVerilogFile = false;
    this.missingSdfFile = false;

    // Always clear JSON preview when reset is clicked
    this.clearJsonPreview();
  }

  downloadJson(): void {
    if (this.parsedContent && this.generatedFilename) {
      this.fileProcessingService.downloadJson(this.parsedContent, this.generatedFilename);
    }
  }

  deleteDesign(id: string): void {
    this.designService.deleteDesign(id);
  }

  // Add public export method
  async exportDesign(id: string): Promise<void> {
    const design = this.designs.find(d => d.id === id);
    if (!design) return;
  
    const zip = new JSZip();
  
    // Add design files
    if (design.verilogContent) {
      zip.file(design.files[0], design.verilogContent);
    }
    if (design.sdfContent) {
      zip.file(design.files[1], design.sdfContent);
    }
    if (design.jsonContent) {
      zip.file(design.files[2], JSON.stringify(design.jsonContent, null, 2));
    }
  
    // Add metadata
    const metadata = {
      name: design.name,
      description: design.description,
      visualizationState: design.visualizationState
    };
    zip.file('metadata.json', JSON.stringify(metadata, null, 2));
  
    try {
      const content = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${design.name.toLowerCase().replace(/\s+/g, '_')}_design.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error creating ZIP file:', error);
      alert('Failed to create export file');
    }
  }

  triggerImport(): void {
    document.getElementById('importFile')?.click();
  }

  onDragOver(event: DragEvent, type: 'verilog' | 'sdf' | 'import'): void {
    event.preventDefault();
    event.stopPropagation();
    if (type === 'verilog') {
      this.isDraggingVerilog = true;
    } else if (type === 'sdf') {
      this.isDraggingSdf = true;
    } else if (type === 'import') {
      this.isDragging = true;
    }
  }

  onDragLeave(event: DragEvent, type: 'verilog' | 'sdf' | 'import'): void {
    event.preventDefault();
    event.stopPropagation();
    if (type === 'verilog') {
      this.isDraggingVerilog = false;
    } else if (type === 'sdf') {
      this.isDraggingSdf = false;
    } else if (type === 'import') {
      this.isDragging = false;
    }
  }

  async onDrop(event: DragEvent, type: 'verilog' | 'sdf' | 'import'): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingVerilog = false;
    this.isDraggingSdf = false;
    this.isDragging = false;

    const files = event.dataTransfer?.files;
    if (!files?.length) return;

    if (type === 'import') {
      const zipFiles = Array.from(files).filter(file => file.type === 'application/zip');
      if (zipFiles.length > 0) {
        await this.importMultipleDesigns(zipFiles);
      }
    } else {
      const file = files[0];
      if (type === 'verilog' && file.name.endsWith('.v')) {
        this.selectedVerilogFile = file;
      } else if (type === 'sdf' && file.name.endsWith('.sdf')) {
        this.selectedSdfFile = file;
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

  updateMarkdownPreview(): void {
    if (this.newDesignDescription) {
      this.markdownPreview = String(marked.parse(this.newDesignDescription, { async: false }));
    } else {
      this.markdownPreview = null;
    }
  }

  viewFile(design: Design, fileIndex: number): void {
    let content: string;
    let fileType: string;
    
    if (fileIndex === 0) {
      content = design.verilogContent as string;
      fileType = 'text/plain';
    } else if (fileIndex === 1) {
      content = design.sdfContent as string;
      fileType = 'text/plain';
    } else {
      content = JSON.stringify(design.jsonContent, null, 2);
      fileType = 'application/json';
    }
    
    const blob = new Blob([content], { type: fileType });
    const url = window.URL.createObjectURL(blob);
    window.open(url, '_blank');
  }

  editDesign(design: Design): void {
    this.editingDesign = design;
    this.editDesignName = design.name;
    this.editDesignDescription = design.description;
    // Add logic to open edit modal or form
  }

  saveEditedDesign(): void {
    if (!this.editingDesign) return;

    const updatedDesign = {
      ...this.editingDesign,
      name: this.editDesignName,
      description: this.editDesignDescription ? 
        String(marked.parse(this.editDesignDescription, { async: false })) : ''
    };

    this.designService.updateDesign(updatedDesign);
    this.cancelEdit();
  }

  cancelEdit(): void {
    this.editingDesign = null;
    this.editDesignName = '';
    this.editDesignDescription = '';
  }
}
