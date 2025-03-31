import { Injectable } from '@angular/core';
import * as d3 from 'd3';
import { ComponentData } from '../models/visualization.model';

// Declare a custom event for position history
declare global {
  interface DocumentEventMap {
    'components-position-changed': CustomEvent<{
      components: ComponentData[];
      isUndo?: boolean;
    }>;
  }
}

@Injectable({
  providedIn: 'root'
})
export class InteractionHandlerService {
  // Track selected components
  private selectedComponents: Set<string> = new Set();
  // Track last mouse position for drag operations
  private lastMousePosition: {x: number, y: number} | null = null;
  // Track position history for undo
  private positionHistory: {components: ComponentData[], positions: {id: string, x: number, y: number}[]}[] = [];
  private readonly MAX_HISTORY = 20; // Maximum number of history states to keep

  setupInteractions(selection: d3.Selection<any, ComponentData, any, any>): void {
    this.initializeTooltip();
    this.setupSelectionBehavior(selection);
    this.setupKeyboardShortcuts();
  }
  
  private setupSelectionBehavior(selection: d3.Selection<any, ComponentData, any, any>): void {
    // Setup selection rectangle
    const svg = selection.node()?.ownerSVGElement;
    if (!svg) return;
    
    const svgContainer = d3.select(svg.parentNode as Element);
    
    let selectionRect: d3.Selection<SVGRectElement, unknown, null, undefined> | null = null;
    let startPos: [number, number] | null = null;
    
    // Create selection area on mouse down
    svgContainer.on('mousedown', (event) => {
      // Only start selection if not clicking on a component and if Shift isn't pressed
      if (event.target === svg || event.target.classList.contains('svg-container')) {
        // Don't interfere with pan/zoom
        if (event.button !== 0) return; // Only left mouse button
        
        event.preventDefault();
        
        // If not holding shift, clear current selection
        if (!event.shiftKey) {
          this.clearSelection(selection);
        }
        
        // Get mouse position relative to SVG
        const svgRect = svg.getBoundingClientRect();
        const mouseX = event.clientX - svgRect.left;
        const mouseY = event.clientY - svgRect.top;
        
        // Store start position
        startPos = [mouseX, mouseY];
        
        // Create selection rectangle
        selectionRect = d3.select(svg)
          .append('rect')
          .attr('class', 'selection-rect')
          .attr('x', mouseX)
          .attr('y', mouseY)
          .attr('width', 0)
          .attr('height', 0)
          .attr('stroke', '#007bff')
          .attr('stroke-width', 1)
          .attr('fill', '#007bff20')
          .attr('stroke-dasharray', '4,4');
      }
    });
    
    // Update selection area on mouse move
    svgContainer.on('mousemove', (event) => {
      if (startPos && selectionRect) {
        // Get current mouse position
        const svgRect = svg.getBoundingClientRect();
        const mouseX = event.clientX - svgRect.left;
        const mouseY = event.clientY - svgRect.top;
        
        // Calculate rectangle dimensions
        const [startX, startY] = startPos;
        const width = Math.abs(mouseX - startX);
        const height = Math.abs(mouseY - startY);
        const x = Math.min(startX, mouseX);
        const y = Math.min(startY, mouseY);
        
        // Update selection rectangle
        selectionRect
          .attr('x', x)
          .attr('y', y)
          .attr('width', width)
          .attr('height', height);
      }
    });
    
    // Finalize selection on mouse up
    svgContainer.on('mouseup', (event) => {
      if (startPos && selectionRect) {
        // Get selection rectangle bounds
        const rect = selectionRect.node()?.getBoundingClientRect();
        
        if (rect) {
          // Select components that intersect with the rectangle
          selection.each((d, i, nodes) => {
            const componentEl = nodes[i] as SVGGElement;
            const componentRect = componentEl.getBoundingClientRect();
            
            // Check if component intersects with selection rectangle
            if (this.rectanglesIntersect(rect, componentRect)) {
              this.selectComponent(d3.select(componentEl), d);
            }
          });
        }
        
        // Remove selection rectangle
        selectionRect.remove();
        selectionRect = null;
        startPos = null;
      }
    });

    // Add click selection for components
    selection.on('click', (event, d) => {
      event.stopPropagation();
      
      const componentEl = d3.select(event.currentTarget);
      
      if (event.shiftKey) {
        // Toggle selection with shift key
        if (this.selectedComponents.has(d.id)) {
          this.deselectComponent(componentEl, d);
        } else {
          this.selectComponent(componentEl, d);
        }
      } else {
        // Clear selection and select only this component
        this.clearSelection(selection);
        this.selectComponent(componentEl, d);
      }
    });

    // Setup multi-component dragging
    this.setupGroupDragging(selection);
  }

  private setupGroupDragging(selection: d3.Selection<any, ComponentData, any, any>): void {
    const dragBehavior = d3.drag<any, ComponentData>()
      .on('start', (event, d) => {
        // Don't initiate drag on right click
        if (event.sourceEvent.button !== 0) return;
        
        // Add to selection if not already selected
        const componentEl = d3.select(event.sourceEvent.currentTarget);
        if (!this.selectedComponents.has(d.id)) {
          if (!event.sourceEvent.shiftKey) {
            this.clearSelection(selection);
          }
          this.selectComponent(componentEl, d);
        }
        
        // Store starting positions for history
        const startPositions = Array.from(this.selectedComponents).map(id => {
          const component = this.findComponentById(selection, id);
          if (component) {
            return {
              id,
              x: component.position?.x || 0,
              y: component.position?.y || 0
            };
          }
          return null;
        }).filter(pos => pos !== null) as {id: string, x: number, y: number}[];
        
        // Save for undo
        this.addToPositionHistory(
          Array.from(this.selectedComponents).map(id => this.findComponentById(selection, id)).filter(Boolean) as ComponentData[],
          startPositions
        );

        this.lastMousePosition = { x: event.x, y: event.y };
        
        // Add dragging classes
        componentEl.classed('dragging', true);
        document.body.classList.add('dragging-active');
      })
      .on('drag', (event, d) => {
        if (!this.lastMousePosition) return;
        
        // Calculate movement delta
        const dx = event.x - this.lastMousePosition.x;
        const dy = event.y - this.lastMousePosition.y;
        
        // Move all selected components
        this.selectedComponents.forEach(id => {
          const component = this.findComponentById(selection, id);
          if (component) {
            if (!component.position) component.position = { x: 0, y: 0 };
            
            // Update position
            component.position.x += dx;
            component.position.y += dy;
            
            // Update component visual position
            const componentElement = selection.filter((d) => d.id === id);
            componentElement.attr('transform', `translate(${component.position.x}, ${component.position.y})`);
          }
        });
        
        // Update last mouse position
        this.lastMousePosition = { x: event.x, y: event.y };
        
        // Notify connection service
        this.notifyComponentsMoved();
      })
      .on('end', () => {
        // Reset state
        this.lastMousePosition = null;
        
        // Remove dragging classes
        selection.filter(d => this.selectedComponents.has(d.id))
          .classed('dragging', false);
        document.body.classList.remove('dragging-active');
      });
    
    // Apply drag behavior
    selection.call(dragBehavior);
  }

  private setupKeyboardShortcuts(): void {
    document.addEventListener('keydown', (event) => {
      // Undo with Ctrl+Z
      if (event.key === 'z' && (event.ctrlKey || event.metaKey)) {
        this.undoLastPositionChange();
      }
      // Escape to clear selection
      if (event.key === 'Escape') {
        const allComponents = d3.selectAll('.component');
        this.clearSelection(allComponents);
      }
    });
  }

  private addToPositionHistory(components: ComponentData[], positions: {id: string, x: number, y: number}[]): void {
    this.positionHistory.push({ components, positions });
    
    // Keep history at a reasonable size
    if (this.positionHistory.length > this.MAX_HISTORY) {
      this.positionHistory.shift();
    }
  }

  private undoLastPositionChange(): void {
    const lastState = this.positionHistory.pop();
    if (!lastState) return;
    
    // Restore component positions
    lastState.positions.forEach(pos => {
      const component = lastState.components.find(c => c.id === pos.id);
      if (component) {
        if (!component.position) component.position = { x: 0, y: 0 };
        component.position.x = pos.x;
        component.position.y = pos.y;
        
        // Update visual position
        const componentElement = d3.select(`[data-component-id="${pos.id}"]`);
        componentElement.attr('transform', `translate(${pos.x}, ${pos.y})`);
      }
    });
    
    // Notify connection service with isUndo flag
    const event = new CustomEvent('components-position-changed', {
      detail: {
        components: lastState.components,
        isUndo: true
      }
    });
    document.dispatchEvent(event);
  }

  private selectComponent(componentElement: d3.Selection<any, any, any, any>, component: ComponentData): void {
    this.selectedComponents.add(component.id);
    componentElement
      .classed('selected', true)
      .raise(); // Move selected elements to front
  }

  private deselectComponent(componentElement: d3.Selection<any, any, any, any>, component: ComponentData): void {
    this.selectedComponents.delete(component.id);
    componentElement.classed('selected', false);
  }

  private clearSelection(selection: d3.Selection<any, any, any, any>): void {
    this.selectedComponents.clear();
    selection.classed('selected', false);
  }

  private findComponentById(selection: d3.Selection<any, ComponentData, any, any>, id: string): ComponentData | null {
    let result: ComponentData | null = null;
    selection.each((d: ComponentData) => {
      if (d && d.id === id) {
        result = d;
      }
    });
    return result;
  }

  private rectanglesIntersect(rect1: DOMRect, rect2: DOMRect): boolean {
    return !(
      rect1.right < rect2.left || 
      rect1.left > rect2.right || 
      rect1.bottom < rect2.top || 
      rect1.top > rect2.bottom
    );
  }

  private notifyComponentsMoved(): void {
    // Collect all selected components
    const components: ComponentData[] = [];
    this.selectedComponents.forEach(id => {
      const componentElement = d3.select(`[data-component-id="${id}"]`);
      const component = componentElement.datum() as ComponentData;  // Explicit cast to ComponentData
      if (component && component.id) { // Verify it has at least an id property
        components.push(component);
      }
    });

    // Only dispatch if we have components
    if (components.length > 0) {
      // Dispatch event for connection service
      const event = new CustomEvent('components-position-changed', {
        detail: { components }
      });
      document.dispatchEvent(event);
    }
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