import { Injectable } from '@angular/core';
import * as d3 from 'd3';
import { ComponentData, RendererContext } from '../models/visualization.model';
import { ComponentTemplate, ComponentTemplates, Pin } from '../models/component-templates.model';
import { VisualizationStyleService } from '../styles/visualization-style.service';
import { ComponentShapeRenderer } from './component-shape-renderer.service';

@Injectable({
  providedIn: 'root'
})
export class UnifiedComponentRendererService {
  
  constructor(
    private styleService: VisualizationStyleService,
    private shapeRenderer: ComponentShapeRenderer
  ) {}
  
  // Main method to render all components
  renderComponents(context: RendererContext, components: ComponentData[]): d3.Selection<any, ComponentData, any, any> {
    const { svg, config } = context;
    
    // Draw components
    const nodes = svg.selectAll('.component')
      .data(components)
      .enter()
      .append('g')
      .attr('class', 'component')
      .attr('id', d => `component-${d.id}`)
      .attr('data-component-id', d => d.id);  // Add this line for selection
    
    // Draw each component using its template and the style service
    nodes.each((d, i, nodeElements) => {
      const node = d3.select(nodeElements[i]);
      const template = ComponentTemplates.getTemplateForComponent(d);
      // Get color from style service instead of d3 color scale
      const fillColor = this.styleService.getComponentColor(d.type);
      
      // Render the component shape
      this.renderComponent(node, d, fillColor, template);
      
      // Add title for tooltip
      node.append('title').text(d.name || d.id);
    });
      
    // Return the nodes selection
    return nodes;
  }

  // Method to render a single component
  renderComponent(
    g: d3.Selection<any, any, any, any>,
    component: ComponentData,
    fillColor: string,
    template: ComponentTemplate
  ): void {
    // Use the shape renderer to draw the component
    this.shapeRenderer.renderComponentShape(g, template, fillColor, component.name);
    
    // Render pins
    this.renderPins(g, template.pins);
  }
  
  // Consolidated pin rendering method
  private renderPins(
    g: d3.Selection<any, any, any, any>,
    pins: Pin[]
  ): void {
    const pinsGroup = g.append('g')
      .attr('class', 'pins');
      
    // Add each pin
    pins.forEach(pin => {
      const pinG = pinsGroup.append('g')
        .attr('class', `pin ${pin.type}`)
        .attr('transform', `translate(${pin.position.x}, ${pin.position.y})`);
      
      // Draw pin based on its type
      this.renderPinByType(pinG, pin);
      
      // Add pin label
      let textX = 0;
      let textAnchor = 'middle';
      
      switch(pin.side) {
        case 'left':
          textX = 10;
          textAnchor = 'start';
          break;
        case 'right':
          textX = -10;
          textAnchor = 'end';
          break;
      }
      
      pinG.append('text')
        .attr('x', textX)
        .attr('y', 0)
        .attr('text-anchor', textAnchor)
        .attr('dominant-baseline', 'middle')
        .attr('fill', '#333')
        .attr('font-size', '10px')
        .text(pin.name);
    });
  }
  
  // Consistent pin rendering by type
  private renderPinByType(
    g: d3.Selection<any, any, any, any>,
    pin: Pin
  ): void {
    // Calculate direction based on pin side
    let directionX = 0;
    let directionY = 0;
    
    switch(pin.side) {
      case 'left':
        directionX = -1;
        break;
      case 'right':
        directionX = 1;
        break;
      case 'top':
        directionY = -1;
        break;
      case 'bottom':
        directionY = 1;
        break;
    }
    
    const pinRadius = this.styleService.dimensions.pinRadius;
    const symbolSize = this.styleService.dimensions.pinSymbolSize;
    
    // Use style service for consistent colors
    switch(pin.type) {
      case 'input':
        g.append('circle')
          .attr('r', pinRadius)
          .attr('fill', this.styleService.getPinColor('input'));
        break;
      
      case 'output':
        g.append('circle')
          .attr('r', pinRadius)
          .attr('fill', this.styleService.getPinColor('output'));
        break;
      
      case 'clock':
        g.append('path')
          .attr('d', `
            M ${-directionX * symbolSize},${-directionY * symbolSize * 0.6}
            L ${directionX * 0},0
            L ${-directionX * symbolSize},${directionY * symbolSize * 0.6}
            Z
          `)
          .attr('fill', this.styleService.getPinColor('clock'));
        break;
      
      case 'control':
        const halfSize = symbolSize / 2;
        g.append('rect')
          .attr('x', -halfSize)
          .attr('y', -halfSize)
          .attr('width', symbolSize)
          .attr('height', symbolSize)
          .attr('fill', this.styleService.getPinColor('control'));
        break;
    }
  }
}