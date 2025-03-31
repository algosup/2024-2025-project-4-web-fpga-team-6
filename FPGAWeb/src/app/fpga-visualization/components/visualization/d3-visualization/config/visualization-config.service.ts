import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { VisualizationStyleService, StyleOptions } from '../styles/visualization-style.service';

// Layout configuration
export interface LayoutConfig {
  type: 'grid' | 'force' | 'hierarchical';
  padding: number;
  componentSpacing: number;
  enableDragging: boolean;
  // Add connection style option
  connectionStyle?: 'straight' | 'curved' | 'orthogonal';
  // Force layout specific
  forceLinkDistance?: number;
  forceCharge?: number;
  // Grid layout specific
  gridRows?: number;
  gridColumns?: number;
  // Hierarchical layout specific
  hierarchicalLevels?: string[];
  hierarchicalDirection?: 'TB' | 'LR';
}

// Interaction configuration
export interface InteractionConfig {
  zoomEnabled: boolean;
  zoomExtent: [number, number]; // [min, max] zoom
  draggableComponents: boolean;
  selectableComponents: boolean;
  hoverEffectsEnabled: boolean;
  animateTransitions: boolean;
  transitionDuration: number;
}

// Canvas configuration
export interface CanvasConfig {
  width: number;
  height: number;
  margin: { top: number; right: number; bottom: number; left: number };
  showGrid: boolean;
  gridSize: number;
  autoResize: boolean;
  componentSize: { 
    width: number; 
    height: number; 
    margin: number;
  }; // Changed from number to object with required properties
}

// Complete visualization configuration
export interface VisualizationConfigOptions {
  canvas: CanvasConfig;
  layout: LayoutConfig;
  interaction: InteractionConfig;
  style: StyleOptions;
}

@Injectable({
  providedIn: 'root'
})
export class VisualizationConfigService {
  // Default configuration
  private defaultConfig: VisualizationConfigOptions = {
    canvas: {
      width: 800,
      height: 600,
      margin: { top: 20, right: 20, bottom: 30, left: 50 },
      showGrid: true,
      gridSize: 20,
      autoResize: true,
      componentSize: { 
        width: 100, 
        height: 60,
        margin: 20
      } // Update to match the new type
    },
    layout: {
      type: 'grid', // Ensure default layout is set to grid
      padding: 30,
      componentSpacing: 50, // Updated spacing
      enableDragging: true,
      connectionStyle: 'orthogonal', // Updated default connection style
      // Force layout defaults
      forceLinkDistance: 100,
      forceCharge: -300,
      // Grid layout defaults
      gridRows: 8, // Updated default rows
      gridColumns: 12, // Updated default columns
      // Hierarchical layout defaults
      hierarchicalDirection: 'TB'
    },
    interaction: {
      zoomEnabled: true,
      zoomExtent: [0.2, 3],
      draggableComponents: true,
      selectableComponents: true,
      hoverEffectsEnabled: true,
      animateTransitions: true,
      transitionDuration: 300
    },
    style: {
      darkMode: false,
      highContrast: false,
      animatedConnections: false
    }
  };

  // Current configuration
  private _currentConfig: VisualizationConfigOptions;
  
  // Observable for configuration changes
  private configSubject = new BehaviorSubject<VisualizationConfigOptions>(this.defaultConfig);
  public config$: Observable<VisualizationConfigOptions> = this.configSubject.asObservable();
  
  constructor(private styleService: VisualizationStyleService) {
    // Initialize with default configuration
    this._currentConfig = {...this.defaultConfig};
    
    // Sync style config with style service
    this.styleService.updateOptions(this._currentConfig.style);
  }
  
  // Get the current configuration
  get config(): VisualizationConfigOptions {
    return this._currentConfig;
  }
  
  // Get specific parts of the configuration
  get canvas(): CanvasConfig {
    return this._currentConfig.canvas;
  }
  
  get layout(): LayoutConfig {
    return this._currentConfig.layout;
  }
  
  get interaction(): InteractionConfig {
    return this._currentConfig.interaction;
  }
  
  // Update the entire configuration
  updateConfig(config: Partial<VisualizationConfigOptions>): void {
    // Deep merge with current config
    this._currentConfig = this.deepMerge(this._currentConfig, config);
    
    // Sync with style service
    if (config.style) {
      this.styleService.updateOptions(config.style);
    }
    
    // Notify subscribers
    this.configSubject.next(this._currentConfig);
  }
  
  // Update specific parts of the configuration
  updateCanvasConfig(config: Partial<CanvasConfig>): void {
    this._currentConfig.canvas = {...this._currentConfig.canvas, ...config};
    this.configSubject.next(this._currentConfig);
  }
  
  updateLayoutConfig(config: Partial<LayoutConfig>): void {
    // Always enforce grid layout regardless of input
    this._currentConfig.layout = {
      ...this._currentConfig.layout,
      ...config,
      type: 'grid' // Force grid layout type
    };
    this.configSubject.next(this._currentConfig);
  }
  
  updateInteractionConfig(config: Partial<InteractionConfig>): void {
    this._currentConfig.interaction = {...this._currentConfig.interaction, ...config};
    this.configSubject.next(this._currentConfig);
  }
  
  updateStyleConfig(config: Partial<StyleOptions>): void {
    this._currentConfig.style = {...this._currentConfig.style, ...config};
    this.styleService.updateOptions(config);
    this.configSubject.next(this._currentConfig);
  }
  
  // Reset to default configuration
  resetToDefault(): void {
    this._currentConfig = {...this.defaultConfig};
    this.styleService.updateOptions(this._currentConfig.style);
    this.configSubject.next(this._currentConfig);
  }
  
  // Save configuration to local storage
  saveConfig(name: string = 'default'): void {
    try {
      const configString = JSON.stringify(this._currentConfig);
      localStorage.setItem(`fpga-viz-config-${name}`, configString);
    } catch (error) {
      console.error('Error saving configuration to local storage:', error);
    }
  }
  
  // Load configuration from local storage
  loadConfig(name: string = 'default'): boolean {
    try {
      const configString = localStorage.getItem(`fpga-viz-config-${name}`);
      if (configString) {
        const loadedConfig = JSON.parse(configString);
        this.updateConfig(loadedConfig);
        return true;
      }
    } catch (error) {
      console.error('Error loading configuration from local storage:', error);
    }
    return false;
  }
  
  // Helper method for deep merging objects
  private deepMerge(target: any, source: any): any {
    if (!source) return target;
    
    const output = {...target};
    
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, {[key]: source[key]});
          } else {
            output[key] = this.deepMerge(target[key], source[key]);
          }
        } else {
          Object.assign(output, {[key]: source[key]});
        }
      });
    }
    
    return output;
  }
  
  private isObject(item: any): boolean {
    return (item && typeof item === 'object' && !Array.isArray(item));
  }
}