import * as d3 from 'd3';
import { CanvasConfig } from '../config/visualization-config.service';

export interface ComponentData {
  id: string;
  type: string;
  name?: string;
  x?: number;  // Make sure this exists in your interface
  y?: number;  // Make sure this exists in your interface
  position?: { x: number; y: number }; // Some places use this format
  data: any;
  // Add these properties for control signal handling
  isControlSignal?: boolean;
  controlType?: 'clock' | 'reset';
  connections?: Record<string, any>;
  controlConnections?: {
    clock?: any;
    reset?: any;
  };
}

export interface RendererContext {
  svg: d3.Selection<SVGGElement, unknown, null, undefined>;
  config: CanvasConfig; // Changed from VisualizationConfig to CanvasConfig
}
