import { Injectable } from '@angular/core';
import { ComponentData } from '../models/visualization.model';

// Define interfaces for our data structures
interface PortData {
  name?: string;
  direction?: string;
  [key: string]: any;
}

interface WireData {
  name?: string;
  [key: string]: any;
}

interface ModuleData {
  name?: string;
  type?: string;
  wires?: Record<string, WireData>;
  nets?: Record<string, WireData>;
  attributes?: Record<string, any>;
  [key: string]: any;
}

interface CellData {
  name?: string;
  type?: string;
  celltype?: string;
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class DataExtractorService {
  
  extractComponents(data: any): ComponentData[] {
    const components: ComponentData[] = [];
    
    // Extract external wires (in this JSON format they're in external_wires array)
    if (data.external_wires) {
      for (const wire of data.external_wires) {
        // Format name: remove ext_input_ or ext_output_ prefix and replace _ with spaces
        let formattedName = wire.name || '';
        formattedName = formattedName.replace(/^ext_(input|output)_/, '').replace(/_/g, ' ');
        
        // Capitalize first letter of each word for better readability
        formattedName = formattedName.split(' ')
          .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        
        components.push({
          id: wire.name, // Keep original ID for connections
          name: formattedName, // Use formatted name for display
          type: `WIRE_${wire.type.toUpperCase()}`,
          data: wire
        });
      }
    }
    
    // Extract cells (in this format they're directly in a cells array)
    if (data.cells) {
      for (const cell of data.cells) {
        let formattedName = cell.name || '';
        
        // Format LUT names: e.g., "lut_k_1" becomes "LUT K 1"
        if (formattedName.includes('lut_k_')) {
          const instanceNum = formattedName.match(/lut_k_(\d+)/)?.[1];
          formattedName = `LUT K ${instanceNum}`;
        }
        
        components.push({
          id: cell.name, // Keep original ID for connections
          name: formattedName, // Use formatted name for display
          type: this.identifyCellType(cell),
          data: cell
        });
      }
    }
    
    // If we still have no components, try the original approach
    if (components.length === 0) {
      // Extract external ports/wires - usually found at the top level
      if (data.ports) {
        for (const [id, portValue] of Object.entries(data.ports)) {
          const port = portValue as PortData;
          components.push({
            id,
            name: port.name || id,
            type: this.identifyPortType(port),
            data: port
          });
        }
      }
      
      // Check for modules or components in the data
      if (data.modules) {
        for (const [id, moduleValue] of Object.entries(data.modules)) {
          const module = moduleValue as ModuleData;
          
          // Check for internal wires in modules
          if (module.wires || module.nets) {
            const wires = (module.wires || module.nets || {}) as Record<string, WireData>;
            for (const [wireId, wireValue] of Object.entries(wires)) {
              const wire = wireValue as WireData;
              components.push({
                id: `${id}.${wireId}`,
                name: wire.name || wireId,
                type: this.identifyWireType(wire),
                data: wire
              });
            }
          }
          
          components.push({
            id,
            name: this.getModuleName(id, module),
            type: this.identifyModuleType(module),
            data: module
          });
        }
      }
      
      // Check for cells if no modules were found
      if (components.length === 0 && data.cells) {
        for (const [id, cellValue] of Object.entries(data.cells)) {
          const cell = cellValue as CellData;
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
          { id: 'in1', name: 'Clock', type: 'WIRE_INPUT', data: {} },
          { id: 'in2', name: 'Reset', type: 'WIRE_INPUT', data: {} },
          { id: 'in3', name: 'Enable', type: 'WIRE_INPUT', data: {} },
          { id: 'lut1', name: 'LUT-1', type: 'LUT4', data: {} },
          { id: 'lut2', name: 'LUT-2', type: 'LUT6', data: {} },
          { id: 'dff1', name: 'DFF-1', type: 'DFF', data: {} },
          { id: 'dff2', name: 'DFF-2', type: 'DFF', data: {} },
          { id: 'gpio1', name: 'GPIO-IN', type: 'GPIO_IN', data: {} },
          { id: 'gpio2', name: 'GPIO-OUT', type: 'GPIO_OUT', data: {} },
          { id: 'out1', name: 'Led', type: 'WIRE_OUTPUT', data: {} },
          { id: 'out2', name: 'Status', type: 'WIRE_OUTPUT', data: {} }
        );
      }
    }
    
    return components;
  }

  private getModuleName(id: string, module: ModuleData): string {
    return module.name || id;
  }

  private getCellName(id: string, cell: CellData): string {
    return cell.name || id;
  }

  private identifyModuleType(module: ModuleData): string {
    const typeName = module.type || '';
    const attributes = module.attributes || {};
    
    // Check if we can infer the type from attributes or children
    if (attributes['type']) { // Use bracket notation for index signature access
      return this.normalizeComponentType(attributes['type']); // Use bracket notation here too
    }
    
    return 'module';
  }

  private identifyCellType(cell: any): string {
    // Handle special cases for FF2 schematic format
    const type = cell.type || '';
    
    if (type === 'LUT_K') {
      // Extract K value if available
      return `LUT${cell.K || 4}`;
    } else if (type === 'DFF') {
      return 'DFF';
    }
    
    // Fall back to original normalization
    return this.normalizeComponentType(type);
  }
  
  private identifyPortType(port: PortData): string {
    // Identify direction from port data
    let direction = 'input'; // Default
    
    if (port.direction) {
      if (port.direction.toLowerCase().includes('out')) {
        direction = 'output';
      } else if (port.direction.toLowerCase().includes('inout')) {
        direction = 'inout';
      }
    }
    
    return `WIRE_${direction.toUpperCase()}`;
  }

  private identifyWireType(wire: WireData): string {
    // In most HDL formats, wires don't have direction, so we infer from connections
    // This is a simplified version - in a real implementation you'd check connections
    return 'WIRE_INTERNAL';
  }

  private normalizeComponentType(type: string): string {
    const lowerType = type.toLowerCase();
    
    // Add wire detection to existing pattern detection
    if (lowerType.includes('wire') || lowerType.includes('port') || lowerType.includes('net')) {
      if (lowerType.includes('in') && !lowerType.includes('out')) {
        return 'WIRE_INPUT';
      } else if (lowerType.includes('out')) {
        return 'WIRE_OUTPUT';
      } else if (lowerType.includes('inout')) {
        return 'WIRE_INOUT';
      } else {
        return 'WIRE_INTERNAL';
      }
    }
    
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