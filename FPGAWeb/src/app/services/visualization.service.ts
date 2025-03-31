import { Injectable } from '@angular/core';
import { COMPONENT_CONFIGS, ComponentConfig } from '../models/component-config.model';

interface Point {
  x: number;
  y: number;
}

interface FpgaCell {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  connections: Record<string, string>;
  initialState?: string;
  properties?: any;
  connectionPoints?: Record<string, {x: number, y: number}>;
}

interface ExternalWire {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  connectionPoints?: Record<string, {x: number, y: number}>;
}

interface Interconnect {
  id: string;
  name: string;
  sourceId: string;
  sourcePort: string;
  targetId: string;
  targetPort: string;
  points: Point[];
  delay: number;
  animationProgress?: number;
  lastSignalState?: string;
}

export interface FpgaLayout {
  cells: FpgaCell[];
  externalWires: ExternalWire[];
  interconnects: Interconnect[];
  dimensions: { width: number; height: number };
}

@Injectable({
  providedIn: 'root'
})
export class VisualizationService {
  private svgCache: Map<string, HTMLImageElement> = new Map();

  // Component type classification constants
  private readonly REGISTER_TYPES = ['DFF', 'DFFE', 'LATCH', 'FF', 'REGISTER'];
  private readonly LOGIC_TYPES = ['LUT', 'LUT_K', 'AND', 'OR', 'XOR', 'NOT', 'NAND', 'NOR', 'XNOR', 'MUX'];
  private readonly OUTPUT_TYPES = ['BUF', 'TBUF', 'DRIVER', 'OUTPUT_BUFFER'];

  constructor() {
    this.preloadComponentSVGs();
  }

  private preloadComponentSVGs(): void {
    Object.values(COMPONENT_CONFIGS).forEach(config => {
      const img = new Image();
      img.src = config.svgPath;
      img.onload = () => {
        this.svgCache.set(config.type, img);
      };
    });
  }

  public generateLayout(design: any): FpgaLayout {
    if (!design || !design.cells || !design.external_wires || !design.interconnects) {
      throw new Error('Invalid design format');
    }

    const cells: FpgaCell[] = [];
    const externalWires: ExternalWire[] = [];

    const inputs = design.external_wires.filter((wire: any) => wire.type === 'input');
    const outputs = design.external_wires.filter((wire: any) => wire.type === 'output');

    const connectivityGraph = this.buildConnectivityGraph(design);
    const fanoutGroups = this.analyzeFanouts(connectivityGraph);

    // Classify cells by logical function
    const groupedCells = this.groupCellsByLogicalFunction(design.cells);

    let gridY = 60;
    let gridX = 60;

    const inputOrder = this.optimizeInputOrder(inputs, connectivityGraph);

    // Place input wires on the left side
    for (let i = 0; i < inputOrder.length; i++) {
      const wire = inputOrder[i];
      const config = COMPONENT_CONFIGS['input'];

      externalWires.push({
        id: `ext_${wire.name}`,
        name: wire.name,
        type: wire.type,
        x: gridX,
        y: gridY,
        width: config.width,
        height: config.height,
        connectionPoints: this.getConnectionPoints(config, gridX, gridY)
      });
      gridY += config.height + 40;

      if ((i + 1) % 5 === 0) {
        gridY = 60;
        gridX += 200;
      }
    }

    gridY = 60;
    gridX = Math.max(300, gridX + 200);

    const cellStartX = gridX;

    // Get layer and grouping information together
    const { cellLayers, cellOrder } = this.assignCellLayersWithLogicalGrouping(
      design.cells,
      connectivityGraph,
      groupedCells
    );

    // Define spacing between logical stages
    const stageSpacing = 150;
    let currentStage = null;

    let currentLayer = 0;
    let layerX = cellStartX;
    let maxLayerHeight = 0;

    for (const cellName of cellOrder) {
      const cell = design.cells.find((c: any) => c.name === cellName);
      if (!cell) continue;

      // Get cell's logical stage
      const stage = this.getLogicalStage(cell);

      // If we're starting a new logical stage, add extra spacing
      if (currentStage !== null && currentStage !== stage) {
        layerX += stageSpacing;
      }
      currentStage = stage;

      // Handle layer changes
      if (cellLayers.get(cellName) !== currentLayer) {
        currentLayer = cellLayers.get(cellName) || 0;
        gridY = 60;
        layerX += maxLayerHeight > 0 ? (maxLayerHeight + 180) : 220;
        maxLayerHeight = 0;
      }

      let cellType = cell.type;
      if (cellType.startsWith('LUT')) {
        cellType = 'LUT';
      }

      const config = COMPONENT_CONFIGS[cellType] || {
        type: cell.type,
        svgPath: 'assets/generic_component.svg',
        width: 120,
        height: 80,
        connections: Object.keys(cell.connections).map((key, index, arr) => {
          const side = index < arr.length / 2 ? 'left' : 'right';
          const y = side === 'left'
            ? 0.2 + (0.6 * index / Math.max(1, arr.length / 2))
            : 0.2 + (0.6 * (index - Math.floor(arr.length / 2)) / Math.max(1, arr.length - Math.floor(arr.length / 2)));
          return {
            id: key,
            x: side === 'left' ? 0 : 1,
            y,
            side,
            label: key
          };
        })
      };

      // Add stage information to the cell for visualization purposes
      const cellStage = this.getLogicalStage(cell);

      cells.push({
        id: `cell_${cell.name}`,
        name: cell.name,
        type: cell.type,
        x: layerX,
        y: gridY,
        width: config.width,
        height: config.height,
        connections: cell.connections,
        initialState: cell.initial_state,
        properties: {
          ...cell,
          logicalStage: cellStage // Add logical stage information
        },
        connectionPoints: this.getConnectionPoints(config, layerX, gridY)
      });

      maxLayerHeight = Math.max(maxLayerHeight, config.height);
      gridY += config.height + 60;
    }

    gridY = 60;
    gridX = Math.max(layerX + 220, cellStartX + 400);

    const outputOrder = this.optimizeOutputOrder(outputs, connectivityGraph);

    for (let i = 0; i < outputOrder.length; i++) {
      const wire = outputOrder[i];
      const config = COMPONENT_CONFIGS['output'];

      externalWires.push({
        id: `ext_${wire.name}`,
        name: wire.name,
        type: wire.type,
        x: gridX,
        y: gridY,
        width: config.width,
        height: config.height,
        connectionPoints: this.getConnectionPoints(config, gridX, gridY)
      });

      gridY += config.height + 40;

      if ((i + 1) % 5 === 0) {
        gridY = 60;
        gridX += 200;
      }
    }

    const interconnects: Interconnect[] = this.createInterconnects(
      design.interconnects,
      cells,
      externalWires,
      connectivityGraph
    );

    const maxX = gridX + 200;
    const maxY = Math.max(
      inputs.length > 0 ? gridY + 80 : 0,
      cells.length > 0 ? gridY + 80 : 0,
      outputs.length > 0 ? gridY + 80 : 0
    );

    const layout = {
      cells,
      externalWires,
      interconnects,
      dimensions: {
        width: maxX,
        height: maxY
      }
    };

    return layout;
  }

  // Classify a cell by its logical function
  private getLogicalStage(cell: any): string {
    const type = cell.type.toUpperCase();

    // Check if it's a register component
    if (this.REGISTER_TYPES.some(t => type.includes(t))) {
      return 'register';
    }

    // Check if it's a logic component
    if (this.LOGIC_TYPES.some(t => type.includes(t))) {
      return 'logic';
    }

    // Check if it's an output component
    if (this.OUTPUT_TYPES.some(t => type.includes(t))) {
      return 'output';
    }

    // Default classification based on cell connections
    if (cell.connections) {
      // If it has clock input, likely a register
      if (Object.keys(cell.connections).some(k =>
          k === 'clk' || k === 'clock' || k === 'CLK' || k === 'CK')) {
        return 'register';
      }

      // Check for flip-flop style signals
      if (Object.keys(cell.connections).some(k => k === 'Q' || k === 'D')) {
        return 'register';
      }
    }

    // Default to logic stage for unknown components
    return 'logic';
  }

  // Group cells by their logical function
  private groupCellsByLogicalFunction(cells: any[]): Map<string, any[]> {
    const groups = new Map<string, any[]>();

    // Initialize groups
    groups.set('register', []);
    groups.set('logic', []);
    groups.set('output', []);
    groups.set('other', []);

    for (const cell of cells) {
      const stage = this.getLogicalStage(cell);
      const group = groups.get(stage) || groups.get('other')!;
      group.push(cell);
    }

    return groups;
  }

  // Enhanced layer assignment that considers logical grouping
  private assignCellLayersWithLogicalGrouping(
    cells: any[],
    graph: any,
    groupedCells: Map<string, any[]>
  ): { cellLayers: Map<string, number>, cellOrder: string[] } {
    const cellLayers = new Map<string, number>();
    const visited = new Set<string>();
    const sorted: string[] = [];

    // Define a priority ordering for stages
    const stagePriority = {
      'logic': 0,   // Logic components first
      'register': 1, // Then registers
      'output': 2   // Output components last
    };

    function visit(node: string, currentLayer = 0) {
      if (visited.has(node)) return;
      visited.add(node);

      const deps = graph.reverse.get(node) || new Set<string>();
      for (const dep of deps) {
        if (!visited.has(dep)) {
          visit(dep, currentLayer + 1);
        }
      }

      let maxDependencyLayer = -1;
      for (const dep of deps) {
        const depLayer = cellLayers.get(dep) || 0;
        maxDependencyLayer = Math.max(maxDependencyLayer, depLayer);
      }

      const layer = deps.size > 0 ? maxDependencyLayer + 1 : 0;
      cellLayers.set(node, layer);
      sorted.push(node);
    }

    // Process cells stage by stage to ensure proper ordering
    // Start with logic components
    for (const cell of groupedCells.get('logic') || []) {
      if (!visited.has(cell.name)) {
        visit(cell.name);
      }
    }

    // Then register components
    for (const cell of groupedCells.get('register') || []) {
      if (!visited.has(cell.name)) {
        visit(cell.name);
      }
    }

    // Finally output components
    for (const cell of groupedCells.get('output') || []) {
      if (!visited.has(cell.name)) {
        visit(cell.name);
      }
    }

    // Handle any remaining components
    for (const cell of groupedCells.get('other') || []) {
      if (!visited.has(cell.name)) {
        visit(cell.name);
      }
    }

    // Sort cells first by layer, then by stage priority
    const cellWithMetadata = sorted.map(cellName => {
      const cell = cells.find((c: any) => c.name === cellName);
      if (!cell) return { name: cellName, stage: 'other', layer: cellLayers.get(cellName) || 0 };

      const stage = this.getLogicalStage(cell);
      return {
        name: cellName,
        stage,
        layer: cellLayers.get(cellName) || 0
      };
    });

    // Sort by layer first, then by stage priority
    cellWithMetadata.sort((a, b) => {
      if (a.layer !== b.layer) return a.layer - b.layer;
      return (stagePriority[a.stage as keyof typeof stagePriority] || 99) -
             (stagePriority[b.stage as keyof typeof stagePriority] || 99);
    });

    return {
      cellLayers,
      cellOrder: cellWithMetadata.map(c => c.name)
    };
  }

  private buildConnectivityGraph(design: any): any {
    const graph = new Map<string, Set<string>>();
    const reverseGraph = new Map<string, Set<string>>();

    for (const cell of design.cells) {
      graph.set(cell.name, new Set<string>());
      reverseGraph.set(cell.name, new Set<string>());
    }

    for (const wire of design.external_wires) {
      graph.set(wire.name, new Set<string>());
      reverseGraph.set(wire.name, new Set<string>());
    }

    for (const ic of design.interconnects) {
      const { input, output } = ic.connections || {};
      if (!input || !output) continue;

      const sourceWireName = input.split('.')[0];
      const targetWireName = output.split('.')[0];

      const sourceConnections = graph.get(sourceWireName) || new Set<string>();
      sourceConnections.add(targetWireName);
      graph.set(sourceWireName, sourceConnections);

      const targetConnections = reverseGraph.get(targetWireName) || new Set<string>();
      targetConnections.add(sourceWireName);
      reverseGraph.set(targetWireName, targetConnections);
    }

    return { forward: graph, reverse: reverseGraph };
  }

  private analyzeFanouts(graph: any): Map<string, string[]> {
    const fanoutGroups = new Map<string, string[]>();

    for (const [source, targets] of graph.forward.entries()) {
      if (targets.size > 1) {
        fanoutGroups.set(source, Array.from(targets));
      }
    }

    return fanoutGroups;
  }

  private optimizeInputOrder(inputs: any[], graph: any): any[] {
    if (inputs.length <= 1) return inputs;

    const inputWeights = new Map<string, number>();

    for (const input of inputs) {
      const targets = graph.forward.get(input.name) || new Set<string>();

      let weight = 0;
      for (const target of targets) {
        const targetLayer = this.estimateComponentLayer(target, graph);
        weight += targetLayer * 100;
      }

      inputWeights.set(input.name, weight || 0);
    }

    return [...inputs].sort((a, b) =>
      (inputWeights.get(a.name) || 0) - (inputWeights.get(b.name) || 0)
    );
  }

  private optimizeOutputOrder(outputs: any[], graph: any): any[] {
    if (outputs.length <= 1) return outputs;

    const outputWeights = new Map<string, number>();

    for (const output of outputs) {
      const sources = graph.reverse.get(output.name) || new Set<string>();

      let weight = 0;
      for (const source of sources) {
        const sourceLayer = this.estimateComponentLayer(source, graph);
        weight += sourceLayer * 100;
      }

      outputWeights.set(output.name, weight || 0);
    }

    return [...outputs].sort((a, b) =>
      (outputWeights.get(a.name) || 0) - (outputWeights.get(b.name) || 0)
    );
  }

  private estimateComponentLayer(componentName: string, graph: any): number {
    let maxDepth = 0;
    const visited = new Set<string>();

    const calculateDepth = (node: string, depth: number) => {
      if (visited.has(node)) return;
      visited.add(node);

      maxDepth = Math.max(maxDepth, depth);

      const sources = graph.reverse.get(node);
      if (sources) {
        for (const source of sources) {
          calculateDepth(source, depth + 1);
        }
      }
    };

    calculateDepth(componentName, 0);
    return maxDepth;
  }

  private createInterconnects(
    designInterconnects: any[],
    cells: FpgaCell[],
    externalWires: ExternalWire[],
    connectivityGraph: any
  ): Interconnect[] {
    const connectionPoints = new Map<string, {component: FpgaCell | ExternalWire, point: {x: number, y: number}}>();

    cells.forEach(cell => {
      Object.entries(cell.connections).forEach(([port, connName]) => {
        const normalizedPort = this.normalizePortName(port);

        if (cell.connectionPoints && cell.connectionPoints[normalizedPort]) {
          connectionPoints.set(connName as string, {
            component: cell,
            point: cell.connectionPoints[normalizedPort]
          });
        } else if (cell.connectionPoints && cell.connectionPoints[port]) {
          connectionPoints.set(connName as string, {
            component: cell,
            point: cell.connectionPoints[port]
          });
        }
      });
    });

    externalWires.forEach(wire => {
      if (wire.type === 'input' && wire.connectionPoints?.['output']) {
        connectionPoints.set(wire.name, {
          component: wire,
          point: wire.connectionPoints['output']
        });
      }
      else if (wire.type === 'output' && wire.connectionPoints?.['input']) {
        connectionPoints.set(wire.name, {
          component: wire,
          point: wire.connectionPoints['input']
        });
      }
    });

    const fanoutGroups = new Map<string, any[]>();

    for (const ic of designInterconnects) {
      const { input, output } = ic.connections || {};
      if (!input || !output) continue;

      const key = input;
      if (!fanoutGroups.has(key)) {
        fanoutGroups.set(key, []);
      }
      fanoutGroups.get(key)?.push(ic);
    }

    const result: Interconnect[] = [];

    for (const [sourceKey, interconnects] of fanoutGroups.entries()) {
      if (interconnects.length === 1) {
        const ic = interconnects[0];
        const { input, output } = ic.connections || {};

        const source = connectionPoints.get(input);
        const target = connectionPoints.get(output);

        if (source && target) {
          const points = this.generateOptimizedRoute(source.point, target.point);

          result.push({
            id: `interconnect_${ic.name}`,
            name: ic.name,
            sourceId: source.component.id,
            sourcePort: input,
            targetId: target.component.id,
            targetPort: output,
            points,
            delay: parseFloat(ic.propagation_delay || '0'),
            animationProgress: 0,
            lastSignalState: '0',
          });
        }
      } else {
        this.createBundledFanout(sourceKey, interconnects, connectionPoints, result);
      }
    }

    return result;
  }

  private createBundledFanout(
    sourceKey: string,
    interconnects: any[],
    connectionPoints: Map<string, {component: FpgaCell | ExternalWire, point: {x: number, y: number}}>,
    result: Interconnect[]
  ): void {
    const source = connectionPoints.get(sourceKey);
    if (!source) return;

    const targets = interconnects.map(ic => {
      const { output } = ic.connections || {};
      const target = connectionPoints.get(output);
      return {
        interconnect: ic,
        targetInfo: target
      };
    }).filter(t => t.targetInfo);

    if (targets.length === 0) return;

    targets.sort((a, b) => a.targetInfo!.point.y - b.targetInfo!.point.y);

    const avgTargetX = targets.reduce((sum, t) => sum + t.targetInfo!.point.x, 0) / targets.length;

    const minTargetY = targets[0].targetInfo!.point.y;
    const maxTargetY = targets[targets.length - 1].targetInfo!.point.y;
    const trunkY = (minTargetY + maxTargetY) / 2;

    const trunkPoint = {
      x: source.point.x + (avgTargetX - source.point.x) * 0.6,
      y: trunkY
    };

    const trunkPath = [
      { x: source.point.x, y: source.point.y },
      { x: source.point.x + 20, y: source.point.y },
      { x: trunkPoint.x, y: trunkPoint.y }
    ];

    for (const target of targets) {
      const ic = target.interconnect;
      const targetPoint = target.targetInfo!.point;

      const branchPath = [
        { x: trunkPoint.x, y: trunkPoint.y },
        { x: targetPoint.x - 20, y: trunkPoint.y },
        { x: targetPoint.x - 20, y: targetPoint.y },
        { x: targetPoint.x, y: targetPoint.y }
      ];

      if (Math.abs(targetPoint.y - trunkPoint.y) > 40) {
        branchPath[1] = { x: trunkPoint.x, y: targetPoint.y };
        branchPath[2] = { x: targetPoint.x - 20, y: targetPoint.y };
      }

      result.push({
        id: `interconnect_${ic.name}`,
        name: ic.name,
        sourceId: source.component.id,
        sourcePort: ic.connections.input,
        targetId: target.targetInfo!.component.id,
        targetPort: ic.connections.output,
        points: branchPath,
        delay: parseFloat(ic.propagation_delay || '0'),
        animationProgress: 0,
        lastSignalState: '0',
      });
    }
  }

  private generateOptimizedRoute(source: {x: number, y: number}, target: {x: number, y: number}): Point[] {
    const points: Point[] = [];
    const dx = target.x - source.x;
    const dy = target.y - source.y;

    points.push({ x: source.x, y: source.y });

    if (Math.abs(dx) < 40 && Math.abs(dy) < 40) {
      points.push({ x: target.x, y: target.y });
    }
    else if (Math.abs(dx) > Math.abs(dy) * 3) {
      const midX = source.x + dx * 0.5;
      points.push({ x: midX, y: source.y });
      points.push({ x: midX, y: target.y });
      points.push({ x: target.x, y: target.y });
    }
    else if (Math.abs(dy) > Math.abs(dx) * 3) {
      const midY = source.y + dy * 0.5;
      points.push({ x: source.x, y: midY });
      points.push({ x: target.x, y: midY });
      points.push({ x: target.x, y: target.y });
    }
    else {
      const initialDist = Math.min(20, Math.abs(dx) * 0.2);
      if (dx > 0) {
        points.push({ x: source.x + initialDist, y: source.y });
      } else {
        points.push({ x: source.x - initialDist, y: source.y });
      }

      const midX = source.x + dx * 0.5;
      const midY = source.y + dy * 0.5;
      points.push({ x: midX, y: source.y + dy * 0.3 });
      points.push({ x: midX, y: midY });
      points.push({ x: target.x - dx * 0.3, y: midY });

      const finalDist = Math.min(20, Math.abs(dx) * 0.2);
      if (dx > 0) {
        points.push({ x: target.x - finalDist, y: target.y });
      } else {
        points.push({ x: target.x + finalDist, y: target.y });
      }
    }

    points.push({ x: target.x, y: target.y });

    return points;
  }

  getSVGForComponent(type: string): HTMLImageElement | null {
    return this.svgCache.get(type) || null;
  }

  getCellStateColor(state: string): string {
    switch (state) {
      case '1': return '#ff5050';
      case '0': return '#4d79ff';
      default: return '#aaaaaa';
    }
  }

  getStateGlow(state: string): { color: string; blur: number; } {
    switch (state) {
      case '1': return { color: 'rgba(255, 80, 80, 0.8)', blur: 15 };
      case '0': return { color: 'rgba(77, 121, 255, 0.8)', blur: 10 };
      default: return { color: 'rgba(170, 170, 170, 0.3)', blur: 5 };
    }
  }

  public logLayoutConnectionPoints(layout: FpgaLayout): void {
    console.group('FPGA Layout Connection Points');

    console.log('Cells:');
    layout.cells.forEach(cell => {
      console.group(`Cell: ${cell.name} (${cell.type})`);
      console.log('Connections:', cell.connections);
      console.log('Connection Points:', cell.connectionPoints);
      console.groupEnd();
    });

    console.log('External Wires:');
    layout.externalWires.forEach(wire => {
      console.group(`Wire: ${wire.name} (${wire.type})`);
      console.log('Connection Points:', wire.connectionPoints);
      console.groupEnd();
    });

    console.log('Interconnects:');
    layout.interconnects.forEach(ic => {
      console.log(`${ic.name}: ${ic.sourcePort} → ${ic.targetPort}`);
    });

    console.groupEnd();
  }

  // Helper method to normalize port names for common naming variations
  private normalizePortName(port: string): string {
    // Handle common naming variations in port IDs
    if (port.startsWith('in_') || port.startsWith('in[')) {
      return 'input';
    } else if (port === 'out' || port === 'O' || port === 'output' || port === 'OUT') {
      return 'output';
    } else if (port === 'Q' || port === 'q') {
      return 'output';
    } else if (port === 'D' || port === 'd') {
      return 'input';
    } else if (port === 'CLK' || port === 'clk' || port === 'clock' || port === 'CK') {
      return 'clock';
    }
    return port;
  }

  // Helper method to get connection points for a component
  private getConnectionPoints(config: ComponentConfig, x: number, y: number): Record<string, {x: number, y: number}> {
    const result: Record<string, {x: number, y: number}> = {};

    if (!config.connections) {
      return result;
    }

    for (const connection of config.connections) {
      // Calculate absolute position based on relative coordinates
      const pointX = x + connection.x * config.width;
      const pointY = y + connection.y * config.height;

      result[connection.id] = { x: pointX, y: pointY };
    }

    return result;
  }
}