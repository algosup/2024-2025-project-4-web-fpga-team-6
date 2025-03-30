import * as d3 from 'd3';
import { CanvasConfig } from '../config/visualization-config.service';

export interface ComponentData {
  id: string;
  type: string;
  name?: string;
  data: any;
  position?: { x: number; y: number }; // Add position property
}

export interface RendererContext {
  svg: d3.Selection<SVGGElement, unknown, null, undefined>;
  config: CanvasConfig; // Changed from VisualizationConfig to CanvasConfig
}
