import * as d3 from 'd3';

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
  // More flexible type for renderShape
  renderShape: (g: d3.Selection<any, any, any, any>, fillColor: string) => void;
}

export class ComponentTemplates {
  
  // LUT Template - Pronounced trapezoid with wider base on left, much narrower top on right
  static getLutTemplate(inputs: number = 4): ComponentTemplate {
    const width = 100;
    const height = 60;
    
    // Make the right side much shorter to create a more dramatic trapezoid effect
    const rightHeight = height * 0.4; // Only 40% of the full height
    const topOffset = (height - rightHeight) / 2;
    
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
      renderShape: (g, fillColor) => {
        // LUT is a dramatic trapezoid with wider base on left
        const path = g.append('path')
          .attr('d', `
            M 0,0
            L ${width},${topOffset}
            L ${width},${topOffset + rightHeight}
            L 0,${height}
            Z
          `)
          .attr('fill', fillColor)
          .attr('stroke', '#0B3D91')
          .attr('stroke-width', 1);
          
        // Add LUT label
        g.append('text')
          .attr('x', width * 0.4)
          .attr('y', height / 2)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('fill', '#ffffff')
          .attr('font-weight', 'bold')
          .attr('font-size', '14px')
          .text('LUT');
      }
    };
  }
  
  // DFF Template - Rectangular with clock, D input, and Q output
  static getDffTemplate(): ComponentTemplate {
    const width = 80;
    const height = 60;
    
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
          position: { x: width, y: height / 2 }, // Centered the Q output vertically
          side: 'right'
        }
        // Removed the QN pin as requested
      ],
      renderShape: (g, fillColor) => {
        // DFF is a rectangle
        g.append('rect')
          .attr('width', width)
          .attr('height', height)
          .attr('fill', fillColor)
          .attr('stroke', '#0B3D91')
          .attr('stroke-width', 1)
          .attr('rx', 5)
          .attr('ry', 5);
        
        // Add DFF label
        g.append('text')
          .attr('x', width / 2)
          .attr('y', height / 2)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('fill', '#ffffff')
          .attr('font-weight', 'bold')
          .attr('font-size', '14px')
          .text('DFF');
          
        // Add clock symbol (triangle)
        g.append('path')
          .attr('d', `
            M ${15},${2 * height / 3 - 7}
            L ${15},${2 * height / 3 + 7}
            L ${25},${2 * height / 3}
            Z
          `)
          .attr('fill', '#ffffff');
      }
    };
  }
  
  // GPIO Template - Tag-like shape
  static getGpioTemplate(direction: 'input' | 'output' | 'bidirectional' = 'bidirectional'): ComponentTemplate {
    const width = 90;
    const height = 40;
    
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
      renderShape: (g, fillColor) => {
        // GPIO is a tag-like shape
        const radius = height / 4;
        const path = g.append('path')
          .attr('d', `
            M ${radius},0
            L ${width - radius},0
            A ${radius},${radius} 0 0,1 ${width - radius},${height}
            L ${radius},${height}
            A ${radius},${radius} 0 0,1 ${radius},0
            Z
          `)
          .attr('fill', fillColor)
          .attr('stroke', '#0B3D91')
          .attr('stroke-width', 1);
        
        // Add GPIO label
        g.append('text')
          .attr('x', width / 2)
          .attr('y', height / 2)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('fill', '#ffffff')
          .attr('font-weight', 'bold')
          .attr('font-size', '12px')
          .text(`GPIO ${direction.toUpperCase()}`);
      }
    };
  }
  
  // Get template by component type
  static getTemplateForComponent(component: any): ComponentTemplate {
    const type = component.type?.toLowerCase() || '';
    
    if (type.includes('lut')) {
      // Extract input count if available, default to 4
      const inputMatch = type.match(/(\d+)/);
      const inputCount = inputMatch ? parseInt(inputMatch[1], 10) : 4;
      return this.getLutTemplate(inputCount);
    }
    
    if (type.includes('ff') || type.includes('flop') || type.includes('dff')) {
      return this.getDffTemplate();
    }
    
    if (type.includes('gpio') || type.includes('io')) {
      let direction = 'bidirectional';
      if (type.includes('in') && !type.includes('out')) {
        direction = 'input';
      } else if (type.includes('out') && !type.includes('in')) {
        direction = 'output';
      }
      return this.getGpioTemplate(direction as any);
    }
    
    // Default to LUT template
    return this.getLutTemplate();
  }
}