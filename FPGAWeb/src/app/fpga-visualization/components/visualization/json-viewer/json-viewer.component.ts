import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Design } from '../../../../services/design.service';

@Component({
  selector: 'app-json-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './json-viewer.component.html',
  styleUrls: ['./json-viewer.component.css']
})
export class JsonViewerComponent {
  @Input() design: Design | null = null;

  getFormattedJson(): string {
    if (!this.design?.jsonContent) {
      return '';
    }
    
    try {
      // If jsonContent is already a string, use it directly
      if (typeof this.design.jsonContent === 'string') {
        // Parse and then stringify to ensure proper formatting
        return JSON.stringify(JSON.parse(this.design.jsonContent), null, 2);
      } else {
        // If it's already an object, just stringify it
        return JSON.stringify(this.design.jsonContent, null, 2);
      }
    } catch (e) {
      console.error('Error formatting JSON:', e);
      // Return the raw content as a fallback
      return String(this.design.jsonContent) || 'Invalid JSON content';
    }
  }
}