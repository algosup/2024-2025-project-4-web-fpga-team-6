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
  // Always default to grid layout and ignore other options
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
    console.log('D3Visualization ngOnChanges:', changes);
    
    // Check if isRunning or isPaused has changed
    if (changes['isRunning'] || changes['isPaused']) {
      console.log('Simulation state changed:', { 
        isRunning: this.isRunning, 
        isPaused: this.isPaused
      });
      this.handleSimulationStateChange();
    }
    
    // Add specific handling for changes to speed or frequency
    if (changes['clockFrequency']) {
      console.log('Clock frequency changed:', this.clockFrequency);
      if (this.isRunning && !this.isPaused) {
        this.updateClockFrequency();
      }
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
      // Always enforce grid layout regardless of input
      this.configService.updateLayoutConfig({ type: 'grid' });
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
    
    // Get layout options from config service but force grid type
    const layoutConfig = this.configService.layout;
    
    this.layoutService.applyLayout(context, nodes || this.svg.selectAll('.component'), {
      type: 'grid',  // Force grid layout type
      padding: layoutConfig.padding,
      enableDragging: layoutConfig.enableDragging,
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
    console.log('Finding clock component...');
  
    if (!this.svg) {
      console.warn('No SVG element found for finding clock');
      return;
    }
  
    // Try to find a component with name or ID containing 'clock' or 'clk'
    const clockComponents = this.svg.selectAll('.component')
      .filter((d: any) => {
        const isClockType = d.type && d.type.toLowerCase().includes('wire_input');
        const hasClockName = d.name && (d.name.toLowerCase().includes('clock') || d.name.toLowerCase().includes('clk'));
        const hasClockId = d.id && (d.id.toLowerCase().includes('clock') || d.id.toLowerCase().includes('clk'));
        
        const isClockComponent = isClockType && (hasClockName || hasClockId);
        if (isClockComponent) {
          console.log('Found potential clock component:', d);
        }
        return isClockComponent;
      });
    
    console.log('Clock component search results:', clockComponents.size());
    
    if (!clockComponents.empty()) {
      this.clockComponent = clockComponents;
      console.log('Found clock component:', clockComponents.data());
    } else {
      // Try any external input if no specific clock is found
      console.log('No clock-named component found, looking for any input component...');
      const inputComponents = this.svg.selectAll('.component')
        .filter((d: any) => d.type && d.type.toLowerCase().includes('wire_input'));
      
      console.log('Input components found:', inputComponents.size());
      
      if (!inputComponents.empty()) {
        this.clockComponent = inputComponents;
        console.log('Using input component as clock:', inputComponents.data());
      } else {
        console.warn('No clock component found for animation');
        this.clockComponent = null;
      }
    }
    
    // If we found a clock component, mark it visually
    if (this.clockComponent) {
      this.clockComponent.classed('clock-component', true);
      console.log('Clock component marked in visualization');
    }
  }
  
  private startClockAnimation() {
    console.log('Starting clock animation...');
    
    // Reset state if needed
    if (this.isRunning) {
      this.stopClockAnimation();
    }
    
    if (!this.clockComponent) {
      this.findClockComponent();
      if (!this.clockComponent) {
        console.warn('No clock component found for animation');
        return;
      }
    }
    
    // Show the clock indicator
    this.showClock = true;
    
    // Calculate interval based on frequency and simulation speed
    const intervalMs = 1000 / this.clockFrequency * this.simulationSpeed;
    
    console.log(`Starting clock with frequency ${this.clockFrequency} Hz, slow factor ${this.simulationSpeed}x, interval: ${intervalMs} ms`);
    
    // Create and start the timer
    this.clockTimer = new IntervalTimer(() => {
      this.toggleClockState();
    }, intervalMs);
    
    this.isRunning = true;
    this.isPaused = false;
    this.clockTimer.start(); // Make sure to explicitly start it
    
    // Also disable component selection during simulation
    this.disableComponentSelection();
    
    // Add simulation-running class to svg for animations
    this.svg?.classed('simulation-running', true);
  }
  
  private stopClockAnimation() {
    if (this.clockTimer) {
      this.clockTimer.stop();
      this.clockTimer = null;
    }
  }
  
  private toggleClockState() {
    this.clockState = !this.clockState;
    console.log('Clock state toggled:', this.clockState);
    
    // Get the component ID and pin ID of the clock component
    if (this.clockComponent) {
      const clockComponentData = this.clockComponent.datum();
      if (clockComponentData && clockComponentData.id) {
        // Use the updatePinState method which will handle propagation with delays
        this.updatePinState(
          clockComponentData.id,
          'out', // Assuming the output pin has ID 'out'
          this.clockState ? 'HIGH' : 'LOW'
        );
      } else {
        // Fallback to direct appearance update if no data is available
        this.updateClockAppearance();
      }
    } else {
      // Fallback if no clock component is found
      this.updateClockAppearance();
    }
    
    // Note: DFF updates will happen through the connection propagation
    // after the clock signal reaches them, rather than instantly here
  }

  // New method to handle DFF updates on clock transitions
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
    
    if (!this.svg) { // Add explicit early return if svg is null
      console.warn('Cannot propagate signals: SVG is not initialized');
      return;
    }
    
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
    if (this.svg) { // Add null check here
      this.svg.selectAll('.connection:not(.clock)')
        .style('transition-duration', `${adjustedTransitionMs}ms`);
    }
      
    // Schedule propagation of active signals
    if (this.isRunning && !this.isPaused) {
      this.propagateSignalsWithDelays();
    }
  }

  /**
   * Updates the state of a specific pin and propagates the signal to connections
   */
  public updatePinState(
    componentId: string, 
    pinId: string, 
    state: 'HIGH' | 'LOW', 
    propagate: boolean = true
  ): void {
    if (!this.svg) return;
    
    // Find the component
    const component = this.svg.select(`.component[data-component-id="${componentId}"]`);
    if (component.empty()) {
      console.warn(`Component ${componentId} not found`);
      return;
    }
    
    // Find the pin
    const pin = component.select(`.pin[data-pin-id="${pinId}"]`);
    if (pin.empty()) {
      console.warn(`Pin ${pinId} not found in component ${componentId}`);
      return;
    }
    
    // Get current state to check if it's actually changing
    const currentState = pin.attr('data-pin-state') || 'LOW';
    if (currentState === state) {
      // No change, no need to update
      return;
    }
    
    // Update pin state attribute
    pin.attr('data-pin-state', state);
    
    // Remove old state classes
    pin.classed('high', false);
    pin.classed('low', false);
    
    // Add new state class
    pin.classed(state.toLowerCase(), true);
    
    // Update pin appearance
    const pinType = pin.attr('data-pin-type');
    const fillColor = state === 'HIGH' ? 
      this.styleService.colors.activePin : 
      this.styleService.getPinColor(pinType);
    
    // Update all shape elements inside the pin
    pin.selectAll('path, circle, rect')
      .transition()
      .duration(150)
      .attr('fill', fillColor);
    
    // Only propagate signals if requested and from output pins
    if (propagate && (pinType === 'output' || pinType === 'clock')) {
      this.propagateSignalFromPin(componentId, pinId, state);
    }
    
    // If this is an input pin, we may need to update the component's internal state
    // This would be specific to each component type (e.g., a gate would compute its output)
    if (pinType === 'input') {
      this.updateComponentInternalState(componentId);
    }
  }

  /**
   * Updates the state of a connection and animates signal propagation
   * @param connectionId The ID of the connection
   * @param state The new state (HIGH or LOW)
   * @param animate Whether to animate the propagation
   */
  public updateConnectionState(connectionId: string, state: 'HIGH' | 'LOW', animate: boolean = true): void {
    if (!this.svg) return;
  
    const connection = this.svg.select(`.connection[data-connection-id="${connectionId}"]`);
    if (connection.empty()) {
      console.warn(`Connection ${connectionId} not found`);
      return;
    }
  
    // Check if this is a clock connection
    const isClockConnection = connection.classed('clock');
    
    // Update connection state attribute
    connection.attr('data-connection-state', state);
  
    // Find the connection data for delay calculation
    const connectionData = this.connections.find(conn => conn.id === connectionId);
    if (!connectionData) return;
  
    // Get base styling color
    const baseColor = this.styleService.getConnectionColor(
      isClockConnection ? 'clock' : 'data'
    );
    
    // Get active styling color
    const activeColor = this.styleService.colors.activeConnection || '#FF5252';
    
    // Get path length for animation
    const pathLength = (connection.node() as SVGPathElement)?.getTotalLength() || 100;
    
    // Calculate animation duration based on propagation physics and slowing factor
    const delay = this.calculateConnectionDelay(connectionData);
  
    // Special handling for clock connections
    if (isClockConnection) {
      if (state === 'HIGH') {
        // HIGH clock - Show progressive animation
        connection.classed('active', true)
          .attr('stroke', activeColor)
          .attr('stroke-width', 3)
          .attr('stroke-opacity', 1)
          .attr('stroke-dasharray', `${pathLength} ${pathLength}`)
          .attr('stroke-dashoffset', pathLength)
          .style('transition', 'none')
          .style('filter', 'drop-shadow(0 0 2px rgba(255, 82, 82, 0.5))');
        
        // Force browser reflow
        (connection.node() as SVGPathElement)?.getBoundingClientRect();
        
        // Animate the wire filling with signal
        connection.transition()
          .duration(delay)
          .ease(d3.easeLinear)
          .attr('stroke-dashoffset', 0)
          .on('end', () => {
            // When animation completes, update the target pin
            this.updatePinState(
              connectionData.target.component.id,
              connectionData.target.pin.id,
              state,
              true
            );
            // Note: We don't remove dasharray properties to keep the dashed appearance
          });
      } else {
        // LOW clock - Show persistent dashed orange path
        connection.classed('active', false)
          .attr('stroke', '#FF9800') // Orange color for inactive clock path
          .attr('stroke-width', 2)
          .attr('stroke-opacity', 0.5) // Visible but subtle
          .attr('stroke-dasharray', '5, 5') // Dashed appearance
          .attr('stroke-dashoffset', 0)
          .style('filter', 'none');
        
        // Update target pin
        this.updatePinState(
          connectionData.target.component.id,
          connectionData.target.pin.id,
          state,
          true
        );
      }
      return; // Exit early after handling clock connection
    }
  
    // Handle non-clock connections as before
    // ... rest of the existing code for other connection types
  }
  
  /**
   * Calculates realistic propagation delay based on physics and slowing factor
   */
  private calculateConnectionDelay(connection: ConnectionData): number {
    // Physical constants
    const SPEED_OF_LIGHT = 299792458; // meters per second
    const VELOCITY_FACTOR = 0.6; // Signal velocity in FPGA wires (60% of c)
    const PIXELS_PER_MM = 5; // Visual scale factor
    
    // Get or calculate connection length in pixels
    let lengthInPixels = connection.length;
    if (lengthInPixels === undefined) {
      if (this.svg) {
        const pathEl = this.svg.select(`.connection[data-connection-id="${connection.id}"]`);
        if (!pathEl.empty()) {
          const pathNode = pathEl.node();
          lengthInPixels = pathNode ? (pathNode as SVGPathElement).getTotalLength() : 100;
        } else {
          lengthInPixels = 100; // Default
        }
      } else {
        // Calculate Euclidean distance as fallback
        const sourceX = connection.source.component.x ?? 
                        connection.source.component.position?.x ?? 0;
        const sourceY = connection.source.component.y ?? 
                        connection.source.component.position?.y ?? 0;
        const targetX = connection.target.component.x ?? 
                        connection.target.component.position?.x ?? 0;
        const targetY = connection.target.component.y ?? 
                        connection.target.component.position?.y ?? 0;
        const dx = targetX - sourceX;
        const dy = targetY - sourceY;
        lengthInPixels = Math.sqrt(dx*dx + dy*dy);
      }
    }
    
    // Convert pixels to millimeters then to meters
    const lengthInMeters = (lengthInPixels / PIXELS_PER_MM) / 1000;
    
    // Calculate actual propagation time in picoseconds
    // t = distance / (speed * velocity factor)
    const propagationTimeSeconds = lengthInMeters / (SPEED_OF_LIGHT * VELOCITY_FACTOR);
    const propagationTimePicoseconds = propagationTimeSeconds * 1e12;
    
    // Set minimum propagation time to 1ps for very short wires
    const minPropagationTime = Math.max(propagationTimePicoseconds, 1);
    
    // Apply slowing factor to convert picoseconds to visible milliseconds
    // Example: 5ps * 10^10 slowing factor = 50ms visible delay
    const visibleDelayMs = minPropagationTime * this.simulationSpeed;
    
    console.log(`Wire ${connection.id}: ${lengthInPixels}px (~${(lengthInMeters*1000).toFixed(2)}mm), ` + 
                `${propagationTimePicoseconds.toFixed(2)}ps → ${visibleDelayMs.toFixed(2)}ms visual delay`);
    
    // Ensure minimum visible delay
    return Math.max(visibleDelayMs, 50);
  }

  /**
   * Propagates a signal from an output pin through connected wires
   * @param componentId The component ID containing the source pin
   * @param pinId The source pin ID
   * @param state The signal state to propagate
   */
  private propagateSignalFromPin(componentId: string, pinId: string, state: 'HIGH' | 'LOW'): void {
    if (!this.connections) return;
    
    // Find all connections originating from this pin
    const outgoingConnections = this.connections.filter(conn => 
      conn.source.component.id === componentId && conn.source.pin.id === pinId
    );
    
    if (outgoingConnections.length === 0) return;
    
    console.log(`Propagating ${state} signal from ${componentId}.${pinId} to ${outgoingConnections.length} connections`);
    
    // Update each outgoing connection with animation
    outgoingConnections.forEach(conn => {
      // For HIGH state, use animated propagation
      // For LOW state, immediately update without animation
      this.updateConnectionState(conn.id, state, true);
    });
  }

  /**
   * Updates the animation duration when simulation speed changes
   */
  public updateSimulationSpeed(speed: number): void {
    this.simulationSpeed = speed;
    
    // Apply the speed to CSS variables for animations
    if (this.svg) {
      this.svg.style('--signal-propagation-duration', `${50 * speed}ms`);
    }
    
    console.log(`Simulation speed updated: ${speed}x`);
  }

  /**
   * Resets all signal states in the circuit
   */
  public resetAllSignalStates(): void {
    if (!this.svg) return;
    
    // Reset all pins
    this.svg.selectAll('.pin')
      .attr('data-pin-state', 'LOW')
      .classed('high', false)
      .classed('low', true)
      .each((d, i, nodes) => {
        const pin = d3.select(nodes[i]);
        const pinType = pin.attr('data-pin-type');
        const color = this.styleService.getPinColor(pinType);
        
        pin.selectAll('path, circle, rect')
          .transition()
          .duration(200)
          .attr('fill', color);
      });
    
    // Reset all connections
    this.svg.selectAll('.connection')
      .attr('data-connection-state', 'LOW')
      .classed('active', false)
      .each((d, i, nodes) => {
        const connection = d3.select(nodes[i]);
        const type = connection.attr('class').includes('clock') ? 'clock' : 
                     connection.attr('class').includes('control') ? 'control' : 'data';
        
        connection.transition()
          .duration(200)
          .attr('stroke', this.styleService.getConnectionColor(type))
          .attr('stroke-opacity', 0.8)
          .attr('stroke-dasharray', null)
          .attr('stroke-dashoffset', null);
      });
  }

  /**
   * Updates the simulation speed and recalculates propagation delays
   * @param speed The new simulation speed
   */
  public setSimulationSpeed(speed: number): void {
    // Update the slowing factor
    this.simulationSpeed = speed;
    
    console.log(`Simulation speed updated: ${speed}x slowing factor`);
    
    // Update CSS custom property for animations
    document.documentElement.style.setProperty('--signal-propagation-base', `${50 * speed}ms`);
    
    // Update clock speed if running
    if (this.clockTimer) {
      // Calculate new interval based on frequency and simulation speed
      const newInterval = 1000 / this.clockFrequency * this.simulationSpeed;
      console.log(`Updating clock interval to ${newInterval.toFixed(2)}ms (${this.clockFrequency}Hz × ${this.simulationSpeed}x)`);
      
      if (this.clockTimer.isRunning) {
        // Stop and restart with new interval
        this.clockTimer.stop();
        this.clockTimer = new IntervalTimer(() => {
          this.toggleClockState();
        }, newInterval);
        this.clockTimer.start();
      } else {
        // Just update the interval without starting
        this.clockTimer = new IntervalTimer(() => {
          this.toggleClockState();
        }, newInterval);
      }
    }
  }

  /**
   * Updates a component's internal logic based on its input pins
   */
  private updateComponentInternalState(componentId: string): void {
    // Get the component data
    const component = this.components?.find(c => c.id === componentId);
    if (!component) return;
    
    // Process based on component type
    switch (component.type) {
      case 'AND':
        this.processAndGate(component);
        break;
      case 'OR':
        this.processOrGate(component);
        break;
      case 'NOT':
        this.processNotGate(component);
        break;
      case 'DFF':
        // DFFs are updated on clock transitions, not immediately
        break;
      // Add more component types as needed
    }
  }

  /**
   * Process AND gate logic
   * @param component The AND gate component
   */
  private processAndGate(component: ComponentData): void {
    if (!this.svg) return;

    // Find the component element
    const compElement = this.svg.select(`.component[data-component-id="${component.id}"]`);
    if (compElement.empty()) return;
    
    // Get all input pins
    const inputPins = compElement.selectAll('.pin[data-pin-type="input"]');
    let allHigh = true;
    
    // Check if all inputs are HIGH
    inputPins.each(function() {
      const pin = d3.select(this);
      const state = pin.attr('data-pin-state') || 'LOW';
      if (state !== 'HIGH') {
        allHigh = false;
      }
    });
    
    // Find output pin
    const outputPin = compElement.select('.pin[data-pin-type="output"]');
    if (outputPin.empty()) return;
    
    // Set output state based on AND logic
    const outputPinId = outputPin.attr('data-pin-id');
    if (outputPinId) {
      // Only update if the state is changing
      const currentOutState = outputPin.attr('data-pin-state') || 'LOW';
      const newState = allHigh ? 'HIGH' : 'LOW';
      
      if (currentOutState !== newState) {
        // Update the output pin using our global method, but avoid infinite recursion
        // by not propagating from within the component logic
        this.updatePinState(component.id, outputPinId, newState, true);
      }
    }
  }

  /**
   * Process OR gate logic
   * @param component The OR gate component
   */
  private processOrGate(component: ComponentData): void {
    if (!this.svg) return;

    // Find the component element
    const compElement = this.svg.select(`.component[data-component-id="${component.id}"]`);
    if (compElement.empty()) return;
    
    // Get all input pins
    const inputPins = compElement.selectAll('.pin[data-pin-type="input"]');
    let anyHigh = false;
    
    // Check if any input is HIGH
    inputPins.each(function() {
      const pin = d3.select(this);
      const state = pin.attr('data-pin-state') || 'LOW';
      if (state === 'HIGH') {
        anyHigh = true;
      }
    });
    
    // Find output pin
    const outputPin = compElement.select('.pin[data-pin-type="output"]');
    if (outputPin.empty()) return;
    
    // Set output state based on OR logic
    const outputPinId = outputPin.attr('data-pin-id');
    if (outputPinId) {
      const currentOutState = outputPin.attr('data-pin-state') || 'LOW';
      const newState = anyHigh ? 'HIGH' : 'LOW';
      
      if (currentOutState !== newState) {
        this.updatePinState(component.id, outputPinId, newState, true);
      }
    }
  }

  /**
   * Process NOT gate logic
   * @param component The NOT gate component
   */
  private processNotGate(component: ComponentData): void {
    if (!this.svg) return;

    // Find the component element
    const compElement = this.svg.select(`.component[data-component-id="${component.id}"]`);
    if (compElement.empty()) return;
    
    // Get input pin (NOT gate typically has 1 input)
    const inputPin = compElement.select('.pin[data-pin-type="input"]');
    if (inputPin.empty()) return;
    
    // Get input state
    const inputState = inputPin.attr('data-pin-state') || 'LOW';
    
    // Find output pin
    const outputPin = compElement.select('.pin[data-pin-type="output"]');
    if (outputPin.empty()) return;
    
    // Set output state based on NOT logic (invert input)
    const outputPinId = outputPin.attr('data-pin-id');
    if (outputPinId) {
      const currentOutState = outputPin.attr('data-pin-state') || 'LOW';
      const newState = inputState === 'HIGH' ? 'LOW' : 'HIGH';
      
      if (currentOutState !== newState) {
        this.updatePinState(component.id, outputPinId, newState, true);
      }
    }
  }
}
