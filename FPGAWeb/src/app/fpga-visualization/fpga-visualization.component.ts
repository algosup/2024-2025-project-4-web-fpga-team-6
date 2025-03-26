import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DesignService, Design } from '../services/design.service';
import { DesignListComponent } from './components/sidebar/design-list/design-list.component';
import { ControlsComponent } from './components/sidebar/controls/controls.component';
// Import the D3 visualization component instead of json-viewer
import { D3VisualizationComponent } from './components/visualization/d3-visualization/d3-visualization.component';
import { FpgaHeaderComponent } from './components/visualization/fpga-header/fpga-header.component';

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
  styleUrl: './fpga-visualization.component.css'
})
export class FpgaVisualizationComponent implements OnInit {
  title = 'FPGA Visualization';
  isRunning = false;
  isPaused = false;
  speed = 1;
  currentDesign = '';
  designs: Design[] = [];
  selectedDesign: Design | null = null;
  expandedDesignId: string | null = null;

  constructor(private designService: DesignService) {}

  ngOnInit(): void {
    // Subscribe to designs updates
    this.designService.getDesigns().subscribe(designs => {
      this.designs = designs;
    });
  }

  selectDesign(designId: string): void {
    const design = this.designs.find(d => d.id === designId);
    if (design) {
      this.selectedDesign = design;
      this.currentDesign = designId;
      this.isRunning = false;
      this.isPaused = false;
      console.log('Selected design:', design.name);
      if (design.jsonContent) {
        console.log('Loading design:', design.name);
      }
    }
  }

  playSimulation(): void {
    if (!this.currentDesign) {
      alert('Please select a design first');
      return;
    }
    this.isRunning = true;
    this.isPaused = false;
    console.log(`Starting simulation at speed x${this.speed}`);
  }

  pauseSimulation(): void {
    if (this.isRunning) {
      this.isPaused = true;
      this.isRunning = false;
      console.log('Simulation paused');
    }
  }

  resumeSimulation(): void {
    if (this.isPaused) {
      this.isPaused = false;
      this.isRunning = true;
      console.log(`Resuming simulation at speed x${this.speed}`);
    }
  }

  stepSimulation(): void {
    if (!this.currentDesign) {
      alert('Please select a design first');
      return;
    }
    console.log('Simulation stepped forward');
  }

  changeSpeed(newSpeed: number): void {
    this.speed = newSpeed;
    if (this.isRunning) {
      console.log(`Changed simulation speed to x${this.speed}`);
    }
  }

  toggleDescription(event: {designId: string, event: Event}): void {
    this.expandedDesignId = this.expandedDesignId === event.designId ? null : event.designId;
  }

  // Helper method to get design name
  getDesignName(designId: string): string {
    const design = this.designs.find(d => d.id === designId);
    return design ? design.name : '';
  }
}