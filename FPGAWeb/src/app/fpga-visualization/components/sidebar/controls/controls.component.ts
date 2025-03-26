import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-controls',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './controls.component.html',
  styleUrls: ['./controls.component.css']
})
export class ControlsComponent {
  @Input() isRunning = false;
  @Input() isPaused = false;
  @Input() speed = 1;
  @Input() hasSelection = false;

  @Output() play = new EventEmitter<void>();
  @Output() pause = new EventEmitter<void>();
  @Output() resume = new EventEmitter<void>();
  @Output() step = new EventEmitter<void>();
  @Output() speedChange = new EventEmitter<number>();
  
  speedOptions = [1, 2, 4, 8];

  onPlay(): void {
    this.play.emit();
  }

  onPause(): void {
    this.pause.emit();
  }

  onResume(): void {
    this.resume.emit();
  }

  onStep(): void {
    this.step.emit();
  }

  onSpeedChange(newSpeed: number): void {
    this.speedChange.emit(newSpeed);
  }
}