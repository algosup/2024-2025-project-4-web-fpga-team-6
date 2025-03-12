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
    private wireMap: { [key: string]: { [key: string]: string } } = {};

    getName(cellType: string, originalName: string): string {
        if (this.nameMap[originalName]) {
            return this.nameMap[originalName];
        }

        if (!this.counters[cellType]) {
            this.counters[cellType] = 0;
        }

        this.counters[cellType]++;
        const newName = `${cellType.toLowerCase()}_${this.counters[cellType]}`;
        this.nameMap[originalName] = newName;

        return newName;
    }

    getWireName(cellName: string, port: string): string {
        for (const [origName, newName] of Object.entries(this.nameMap)) {
            if (newName === cellName) {
                return this.wireMap[origName]?.[port] || `${cellName}_${port}`;
            }
        }
        return `${cellName}_${port}`;
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
    private wireAssignments: { [key: string]: string } = {};
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

        // Parse ports and their assignments
        const portAssignments: { [key: string]: string } = {};

        // First pass: collect port names
        let portMatch;
        const portPattern = new RegExp(VERILOG_COMPONENTS.module.ports_pattern.source, 'g');
        while ((portMatch = portPattern.exec(this.content)) !== null) {
            const [, portType, portName] = portMatch;
            const cleanName = portName.replace(/\\/g, '');
            const extName = `ext_${portType}_${cleanName}`;
            this.externalWires.push({
                name: extName,
                type: portType
            });
            portAssignments[cleanName] = extName;
        }

        // Second pass: collect assignments
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
        // Extract DFF timing
        const dffPattern = VERILOG_COMPONENTS.cells.DFF.timing_pattern;
        const dffMatch = this.sdfContent.match(dffPattern);

        if (dffMatch) {
            this.delays['q_update_delay'] = dffMatch[1];
            this.delays['d_stability_delay'] = dffMatch[2];
        }

        // Extract interconnect delays
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
            while ((cellMatch = (cellInfo as any).pattern.exec(this.content)) !== null) {
                const match = cellMatch as RegExpExecArray; // Type assertion to ensure non-null
                const instanceName = match[1];
                const cellName = this.cellNamer.getName(cellType, instanceName);

                // Create connections using consistent wire names
                const ports: { [key: string]: string } = {};
                (cellInfo as any).ports.forEach((portName: string, index: number) => {
                    if (index + 2 < match.length) {
                        const wireName = match[index + 2].trim();
                        const mappedName = `${cellName}_${portName}`;
                        ports[portName] = mappedName;
                        this.wireMap[wireName] = mappedName;
                    }
                });

                const component: Cell = {
                    type: cellType,
                    name: cellName,
                    connections: ports
                };

                if (cellType === 'DFF') {
                    component.D_stability_delay = this.delays['d_stability_delay'] || '0';
                    component.Q_update_delay = this.delays['q_update_delay'] || '0';
                }

                this.cells.push(component);
            }
        }
    }

    private parseInterconnects(): void {
        let interconnectMatch;
        while ((interconnectMatch = VERILOG_COMPONENTS.interconnects.pattern.exec(this.content)) !== null) {
            const routeName = this.cleanWireName(interconnectMatch[1]);
            const source = this.cleanWireName(interconnectMatch[2]);
            const dest = this.cleanWireName(interconnectMatch[3]);

            const sourceMapped = this.wireMap[source] || source;
            const destMapped = this.wireMap[dest] || dest;

            // Get the delay from the parsed SDF timing data
            const delay = this.delays[routeName] || '0';

            this.interconnects.push({
                name: `route_${sourceMapped}_TO_${destMapped}`,
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
    // List all files in the directory
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
        console.log(`Skipping ${directory}: Missing required files`);
        return;
    }

    // Process each Verilog/SDF pair
    let baseName: string;
    if (verilogFile.endsWith('_post_synthesis.v')) {
        baseName = sdfFile.replace('_post_synthesis.sdf', '');
    } else if (sdfFile.endsWith('_post_synthesis.sdf')) {
        baseName = sdfFile.replace('.sdf', '');
    } else {
        baseName = verilogFile.replace('.v', '');
    }

    // Create full paths
    const verilogPath = path.join(inputDir, verilogFile);
    const sdfPath = path.join(inputDir, sdfFile);
    
    // Create schematics directory if it doesn't exist
    const schematicsDir = path.join(publicDir, 'schematics');
    if (!fs.existsSync(schematicsDir)) {
        fs.mkdirSync(schematicsDir, { recursive: true });
    }
    
    const outputFile = path.join(schematicsDir, `${baseName}_schematics.json`);

    // Print only the foldername without carriage return
    process.stdout.write(`Processing ${path.basename(directory)}...`);

    // Parse and save schematic
    const parser = new VerilogParser(verilogPath, sdfPath);
    const schematic = parser.parse();

    fs.writeFileSync(outputFile, JSON.stringify(schematic, null, 4));
    console.log('DONE!');

    // print the output file to open it
    console.log(`Output file: ${outputFile}\n`);
}

function main(): void {
    // Get the script's directory and navigate to the source directory
    const scriptDir = __dirname;
    const srcDir = scriptDir.includes('dist') ? path.join(scriptDir, '../../src') : scriptDir;
    
    // select a project directory
    const projectDir = 'verilog_post_synthesis_examples/1ff_no_rst_VTR';
    processDirectory(srcDir, projectDir);
    
}

if (require.main === module) {
    main();
}

export { VerilogParser, processDirectory };
