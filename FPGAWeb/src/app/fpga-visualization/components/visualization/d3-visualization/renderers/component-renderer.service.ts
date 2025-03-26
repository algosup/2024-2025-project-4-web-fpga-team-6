import { Injectable } from '@angular/core';
import * as d3 from 'd3';
import { ComponentData, RendererContext } from '../models/visualization.model';
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
      .attr('transform', (d: ComponentData, i: number) => {
        const row = Math.floor(i / componentsPerRow);
        const col = i % componentsPerRow;
        
        // Position with margins to prevent cropping
        const x = col * (compWidth + compMargin);
        const y = row * (compHeight + compMargin);
        
        // Make sure we're not exceeding grid boundaries
        if (x + compWidth > gridWidth || y + compHeight > gridHeight) {
          console.warn('Component would be cropped. Adjusting layout may be needed.');
        }
        
        return `translate(${x}, ${y})`;
      });
    
    // Render each component with the specialized renderer
    nodes.each((d: ComponentData, i: number, elements: any) => {
      const node = d3.select(elements[i]);
      const fillColor = colorScale(d.type);
      this.specializedRenderer.renderComponent(node, d, fillColor);
    });
      
    // Return the nodes selection
    return nodes;
  }
}