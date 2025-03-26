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
  
  constructor() {
    // Fix the custom event listener
    this.connectionListener = this.handleComponentMoved.bind(this);
    document.addEventListener('component-moved', this.connectionListener as EventListener);
  }
  
  ngOnDestroy() {
    document.removeEventListener('component-moved', this.connectionListener as EventListener);
  }
  
  renderConnections(
    context: RendererContext,
    components: ComponentData[],
    connections: ConnectionData[]
  ): void {
    const { svg } = context;
    
    // Clear existing connections
    svg.selectAll('.connection').remove();
    
    // Create a group for connections (render below components)
    const connectionGroup = svg.insert('g', ':first-child')
      .attr('class', 'connections');
      
    // Draw each connection
    connections.forEach(connection => {
      this.drawConnection(connectionGroup, connection);
    });
  }
  
  extractConnections(designData: any, components: ComponentData[]): ConnectionData[] {
    const connections: ConnectionData[] = [];
    
    // Check if we have connections in the design data
    if (designData && designData.connections) {
      designData.connections.forEach((conn: any, index: number) => {
        // Find source and target components
        const sourceComponent = components.find(c => c.id === conn.source.component);
        const targetComponent = components.find(c => c.id === conn.target.component);
        
        if (sourceComponent && targetComponent) {
          // Get templates for the components
          const sourceTemplate = ComponentTemplates.getTemplateForComponent(sourceComponent);
          const targetTemplate = ComponentTemplates.getTemplateForComponent(targetComponent);
          
          // Find matching pins
          const sourcePin = sourceTemplate.pins.find(p => p.id === conn.source.pin);
          const targetPin = targetTemplate.pins.find(p => p.id === conn.target.pin);
          
          if (sourcePin && targetPin) {
            connections.push({
              id: `conn-${index}`,
              source: {
                component: sourceComponent,
                pin: sourcePin
              },
              target: {
                component: targetComponent,
                pin: targetPin
              },
              type: conn.type || 'data'
            });
          }
        }
      });
    } else {
      // If no connections data, create some example connections
      // In a real app, you'd extract this from the actual data structure
      this.createExampleConnections(components, connections);
    }
    
    return connections;
  }
  
  private createExampleConnections(components: ComponentData[], connections: ConnectionData[]): void {
    // Find LUTs and DFFs for example connections
    const luts = components.filter(c => c.type.toLowerCase().includes('lut'));
    const dffs = components.filter(c => c.type.toLowerCase().includes('dff') || c.type.toLowerCase().includes('ff'));
    const gpios = components.filter(c => c.type.toLowerCase().includes('gpio'));
    
    // Connect some LUTs to DFFs
    luts.forEach((lut, i) => {
      const dff = dffs[i % dffs.length];
      if (dff) {
        const lutTemplate = ComponentTemplates.getTemplateForComponent(lut);
        const dffTemplate = ComponentTemplates.getTemplateForComponent(dff);
        
        // Find output pin from LUT
        const outputPin = lutTemplate.pins.find(p => p.type === 'output');
        // Find input pin on DFF (D)
        const inputPin = dffTemplate.pins.find(p => p.id === 'D');
        
        if (outputPin && inputPin) {
          connections.push({
            id: `conn-lut-dff-${i}`,
            source: {
              component: lut,
              pin: outputPin
            },
            target: {
              component: dff,
              pin: inputPin
            },
            type: 'data'
          });
        }
      }
    });
    
    // Connect some DFFs to GPIOs
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
    
    // Determine connection style based on type
    const connectionStyle = this.getConnectionStyle(connection.type);
    
    // Draw the connection
    group.append('path')
      .attr('class', `connection ${connection.type}`)
      .attr('d', path)
      .attr('fill', 'none')
      .attr('stroke', connectionStyle.stroke)
      .attr('stroke-width', connectionStyle.strokeWidth)
      .attr('stroke-dasharray', connectionStyle.strokeDasharray);
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
    
    // Use different curve styles based on horizontal distance and vertical separation
    if (Math.abs(dx) > 100) {
      // For longer horizontal distances, use a simple S curve
      return `M ${source.x},${source.y} C ${midX},${source.y} ${midX},${target.y} ${target.x},${target.y}`;
    } else {
      // For shorter distances, use more vertical routing
      const controlPointOffset = Math.max(Math.abs(dx), 30);
      return `M ${source.x},${source.y} 
              C ${source.x + controlPointOffset},${source.y} 
                ${target.x - controlPointOffset},${target.y} 
                ${target.x},${target.y}`;
    }
  }
  
  private getConnectionStyle(type: string): { stroke: string; strokeWidth: number; strokeDasharray: string } {
    switch (type) {
      case 'clock':
        return {
          stroke: '#ff7700',
          strokeWidth: 1.5,
          strokeDasharray: '5,3'
        };
      case 'control':
        return {
          stroke: '#9900cc',
          strokeWidth: 1.5,
          strokeDasharray: '3,2'
        };
      case 'data':
      default:
        return {
          stroke: '#0066cc',
          strokeWidth: 1.5,
          strokeDasharray: ''
        };
    }
  }
  
  private handleComponentMoved(event: Event): void {
    // Cast to CustomEvent to access detail property
    const customEvent = event as CustomEvent<{component: ComponentData}>;
    console.log('Component moved, connections need to be redrawn:', customEvent.detail.component);
  }
}