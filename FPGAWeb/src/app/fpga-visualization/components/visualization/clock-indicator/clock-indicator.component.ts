import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-clock-indicator',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="clock-indicator" [class.active]="active">
      <div class="clock-status">
        <div class="clock-dot" [class.active]="active"></div>
        <div class="clock-label">CLOCK</div>
        <div class="clock-frequency">{{ formatFrequency(frequency) }}</div>
      </div>
    </div>
  `,
  styles: [`
    .clock-indicator {
      position: absolute;
      top: 10px;
      right: 10px;
      background-color: rgba(0, 0, 0, 0.7);
      border-radius: 10px;
      padding: 8px 16px;
      color: white;
      display: flex;
      align-items: center;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      z-index: 100;
      transition: background-color 0.3s ease;
      pointer-events: none;
    }
    
    .clock-indicator.active {
      background-color: rgba(33, 150, 243, 0.8);
    }
    
    .clock-status {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .clock-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background-color: #e0e0e0;
      transition: all 0.15s ease;
    }
    
    .clock-dot.active {
      background-color: #ff1744;
      box-shadow: 0 0 10px #ff1744, 0 0 20px #ff1744;
    }
    
    .clock-label {
      font-weight: bold;
      font-size: 0.9rem;
      letter-spacing: 0.5px;
    }
    
    .clock-frequency {
      font-size: 0.8rem;
      opacity: 0.8;
      white-space: nowrap;
    }
  `]
})
export class ClockIndicatorComponent {
  @Input() active = false;
  @Input() frequency = 1;  // Hz
  
  formatFrequency(value: number): string {
    if (value < 1) return `${value.toFixed(3)} Hz`;
    if (value < 1000) return `${value.toFixed(1)} Hz`;
    if (value < 1000000) return `${(value/1000).toFixed(1)} kHz`;
    if (value < 1000000000) return `${(value/1000000).toFixed(1)} MHz`;
    return `${(value/1000000000).toFixed(1)} GHz`;
  }
}