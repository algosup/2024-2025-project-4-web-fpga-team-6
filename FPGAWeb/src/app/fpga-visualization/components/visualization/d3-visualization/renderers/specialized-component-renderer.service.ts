import { Injectable } from '@angular/core';
import * as d3 from 'd3';
import { ComponentData, RendererContext } from '../models/visualization.model';
import { ComponentTemplate, ComponentTemplates, Pin } from '../models/component-templates.model';

@Injectable({
  providedIn: 'root'
})
export class SpecializedComponentRendererService {
  
  // Changed the type to be more flexible
  renderComponent(
    g: d3.Selection<any, any, any, any>, 
    component: ComponentData,
    fillColor: string
  ): void {
    // Get the template for this component type
    const template = ComponentTemplates.getTemplateForComponent(component);
    
    // Render the basic shape
    template.renderShape(g, fillColor);
    
    // Render pins
    this.renderPins(g, template);
    
    // Add component name if not already rendered by the shape
    if (!g.select('text').empty()) {
      g.append('text')
        .attr('x', template.width / 2)
        .attr('y', template.height + 15)
        .attr('text-anchor', 'middle')
        .attr('fill', '#333')
        .attr('font-size', '10px')
        .text(component.name || component.id);
    }
  }
  
  // Also fix these methods to use more flexible types
  private renderPins(
    g: d3.Selection<any, any, any, any>,
    template: ComponentTemplate
  ): void {
    
    // Rest of the method remains the same
    const pinsGroup = g.append('g')
      .attr('class', 'pins');
      
    // Add each pin
    template.pins.forEach(pin => {
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
    
    // Simplified pin visualization with consistent dot representation
    switch(pin.type) {
      case 'input':
        // Small circle for inputs
        g.append('circle')
          .attr('r', 3)
          .attr('fill', '#0B3D91');
        break;
      
      case 'output':
        // Identical small circle for outputs for consistency
        g.append('circle')
          .attr('r', 3)
          .attr('fill', '#0B3D91');
        break;
      
      case 'clock':
        // Clock symbol (small triangle)
        g.append('path')
          .attr('d', `
            M ${-directionX * 6},${-directionY * 4}
            L ${directionX * 0},0
            L ${-directionX * 6},${directionY * 4}
            Z
          `)
          .attr('fill', '#0B3D91');
        break;
      
      case 'control':
        // Small square for control pins
        g.append('rect')
          .attr('x', -3)
          .attr('y', -3)
          .attr('width', 6)
          .attr('height', 6)
          .attr('fill', '#0B3D91');
        break;
    }
  }
}