import { Component, ElementRef, Input, OnChanges, OnInit, SimpleChanges, ViewChild } from '@angular/core';
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
export class D3VisualizationComponent implements OnInit, OnChanges {
  @Input() design: Design | null = null;
  @Input() isRunning = false;
  @Input() layoutType: 'grid' | 'force' | 'hierarchical' = 'grid';
  @Input() darkMode: boolean = false;
  
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

  ngOnChanges(changes: SimpleChanges) {
    if (changes['design'] && this.svg) {
      this.updateVisualization();
    }
    
    if (changes['isRunning'] && this.svg && this.parsedData) {
      this.handleSimulationStateChange();
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
  
  private handleSimulationStateChange() {
    if (!this.svg) return;
    
    if (this.isRunning) {
      this.simulationHandler.startSimulation(this.svg);
    } else {
      this.simulationHandler.stopSimulation(this.svg);
    }
  }
}
