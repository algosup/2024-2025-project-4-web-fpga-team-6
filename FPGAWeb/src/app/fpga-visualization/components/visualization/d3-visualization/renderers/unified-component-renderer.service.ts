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
  
  // Enhanced clock pin rendering
  private renderPinByType(
    g: d3.Selection<any, any, any, any>,
    pin: Pin
  ): void {
    const pinRadius = this.styleService.dimensions.pinRadius;
    const symbolSize = this.styleService.dimensions.pinSymbolSize;
    
    // Calculate direction based on pin side
    const directionX = pin.side === 'left' ? 1 : (pin.side === 'right' ? -1 : 0);
    const directionY = pin.side === 'top' ? 1 : (pin.side === 'bottom' ? -1 : 0);
    
    // Add class based on pin type for easier selection later
    g.classed(pin.type, true);
    
    switch(pin.type) {
      case 'input':
        g.append('path')
          .attr('d', `M ${-directionX * symbolSize},0 L 0,${-symbolSize * 0.6} L 0,${symbolSize * 0.6} Z`)
          .attr('fill', this.styleService.getPinColor('input'));
        break;
      
      case 'output':
        g.append('circle')
          .attr('r', pinRadius)
          .attr('fill', this.styleService.getPinColor('output'));
        break;
      
      case 'clock':
        // Improved clock pin with more noticeable shape
        // Triangle pointing inward for clock pins
        g.append('path')
          .attr('d', `
            M ${-directionX * symbolSize},${-directionY * symbolSize * 0.8}
            L ${directionX * symbolSize * 0.5},0
            L ${-directionX * symbolSize},${directionY * symbolSize * 0.8}
            Z
          `)
          .attr('fill', this.styleService.getPinColor('clock'))
          .attr('class', 'clock-pin-symbol');

        // Add a small circle at the center for better visibility
        g.append('circle')
          .attr('r', pinRadius * 0.6)
          .attr('fill', this.styleService.getPinColor('clock'))
          .attr('class', 'clock-pin-center');
        break;
      
      case 'control':
        g.append('rect')
          .attr('x', -symbolSize * 0.6)
          .attr('y', -symbolSize * 0.6)
          .attr('width', symbolSize * 1.2)
          .attr('height', symbolSize * 1.2)
          .attr('fill', this.styleService.getPinColor('control'));
        break;
    }
    
    // Add pin label if available
    if (pin.name) {
      const labelOffset = this.styleService.dimensions.pinLabelOffset;
      const labelX = pin.side === 'right' ? labelOffset : (pin.side === 'left' ? -labelOffset : 0);
      const labelY = pin.side === 'bottom' ? labelOffset : (pin.side === 'top' ? -labelOffset : 0);
      
      g.append('text')
        .attr('x', labelX)
        .attr('y', labelY)
        .attr('text-anchor', pin.side === 'right' ? 'start' : (pin.side === 'left' ? 'end' : 'middle'))
        .attr('dominant-baseline', pin.side === 'bottom' ? 'hanging' : (pin.side === 'top' ? 'auto' : 'central'))
        .attr('font-size', '10px')
        .attr('fill', this.styleService.colors.text)
        .text(pin.name);
    }
  }
}