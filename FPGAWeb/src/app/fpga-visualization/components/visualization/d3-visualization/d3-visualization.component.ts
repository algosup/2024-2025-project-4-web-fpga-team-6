import { Component, ElementRef, Input, OnChanges, OnInit, OnDestroy, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Design } from '../../../../services/design.service';
import * as d3 from 'd3';

// Import models and services
import { ComponentData, RendererContext } from './models/visualization.model'; // Remove VisualizationConfig
import { DataExtractorService } from './utils/data-extractor.service';
import { GridRendererService } from './renderers/grid-renderer.service';
import { InteractionHandlerService } from './handlers/interaction-handler.service';
import { SimulationHandlerService } from './handlers/simulation-handler.service';

// Import new services
import { LayoutService, LayoutOptions } from './layout/layout-service';
import { ConnectionService, ConnectionData } from './connections/connection-service';
import { UnifiedComponentRendererService } from './renderers/unified-component-renderer.service';
import { VisualizationStyleService } from './styles/visualization-style.service';
import { VisualizationConfigService, LayoutConfig } from './config/visualization-config.service';
import { IntervalTimer } from '../../../../utils/interval-timer';

@Component({
  selector: 'app-d3-visualization',
  standalone: true,
  imports: [CommonModule],
  providers: [
    DataExtractorService,
    GridRendererService,
    UnifiedComponentRendererService, // Replace the two services with the unified one
    InteractionHandlerService,
    SimulationHandlerService,
    LayoutService,
    ConnectionService,
    VisualizationStyleService,
    VisualizationConfigService
  ],
  templateUrl: './d3-visualization.component.html',
  styleUrls: ['./d3-visualization.component.css']
})
export class D3VisualizationComponent implements OnInit, OnChanges, OnDestroy {
  @Input() design: Design | null = null;
  @Input() isRunning = false;
  @Input() isPaused = false;
  @Input() layoutType: 'grid' | 'force' | 'hierarchical' = 'grid';
  @Input() darkMode: boolean = false;
  @Input() clockFrequency: number = 1; // MHz
  @Input() simulationSpeed: number = 1;
  
  // Add a property to track the clock state
  private clockState: boolean = false;
  private clockTimer: IntervalTimer | null = null;
  private clockComponent: d3.Selection<any, any, any, any> | null = null;
  
  @ViewChild('svgContainer', { static: true }) private svgContainer!: ElementRef;
  
  private svg: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;
  private components: ComponentData[] = [];
  private connections: ConnectionData[] = [];
  private parsedData: any = null;
  
  constructor(
    private dataExtractor: DataExtractorService,
    private gridRenderer: GridRendererService,
    private componentRenderer: UnifiedComponentRendererService, // Update the type
    private interactionHandler: InteractionHandlerService,
    private simulationHandler: SimulationHandlerService,
    private layoutService: LayoutService,
    private connectionService: ConnectionService,
    private styleService: VisualizationStyleService,
    private configService: VisualizationConfigService // Add config service
  ) {}

  ngOnInit() {
    this.initializeSvg();
    if (this.design) {
      this.updateVisualization();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Check if isRunning or isPaused has changed
    if (changes['isRunning'] || changes['isPaused']) {
      this.handleSimulationStateChange();
    }
    
    // Check if clockFrequency or simulationSpeed has changed
    if (changes['clockFrequency'] || changes['simulationSpeed']) {
      this.updateClockFrequency();
    }
    
    // Handle other changes like design, darkMode, etc.
    if (changes['design'] && this.svg) {
      this.updateVisualization();
    }
    
    if (changes['layoutType'] && this.svg && this.components.length > 0) {
      // Update layout config
      this.configService.updateLayoutConfig({ type: this.layoutType });
      this.applyCurrentLayout();
    }

    if (changes['darkMode'] && this.svg) {
      // Update dark mode in config service
      this.configService.updateStyleConfig({ darkMode: this.darkMode });
      this.updateVisualization(); // Re-render with new style
    }

    // Handle clock frequency changes
    if (changes['clockFrequency'] && this.isRunning && !this.isPaused) {
      this.updateClockFrequency();
    }
    
    // Handle simulation state changes
    if ((changes['isRunning'] || changes['isPaused']) && this.svg && this.parsedData) {
      this.handleSimulationStateChange();
    }
  }

  ngOnDestroy() {
    this.stopClockAnimation();
  }

  private initializeSvg() {
    // Clear any existing SVG
    d3.select(this.svgContainer.nativeElement).select('svg').remove();

    // Get container dimensions for responsive sizing
    const containerWidth = this.svgContainer.nativeElement.clientWidth;
    const containerHeight = this.svgContainer.nativeElement.clientHeight;
    
    // Update config with container dimensions
    const canvasConfig = this.configService.canvas;
    canvasConfig.width = Math.max(containerWidth, 800);
    canvasConfig.height = Math.max(containerHeight, 600);
    this.configService.updateCanvasConfig(canvasConfig);

    // Create SVG element with full container width/height
    const svgSelection = d3.select(this.svgContainer.nativeElement)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${canvasConfig.width} ${canvasConfig.height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');
      
    this.svg = svgSelection.append('g')
      .attr('transform', `translate(${canvasConfig.margin.left},${canvasConfig.margin.top})`);
      
    // Create renderer context
    const context: RendererContext = {
      svg: this.svg,
      config: this.configService.canvas // Use config from service
    };
      
    // Add background grid if enabled
    if (canvasConfig.showGrid) {
      this.gridRenderer.renderGrid(context);
    }
    
    // Setup zoom behavior if enabled
    if (this.configService.interaction.zoomEnabled) {
      this.setupZoom(svgSelection);
    }
  }
  
  // Add zoom functionality
  private setupZoom(svg: d3.Selection<SVGSVGElement, unknown, null, undefined>) {
    const zoomGroup = this.svg;
    const interactionConfig = this.configService.interaction;
    
    // Create zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent(interactionConfig.zoomExtent)
      .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        zoomGroup?.attr('transform', event.transform.toString());
      });
    
    // Apply zoom behavior
    svg.call(zoom);
    
    // Add zoom controls if needed
    // (This could be implemented as separate buttons)
  }

  private updateVisualization() {
    if (!this.svg || !this.design?.jsonContent) return;
    
    try {
      // Parse JSON content if it's a string
      if (typeof this.design.jsonContent === 'string') {
        this.parsedData = JSON.parse(this.design.jsonContent);
      } else {
        this.parsedData = this.design.jsonContent;
      }
      
      // Clear previous visualization
      this.svg.selectAll('.component').remove();
      this.svg.selectAll('.connections').remove(); // Make sure old connections are removed
      
      // Extract components from parsed data
      this.components = this.dataExtractor.extractComponents(this.parsedData);
      
      // Create renderer context
      const context: RendererContext = {
        svg: this.svg,
        config: this.configService.canvas
      };
      
      // Render components
      const componentNodes = this.componentRenderer.renderComponents(context, this.components);
      
      // Apply the layout
      this.applyCurrentLayout(componentNodes);
      
      // Extract and render connections AFTER layout is applied
      this.connections = this.connectionService.extractConnections(this.parsedData, this.components);
      
      // Debug logging
      console.log(`Rendering ${this.connections.length} connections`);
      
      if (this.connections.length > 0) {
        this.connectionService.renderConnections(context, this.components, this.connections);
      }
      
      // Setup interactions based on config
      const interactionConfig = this.configService.interaction;
      if (interactionConfig.draggableComponents && interactionConfig.selectableComponents) {
        this.interactionHandler.setupInteractions(componentNodes);
      }
      
      // Update simulation state if running
      this.handleSimulationStateChange();
      
    } catch (e) {
      console.error('Error parsing JSON for visualization:', e);
    }
  }
  
  private applyCurrentLayout(nodes?: d3.Selection<any, ComponentData, any, any>) {
    if (!this.svg || !this.components.length) return;
    
    const context: RendererContext = {
      svg: this.svg,
      config: this.configService.canvas
    };
    
    // Get layout options from config service
    const layoutConfig = this.configService.layout;
    
    this.layoutService.applyLayout(context, nodes || this.svg.selectAll('.component'), {
      type: layoutConfig.type,
      padding: layoutConfig.padding,
      enableDragging: layoutConfig.enableDragging,
      // Additional layout-specific options can be passed here
    });
    
    // Update connections after layout change
    if (this.connections.length > 0) {
      this.connectionService.renderConnections(context, this.components, this.connections);
    }
  }
  
  private handleSimulationStateChange(): void {
    if (this.isRunning && !this.isPaused) {
      // Start simulation
      this.startSimulation();
    } else if (this.isRunning && this.isPaused) {
      // Pause simulation
      this.pauseSimulation();
    } else {
      // Stop simulation
      this.stopSimulation();
    }
  }
  
  private startSimulation(): void {
    console.log('Starting simulation...');
    
    // Get element to add simulation class
    const container = d3.select(this.svgContainer.nativeElement);
    container.classed('simulation-running', true);
    
    // Disable component interaction during simulation
    this.interactionHandler.setSelectionEnabled(false);
    
    // Find and store clock component for animation
    this.findClockComponent();
    
    // Start clock animation
    this.startClockAnimation();
  }
  
  private pauseSimulation(): void {
    console.log('Pausing simulation...');
    
    // Pause clock animation
    if (this.clockTimer) {
      this.clockTimer.pause();
    }
  }
  
  private resumeSimulation(): void {
    console.log('Resuming simulation...');
    
    // Resume clock animation
    if (this.clockTimer) {
      this.clockTimer.resume();
    }
  }
  
  private stopSimulation(): void {
    console.log('Stopping simulation...');
    
    // Get element to remove simulation class
    const container = d3.select(this.svgContainer.nativeElement);
    container.classed('simulation-running', false);
    
    // Re-enable component interaction
    this.interactionHandler.setSelectionEnabled(true);
    
    // Stop clock animation
    this.stopClockAnimation();
    
    // Reset component appearances
    this.resetClockAppearance();
  }
  
  private updateClockFrequency(): void {
    // Calculate new interval based on frequency and speed
    if (this.clockTimer && this.isRunning && !this.isPaused) {
      const intervalMs = 1000 / (this.clockFrequency * this.simulationSpeed);
      this.clockTimer.setInterval(intervalMs);
    }
  }
  
  // New methods for handling clock animation
  private findClockComponent() {
    // Look for components with type 'WIRE_INPUT' and names containing 'clock' or 'clk'
    if (!this.svg) return;
    
    const clockComponents = this.svg.selectAll('.component')
      .filter((d: any) => {
        return (d.type && d.type.toLowerCase().includes('wire_input')) && 
               ((d.name && (d.name.toLowerCase().includes('clock') || d.name.toLowerCase().includes('clk'))) ||
                (d.id && (d.id.toLowerCase().includes('clock') || d.id.toLowerCase().includes('clk'))));
      });
    
    if (!clockComponents.empty()) {
      this.clockComponent = clockComponents;
      console.log('Found clock component:', clockComponents.data());
    } else {
      // Try any external input if no specific clock is found
      const inputComponents = this.svg.selectAll('.component')
        .filter((d: any) => d.type && d.type.toLowerCase().includes('wire_input'));
      
      if (!inputComponents.empty()) {
        this.clockComponent = inputComponents;
        console.log('Using input component as clock:', inputComponents.data());
      } else {
        console.warn('No clock component found for animation');
        this.clockComponent = null;
      }
    }
  }
  
  private startClockAnimation() {
    // Stop any existing animation
    this.stopClockAnimation();
    
    // Calculate clock interval based on frequency and simulation speed
    const intervalMs = 1000 / (this.clockFrequency * this.simulationSpeed);
    
    // Create and start the timer
    this.clockTimer = new IntervalTimer(() => {
      this.toggleClockState();
    }, intervalMs);
    
    this.clockTimer.startTimer(); // Changed from start() to startTimer()
  }
  
  private pauseClockAnimation() {
    if (this.clockTimer) {
      this.clockTimer.pause();
    }
  }
  
  private resumeClockAnimation() {
    if (this.clockTimer) {
      this.clockTimer.resume();
    }
  }
  
  private stopClockAnimation() {
    if (this.clockTimer) {
      this.clockTimer.stop();
      this.clockTimer = null;
    }
  }
  
  private toggleClockState() {
    // Toggle the state
    this.clockState = !this.clockState;
    
    // Update visualizations
    this.updateClockAppearance();
    this.updateClockConnections();
  }
  
  private updateClockAppearance() {
    if (!this.clockComponent) return;
    
    // Get colors
    const activeColor = this.styleService.getComponentColor('active');
    const inactiveColor = this.styleService.getComponentColor('wire');
    
    // Update entire clock component
    this.clockComponent
      .transition()
      .duration(50)
      .attr('fill', this.clockState ? activeColor : inactiveColor);
    
    // Also update the rectangle inside the component
    this.clockComponent.selectAll('rect')
      .transition()
      .duration(50)
      .attr('fill', this.clockState ? activeColor : inactiveColor);
      
    // Get all components with clock pins and update them
    this.updateClockPins();
  }
  
  private updateClockConnections() {
    if (!this.svg) return;
    
    // Update any connection from this clock
    this.svg.selectAll('.connection.clock')
      .transition()
      .duration(50)
      .attr('stroke', this.clockState 
        ? this.styleService.getConnectionColor('active') 
        : this.styleService.getConnectionColor('clock'));
  }
  
  // New method to update all clock pins on connected components (like DFF)
  private updateClockPins() {
    if (!this.svg) return;
    
    // Find all pin elements with class 'clock'
    const clockPins = this.svg.selectAll('.pin.clock');
    
    // Get colors - use getComponentColor to work around the direct access error
    const activeColor = this.styleService.getComponentColor('active'); // Use active color instead
    const inactiveColor = this.styleService.getPinColor('clock');
    
    // Update pin colors
    clockPins.selectAll('path, circle')
      .transition()
      .duration(50)
      .attr('fill', this.clockState ? activeColor : inactiveColor);
  }
  
  private resetClockAppearance() {
    if (!this.clockComponent) return;
    
    // Reset to default appearance
    this.clockComponent.selectAll('rect')
      .transition()
      .duration(200)
      .attr('fill', this.styleService.getComponentColor('wire'));
    
    // Reset clock connections
    this.svg?.selectAll('.connection.clock')
      .transition()
      .duration(200)
      .attr('stroke', this.styleService.getConnectionColor('clock'));
  }
  
  // Methods for toggling selection capability
  private disableComponentSelection() {
    // Tell the interaction handler to disable selection
    this.interactionHandler.setSelectionEnabled(false);
    
    // Add a class to indicate simulation is running
    this.svg?.classed('simulation-running', true);
  }
  
  private enableComponentSelection() {
    // Tell the interaction handler to enable selection
    this.interactionHandler.setSelectionEnabled(true);
    
    // Remove the simulation running class
    this.svg?.classed('simulation-running', false);
  }
}
