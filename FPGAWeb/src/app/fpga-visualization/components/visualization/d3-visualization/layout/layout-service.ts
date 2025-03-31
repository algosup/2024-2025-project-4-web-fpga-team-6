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
    
    // Identify control signals (clock, reset) based on naming patterns
    const clockInputs = inputWires.filter(d => d.id.toLowerCase().includes('clk') || d.id.toLowerCase().includes('clock'));
    const resetInputs = inputWires.filter(d => d.id.toLowerCase().includes('reset') || d.id.toLowerCase().includes('rst'));
    const controlInputs = [...clockInputs, ...resetInputs];
    
    // Filter standard inputs (excluding control signals)
    const dataInputs = inputWires.filter(d => !controlInputs.includes(d));
    
    const compWidth = config.componentSize.width;
    const compHeight = config.componentSize.height;
    
    // Position control signals in dedicated lanes (top and bottom of the design)
    const controlLaneTopY = compMargin / 2;
    const controlLaneBottomY = height - compMargin / 2;
    
    // Position clock signals (top lane)
    clockInputs.forEach((wire, i) => {
      if (!wire.position) wire.position = { x: 0, y: 0 };
      wire.position.x = compMargin + i * (compWidth + compMargin);
      wire.position.y = controlLaneTopY;
      
      // Mark as control signal for styling
      wire.isControlSignal = true;
      wire.controlType = 'clock';
    });
    
    // Position reset signals (bottom lane)
    resetInputs.forEach((wire, i) => {
      if (!wire.position) wire.position = { x: 0, y: 0 };
      wire.position.x = compMargin + i * (compWidth + compMargin);
      wire.position.y = controlLaneBottomY;
      
      // Mark as control signal for styling
      wire.isControlSignal = true;
      wire.controlType = 'reset';
    });
    
    // Create LUT-DFF connection map using regex pattern matching on IDs
    const lutToDffMap = new Map<string, string[]>();
    const dffToLutMap = new Map<string, string>();
    
    luts.forEach(lut => {
      // Extract numbers from LUT IDs like lut_k_1, lut4, etc.
      const lutIdMatch = lut.id.match(/(?:lut|lut_k_|lut_)(\d+)/i);
      if (lutIdMatch) {
        const lutNum = parseInt(lutIdMatch[1]);
        // Find DFFs that might be connected to this LUT
        const connectedDffs = dffs.filter(dff => {
          const dffIdMatch = dff.id.match(/(?:dff|dff_)(\d+)/i);
          return dffIdMatch && parseInt(dffIdMatch[1]) === lutNum;
        }).map(dff => dff.id);
        
        if (connectedDffs.length > 0) {
          lutToDffMap.set(lut.id, connectedDffs);
          connectedDffs.forEach(dffId => {
            dffToLutMap.set(dffId, lut.id);
          });
        }
      }
    });
    
    // Position data input wires on the left side
    dataInputs.forEach((component, i) => {
      const y = compMargin * 2 + (i + 1) * (height / (dataInputs.length + 2));
      
      if (!component.position) component.position = { x: 0, y: 0 };
      component.position.x = compMargin;
      component.position.y = y;
    });
    
    // Position LUTs with connected DFFs on the same row
    const processedLuts = new Set<string>();
    const processedDffs = new Set<string>();
    const rows: Array<{lut: ComponentData, dffs: ComponentData[], y: number}> = [];
    
    // First, create rows for LUTs with connected DFFs
    let rowIndex = 0;
    luts.forEach(lut => {
      const connectedDffIds = lutToDffMap.get(lut.id);
      if (connectedDffIds && connectedDffIds.length > 0) {
        const connectedDffs = dffs.filter(dff => connectedDffIds.includes(dff.id));
        rows.push({
          lut,
          dffs: connectedDffs,
          y: compMargin * 2 + rowIndex * (compHeight + compMargin * 1.5)
        });
        
        processedLuts.add(lut.id);
        connectedDffs.forEach(dff => processedDffs.add(dff.id));
        rowIndex++;
      }
    });
    
    // Position the LUTs and their connected DFFs
    rows.forEach(row => {
      if (!row.lut.position) row.lut.position = { x: 0, y: 0 };
      row.lut.position.x = compMargin * 3 + compWidth;
      row.lut.position.y = row.y;
      
      row.dffs.forEach((dff, i) => {
        if (!dff.position) dff.position = { x: 0, y: 0 };
        dff.position.x = compMargin * 6 + compWidth * 2 + (i * compMargin); // Offset for multiple DFFs
        dff.position.y = row.y;
        
        // Mark clock and reset inputs for styling
        if (dff.connections) {
          Object.entries(dff.connections).forEach(([pinName, connection]) => {
            if (pinName.toLowerCase().includes('clock') || pinName.toLowerCase().includes('clk')) {
              if (!dff.controlConnections) dff.controlConnections = {};
              dff.controlConnections.clock = connection;
            }
            if (pinName.toLowerCase().includes('reset') || pinName.toLowerCase().includes('rst')) {
              if (!dff.controlConnections) dff.controlConnections = {};
              dff.controlConnections.reset = connection;
            }
          });
        }
      });
    });
    
    // Position remaining LUTs in left-center
    const lutColumns = Math.ceil(Math.sqrt(luts.length - processedLuts.size));
    let lutIndex = 0;
    luts.forEach(component => {
      if (!processedLuts.has(component.id)) {
        const col = lutIndex % lutColumns;
        const row = Math.floor(lutIndex / lutColumns);
        
        const x = compMargin * 2 + compWidth + col * (compWidth + compMargin);
        const y = height/4 + row * (compHeight + compMargin);
        
        if (!component.position) component.position = { x: 0, y: 0 };
        component.position.x = x;
        component.position.y = y;
        lutIndex++;
      }
    });
    
    // Position remaining DFFs in center
    const dffColumns = Math.ceil(Math.sqrt(dffs.length - processedDffs.size));
    let dffIndex = 0;
    dffs.forEach(component => {
      if (!processedDffs.has(component.id)) {
        const col = dffIndex % dffColumns;
        const row = Math.floor(dffIndex / dffColumns);
        
        const x = width/2 - (dffColumns * (compWidth + compMargin))/2 + col * (compWidth + compMargin);
        const y = height/2 + row * (compHeight + compMargin);
        
        if (!component.position) component.position = { x: 0, y: 0 };
        component.position.x = x;
        component.position.y = y;
        dffIndex++;
        
        // Mark clock and reset inputs for styling
        if (component.connections) {
          Object.entries(component.connections).forEach(([pinName, connection]) => {
            if (pinName.toLowerCase().includes('clock') || pinName.toLowerCase().includes('clk')) {
              if (!component.controlConnections) component.controlConnections = {};
              component.controlConnections.clock = connection;
            }
            if (pinName.toLowerCase().includes('reset') || pinName.toLowerCase().includes('rst')) {
              if (!component.controlConnections) component.controlConnections = {};
              component.controlConnections.reset = connection;
            }
          });
        }
      }
    });
    
    // Position output wires on the right side
    outputWires.forEach((component, i) => {
      const y = compMargin * 2 + (i + 1) * (height / (outputWires.length + 2));
      
      if (!component.position) component.position = { x: 0, y: 0 };
      component.position.x = width - compWidth - compMargin;
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
      if (!d.position) {
        d.position = { x: 0, y: 0 };
      }
      
      // Store x, y separately for easier access in connection drawing
      d.x = d.position.x;
      d.y = d.position.y;
      
      // Add connection attributes for styling
      if (d.id && (d.id.toLowerCase().includes('clk') || d.id.toLowerCase().includes('clock'))) {
        d.isControlSignal = true;
        d.controlType = 'clock';
      } 
      else if (d.id && (d.id.toLowerCase().includes('reset') || d.id.toLowerCase().includes('rst'))) {
        d.isControlSignal = true;
        d.controlType = 'reset';
      }
      
      return `translate(${d.position.x}, ${d.position.y})`;
    });
    
    // Add a custom event that connection renderers can listen for
    document.dispatchEvent(new CustomEvent('control-signals-identified', {
      detail: { 
        clockInputs: clockInputs.map(d => d.id), 
        resetInputs: resetInputs.map(d => d.id) 
      }
    }));
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
    const { width: compWidth, height: compHeight } = config.componentSize;
    const padding = options.padding || 30; // Use default padding if not specified
    
    // Get components by type
    const inputWires = nodes.data().filter(d => d.id.includes('ext_input'));
    const outputWires = nodes.data().filter(d => d.id.includes('ext_output'));
    const luts = nodes.data().filter(d => d.id.includes('lut_k'));
    const dffs = nodes.data().filter(d => d.id.includes('dff_'));
    
    // Identify control signals (clock, reset) based on naming patterns
    const clockInputs = inputWires.filter(d => d.id.toLowerCase().includes('clk') || d.id.toLowerCase().includes('clock'));
    const resetInputs = inputWires.filter(d => d.id.toLowerCase().includes('reset') || d.id.toLowerCase().includes('rst'));
    const controlInputs = [...clockInputs, ...resetInputs];
    
    // Filter standard inputs (excluding control signals)
    const dataInputs = inputWires.filter(d => !controlInputs.includes(d));
    
    console.log(`FF2 layout: ${inputWires.length} inputs (${dataInputs.length} data, ${controlInputs.length} control), ${luts.length} LUTs, ${dffs.length} DFFs, ${outputWires.length} outputs`);
    
    // Create LUT-DFF connection map
    const lutToDffMap = new Map<string, string[]>();
    const dffToLutMap = new Map<string, string>();
    
    // Extract LUT and DFF ID numbers for connection inference
    luts.forEach(lut => {
      const lutIdMatch = lut.id.match(/lut_k_(\d+)/);
      if (lutIdMatch) {
        const lutNum = parseInt(lutIdMatch[1]);
        // Find DFFs that might be connected to this LUT
        const connectedDffs = dffs.filter(dff => {
          const dffIdMatch = dff.id.match(/dff_(\d+)/);
          return dffIdMatch && parseInt(dffIdMatch[1]) === lutNum;
        }).map(dff => dff.id);
        
        if (connectedDffs.length > 0) {
          lutToDffMap.set(lut.id, connectedDffs);
          connectedDffs.forEach(dffId => {
            dffToLutMap.set(dffId, lut.id);
          });
        }
      }
    });
    
    // Position control signals in dedicated lanes (top and bottom of the schematic)
    const controlLaneTopY = padding / 2; // Top lane for clock
    const controlLaneBottomY = height - padding / 2; // Bottom lane for reset

    // Position clock signals (top lane)
    clockInputs.forEach((wire, i) => {
      if (!wire.position) wire.position = { x: 0, y: 0 };
      wire.position.x = padding + i * (compWidth + padding);
      wire.position.y = controlLaneTopY;
      
      // Mark as control signal for styling
      wire.isControlSignal = true;
      wire.controlType = 'clock';
    });
    
    // Position reset signals (bottom lane)
    resetInputs.forEach((wire, i) => {
      if (!wire.position) wire.position = { x: 0, y: 0 };
      wire.position.x = padding + i * (compWidth + padding);
      wire.position.y = controlLaneBottomY;
      
      // Mark as control signal for styling
      wire.isControlSignal = true;
      wire.controlType = 'reset';
    });
    
    // Position data input wires on left
    dataInputs.forEach((wire, i) => {
      if (!wire.position) wire.position = { x: 0, y: 0 };
      wire.position.x = padding;
      wire.position.y = padding * 2 + i * (compHeight + padding); // Start below control lane
    });
    
    // Position LUTs in middle-left with their connected DFFs at the same level
    const processedDffs = new Set<string>();
    luts.forEach((lut, i) => {
      if (!lut.position) lut.position = { x: 0, y: 0 };
      
      // Position the LUT
      lut.position.x = compWidth + padding * 3;
      lut.position.y = padding * 2 + i * (compHeight + padding * 1.5); // Start below control lane
      
      // Position connected DFFs at the same vertical level
      const connectedDffIds = lutToDffMap.get(lut.id) || [];
      connectedDffIds.forEach((dffId, j) => {
        const dff = dffs.find(d => d.id === dffId);
        if (dff) {
          if (!dff.position) dff.position = { x: 0, y: 0 };
          dff.position.x = compWidth * 2 + padding * 5 + (j * padding); // Add slight offset for multiple DFFs
          
          // Ensure lut.position is defined before accessing y property
          if (!lut.position) lut.position = { x: 0, y: 0 };
          dff.position.y = lut.position.y; // Same vertical level as LUT
          processedDffs.add(dffId);
          
          // Mark clock and reset inputs of DFFs for control signal styling
          if (dff.connections) {
            Object.entries(dff.connections).forEach(([pinName, connection]) => {
              if (pinName.toLowerCase().includes('clock') || pinName.toLowerCase().includes('clk')) {
                if (!dff.controlConnections) dff.controlConnections = {};
                dff.controlConnections.clock = connection;
              }
              if (pinName.toLowerCase().includes('reset') || pinName.toLowerCase().includes('rst')) {
                if (!dff.controlConnections) dff.controlConnections = {};
                dff.controlConnections.reset = connection;
              }
            });
          }
        }
      });
    });
    
    // Position remaining DFFs that don't have identified LUT connections
    let remainingDffIndex = 0;
    dffs.forEach((dff) => {
      if (!processedDffs.has(dff.id)) {
        if (!dff.position) dff.position = { x: 0, y: 0 };
        dff.position.x = compWidth * 2 + padding * 5;
        dff.position.y = padding * 2 + (luts.length + remainingDffIndex) * (compHeight + padding * 1.5);
        remainingDffIndex++;
        
        // Mark clock and reset inputs of DFFs for control signal styling
        if (dff.connections) {
          Object.entries(dff.connections).forEach(([pinName, connection]) => {
            if (pinName.toLowerCase().includes('clock') || pinName.toLowerCase().includes('clk')) {
              if (!dff.controlConnections) dff.controlConnections = {};
              dff.controlConnections.clock = connection;
            }
            if (pinName.toLowerCase().includes('reset') || pinName.toLowerCase().includes('rst')) {
              if (!dff.controlConnections) dff.controlConnections = {};
              dff.controlConnections.reset = connection;
            }
          });
        }
      }
    });
    
    // Position output wires on right
    outputWires.forEach((wire, i) => {
      if (!wire.position) wire.position = { x: 0, y: 0 };
      wire.position.x = width - compWidth - padding;
      wire.position.y = padding * 2 + i * (compHeight + padding); // Start below control lane
    });
    
    // Apply positions
    nodes.attr('transform', (d) => {
      // Add a safety check for position before using it
      if (!d.position) {
        d.position = { x: 0, y: 0 };
      }
      
      // Store x, y separately for easier connection calculations
      d.x = d.position.x;
      d.y = d.position.y;
      
      // Add control signal attributes for styling
      if (d.id && (d.id.toLowerCase().includes('clk') || d.id.toLowerCase().includes('clock'))) {
        d.isControlSignal = true;
        d.controlType = 'clock';
      } 
      else if (d.id && (d.id.toLowerCase().includes('reset') || d.id.toLowerCase().includes('rst'))) {
        d.isControlSignal = true;
        d.controlType = 'reset';
      }
      
      return `translate(${d.position.x}, ${d.position.y})`;
    });
    
    // Add a custom event that connection renderers can listen for
    document.dispatchEvent(new CustomEvent('control-signals-identified', {
      detail: { 
        clockInputs: clockInputs.map(d => d.id), 
        resetInputs: resetInputs.map(d => d.id) 
      }
    }));
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