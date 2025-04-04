import * as d3 from 'd3';
import { CanvasConfig } from '../config/visualization-config.service';

export interface ComponentData {
  id: string;
  type: string;
  name?: string;
  position?: { x: number; y: number };
  // Add these properties for D3.js compatibility
  x?: number;
  y?: number;
  data?: any; // Original component-specific data
  isControlSignal?: boolean;
  controlType?: 'clock' | 'reset';
  // Add these properties to make LUT mask access valid
  configuration?: {
    mask?: string | number;
    [key: string]: any;
  };
  mask?: string | number;
  connections?: Record<string, any>;
  controlConnections?: {
    clock?: any;
    reset?: any;
  };
  tags?: string[]; 
}

export interface RendererContext {
  svg: d3.Selection<SVGGElement, unknown, null, undefined>;
  config: CanvasConfig; // Changed from VisualizationConfig to CanvasConfig
}
