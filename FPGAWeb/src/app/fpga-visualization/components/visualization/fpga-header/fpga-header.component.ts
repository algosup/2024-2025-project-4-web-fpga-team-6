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
}