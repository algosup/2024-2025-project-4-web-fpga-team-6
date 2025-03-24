import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Design {
  id: string;
  name: string;
  description: string;
  files: string[];
  jsonContent?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DesignService {
  private designs: Design[] = [];
  private designsSubject = new BehaviorSubject<Design[]>([]);

  getDesigns(): Observable<Design[]> {
    return this.designsSubject.asObservable();
  }

  addDesign(design: Design): void {
    this.designs.push(design);
    this.designsSubject.next(this.designs);
  }

  deleteDesign(id: string): void {
    this.designs = this.designs.filter(design => design.id !== id);
    this.designsSubject.next(this.designs);
  }

  getDesignById(id: string): Design | undefined {
    return this.designs.find(design => design.id === id);
  }
}