import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DesignService, Design } from '../services/design.service';

@Component({
  selector: 'app-fpga-visualization',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './fpga-visualization.component.html',
  styleUrl: './fpga-visualization.component.css'
})
export class FpgaVisualizationComponent implements OnInit {
  title = 'FPGA Visualization';
  isRunning = false;
  isPaused = false;
  speed = 1;
  currentExample = '';
  designs: Design[] = [];
  selectedDesign: Design | null = null;
  expandedDesignId: string | null = null;

  constructor(private designService: DesignService) {}

  ngOnInit(): void {
    // Subscribe to designs updates
    this.designService.getDesigns().subscribe(designs => {
      this.designs = designs;
      // Remove the mapping to examples as we'll use designs directly
    });
  }

  selectExample(designId: string): void {
    const design = this.designs.find(d => d.id === designId);
    if (design) {
      this.selectedDesign = design;
      this.currentExample = designId;
      this.isRunning = false;
      this.isPaused = false;
      if (design.jsonContent) {
        console.log('Loading design:', design.name);
      }
    }
  }

  playSimulation(): void {
    if (!this.currentExample) {
      alert('Please select an example first');
      return;
    }
    this.isRunning = true;
    this.isPaused = false;
    // In a real app, this would start the simulation
    console.log(`Starting simulation at speed x${this.speed}`);
  }

  pauseSimulation(): void {
    if (this.isRunning) {
      this.isPaused = true;
      this.isRunning = false;
      // In a real app, this would pause the simulation
      console.log('Simulation paused');
    }
  }

  resumeSimulation(): void {
    if (this.isPaused) {
      this.isPaused = false;
      this.isRunning = true;
      // In a real app, this would resume the simulation
      console.log(`Resuming simulation at speed x${this.speed}`);
    }
  }

  stepSimulation(): void {
    if (!this.currentExample) {
      alert('Please select an example first');
      return;
    }
    // In a real app, this would advance one step
    console.log('Simulation stepped forward');
  }

  changeSpeed(newSpeed: number): void {
    this.speed = newSpeed;
    if (this.isRunning) {
      // In a real app, this would update the simulation speed
      console.log(`Changed simulation speed to x${this.speed}`);
    }
  }

  getRandomColor(): string {
    // Generate a random pastel color for the FPGA cell visualization
    const hue = Math.floor(Math.random() * 360);
    return `hsl(${hue}, 70%, 80%)`;
  }

  // Helper method to get example name
  getExampleName(designId: string): string {
    const design = this.designs.find(d => d.id === designId);
    return design ? design.name : '';
  }

  toggleDescription(designId: string, event: Event): void {
    event.stopPropagation(); // Prevent triggering selectExample
    this.expandedDesignId = this.expandedDesignId === designId ? null : designId;
  }
}
