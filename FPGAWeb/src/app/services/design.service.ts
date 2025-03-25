import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import JSZip from 'jszip';

export interface VisualizationState {
  clockFrequency: number;
  // Add other visualization parameters as needed
}

export interface Design {
  id: string;
  name: string;
  description: string;
  files: string[];
  jsonContent?: string;
  verilogContent?: string;
  sdfContent?: string;
  visualizationState?: VisualizationState;
}

@Injectable({
  providedIn: 'root'
})
export class DesignService {
  private designs: Design[] = [];
  private designsSubject = new BehaviorSubject<Design[]>([]);

  getDesigns(): Observable<Design[]> {
    return this.designsSubject.asObservable();
  }

  addDesign(design: Design, addToStart: boolean = true): void {
    // Check if design with same ID already exists
    const existingIndex = this.designs.findIndex(d => d.id === design.id);
    if (existingIndex !== -1) {
      // Update existing design
      this.designs[existingIndex] = design;
    } else {
      // Add new design either at start or end
      if (addToStart) {
        this.designs.unshift(design);  // Add to beginning
      } else {
        this.designs.push(design);     // Add to end
      }
    }
    this.designsSubject.next([...this.designs]);
  }

  updateDesign(design: Design): void {
    const index = this.designs.findIndex(d => d.id === design.id);
    if (index !== -1) {
      this.designs[index] = design;
      this.designsSubject.next([...this.designs]);
    }
  }

  deleteDesign(id: string): void {
    this.designs = this.designs.filter(design => design.id !== id);
    this.designsSubject.next(this.designs);
  }

  getDesignById(id: string): Design | undefined {
    return this.designs.find(design => design.id === id);
  }

  exportDesign(id: string): void {
    const design = this.getDesignById(id);
    if (!design) return;

    // Create a ZIP file containing all design data
    const zip = new JSZip();

    // Add the design metadata
    const metadata = {
      name: design.name,
      description: design.description,
      visualizationState: design.visualizationState || {
        clockFrequency: 1000000 // Default 1MHz
      }
    };
    zip.file('metadata.json', JSON.stringify(metadata, null, 2));

    // Add the design files
    if (design.jsonContent) {
      zip.file(design.files[2], design.jsonContent);
    }
    if (design.verilogContent) {
      zip.file(design.files[0], design.verilogContent);
    }
    if (design.sdfContent) {
      zip.file(design.files[1], design.sdfContent);
    }

    // Generate and download the ZIP file
    zip.generateAsync({ type: 'blob' })
      .then(content => {
        const url = window.URL.createObjectURL(content);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${design.name.toLowerCase().replace(/\s+/g, '_')}_design.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      });
  }

  async importDesign(zipFile: File): Promise<Design | null> {
    try {
      const zip = await JSZip.loadAsync(zipFile);
      
      // Read metadata.json first
      const metadataFile = zip.file('metadata.json');
      if (!metadataFile) throw new Error('Missing metadata.json');
      
      const metadata = JSON.parse(await metadataFile.async('text'));
      
      // Find and read design files
      let verilogContent: string | undefined;
      let sdfContent: string | undefined;
      let jsonContent: string | undefined;
      let verilogFilename: string | undefined;
      let sdfFilename: string | undefined;
      let jsonFilename: string | undefined;

      for (const filename of Object.keys(zip.files)) {
        if (filename === 'metadata.json') continue;
        
        const content = await zip.files[filename].async('text');
        if (filename.endsWith('.v')) {
          verilogContent = content;
          verilogFilename = filename;
        } else if (filename.endsWith('.sdf')) {
          sdfContent = content;
          sdfFilename = filename;
        } else if (filename.endsWith('.json')) {
          jsonContent = content;
          jsonFilename = filename;
        }
      }

      if (!verilogContent || !sdfContent || !jsonContent) {
        throw new Error('Missing required design files');
      }

      const design: Design = {
        id: `design_${Date.now()}`,
        name: metadata.name,
        description: metadata.description,
        files: [
          verilogFilename!,
          sdfFilename!,
          jsonFilename!
        ],
        verilogContent,
        sdfContent,
        jsonContent,
        visualizationState: metadata.visualizationState
      };

      this.addDesign(design);
      return design;
    } catch (error) {
      console.error('Error importing design:', error);
      throw error;
    }
  }
}