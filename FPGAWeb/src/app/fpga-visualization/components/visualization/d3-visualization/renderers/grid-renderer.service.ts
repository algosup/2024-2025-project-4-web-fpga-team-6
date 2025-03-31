import { Injectable } from '@angular/core';
import { RendererContext } from '../models/visualization.model';
import * as d3 from 'd3';

@Injectable({
  providedIn: 'root'
})
export class GridRendererService {
  
  renderGrid(context: RendererContext): void {
    const { svg, config } = context;
    
    // Use full dimensions for the grid
    const fullWidth = config.width;
    const fullHeight = config.height;
    const gridSize = 20;
    
    // Create grid lines - first clear any existing grid
    svg.selectAll('.grid').remove();
    
    // Create grid at the SVG level (not the translated group)
    const grid = svg.append('g')
      .attr('class', 'grid')
      // Offset the grid to counteract all margins
      .attr('transform', `translate(-${config.margin.left}, -${config.margin.top})`); 
      
    // Vertical grid lines - cover the full container width
    for (let i = 0; i <= fullWidth; i += gridSize) {
      grid.append('line')
        .attr('x1', i)
        .attr('y1', 0)
        .attr('x2', i)
        .attr('y2', fullHeight)
        .attr('stroke', '#e0e0e0')
        .attr('stroke-width', 0.5);
    }
    
    // Horizontal grid lines - cover the full container height
    for (let i = 0; i <= fullHeight; i += gridSize) {
      grid.append('line')
        .attr('x1', 0)
        .attr('y1', i)
        .attr('x2', fullWidth)
        .attr('y2', i)
        .attr('stroke', '#e0e0e0')
        .attr('stroke-width', 0.5);
    }
  }
}