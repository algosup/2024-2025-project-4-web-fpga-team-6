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

  // Active state colors
  active: string; // Color for active components
  activeConnection: string; // Color for active connections
  activeClockPin: string; // Color for active clock pins
  activePin: string;  // Add this line for active pin state color
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
  
  // Update color palette for more contrast

  // Light palette (active colors)
  private _lightPalette: ColorPalette = {
    // Existing colors
    background: '#ffffff',
    grid: '#f0f0f0',
    text: '#333333',
    componentStroke: '#000000',
    
    // Component fill colors
    lut: '#2196F3', // Blue
    dff: '#FF5722', // Orange
    gpio: '#4CAF50', // Green
    wire: '#FFC107', // Amber
    
    // Pin colors by type
    inputPin: '#64b5f6',
    outputPin: '#ff8a65',
    clockPin: '#ba68c8',
    controlPin: '#4CAF50',
    
    // Connection colors
    dataConnection: '#555555',  // Dark gray
    clockConnection: '#9C27B0', // Purple
    resetConnection: '#F44336',  // Red

    // Active state colors
    active: '#FF1744',  // Bright red for active state
    activeConnection: '#FF1744', // Same bright red for active connections
    activeClockPin: '#FF1744',  // Same bright red for active clock pins
    activePin: '#FF1744'  // Add this line
  };

  // Dark palette (match the pattern)
  private _darkPalette: ColorPalette = {
    // Existing colors
    background: '#121212',
    grid: '#252525',
    text: '#e0e0e0',
    componentStroke: '#555555',
    
    // Component fill colors
    lut: '#1565C0', // Darker blue
    dff: '#D84315', // Darker orange
    gpio: '#2E7D32', // Darker green
    wire: '#FFA000', // Darker amber
    
    // Pin colors by type
    inputPin: '#42A5F5',
    outputPin: '#FF7043',
    clockPin: '#AB47BC',
    controlPin: '#66BB6A',
    
    // Connection colors
    dataConnection: '#9E9E9E',  // Light gray
    clockConnection: '#BA68C8', // Light purple
    resetConnection: '#EF5350',  // Light red

    // Active state colors
    active: '#FF1744',  // Same bright red
    activeConnection: '#FF1744', // Same bright red
    activeClockPin: '#FF1744',  // Same bright red
    activePin: '#FF1744'  // Add this line
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
    
    // First check for special state types
    if (type === 'active') return this.colors.active;
    
    // Then check for component types
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

  getConnectionColor(type: string): string {
    // Get the active color palette
    const colors = this._options.darkMode ? this._darkPalette : this._lightPalette;
    
    switch(type.toLowerCase()) {
      case 'active': return colors.activeConnection;
      case 'clock': return colors.clockConnection;
      case 'reset': return colors.resetConnection;
      case 'data':
      default: return colors.dataConnection;
    }
  }
}