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
    // Check if this looks like an FF2 schematic
    const hasFF2Structure = nodes.data().some(d => 
      d.id.includes('ext_input') || 
      d.id.includes('ext_output') || 
      d.id.includes('dff_') || 
      d.id.includes('lut_k_')
    );
    
    if (hasFF2Structure) {
      console.log("Using specialized FF2 schematic layout");
      this.applySchematicLayout(context, nodes, options);
    } else {
      // Use regular layouts
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
    // Initialize positions for all components
    nodes.data().forEach(d => {
      if (!d.position) {
        d.position = { x: 0, y: 0 };
      }
    });

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
    // Initialize positions for all components
    nodes.data().forEach(d => {
      if (!d.position) {
        d.position = { x: 0, y: 0 };
      }
    });

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
    // Initialize positions for all components
    nodes.data().forEach(d => {
      if (!d.position) {
        d.position = { x: 0, y: 0 };
      }
    });

    const { config } = context;
    const width = config.width - config.margin.left - config.margin.right;
    const height = config.height - config.margin.top - config.margin.bottom;
    const compMargin = options.padding;
    
    // Group components by category
    const inputWires = nodes.data().filter(d => d.type.toLowerCase().includes('wire_input'));
    const outputWires = nodes.data().filter(d => d.type.toLowerCase().includes('wire_output'));
    const luts = nodes.data().filter(d => d.type.toLowerCase().includes('lut'));
    const dffs = nodes.data().filter(d => d.type.toLowerCase().includes('dff') || d.type.toLowerCase().includes('ff'));
    const gpios = nodes.data().filter(d => d.type.toLowerCase().includes('gpio'));
    const otherComponents = nodes.data().filter(d => 
        !d.type.toLowerCase().includes('wire') && 
        !d.type.toLowerCase().includes('lut') && 
        !d.type.toLowerCase().includes('dff') && 
        !d.type.toLowerCase().includes('ff') && 
        !d.type.toLowerCase().includes('gpio'));
    
    const compWidth = config.componentSize.width;
    const compHeight = config.componentSize.height;
    
    // Position input wires on the left side
    inputWires.forEach((component, i) => {
      const y = (i + 1) * (height / (inputWires.length + 1));
      
      // Initialize position if it doesn't exist
      if (!component.position) component.position = { x: 0, y: 0 };
      
      // Store position for connections
      component.position.x = compMargin;
      component.position.y = y;
    });
    
    // Position output wires on the right side
    outputWires.forEach((component, i) => {
      const y = (i + 1) * (height / (outputWires.length + 1));
      
      if (!component.position) component.position = { x: 0, y: 0 };
      component.position.x = width - compWidth - compMargin;
      component.position.y = y;
    });
    
    // Position LUTs in the left-center area
    const lutColumns = Math.ceil(Math.sqrt(luts.length));
    luts.forEach((component, i) => {
      const col = i % lutColumns;
      const row = Math.floor(i / lutColumns);
      
      const x = compMargin * 2 + compWidth + col * (compWidth + compMargin);
      const y = height/4 + row * (compHeight + compMargin);
      
      if (!component.position) component.position = { x: 0, y: 0 };
      component.position.x = x;
      component.position.y = y;
    });
    
    // Position DFFs in the center area
    const dffColumns = Math.ceil(Math.sqrt(dffs.length));
    dffs.forEach((component, i) => {
      const col = i % dffColumns;
      const row = Math.floor(i / dffColumns);
      
      const x = width/2 - (dffColumns * (compWidth + compMargin))/2 + col * (compWidth + compMargin);
      const y = height/2 + row * (compHeight + compMargin);
      
      if (!component.position) component.position = { x: 0, y: 0 };
      component.position.x = x;
      component.position.y = y;
    });
    
    // Position GPIOs and other components 
    const remainingComponents = [...gpios, ...otherComponents];
    const remainingColumns = Math.ceil(Math.sqrt(remainingComponents.length));
    remainingComponents.forEach((component, i) => {
      const col = i % remainingColumns;
      const row = Math.floor(i / remainingColumns);
      
      const x = width/2 + col * (compWidth + compMargin);
      const y = height/6 + row * (compHeight + compMargin);
      
      if (!component.position) component.position = { x: 0, y: 0 };
      component.position.x = x;
      component.position.y = y;
    });
    
    // Apply calculated positions
    nodes.attr('transform', (d: any) => {
      // Initialize position if it doesn't exist
      if (!d.position) {
        d.position = { x: 0, y: 0 };
      }
      return `translate(${d.position.x}, ${d.position.y})`;
    });
  }
  
  private applySchematicLayout(
    context: RendererContext,
    nodes: d3.Selection<any, ComponentData, any, any>,
    options: LayoutOptions
  ): void {
    // Initialize positions for all components
    nodes.data().forEach(d => {
      if (!d.position) {
        d.position = { x: 0, y: 0 };
      }
    });

    const { config } = context;
    const width = config.width - config.margin.left - config.margin.right;
    const height = config.height - config.margin.top - config.margin.bottom;
    const compWidth = config.componentSize.width;
    const compHeight = config.componentSize.height;
    const padding = options.padding;
    
    // For FF2 schematics, organize in a clear left-to-right data flow
    const inputWires = nodes.data().filter(d => d.id.includes('ext_input'));
    const outputWires = nodes.data().filter(d => d.id.includes('ext_output'));
    const luts = nodes.data().filter(d => d.id.includes('lut_k'));
    const dffs = nodes.data().filter(d => d.id.includes('dff_'));
    
    console.log(`FF2 layout: ${inputWires.length} inputs, ${luts.length} LUTs, ${dffs.length} DFFs, ${outputWires.length} outputs`);
    
    // Position in columns: inputs → LUTs → DFFs → outputs
    
    // Position input wires on left
    inputWires.forEach((wire, i) => {
      if (!wire.position) wire.position = { x: 0, y: 0 };
      wire.position.x = padding;
      wire.position.y = padding + i * (compHeight + padding);
    });
    
    // Position LUTs in middle-left
    luts.forEach((lut, i) => {
      if (!lut.position) lut.position = { x: 0, y: 0 };
      lut.position.x = compWidth + padding * 3;
      lut.position.y = padding + i * (compHeight + padding);
    });
    
    // Position DFFs in center-right
    dffs.forEach((dff, i) => {
      if (!dff.position) dff.position = { x: 0, y: 0 };
      dff.position.x = compWidth * 2 + padding * 5;
      dff.position.y = padding + i * (compHeight + padding);
    });
    
    // Position output wires on right
    outputWires.forEach((wire, i) => {
      if (!wire.position) wire.position = { x: 0, y: 0 };
      wire.position.x = width - compWidth - padding;
      wire.position.y = padding + i * (compHeight + padding);
    });
    
    // Apply positions
    nodes.attr('transform', (d) => {
      // Add a safety check for position before using it 
      if (!d.position) {
        d.position = { x: 0, y: 0 };
      }
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