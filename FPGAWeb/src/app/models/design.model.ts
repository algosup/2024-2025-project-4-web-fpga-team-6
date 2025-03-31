export interface VisualizationState {
  clockFrequency: number;
}

export interface DesignMetadata {
  name: string;
  description: string;
  visualizationState: VisualizationState;
}

export interface Design {
  id: string;
  name: string;
  description: string;
  files: string[];
  verilogContent: string;
  sdfContent: string;
  jsonContent: any;
  visualizationState: {
    clockFrequency: number;
  };
}