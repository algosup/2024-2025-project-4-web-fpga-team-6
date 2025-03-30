import { Injectable } from '@angular/core';
import * as d3 from 'd3';
import { ComponentData, RendererContext } from '../models/visualization.model';
import { ComponentTemplates, Pin } from '../models/component-templates.model';
import { SpecializedComponentRendererService } from './specialized-component-renderer.service';

@Injectable({
  providedIn: 'root'
})
export class ComponentRendererService {
  
  constructor(private specializedRenderer: SpecializedComponentRendererService) {}
  
  renderComponents(context: RendererContext, components: ComponentData[]): d3.Selection<any, ComponentData, any, any> {
    const { svg, config } = context;
    
    // Create a color scale for different component types
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);
    
    // Calculate available space for components
    const gridWidth = config.width - config.margin.left - config.margin.right;
    const gridHeight = config.height - config.margin.top - config.margin.bottom;
    
    // Size of each component space allocation (for layout purposes)
    const { width: compWidth, height: compHeight, margin: compMargin } = config.componentSize;
    
    // Calculate how many components can fit in each row
    const componentsPerRow = Math.floor((gridWidth) / (compWidth + compMargin));
    
    // Draw components
    const nodes = svg.selectAll('.component')
      .data(components)
      .enter()
      .append('g')
      .attr('class', 'component')
      .attr('id', d => `component-${d.id}`); // Add ID for targeting specific components
    
    // Draw each component using its template
    nodes.each((d, i, nodeElements) => {
      const node = d3.select(nodeElements[i]);
      const componentType = d.type;
      const template = ComponentTemplates.getTemplateForComponent(d);
      const fillColor = colorScale(componentType);
      
      // Render the component shape
      template.renderShape(node, fillColor, d.name); // Pass component name to renderShape
      
      // Add title for tooltip
      node.append('title').text(d.name);
      
      // Render pins
      this.renderPins(node, template.pins);
    });
      
    // Return the nodes selection
    return nodes;
  }
  
  // Add the renderPins method that was referenced but not implemented
  private renderPins(node: d3.Selection<any, any, any, any>, pins: Pin[]): void {
    pins.forEach(pin => {
      const pinGroup = node.append('g')
        .attr('class', `pin ${pin.type}`)
        .attr('transform', `translate(${pin.position.x}, ${pin.position.y})`);
        
      // Draw a small circle for each pin
      pinGroup.append('circle')
        .attr('r', 3)
        .attr('fill', pin.type === 'input' ? '#2196F3' : '#FF5722')
        .attr('stroke', '#000')
        .attr('stroke-width', 1);
        
      // Optional pin label
      if (pin.name) {
        pinGroup.append('text')
          .attr('x', pin.type === 'input' ? -5 : 5)
          .attr('y', 3)
          .attr('text-anchor', pin.type === 'input' ? 'end' : 'start')
          .attr('font-size', '8px')
          .text(pin.name);
      }
    });
  }
}