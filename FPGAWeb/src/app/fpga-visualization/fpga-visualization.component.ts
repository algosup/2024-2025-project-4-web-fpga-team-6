import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DesignService, Design } from '../services/design.service';
import { DesignListComponent } from './components/sidebar/design-list/design-list.component';
import { ControlsComponent } from './components/sidebar/controls/controls.component';
// Import the D3 visualization component instead of json-viewer
import { D3VisualizationComponent } from './components/visualization/d3-visualization/d3-visualization.component';
import { FpgaHeaderComponent } from './components/visualization/fpga-header/fpga-header.component';
// Import the event interface from the design-list component
import { DesignDescriptionEvent } from './components/sidebar/design-list/design-list.component';

@Component({
  selector: 'app-fpga-visualization',
  standalone: true,
  imports: [
    RouterLink, 
    CommonModule,
    DesignListComponent,
    ControlsComponent,
    D3VisualizationComponent, // Use D3VisualizationComponent instead of JsonViewerComponent
    FpgaHeaderComponent
  ],
  templateUrl: './fpga-visualization.component.html',
  styleUrls: ['./fpga-visualization.component.css']
})
export class FpgaVisualizationComponent implements OnInit {
  title = 'FPGA Visualization Platform';
  
  // Design selection
  designs: Design[] = [];
  currentDesign: string | null = null; // Changed to string ID, not Design object
  expandedDesignId: string | null = null;

  // Simulation state
  isRunning = false;
  isPaused = false;
  speed = 1;  // Slow factor (1x) for signal propagation
  clockFrequency = 1; // Default 1 Hz (middle of log scale)
  
  // Visualization options
  layoutType: 'grid' | 'force' | 'hierarchical' = 'grid';
  darkMode = false;
  
  constructor(private designService: DesignService) {}

  ngOnInit() {
    // Load designs from service
    this.designService.getDesigns().subscribe(designs => {
      this.designs = designs;
    });
  }

  selectDesign(designId: string) {
    this.currentDesign = designId;
    this.stopSimulation(); // Reset simulation when changing design
  }

  // Update to handle the complex event object
  toggleDescription(event: DesignDescriptionEvent): void {
    const designId = event.designId;
    this.expandedDesignId = this.expandedDesignId === designId ? null : designId;
  }

  getDesignName(designId: string | null): string {
    if (!designId) return 'No Design Selected';
    
    const design = this.designs.find(d => d.id === designId);
    return design ? design.name : 'Unknown Design';
  }

  getDesignObject(designId: string | null): Design | null {
    if (!designId) return null;
    return this.designs.find(d => d.id === designId) || null;
  }

  // Simulation control methods
  playSimulation() {
    this.isRunning = true;
    this.isPaused = false;
    console.log(`Playing simulation at ${this.speed}x speed`);
  }

  pauseSimulation() {
    this.isPaused = true;
    console.log('Simulation paused');
  }

  resumeSimulation() {
    this.isPaused = false;
    console.log(`Resuming simulation at ${this.speed}x speed`);
  }

  resetSimulation() {
    this.isRunning = false;
    this.isPaused = false;
    console.log('Simulation reset');
  }

  changeSpeed(newSpeed: number) {
    this.speed = newSpeed;
    console.log(`Changed signal propagation slow factor to ${this.speed}x`);
  }

  changeClockFrequency(newFrequency: number) {
    this.clockFrequency = newFrequency;
    const formattedValue = this.formatClockFrequency(newFrequency);
    console.log(`Changed clock frequency to ${formattedValue}`);
  }

  // Helper to format frequency values with appropriate units
  private formatClockFrequency(value: number): string {
    if (value < 1) return `${value.toFixed(3)} Hz`;
    if (value < 1000) return `${value.toFixed(1)} Hz`;
    if (value < 1000000) return `${(value/1000).toFixed(1)} kHz`;
    if (value < 1000000000) return `${(value/1000000).toFixed(1)} MHz`;
    return `${(value/1000000000).toFixed(1)} GHz`;
  }

  // Added for simulation stop
  stopSimulation() {
    this.isRunning = false;
    this.isPaused = false;
  }
}