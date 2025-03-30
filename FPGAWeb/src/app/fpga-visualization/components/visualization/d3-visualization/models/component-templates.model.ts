import * as d3 from 'd3';

export interface Pin {
  id: string;
  name: string;
  type: 'input' | 'output' | 'clock' | 'control';
  position: { x: number; y: number };
  side?: 'left' | 'top' | 'right' | 'bottom';
}

// Remove the renderShape function from ComponentTemplate
export interface ComponentTemplate {
  type: string;
  width: number;
  height: number;
  pins: Pin[];
  shape: 'rectangle' | 'trapezoid' | 'rounded' | 'tag' | 'triangle-tipped' | 'custom';
  shapeData?: any; // For custom shapes, additional parameters
}

export class ComponentTemplates {
  
  // LUT Template - Pronounced trapezoid with wider base on left, much narrower top on right
  static getLutTemplate(inputs: number = 1): ComponentTemplate {
    // Base dimensions for 1-input LUT
    const baseWidth = 80;
    const baseHeight = 40;
    
    // Scale dimensions based on input count
    const width = baseWidth + (inputs > 1 ? (inputs - 1) * 5 : 0);
    const height = baseHeight + (inputs > 1 ? (inputs - 1) * 10 : 0);
    
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
      shape: 'trapezoid',
      shapeData: {
        rightHeight: height * 0.4, // Only 40% of the full height
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
          position: { x: width, y: height / 2 },
          side: 'right'
        }
      ],
      shape: 'rectangle'
    };
  }
  
  // GPIO Template - Tag-like shape
  static getGpioTemplate(direction: 'input' | 'output' | 'bidirectional' = 'bidirectional'): ComponentTemplate {
    const width = 90;
    const height = 40;
    
    const pins: Pin[] = [];
    
    if (direction === 'input' || direction === 'bidirectional') {
      pins.push({
        id: 'out',
        name: 'O',
        type: 'output',
        position: { x: width, y: height / 2 },
        side: 'right'
      });
    }
    
    if (direction === 'output' || direction === 'bidirectional') {
      pins.push({
        id: 'in',
        name: 'I',
        type: 'input',
        position: { x: 0, y: height / 2 },
        side: 'left'
      });
    }
    
    return {
      type: 'GPIO',
      width,
      height,
      pins,
      shape: 'tag',
      shapeData: {
        direction: direction
      }
    };
  }
  
  // External Wire/Port Template - Triangle-tipped rectangle
  static getExternalWireTemplate(direction: 'input' | 'output' | 'inout' = 'input', defaultName: string = 'WIRE'): ComponentTemplate {
    const width = 80;
    const height = 30;
    const tipWidth = 15; // Width of the triangular tip
    const pins: Pin[] = [];
    
    // For input wires, the connection point is on the right tip
    if (direction === 'input' || direction === 'inout') {
      pins.push({
        id: 'out',
        name: '', // Empty name instead of 'O'
        type: 'output',
        position: { x: width, y: height / 2 },
        side: 'right'
      });
    }
    
    // For output wires, the connection point is on the left tip
    if (direction === 'output' || direction === 'inout') {
      pins.push({
        id: 'in',
        name: '', // Empty name instead of 'I'
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
      shape: 'triangle-tipped',
      shapeData: {
        direction: direction,
        tipWidth: tipWidth
      }
    };
  }
  
  // Get template by component type
  static getTemplateForComponent(component: any): ComponentTemplate {
    const type = (component.type || '').toLowerCase();
    
    if (type.includes('lut')) {
      // Extract input count from LUT type or data
      let inputCount = 1; // Start with minimal configuration
      
      // Try to identify size from standard patterns
      if (type.includes('lut_') || type.includes('lut')) {
        // Try patterns like lut_5, lut5, or lut_k_5
        const match = type.match(/lut(?:_k_|_)?(\d+)/);
        if (match && match[1]) {
          inputCount = parseInt(match[1], 10);
        }
      }
      
      // Check various data formats for input count
      if (component.data) {
        // Check component data for K value (for FF2 format)
        if (component.data.K) {
          inputCount = parseInt(component.data.K, 10);
        }
        // Check for inputs array/count
        else if (Array.isArray(component.data.inputs)) {
          inputCount = component.data.inputs.length;
        }
        // Check for pinCount or input_count property
        else if (component.data.pinCount) {
          // Subtract 1 for output pin
          inputCount = parseInt(component.data.pinCount, 10) - 1;
        }
        else if (component.data.input_count) {
          inputCount = parseInt(component.data.input_count, 10);
        }
      }
      
      // Ensure a reasonable range (1-8 inputs)
      inputCount = Math.max(1, Math.min(8, inputCount));
      
      return this.getLutTemplate(inputCount);
    }
    
    // Rest of the method remains the same...
    if (type.includes('ff') || type.includes('flop') || type.includes('dff')) {
      return this.getDffTemplate();
    }
    
    if (type.includes('gpio') || type.includes('io')) {
      let direction = 'bidirectional';
      if (type.includes('input')) direction = 'input';
      if (type.includes('output')) direction = 'output';
      return this.getGpioTemplate(direction as any);
    }
    
    if (type.includes('wire') || type.includes('port') || type.includes('net')) {
      let direction = 'input';
      if (type.includes('input')) direction = 'input';
      if (type.includes('output')) direction = 'output';
      if (type.includes('inout')) direction = 'inout';
      return this.getExternalWireTemplate(direction as any, component.name || 'WIRE');
    }
    
    // Default to minimal LUT template (1 input)
    return this.getLutTemplate(1);
  }
}