import { Injectable } from '@angular/core';
import * as d3 from 'd3';
import { ComponentData } from '../models/visualization.model';

@Injectable({
  providedIn: 'root'
})
export class InteractionHandlerService {
  
  setupInteractions(selection: d3.Selection<any, ComponentData, any, any>): void {
    // Your interaction logic here
  }
  
  private initializeTooltip(): void {
    // Add tooltip div if it doesn't exist
    if (d3.select('#tooltip').empty()) {
      d3.select('body').append('div')
        .attr('id', 'tooltip')
        .attr('class', 'tooltip');
    }
  }
}