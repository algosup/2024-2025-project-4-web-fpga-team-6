import { Injectable } from '@angular/core';
import * as d3 from 'd3';
import { ComponentTemplate } from '../models/component-templates.model';

@Injectable({
  providedIn: 'root'
})
export class ComponentShapeRenderer {
  
  // Render the appropriate shape based on template
  renderComponentShape(
    g: d3.Selection<any, any, any, any>,
    template: ComponentTemplate,
    fillColor: string,
    name: string = template.type
  ): void {
    switch (template.shape) {
      case 'rectangle':
        this.renderRectangle(g, template.width, template.height, fillColor, name);
        break;
      case 'trapezoid':
        this.renderTrapezoid(g, template, fillColor, name);
        break;
      case 'rounded':
        this.renderRounded(g, template, fillColor, name);
        break;
      case 'tag':
        this.renderTag(g, template, fillColor, name);
        break;
      case 'custom':
        if (template.shapeData && template.shapeData.renderFn) {
          template.shapeData.renderFn(g, template, fillColor, name);
        } else {
          // Fallback to rectangle if custom shape doesn't provide rendering function
          this.renderRectangle(g, template.width, template.height, fillColor, name);
        }
        break;
      default:
        this.renderRectangle(g, template.width, template.height, fillColor, name);
    }
  }
  
  // Standard rectangle shape (e.g., for DFF)
  private renderRectangle(
    g: d3.Selection<any, any, any, any>,
    width: number,
    height: number,
    fillColor: string,
    name: string
  ): void {
    // Draw the rectangle
    g.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('stroke', '#000')
      .attr('stroke-width', 1)
      .attr('fill', fillColor);
    
    // Add the component label
    g.append('text')
      .attr('x', width / 2)
      .attr('y', height / 2)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', '#000')
      .style('font-weight', 'bold')
      .text(name);
  }
  
  // Trapezoid shape for LUT components
  private renderTrapezoid(
    g: d3.Selection<any, any, any, any>,
    template: ComponentTemplate,
    fillColor: string,
    name: string
  ): void {
    const width = template.width;
    const height = template.height;
    const rightHeight = template.shapeData?.rightHeight || (height * 0.4);
    const topOffset = (height - rightHeight) / 2;
    
    // Create a trapezoid path
    const path = g.append('path')
      .attr('d', `
        M 0,0 
        L ${width},${topOffset} 
        L ${width},${topOffset + rightHeight} 
        L 0,${height} 
        Z
      `)
      .attr('stroke', '#000')
      .attr('stroke-width', 1)
      .attr('fill', fillColor);
    
    // Add the component label
    g.append('text')
      .attr('x', width / 2)
      .attr('y', height / 2)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', '#000')
      .style('font-weight', 'bold')
      .text(name);
  }
  
  // Rounded rectangle shape for external wires/ports
  private renderRounded(
    g: d3.Selection<any, any, any, any>,
    template: ComponentTemplate,
    fillColor: string,
    name: string
  ): void {
    const width = template.width;
    const height = template.height;
    const radius = template.shapeData?.radius || 10;
    
    // Create rounded rectangle
    g.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('rx', radius)
      .attr('ry', radius)
      .attr('stroke', '#000')
      .attr('stroke-width', 1)
      .attr('fill', fillColor);
    
    // Add direction indicator if provided
    if (template.shapeData?.direction) {
      const direction = template.shapeData.direction;
      let indicator = '';
      
      if (direction === 'input') {
        indicator = '→';
      } else if (direction === 'output') {
        indicator = '←';
      } else if (direction === 'inout') {
        indicator = '↔';
      }
      
      if (indicator) {
        g.append('text')
          .attr('x', width / 6)
          .attr('y', height / 2)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('fill', '#000')
          .style('font-size', '14px')
          .text(indicator);
      }
    }
    
    // Add the component name
    g.append('text')
      .attr('x', width / 2 + 5) // Offset to make room for indicator
      .attr('y', height / 2)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', '#000')
      .style('font-size', '10px')
      .text(name);
  }
  
  // Tag-like shape for GPIO
  private renderTag(
    g: d3.Selection<any, any, any, any>,
    template: ComponentTemplate,
    fillColor: string,
    name: string
  ): void {
    const width = template.width;
    const height = template.height;
    const tagWidth = width * 0.2; // Width of the "tag" part
    
    // Create tag path
    const path = g.append('path')
      .attr('d', `
        M 0,0 
        L ${width - tagWidth},0 
        L ${width},${height / 2} 
        L ${width - tagWidth},${height} 
        L 0,${height} 
        Z
      `)
      .attr('stroke', '#000')
      .attr('stroke-width', 1)
      .attr('fill', fillColor);
    
    // Add direction indicator
    if (template.shapeData?.direction) {
      const direction = template.shapeData.direction;
      let indicator = '';
      
      if (direction === 'input') {
        indicator = 'IN';
      } else if (direction === 'output') {
        indicator = 'OUT';
      } else if (direction === 'bidirectional') {
        indicator = 'I/O';
      }
      
      if (indicator) {
        g.append('text')
          .attr('x', width - tagWidth / 2)
          .attr('y', height / 2)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('fill', '#000')
          .style('font-size', '10px')
          .style('font-weight', 'bold')
          .text(indicator);
      }
    }
    
    // Add the component name
    g.append('text')
      .attr('x', (width - tagWidth) / 2)
      .attr('y', height / 2)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', '#000')
      .text(name);
  }
}