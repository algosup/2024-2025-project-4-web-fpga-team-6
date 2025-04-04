import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-controls',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './controls.component.html',
  styleUrls: ['./controls.component.css']
})
export class ControlsComponent {
  @Input() isRunning = false;
  @Input() isPaused = false;
  @Input() speed = 1; // Linear scale from 1-10
  @Input() clockFrequency = 1; // Hz (not MHz)
  @Input() hasSelection = false;

  @Output() play = new EventEmitter<void>();
  @Output() pause = new EventEmitter<void>();
  @Output() resume = new EventEmitter<void>();
  @Output() reset = new EventEmitter<void>(); 
  @Output() speedChange = new EventEmitter<number>();
  @Output() clockFrequencyChange = new EventEmitter<number>();
  
  // For speed factor (linear scale 1-10)
  minSpeed = 1;
  maxSpeed = 10;
  
  // For clock frequency - logarithmic scale from 0.001 Hz to 1000 MHz
  minFrequency = 0.001; // 0.001 Hz
  maxFrequency = 1e9; // 1 GHz
  
  // Default at 1 Hz (middle of the logarithmic scale)
  // Log scale conversion functions for frequency slider
  getFrequencySliderValue(): number {
    return Math.log10(this.clockFrequency);
  }
  
  setFrequencyFromSlider(logValue: number): void {
    this.clockFrequency = Math.pow(10, logValue);
    this.clockFrequencyChange.emit(this.clockFrequency);
  }

  // Remove or simplify these methods if they exist
  getSpeedSliderValue(): number {
    return this.speed;
  }
  
  setSpeedFromSlider(logValue: number): void {
    this.speed = Math.pow(10, logValue);
    this.speedChange.emit(this.speed);
  }

  onPlay(): void {
    this.play.emit();
  }

  onPause(): void {
    this.pause.emit();
  }

  onResume(): void {
    this.resume.emit();
  }

  onReset(): void {
    this.reset.emit();
  }

  onSpeedChange(event: Event | number): void {
    let newSpeed: number;
    
    if (typeof event === 'number') {
      newSpeed = event;
    } else {
      newSpeed = +(event.target as HTMLInputElement).value;
    }
    
    // Keep speed within bounds
    if (newSpeed < this.minSpeed) newSpeed = this.minSpeed;
    if (newSpeed > this.maxSpeed) newSpeed = this.maxSpeed;
    
    this.speed = newSpeed;
    this.speedChange.emit(newSpeed);
  }
  
  onFrequencyChange(event: Event | number): void {
    if (event instanceof Event && (event.target as HTMLInputElement).type === 'range') {
      const logValue = +(event.target as HTMLInputElement).value;
      this.setFrequencyFromSlider(logValue);
    } else {
      let newFrequency: number;
      
      if (typeof event === 'number') {
        newFrequency = event;
      } else {
        newFrequency = +(event.target as HTMLInputElement).value;
      }
      
      // Keep frequency within bounds
      if (newFrequency < this.minFrequency) newFrequency = this.minFrequency;
      if (newFrequency > this.maxFrequency) newFrequency = this.maxFrequency;
      
      this.clockFrequency = newFrequency;
      this.clockFrequencyChange.emit(newFrequency);
    }
  }
  
  // Format display values with appropriate units
  formatClockFrequency(value: number): string {
    if (value < 1) return `${value.toFixed(3)} Hz`;
    if (value < 1000) return `${value.toFixed(1)} Hz`;
    if (value < 1000000) return `${(value/1000).toFixed(1)} kHz`;
    if (value < 1000000000) return `${(value/1000000).toFixed(1)} MHz`;
    return `${(value/1000000000).toFixed(1)} GHz`;
  }
  
  formatSpeedValue(speed: number): string {
    return `${speed}× (1ps = ${speed * 100}ms)`;
  }

  // Helper method to calculate and format ms per ps display based on speed
  formatMsPerPs(speed: number): string {
    // Using the same formula as in D3VisualizationComponent
    const msPerPs = Math.pow(10, (speed - 1) / 3);
    return msPerPs.toFixed(1);
  }
}