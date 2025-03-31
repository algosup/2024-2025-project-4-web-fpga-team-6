import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxJsonViewerModule } from 'ngx-json-viewer';


@Component({
  selector: 'app-json-viewer',
  standalone: true,
  imports: [CommonModule, NgxJsonViewerModule],
  template: `
    <div class="json-container" [class.expanded]="expanded">
      <div class="json-header">
        <span>JSON Preview</span>
        <div class="json-actions">
          <button class="json-action-btn" (click)="toggleExpand()">
            {{ expanded ? 'Collapse' : 'Expand' }}
          </button>
          <button class="json-action-btn" (click)="copyToClipboard()">
            Copy
          </button>
          <button class="json-action-btn" (click)="downloadJson()">
            Download
          </button>
        </div>
      </div>
      <div class="json-content-wrapper">
        <ngx-json-viewer [json]="parsedJson" [expanded]="false"></ngx-json-viewer>
      </div>
    </div>
  `,
  styles: [`
    .json-container {
      display: flex;
      flex-direction: column;
      border: 1px solid rgba(11, 61, 145, 0.2);
      border-radius: 4px;
      overflow: hidden;
      transition: all 0.3s ease;
      margin-bottom: 1rem;
    }
    
    .json-container.expanded .json-content-wrapper {
      height: 500px;
    }
    
    .json-header {
      display: flex;
      justify-content: space-between;
      padding: 8px 12px;
      background-color: rgba(11, 61, 145, 0.05);
      border-bottom: 1px solid rgba(11, 61, 145, 0.1);
      font-weight: 500;
    }
    
    .json-actions {
      display: flex;
      gap: 8px;
    }
    
    .json-action-btn {
      background: none;
      border: none;
      color: var(--cnes-blue);
      cursor: pointer;
      font-size: 0.85rem;
      padding: 2px 6px;
      border-radius: 3px;
    }
    
    .json-action-btn:hover {
      background-color: rgba(11, 61, 145, 0.1);
    }
    
    .json-content-wrapper {
      height: 300px;
      overflow: auto;
      padding: 0.5rem;
      background-color: #f8f9fa;
      transition: height 0.3s ease;
    }
    
    ::ng-deep .segment-key {
      color: #0451a5 !important;
    }
    
    ::ng-deep .segment-value {
      color: #0b0080 !important;
    }
    
    ::ng-deep .segment-type-string .segment-value {
      color: #a31515 !important;
    }
    
    ::ng-deep .segment-type-number .segment-value {
      color: #098658 !important;
    }
    
    ::ng-deep .segment-type-boolean .segment-value {
      color: #0000ff !important;
    }
    
    ::ng-deep .segment-type-null .segment-value {
      color: #808080 !important;
    }
  `]
})
export class JsonViewerComponent implements OnChanges {
  @Input() json: string | null = null;
  parsedJson: any = {};
  expanded: boolean = false;
  
  ngOnChanges() {
    if (this.json) {
      try {
        this.parsedJson = typeof this.json === 'string' 
          ? JSON.parse(this.json) 
          : this.json;
      } catch (e) {
        console.error('Invalid JSON:', e);
        this.parsedJson = { error: 'Invalid JSON format' };
      }
    }
  }
  
  toggleExpand() {
    this.expanded = !this.expanded;
  }
  
  copyToClipboard() {
    if (this.json) {
      navigator.clipboard.writeText(this.json)
        .then(() => alert('JSON copied to clipboard'))
        .catch(err => console.error('Failed to copy JSON', err));
    }
  }
  
  downloadJson() {
    if (this.json) {
      const blob = new Blob([this.json], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'schematics.json';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }
  }
}