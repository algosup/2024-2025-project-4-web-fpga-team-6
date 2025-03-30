import { Injectable } from '@angular/core';
import * as d3 from 'd3';
import { ComponentData, RendererContext } from '../models/visualization.model';
import { Pin } from '../models/component-templates.model';
import { VisualizationConfigService, LayoutConfig } from '../config/visualization-config.service';

// Create a type that satisfies d3's simulation node requirements
interface SimulationComponentData extends ComponentData, d3.SimulationNodeDatum {
  // Additional properties will be added by d3
}

export interface LayoutOptions {
  type: 'grid' | 'force' | 'hierarchical';
  padding?: number;
  enableDragging?: boolean;
  // Additional layout-specific options can be added here
}

@Injectable({
  providedIn: 'root'
})
export class LayoutService {
  private draggedNode: any = null;
  
  constructor(private configService: VisualizationConfigService) {}
  
  applyLayout(
    context: RendererContext,
    nodes: d3.Selection<any, ComponentData, any, any>,
    options?: Partial<LayoutOptions>
  ): void {
    // Merge passed options with default configuration
    const layoutConfig = this.configService.layout;
    const mergedOptions: LayoutOptions = {
      type: options?.type || layoutConfig.type,
      padding: options?.padding || layoutConfig.padding,
      enableDragging: options?.enableDragging !== undefined ? options.enableDragging : layoutConfig.enableDragging
    };
    
    // Check if this looks like an FF2 schematic
    const hasFF2Structure = nodes.data().some(d => 
      d.id.includes('ext_input') || 
      d.id.includes('ext_output') || 
      d.id.includes('dff_') || 
      d.id.includes('lut_k_')
    );
    
    if (hasFF2Structure) {
      console.log("Using specialized FF2 schematic layout");
      this.applySchematicLayout(context, nodes, mergedOptions);
    } else {
      // Use regular layouts
      switch (mergedOptions.type) {
        case 'force':
          this.applyForceLayout(context, nodes, mergedOptions);
          break;
        case 'hierarchical':
          this.applyHierarchicalLayout(context, nodes, mergedOptions);
          break;
        case 'grid':
        default:
          this.applyGridLayout(context, nodes, mergedOptions);
          break;
      }
    }
    
    if (mergedOptions.enableDragging) {
      this.enableDragging(nodes);
    }
  }
  
  // Fix the possibly undefined padding and compMargin issues
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
      
      // Initialize velocity if using force layout
      if (!node.vx) node.vx = 0;
      if (!node.vy) node.vy = 0;
    });
    
    // Create a force simulation
    const simulation = d3.forceSimulation(nodesData)
      .force('link', d3.forceLink().distance(options.padding || 30))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(config.componentSize.width / 1.5))
      .on('tick', ticked)
      .on('end', ended);
    
    // Update node positions on each tick of the simulation
    function ticked() {
      // Constrain nodes to the canvas area
      nodesData.forEach(d => {
        // Use a default value of 0 if padding is undefined
        const padding = options.padding || 0; 
        d.x = Math.max(padding, Math.min(width - padding, d.x || 0));
        d.y = Math.max(padding, Math.min(height - padding, d.y || 0));
      });
      
      // Update the position of each node in the DOM
      nodes.attr('transform', (d: ComponentData) => {
        if (!d.position) d.position = { x: 0, y: 0 };
        return `translate(${d.position.x}, ${d.position.y})`;
      });
    }
    
    // When simulation ends
    function ended() {
      console.log('Force layout simulation ended');
    }
    
    // Run the simulation for a fixed number of iterations
    simulation.stop();
    for (let i = 0; i < 300; ++i) simulation.tick();
    ended();
  }

  // Fix the hierarchical layout and schematic layout methods similarly with null checks
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
    const compMargin = options.padding || 30; // Provide default value
    
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
    const padding = options.padding || 20; // Provide default value
    
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
    // Store a reference to the currently dragged element for reliable selection
    let draggedElement: Element | null = null;
    
    const drag = d3.drag<any, ComponentData>()
      .on('start', function(event, d) {
        // Store the actual SVG element being dragged
        draggedElement = this;
        
        // Make this element appear on top of others
        d3.select(this).raise();
        
        // Prevent event from propagating to parent elements
        event.sourceEvent.stopPropagation();
        
        // Initialize position if not set
        if (!d.position) d.position = { x: 0, y: 0 };
        
        // Mark as dragging for CSS
        d3.select(this).classed('dragging', true);
        document.body.classList.add('dragging-active');
      })
      .on('drag', function(event, d) {
        // Make sure we're only moving the component that started the drag
        if (this !== draggedElement) return;
        
        // Make sure position is initialized
        if (!d.position) d.position = { x: 0, y: 0 };
        
        // Update position based on drag
        d.position.x += event.dx;
        d.position.y += event.dy;
        
        // Move the actual SVG element
        d3.select(this).attr('transform', `translate(${d.position.x}, ${d.position.y})`);
        
        // Notify connection service to update connections
        const customEvent = new CustomEvent('component-moved', {
          detail: { component: d }
        });
        document.dispatchEvent(customEvent);
      })
      .on('end', function(event, d) {
        // Clear the dragged element reference
        draggedElement = null;
        
        // Remove dragging classes
        d3.select(this).classed('dragging', false);
        document.body.classList.remove('dragging-active');
      });

    // Apply drag behavior to all nodes
    nodes.call(drag);
    
    // Add CSS for proper dragging behavior if not already added
    if (!document.getElementById('drag-style')) {
      const styleElem = document.createElement('style');
      styleElem.id = 'drag-style';
      styleElem.textContent = `
        .component.dragging {
          z-index: 1000;
          cursor: grabbing !important;
        }
        
        .component {
          cursor: grab;
        }
        
        body.dragging-active .component:not(.dragging) {
          pointer-events: none;
        }
        
        .connections {
          pointer-events: none;
        }
      `;
      document.head.appendChild(styleElem);
    }
  }
}