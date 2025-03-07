import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

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
  
  // Mock data - in a real app, this would come from a service
  examples = [
    { id: 'example1', name: 'Basic Counter' },
    { id: 'example2', name: 'LED Blinker' },
    { id: 'example3', name: 'State Machine' },
    { id: 'example4', name: 'ALU Implementation' }
  ];

  constructor() { }

  ngOnInit(): void {
  }

  selectExample(exampleId: string): void {
    this.currentExample = exampleId;
    this.isRunning = false;
    this.isPaused = false;
    // In a real app, this would load the example data
    console.log(`Selected example: ${exampleId}`);
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
  getExampleName(exampleId: string): string {
    const example = this.examples.find(e => e.id === exampleId);
    return example ? example.name : '';
  }
}
