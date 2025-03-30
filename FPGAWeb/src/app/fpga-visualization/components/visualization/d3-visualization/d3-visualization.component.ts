import { Component, ElementRef, Input, OnChanges, OnInit, OnDestroy, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Design } from '../../../../services/design.service';
import * as d3 from 'd3';

// Import models and services
import { ComponentData, VisualizationConfig, RendererContext } from './models/visualization.model';
import { DataExtractorService } from './utils/data-extractor.service';
import { GridRendererService } from './renderers/grid-renderer.service';
import { ComponentRendererService } from './renderers/component-renderer.service';
import { SpecializedComponentRendererService } from './renderers/specialized-component-renderer.service';
import { InteractionHandlerService } from './handlers/interaction-handler.service';
import { SimulationHandlerService } from './handlers/simulation-handler.service';

// Import new services
import { LayoutService, LayoutOptions } from './layout/layout-service';
import { ConnectionService, ConnectionData } from './connections/connection-service';
import { ThemeService } from '../theme/theme.service';

@Component({
  selector: 'app-d3-visualization',
  standalone: true,
  imports: [CommonModule],
  providers: [
    DataExtractorService,
    GridRendererService,
    ComponentRendererService,
    SpecializedComponentRendererService,
    InteractionHandlerService,
    SimulationHandlerService,
    LayoutService,
    ConnectionService,
    ThemeService // Add ThemeService here
  ],
  templateUrl: './d3-visualization.component.html',
  styleUrls: [
    './d3-visualization.component.css',
    '../theme/fpga-theme.css'  // Fix path to theme CSS
  ]
})
export class D3VisualizationComponent implements OnInit, OnChanges, OnDestroy {
  @Input() design: Design | null = null;
  @Input() isRunning = false;
  @Input() layoutType: 'grid' | 'force' | 'hierarchical' = 'grid';
  
  @ViewChild('svgContainer', { static: true }) private svgContainer!: ElementRef;
  
  private svg: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;
  private components: ComponentData[] = [];
  private connections: ConnectionData[] = [];
  private parsedData: any = null;
  
  private config: VisualizationConfig = {
    width: 800,
    height: 600,
    margin: { top: 20, right: 20, bottom: 30, left: 50 },
    componentSize: {
      width: 120,
      height: 60,
      margin: 30
    }
  };

  constructor(
    private dataExtractor: DataExtractorService,
    private gridRenderer: GridRendererService,
    private componentRenderer: ComponentRendererService,
    private interactionHandler: InteractionHandlerService,
    private simulationHandler: SimulationHandlerService,
    private layoutService: LayoutService,
    private connectionService: ConnectionService,
    private themeService: ThemeService
  ) {}

  ngOnInit() {
    // Apply theme when component initializes
    this.themeService.applyTheme();
    
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
      this.applyCurrentLayout();
    }
  }

  private initializeSvg() {
    // Clear any existing SVG
    d3.select(this.svgContainer.nativeElement).select('svg').remove();

    // Get container dimensions for responsive sizing
    const containerWidth = this.svgContainer.nativeElement.clientWidth;
    const containerHeight = this.svgContainer.nativeElement.clientHeight;
    
    // Update config with container dimensions
    this.config.width = Math.max(containerWidth, 800);
    this.config.height = Math.max(containerHeight, 600);

    // Create SVG element with full container width/height
    const svgSelection = d3.select(this.svgContainer.nativeElement)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${this.config.width} ${this.config.height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');
      
    this.svg = svgSelection.append('g')
      .attr('transform', `translate(${this.config.margin.left},${this.config.margin.top})`);
      
    // Create renderer context
    const context: RendererContext = {
      svg: this.svg,
      config: this.config
    };
      
    // Add background grid
    this.gridRenderer.renderGrid(context);
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
      this.svg.selectAll('.connections').remove();
      
      // Extract components from parsed data
      this.components = this.dataExtractor.extractComponents(this.parsedData);
      
      // Create renderer context
      const context: RendererContext = {
        svg: this.svg,
        config: this.config
      };
      
      // Render components
      const componentNodes = this.componentRenderer.renderComponents(context, this.components);
      
      // Apply the layout
      this.applyCurrentLayout(componentNodes);
      
      // Extract and render connections
      this.connections = this.connectionService.extractConnections(this.parsedData, this.components);
      this.connectionService.renderConnections(context, this.components, this.connections);
      
      // Setup interactions
      this.interactionHandler.setupInteractions(componentNodes);
      
      // Update simulation state if running
      this.handleSimulationStateChange();
      
    } catch (e) {
      console.error('Error parsing JSON for visualization:', e);
    }
  }
  
  private applyCurrentLayout(nodes?: d3.Selection<any, ComponentData, any, any>) {
    if (!this.svg || !nodes) return;
    
    const context: RendererContext = {
      svg: this.svg,
      config: this.config
    };
    
    const layoutOptions: LayoutOptions = {
      type: this.layoutType,
      padding: 30,
      enableDragging: true
    };
    
    this.layoutService.applyLayout(context, nodes, layoutOptions);
    
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

  // When determining component colors
  private getComponentColor(component: ComponentData): string {
    return this.themeService.getComponentColor(component.type);
    // Replace any existing color determination logic
  }

  ngOnDestroy() {
    // Cleanup logic if needed
  }
}
