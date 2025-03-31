import { Injectable } from '@angular/core';
import * as d3 from 'd3';
import { ComponentData, RendererContext } from '../models/visualization.model';
import { VisualizationConfigService } from '../config/visualization-config.service';

export interface LayoutOptions {
  type: 'grid';
  padding?: number;
  enableDragging?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class LayoutService {
  private draggedNode: any = null;
  
  constructor(private configService: VisualizationConfigService) {}
  
  applyLayout(
    context: RendererContext,
    nodes: d3.Selection<any, ComponentData, any, any>,
    options?: Partial<LayoutOptions>
  ): void {
    const layoutConfig = this.configService.layout;
    const mergedOptions: LayoutOptions = {
      type: 'grid',
      padding: options?.padding || layoutConfig.padding,
      enableDragging: options?.enableDragging !== undefined ? options.enableDragging : layoutConfig.enableDragging
    };
    
    const hasFF2Structure = nodes.data().some(d => 
      d.id.includes('ext_input') || 
      d.id.includes('ext_output') || 
      d.id.includes('dff_') || 
      d.id.includes('lut_k_')
    );
    
    if (hasFF2Structure) {
      this.applySchematicLayout(context, nodes, mergedOptions);
    } else {
      this.applyGridLayout(context, nodes, mergedOptions);
    }
    
    if (mergedOptions.enableDragging) {
      this.enableDragging(nodes);
    }
  }
  
  private applyGridLayout(
    context: RendererContext,
    nodes: d3.Selection<any, ComponentData, any, any>,
    options: LayoutOptions
  ): void {
    nodes.data().forEach(d => {
      if (!d.position) {
        d.position = { x: 0, y: 0 };
      }
    });

    const { config } = context;
    const gridWidth = config.width - config.margin.left - config.margin.right;
    const gridHeight = config.height - config.margin.top - config.margin.bottom;
    const { width: compWidth, height: compHeight } = config.componentSize;
    const compMargin = config.componentSize.margin || 30;
    const padding = options.padding || 30;
    
    const allComponents = nodes.data();
    const inputComponents = allComponents.filter(d => 
      d.type?.toLowerCase().includes('input') || 
      d.id?.includes('ext_input') ||
      (d.tags && d.tags.includes('input'))
    );
    
    const outputComponents = allComponents.filter(d => 
      d.type?.toLowerCase().includes('output') || 
      d.id?.includes('ext_output') ||
      (d.tags && d.tags.includes('output'))
    );
    
    const otherComponents = allComponents.filter(d => 
      !inputComponents.includes(d) && !outputComponents.includes(d)
    );
    
    const leftMargin = padding * 2;
    const topMargin = padding * 2;
    const componentsPerCol = Math.max(5, Math.floor(gridHeight / (compHeight + compMargin)));
    
    inputComponents.forEach((component, i) => {
      const row = i % componentsPerCol;
      const col = Math.floor(i / componentsPerCol);
      
      component.position = {
        x: leftMargin + col * (compWidth + compMargin),
        y: topMargin + row * (compHeight + compMargin)
      };
    });
    
    outputComponents.forEach((component, i) => {
      const row = i % componentsPerCol;
      const col = Math.floor(i / componentsPerCol);
      
      component.position = {
        x: gridWidth - compWidth - leftMargin - col * (compWidth + compMargin),
        y: topMargin + row * (compHeight + compMargin)
      };
    });
    
    const middleStartX = Math.max(
      leftMargin + Math.ceil(inputComponents.length / componentsPerCol) * (compWidth + compMargin) + compMargin,
      gridWidth / 4
    );
    
    const middleEndX = Math.min(
      gridWidth - compWidth - leftMargin - Math.ceil(outputComponents.length / componentsPerCol) * (compWidth + compMargin) - compMargin,
      gridWidth * 3 / 4
    );
    
    const middleWidth = middleEndX - middleStartX;
    const componentsPerRow = Math.max(1, Math.floor(middleWidth / (compWidth + compMargin)));
    
    otherComponents.forEach((component, i) => {
      const row = Math.floor(i / componentsPerRow);
      const col = i % componentsPerRow;
      
      component.position = {
        x: middleStartX + col * (compWidth + compMargin),
        y: topMargin + row * (compHeight + compMargin)
      };
    });
    
    nodes.attr('transform', (d: ComponentData) => {
      if (d.position) {
        d.x = d.position.x;
        d.y = d.position.y;
      }
      return `translate(${d.position?.x || 0}, ${d.position?.y || 0})`;
    });
  }

  private applySchematicLayout(
    context: RendererContext,
    nodes: d3.Selection<any, ComponentData, any, any>,
    options: LayoutOptions
  ): void {
    nodes.data().forEach(d => {
      if (!d.position) {
        d.position = { x: 0, y: 0 };
      }
    });

    const { config } = context;
    const width = config.width - config.margin.left - config.margin.right;
    const height = config.height - config.margin.top - config.margin.bottom;
    const { width: compWidth, height: compHeight } = config.componentSize;
    const padding = options.padding || 30;
    
    const inputWires = nodes.data().filter(d => d.id.includes('ext_input'));
    const outputWires = nodes.data().filter(d => d.id.includes('ext_output'));
    const luts = nodes.data().filter(d => d.id.includes('lut_k'));
    const dffs = nodes.data().filter(d => d.id.includes('dff_'));
    
    const clockInputs = inputWires.filter(d => d.id.toLowerCase().includes('clk') || d.id.toLowerCase().includes('clock'));
    const resetInputs = inputWires.filter(d => d.id.toLowerCase().includes('reset') || d.id.toLowerCase().includes('rst'));
    const controlInputs = [...clockInputs, ...resetInputs];
    
    const dataInputs = inputWires.filter(d => !controlInputs.includes(d));
    
    const lutToDffMap = new Map<string, string[]>();
    const dffToLutMap = new Map<string, string>();
    
    luts.forEach(lut => {
      const lutIdMatch = lut.id.match(/lut_k_(\d+)/);
      if (lutIdMatch) {
        const lutNum = parseInt(lutIdMatch[1]);
        const connectedDffs = dffs.filter(dff => {
          const dffIdMatch = dff.id.match(/dff_(\d+)/);
          return dffIdMatch && parseInt(dffIdMatch[1]) === lutNum;
        }).map(dff => dff.id);
        
        if (connectedDffs.length > 0) {
          lutToDffMap.set(lut.id, connectedDffs);
          connectedDffs.forEach(dffId => {
            dffToLutMap.set(dffId, lut.id);
          });
        }
      }
    });
    
    const controlLaneTopY = padding / 2;
    const controlLaneBottomY = height - padding / 2;

    clockInputs.forEach((wire, i) => {
      if (!wire.position) wire.position = { x: 0, y: 0 };
      wire.position.x = padding + i * (compWidth + padding);
      wire.position.y = controlLaneTopY;
      
      wire.isControlSignal = true;
      wire.controlType = 'clock';
    });
    
    resetInputs.forEach((wire, i) => {
      if (!wire.position) wire.position = { x: 0, y: 0 };
      wire.position.x = padding + i * (compWidth + padding);
      wire.position.y = controlLaneBottomY;
      
      wire.isControlSignal = true;
      wire.controlType = 'reset';
    });
    
    dataInputs.forEach((wire, i) => {
      if (!wire.position) wire.position = { x: 0, y: 0 };
      wire.position.x = padding;
      wire.position.y = padding * 2 + i * (compHeight + padding);
    });
    
    const processedDffs = new Set<string>();
    luts.forEach((lut, i) => {
      if (!lut.position) lut.position = { x: 0, y: 0 };
      
      lut.position.x = compWidth + padding * 3;
      lut.position.y = padding * 2 + i * (compHeight + padding * 1.5);
      
      const connectedDffIds = lutToDffMap.get(lut.id) || [];
      connectedDffIds.forEach((dffId, j) => {
        const dff = dffs.find(d => d.id === dffId);
        if (dff) {
          if (!dff.position) dff.position = { x: 0, y: 0 };
          dff.position.x = compWidth * 2 + padding * 5 + (j * padding);
          
          if (!lut.position) lut.position = { x: 0, y: 0 };
          dff.position.y = lut.position.y;
          processedDffs.add(dffId);
          
          if (dff.connections) {
            Object.entries(dff.connections).forEach(([pinName, connection]) => {
              if (pinName.toLowerCase().includes('clock') || pinName.toLowerCase().includes('clk')) {
                if (!dff.controlConnections) dff.controlConnections = {};
                dff.controlConnections.clock = connection;
              }
              if (pinName.toLowerCase().includes('reset') || pinName.toLowerCase().includes('rst')) {
                if (!dff.controlConnections) dff.controlConnections = {};
                dff.controlConnections.reset = connection;
              }
            });
          }
        }
      });
    });
    
    let remainingDffIndex = 0;
    dffs.forEach((dff) => {
      if (!processedDffs.has(dff.id)) {
        if (!dff.position) dff.position = { x: 0, y: 0 };
        dff.position.x = compWidth * 2 + padding * 5;
        dff.position.y = padding * 2 + (luts.length + remainingDffIndex) * (compHeight + padding * 1.5);
        remainingDffIndex++;
        
        if (dff.connections) {
          Object.entries(dff.connections).forEach(([pinName, connection]) => {
            if (pinName.toLowerCase().includes('clock') || pinName.toLowerCase().includes('clk')) {
              if (!dff.controlConnections) dff.controlConnections = {};
              dff.controlConnections.clock = connection;
            }
            if (pinName.toLowerCase().includes('reset') || pinName.toLowerCase().includes('rst')) {
              if (!dff.controlConnections) dff.controlConnections = {};
              dff.controlConnections.reset = connection;
            }
          });
        }
      }
    });
    
    outputWires.forEach((wire, i) => {
      if (!wire.position) wire.position = { x: 0, y: 0 };
      wire.position.x = width - compWidth - padding;
      wire.position.y = padding * 2 + i * (compHeight + padding);
    });
    
    nodes.attr('transform', (d) => {
      if (!d.position) {
        d.position = { x: 0, y: 0 };
      }
      
      d.x = d.position.x;
      d.y = d.position.y;
      
      if (d.id && (d.id.toLowerCase().includes('clk') || d.id.toLowerCase().includes('clock'))) {
        d.isControlSignal = true;
        d.controlType = 'clock';
      } 
      else if (d.id && (d.id.toLowerCase().includes('reset') || d.id.toLowerCase().includes('rst'))) {
        d.isControlSignal = true;
        d.controlType = 'reset';
      }
      
      return `translate(${d.position.x}, ${d.position.y})`;
    });
    
    document.dispatchEvent(new CustomEvent('control-signals-identified', {
      detail: { 
        clockInputs: clockInputs.map(d => d.id), 
        resetInputs: resetInputs.map(d => d.id) 
      }
    }));
  }
  
  private enableDragging(nodes: d3.Selection<any, ComponentData, any, any>): void {
    let draggedElement: Element | null = null;
    
    const drag = d3.drag<any, ComponentData>()
      .on('start', function(event, d) {
        draggedElement = this;
        d3.select(this).raise();
        event.sourceEvent.stopPropagation();
        if (!d.position) d.position = { x: 0, y: 0 };
        d3.select(this).classed('dragging', true);
        document.body.classList.add('dragging-active');
      })
      .on('drag', function(event, d) {
        if (this !== draggedElement) return;
        if (!d.position) d.position = { x: 0, y: 0 };
        d.position.x += event.dx;
        d.position.y += event.dy;
        d3.select(this).attr('transform', `translate(${d.position.x}, ${d.position.y})`);
        const customEvent = new CustomEvent('component-moved', {
          detail: { component: d }
        });
        document.dispatchEvent(customEvent);
      })
      .on('end', function(event, d) {
        draggedElement = null;
        d3.select(this).classed('dragging', false);
        document.body.classList.remove('dragging-active');
      });

    nodes.call(drag);
    
    if (!document.getElementById('drag-style')) {
      const styleElem = document.createElement('style');
      styleElem.id = 'drag-style';
      styleElem.textContent = `
        .component.dragging {
          z-index: 1000;
          cursor: grabbing !important;
        }
        
        .component {
          cursor: grab;
        }
        
        body.dragging-active .component:not(.dragging) {
          pointer-events: none;
        }
        
        .connections {
          pointer-events: none;
        }
      `;
      document.head.appendChild(styleElem);
    }
  }
}