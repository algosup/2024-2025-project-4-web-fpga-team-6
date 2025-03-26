import { Injectable } from '@angular/core';
import { ComponentData } from '../models/visualization.model';

@Injectable({
  providedIn: 'root'
})
export class DataExtractorService {
  
  extractComponents(data: any): ComponentData[] {
    const components: ComponentData[] = [];
    
    // Check for modules or components in the data
    if (data.modules) {
      for (const [id, module] of Object.entries(data.modules)) {
        components.push({
          id,
          name: this.getModuleName(id, module),
          // Use more specific categorization
          type: this.identifyModuleType(module),
          data: module
        });
      }
    }
    
    // Check for cells if no modules were found
    if (components.length === 0 && data.cells) {
      for (const [id, cell] of Object.entries(data.cells)) {
        components.push({
          id,
          name: this.getCellName(id, cell),
          type: this.identifyCellType(cell),
          data: cell
        });
      }
    }
    
    // If still no components found, create mock data for visualization
    if (components.length === 0) {
      // Create a mix of different types for demonstration
      components.push(
        { id: 'lut1', name: 'LUT-1', type: 'LUT4', data: {} },
        { id: 'lut2', name: 'LUT-2', type: 'LUT6', data: {} },
        { id: 'dff1', name: 'DFF-1', type: 'DFF', data: {} },
        { id: 'dff2', name: 'DFF-2', type: 'DFF', data: {} },
        { id: 'gpio1', name: 'GPIO-IN', type: 'GPIO_IN', data: {} },
        { id: 'gpio2', name: 'GPIO-OUT', type: 'GPIO_OUT', data: {} }
      );
    }
    
    return components;
  }

  private getModuleName(id: string, module: any): string {
    return module.name || id;
  }

  private getCellName(id: string, cell: any): string {
    return cell.name || id;
  }

  private identifyModuleType(module: any): string {
    const typeName = module.type || '';
    const attributes = module.attributes || {};
    
    // Check if we can infer the type from attributes or children
    if (attributes.type) {
      return this.normalizeComponentType(attributes.type);
    }
    
    return 'module';
  }

  private identifyCellType(cell: any): string {
    // Look at various properties to identify specific cell types
    let type = cell.type || cell.celltype || 'unknown';
    
    // Normalize common names to our categories
    return this.normalizeComponentType(type);
  }
  
  private normalizeComponentType(type: string): string {
    const lowerType = type.toLowerCase();
    
    // LUT detection
    if (lowerType.includes('lut')) {
      // Try to identify LUT size (e.g., LUT4, LUT6)
      const match = lowerType.match(/lut(\d+)/);
      return match ? `LUT${match[1]}` : 'LUT';
    }
    
    // Flip-flop detection
    if (lowerType.includes('ff') || lowerType.includes('flop') || lowerType.includes('dff')) {
      return 'DFF';
    }
    
    // GPIO detection
    if (lowerType.includes('io') || lowerType.includes('pad') || lowerType.includes('pin')) {
      if (lowerType.includes('in') && !lowerType.includes('out')) {
        return 'GPIO_IN';
      } else if (lowerType.includes('out') && !lowerType.includes('in')) {
        return 'GPIO_OUT';
      } else {
        return 'GPIO';
      }
    }
    
    // Return the original type if no specific category detected
    return type;
  }
}