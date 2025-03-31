import { Injectable, OnDestroy } from '@angular/core';
import * as d3 from 'd3';
import { ComponentData, RendererContext } from '../models/visualization.model';
import { ComponentTemplate, ComponentTemplates, Pin } from '../models/component-templates.model';

// Declare custom event to TypeScript
declare global {
  interface DocumentEventMap {
    'component-moved': CustomEvent<{component: ComponentData}>;
  }
}

export interface ConnectionData {
  id: string;
  source: {
    component: ComponentData;
    pin: Pin;
  };
  target: {
    component: ComponentData;
    pin: Pin;
  };
  type: string;
}

@Injectable({
  providedIn: 'root'
})
export class ConnectionService implements OnDestroy {
  private connectionListener: any;
  private currentContext: RendererContext | null = null;
  private currentComponents: ComponentData[] = [];
  private currentConnections: ConnectionData[] = [];
  private rafId: number | null = null;
  private pendingUpdate: boolean = false;
  
  constructor() {
    // Fix the custom event listener
    this.connectionListener = this.handleComponentMoved.bind(this);
    document.addEventListener('component-moved', this.connectionListener as EventListener);
  }
  
  ngOnDestroy() {
    document.removeEventListener('component-moved', this.connectionListener as EventListener);
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
    }
  }
  
  renderConnections(
    context: RendererContext,
    components: ComponentData[],
    connections: ConnectionData[]
  ): void {
    // Store current state for redrawing
    this.currentContext = context;
    this.currentComponents = components;
    this.currentConnections = connections;
    
    this.doRenderConnections();
  }
  
  private doRenderConnections(): void {
    if (!this.currentContext || !this.currentComponents || !this.currentConnections) {
      return;
    }
    
    const { svg } = this.currentContext;
    
    // Create a group for connections if it doesn't exist yet
    let connectionGroup: d3.Selection<any, unknown, null, undefined> = svg.select('.connections');
    if (connectionGroup.empty()) {
      // Add a type assertion to fix the incompatible selection type
      connectionGroup = svg.insert('g', ':first-child')
        .attr('class', 'connections') as unknown as d3.Selection<any, unknown, null, undefined>;
    } else {
      // Clear existing connections
      connectionGroup.selectAll('*').remove();
    }
      
    // Draw each connection
    this.currentConnections.forEach(connection => {
      this.drawConnection(connectionGroup, connection);
    });
  }
  
  extractConnections(designData: any, components: ComponentData[]): ConnectionData[] {
    const connections: ConnectionData[] = [];
    let missingConnections = 0;
    
    // Special handling for this JSON format with interconnects
    if (designData && designData.interconnects) {
      console.log(`Processing ${designData.interconnects.length} interconnects from JSON`);
      
      for (const interconnect of designData.interconnects) {
        // Find the actual components for this connection
        const sourceId = interconnect.connections.input;
        const targetId = interconnect.connections.output;
        
        console.log(`Mapping interconnect: ${interconnect.name} (${sourceId} → ${targetId})`);
        
        // Look for the actual components and pins
        const source = this.findComponentAndPin(sourceId, components);
        const target = this.findComponentAndPin(targetId, components);
        
        if (source && target) {
          connections.push({
            id: interconnect.name,
            source: source,
            target: target,
            type: this.determineConnectionType(sourceId, targetId)
          });
          console.log(`✓ Created connection: ${sourceId} → ${targetId}`);
        } else {
          missingConnections++;
          console.warn(`✗ Failed to create connection: ${sourceId} → ${targetId}`);
          if (!source) console.warn(`  - Could not find source: ${sourceId}`);
          if (!target) console.warn(`  - Could not find target: ${targetId}`);
        }
      }
      
      console.log(`Created ${connections.length} connections, ${missingConnections} failed`);
    }
    
    // If no connections found via interconnects, try original approach
    if (connections.length === 0 && designData.connections) {
      // Original connection extraction...
    }
    
    // If still no connections, create example connections
    if (connections.length === 0) {
      this.createExampleConnections(components, connections);
    }
    
    return connections;
  }
  
  // Helper to find component and pin from a connection ID
  private findComponentAndPin(connectionId: string, components: ComponentData[]): 
      {component: ComponentData, pin: Pin} | null {
    
    // CASE 1: External wire handling (e.g., ext_input_D)
    const externalWire = components.find(c => 
      c.id === connectionId && c.type.toLowerCase().includes('wire'));
    
    if (externalWire) {
      const template = ComponentTemplates.getTemplateForComponent(externalWire);
      // For input wires, use their output pin; for output wires, use their input pin
      const pin = externalWire.type.toLowerCase().includes('input') ?
        template.pins.find(p => p.type === 'output') :
        template.pins.find(p => p.type === 'input');
        
      if (pin) return { component: externalWire, pin };
      return null;
    }
    
    // CASE 2: Cell endpoint handling (e.g., dff_1_D, lut_k_2_in_0)
    // First check if the connection point belongs to a DFF
    if (connectionId.includes('dff_')) {
      // Extract the DFF component name (e.g., "dff_1" from "dff_1_D")
      const dffName = connectionId.match(/(dff_\d+)/)?.[1];
      const pinName = connectionId.replace(`${dffName}_`, '');
      
      if (dffName) {
        const dff = components.find(c => c.id === dffName);
        if (dff) {
          const template = ComponentTemplates.getTemplateForComponent(dff);
          // Map pin names: D→input, Q→output, clock→clock
          let pinId: string;
          switch (pinName.toLowerCase()) {
            case 'd': pinId = 'D'; break;
            case 'q': pinId = 'Q'; break;
            case 'clock': pinId = 'CLK'; break;
            default: pinId = pinName;
          }
          const pin = template.pins.find(p => p.id === pinId);
          if (pin) return { component: dff, pin };
        }
      }
    }
    
    // CASE 3: LUT endpoint handling (e.g., lut_k_1_out, lut_k_2_in_0)
    if (connectionId.includes('lut_k_')) {
      // Extract the LUT component name (e.g., "lut_k_1" from "lut_k_1_out")
      const lutName = connectionId.match(/(lut_k_\d+)/)?.[1];
      const pinPart = connectionId.replace(`${lutName}_`, '');
      
      if (lutName) {
        const lut = components.find(c => c.id === lutName);
        if (lut) {
          const template = ComponentTemplates.getTemplateForComponent(lut);
          // Map pin names: in_0..in_N→input pins, out→output pin
          let pin: Pin | undefined;
          if (pinPart === 'out') {
            pin = template.pins.find(p => p.type === 'output');
          } else if (pinPart.startsWith('in_')) {
            // Find the corresponding input pin by index
            const inputIndex = parseInt(pinPart.replace('in_', ''), 10);
            // Get all input pins and select the one at the correct index
            const inputPins = template.pins.filter(p => p.type === 'input');
            pin = inputPins[inputIndex];
          }
          if (pin) return { component: lut, pin };
        }
      }
    }
    
    // CASE 4: Fall back to general component_pin pattern
    const parts = connectionId.split('_');
    
    if (parts.length >= 2) {
      const pinName = parts[parts.length - 1];
      const componentId = parts.slice(0, -1).join('_');
      
      const component = components.find(c => c.id === componentId);
      if (component) {
        const template = ComponentTemplates.getTemplateForComponent(component);
        const pin = template.pins.find(p => p.id === pinName || p.name === pinName);
        if (pin) return { component, pin };
      }
    }
    
    console.warn(`Could not find component and pin for connection ID: ${connectionId}`);
    return null;
  }
  
  // Determine connection type based on names
  private determineConnectionType(sourceId: string, targetId: string): string {
    // Check if this is a clock connection
    if (sourceId.toLowerCase().includes('clk') || 
        sourceId.toLowerCase().includes('clock') ||
        targetId.toLowerCase().includes('clock')) {
      return 'clock';
    }
    
    // Check if this is a reset connection
    if (sourceId.toLowerCase().includes('reset') ||
        sourceId.toLowerCase().includes('async_reset') ||
        targetId.toLowerCase().includes('reset')) {
      return 'control';
    }
    
    // Regular data connection
    return 'data';
  }
  
  private createExampleConnections(components: ComponentData[], connections: ConnectionData[]): void {
    // Find LUTs, DFFs, GPIOs, and external wires
    const luts = components.filter(c => c.type.toLowerCase().includes('lut'));
    const dffs = components.filter(c => c.type.toLowerCase().includes('dff') || c.type.toLowerCase().includes('ff'));
    const gpios = components.filter(c => c.type.toLowerCase().includes('gpio'));
    const wires = components.filter(c => c.type.toLowerCase().includes('wire'));
    
    // Connect input wires to LUTs
    const inputWires = wires.filter(w => w.type.toLowerCase().includes('input'));
    inputWires.forEach((wire, i) => {
      const lut = luts[i % luts.length];
      if (lut) {
        const wireTemplate = ComponentTemplates.getTemplateForComponent(wire);
        const lutTemplate = ComponentTemplates.getTemplateForComponent(lut);
        
        // Get output from wire and first input of LUT
        const wireOut = wireTemplate.pins.find(p => p.type === 'output');
        const lutIn = lutTemplate.pins.find(p => p.type === 'input');
        
        if (wireOut && lutIn) {
          connections.push({
            id: `conn-wire-lut-${i}`,
            source: { component: wire, pin: wireOut },
            target: { component: lut, pin: lutIn },
            type: 'data'
          });
        }
      }
    });
    
    // Connect some LUTs to DFFs (as you already have)
    luts.forEach((lut, i) => {
      const dff = dffs[i % dffs.length];
      if (dff) {
        const lutTemplate = ComponentTemplates.getTemplateForComponent(lut);
        const dffTemplate = ComponentTemplates.getTemplateForComponent(dff);
        
        const outputPin = lutTemplate.pins.find(p => p.type === 'output');
        const inputPin = dffTemplate.pins.find(p => p.id === 'D');
        
        if (outputPin && inputPin) {
          connections.push({
            id: `conn-lut-dff-${i}`,
            source: { component: lut, pin: outputPin },
            target: { component: dff, pin: inputPin },
            type: 'data'
          });
        }
      }
    });
    
    // Connect DFFs to output wires
    const outputWires = wires.filter(w => w.type.toLowerCase().includes('output'));
    dffs.forEach((dff, i) => {
      const wire = outputWires[i % outputWires.length];
      if (wire) {
        const dffTemplate = ComponentTemplates.getTemplateForComponent(dff);
        const wireTemplate = ComponentTemplates.getTemplateForComponent(wire);
        
        const dffOut = dffTemplate.pins.find(p => p.id === 'Q');
        const wireIn = wireTemplate.pins.find(p => p.type === 'input');
        
        if (dffOut && wireIn) {
          connections.push({
            id: `conn-dff-wire-${i}`,
            source: { component: dff, pin: dffOut },
            target: { component: wire, pin: wireIn },
            type: 'data'
          });
        }
      }
    });
    
    // Your existing connections (DFFs to GPIOs)
    dffs.forEach((dff, i) => {
      const gpio = gpios[i % gpios.length];
      if (gpio) {
        const dffTemplate = ComponentTemplates.getTemplateForComponent(dff);
        const gpioTemplate = ComponentTemplates.getTemplateForComponent(gpio);
        
        // Find output pin from DFF (Q)
        const outputPin = dffTemplate.pins.find(p => p.id === 'Q');
        // Find input pin on GPIO
        const inputPin = gpioTemplate.pins.find(p => p.type === 'input');
        
        if (outputPin && inputPin) {
          connections.push({
            id: `conn-dff-gpio-${i}`,
            source: {
              component: dff,
              pin: outputPin
            },
            target: {
              component: gpio,
              pin: inputPin
            },
            type: 'data'
          });
        }
      }
    });
  }
  
  private drawConnection(group: d3.Selection<any, any, any, any>, connection: ConnectionData): void {
    // Calculate pin positions in global coordinates
    const source = this.getPinGlobalPosition(connection.source.component, connection.source.pin);
    const target = this.getPinGlobalPosition(connection.target.component, connection.target.pin);
    
    // Draw connection using curved path that avoids components
    const path = this.createSmartPath(source, target, connection);
    
    // Get styling based on connection type
    const style = this.getConnectionStyle(connection.type);
    
    // Draw the connection with both CSS class and direct attributes
    const pathElement = group.append('path')
      .attr('class', `connection ${connection.type}`)
      .attr('d', path)
      .attr('fill', 'none')
      .attr('stroke', style.stroke)
      .attr('stroke-width', style.strokeWidth)
      .attr('stroke-opacity', 0.8);
      
    // Add dasharray only if needed
    if (style.strokeDasharray) {
      pathElement.attr('stroke-dasharray', style.strokeDasharray);
    }
  }
  
  // Keep this method to provide default styles as attributes
  private getConnectionStyle(connectionType: string): { stroke: string; strokeWidth: number; strokeDasharray: string } {
    switch (connectionType) {
      case 'clock':
        return { stroke: '#FF9800', strokeWidth: 2, strokeDasharray: '5,3' };
      case 'control':
        return { stroke: '#9C27B0', strokeWidth: 2.5, strokeDasharray: '2,2' };
      case 'data':
      default:
        return { stroke: '#2196F3', strokeWidth: 2, strokeDasharray: '' };
    }
  }
  
  private getPinGlobalPosition(component: ComponentData, pin: Pin): { x: number; y: number } {
    // Component position (top-left corner)
    const compPosition = component.position || { x: 0, y: 0 };
    
    // Add pin position relative to component
    return {
      x: compPosition.x + pin.position.x,
      y: compPosition.y + pin.position.y
    };
  }
  
  // Replace simple createPath with a smarter routing algorithm
  private createSmartPath(
    source: { x: number; y: number }, 
    target: { x: number; y: number },
    connection: ConnectionData
  ): string {
    // Get bounding boxes of source and target components
    const sourceBBox = this.getComponentBBox(connection.source.component);
    const targetBBox = this.getComponentBBox(connection.target.component);
    
    // Get all component bounding boxes for obstacle avoidance
    const allComponents = this.currentComponents || [];
    const obstacles = allComponents
      .filter(comp => 
        comp !== connection.source.component && 
        comp !== connection.target.component)
      .map(comp => this.getComponentBBox(comp));
    
    // Determine direction vectors based on pin positions on components
    const sourceDirection = this.getPinDirection(connection.source.pin);
    const targetDirection = this.getPinDirection(connection.target.pin);
    
    // Calculate initial exit and entry points with minimum clearance from component
    const minClearance = 20; // Increased clearance from component in pixels
    
    // Calculate exit point from source component
    const sourceExit = {
      x: source.x + sourceDirection.x * minClearance,
      y: source.y + sourceDirection.y * minClearance
    };
    
    // Calculate entry point to target component
    const targetEntry = {
      x: target.x + targetDirection.x * minClearance,
      y: target.y + targetDirection.y * minClearance
    };

    // Start building the path from the source pin
    let path = `M ${source.x},${source.y} `;
    path += `L ${sourceExit.x},${sourceExit.y} `;
    
    // Find a path from source exit to target entry that avoids all obstacles
    const pathPoints = this.findPathAvoidingObstacles(
      sourceExit, 
      targetEntry, 
      [sourceBBox, targetBBox], 
      obstacles
    );
    
    // Add all intermediate points to the path
    pathPoints.forEach(point => {
      path += `L ${point.x},${point.y} `;
    });
    
    // Connect to the target entry point
    path += `L ${targetEntry.x},${targetEntry.y} `;
    
    // Finally, connect to the exact target pin
    path += `L ${target.x},${target.y}`;
    
    return path;
  }

  // Find a path that avoids obstacles
  private findPathAvoidingObstacles(
    start: { x: number, y: number },
    end: { x: number, y: number },
    ignoreObstacles: { x: number, y: number, width: number, height: number }[],
    allObstacles: { x: number, y: number, width: number, height: number }[]
  ): { x: number, y: number }[] {
    // Padding around obstacles to ensure wires don't get too close
    const padding = 10;
    
    // Expand obstacles by adding padding
    const expandedObstacles = allObstacles.map(obs => ({
      x: obs.x - padding,
      y: obs.y - padding,
      width: obs.width + 2 * padding,
      height: obs.height + 2 * padding
    }));
    
    // We'll use an orthogonal routing approach with waypoints
    const waypoints: { x: number, y: number }[] = [];
    
    // Determine if going horizontally first or vertically first
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const preferHorizontal = Math.abs(dx) > Math.abs(dy);
    
    // Try the preferred direction first
    if (preferHorizontal) {
      // Try horizontal segment first, then vertical
      const horizontalPath = this.tryHorizontalThenVertical(start, end, expandedObstacles, ignoreObstacles);
      if (horizontalPath.length > 0) {
        return horizontalPath;
      }
      
      // If that doesn't work, try vertical then horizontal
      const verticalPath = this.tryVerticalThenHorizontal(start, end, expandedObstacles, ignoreObstacles);
      if (verticalPath.length > 0) {
        return verticalPath;
      }
    } else {
      // Try vertical segment first, then horizontal
      const verticalPath = this.tryVerticalThenHorizontal(start, end, expandedObstacles, ignoreObstacles);
      if (verticalPath.length > 0) {
        return verticalPath;
      }
      
      // If that doesn't work, try horizontal then vertical
      const horizontalPath = this.tryHorizontalThenVertical(start, end, expandedObstacles, ignoreObstacles);
      if (horizontalPath.length > 0) {
        return horizontalPath;
      }
    }
    
    // If simple paths don't work, try a detour
    return this.findDetourPath(start, end, expandedObstacles, ignoreObstacles);
  }

  // Try routing horizontally first, then vertically
  private tryHorizontalThenVertical(
    start: { x: number, y: number },
    end: { x: number, y: number },
    obstacles: { x: number, y: number, width: number, height: number }[],
    ignoreObstacles: { x: number, y: number, width: number, height: number }[]
  ): { x: number, y: number }[] {
    const midpoint = { x: end.x, y: start.y };
    
    // Check if horizontal segment intersects any obstacle
    if (this.segmentIntersectsObstacle(start, midpoint, obstacles, ignoreObstacles) ||
        this.segmentIntersectsObstacle(midpoint, end, obstacles, ignoreObstacles)) {
      return []; // Path not viable
    }
    
    return [midpoint];
  }

  // Try routing vertically first, then horizontally
  private tryVerticalThenHorizontal(
    start: { x: number, y: number },
    end: { x: number, y: number },
    obstacles: { x: number, y: number, width: number, height: number }[],
    ignoreObstacles: { x: number, y: number, width: number, height: number }[]
  ): { x: number, y: number }[] {
    const midpoint = { x: start.x, y: end.y };
    
    // Check if vertical segment intersects any obstacle
    if (this.segmentIntersectsObstacle(start, midpoint, obstacles, ignoreObstacles) ||
        this.segmentIntersectsObstacle(midpoint, end, obstacles, ignoreObstacles)) {
      return []; // Path not viable
    }
    
    return [midpoint];
  }

  // Find a detour path when simple paths don't work
  private findDetourPath(
    start: { x: number, y: number },
    end: { x: number, y: number },
    obstacles: { x: number, y: number, width: number, height: number }[],
    ignoreObstacles: { x: number, y: number, width: number, height: number }[]
  ): { x: number, y: number }[] {
    // Create a grid of potential waypoints
    const waypoints: { x: number, y: number }[] = [];
    
    // Try a three-segment path going upward
    const upMid1 = { x: start.x, y: start.y - 50 };
    const upMid2 = { x: end.x, y: start.y - 50 };
    
    if (!this.segmentIntersectsObstacle(start, upMid1, obstacles, ignoreObstacles) &&
        !this.segmentIntersectsObstacle(upMid1, upMid2, obstacles, ignoreObstacles) &&
        !this.segmentIntersectsObstacle(upMid2, end, obstacles, ignoreObstacles)) {
      return [upMid1, upMid2];
    }
    
    // Try a three-segment path going downward
    const downMid1 = { x: start.x, y: start.y + 50 };
    const downMid2 = { x: end.x, y: start.y + 50 };
    
    if (!this.segmentIntersectsObstacle(start, downMid1, obstacles, ignoreObstacles) &&
        !this.segmentIntersectsObstacle(downMid1, downMid2, obstacles, ignoreObstacles) &&
        !this.segmentIntersectsObstacle(downMid2, end, obstacles, ignoreObstacles)) {
      return [downMid1, downMid2];
    }
    
    // Try a three-segment path going leftward
    const leftMid1 = { x: start.x - 50, y: start.y };
    const leftMid2 = { x: start.x - 50, y: end.y };
    
    if (!this.segmentIntersectsObstacle(start, leftMid1, obstacles, ignoreObstacles) &&
        !this.segmentIntersectsObstacle(leftMid1, leftMid2, obstacles, ignoreObstacles) &&
        !this.segmentIntersectsObstacle(leftMid2, end, obstacles, ignoreObstacles)) {
      return [leftMid1, leftMid2];
    }
    
    // Try a three-segment path going rightward
    const rightMid1 = { x: start.x + 50, y: start.y };
    const rightMid2 = { x: start.x + 50, y: end.y };
    
    if (!this.segmentIntersectsObstacle(start, rightMid1, obstacles, ignoreObstacles) &&
        !this.segmentIntersectsObstacle(rightMid1, rightMid2, obstacles, ignoreObstacles) &&
        !this.segmentIntersectsObstacle(rightMid2, end, obstacles, ignoreObstacles)) {
      return [rightMid1, rightMid2];
    }
    
    // If all else fails, route the wire through a very long detour
    // (add even more waypoints to create a path far from all components)
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const distanceMultiplier = 150;
    
    // Create a rectangular path far outside normal component areas
    return [
      { x: start.x, y: start.y - distanceMultiplier },
      { x: start.x + dx/2 + Math.sign(dx) * distanceMultiplier, y: start.y - distanceMultiplier },
      { x: start.x + dx/2 + Math.sign(dx) * distanceMultiplier, y: end.y + distanceMultiplier },
      { x: end.x, y: end.y + distanceMultiplier }
    ];
  }

  // Check if a line segment intersects with a rectangle
  private segmentIntersectsObstacle(
    p1: { x: number, y: number },
    p2: { x: number, y: number },
    obstacles: { x: number, y: number, width: number, height: number }[],
    ignoreObstacles: { x: number, y: number, width: number, height: number }[]
  ): boolean {
    // Skip checking obstacles in the ignore list (usually source and target components)
    const obstaclesFiltered = obstacles.filter(obs => 
      !ignoreObstacles.some(ignore => 
        obs.x === ignore.x && obs.y === ignore.y && obs.width === ignore.width && obs.height === ignore.height
      )
    );
    
    return obstaclesFiltered.some(obstacle => {
      // Fast check: if segment is completely outside the obstacle's bounding box
      const minX = Math.min(p1.x, p2.x);
      const maxX = Math.max(p1.x, p2.x);
      const minY = Math.min(p1.y, p2.y);
      const maxY = Math.max(p1.y, p2.y);
      
      if (maxX < obstacle.x || minX > obstacle.x + obstacle.width ||
          maxY < obstacle.y || minY > obstacle.y + obstacle.height) {
        return false;
      }
      
      // For horizontal or vertical segments, check if they pass through the obstacle
      const isHorizontal = p1.y === p2.y;
      const isVertical = p1.x === p2.x;
      
      if (isHorizontal) {
        return p1.y >= obstacle.y && p1.y <= obstacle.y + obstacle.height &&
               Math.max(p1.x, p2.x) >= obstacle.x && Math.min(p1.x, p2.x) <= obstacle.x + obstacle.width;
      }
      
      if (isVertical) {
        return p1.x >= obstacle.x && p1.x <= obstacle.x + obstacle.width &&
               Math.max(p1.y, p2.y) >= obstacle.y && Math.min(p1.y, p2.y) <= obstacle.y + obstacle.height;
      }
      
      // For diagonal segments, check all four edges of the obstacle
      const edges = [
        { p1: { x: obstacle.x, y: obstacle.y }, p2: { x: obstacle.x + obstacle.width, y: obstacle.y } },
        { p1: { x: obstacle.x + obstacle.width, y: obstacle.y }, p2: { x: obstacle.x + obstacle.width, y: obstacle.y + obstacle.height } },
        { p1: { x: obstacle.x + obstacle.width, y: obstacle.y + obstacle.height }, p2: { x: obstacle.x, y: obstacle.y + obstacle.height } },
        { p1: { x: obstacle.x, y: obstacle.y + obstacle.height }, p2: { x: obstacle.x, y: obstacle.y } }
      ];
      
      return edges.some(edge => this.lineSegmentsIntersect(p1, p2, edge.p1, edge.p2));
    });
  }

  // Check if two line segments intersect
  private lineSegmentsIntersect(
    p1: { x: number, y: number },
    p2: { x: number, y: number },
    p3: { x: number, y: number },
    p4: { x: number, y: number }
  ): boolean {
    // Calculate direction vectors
    const d1x = p2.x - p1.x;
    const d1y = p2.y - p1.y;
    const d2x = p4.x - p3.x;
    const d2y = p4.y - p3.y;
    
    // Calculate the cross product of the two direction vectors
    const denominator = d1y * d2x - d1x * d2y;
    
    // If parallel, they don't intersect
    if (Math.abs(denominator) < 0.0001) {
      return false;
    }
    
    // Calculate intersection parameters
    const d3x = p1.x - p3.x;
    const d3y = p1.y - p3.y;
    
    const t1 = (d2x * d3y - d2y * d3x) / denominator;
    const t2 = (d1x * d3y - d1y * d3x) / denominator;
    
    // Check if intersection point is within both segments
    return t1 >= 0 && t1 <= 1 && t2 >= 0 && t2 <= 1;
  }
  
  private handleComponentMoved(event: Event): void {
    // Cast to CustomEvent to access detail property
    const customEvent = event as CustomEvent<{component: ComponentData}>;
    
    // Use requestAnimationFrame to synchronize visual updates with the browser
    if (!this.pendingUpdate) {
      this.pendingUpdate = true;
      this.rafId = requestAnimationFrame(() => {
        this.doRenderConnections();
        this.pendingUpdate = false;
        this.rafId = null;
      });
    }
  }

  // Add a method to extract cell internal connections
  private extractCellConnections(components: ComponentData[]): ConnectionData[] {
    const connections: ConnectionData[] = [];
    const signalMap = new Map<string, {component: ComponentData, pin: Pin}>();
    
    // First pass: map all connection points to components and pins
    components.forEach(component => {
      if (component.data.connections) {
        const template = ComponentTemplates.getTemplateForComponent(component);
        
        for (const [pinId, signalName] of Object.entries(component.data.connections)) {
          // Find the matching template pin
          const pin = template.pins.find(p => p.id === pinId);
          if (pin && typeof signalName === 'string') {
            signalMap.set(signalName, {component, pin});
          }
        }
      }
    });
    
    // Second pass: create connections
    components.forEach(component => {
      if (component.data.connections) {
        const template = ComponentTemplates.getTemplateForComponent(component);
        
        for (const [pinId, signalName] of Object.entries(component.data.connections)) {
          if (typeof signalName !== 'string') continue;
          
          // Find the matching template pin
          const pin = template.pins.find(p => p.id === pinId);
          
          // Skip if pin not found
          if (!pin) continue;
          
          // Look through all other components to find connections to this signal
          signalMap.forEach((endpoint, sigName) => {
            if (sigName === signalName && !(endpoint.component === component && endpoint.pin === pin)) {
              // Determine direction based on pin types
              const isSource = pin.type === 'output';
              const isTarget = endpoint.pin.type === 'input';
              
              if (isSource && isTarget) {
                connections.push({
                  id: `conn-${component.id}-${pinId}-to-${endpoint.component.id}-${endpoint.pin.id}`,
                  source: {component, pin},
                  target: endpoint,
                  type: this.determineConnectionType(pinId, endpoint.pin.id)
                });
              }
              // If both are inputs or both are outputs, we skip this connection
            }
          });
        }
      }
    });
    
    return connections;
  }

  // Add the missing helper methods to the ConnectionService class

  // Helper function to get component bounding box
  private getComponentBBox(component: ComponentData): { x: number, y: number, width: number, height: number } {
    const position = component.position || { x: 0, y: 0 };
    
    // Get component dimensions from context if available, or use defaults
    let width = 60;
    let height = 40;
    
    if (this.currentContext?.config?.componentSize) {
      width = this.currentContext.config.componentSize.width;
      height = this.currentContext.config.componentSize.height;
    }
    
    return {
      x: position.x,
      y: position.y,
      width,
      height
    };
  }

  // Helper to determine the orientation of a pin relative to its component
  private getPinDirection(pin: Pin): { x: number, y: number } {
    // Default to pointing right
    const direction = { x: 1, y: 0 };
    
    // Adjust based on pin.position relative to component center
    // These thresholds determine when a pin is considered on an edge
    const edgeThreshold = 0.2;
    
    // Get component dimensions from context if available, or use defaults
    let width = 60;
    let height = 40;
    
    if (this.currentContext?.config?.componentSize) {
      width = this.currentContext.config.componentSize.width;
      height = this.currentContext.config.componentSize.height;
    }
    
    // Convert pin position to normalized coordinates (0-1)
    const normalizedX = pin.position.x / width;
    const normalizedY = pin.position.y / height;
    
    // Determine which edge the pin is closest to
    const leftDist = normalizedX;
    const rightDist = 1 - normalizedX;
    const topDist = normalizedY;
    const bottomDist = 1 - normalizedY;
    
    // Find minimum distance to determine which edge the pin is on
    const minDist = Math.min(leftDist, rightDist, topDist, bottomDist);
    
    if (minDist === leftDist) {
      direction.x = -1;
      direction.y = 0;
    } else if (minDist === rightDist) {
      direction.x = 1;
      direction.y = 0;
    } else if (minDist === topDist) {
      direction.x = 0;
      direction.y = -1;
    } else {
      direction.x = 0;
      direction.y = 1;
    }
    
    return direction;
  }
}