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
  @Input() speed = 1;
  @Input() clockFrequency = 1; // MHz
  @Input() hasSelection = false;

  @Output() play = new EventEmitter<void>();
  @Output() pause = new EventEmitter<void>();
  @Output() resume = new EventEmitter<void>();
  @Output() reset = new EventEmitter<void>(); // Changed from step to reset
  @Output() speedChange = new EventEmitter<number>();
  @Output() clockFrequencyChange = new EventEmitter<number>();
  
  // For slider control
  minSpeed = 0.1;
  maxSpeed = 10;
  
  // For clock frequency
  minFrequency = 0.1;
  maxFrequency = 100;

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
  
  onClockFrequencyChange(event: Event | number): void {
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