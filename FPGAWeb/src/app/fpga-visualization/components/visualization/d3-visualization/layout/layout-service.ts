import { Injectable } from '@angular/core';
import * as d3 from 'd3';
import { ComponentData, RendererContext } from '../models/visualization.model';
import { Pin } from '../models/component-templates.model';

// Create a type that satisfies d3's simulation node requirements
interface SimulationComponentData extends ComponentData, d3.SimulationNodeDatum {
  // Additional properties will be added by d3
}

export interface LayoutOptions {
  type: 'grid' | 'force' | 'hierarchical';
  padding: number;
  enableDragging: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class LayoutService {
  private draggedNode: any = null;
  
  applyLayout(
    context: RendererContext,
    nodes: d3.Selection<any, ComponentData, any, any>,
    options: LayoutOptions = { type: 'grid', padding: 30, enableDragging: true }
  ): void {
    switch (options.type) {
      case 'force':
        this.applyForceLayout(context, nodes, options);
        break;
      case 'hierarchical':
        this.applyHierarchicalLayout(context, nodes, options);
        break;
      case 'grid':
      default:
        this.applyGridLayout(context, nodes, options);
        break;
    }
    
    if (options.enableDragging) {
      this.enableDragging(nodes);
    }
  }
  
  private applyGridLayout(
    context: RendererContext,
    nodes: d3.Selection<any, ComponentData, any, any>,
    options: LayoutOptions
  ): void {
    const { config } = context;
    const gridWidth = config.width - config.margin.left - config.margin.right;
    const { width: compWidth, height: compHeight, margin: compMargin } = config.componentSize;
    
    // Calculate how many components can fit in each row
    const componentsPerRow = Math.floor((gridWidth) / (compWidth + compMargin));
    
    nodes.attr('transform', (d: ComponentData, i: number) => {
      const row = Math.floor(i / componentsPerRow);
      const col = i % componentsPerRow;
      
      // Position with margins to prevent cropping
      const x = col * (compWidth + compMargin) + compMargin;
      const y = row * (compHeight + compMargin) + compMargin;
      
      // Store position for connections
      d.position = { x, y };
      
      return `translate(${x}, ${y})`;
    });
  }
  
  private applyForceLayout(
    context: RendererContext,
    nodes: d3.Selection<any, ComponentData, any, any>,
    options: LayoutOptions
  ): void {
    const { config } = context;
    const width = config.width - config.margin.left - config.margin.right;
    const height = config.height - config.margin.top - config.margin.bottom;
    
    // Cast to the combined type that satisfies d3's requirements
    const nodesData = nodes.data() as SimulationComponentData[];
    
    // Initialize position if not already set
    nodesData.forEach(node => {
      if (!node.position) {
        node.position = { x: Math.random() * width, y: Math.random() * height };
      }
      // Explicitly assign properties required by d3.forceSimulation
      node.x = node.position.x;
      node.y = node.position.y;
    });
    
    // Create force simulation with correct typing
    const simulation = d3.forceSimulation<SimulationComponentData>(nodesData)
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(config.componentSize.width / 1.5))
      .force('x', d3.forceX(width / 2).strength(0.1))
      .force('y', d3.forceY(height / 2).strength(0.1));
      
    // Run simulation for a fixed number of ticks to settle positions
    simulation.tick(100);
    
    nodes.attr('transform', (d: any) => {
      // Constrain positions to prevent components from going off-screen
      d.x = Math.max(options.padding, Math.min(width - options.padding, d.x || 0));
      d.y = Math.max(options.padding, Math.min(height - options.padding, d.y || 0));
      
      // Make sure position is initialized
      if (!d.position) d.position = { x: 0, y: 0 };
      
      // Update position for connections
      d.position.x = d.x;
      d.position.y = d.y;
      
      return `translate(${d.position.x}, ${d.position.y})`;
    });
    
    // Stop simulation
    simulation.stop();
  }
  
  private applyHierarchicalLayout(
    context: RendererContext,
    nodes: d3.Selection<any, ComponentData, any, any>,
    options: LayoutOptions
  ): void {
    // For this layout, we need connections data
    // As a fallback, position in a top-down tree structure by component type
    const { config } = context;
    const width = config.width - config.margin.left - config.margin.right;
    
    // Group components by type
    const componentsByType = d3.group(nodes.data(), (d: ComponentData) => d.type);
    
    let y = options.padding;
    
    // Position each type group
    componentsByType.forEach((components, type) => {
      const compWidth = config.componentSize.width;
      const compHeight = config.componentSize.height;
      const compMargin = options.padding;
      
      const componentsPerRow = Math.floor((width) / (compWidth + compMargin));
      
      components.forEach((component, i) => {
        const row = Math.floor(i / componentsPerRow);
        const col = i % componentsPerRow;
        
        const x = col * (compWidth + compMargin) + compMargin;
        const localY = y + row * (compHeight + compMargin);
        
        // Store position for connections
        component.position = { x, y: localY };
      });
      
      // Move y down for next type
      const rowsNeeded = Math.ceil(components.length / componentsPerRow);
      y += rowsNeeded * (compHeight + compMargin) + compMargin * 2;
    });
    
    // Apply calculated positions
    nodes.attr('transform', (d: any) => {
      return `translate(${d.position.x}, ${d.position.y})`;
    });
  }
  
  private enableDragging(nodes: d3.Selection<any, ComponentData, any, any>): void {
    const drag = d3.drag<any, ComponentData>()
      .on('start', (event, d) => {
        this.draggedNode = event.sourceEvent.target;
        
        // Initialize position if not set
        if (!d.position) d.position = { x: 0, y: 0 };
      })
      .on('drag', (event, d) => {
        // Make sure position is initialized
        if (!d.position) d.position = { x: 0, y: 0 };
        
        // Update position based on drag
        d.position.x += event.dx;
        d.position.y += event.dy;
        
        // Update transform
        d3.select(event.sourceEvent.target.closest('.component'))
          .attr('transform', `translate(${d.position.x}, ${d.position.y})`);
          
        // Notify that connections need to be redrawn
        const customEvent = new CustomEvent('component-moved', {
          detail: { component: d }
        });
        document.dispatchEvent(customEvent);
      })
      .on('end', (event, d) => {
        this.draggedNode = null;
      });
      
    nodes.call(drag);
  }
}