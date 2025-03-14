/**
 * This script converts the Verilog & SDF files into a JSON file containing in a convenient way:
 * - the schematic representation of the circuit.
 * - the timing information of the circuit.
 * 
 * A Verilog file (.v) contains the structural description of the circuit
 * - Like module definition, ports, wires, and cell instances (DFF, AND, OR, etc.)
 * 
 * A SDF file (.sdf) contains timing information for the circuit
 * - Like cell delays, interconnect delays, setup/hold times
 */

import * as fs from 'fs';
import * as path from 'path';

// Define interfaces for our data structures
interface ExternalWire {
    name: string;
    type: string;
}

interface CellConnection {
    [key: string]: string;
}

interface Cell {
    type: string;
    name: string;
    connections: CellConnection;
    D_stability_delay?: string;
    Q_update_delay?: string;
    K?: number;
    mask?: string;
    in_out_delays?: { [key: string]: string };
}

interface InterconnectConnections {
    input: string;
    output: string;
}

interface Interconnect {
    name: string;
    connections: InterconnectConnections;
    propagation_delay: string;
}

interface SchematicOutput {
    type: string;
    name: string;
    external_wires: ExternalWire[];
    cells: Cell[];
    interconnects: Interconnect[];
}

// Define the structure of Verilog components and their parsing patterns
const VERILOG_COMPONENTS = {
    naming: {
        external_wire_prefix: 'ext',
        route_prefix: 'route',
        route_separator: '_TO_',
        component_separator: '_',
        default_value: '0'
    },
    module: {
        pattern: /module\s+(\w+)\s*\(/,
        ports_pattern: /(input|output)\s+\\(\w+)\s*[,)]/g,
    },
    cells: {
        DFF: {
            pattern: /DFF\s+#\(\s*\.INITIAL_VALUE\([^)]+\)\s*\)\s*\\(\w+)\s*\(\s*\.D\(\\([^)]+)\s*\),\s*\.Q\(\\([^)]+)\s*\),\s*\.clock\(\\([^)]+)\s*\)\s*\);/g,
            timing_pattern: /\(CELL\s*\(CELLTYPE\s*"DFF"\).*?\(DELAY.*?\(IOPATH.*?Q\s*\((\d+):.*?\)\s*\).*?\(SETUP\s*D.*?\((-?\d+):/s,
            ports: ["D", "Q", "clock"],
            parameters: ["INITIAL_VALUE"],
            timing: {
                setup: "D_stability_delay",
                clock_to_q: "Q_update_delay"
            }
        },
        LUT_K: {
            pattern: /LUT_K\s+#\(\s*\.K\((\d+)\),\s*\.LUT_MASK\(32'b([01]+)\)\s*\)\s*\\([^)]+)\s*\(\s*\.in\(\{([^}]+)\}\),\s*\.out\(\\([^)]+)\s*\)\s*\);/g,
            timing_pattern: /\(CELL\s*\(CELLTYPE\s*"LUT_K"\)\s*\(INSTANCE\s*([^)]+)\)[\s\S]*?\(DELAY\s*\(ABSOLUTE([\s\S]*?)\)\s*\)\s*\)/s,
            iopath_pattern: /\(IOPATH\s*in\[(\d+)\]\s*out\s*\((\d+):\d+:\d+\)/g,
            ports: {
                input_prefix: "in",
                output: "out"
            },
            parameters: ["K", "LUT_MASK"]
        }
    },
    interconnects: {
        pattern: /fpga_interconnect\s*\\([^)]+)\s*\(\s*\.datain\(\\([^)]+)\s*\),\s*\.dataout\(\\([^)]+)\s*\)\s*\);/g,
        timing_pattern: /\(CELL\s*\(CELLTYPE\s*"fpga_interconnect"\)\s*\(INSTANCE\s*([^)]+)\).*?\(IOPATH.*?\((\d+\.?\d*):.*?\)\s*\)/s,
    },
    wires: {
        pattern: /wire\s+\\([^;]+);/g
    },
    assignments: {
        pattern: /assign\s+\\([^=]+)\s*=\s*\\([^;]+);/g
    }
};

class CellNameGenerator {
    private counters: { [key: string]: number } = {};
    private nameMap: { [key: string]: string } = {};

    getName(cellType: string, originalName: string): string {
        if (this.nameMap[originalName]) {
            return this.nameMap[originalName];
        }

        if (!this.counters[cellType]) {
            this.counters[cellType] = 0;
        }

        this.counters[cellType]++;
        const newName = `${cellType.toLowerCase()}${VERILOG_COMPONENTS.naming.component_separator}${this.counters[cellType]}`;
        this.nameMap[originalName] = newName;

        return newName;
    }
}

class VerilogParser {
    private content: string = '';
    private sdfContent: string = '';
    private moduleName: string = '';
    private externalWires: ExternalWire[] = [];
    private cells: Cell[] = [];
    private interconnects: Interconnect[] = [];
    private wireMap: { [key: string]: string } = {};
    private delays: { [key: string]: string } = {};
    private cellNamer: CellNameGenerator;

    constructor(private verilogPath: string, private sdfPath: string) {
        this.cellNamer = new CellNameGenerator();
    }

    private readFiles(): void {
        this.content = fs.readFileSync(this.verilogPath, 'utf8');
        this.sdfContent = fs.readFileSync(this.sdfPath, 'utf8');
    }

    private parseModule(): void {
        const moduleMatch = this.content.match(VERILOG_COMPONENTS.module.pattern);
        this.moduleName = moduleMatch ? moduleMatch[1] : '';

        const portAssignments: { [key: string]: string } = {};
        let portMatch;
        const portPattern = new RegExp(VERILOG_COMPONENTS.module.ports_pattern.source, 'g');
        while ((portMatch = portPattern.exec(this.content)) !== null) {
            const [, portType, portName] = portMatch;
            const cleanName = portName.replace(/\\/g, '');
            const extName = `${VERILOG_COMPONENTS.naming.external_wire_prefix}${VERILOG_COMPONENTS.naming.component_separator}${portType}${VERILOG_COMPONENTS.naming.component_separator}${cleanName}`;
            this.externalWires.push({
                name: extName,
                type: portType
            });
            portAssignments[cleanName] = extName;
        }

        let assignMatch;
        while ((assignMatch = VERILOG_COMPONENTS.assignments.pattern.exec(this.content)) !== null) {
            const [, wire, port] = assignMatch;
            const cleanWire = wire.trim();
            const cleanPort = port.trim();
            
            if (portAssignments[cleanPort]) {
                this.wireMap[cleanWire] = portAssignments[cleanPort];
            } else if (portAssignments[cleanWire]) {
                this.wireMap[cleanPort] = portAssignments[cleanWire];
            }
        }
    }

    private parseTiming(): void {
        const dffPattern = VERILOG_COMPONENTS.cells.DFF.timing_pattern;
        const dffMatch = this.sdfContent.match(dffPattern);

        if (dffMatch) {
            this.delays['q_update_delay'] = dffMatch[1];
            this.delays['d_stability_delay'] = dffMatch[2];
        }

        const interconnectPattern = new RegExp(VERILOG_COMPONENTS.interconnects.timing_pattern.source, 'gs');
        let interconnectMatch;
        
        while ((interconnectMatch = interconnectPattern.exec(this.sdfContent)) !== null) {
            const routeName = interconnectMatch[1].trim();
            const delay = interconnectMatch[2];
            this.delays[this.cleanWireName(routeName)] = delay;
        }
    }

    private cleanWireName(name: string): string {
        return name.trim();
    }

    private parseCells(): void {
        for (const [cellType, cellInfo] of Object.entries(VERILOG_COMPONENTS.cells)) {
            let cellMatch: RegExpExecArray | null;
            const pattern = new RegExp((cellInfo as any).pattern.source, 'g');
            
            while ((cellMatch = pattern.exec(this.content)) !== null) {
                const match = cellMatch as RegExpExecArray;
                
                if (cellType === 'DFF') {
                    const instanceName = match[1];
                    const cellName = this.cellNamer.getName(cellType, instanceName);

                    const ports: { [key: string]: string } = {};
                    (cellInfo as any).ports.forEach((portName: string, index: number) => {
                        if (index + 2 < match.length) {
                            const wireName = match[index + 2].trim();
                            const mappedName = `${cellName}${VERILOG_COMPONENTS.naming.component_separator}${portName}`;
                            ports[portName] = mappedName;
                            this.wireMap[wireName] = mappedName;
                        }
                    });

                    const component: Cell = {
                        type: cellType,
                        name: cellName,
                        connections: ports,
                        D_stability_delay: this.delays['d_stability_delay'] || VERILOG_COMPONENTS.naming.default_value,
                        Q_update_delay: this.delays['q_update_delay'] || VERILOG_COMPONENTS.naming.default_value
                    };

                    this.cells.push(component);
                } else if (cellType === 'LUT_K') {
                    const k = parseInt(match[1]);
                    const mask = match[2];
                    const instanceName = match[3];
                    const inputs = match[4].split(',').map(input => input.trim());
                    const output = match[5];
                    
                    const cellName = this.cellNamer.getName(cellType, instanceName);
                    const connections: { [key: string]: string } = {};
                    const lutInfo = cellInfo as typeof VERILOG_COMPONENTS.cells.LUT_K;
                    
                    for (let i = 0; i < k; i++) {
                        connections[`${lutInfo.ports.input_prefix}${VERILOG_COMPONENTS.naming.component_separator}${i}`] = VERILOG_COMPONENTS.naming.default_value;
                    }
                    
                    inputs.forEach((input, index) => {
                        if (input !== '1\'b0') {
                            const cleanInput = input.replace(/\\/g, '').trim();
                            const inputMatch = cleanInput.match(/input_0_(\d+)/);
                            if (inputMatch) {
                                const inputNum = inputMatch[1];
                                const portName = `${lutInfo.ports.input_prefix}${VERILOG_COMPONENTS.naming.component_separator}${inputNum}`;
                                connections[portName] = `${cellName}${VERILOG_COMPONENTS.naming.component_separator}${portName}`;
                                this.wireMap[cleanInput] = connections[portName];
                            }
                        }
                    });
                    
                    connections[lutInfo.ports.output] = `${cellName}${VERILOG_COMPONENTS.naming.component_separator}${lutInfo.ports.output}`;
                    this.wireMap[output.trim()] = connections[lutInfo.ports.output];

                    const component: Cell = {
                        type: cellType,
                        name: cellName,
                        K: k,
                        mask: mask,
                        connections,
                        in_out_delays: {}
                    };

                    const lutTimingPattern = new RegExp((cellInfo as any).timing_pattern.source, 'gs');
                    const lutTimingMatch = lutTimingPattern.exec(this.sdfContent);
                    
                    if (lutTimingMatch) {
                        const cellContent = lutTimingMatch[2];
                        const delayMap = new Map<string, string>();
                        const matches = [...cellContent.matchAll(VERILOG_COMPONENTS.cells.LUT_K.iopath_pattern)];
                        
                        for (const match of matches) {
                            const [, inputIndex, delay] = match;
                            if (inputIndex && delay) {
                                const portName = `${lutInfo.ports.input_prefix}${VERILOG_COMPONENTS.naming.component_separator}${inputIndex}`;
                                delayMap.set(portName, delay);
                            }
                        }

                        const inOutDelays: { [key: string]: string } = {};
                        for (const [portName, delay] of delayMap.entries()) {
                            if (connections[portName] !== VERILOG_COMPONENTS.naming.default_value) {
                                inOutDelays[portName] = delay;
                            }
                        }
                        component.in_out_delays = inOutDelays;
                    }

                    this.cells.push(component);
                }
            }
        }
    }

    private parseInterconnects(): void {
        const delayMap = new Map<string, string>();
        const interconnectPattern = new RegExp(VERILOG_COMPONENTS.interconnects.timing_pattern.source, 'gs');
        let interconnectTimingMatch;
        
        while ((interconnectTimingMatch = interconnectPattern.exec(this.sdfContent)) !== null) {
            const routeName = interconnectTimingMatch[1].trim().replace(/\\/g, '');
            const delay = interconnectTimingMatch[2];
            delayMap.set(routeName, delay);
        }

        let interconnectMatch;
        while ((interconnectMatch = VERILOG_COMPONENTS.interconnects.pattern.exec(this.content)) !== null) {
            const routeName = this.cleanWireName(interconnectMatch[1]);
            const source = this.cleanWireName(interconnectMatch[2]);
            const dest = this.cleanWireName(interconnectMatch[3]);

            const sourceMapped = this.wireMap[source] || source;
            const destMapped = this.wireMap[dest] || dest;
            const delay = delayMap.get(routeName.replace(/\\/g, '')) || VERILOG_COMPONENTS.naming.default_value;
            
            this.interconnects.push({
                name: `${VERILOG_COMPONENTS.naming.route_prefix}${VERILOG_COMPONENTS.naming.component_separator}${sourceMapped}${VERILOG_COMPONENTS.naming.route_separator}${destMapped}`,
                connections: {
                    input: sourceMapped,
                    output: destMapped
                },
                propagation_delay: delay
            });
        }
    }

    parse(): SchematicOutput {
        this.readFiles();
        this.parseModule();
        this.parseTiming();
        this.parseCells();
        this.parseInterconnects();

        return {
            type: 'module',
            name: this.moduleName,
            external_wires: this.externalWires,
            cells: this.cells,
            interconnects: this.interconnects
        };
    }
}

function processDirectory(rootDir: string, directory: string): void {
    const publicDir = path.join(rootDir, '..', 'public');
    const inputDir = path.join(publicDir, directory);
    const files = fs.readdirSync(inputDir);

    let verilogFile: string | null = null;
    let sdfFile: string | null = null;

    for (const file of files) {
        if (file.endsWith('.v')) {
            if (verilogFile && !file.endsWith('_post_synthesis.v')) {
                continue;
            }
            verilogFile = file;
        } else if (file.endsWith('.sdf')) {
            sdfFile = file;
        }
    }

    if (!verilogFile || !sdfFile) {
        return;
    }

    let baseName;
    if (verilogFile.endsWith('_post_synthesis.v')) {
        baseName = sdfFile.replace('_post_synthesis.sdf', '');
    } else if (sdfFile.endsWith('_post_synthesis.sdf')) {
        baseName = sdfFile.replace('.sdf', '');
    } else {
        baseName = verilogFile.replace('.v', '');
    }

    const verilogPath = path.join(inputDir, verilogFile);
    const sdfPath = path.join(inputDir, sdfFile);
    const schematicsDir = path.join(publicDir, 'schematics');
    
    if (!fs.existsSync(schematicsDir)) {
        fs.mkdirSync(schematicsDir, { recursive: true });
    }
    
    const outputFile = path.join(schematicsDir, `${baseName}_schematics.json`);
    const parser = new VerilogParser(verilogPath, sdfPath);
    const schematic = parser.parse();
    fs.writeFileSync(outputFile, JSON.stringify(schematic, null, 4));
}

function main(): void {
    const scriptDir = __dirname;
    const srcDir = scriptDir.includes('dist') ? path.join(scriptDir, '../../src') : scriptDir;
    
    processDirectory(srcDir, 'verilog_post_synthesis_examples/1ff_no_rst_VTR');
    processDirectory(srcDir, 'verilog_post_synthesis_examples/1ff_VTR');
}

if (require.main === module) {
    main();
}

export { VerilogParser, processDirectory };
