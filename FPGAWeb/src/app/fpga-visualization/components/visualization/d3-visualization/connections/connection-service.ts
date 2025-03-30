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
    
    // Draw connection using curved path
    const path = this.createPath(source, target);
    
    // Get styling based on connection type
    const style = this.getConnectionStyle(connection.type);
    
    // Draw the connection with both CSS class and direct attributes
    const pathElement = group.append('path')
      .attr('class', `connection ${connection.type}`)
      .attr('d', path)
      .attr('fill', 'none')
      .attr('stroke', style.stroke)         // Set stroke directly as attribute
      .attr('stroke-width', style.strokeWidth)  // Set width directly
      .attr('stroke-opacity', 0.8);         // Set opacity directly
      
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
  
  private createPath(source: { x: number; y: number }, target: { x: number; y: number }): string {
    // Determine control points for a curved path
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const midX = source.x + dx / 2;
    const midY = source.y + dy / 2;
    
    // Use different curve styles based on placement and direction
    if (Math.abs(dx) > Math.abs(dy) * 2) {
      // Horizontal dominant connection - S curve
      return `M ${source.x},${source.y} 
              C ${midX},${source.y} 
                ${midX},${target.y} 
                ${target.x},${target.y}`;
    } else if (Math.abs(dy) > Math.abs(dx) * 2) {
      // Vertical dominant connection - inverted S curve
      return `M ${source.x},${source.y} 
              C ${source.x},${midY} 
                ${target.x},${midY} 
                ${target.x},${target.y}`;
    } else {
      // Diagonal or balanced - use a gentler curve
      const controlPointOffset = Math.max(Math.abs(dx), Math.abs(dy)) * 0.5;
      
      // Determine control point directions based on relative positions
      const cp1x = source.x + Math.sign(dx) * controlPointOffset;
      const cp1y = source.y;
      const cp2x = target.x - Math.sign(dx) * controlPointOffset;
      const cp2y = target.y;
      
      return `M ${source.x},${source.y} 
              C ${cp1x},${cp1y} 
                ${cp2x},${cp2y} 
                ${target.x},${target.y}`;
    }
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
}