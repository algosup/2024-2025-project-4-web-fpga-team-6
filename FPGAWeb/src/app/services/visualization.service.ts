import { Injectable } from '@angular/core';
import { COMPONENT_CONFIGS, ComponentConfig } from '../models/component-config.model';

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
  properties?: any;
  connectionPoints?: Record<string, {x: number, y: number}>;
}

interface ExternalWire {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  connectionPoints?: Record<string, {x: number, y: number}>;
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
  animationProgress?: number;
  lastSignalState?: string;
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
  // Component cache to store loaded SVGs
  private svgCache: Map<string, HTMLImageElement> = new Map();
  
  constructor() {
    // Preload SVGs for smoother rendering
    this.preloadComponentSVGs();
  }
  
  private preloadComponentSVGs(): void {
    Object.values(COMPONENT_CONFIGS).forEach(config => {
      const img = new Image();
      img.src = config.svgPath;
      img.onload = () => {
        this.svgCache.set(config.type, img);
      };
    });
  }
  
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
    
    // Use improved positioning algorithm that creates a multi-column layout
    // for designs with many components
    const maxCellsInColumn = 5;
    
    // Position input wires in a column on the left
    let gridY = 60;
    let gridX = 60;
    
    // Place input wires on the left side
    for (let i = 0; i < inputs.length; i++) {
      const wire = inputs[i];
      const config = COMPONENT_CONFIGS['input'];
      
      externalWires.push({
        id: `ext_${wire.name}`,
        name: wire.name,
        type: wire.type,
        x: gridX,
        y: gridY,
        width: config.width,
        height: config.height,
        connectionPoints: this.getConnectionPoints(config, gridX, gridY)
      });
      gridY += config.height + 40;
      
      // Start a new column if we reach the max cells per column
      if ((i + 1) % maxCellsInColumn === 0) {
        gridY = 60;
        gridX += 200;
      }
    }
    
    // Reset for cells
    gridY = 60;
    gridX = Math.max(300, gridX + 200); // Position cells to the right of inputs
    
    const cellStartX = gridX;
    
    // Place cells in middle columns
    for (let i = 0; i < design.cells.length; i++) {
      const cell = design.cells[i];
      // Get configuration for this cell type or use default
      const config = COMPONENT_CONFIGS[cell.type] || {
        type: cell.type,
        svgPath: 'assets/generic_component.svg',
        width: 120,
        height: 80,
        connections: Object.keys(cell.connections).map((key, index, arr) => {
          // Create default connection points based on connection names
          const side = index < arr.length / 2 ? 'left' : 'right';
          const y = side === 'left' 
            ? 0.2 + (0.6 * index / (arr.length / 2)) 
            : 0.2 + (0.6 * (index - Math.floor(arr.length / 2)) / (arr.length - Math.floor(arr.length / 2)));
          return {
            id: key,
            x: side === 'left' ? 0 : 1,
            y,
            side,
            label: key
          };
        })
      };
      
      cells.push({
        id: `cell_${cell.name}`,
        name: cell.name,
        type: cell.type,
        x: gridX,
        y: gridY,
        width: config.width,
        height: config.height,
        connections: cell.connections,
        initialState: cell.initial_state,
        properties: cell, // Store original cell properties
        connectionPoints: this.getConnectionPoints(config, gridX, gridY)
      });
      
      // Move down for next cell
      gridY += config.height + 60;
      
      // Start a new column if we reach the max cells per column
      if ((i + 1) % maxCellsInColumn === 0) {
        gridY = 60;
        gridX += 220;
      }
    }
    
    // Reset for outputs
    gridY = 60;
    gridX = Math.max(gridX + 220, cellStartX + 400); // Position outputs to the right of cells
    
    // Place output wires on the right
    for (let i = 0; i < outputs.length; i++) {
      const wire = outputs[i];
      const config = COMPONENT_CONFIGS['output'];
      
      externalWires.push({
        id: `ext_${wire.name}`,
        name: wire.name,
        type: wire.type,
        x: gridX,
        y: gridY,
        width: config.width,
        height: config.height,
        connectionPoints: this.getConnectionPoints(config, gridX, gridY)
      });
      
      gridY += config.height + 40;
      
      // Start a new column if we reach the max cells per column
      if ((i + 1) % maxCellsInColumn === 0) {
        gridY = 60;
        gridX += 200;
      }
    }
    
    // Generate optimized interconnects between components
    const interconnects: Interconnect[] = this.createInterconnects(
      design.interconnects, 
      cells, 
      externalWires
    );
    
    // Calculate overall dimensions
    const maxX = gridX + 200; // Add padding
    const maxY = Math.max(
      inputs.length > 0 ? gridY + 80 : 0,
      cells.length > 0 ? gridY + 80 : 0,
      outputs.length > 0 ? gridY + 80 : 0
    );
    
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
  
  // Get actual positions of connection points based on component config
  private getConnectionPoints(config: ComponentConfig, x: number, y: number): Record<string, {x: number, y: number}> {
    const result: Record<string, {x: number, y: number}> = {};
    
    config.connections.forEach(conn => {
      let connX = x;
      let connY = y;
      
      // Position based on side
      switch (conn.side) {
        case 'left':
          connX = x;
          connY = y + config.height * conn.y;
          break;
        case 'right':
          connX = x + config.width;
          connY = y + config.height * conn.y;
          break;
        case 'top':
          connX = x + config.width * conn.x;
          connY = y;
          break;
        case 'bottom':
          connX = x + config.width * conn.x;
          connY = y + config.height;
          break;
      }
      
      result[conn.id] = {x: connX, y: connY};
    });
    
    return result;
  }
  
  // Method to create optimized interconnects with fewer crossings
  private createInterconnects(
    designInterconnects: any[], 
    cells: FpgaCell[], 
    externalWires: ExternalWire[]
  ): Interconnect[] {
    const result: Interconnect[] = [];
    
    // Build a connection point lookup table
    const connectionPoints = new Map<string, {component: FpgaCell | ExternalWire, point: {x: number, y: number}}>();
    
    // Add cell connection points
    cells.forEach(cell => {
      Object.entries(cell.connections).forEach(([port, connName]) => {
        // If the cell has a defined connection point for this port
        if (cell.connectionPoints && cell.connectionPoints[port]) {
          connectionPoints.set(connName, {
            component: cell,
            point: cell.connectionPoints[port]
          });
        }
      });
    });
    
    // Add external wire connection points
    externalWires.forEach(wire => {
      // For inputs, the output connection is the one to use
      if (wire.type === 'input' && wire.connectionPoints?.['output']) {
        connectionPoints.set(wire.name, {
          component: wire,
          point: wire.connectionPoints['output']
        });
      }
      // For outputs, the input connection is the one to use
      else if (wire.type === 'output' && wire.connectionPoints?.['input']) {
        connectionPoints.set(wire.name, {
          component: wire,
          point: wire.connectionPoints['input']
        });
      }
    });
    
    // Create interconnects with better routing
    for (const ic of designInterconnects) {
      const { input, output } = ic.connections;
      
      // Find source and target connection points
      const source = connectionPoints.get(input);
      const target = connectionPoints.get(output);
      
      if (!source || !target) {
        console.warn(`Could not find connection points for interconnect ${ic.name}`);
        continue;
      }
      
      // Generate optimized route
      const points = this.generateOptimizedRoute(source.point, target.point);
      
      result.push({
        id: `interconnect_${ic.name}`,
        name: ic.name,
        sourceId: source.component.id,
        sourcePort: input,
        targetId: target.component.id,
        targetPort: output,
        points,
        delay: parseFloat(ic.propagation_delay || '0'),
        animationProgress: 0, // For animation
        lastSignalState: '0', // For signal state tracking
      });
    }
    
    return result;
  }
  
  // Generate a route with nice curves and minimal crossings
  private generateOptimizedRoute(source: {x: number, y: number}, target: {x: number, y: number}): Point[] {
    const points: Point[] = [];
    
    // Add source point
    points.push({ x: source.x, y: source.y });
    
    // Determine if we need to go horizontal or vertical first
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const isHorizontalFirst = Math.abs(dx) > Math.abs(dy);
    
    // Calculate midpoints for the path
    if (isHorizontalFirst) {
      // Go horizontal first
      const midX = source.x + dx * 0.5;
      points.push({ x: midX, y: source.y });
      points.push({ x: midX, y: target.y });
    } else {
      // Go vertical first
      const midY = source.y + dy * 0.5;
      points.push({ x: source.x, y: midY });
      points.push({ x: target.x, y: midY });
    }
    
    // Add target point
    points.push({ x: target.x, y: target.y });
    
    return points;
  }
  
  // Get an SVG element for a component
  getSVGForComponent(type: string): HTMLImageElement | null {
    return this.svgCache.get(type) || null;
  }
  
  // Get the state color for cells and wires with effects
  getCellStateColor(state: string): string {
    switch (state) {
      case '1': return '#ff5050'; // Bright red for high
      case '0': return '#4d79ff'; // Bright blue for low
      default: return '#aaaaaa';  // Gray for undefined
    }
  }
  
  // Get glow effect parameters for a state
  getStateGlow(state: string): { color: string; blur: number; } {
    switch (state) {
      case '1': return { color: 'rgba(255, 80, 80, 0.8)', blur: 15 };
      case '0': return { color: 'rgba(77, 121, 255, 0.8)', blur: 10 };
      default: return { color: 'rgba(170, 170, 170, 0.3)', blur: 5 };
    }
  }
}