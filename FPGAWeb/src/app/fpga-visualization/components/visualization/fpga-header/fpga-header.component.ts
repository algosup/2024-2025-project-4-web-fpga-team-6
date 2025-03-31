import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-fpga-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './fpga-header.component.html',
  styleUrls: ['./fpga-header.component.css']
})
export class FpgaHeaderComponent {
  @Input() title: string = '';
  @Input() isRunning: boolean = false;
  @Input() isPaused: boolean = false;
  @Input() speed: number = 1;
  @Input() clockFrequency: number = 1;
  
  formatClockFrequency(value: number): string {
    if (value < 1) return `${value.toFixed(3)} Hz`;
    if (value < 1000) return `${value.toFixed(1)} Hz`;
    if (value < 1000000) return `${(value/1000).toFixed(1)} kHz`;
    if (value < 1000000000) return `${(value/1000000).toFixed(1)} MHz`;
    return `${(value/1000000000).toFixed(1)} GHz`;
  }
}