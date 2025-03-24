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

// Add configuration object at the top
const CONFIG = {
    encoding: 'utf8' as BufferEncoding,
    fileExtensions: {
        verilog: '.v',
        sdf: '.sdf',
        postSynthesis: '_post_synthesis',
        schematics: '_schematics.json'
    },
    directories: {
        public: 'public',
        schematics: 'schematics',
        examples: 'verilog_post_synthesis_examples'
    },
    regexFlags: {
        global: 'g',
        globalMultiline: 'gs'
    }
};

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
            // Updated pattern to handle special characters in instance names and improve whitespace handling
            pattern: /DFF\s+#\(\s*\.INITIAL_VALUE\([^)]+\)\s*\)\s*\\([^( \t\n\r]+)\s*\(\s*\.D\(\\([^)]+)\),\s*\.Q\(\\([^)]+)\),\s*\.clock\(\\([^)]+)\)\s*\);/g,
            // Make sure the pattern has 'g' flag and handles whitespace variations
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
        this.content = fs.readFileSync(this.verilogPath, { encoding: CONFIG.encoding as BufferEncoding });
        this.sdfContent = fs.readFileSync(this.sdfPath, { encoding: CONFIG.encoding as BufferEncoding });
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
        return name.replace(/\\/g, '').trim();
    }

    private parseCells(): void {
        for (const [cellType, cellInfo] of Object.entries(VERILOG_COMPONENTS.cells)) {
            const pattern = new RegExp((cellInfo as any).pattern.source, CONFIG.regexFlags.global);
            if (cellType === 'DFF') {
                let match: RegExpExecArray | null;
                
                while ((match = pattern.exec(this.content)) !== null) {
                    const instanceName = match[1];
                    const cellName = this.cellNamer.getName(cellType, instanceName);
                    
                    const ports: { [key: string]: string } = {};
                    (cellInfo as any).ports.forEach((portName: string, index: number) => {
                        const wireName = match![index + 2].trim();
                        const mappedName = `${cellName}${VERILOG_COMPONENTS.naming.component_separator}${portName}`;
                        ports[portName] = mappedName;
                        this.wireMap[wireName] = mappedName;
                    });

                    const component: Cell = {
                        type: cellType,
                        name: cellName,
                        connections: ports,
                        D_stability_delay: this.delays['d_stability_delay'] || VERILOG_COMPONENTS.naming.default_value,
                        Q_update_delay: this.delays['q_update_delay'] || VERILOG_COMPONENTS.naming.default_value
                    };
                    
                    this.cells.push(component);
                }
            } else if (cellType === 'LUT_K') {
                let match: RegExpExecArray | null;
                
                while ((match = pattern.exec(this.content)) !== null) {
                    const inputs = match[4].split(',').map(input => input.trim());
                    const outputWire = match[5].trim();
                    
                    const k = parseInt(match[1]);
                    const mask = match[2];
                    const instanceName = match[3];
                    const cellName = this.cellNamer.getName(cellType, instanceName);
                    
                    // Create connections
                    const connections: { [key: string]: string } = {};
                    
                    // Map inputs in reverse order to match the model
                    inputs.forEach((input, index) => {
                        const reverseIndex = k - 1 - index; // Reverse the index order
                        if (input === '1\'b0') {
                            connections[`in_${reverseIndex}`] = '0';
                        } else if (input === '1\'b1') {
                            connections[`in_${reverseIndex}`] = '1';
                        } else {
                            const mappedName = `${cellName}${VERILOG_COMPONENTS.naming.component_separator}in_${reverseIndex}`;
                            connections[`in_${reverseIndex}`] = mappedName;
                            this.wireMap[input.replace(/\\/g, '')] = mappedName;
                        }
                    });

                    // Add output connection
                    const outputMappedName = `${cellName}${VERILOG_COMPONENTS.naming.component_separator}out`;
                    connections['out'] = outputMappedName;
                    this.wireMap[outputWire] = outputMappedName;

                    // Get delays from SDF
                    const in_out_delays: { [key: string]: string } = {};
                    const lutTimingPattern = new RegExp((cellInfo as any).timing_pattern.source, 'g');
                    const lutTimingMatch = lutTimingPattern.exec(this.sdfContent);
                    
                    if (lutTimingMatch) {
                        let iopathMatch;
                        const iopathPattern = new RegExp((cellInfo as any).iopath_pattern.source, 'g');
                        while ((iopathMatch = iopathPattern.exec(lutTimingMatch[2])) !== null) {
                            const inputIndex = iopathMatch[1];
                            const delay = iopathMatch[2];
                            in_out_delays[`in_${inputIndex}`] = delay;
                        }
                    }

                    const component: Cell = {
                        type: cellType,
                        name: cellName,
                        K: k,
                        mask: mask,
                        connections: connections,
                        in_out_delays: in_out_delays
                    };
                    
                    this.cells.push(component);
                }
            }
        }
    }

    private parseInterconnects(): void {
        const timingPattern = new RegExp(
            VERILOG_COMPONENTS.interconnects.timing_pattern.source, 
            CONFIG.regexFlags.globalMultiline
        );
        let timingMatch;
        const delayMap = new Map<string, string>();
        
        while ((timingMatch = timingPattern.exec(this.sdfContent)) !== null) {
            const routeName = timingMatch[1].trim().replace(/\\/g, '');
            const delay = timingMatch[2];
            delayMap.set(routeName, delay);
        }

        const interconnectPattern = new RegExp(VERILOG_COMPONENTS.interconnects.pattern.source, 'g');
        let interconnectMatch;
        
        while ((interconnectMatch = interconnectPattern.exec(this.content)) !== null) {
            const routeName = this.cleanWireName(interconnectMatch[1]);
            const source = this.cleanWireName(interconnectMatch[2]);
            const dest = this.cleanWireName(interconnectMatch[3]);

            const sourceMapped = this.wireMap[source] || source;
            const destMapped = this.wireMap[dest] || dest;
            const delay = delayMap.get(routeName.replace(/\\/g, '')) || VERILOG_COMPONENTS.naming.default_value;
            
            const interconnect = {
                name: `${VERILOG_COMPONENTS.naming.route_prefix}${VERILOG_COMPONENTS.naming.component_separator}${sourceMapped}${VERILOG_COMPONENTS.naming.route_separator}${destMapped}`,
                connections: {
                    input: sourceMapped,
                    output: destMapped
                },
                propagation_delay: delay
            };
            
            this.interconnects.push(interconnect);
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
    const publicDir = path.join(rootDir, '..', CONFIG.directories.public);
    const inputDir = path.join(publicDir, directory);
    const files = fs.readdirSync(inputDir);

    let verilogFile: string | null = null;
    let sdfFile: string | null = null;

    for (const file of files) {
        if (file.endsWith(CONFIG.fileExtensions.verilog)) {
            if (verilogFile && !file.endsWith(CONFIG.fileExtensions.postSynthesis + CONFIG.fileExtensions.verilog)) {
                continue;
            }
            verilogFile = file;
        } else if (file.endsWith(CONFIG.fileExtensions.sdf)) {
            sdfFile = file;
        }
    }

    if (!verilogFile || !sdfFile) {
        return;
    }

    let baseName;
    if (verilogFile.endsWith(CONFIG.fileExtensions.postSynthesis + CONFIG.fileExtensions.verilog)) {
        baseName = sdfFile.replace(CONFIG.fileExtensions.postSynthesis + CONFIG.fileExtensions.sdf, '');
    } else if (sdfFile.endsWith(CONFIG.fileExtensions.postSynthesis + CONFIG.fileExtensions.sdf)) {
        baseName = sdfFile.replace(CONFIG.fileExtensions.sdf, '');
    } else {
        baseName = verilogFile.replace(CONFIG.fileExtensions.verilog, '');
    }

    const verilogPath = path.join(inputDir, verilogFile);
    const sdfPath = path.join(inputDir, sdfFile);
    const schematicsDir = path.join(publicDir, CONFIG.directories.schematics);
    
    if (!fs.existsSync(schematicsDir)) {
        fs.mkdirSync(schematicsDir, { recursive: true });
    }
    
    const outputFile = path.join(schematicsDir, `${baseName}_schematics.json`);
    const parser = new VerilogParser(verilogPath, sdfPath);
    const schematic = parser.parse();
    fs.writeFileSync(outputFile, JSON.stringify(schematic, null, 4));
    console.log(`Generated schematic: ${outputFile}`);
}

// Update main function to use configuration
function main(): void {
    const scriptDir = __dirname;
    const srcDir = scriptDir.includes('dist') ? path.join(scriptDir, '../../src') : scriptDir;
    
    const examples = [
        '1ff_no_rst_VTR',
        '1ff_VTR',
        '2ffs_no_rst_VTR'
    ];
    
    examples.forEach(example => {
        processDirectory(srcDir, path.join(CONFIG.directories.examples, example));
    });
}

if (require.main === module) {
    main();
}

export { VerilogParser, processDirectory };
