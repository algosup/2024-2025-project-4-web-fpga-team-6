import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Design } from '../../../../services/design.service';

// Add this pipe to safely display HTML content
import { DomSanitizer } from '@angular/platform-browser';

// Define and export the event interface
export interface DesignDescriptionEvent {
  designId: string;
  event: Event;
}

@Component({
  selector: 'app-design-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './design-list.component.html',
  styleUrls: ['./design-list.component.css']
})
export class DesignListComponent {
  @Input() designs: Design[] = [];
  @Input() currentDesignId: string = '';
  @Input() expandedDesignId: string | null = null;
  
  @Output() selectDesign = new EventEmitter<string>();
  @Output() toggleDescription = new EventEmitter<{designId: string, event: Event}>();
  
  constructor(private sanitizer: DomSanitizer) {}
  
  // Method to safely interpret HTML content
  getSafeHtml(htmlContent: string) {
    return this.sanitizer.bypassSecurityTrustHtml(htmlContent);
  }
  
  onToggleDescription(designId: string, event: Event): void {
    // Emit the complex object with both the ID and the event
    this.toggleDescription.emit({ designId, event });
    
    // Prevent the click from triggering the design selection
    event.stopPropagation();
  }
  
  onSelectDesign(designId: string): void {
    this.selectDesign.emit(designId);
  }
}