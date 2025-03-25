import { Injectable } from '@angular/core';

interface Point {
  x: number;
  y: number;
}

interface FpgaCell {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  connections: Record<string, string>;
  initialState?: string;
}

interface ExternalWire {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Interconnect {
  id: string;
  name: string;
  sourceId: string;
  sourcePort: string;
  targetId: string;
  targetPort: string;
  points: Point[];
  delay: number;
}

export interface FpgaLayout {
  cells: FpgaCell[];
  externalWires: ExternalWire[];
  interconnects: Interconnect[];
  dimensions: { width: number; height: number };
}

@Injectable({
  providedIn: 'root'
})
export class VisualizationService {
  // Cell dimensions
  private readonly CELL_WIDTH = 120;
  private readonly CELL_HEIGHT = 80;
  private readonly GPIO_WIDTH = 100;
  private readonly GPIO_HEIGHT = 50;
  private readonly PADDING = 80;
  private readonly GRID_SIZE = 10;
  
  constructor() {}

  /**
   * Generate an FPGA layout from a JSON design
   */
  generateLayout(design: any): FpgaLayout {
    if (!design || !design.cells || !design.external_wires || !design.interconnects) {
      throw new Error('Invalid design format');
    }

    // First, create the cells and IO components
    const cells: FpgaCell[] = [];
    const externalWires: ExternalWire[] = [];
    
    // Group external wires by type
    const inputs = design.external_wires.filter((wire: any) => wire.type === 'input');
    const outputs = design.external_wires.filter((wire: any) => wire.type === 'output');
    
    // Place inputs on left, cells in middle, outputs on right
    // Calculate grid positions
    let gridY = this.PADDING;
    
    // Place input wires on the left
    for (let i = 0; i < inputs.length; i++) {
      const wire = inputs[i];
      externalWires.push({
        id: `ext_${wire.name}`,
        name: wire.name,
        type: wire.type,
        x: this.PADDING,
        y: gridY,
        width: this.GPIO_WIDTH,
        height: this.GPIO_HEIGHT
      });
      gridY += this.GPIO_HEIGHT + this.PADDING;
    }
    
    // Reset y for cells which will be in the center
    gridY = this.PADDING;
    const cellX = 3 * this.PADDING + this.GPIO_WIDTH;
    
    // Place cells in middle
    for (let i = 0; i < design.cells.length; i++) {
      const cell = design.cells[i];
      cells.push({
        id: `cell_${cell.name}`,
        name: cell.name,
        type: cell.type,
        x: cellX,
        y: gridY,
        width: this.CELL_WIDTH,
        height: this.CELL_HEIGHT,
        connections: cell.connections,
        initialState: cell.initial_state
      });
      gridY += this.CELL_HEIGHT + this.PADDING;
    }
    
    // Reset y for output wires on the right
    gridY = this.PADDING;
    const outputX = 5 * this.PADDING + this.GPIO_WIDTH + this.CELL_WIDTH;
    
    // Place output wires on the right
    for (let i = 0; i < outputs.length; i++) {
      const wire = outputs[i];
      externalWires.push({
        id: `ext_${wire.name}`,
        name: wire.name,
        type: wire.type,
        x: outputX,
        y: gridY,
        width: this.GPIO_WIDTH,
        height: this.GPIO_HEIGHT
      });
      gridY += this.GPIO_HEIGHT + this.PADDING;
    }
    
    // Generate interconnects between components
    const interconnects: Interconnect[] = this.createInterconnects(
      design.interconnects, 
      cells, 
      externalWires
    );
    
    // Calculate overall dimensions
    const maxX = outputs.length ? outputX + this.GPIO_WIDTH + this.PADDING : 
                                  cellX + this.CELL_WIDTH + this.PADDING;
    const maxY = Math.max(
      inputs.length * (this.GPIO_HEIGHT + this.PADDING),
      cells.length * (this.CELL_HEIGHT + this.PADDING),
      outputs.length * (this.GPIO_HEIGHT + this.PADDING)
    ) + this.PADDING;
    
    return {
      cells,
      externalWires,
      interconnects,
      dimensions: {
        width: maxX,
        height: maxY
      }
    };
  }
  
  /**
   * Create interconnection routes between components
   */
  private createInterconnects(
    designInterconnects: any[], 
    cells: FpgaCell[], 
    externalWires: ExternalWire[]
  ): Interconnect[] {
    const result: Interconnect[] = [];
    
    for (const ic of designInterconnects) {
      const { input, output } = ic.connections;
      
      // Find source and target components
      const [sourceComponent, sourcePort] = this.findComponentAndPort(input, cells, externalWires);
      const [targetComponent, targetPort] = this.findComponentAndPort(output, cells, externalWires);
      
      if (!sourceComponent || !targetComponent) {
        console.warn(`Could not find components for interconnect ${ic.name}`);
        continue;
      }
      
      // Create route points
      const points = this.generateRoute(sourceComponent, targetComponent);
      
      result.push({
        id: `interconnect_${ic.name}`,
        name: ic.name,
        sourceId: sourceComponent.id,
        sourcePort,
        targetId: targetComponent.id,
        targetPort,
        points,
        delay: ic.propagation_delay
      });
    }
    
    return result;
  }
  
  /**
   * Find component and its port based on port name
   */
  private findComponentAndPort(
    portName: string, 
    cells: FpgaCell[], 
    externalWires: ExternalWire[]
  ): [FpgaCell | ExternalWire | null, string] {
    // First check cells
    for (const cell of cells) {
      for (const [port, conn] of Object.entries(cell.connections)) {
        if (conn === portName) {
          return [cell, port];
        }
      }
    }
    
    // Check external wires (they don't have ports, use name directly)
    for (const wire of externalWires) {
      if (wire.name === portName) {
        return [wire, 'connection'];
      }
    }
    
    return [null, ''];
  }
  
  /**
   * Generate a route between two components with clean right angles
   */
  private generateRoute(source: FpgaCell | ExternalWire, target: FpgaCell | ExternalWire): Point[] {
    const points: Point[] = [];
    
    // Source connection point (right side for inputs/cells, left side for outputs)
    const sourceX = source.type === 'output' ? source.x : source.x + source.width;
    const sourceY = source.y + source.height / 2;
    points.push({ x: sourceX, y: sourceY });
    
    // Middle point for connector box
    const midX = (sourceX + (target.type === 'input' ? target.x : target.x)) / 2;
    
    // If source and target are not directly in line, create orthogonal path
    if (Math.abs(sourceY - (target.y + target.height / 2)) > 5) {
      // Horizontal line from source
      points.push({ x: midX, y: sourceY });
      
      // Vertical line to target height
      points.push({ x: midX, y: target.y + target.height / 2 });
    } else {
      // Simple middle point if aligned
      points.push({ x: midX, y: sourceY });
    }
    
    // Target connection point (left side for cells/outputs, right side for inputs)
    const targetX = target.type === 'input' ? target.x + target.width : target.x;
    const targetY = target.y + target.height / 2;
    
    // If we need another horizontal segment
    if (Math.abs(midX - targetX) > 5) {
      points.push({ x: targetX, y: targetY });
    }
    
    return points;
  }
  
  /**
   * Get the state color for cells and wires
   */
  getCellStateColor(state: string): string {
    switch (state) {
      case '1': return '#ff6666'; // Red for high
      case '0': return '#6666ff'; // Blue for low
      default: return '#aaaaaa';  // Gray for undefined
    }
  }
}