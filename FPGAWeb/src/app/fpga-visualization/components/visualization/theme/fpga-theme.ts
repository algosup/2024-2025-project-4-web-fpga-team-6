/**
 * FPGA Visualization Theme System
 * 
 * Central configuration for all visualization styling.
 */

// Component shape definitions - SVG path generators
export const ComponentShapes = {
  dff: {
    path: (width: number, height: number, cornerRadius: number): string => {
      return `M ${cornerRadius},0
              H ${width - cornerRadius}
              Q ${width},0 ${width},${cornerRadius}
              V ${height - cornerRadius}
              Q ${width},${height} ${width - cornerRadius},${height}
              H ${cornerRadius}
              Q 0,${height} 0,${height - cornerRadius}
              V ${cornerRadius}
              Q 0,0 ${cornerRadius},0
              Z`;
    },
    clockSymbol: (x: number, y: number, size: number): string => {
      // Triangle for clock symbol
      return `M ${x},${y-size} L ${x},${y+size} L ${x+size},${y} Z`;
    }
  },
  lut: {
    path: (width: number, height: number, rightHeightRatio: number): string => {
      // Trapezoid shape for LUTs
      const rightHeight = height * rightHeightRatio;
      const rightY = (height - rightHeight) / 2;
      
      return `M 0,0
              H ${width}
              V ${rightY + rightHeight}
              H 0
              V 0
              Z`;
    }
  },
  gpio: {
    path: (width: number, height: number, radius: number): string => {
      // Tag-like shape for GPIOs
      return `M ${radius},0
              H ${width - radius}
              Q ${width},0 ${width},${radius}
              V ${height - radius}
              Q ${width},${height} ${width - radius},${height}
              H ${radius}
              Q 0,${height} 0,${height - radius}
              V ${radius}
              Q 0,0 ${radius},0
              Z`;
    }
  },
  wire: {
    path: (width: number, height: number, tipRadius: number): string => {
      // Paper tag shape with rounded tip
      return `M ${tipRadius},0
              A ${tipRadius},${tipRadius} 0 0,0 0,${height/2}
              A ${tipRadius},${tipRadius} 0 0,0 ${tipRadius},${height}
              H ${width-tipRadius}
              A ${tipRadius},${tipRadius} 0 0,0 ${width},${height/2}
              A ${tipRadius},${tipRadius} 0 0,0 ${width-tipRadius},0
              Z`;
    }
  }
};

// Comprehensive styling theme
export interface ConnectionTheme {
  strokeWidths: {
    data: number;
    clock: number;
    control: number;
  };
  dashPatterns: {
    data: string;
    clock: string;
    control: string;
  };
  opacity: {
    default: number;
    hover: number;
  };
  hoverWidth: {
    data: number;
    clock: number;
    control: number;
  };
  curveControl: {
    horizontalOffset: number;
    verticalOffset: number;
    angleThreshold: number;
  };
}

// Rest of your theme interfaces...

// Ensure FPGATheme is properly typed
export const FPGATheme = {
  // Color palette
  colors: {
    // Primary component colors
    primary: '#0B3D91',      // CNES Blue
    secondary: '#1E5BC6',    // CNES Light Blue
    accent: '#FF9E16',       // CNES Orange
    
    // Text colors
    text: {
      light: '#FFFFFF',
      dark: '#333333',
    },
    
    // Component-specific colors
    components: {
      dff: '#4285F4',        // Blue for D Flip-Flops
      lut: '#0F9D58',        // Green for LUTs
      inputWire: '#7986CB',  // Purple-blue for input wires
      outputWire: '#43A047', // Green for output wires
      gpio: '#F4B400',       // Yellow for GPIOs
    },
    
    // Connection colors
    connections: {
      data: '#2196F3',       // Blue for data connections
      clock: '#FF9800',      // Orange for clock connections
      control: '#9C27B0',    // Purple for control connections
    },
    
    // Backgrounds and accents
    background: {
      main: '#F9F9F9',
      component: '#FFFFFF',
    },
    
    // States
    states: {
      selected: '#E3F2FD',
      hover: 'rgba(11, 61, 145, 0.1)',
      active: 'rgba(11, 61, 145, 0.2)',
    }
  },
  
  // Component dimensions and sizing
  dimensions: {
    dff: {
      width: 80,
      height: 60,
      cornerRadius: 5,
      textSize: 12,
      clockSymbol: {
        offsetX: 15,
        size: 7
      }
    },
    lut: {
      width: 100,
      height: 80,
      cornerRadius: 5,
      rightHeightRatio: 0.7, // The height ratio of the right side compared to full height
      textSize: 12,
    },
    gpio: {
      width: 70,
      height: 30,
      cornerRadius: 8,
      textSize: 12,
    },
    wire: {
      width: 80,
      height: 30,
      tipRadius: 10,
      textSize: 12,
    },
    pins: {
      radius: 3,
      hoverRadius: 5,
    },
  },
  
  // Connection styling
  connections: {
    strokeWidths: {
      data: 2,
      clock: 2,
      control: 2.5,
    },
    dashPatterns: {
      data: '',
      clock: '5,3',
      control: '2,2',
    },
    opacity: {
      default: 0.8,
      hover: 1,
    },
    hoverWidth: {
      data: 3,
      clock: 3,
      control: 3.5,
    },
    
    // Control point configuration for connection curves
    curveControl: {
      // How much to offset control points (as a fraction of the total distance)
      horizontalOffset: 0.5,
      verticalOffset: 0.5,
      // When to switch curve types based on angle
      angleThreshold: 60
    },
  } as ConnectionTheme,

  // Animation settings
  animations: {
    duration: 300, // in ms
    transitions: {
      default: 'all 0.3s ease'
    },
    pulseData: '2s',
    pulseClock: '1s',
  },
};

// Export CSS variables for use in component styles
export function generateCSSVariables(): string {
  return `
    :root {
      /* Colors */
      --fpga-color-primary: ${FPGATheme.colors.primary};
      --fpga-color-secondary: ${FPGATheme.colors.secondary};
      --fpga-color-accent: ${FPGATheme.colors.accent};
      
      /* Text colors */
      --fpga-text-light: ${FPGATheme.colors.text.light};
      --fpga-text-dark: ${FPGATheme.colors.text.dark};
      
      /* Component colors */
      --fpga-color-dff: ${FPGATheme.colors.components.dff};
      --fpga-color-lut: ${FPGATheme.colors.components.lut};
      --fpga-color-input-wire: ${FPGATheme.colors.components.inputWire};
      --fpga-color-output-wire: ${FPGATheme.colors.components.outputWire};
      --fpga-color-gpio: ${FPGATheme.colors.components.gpio};
      
      /* Connection colors */
      --fpga-connection-data: ${FPGATheme.colors.connections.data};
      --fpga-connection-clock: ${FPGATheme.colors.connections.clock};
      --fpga-connection-control: ${FPGATheme.colors.connections.control};
      
      /* Backgrounds */
      --fpga-bg-main: ${FPGATheme.colors.background.main};
      --fpga-bg-component: ${FPGATheme.colors.background.component};
      
      /* States */
      --fpga-state-selected: ${FPGATheme.colors.states.selected};
      --fpga-state-hover: ${FPGATheme.colors.states.hover};
      --fpga-state-active: ${FPGATheme.colors.states.active};
      
      /* Connection properties */
      --fpga-connection-width-data: ${FPGATheme.connections.strokeWidths.data}px;
      --fpga-connection-width-clock: ${FPGATheme.connections.strokeWidths.clock}px;
      --fpga-connection-width-control: ${FPGATheme.connections.strokeWidths.control}px;
      
      --fpga-connection-hover-width-data: ${FPGATheme.connections.hoverWidth.data}px;
      --fpga-connection-hover-width-clock: ${FPGATheme.connections.hoverWidth.clock}px;
      --fpga-connection-hover-width-control: ${FPGATheme.connections.hoverWidth.control}px;
      
      --fpga-connection-dash-data: ${FPGATheme.connections.dashPatterns.data};
      --fpga-connection-dash-clock: ${FPGATheme.connections.dashPatterns.clock};
      --fpga-connection-dash-control: ${FPGATheme.connections.dashPatterns.control};
      
      --fpga-connection-opacity-default: ${FPGATheme.connections.opacity.default};
      --fpga-connection-opacity-hover: ${FPGATheme.connections.opacity.hover};
      
      /* Animation settings */
      --fpga-animation-duration: ${FPGATheme.animations.duration}ms;
      --fpga-animation-pulse-data: ${FPGATheme.animations.pulseData};
      --fpga-animation-pulse-clock: ${FPGATheme.animations.pulseClock};
    }
  `;
}