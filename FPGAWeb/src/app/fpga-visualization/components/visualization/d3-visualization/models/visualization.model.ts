import * as d3 from 'd3';

export interface ComponentData {
  id: string;
  name: string;
  type: string;
  data: any;
  position?: { x: number; y: number }; // Add position property
}

export interface VisualizationConfig {
  width: number;
  height: number;
  margin: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  componentSize: {
    width: number;
    height: number;
    margin: number;
  };
}

export interface RendererContext {
  svg: d3.Selection<SVGGElement, unknown, null, undefined>;
  config: VisualizationConfig;
}
