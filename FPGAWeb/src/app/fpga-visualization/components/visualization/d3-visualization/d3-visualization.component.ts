import { Component, ElementRef, Input, OnChanges, OnInit, SimpleChanges, ViewChild } from '@angular/core';
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
    SimulationHandlerService
  ],
  templateUrl: './d3-visualization.component.html',
  styleUrls: ['./d3-visualization.component.css']
})
export class D3VisualizationComponent implements OnInit, OnChanges {
  @Input() design: Design | null = null;
  @Input() isRunning = false;
  @ViewChild('svgContainer', { static: true }) private svgContainer!: ElementRef;
  
  private svg: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;
  private components: ComponentData[] = [];
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
    private simulationHandler: SimulationHandlerService
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
      
      // Extract components from parsed data
      this.components = this.dataExtractor.extractComponents(this.parsedData);
      
      // Create renderer context
      const context: RendererContext = {
        svg: this.svg,
        config: this.config
      };
      
      // Render components
      const componentNodes = this.componentRenderer.renderComponents(context, this.components);
      
      // Setup interactions
      this.interactionHandler.setupInteractions(componentNodes);
      
      // Update simulation state if running
      this.handleSimulationStateChange();
      
    } catch (e) {
      console.error('Error parsing JSON for visualization:', e);
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
