import { Injectable } from '@angular/core';
import * as d3 from 'd3';
import { FPGATheme, ComponentShapes } from '../../theme/fpga-theme';

export interface Pin {
  id: string;
  name: string;
  type: 'input' | 'output' | 'clock' | 'control';
  position: { x: number; y: number };
  side?: 'left' | 'top' | 'right' | 'bottom';
}

export interface ComponentTemplate {
  type: string;
  width: number;
  height: number;
  pins: Pin[];
  renderShape: (g: d3.Selection<any, any, any, any>, fillColor: string, name?: string) => void;
}

export class ComponentTemplates {
  /**
   * Get template based on component type
   * Returns the appropriate rendering template for the given component
   */
  static getTemplateForComponent(component: any): ComponentTemplate {
    // Extract the component type from either the type field or the id
    const type = (component.type || component.id || '').toLowerCase();
    
    // Determine the appropriate template based on the component type
    if (type.includes('dff') || type.includes('ff') || type.includes('flop')) {
      return this.getDffTemplate();
    } else if (type.includes('lut')) {
      // Extract input count if available, default to 4
      const inputMatch = type.match(/(\d+)/);
      const inputCount = inputMatch ? parseInt(inputMatch[1], 10) : 4;
      return this.getLutTemplate(inputCount);
    } else if (type.includes('gpio') || type.includes('io')) {
      // Determine the GPIO direction
      if (type.includes('in') && !type.includes('out')) {
        return this.getGpioTemplate('input');
      } else if (type.includes('out') && !type.includes('in')) {
        return this.getGpioTemplate('output');
      } else {
        return this.getGpioTemplate('bidirectional');
      }
    } else if (type.includes('wire') || type.includes('port') || type.includes('net') || type.includes('ext_')) {
      // Determine if it's an input or output wire
      if (type.includes('in') && !type.includes('out')) {
        return this.getExternalWireTemplate('input', component.name || component.id || 'INPUT');
      } else if (type.includes('out') && !type.includes('in')) {
        return this.getExternalWireTemplate('output', component.name || component.id || 'OUTPUT');
      } else if (type.includes('inout')) {
        return this.getExternalWireTemplate('inout', component.name || component.id || 'IO');
      } else {
        // Default to input wire if direction isn't clear
        return this.getExternalWireTemplate('input', component.name || component.id || 'WIRE');
      }
    }
    
    // Default to LUT template if no match is found
    return this.getLutTemplate();
  }

  /**
   * DFF Template - D Flip-Flop
   * Rectangle with a clock signal indicator
   */
  static getDffTemplate(): ComponentTemplate {
    const theme = FPGATheme;
    const width = theme.dimensions.dff.width;
    const height = theme.dimensions.dff.height;
    const cornerRadius = theme.dimensions.dff.cornerRadius;
    
    return {
      type: 'DFF',
      width,
      height,
      pins: [
        {
          id: 'D',
          name: 'D',
          type: 'input',
          position: { x: 0, y: height / 3 },
          side: 'left'
        },
        {
          id: 'CLK',
          name: 'CLK',
          type: 'clock',
          position: { x: 0, y: 2 * height / 3 },
          side: 'left'
        },
        {
          id: 'Q',
          name: 'Q',
          type: 'output',
          position: { x: width, y: height / 2 },
          side: 'right'
        }
      ],
      renderShape: (g, fillColor, name = 'DFF') => {
        // DFF is a rectangle with rounded corners
        g.append('path')
          .attr('d', ComponentShapes.dff.path(width, height, cornerRadius))
          .attr('fill', fillColor)
          .attr('stroke', theme.colors.primary)
          .attr('stroke-width', 1);
        
        // Add DFF label with provided name
        g.append('text')
          .attr('x', width / 2)
          .attr('y', height / 2)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('fill', theme.colors.text.light)
          .attr('font-weight', 'bold')
          .attr('font-size', `${theme.dimensions.dff.textSize}px`)
          .text(name);
          
        // Add clock symbol (triangle)
        const clockX = theme.dimensions.dff.clockSymbol.offsetX;
        const clockY = 2 * height / 3;
        const clockSize = theme.dimensions.dff.clockSymbol.size;
        
        g.append('path')
          .attr('d', ComponentShapes.dff.clockSymbol(clockX, clockY, clockSize))
          .attr('fill', theme.colors.text.light);
      }
    };
  }

  /**
   * LUT Template - Look-Up Table
   * Trapezoid with wider base on left, narrower top on right
   */
  static getLutTemplate(inputs: number = 4): ComponentTemplate {
    const theme = FPGATheme;
    const width = theme.dimensions.lut.width;
    const height = theme.dimensions.lut.height;
    const rightHeightRatio = theme.dimensions.lut.rightHeightRatio;
    
    // Generate input pins based on input count
    const pins: Pin[] = [];
    
    // Input pins on left (wide/base) side
    for (let i = 0; i < inputs; i++) {
      pins.push({
        id: `in${i}`,
        name: `I${i}`,
        type: 'input',
        position: { 
          x: 0, 
          y: height * (i + 1) / (inputs + 1) 
        },
        side: 'left'
      });
    }
    
    // Output pin on right (narrow/top) side
    pins.push({
      id: 'out',
      name: 'O',
      type: 'output',
      position: { 
        x: width, 
        y: height / 2 
      },
      side: 'right'
    });
    
    return {
      type: 'LUT',
      width,
      height,
      pins,
      renderShape: (g, fillColor, name = 'LUT') => {
        // Draw LUT as a trapezoid with the path from our theme
        g.append('path')
          .attr('d', ComponentShapes.lut.path(width, height, rightHeightRatio))
          .attr('fill', fillColor)
          .attr('stroke', theme.colors.primary)
          .attr('stroke-width', 1);
          
        // Add LUT label with the provided name
        g.append('text')
          .attr('x', width * 0.4) // Position text slightly left of center
          .attr('y', height / 2)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('fill', theme.colors.text.light)
          .attr('font-weight', 'bold')
          .attr('font-size', `${theme.dimensions.lut.textSize}px`)
          .text(name);
      }
    };
  }
  
  /**
   * GPIO Template - General Purpose I/O
   * Tag-like shape for input/output pins
   */
  static getGpioTemplate(direction: 'input' | 'output' | 'bidirectional' = 'bidirectional'): ComponentTemplate {
    const theme = FPGATheme;
    const width = theme.dimensions.gpio.width;
    const height = theme.dimensions.gpio.height;
    const radius = theme.dimensions.gpio.cornerRadius;
    
    const pins: Pin[] = [];
    
    if (direction === 'input' || direction === 'bidirectional') {
      pins.push({
        id: 'in',
        name: 'IN',
        type: 'input',
        position: { x: 0, y: height / 2 },
        side: 'left'
      });
    }
    
    if (direction === 'output' || direction === 'bidirectional') {
      pins.push({
        id: 'out',
        name: 'OUT',
        type: 'output',
        position: { x: width, y: height / 2 },
        side: 'right'
      });
    }
    
    return {
      type: 'GPIO',
      width,
      height,
      pins,
      renderShape: (g, fillColor, name = `GPIO ${direction.toUpperCase()}`) => {
        // GPIO is a tag-like shape
        g.append('path')
          .attr('d', ComponentShapes.gpio.path(width, height, radius))
          .attr('fill', fillColor)
          .attr('stroke', theme.colors.primary)
          .attr('stroke-width', 1);
        
        // Add GPIO label
        g.append('text')
          .attr('x', width / 2)
          .attr('y', height / 2)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('fill', theme.colors.text.light)
          .attr('font-weight', 'bold')
          .attr('font-size', `${theme.dimensions.gpio.textSize}px`)
          .text(name);
      }
    };
  }
  
  /**
   * External Wire/Port Template - Paper tag style with rounded corners
   */
  static getExternalWireTemplate(direction: 'input' | 'output' | 'inout' = 'input', defaultName: string = 'WIRE'): ComponentTemplate {
    const theme = FPGATheme;
    const width = theme.dimensions.wire.width;
    const height = theme.dimensions.wire.height;
    const tipRadius = theme.dimensions.wire.tipRadius;
    
    const pins: Pin[] = [];
    
    // For input wires, the connection point is on the right side
    if (direction === 'input' || direction === 'inout') {
      pins.push({
        id: 'out',
        name: '',
        type: 'output',
        position: { x: width, y: height / 2 },
        side: 'right'
      });
    }
    
    // For output wires, the connection point is on the left side
    if (direction === 'output' || direction === 'inout') {
      pins.push({
        id: 'in',
        name: '',
        type: 'input',
        position: { x: 0, y: height / 2 },
        side: 'left'
      });
    }
    
    return {
      type: 'WIRE',
      width,
      height,
      pins,
      renderShape: (g, fillColor, name = defaultName) => {
        // Create paper tag shape - rounded rectangle with extra rounded tip on one side
        g.append('path')
          .attr('d', ComponentShapes.wire.path(width, height, tipRadius))
          .attr('fill', fillColor)
          .attr('stroke', theme.colors.primary)
          .attr('stroke-width', 1);
        
        // Add wire name label with the provided name
        g.append('text')
          .attr('x', width / 2)
          .attr('y', height / 2)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('fill', theme.colors.text.light)
          .attr('font-weight', 'bold')
          .attr('font-size', `${theme.dimensions.wire.textSize}px`)
          .text(name);
      }
    };
  }
}