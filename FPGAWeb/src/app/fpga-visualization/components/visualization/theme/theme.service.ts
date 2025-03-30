import { Injectable, Renderer2, RendererFactory2 } from '@angular/core';
import { FPGATheme, generateCSSVariables } from './fpga-theme';

@Injectable({
  providedIn: 'root'  // This makes it available application-wide
})
export class ThemeService {
  private renderer: Renderer2;
  private styleElement: HTMLStyleElement | null = null;

  constructor(rendererFactory: RendererFactory2) {
    this.renderer = rendererFactory.createRenderer(null, null);
  }

  /**
   * Apply the theme to the document by injecting CSS variables
   */
  applyTheme(): void {
    // Create or get the style element
    if (!this.styleElement) {
      this.styleElement = this.renderer.createElement('style');
      // Fix: Only access properties if styleElement is not null
      if (this.styleElement) {
        this.styleElement.id = 'fpga-theme-variables';
        this.renderer.appendChild(document.head, this.styleElement);
      }
    }

    // Generate CSS variables from the theme
    const cssVars = generateCSSVariables();
    // Fix: Only set textContent if styleElement is not null
    if (this.styleElement) {
      this.styleElement.textContent = cssVars;
    }

    console.log('FPGA theme applied');
  }

  /**
   * Get the component fill color from the theme based on component type
   */
  getComponentColor(componentType: string): string {
    componentType = componentType.toLowerCase();
    
    if (componentType.includes('dff')) {
      return FPGATheme.colors.components.dff;
    } else if (componentType.includes('lut')) {
      return FPGATheme.colors.components.lut;
    } else if (componentType.includes('gpio')) {
      return FPGATheme.colors.components.gpio;
    } else if (componentType.includes('wire')) {
      if (componentType.includes('input')) {
        return FPGATheme.colors.components.inputWire;
      } else if (componentType.includes('output')) {
        return FPGATheme.colors.components.outputWire;
      }
    }
    
    // Default color
    return FPGATheme.colors.primary;
  }

  /**
   * Get the connection color based on connection type
   */
  getConnectionColor(connectionType: string): string {
    switch (connectionType) {
      case 'clock':
        return FPGATheme.colors.connections.clock;
      case 'control':
        return FPGATheme.colors.connections.control;
      case 'data':
      default:
        return FPGATheme.colors.connections.data;
    }
  }
}