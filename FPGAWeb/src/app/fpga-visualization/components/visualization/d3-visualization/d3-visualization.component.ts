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
import { ClockIndicatorComponent } from '../clock-indicator/clock-indicator.component';

@Component({
  selector: 'app-d3-visualization',
  standalone: true,
  imports: [CommonModule, ClockIndicatorComponent],
  providers: [
    DataExtractorService,
    GridRendererService,
    UnifiedComponentRendererService,
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
  
  // Private backing fields with public properties
  private _simulationSpeed: number = 1; // Slow factor
  private _clockFrequency: number = 1; // Hz (not MHz)
  
  // Change from private to public so it can be accessed in the template
  public clockState: boolean = false;
  private clockTimer: IntervalTimer | null = null;
  private clockComponent: d3.Selection<any, any, any, any> | null = null;
  
  @ViewChild('svgContainer', { static: true }) private svgContainer!: ElementRef;
  
  private svg: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;
  private components: ComponentData[] = [];
  private connections: ConnectionData[] = [];
  private parsedData: any = null;

  // Add a public property to expose clock state to the template
  public showClock: boolean = false;
  
  constructor(
    private dataExtractor: DataExtractorService,
    private gridRenderer: GridRendererService,
    private componentRenderer: UnifiedComponentRendererService,
    private interactionHandler: InteractionHandlerService,
    private simulationHandler: SimulationHandlerService,
    private layoutService: LayoutService,
    private connectionService: ConnectionService,
    private styleService: VisualizationStyleService,
    private configService: VisualizationConfigService
  ) {}

  // Input setters and getters - make getters public with same accessibility as setters
  @Input() 
  set simulationSpeed(value: number) {
    this._simulationSpeed = value;
    // Only update signal propagation delays, not clock frequency
    if (this.isRunning && !this.isPaused) {
      this.updateSignalPropagationDelays();
    }
  }
  
  // Must be public (same as setter)
  get simulationSpeed(): number {
    return this._simulationSpeed;
  }
  
  @Input() 
  set clockFrequency(value: number) {
    this._clockFrequency = value;
    // Update clock animation timing when frequency changes
    if (this.isRunning && !this.isPaused) {
      this.updateClockFrequency();
    }
  }
  
  // Must be public (same as setter)
  get clockFrequency(): number {
    return this._clockFrequency;
  }

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
    if ((changes['clockFrequency'] || changes['simulationSpeed']) && this.isRunning && !this.isPaused) {
      if (changes['clockFrequency']) {
        this.updateClockFrequency();
      }
      if (changes['simulationSpeed']) {
        this.updateSignalPropagationDelays();
      }
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
    if (this.isRunning) {
      if (this.isPaused) {
        this.pauseSimulation();
      } else {
        // Starting or resuming
        if (this.clockTimer) {
          this.resumeSimulation();
        } else {
          this.startSimulation();
        }
        this.showClock = true;
      }
    } else {
      this.stopSimulation();
      this.showClock = false;
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
    // Calculate new interval based on frequency only (not affected by slow factor)
    if (this.clockTimer && this.isRunning && !this.isPaused) {
      // Use clockFrequency directly in Hz (not MHz)
      const intervalMs = 1000 / this.clockFrequency;
      console.log(`Updating clock timer interval to ${intervalMs} ms (${this.clockFrequency} Hz)`);
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
    
    // Calculate clock interval based on frequency directly in Hz
    const intervalMs = 1000 / this.clockFrequency;
    
    console.log(`Starting clock animation with frequency ${this.clockFrequency} Hz (interval: ${intervalMs} ms)`);
    
    // Create and start the timer
    this.clockTimer = new IntervalTimer(() => {
      this.toggleClockState();
    }, intervalMs);
  }
  
  private stopClockAnimation() {
    if (this.clockTimer) {
      this.clockTimer.stop();
      this.clockTimer = null;
    }
  }
  
  private toggleClockState() {
    this.clockState = !this.clockState;
    
    // Update only the visual appearance
    this.updateClockAppearance();
    this.updateClockPins();
    this.updateClockConnections(); // Also update connections visually
    
    // Don't update connections here
    // Instead, trigger DFF updates on clock transitions
    if (this.clockState) {
      // On rising edge of clock
      this.updateDFFStates();
    }
  }

  // Add this new method to handle DFF updates on clock transitions
  private updateDFFStates() {
    // This is where you would update the state of DFFs based on their inputs
    // For each DFF:
    // 1. Check the D input
    // 2. Update the Q output (with appropriate delay)
    // 3. Update any connections from Q
    
    // Implementation would depend on your DFF model and simulation logic
  }
  
  private updateClockAppearance() {
    if (!this.clockComponent) return;
    
    // Get colors from style service
    const activeColor = this.styleService.getComponentColor('active');
    const inactiveColor = this.styleService.getComponentColor('wire');
    
    // Update the GPIO component representing the clock
    this.clockComponent.classed('active', this.clockState);
    
    // Find the clock GPIO component by its type
    this.clockComponent
      .selectAll('rect')
      .transition()
      .duration(50)
      .attr('fill', this.clockState ? activeColor : inactiveColor);
      
    // Find the output pin of the clock GPIO component
    const clockPinSelector = this.clockComponent.selectAll('.pin[data-pin-id="out"]');
    if (!clockPinSelector.empty()) {
      // Update the pin color
      clockPinSelector.selectAll('path, circle')
        .transition()
        .duration(50)
        .attr('fill', this.clockState ? activeColor : this.styleService.getPinColor('output'));
    }
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
    
    // Get colors for active and inactive states
    const activeColor = this.styleService.getComponentColor('active');
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
    
    // Reset clock pins
    this.svg?.selectAll('.pin.clock path, .pin.clock circle')
      .transition()
      .duration(200)
      .attr('fill', this.styleService.getPinColor('clock'));
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

  // New method to handle signal propagation with delays
  private propagateSignalsWithDelays() {
    console.log('Propagating signals with delays based on slow factor');
    
    // Get all components that are directly connected to clock
    const clockDrivenComponents = this.getClockDrivenComponents();
    
    // For each component, schedule updates based on slow factor
    clockDrivenComponents.forEach(component => {
      const delay = this.calculatePropagationDelay(component);
      setTimeout(() => {
        this.updateComponentState(component);
      }, delay);
    });
  }

  // Helper method to find components directly connected to clock
  private getClockDrivenComponents(): any[] {
    // This is a placeholder implementation
    // You should implement logic to find components connected to clock
    if (!this.svg) return [];
    
    // Find components with clock pins
    const clockComponents = this.svg.selectAll('.component')
      .filter(function() {
        return d3.select(this).selectAll('.pin.clock').size() > 0;
      });
    
    return clockComponents.nodes();
  }

  // Helper method to calculate propagation delay based on component distance and slow factor
  private calculatePropagationDelay(component: any): number {
    // Example implementation - could be more sophisticated based on
    // distance from clock, number of hops, etc.
    const baseDelay = 50; // Base delay in ms
    return baseDelay * this.simulationSpeed;
  }

  // Helper method to update a component's visual state
  private updateComponentState(component: any) {
    // This is a placeholder implementation
    // You should implement logic to update component states
    // based on their inputs and the simulation model
    const componentEl = d3.select(component);
    
    // Example: Toggle active state for demonstration
    const isActive = componentEl.classed('active');
    componentEl.classed('active', !isActive);
    
    // Example: Update output pins
    componentEl.selectAll('.pin[data-pin-type="output"]')
      .classed('active', !isActive);
  }

  // Add this method that's being referenced but missing
  private updateSignalPropagationDelays(): void {
    // Apply slow factor to all signal propagation animations
    console.log(`Updating signal propagation delays with slow factor ${this.simulationSpeed}x`);
    
    // Example implementation:
    const baseTransitionMs = 100; // Base transition time in ms
    const adjustedTransitionMs = baseTransitionMs * this.simulationSpeed;
    
    // Update CSS variables or direct styles for signal animations
    this.svg?.selectAll('.connection:not(.clock)')
      .style('transition-duration', `${adjustedTransitionMs}ms`);
      
    // Schedule propagation of active signals
    if (this.isRunning && !this.isPaused) {
      this.propagateSignalsWithDelays();
    }
  }
}
