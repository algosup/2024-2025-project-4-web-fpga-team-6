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
  @ViewChild('labelsOverlay') labelsOverlay!: ElementRef<HTMLDivElement>;
  @ViewChild('canvasContainer') canvasContainer!: ElementRef<HTMLDivElement>;
  
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
  highlightedInterconnect: string | null = null; // Add property to track hovered interconnect
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

  // Add this property to track timing display positions
  private timeDisplayPositions: {x: number, y: number, width: number, height: number}[] = [];
  
  // Add properties for managing timing labels
  private timingLabels: HTMLElement[] = [];
  
  // Add isFullScreen property
  isFullScreen = false;
  previousDimensions = { width: 0, height: 0 };

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
    
    // Add fullscreen change event listener
    document.addEventListener('fullscreenchange', this.handleFullscreenChange.bind(this));
  }
  
  ngOnDestroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    
    // Clean up the global event listener
    window.removeEventListener('mouseup', this.handleMouseUp.bind(this));
    
    // Remove fullscreen change event listener
    document.removeEventListener('fullscreenchange', this.handleFullscreenChange.bind(this));
    
    // Clean up any timing labels
    this.clearTimingLabels();
  }
  
  setupCanvas(): void {
    if (!this.visualCanvas) return;
    
    const canvas = this.visualCanvas.nativeElement;
    canvas.width = this.canvasWidth;
    canvas.height = this.canvasHeight;
    
    // Add event listeners for mouse interactions
    canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    
    // Attach mouseup to window instead of canvas to handle releases outside canvas area
    window.addEventListener('mouseup', this.handleMouseUp.bind(this));
    
    canvas.addEventListener('wheel', this.handleMouseWheel.bind(this));
    canvas.addEventListener('click', this.handleCanvasClick.bind(this));
    
    // Add window resize handler
    window.addEventListener('resize', this.handleWindowResize.bind(this));
    
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
          
          // Log the design structure to help with debugging
          console.log('Design structure:', parsedContent);
          
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
      else if (cell.type === 'LUT_K' || cell.type === 'LUT') {
        // LUT behavior: calculate output based on inputs and mask
        const lutMask = (cell.mask || cell.properties?.mask || '00000000000000000000000000000000');
        
        // Parse the LUT inputs differently based on design format
        const inputValues: string[] = [];
        
        // First, try to get from in_0, in_1, etc. format
        let hasStandardInputs = false;
        for (let i = 0; i < 5; i++) { // Assume max 5 inputs
          const inputKey = `in_${i}`;
          if (inputKey in cell.connections) {
            hasStandardInputs = true;
            const wireValue = this.simulationStates.get(cell.connections[inputKey]) || '0';
            inputValues.push(wireValue);
          }
        }
        
        // If no standard inputs found, look for numerically indexed inputs
        if (!hasStandardInputs) {
          for (let i = 0; i < 5; i++) { // Assume max 5 inputs
            const inputKey = `${i}`;
            if (inputKey in cell.connections) {
              const wireValue = this.simulationStates.get(cell.connections[inputKey]) || '0';
              inputValues.push(wireValue);
            }
          }
        }
        
        // Calculate index into mask
        let index = 0;
        for (let i = 0; i < inputValues.length; i++) {
          if (inputValues[i] === '1') {
            index |= (1 << i);
          }
        }
        
        // Get output from mask
        let maskIndex = lutMask.length - 1 - index;
        if (maskIndex < 0) maskIndex = 0;
        if (maskIndex >= lutMask.length) maskIndex = lutMask.length - 1;
        
        const maskValue = lutMask.charAt(maskIndex) === '1' ? '1' : '0';
        
        // Set the output - try different possible output connections
        const outputKeys = ['out', 'O', 'output', 'OUT'];
        for (const key of outputKeys) {
          if (key in cell.connections) {
            this.simulationStates.set(cell.connections[key], maskValue);
            break;
          }
        }
      }
    }
    
    // Propagate signals through interconnects
    for (const ic of design.interconnects || []) {
      if (ic.connections && ic.connections.input && ic.connections.output) {
        const sourceValue = this.simulationStates.get(ic.connections.input) || '0';
        this.simulationStates.set(ic.connections.output, sourceValue);
      }
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
    if (!this.visualCanvas) return;
    
    const canvas = this.visualCanvas.nativeElement;
    const rect = canvas.getBoundingClientRect();
    
    // Handle dragging/panning first - use raw coordinates for dragging
    if (this.isDragging) {
      this.viewOffsetX = event.clientX - this.dragStartX;
      this.viewOffsetY = event.clientY - this.dragStartY;
      this.renderFPGA();
      return; // Skip hover detection while dragging for performance
    }
    
    // Calculate canvas-relative coordinates correctly for hover detection
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const canvasX = (event.clientX - rect.left) * scaleX;
    const canvasY = (event.clientY - rect.top) * scaleY;
    
    // Convert to world coordinates with proper scale and offset
    const x = canvasX / this.canvasScale - this.viewOffsetX / this.canvasScale;
    const y = canvasY / this.canvasScale - this.viewOffsetY / this.canvasScale;
    
    // Check for hover over cells or components
    this.checkHover(x, y);
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
    let hoveredInterconnect = null;
    
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
    
    // Check interconnects - improved check for hovering over interconnects
    if (!hoveredItem && this.layout.interconnects) {
      for (const interconnect of this.layout.interconnects) {
        if (this.isPointNearInterconnect(x, y, interconnect.points)) {
          hoveredInterconnect = interconnect.id;
          console.log('Hovering over interconnect:', interconnect.id);
          break;
        }
      }
    }
    
    // Update highlighted cell if needed
    if (this.highlightedCell !== hoveredItem) {
      this.highlightedCell = hoveredItem;
      this.renderFPGA();
    }
    
    // Update highlighted interconnect if needed
    if (this.highlightedInterconnect !== hoveredInterconnect) {
      this.highlightedInterconnect = hoveredInterconnect;
      if (hoveredInterconnect) {
        console.log('Highlighted interconnect updated to:', hoveredInterconnect);
      }
      this.renderFPGA();
    }
  }

  // Helper method to check if a point is near an interconnect line
  private isPointNearInterconnect(x: number, y: number, points: any[]): boolean {
    if (!points || points.length < 2) return false;
    
    const threshold = 10; // Distance in pixels to detect hover
    
    for (let i = 1; i < points.length; i++) {
      const p1 = points[i - 1];
      const p2 = points[i];
      
      // Calculate distance from point to line segment
      const distance = this.distanceToLineSegment(x, y, p1.x, p1.y, p2.x, p2.y);
      
      if (distance <= threshold) {
        return true;
      }
    }
    
    return false;
  }
  
  // Calculate distance from point to line segment
  private distanceToLineSegment(
    px: number, py: number,
    x1: number, y1: number,
    x2: number, y2: number
  ): number {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    
    if (lenSq !== 0) {
      param = dot / lenSq;
    }
    
    let xx, yy;
    
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }
    
    const dx = px - xx;
    const dy = py - yy;
    
    return Math.sqrt(dx * dx + dy * dy);
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
    
    // Clear timing labels before each render
    this.clearTimingLabels();
    
    // Reset time display positions for this render cycle
    this.timeDisplayPositions = [];
    
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
    
    // Special case for LUT - use trapezoid shape
    const isLUT = cell.type === 'LUT' || cell.type === 'LUT_K';
    
    // Get component SVG if available
    const svg = this.visualizationService.getSVGForComponent(isLUT ? 'LUT' : cell.type);
    
    // Apply shadow for highlighted state
    if (isHighlighted) {
      ctx.shadowColor = 'rgba(11, 61, 145, 0.5)';
      ctx.shadowBlur = 15;
    }
    
    if (svg) {
      // Draw SVG image
      ctx.drawImage(svg, cell.x, cell.y, cell.width, cell.height);
    } else {
      // Fallback to drawing a rectangle or trapezoid for LUT
      ctx.fillStyle = isHighlighted ? '#f0f8ff' : '#ffffff';
      ctx.strokeStyle = '#0b3d91';
      ctx.lineWidth = isHighlighted ? 3 : 2;
      
      if (isLUT) {
        // Draw trapezoid for LUT
        ctx.beginPath();
        ctx.moveTo(cell.x + 20, cell.y + 10);
        ctx.lineTo(cell.x + cell.width - 20, cell.y + 10);
        ctx.lineTo(cell.x + cell.width - 10, cell.y + cell.height - 10);
        ctx.lineTo(cell.x + 10, cell.y + cell.height - 10);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // LUT header
        ctx.fillStyle = '#0b3d91';
        ctx.fillRect(cell.x + 20, cell.y + 10, cell.width - 40, 20);
      } else {
        // Rounded rectangle for other components
        this.roundRect(ctx, cell.x, cell.y, cell.width, cell.height, 10, true, true);
        
        // Cell type header
        ctx.fillStyle = '#0b3d91';
        ctx.fillRect(cell.x, cell.y, cell.width, 20);
      }
      
      // Cell name and type
      ctx.font = '12px Arial';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(cell.type, cell.x + cell.width / 2, cell.y + 15 + (isLUT ? 10 : 0));
      
      ctx.font = '14px Arial';
      ctx.fillStyle = '#0b3d91';
      ctx.fillText(cell.name, cell.x + cell.width / 2, cell.y + 40 + (isLUT ? 5 : 0));
    }
    
    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    
    // Get configuration for this cell type
    const config = COMPONENT_CONFIGS[isLUT ? 'LUT' : cell.type];
    
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
    if (cell.type === 'DFF' || isLUT) {
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
    
    // Special case for LUT: show the truth table
    if (isLUT && cell.properties?.mask) {
      ctx.font = '9px monospace';
      ctx.fillStyle = '#333';
      ctx.textAlign = 'center';
      
      // Show the mask in binary format with ellipsis if too long
      const maskText = cell.properties.mask.substring(0, 8) + 
        (cell.properties.mask.length > 8 ? '...' : '');
      
      ctx.fillText(maskText, cell.x + cell.width / 2, cell.y + cell.height - 30);
      
      // Draw the truth table header
      ctx.font = '8px Arial';
      ctx.fillText('Mask:', cell.x + cell.width / 2, cell.y + cell.height - 42);
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
  
  private drawInterconnect(ctx: CanvasRenderingContext2D, interconnect: any): void {
    const { points } = interconnect;
    const animationProgress = interconnect.animationProgress ?? 1;
    
    if (!points || points.length < 2) return;
    
    // Get signal state from source
    const sourceState = this.simulationStates.get(interconnect.sourcePort) || '0';
    
    // Get the delay color for this interconnect
    let delayValue = 0;
    if (interconnect.delay) {
      delayValue = parseFloat(interconnect.delay);
    }
    const delayColor = this.getDelayColor(delayValue);
    
    // Draw full path with delay-based color
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    
    // Change color when hovered to provide feedback or use delay-based color
    const isHighlighted = this.highlightedInterconnect === interconnect.id;
    ctx.strokeStyle = isHighlighted ? 
      'rgba(44, 120, 212, 0.5)' : 
      delayColor; 
    
    ctx.lineWidth = isHighlighted ? 3.5 : 2.5;
    ctx.stroke();
    
    // Draw direction arrows along the path
    this.drawDirectionArrows(ctx, points, ctx.strokeStyle);
    
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
    
    // Only add timing label when this interconnect is hovered
    if (this.highlightedInterconnect === interconnect.id) {
      // Choose the midpoint for timing display
      const midPoint = points[Math.floor(points.length / 2)];
      
      // Format delay for display
      let delayText = '';
      
      if (interconnect.delay) {
        delayValue = parseFloat(interconnect.delay);
        if (delayValue >= 1000) {
          delayText = `${(delayValue / 1000).toFixed(1)}ns`;
        } else {
          delayText = `${delayValue.toFixed(0)}ps`;
        }
      } else {
        delayText = '0ps'; // Always show some value for delay
      }

      // Enhance the timing label with prefix for clarity
      const timingLabel = `Delay: ${delayText}`;
      
      // Get the rectangle of the canvas in screen space
      const canvas = this.visualCanvas.nativeElement;
      const rect = canvas.getBoundingClientRect();
      
      // Convert midPoint from canvas space to screen space
      const scaledMidPointX = midPoint.x * this.canvasScale + this.viewOffsetX;
      const scaledMidPointY = midPoint.y * this.canvasScale + this.viewOffsetY;
      
      const scaleX = rect.width / canvas.width;
      const scaleY = rect.height / canvas.height;
      
      const midPointScreenX = scaledMidPointX * scaleX;
      const midPointScreenY = scaledMidPointY * scaleY;
      
      // Position the timing label 30px above the midpoint
      const labelScreenX = midPointScreenX;
      const labelScreenY = midPointScreenY - 30;
      
      // Use the overlay to display the timing label with color coding
      this.displayTimingLabelInOverlay(
        timingLabel,
        labelScreenX,
        labelScreenY,
        midPointScreenX,
        midPointScreenY,
        delayColor
      );
    }
  }

  // Add this helper method to draw direction arrows along a path
  private drawDirectionArrows(ctx: CanvasRenderingContext2D, points: Point[], color: string): void {
    if (points.length < 2) return;
    
    // Save context state before making changes
    ctx.save();
    
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    
    // Calculate interval for arrow placement - place arrows roughly every 50-80px based on path length
    const totalSegments = points.length - 1;
    const arrowInterval = Math.ceil(totalSegments / Math.max(1, Math.floor(totalSegments / 2)));
    
    // Draw arrows at calculated intervals
    for (let i = 1; i < points.length; i++) {
      // Only draw arrows at certain intervals to avoid cluttering
      if ((i % arrowInterval !== 0) && (i !== points.length - 2)) continue;
      
      const p1 = points[i - 1];
      const p2 = points[i];
      
      // Calculate midpoint of current segment where arrow will be drawn
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      
      // Calculate angle for arrow direction
      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      
      // Draw the arrow
      this.drawArrow(ctx, midX, midY, angle, 8, color);
    }
    
    // Always draw an arrow near the end point to clearly show destination
    if (points.length >= 2) {
      const p1 = points[points.length - 2];
      const p2 = points[points.length - 1];
      
      // Position arrow close to end but not at the very end
      const ratio = 0.7; // 70% of the way from p1 to p2
      const arrowX = p1.x + (p2.x - p1.x) * ratio;
      const arrowY = p1.y + (p2.y - p1.y) * ratio;
      
      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      this.drawArrow(ctx, arrowX, arrowY, angle, 8, color);
    }
    
    // Restore context to original state
    ctx.restore();
  }

  // Add this helper method to draw an individual arrow
  private drawArrow(
    ctx: CanvasRenderingContext2D, 
    x: number, 
    y: number, 
    angle: number, 
    size: number,
    color: string
  ): void {
    // Save context state
    ctx.save();
    
    // Move to arrow position and rotate canvas to arrow direction
    ctx.translate(x, y);
    ctx.rotate(angle);
    
    // Draw the arrow
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-size, size / 2);
    ctx.lineTo(-size, -size / 2);
    ctx.closePath();
    
    // Fill and stroke the arrow
    ctx.fillStyle = color;
    ctx.fill();
    
    // Restore context to original state
    ctx.restore();
  }

  private displayTimingLabelInOverlay(
    label: string,
    x: number,
    y: number,
    midPointX: number,
    midPointY: number,
    color: string = '#103262' // Default color if not specified
  ): void {
    if (!this.labelsOverlay?.nativeElement) return;
    
    const overlay = this.labelsOverlay.nativeElement;
    
    // Create label element
    const labelEl = document.createElement('div');
    labelEl.className = 'timing-label';
    labelEl.textContent = label;
    labelEl.style.left = `${x}px`;
    labelEl.style.top = `${y}px`;
    
    // Apply color coding
    labelEl.style.color = color;
    labelEl.style.borderColor = color;
    
    // Calculate angle for the arrow
    const angle = Math.atan2(midPointY - y, midPointX - x);
    
    // Add arrow element pointing to the connection
    const arrowEl = document.createElement('div');
    arrowEl.className = 'timing-label-arrow';
    
    // Position the arrow at edge of label, pointing toward the connection
    const arrowDistance = 12;
    const arrowX = x + Math.cos(angle) * arrowDistance;
    const arrowY = y + Math.sin(angle) * arrowDistance;
    
    arrowEl.style.left = `${arrowX}px`;
    arrowEl.style.top = `${arrowY}px`;
    arrowEl.style.transform = `translate(-50%, -50%) rotate(${angle + Math.PI}rad)`;
    
    // Color the arrow to match the label
    arrowEl.style.borderColor = `${color} transparent transparent transparent`;
    
    // Add to overlay
    overlay.appendChild(labelEl);
    overlay.appendChild(arrowEl);
    
    // Store for cleanup
    this.timingLabels.push(labelEl);
    this.timingLabels.push(arrowEl);
  }

  private clearTimingLabels(): void {
    if (this.labelsOverlay?.nativeElement) {
      this.labelsOverlay.nativeElement.innerHTML = '';
    }
    this.timingLabels = [];
  }

  // Add this helper method to determine color based on delay value
  private getDelayColor(delay: number): string {
    // Define thresholds for different delay categories (in picoseconds)
    const highDelayThreshold = 2000;  // 2000ps = 2ns
    const mediumDelayThreshold = 1000; // 1000ps = 1ns
    
    if (delay >= highDelayThreshold) {
      return '#e74c3c'; // Red for high delay
    } else if (delay >= mediumDelayThreshold) {
      return '#f39c12'; // Orange for medium delay
    } else if (delay > 0) {
      return '#7f8c8d'; // Gray for low delay
    } else {
      return '#7f8c8d'; // Default gray for zero or undefined delay
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

  /**
   * Toggles full screen mode for the canvas container
   */
  toggleFullScreen(): void {
    if (!this.canvasContainer) return;
    
    const container = this.canvasContainer.nativeElement;
    
    if (!this.isFullScreen) {
      // Save current dimensions before going full screen
      this.previousDimensions = {
        width: this.canvasWidth,
        height: this.canvasHeight
      };
      
      // Request full screen
      if (container.requestFullscreen) {
        container.requestFullscreen();
      }
    } else {
      // Exit full screen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }
  
  /**
   * Handle fullscreen change events from the browser
   */
  private handleFullscreenChange(): void {
    // Update isFullScreen state based on document.fullscreenElement
    this.isFullScreen = !!document.fullscreenElement;
    
    if (this.isFullScreen) {
      // Resize canvas to fill the screen
      this.resizeCanvasForFullscreen();
    } else {
      // Restore original dimensions
      this.restoreCanvasFromFullscreen();
    }
  }
  
  /**
   * Resize canvas to fill the entire screen in fullscreen mode
   */
  private resizeCanvasForFullscreen(): void {
    if (!this.visualCanvas) return;
    
    const canvas = this.visualCanvas.nativeElement;
    
    // Get screen dimensions
    this.canvasWidth = window.innerWidth;
    this.canvasHeight = window.innerHeight;
    
    // Update canvas size
    canvas.width = this.canvasWidth;
    canvas.height = this.canvasHeight;
    
    // Re-render with new dimensions
    this.renderFPGA();
  }
  
  /**
   * Restore canvas to its original dimensions when exiting fullscreen
   */
  private restoreCanvasFromFullscreen(): void {
    if (!this.visualCanvas) return;
    
    const canvas = this.visualCanvas.nativeElement;
    
    // Restore previous dimensions
    this.canvasWidth = this.previousDimensions.width || 800;
    this.canvasHeight = this.previousDimensions.height || 600;
    
    // Update canvas size
    canvas.width = this.canvasWidth;
    canvas.height = this.canvasHeight;
    
    // Re-render with restored dimensions
    this.renderFPGA();
  }
  
  /**
   * Handle window resize events, particularly important in fullscreen mode
   */
  private handleWindowResize(): void {
    if (this.isFullScreen) {
      this.resizeCanvasForFullscreen();
    }
  }
}
