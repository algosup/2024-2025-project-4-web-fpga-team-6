import { Injectable } from '@angular/core';

// Style configuration types
export interface ColorPalette {
  background: string;
  grid: string;
  text: string;
  componentStroke: string;
  
  // Component fill colors
  lut: string;
  dff: string;
  gpio: string;
  wire: string;
  
  // Pin colors by type
  inputPin: string;
  outputPin: string;
  clockPin: string;
  controlPin: string;
  
  // Connection colors by type
  dataConnection: string;
  clockConnection: string;
  resetConnection: string;
}

export interface VisualDimensions {
  // Component dimensions
  lutSize: { width: number; height: number };
  dffSize: { width: number; height: number };
  gpioSize: { width: number; height: number };
  wireSize: { width: number; height: number };
  
  // Pin dimensions
  pinRadius: number;
  pinSymbolSize: number;
  
  // Connection dimensions
  connectionWidth: { 
    data: number; 
    clock: number; 
    reset: number;
  };
  
  // Spacing
  componentMargin: number;
  pinLabelOffset: number;
}

export interface StyleOptions {
  darkMode: boolean;
  highContrast: boolean;
  animatedConnections: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class VisualizationStyleService {
  private _options: StyleOptions = {
    darkMode: false,
    highContrast: false,
    animatedConnections: false
  };
  
  private _lightPalette: ColorPalette = {
    background: '#ffffff',
    grid: '#e0e0e0',
    text: '#333333',
    componentStroke: '#0B3D91',
    
    // Component colors
    lut: '#2212F4',    // Blue for LUTs
    dff: '#EA4335',    // Red for DFFs  
    gpio: '#34A853',   // Green for GPIOs
    wire: '#FBBC05',   // Yellow for wires
    
    // Pin colors
    inputPin: '#2196F3',  // Blue for inputs
    outputPin: '#FF5722', // Orange for outputs
    clockPin: '#9C27B0',  // Purple for clocks
    controlPin: '#4CAF50',// Green for control pins
    
    // Connection colors
    dataConnection: '#555555',  // Dark gray
    clockConnection: '#9C27B0', // Purple
    resetConnection: '#F44336'  // Red
  };
  
  private _darkPalette: ColorPalette = {
    background: '#121212',
    grid: '#333333',
    text: '#e0e0e0',
    componentStroke: '#4285F4',
    
    // Component colors - brighter for dark mode
    lut: '#5c9cff',
    dff: '#ff6b5c',
    gpio: '#4cd964',
    wire: '#ffce38',
    
    // Pin colors
    inputPin: '#64b5f6',
    outputPin: '#ff8a65',
    clockPin: '#ba68c8',
    controlPin: '#81c784',
    
    // Connection colors
    dataConnection: '#aaaaaa',
    clockConnection: '#ce93d8',
    resetConnection: '#ef9a9a'
  };
  
  private _dimensions: VisualDimensions = {
    // Component dimensions
    lutSize: { width: 100, height: 60 },
    dffSize: { width: 80, height: 60 },
    gpioSize: { width: 90, height: 40 },
    wireSize: { width: 80, height: 30 },
    
    // Pin dimensions
    pinRadius: 3,
    pinSymbolSize: 6,
    
    // Connection dimensions
    connectionWidth: {
      data: 1.5,
      clock: 2,
      reset: 2
    },
    
    // Spacing
    componentMargin: 30,
    pinLabelOffset: 10
  };
  
  get colors(): ColorPalette {
    return this._options.darkMode ? this._darkPalette : this._lightPalette;
  }
  
  get dimensions(): VisualDimensions {
    return this._dimensions;
  }
  
  get options(): StyleOptions {
    return this._options;
  }
  
  updateOptions(options: Partial<StyleOptions>): void {
    this._options = { ...this._options, ...options };
  }
  
  // Get component fill color based on type
  getComponentColor(componentType: string): string {
    const type = componentType.toLowerCase();
    
    if (type.includes('lut')) return this.colors.lut;
    if (type.includes('ff') || type.includes('flop') || type.includes('dff')) return this.colors.dff;
    if (type.includes('gpio') || type.includes('io')) return this.colors.gpio;
    if (type.includes('wire') || type.includes('port') || type.includes('net')) return this.colors.wire;
    
    // Default color for unknown components
    return this.colors.lut;
  }
  
  // Get pin color based on type
  getPinColor(pinType: string): string {
    switch (pinType) {
      case 'input': return this.colors.inputPin;
      case 'output': return this.colors.outputPin;
      case 'clock': return this.colors.clockPin;
      case 'control': return this.colors.controlPin;
      default: return this.colors.inputPin;
    }
  }
  
  // Update getConnectionStyle to ensure it always returns valid values
  getConnectionStyle(connectionType: string): { stroke: string; strokeWidth: number; strokeDasharray: string } {
    const type = connectionType?.toLowerCase() || 'data';
    
    // Default values as fallback
    const defaultStyle = {
      stroke: this.colors.dataConnection,
      strokeWidth: this.dimensions.connectionWidth.data,
      strokeDasharray: '0' // Solid line
    };
    
    switch (type) {
      case 'clock':
        return {
          stroke: this.colors.clockConnection,
          strokeWidth: this.dimensions.connectionWidth.clock,
          strokeDasharray: '0' // Solid line
        };
      case 'reset':
        return {
          stroke: this.colors.resetConnection,
          strokeWidth: this.dimensions.connectionWidth.reset,
          strokeDasharray: '5,3' // Dashed line
        };
      case 'data':
        return defaultStyle;
      default:
        return defaultStyle;
    }
  }
}