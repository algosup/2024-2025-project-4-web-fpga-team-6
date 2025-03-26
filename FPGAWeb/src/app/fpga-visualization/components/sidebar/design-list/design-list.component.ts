import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Design } from '../../../../services/design.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-design-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './design-list.component.html',
  styleUrls: ['./design-list.component.css']
})
export class DesignListComponent {
  @Input() designs: Design[] = [];
  @Input() currentDesignId: string = '';
  @Input() expandedDesignId: string | null = null;
  
  @Output() selectDesign = new EventEmitter<string>();
  @Output() toggleDescription = new EventEmitter<{designId: string, event: Event}>();
  
  onSelectDesign(designId: string): void {
    this.selectDesign.emit(designId);
  }
  
  onToggleDescription(designId: string, event: Event): void {
    event.stopPropagation(); // Prevent triggering selectDesign
    this.toggleDescription.emit({designId, event});
  }
}