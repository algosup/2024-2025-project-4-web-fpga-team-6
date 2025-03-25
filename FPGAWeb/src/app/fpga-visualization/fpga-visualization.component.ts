import { Component, OnInit, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';  // Add RouterLink import
import { DesignService, Design } from '../services/design.service';
import { VisualizationService } from '../services/visualization.service'; // Remove the FpgaLayout import
import { FormsModule } from '@angular/forms';
import { COMPONENT_CONFIGS } from '../models/component-config.model'; // Add these imports

// First, let's define a proper interface for the design structure
// Add these interfaces at the top of your file, outside the component class
interface FpgaDesign {
  type: string;
  name: string;
  cells: FpgaDesignCell[];
  external_wires: FpgaDesignExternalWire[];
  interconnects: FpgaDesignInterconnect[];
}

interface FpgaDesignCell {
  name: string;
  type: string;
  connections: Record<string, string>;
  initial_state?: string;
  // Add these properties to support LUT and other component types
  mask?: string;         // For LUT truth table
  K?: number;            // For LUT number of inputs
  properties?: any;      // For additional component properties
}

interface FpgaDesignExternalWire {
  name: string;
  type: string;
}

interface FpgaDesignInterconnect {
  name: string;
  connections: {
    input: string;
    output: string;
  };
  propagation_delay?: number;
}

// Add these visualization model interfaces
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

interface Point {
  x: number;
  y: number;
}

interface FpgaLayout {
  cells: FpgaCell[];
  externalWires: ExternalWire[];
  interconnects: Interconnect[];
  dimensions: { width: number; height: number };
}

/**
 * FpgaVisualizationComponent - Responsible for rendering and simulating FPGA designs
 * 
 * This component handles:
 * 1. Loading and selecting designs from the DesignService
 * 2. Rendering the FPGA layout on HTML5 canvas
 * 3. Running clock-based simulations of the digital circuit
 * 4. User interactions like panning, zooming, and selecting components
 */
@Component({
  selector: 'app-fpga-visualization',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule],  // Add RouterLink to imports
  templateUrl: './fpga-visualization.component.html',
  styleUrl: './fpga-visualization.component.css'
})
export class FpgaVisualizationComponent implements OnInit, AfterViewInit, OnDestroy {
  title = 'FPGA Visualization';
  isRunning = false;
  isPaused = false;
  speed = 1;
  currentExample = '';
  designs: Design[] = [];
  selectedDesign: Design | null = null;
  expandedDesignId: string | null = null;
  
  // Visualization properties
  /** Canvas reference for rendering */
  @ViewChild('visualCanvas') visualCanvas!: ElementRef<HTMLCanvasElement>;
  layout: FpgaLayout | null = null;
  canvasWidth = 800;
  canvasHeight = 600;
  canvasScale = 1;
  isDragging = false;
  dragStartX = 0;
  dragStartY = 0;
  viewOffsetX = 0;
  viewOffsetY = 0;
  highlightedCell: string | null = null;
  showCellDetails = false;
  selectedCellDetails: any = null;
  
  // Simulation state
  simulationStates: Map<string, string> = new Map();
  clockState = '0';
  clockFrequency = 1000000; // 1 MHz
  
  // Add a requestAnimationFrame-based rendering system
  private animationFrameId: number | null = null;

  animating = false; // Add these properties to FpgaVisualizationComponent
  signalAnimations: Map<string, number> = new Map(); // Track signal animations
  lastTimestamp = 0;
  
  constructor(
    private designService: DesignService,
    private visualizationService: VisualizationService
  ) {}

  ngOnInit(): void {
    // Subscribe to designs updates
    this.designService.getDesigns().subscribe(designs => {
      this.designs = designs;
    });
  }
  
  ngAfterViewInit(): void {
    // Initialize canvas when view is ready
    this.setupCanvas();
  }
  
  ngOnDestroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
  
  setupCanvas(): void {
    if (!this.visualCanvas) return;
    
    const canvas = this.visualCanvas.nativeElement;
    canvas.width = this.canvasWidth;
    canvas.height = this.canvasHeight;
    
    // Add event listeners for mouse interactions
    canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    canvas.addEventListener('wheel', this.handleMouseWheel.bind(this));
    canvas.addEventListener('click', this.handleCanvasClick.bind(this));
    
    // Initial render with empty state
    this.renderFPGA();
  }
  
  selectExample(designId: string): void {
    const design = this.designs.find(d => d.id === designId);
    if (design) {
      this.selectedDesign = design;
      this.currentExample = designId;
      this.isRunning = false;
      this.isPaused = false;
      
      // Reset simulation state
      this.simulationStates.clear();
      this.clockState = '0';
      
      // Reset view position
      this.viewOffsetX = 0;
      this.viewOffsetY = 0;
      this.canvasScale = 1;
      
      if (design.jsonContent) {
        console.log('Loading design:', design.name);
        try {
          // Make sure jsonContent is properly parsed
          let parsedContent: FpgaDesign;
          
          if (typeof design.jsonContent === 'string') {
            parsedContent = JSON.parse(design.jsonContent) as FpgaDesign;
          } else {
            parsedContent = design.jsonContent as FpgaDesign;
          }
          
          this.layout = this.visualizationService.generateLayout(parsedContent);
          
          // Update canvas dimensions based on layout
          this.canvasWidth = Math.max(800, this.layout.dimensions.width);
          this.canvasHeight = Math.max(600, this.layout.dimensions.height);
          
          if (this.visualCanvas) {
            const canvas = this.visualCanvas.nativeElement;
            canvas.width = this.canvasWidth;
            canvas.height = this.canvasHeight;
          }
          
          // Initialize states from the parsed design 
          this.initializeSimulationState(parsedContent);
          
          // Render the design
          this.renderFPGA();
        } catch (error) {
          console.error('Error parsing design:', error);
          alert('Failed to parse design. Check console for details.');
        }
      }
    }
  }
  
  playSimulation(): void {
    if (!this.currentExample) {
      alert('Please select an example first');
      return;
    }
    this.isRunning = true;
    this.isPaused = false;
    this.runSimulation();
  }
  
  pauseSimulation(): void {
    if (this.isRunning) {
      this.isPaused = true;
      this.isRunning = false;
      console.log('Simulation paused');
    }
  }
  
  resumeSimulation(): void {
    if (this.isPaused) {
      this.isPaused = false;
      this.isRunning = true;
      this.runSimulation();
    }
  }
  
  stepSimulation(): void {
    if (!this.currentExample) {
      alert('Please select an example first');
      return;
    }
    
    // Toggle clock and update state
    this.clockState = this.clockState === '0' ? '1' : '0';
    this.updateSimulationState();
    this.renderFPGA();
    console.log('Simulation stepped: clock =', this.clockState);
  }
  
  changeSpeed(newSpeed: number): void {
    this.speed = newSpeed;
    console.log(`Changed simulation speed to x${this.speed}`);
  }
  
  private runSimulation(): void {
    if (!this.isRunning) return;
    
    // Toggle clock state
    this.clockState = this.clockState === '0' ? '1' : '0';
    
    // Update component states
    this.updateSimulationState();
    this.renderFPGA();
    
    // Schedule next update based on speed
    const clockPeriod = 1000 / (this.clockFrequency / 1000000) / this.speed;
    setTimeout(() => {
      this.runSimulation();
    }, clockPeriod / 2); // Half period for each clock state
  }
  
  private initializeSimulationState(design: any): void {
    // Initialize all cell states
    if (!design || typeof design === 'string') {
      console.error('Invalid design data:', design);
      return;
    }

    // Cast design to your interface
    const fpgaDesign = design as FpgaDesign;
    
    // Now use fpgaDesign which has the proper type information
    for (const cell of fpgaDesign.cells || []) {
      if (cell.initial_state) {
        this.simulationStates.set(cell.name, cell.initial_state);
      } else {
        this.simulationStates.set(cell.name, '0');  // Default to 0
      }
      
      // Initialize all connection points
      for (const [port, wire] of Object.entries(cell.connections || {})) {
        this.simulationStates.set(wire as string, '0');
      }
    }
    
    // Initialize external wires
    for (const wire of fpgaDesign.external_wires || []) {
      this.simulationStates.set(wire.name, '0');
    }
  }
  
  // Replace your updateSimulationState method with this fixed version
  private updateSimulationState(): void {
    if (!this.selectedDesign?.jsonContent || !this.layout) return;
    
    let design: FpgaDesign;
    
    if (typeof this.selectedDesign.jsonContent === 'string') {
      try {
        design = JSON.parse(this.selectedDesign.jsonContent) as FpgaDesign;
      } catch (error) {
        console.error('Invalid JSON string in design content', error);
        return;
      }
    } else {
      design = this.selectedDesign.jsonContent as FpgaDesign;
    }
    
    // Update states based on logic
    for (const cell of design.cells || []) {
      if (cell.type === 'DFF') {
        // D flip-flop behavior: on rising clock edge, Q takes D value
        if (this.clockState === '1') {
          const dValue = this.simulationStates.get(cell.connections['D']) || '0';
          this.simulationStates.set(cell.connections['Q'], dValue);
        }
      } 
      else if (cell.type === 'LUT_K') {
        // LUT behavior: calculate output based on inputs and mask
        const lutMask = (cell.mask || '00000000000000000000000000000000');
        const lutK = cell.K || 5;
        
        // Get input values (0 to K-1)
        const inputs: string[] = [];
        for (let i = 0; i < lutK; i++) {
          const inputName = `in_${i}`;
          if (inputName in cell.connections) {
            inputs.push(this.simulationStates.get(cell.connections[inputName]) || '0');
          } else {
            inputs.push('0'); // Default value if connection doesn't exist
          }
        }
        
        // Calculate index into mask
        let index = 0;
        for (let i = 0; i < inputs.length; i++) {
          if (inputs[i] === '1') {
            index |= (1 << i);
          }
        }
        
        // Get output from mask
        const maskValue = lutMask.charAt(lutMask.length - 1 - index) === '1' ? '1' : '0';
        if ('out' in cell.connections) {
          this.simulationStates.set(cell.connections['out'], maskValue);
        }
      }
      // Add logic for other cell types as needed
    }
    
    // Propagate signals through interconnects
    for (const ic of design.interconnects || []) {
      const sourceValue = this.simulationStates.get(ic.connections.input) || '0';
      this.simulationStates.set(ic.connections.output, sourceValue);
    }
    
    // Start animation for signal propagation
    this.animating = true;
    
    // Make sure we're rendering continuously during animation
    if (!this.animationFrameId) {
      this.renderFPGA();
    }
  }
  
  // Canvas interaction methods
  private handleMouseDown(event: MouseEvent): void {
    this.isDragging = true;
    this.dragStartX = event.clientX - this.viewOffsetX;
    this.dragStartY = event.clientY - this.viewOffsetY;
  }
  
  private handleMouseMove(event: MouseEvent): void {
    const canvas = this.visualCanvas.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / this.canvasScale - this.viewOffsetX;
    const y = (event.clientY - rect.top) / this.canvasScale - this.viewOffsetY;
    
    // Check for hover over cells or components
    this.checkHover(x, y);
    
    if (this.isDragging) {
      this.viewOffsetX = event.clientX - this.dragStartX;
      this.viewOffsetY = event.clientY - this.dragStartY;
      this.renderFPGA();
    }
  }
  
  private handleMouseUp(): void {
    this.isDragging = false;
  }
  
  private handleMouseWheel(event: WheelEvent): void {
    event.preventDefault();
    
    // Zoom in/out
    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
    this.canvasScale *= zoomFactor;
    
    // Constrain zoom
    this.canvasScale = Math.min(Math.max(0.2, this.canvasScale), 3);
    
    this.renderFPGA();
  }
  
  private handleCanvasClick(event: MouseEvent): void {
    if (!this.layout) return;
    
    const canvas = this.visualCanvas.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / this.canvasScale - this.viewOffsetX;
    const y = (event.clientY - rect.top) / this.canvasScale - this.viewOffsetY;
    
    // Check if clicked on a cell or component
    let clickedItem = null;
    
    // Check cells
    for (const cell of this.layout.cells) {
      if (x >= cell.x && x <= cell.x + cell.width && 
          y >= cell.y && y <= cell.y + cell.height) {
        clickedItem = cell;
        break;
      }
    }
    
    // Check external wires if no cell was clicked
    if (!clickedItem) {
      for (const wire of this.layout.externalWires) {
        if (x >= wire.x && x <= wire.x + wire.width && 
            y >= wire.y && y <= wire.y + wire.height) {
          clickedItem = wire;
          break;
        }
      }
    }
    
    // Display details for the clicked item
    if (clickedItem) {
      this.showCellDetails = true;
      this.selectedCellDetails = {
        ...clickedItem,
        state: this.simulationStates.get(clickedItem.name) || 'unknown'
      };
      
      // For inputs, clicking toggles their state
      if (clickedItem.type === 'input') {
        const currentState = this.simulationStates.get(clickedItem.name) || '0';
        const newState = currentState === '0' ? '1' : '0';
        this.simulationStates.set(clickedItem.name, newState);
        this.selectedCellDetails.state = newState;
        
        // Update the simulation based on input change
        this.updateSimulationState();
        this.renderFPGA();
      }
    } else {
      this.showCellDetails = false;
      this.selectedCellDetails = null;
    }
  }
  
  private checkHover(x: number, y: number): void {
    if (!this.layout) return;
    
    let hoveredItem = null;
    
    // Check cells
    for (const cell of this.layout.cells) {
      if (x >= cell.x && x <= cell.x + cell.width && 
          y >= cell.y && y <= cell.y + cell.height) {
        hoveredItem = cell.id;
        break;
      }
    }
    
    // Check external wires
    if (!hoveredItem) {
      for (const wire of this.layout.externalWires) {
        if (x >= wire.x && x <= wire.x + wire.width && 
            y >= wire.y && y <= wire.y + wire.height) {
          hoveredItem = wire.id;
          break;
        }
      }
    }
    
    if (this.highlightedCell !== hoveredItem) {
      this.highlightedCell = hoveredItem;
      this.renderFPGA();
    }
  }
  
  // Update the renderFPGA method to use requestAnimationFrame for continuous animation
  private renderFPGA(timestamp?: number): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    
    // Calculate elapsed time for animations
    const elapsed = timestamp && this.lastTimestamp ? timestamp - this.lastTimestamp : 0;
    this.lastTimestamp = timestamp || 0;
    
    // Update signal animations
    if (this.layout && elapsed > 0) {
      this.updateSignalAnimations(elapsed);
    }
    
    this.animationFrameId = requestAnimationFrame((time) => {
      if (!this.visualCanvas) return;
      
      const canvas = this.visualCanvas.nativeElement;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      ctx.save();
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Apply transformations for panning and zooming
      ctx.translate(this.viewOffsetX, this.viewOffsetY);
      ctx.scale(this.canvasScale, this.canvasScale);
      
      if (!this.layout) {
        // Draw placeholder for no layout
        this.drawPlaceholder(ctx);
        ctx.restore();
        
        // Continue animation loop if needed
        if (this.animating) {
          this.renderFPGA(time);
        }
        
        return;
      }
      
      // Draw grid
      this.drawGrid(ctx);
      
      // Draw interconnects with animated signals
      for (const interconnect of this.layout.interconnects) {
        this.drawInterconnect(ctx, interconnect);
      }
      
      // Draw cells
      for (const cell of this.layout.cells) {
        this.drawCell(ctx, cell);
      }
      
      // Draw external wires (I/O)
      for (const wire of this.layout.externalWires) {
        this.drawExternalWire(ctx, wire);
      }
      
      ctx.restore();
      
      // Continue animation loop if needed
      if (this.animating) {
        this.renderFPGA(time);
      } else {
        this.animationFrameId = null;
      }
    });
  }
  
  // Update signal animations based on elapsed time
  private updateSignalAnimations(elapsed: number): void {
    if (!this.layout) return;
    
    let needsAnimation = false;
    
    // Update all interconnect animations
    for (const ic of this.layout.interconnects) {
      const currentState = this.simulationStates.get(ic.sourcePort) || '0';
      
      // If the signal state changed, restart the animation
      if (currentState !== ic.lastSignalState) {
        ic.animationProgress = 0;
        ic.lastSignalState = currentState;
        needsAnimation = true;
      }
      
      // If animation is in progress, update it
      if ((ic.animationProgress ?? 0) < 1) {
        // Calculate animation progress based on propagation delay
        const animSpeed = 200 + Math.min(ic.delay, 3000); // Cap at reasonable speed
        ic.animationProgress = (ic.animationProgress ?? 0) + (elapsed / animSpeed);
        
        // Cap at 1 for completion
        if ((ic.animationProgress ?? 0) > 1) {
          ic.animationProgress = 1;
          
          // Propagate signal to target when animation completes
          const targetComponent = this.layout.cells.find(c => c.id === ic.targetId) || 
                                 this.layout.externalWires.find(w => w.id === ic.targetId);
          
          if (targetComponent) {
            this.simulationStates.set(ic.targetPort, currentState);
          }
        } else {
          needsAnimation = true;
        }
      }
    }
    
    // Track if we need to keep animating
    this.animating = needsAnimation;
  }
  
  private drawPlaceholder(ctx: CanvasRenderingContext2D): void {
    const { width, height } = this.visualCanvas.nativeElement;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, width, height);
    
    ctx.font = '20px Arial';
    ctx.fillStyle = '#666';
    ctx.textAlign = 'center';
    ctx.fillText('Select a design to visualize', width / 2, height / 2);
  }
  
  private drawGrid(ctx: CanvasRenderingContext2D): void {
    const { width, height } = this.visualCanvas.nativeElement;
    const gridSize = 20;
    
    ctx.strokeStyle = 'rgba(200, 200, 200, 0.2)';
    ctx.lineWidth = 1;
    
    // Draw grid lines
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }
  
  // Enhanced cell drawing with SVGs and effects
  private drawCell(ctx: CanvasRenderingContext2D, cell: any): void {
    const state = this.simulationStates.get(cell.name) || '0';
    const isHighlighted = this.highlightedCell === cell.id;
    
    // Get component SVG if available
    const svg = this.visualizationService.getSVGForComponent(cell.type);
    
    // Apply shadow for highlighted state
    if (isHighlighted) {
      ctx.shadowColor = 'rgba(11, 61, 145, 0.5)';
      ctx.shadowBlur = 15;
    }
    
    if (svg) {
      // Draw SVG image
      ctx.drawImage(svg, cell.x, cell.y, cell.width, cell.height);
    } else {
      // Fallback to drawing a rectangle
      ctx.fillStyle = isHighlighted ? '#f0f8ff' : '#ffffff';
      ctx.strokeStyle = '#0b3d91';
      ctx.lineWidth = isHighlighted ? 3 : 2;
      
      // Rounded rectangle
      this.roundRect(ctx, cell.x, cell.y, cell.width, cell.height, 10, true, true);
      
      // Cell type header
      ctx.fillStyle = '#0b3d91';
      ctx.fillRect(cell.x, cell.y, cell.width, 20);
      
      // Cell name and type
      ctx.font = '12px Arial';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(cell.type, cell.x + cell.width / 2, cell.y + 15);
      
      ctx.font = '14px Arial';
      ctx.fillStyle = '#0b3d91';
      ctx.fillText(cell.name, cell.x + cell.width / 2, cell.y + 40);
    }
    
    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    
    // Get configuration for this cell type
    const config = COMPONENT_CONFIGS[cell.type];
    
    // Draw connection points with state indicators
    if (cell.connectionPoints) {
      Object.entries(cell.connectionPoints).forEach(([port, point]: [string, any]) => {
        // Get connection state
        const connName = cell.connections[port];
        const connState = this.simulationStates.get(connName) || '0';
        
        // Draw connection point with glow effect
        const glow = this.visualizationService.getStateGlow(connState);
        ctx.shadowColor = glow.color;
        ctx.shadowBlur = glow.blur;
        
        ctx.fillStyle = this.visualizationService.getCellStateColor(connState);
        ctx.beginPath();
        ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        
        // Draw port label if available in config
        if (config?.connections) {
          const connConfig = config.connections.find(c => c.id === port);
          if (connConfig?.label) {
            ctx.font = '10px Arial';
            ctx.fillStyle = '#333';
            ctx.textAlign = 'center';
            
            let labelX = point.x;
            let labelY = point.y;
            
            // Position label based on side
            switch (connConfig.side) {
              case 'left':
                labelX -= 15;
                break;
              case 'right':
                labelX += 15;
                break;
              case 'top':
                labelY -= 10;
                break;
              case 'bottom':
                labelY += 15;
                break;
            }
            
            ctx.fillText(connConfig.label, labelX, labelY);
          }
        }
      });
    }
    
    // Draw cell state indicator for LUT and DFF
    if (cell.type === 'DFF' || cell.type === 'LUT_K') {
      const stateColor = this.visualizationService.getCellStateColor(state);
      const glow = this.visualizationService.getStateGlow(state);
      
      ctx.shadowColor = glow.color;
      ctx.shadowBlur = glow.blur;
      
      ctx.fillStyle = stateColor;
      ctx.beginPath();
      ctx.arc(cell.x + cell.width / 2, cell.y + cell.height - 15, 8, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    }
    
    // Special case for LUT: show the mask/truth table
    if (cell.type === 'LUT_K' && cell.properties?.mask) {
      ctx.font = '9px monospace';
      ctx.fillStyle = '#333';
      ctx.textAlign = 'center';
      
      const maskText = cell.properties.mask.substring(0, 8) + '...';
      ctx.fillText(maskText, cell.x + cell.width / 2, cell.y + cell.height - 30);
    }
  }
  
  private drawExternalWire(ctx: CanvasRenderingContext2D, wire: any): void {
    const state = this.simulationStates.get(wire.name) || '0';
    const isHighlighted = this.highlightedCell === wire.id;
    
    // Get SVG for input or output
    const svg = this.visualizationService.getSVGForComponent(wire.type);
    
    // Apply shadow for highlighted state
    if (isHighlighted) {
      ctx.shadowColor = 'rgba(11, 61, 145, 0.5)';
      ctx.shadowBlur = 15;
    }
    
    if (svg) {
      // Draw SVG image
      ctx.drawImage(svg, wire.x, wire.y, wire.width, wire.height);
    } else {
      // Fallback to drawing a rectangle
      ctx.fillStyle = isHighlighted ? '#f0f8ff' : '#ffffff';
      ctx.strokeStyle = wire.type === 'input' ? '#27ae60' : '#e74c3c';
      ctx.lineWidth = isHighlighted ? 3 : 2;
      
      // Rounded rectangle for I/O
      this.roundRect(ctx, wire.x, wire.y, wire.width, wire.height, 8, true, true);
      
      // Header bar
      ctx.fillStyle = wire.type === 'input' ? '#27ae60' : '#e74c3c';
      ctx.fillRect(wire.x, wire.y, wire.width, 18);
      
      // Wire name and type
      ctx.font = '11px Arial';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(wire.type.toUpperCase(), wire.x + wire.width / 2, wire.y + 13);
    }
    
    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    
    // Draw name
    ctx.font = '12px Arial';
    ctx.fillStyle = '#333';
    ctx.textAlign = 'center';
    ctx.fillText(wire.name, wire.x + wire.width / 2, wire.y + 32);
    
    // Draw connection points with state indicators
    if (wire.connectionPoints) {
      Object.entries(wire.connectionPoints).forEach(([port, point]: [string, any]) => {
        // Draw connection point with glow effect
        const glow = this.visualizationService.getStateGlow(state);
        ctx.shadowColor = glow.color;
        ctx.shadowBlur = glow.blur;
        
        ctx.fillStyle = this.visualizationService.getCellStateColor(state);
        ctx.beginPath();
        ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
      });
    }
    
    // Draw state indicator
    const stateColor = this.visualizationService.getCellStateColor(state);
    const glow = this.visualizationService.getStateGlow(state);
    
    ctx.shadowColor = glow.color;
    ctx.shadowBlur = glow.blur * 1.5; // Stronger glow for I/O
    
    // Draw a larger indicator for I/O state
    ctx.fillStyle = stateColor;
    ctx.beginPath();
    ctx.arc(wire.x + wire.width / 2, wire.y + wire.height - 15, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    
    // State value display
    ctx.font = 'bold 14px Arial';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(state, wire.x + wire.width / 2, wire.y + wire.height - 11);
  }
  
  // Add an uncommented version of the drawInterconnect method
  private drawInterconnect(ctx: CanvasRenderingContext2D, interconnect: any): void {
    const { points } = interconnect;
    const animationProgress = interconnect.animationProgress ?? 1;
    
    if (!points || points.length < 2) return;
    
    // Get signal state from source
    const sourceState = this.simulationStates.get(interconnect.sourcePort) || '0';
    
    // Draw full path with inactive color
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    
    ctx.strokeStyle = this.visualizationService.getCellStateColor('undefined');
    ctx.lineWidth = 2.5;
    ctx.stroke();
    
    // Calculate the total path length
    let totalLength = 0;
    for (let i = 1; i < points.length; i++) {
      totalLength += Math.sqrt(
        Math.pow(points[i].x - points[i-1].x, 2) + 
        Math.pow(points[i].y - points[i-1].y, 2)
      );
    }
    
    // Draw the animated part of the path
    const animLength = totalLength * animationProgress;
    let drawnLength = 0;
    let remainingLength = animLength;
    
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    
    for (let i = 1; i < points.length; i++) {
      const segmentLength = Math.sqrt(
        Math.pow(points[i].x - points[i-1].x, 2) + 
        Math.pow(points[i].y - points[i-1].y, 2)
      );
      
      if (drawnLength + segmentLength <= animLength) {
        // Draw the full segment
        ctx.lineTo(points[i].x, points[i].y);
        drawnLength += segmentLength;
      } else {
        // Draw a partial segment
        const ratio = remainingLength / segmentLength;
        const endX = points[i-1].x + (points[i].x - points[i-1].x) * ratio;
        const endY = points[i-1].y + (points[i].y - points[i-1].y) * ratio;
        ctx.lineTo(endX, endY);
        break;
      }
      
      remainingLength -= segmentLength;
    }
    
    // Apply glow effect for active signals
    const glow = this.visualizationService.getStateGlow(sourceState);
    ctx.shadowColor = glow.color;
    ctx.shadowBlur = glow.blur;
    
    ctx.strokeStyle = this.visualizationService.getCellStateColor(sourceState);
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Reset shadow for other drawings
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    
    // Draw interconnect box at the middle point if needed
    if (points.length > 2) {
      const midPoint = points[Math.floor(points.length / 2)];
      
      // Interconnect box with custom appearance
      ctx.fillStyle = '#f8f9fa';
      ctx.strokeStyle = '#0b3d91';
      ctx.lineWidth = 1;
      
      // Apply glow if signal has reached this point
      if (animationProgress >= 0.5) {
        ctx.shadowColor = glow.color;
        ctx.shadowBlur = glow.blur;
      }
      
      // Draw a small diamond shape
      ctx.beginPath();
      ctx.moveTo(midPoint.x, midPoint.y - 8);
      ctx.lineTo(midPoint.x + 8, midPoint.y);
      ctx.lineTo(midPoint.x, midPoint.y + 8);
      ctx.lineTo(midPoint.x - 8, midPoint.y);
      ctx.closePath();
      
      ctx.fill();
      ctx.stroke();
      
      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      
      // Add delay text
      ctx.font = '9px Arial';
      ctx.fillStyle = '#333';
      ctx.textAlign = 'center';
      
      // Format delay for display
      let delayText = '';
      if (interconnect.delay) {
        const delay = parseFloat(interconnect.delay);
        if (delay >= 1000) {
          delayText = `${(delay / 1000).toFixed(1)}ns`;
        } else {
          delayText = `${delay.toFixed(0)}ps`;
        }
      }
      
      ctx.fillText(delayText, midPoint.x, midPoint.y + 20);
    }
  }
  
  // Helper to draw rounded rectangles
  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    fill: boolean,
    stroke: boolean
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  // Add the toggleDescription method
  toggleDescription(designId: string, event: Event): void {
    // Prevent the click from also triggering selectExample
    event.stopPropagation();
    
    if (this.expandedDesignId === designId) {
      // If already expanded, collapse it
      this.expandedDesignId = null;
    } else {
      // Otherwise expand this design description
      this.expandedDesignId = designId;
    }
  }
}
