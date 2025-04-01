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
  // Store original styles for later restoration
  private originalStyles = new Map<string, {stroke: string, strokeWidth: string, filter: string}>();
  // Track whether selection is enabled
  private selectionEnabled: boolean = true;
  // Fix tooltip type to match d3.select('#component-tooltip') return type
  private tooltip: d3.Selection<HTMLDivElement, unknown, HTMLElement, any> | null = null;
  
  // Enable or disable selection functionality
  setSelectionEnabled(enabled: boolean): void {
    this.selectionEnabled = enabled;
    
    // If disabling selection, clear any current selection
    if (!enabled && this.selectedComponents.size > 0) {
      const allComponents = d3.selectAll('.component');
      this.clearSelection(allComponents);
    }
    
    // Update cursor style for all components
    d3.selectAll('.component')
      .style('cursor', enabled ? 'grab' : 'default');
  }

  // Main setup method for component interactions
  setupInteractions(selection: d3.Selection<any, ComponentData, any, any>): void {
    this.initializeTooltip();
    this.setupSelectionBehavior(selection);
    this.setupKeyboardShortcuts();
  }
  
  // Initialize tooltip element for component information
  private initializeTooltip(): void {
    try {
      // Add tooltip div if it doesn't exist
      if (d3.select('#component-tooltip').empty()) {
        this.tooltip = d3.select('body').append('div')
          .attr('id', 'component-tooltip')
          .attr('class', 'tooltip')
          .style('position', 'absolute')
          .style('visibility', 'hidden')
          .style('background-color', 'white')
          .style('border', '1px solid #ddd')
          .style('border-radius', '4px')
          .style('padding', '8px')
          .style('box-shadow', '0 2px 5px rgba(0,0,0,0.15)')
          .style('pointer-events', 'none')
          .style('z-index', '1000')
          .style('opacity', '0');
      } else {
        // No need for type assertion now since the types match
        this.tooltip = d3.select('#component-tooltip');
      }
    } catch (error) {
      console.error('Error initializing component tooltip:', error);
      this.tooltip = null;
    }
  }

  // Setup hover tooltip behavior
  private setupTooltipHandlers(selection: d3.Selection<any, ComponentData, any, any>): void {
    if (!this.tooltip) return;
    
    selection
      .on('mouseover', (event, d) => {
        // Skip tooltip during drag operations
        if (document.body.classList.contains('dragging-active')) return;
        
        try {
          // Show component info in tooltip
          this.tooltip
            ?.style('visibility', 'visible')
            ?.style('opacity', '1')
            ?.html(`
              <div>
                <strong>${d.name || d.id}</strong>
                <div>Type: ${d.type}</div>
                ${d.connections ? `<div>Connections: ${Object.keys(d.connections).length}</div>` : ''}
              </div>
            `);
        } catch (error) {
          console.error('Error updating tooltip content:', error);
        }
      })
      .on('mousemove', (event) => {
        try {
          // Position tooltip near cursor
          this.tooltip
            ?.style('top', `${event.pageY + 10}px`)
            ?.style('left', `${event.pageX + 10}px`);
        } catch (error) {
          console.error('Error updating tooltip position:', error);
        }
      })
      .on('mouseout', () => {
        try {
          // Hide tooltip
          this.tooltip
            ?.style('visibility', 'hidden')
            ?.style('opacity', '0');
        } catch (error) {
          console.error('Error hiding tooltip:', error);
        }
      });
  }

  // Setup selection behavior for components
  private setupSelectionBehavior(selection: d3.Selection<any, ComponentData, any, any>): void {
    // Setup selection rectangle
    const svg = selection.node()?.ownerSVGElement;
    if (!svg) {
      console.error('No SVG element found for selection behavior');
      return;
    }
    
    const svgContainer = d3.select(svg.parentNode as Element);
    if (!svgContainer) {
      console.error('No SVG container found for selection behavior');
      return;
    }
    
    let selectionRect: d3.Selection<SVGRectElement, unknown, null, undefined> | null = null;
    let startPos: [number, number] | null = null;
    
    // Create selection area on mouse down
    svgContainer.on('mousedown', (event) => {
      // Skip if selection is disabled
      if (!this.selectionEnabled) return;

      // Only start selection if not clicking on a component
      if (event.target === svg || event.target.classList.contains('svg-container')) {
        // Don't interfere with pan/zoom
        if (event.button !== 0) return; // Only left mouse button
        
        event.preventDefault();
        
        // If not holding shift, clear current selection when clicking on empty space
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
          .attr('height', 0);
          
        // Add selecting class to document body for styling
        document.body.classList.add('selecting');
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
        try {
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
        } catch (error) {
          console.error('Error during selection completion:', error);
        } finally {
          // Remove selection rectangle
          if (selectionRect) {
            selectionRect.remove();
            selectionRect = null;
            startPos = null;
          }
          
          // Remove selecting class from document body
          document.body.classList.remove('selecting');
        }
      }
    });

    // Add click selection for components
    selection.on('click', (event, d) => {
      // Stop event propagation to prevent other handlers from firing
      event.stopPropagation();
      
      // Skip if selection is disabled
      if (!this.selectionEnabled) return;
      
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
    
    // Add a click handler on the SVG background to clear selection
    d3.select(svg).on('click', (event) => {
      // Only clear if clicking directly on SVG background (not on components)
      if (event.target === svg) {
        this.clearSelection(selection);
      }
    });
    
    // Setup tooltip handlers
    this.setupTooltipHandlers(selection);
  }

  // Setup dragging behavior for groups of selected components
  private setupGroupDragging(selection: d3.Selection<any, ComponentData, any, any>): void {
    const dragBehavior = d3.drag<any, ComponentData>()
      .on('start', (event, d) => {
        // Skip if selection is disabled
        if (!this.selectionEnabled) return;

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
        
        // Store starting positions for undo history
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
          Array.from(this.selectedComponents).map(id => this.findComponentById(selection, id))
            .filter(Boolean) as ComponentData[],
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
        
        // Move all selected components together
        this.selectedComponents.forEach(id => {
          const component = this.findComponentById(selection, id);
          if (component) {
            if (!component.position) component.position = { x: 0, y: 0 };
            
            // Update position
            component.position.x += dx;
            component.position.y += dy;
            
            // Update component visual position
            const componentElement = selection.filter((comp) => comp.id === id);
            componentElement.attr('transform', `translate(${component.position.x}, ${component.position.y})`);
          }
        });
        
        // Update last mouse position
        this.lastMousePosition = { x: event.x, y: event.y };
        
        // Notify connection service
        this.notifyComponentsMoved();
      })
      .on('end', (event) => {
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

  // Setup keyboard shortcuts for common operations
  private setupKeyboardShortcuts(): void {
    document.addEventListener('keydown', (event) => {
      // Undo with Ctrl+Z
      if (event.key === 'z' && (event.ctrlKey || event.metaKey)) {
        this.undoLastPositionChange();
        event.preventDefault();
      }
      // Escape to clear selection
      if (event.key === 'Escape') {
        const allComponents = d3.selectAll('.component');
        this.clearSelection(allComponents);
      }
      // Delete/Backspace to remove selected components (if implemented)
      if (event.key === 'Delete' || event.key === 'Backspace') {
        // This would be implemented if component deletion is supported
        console.log('Delete key pressed - component deletion not implemented');
      }
    });
  }

  // Add a position change to the undo history
  private addToPositionHistory(components: ComponentData[], positions: {id: string, x: number, y: number}[]): void {
    this.positionHistory.push({ components, positions });
    
    // Keep history at a reasonable size
    if (this.positionHistory.length > this.MAX_HISTORY) {
      this.positionHistory.shift();
    }
  }

  // Undo the last position change
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

  // Select a component and apply visual highlighting
  private selectComponent(componentElement: d3.Selection<any, any, any, any>, component: ComponentData): void {
    this.selectedComponents.add(component.id);
    componentElement
      .classed('selected', true)
      .raise(); // Move selected elements to front
    
    // Store original styles for later restoration
    if (!this.originalStyles.has(component.id)) {
      // Store defaults if we don't already have them
      this.originalStyles.set(component.id, {
        stroke: '#000',
        strokeWidth: '1',
        filter: 'none'
      });
    }
        
    // Highlight the component with a distinct visual style
    componentElement.selectAll('rect, path, circle')
      .attr('stroke', '#2196F3')
      .attr('stroke-width', 2)
      .style('filter', 'drop-shadow(0 0 5px rgba(33, 150, 243, 0.7))');
  }

  // Deselect a component and restore original visual style
  private deselectComponent(componentElement: d3.Selection<any, any, any, any>, component: ComponentData): void {
    this.selectedComponents.delete(component.id);
    componentElement.classed('selected', false);
    
    // Restore to default styles
    componentElement.selectAll('rect, path, circle')
      .attr('stroke', '#000') 
      .attr('stroke-width', 1)
      .style('filter', 'none');
  }

  // Clear all current selections
  private clearSelection(selection: d3.Selection<any, any, any, any>): void {
    // Reset styles on all selected elements
    selection.filter('.selected')
      .selectAll('rect, path, circle')
      .attr('stroke', '#000')
      .attr('stroke-width', 1)
      .style('filter', 'none');
    
    // Clear selection state
    this.selectedComponents.clear();
    selection.classed('selected', false);
  }

  // Find a component by its ID
  private findComponentById(selection: d3.Selection<any, ComponentData, any, any>, id: string): ComponentData | null {
    let result: ComponentData | null = null;
    selection.each((d: ComponentData) => {
      if (d && d.id === id) {
        result = d;
      }
    });
    return result;
  }

  // Check if two rectangles intersect
  private rectanglesIntersect(rect1: DOMRect, rect2: DOMRect): boolean {
    return !(
      rect1.right < rect2.left || 
      rect1.left > rect2.right || 
      rect1.bottom < rect2.top || 
      rect1.top > rect2.bottom
    );
  }

  // Notify other services of component position changes
  private notifyComponentsMoved(): void {
    // Collect all selected components
    const components: ComponentData[] = [];
    
    this.selectedComponents.forEach(id => {
      // We need to find the component with the right type
      const component = this.findComponentById(d3.selectAll('.component') as d3.Selection<any, ComponentData, any, any>, id);
      if (component) {
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

  // Get currently selected component IDs
  getSelectedComponentIds(): string[] {
    return Array.from(this.selectedComponents);
  }
  
  // Check if a specific component is selected
  isComponentSelected(id: string): boolean {
    return this.selectedComponents.has(id);
  }
  
  // Force select a specific component by ID
  selectComponentById(id: string): void {
    const component = d3.select(`[data-component-id="${id}"]`);
    if (!component.empty()) {
      this.selectComponent(component, component.datum() as ComponentData);
    }
  }
}