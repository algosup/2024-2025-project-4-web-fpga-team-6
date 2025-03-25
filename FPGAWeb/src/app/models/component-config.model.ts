export interface ConnectionPoint {
  id: string;        // ID matching the connection name
  x: number;         // X position relative to component (0-1 percentage)
  y: number;         // Y position relative to component (0-1 percentage)
  side: 'top' | 'right' | 'bottom' | 'left'; // Which side of the component
  label?: string;    // Optional label
}

export interface ComponentConfig {
  type: string;      // Component type (e.g., 'DFF', 'LUT', etc.)
  svgPath: string;   // Path to SVG file
  width: number;     // Default width
  height: number;    // Default height
  connections: ConnectionPoint[]; // Connection points
  labelPosition?: { x: number; y: number; }; // Optional custom label position
}

// Update the COMPONENT_CONFIGS to include better LUT handling

export const COMPONENT_CONFIGS: Record<string, ComponentConfig> = {
  'DFF': {
    type: 'DFF',
    svgPath: 'assets/DFF_norst.svg',
    width: 120,
    height: 80,
    connections: [
      { id: 'D', x: 0, y: 0.3, side: 'left', label: 'D' },
      { id: 'CLK', x: 0, y: 0.7, side: 'left', label: 'CLK' },
      { id: 'Q', x: 1, y: 0.3, side: 'right', label: 'Q' },
      { id: 'Qn', x: 1, y: 0.7, side: 'right', label: 'Q̅' }
    ]
  },
  // Add specific configuration for LUT
  'LUT': {
    type: 'LUT',
    svgPath: 'assets/LUT.svg',
    width: 140,
    height: 100,
    connections: [
      { id: 'in_0', x: 0, y: 0.2, side: 'left', label: '0' },
      { id: 'in_1', x: 0, y: 0.3, side: 'left', label: '1' },
      { id: 'in_2', x: 0, y: 0.4, side: 'left', label: '2' },
      { id: 'in_3', x: 0, y: 0.5, side: 'left', label: '3' },
      { id: 'in_4', x: 0, y: 0.6, side: 'left', label: '4' },
      { id: 'out', x: 1, y: 0.5, side: 'right', label: 'OUT' }
    ]
  },
  // Keep the generic LUT_K config for compatibility
  'LUT_K': {
    type: 'LUT_K',
    svgPath: 'assets/LUT.svg',
    width: 140,
    height: 100,
    connections: [
      { id: 'in_0', x: 0, y: 0.2, side: 'left', label: '0' },
      { id: 'in_1', x: 0, y: 0.3, side: 'left', label: '1' },
      { id: 'in_2', x: 0, y: 0.4, side: 'left', label: '2' },
      { id: 'in_3', x: 0, y: 0.5, side: 'left', label: '3' },
      { id: 'in_4', x: 0, y: 0.6, side: 'left', label: '4' },
      { id: 'out', x: 1, y: 0.5, side: 'right', label: 'OUT' }
    ]
  },
  'input': {
    type: 'input',
    svgPath: 'assets/input_pin.svg',
    width: 80,
    height: 40,
    connections: [
      { id: 'output', x: 1, y: 0.5, side: 'right' }
    ]
  },
  'output': {
    type: 'output',
    svgPath: 'assets/output_pin.svg',
    width: 80,
    height: 40,
    connections: [
      { id: 'input', x: 0, y: 0.5, side: 'left' }
    ]
  }
};