import { Injectable } from '@angular/core';
import * as d3 from 'd3';

@Injectable({
  providedIn: 'root'
})
export class SimulationHandlerService {
  
  startSimulation(svg: d3.Selection<SVGGElement, unknown, null, undefined>): void {
    // Implement animation or visual updates when simulation is running
    svg.selectAll('.component rect')
      .transition()
      .duration(500)
      .attr('opacity', 0.9)
      .attr('stroke-width', 2);
  }
  
  stopSimulation(svg: d3.Selection<SVGGElement, unknown, null, undefined>): void {
    // Reset visual state when simulation is stopped
    svg.selectAll('.component rect')
      .transition()
      .duration(500)
      .attr('opacity', 0.7)
      .attr('stroke-width', 1);
  }
}