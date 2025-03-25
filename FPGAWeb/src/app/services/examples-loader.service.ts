import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { marked } from 'marked'; // Add this import
import { Design, DesignMetadata, VisualizationState } from '../models/design.model';
import { VerilogParser } from './parser';
import { DesignService } from './design.service'; // Add this import

interface FileMapping {
  [key: string]: {
    verilog: string;
    sdf: string;
    readme: string;
    json: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ExamplesLoaderService {
  private readonly basePath = '/public/verilog_post_synthesis_examples';
  private readonly knownDirectories = [
    '1ff_no_rst_VTR',
    '1ff_VTR',
    '2ffs_no_rst_VTR',
    '2ffs_VTR',
    '5ffs_VTR',
    'FULLLUT_VTR',
    'LUT_VTR'
  ];

  constructor(
    private http: HttpClient,
    private designService: DesignService  // Add this
  ) {
    console.log('ExamplesLoaderService initialized');
  }

  private handleHttpError(error: HttpErrorResponse, context: string): void {
    console.error(`HTTP Error in ${context}:`);
    console.error(`Status: ${error.status}`);
    console.error(`Status Text: ${error.statusText}`);
    console.error(`URL: ${error.url}`);
    if (error.error instanceof Error) {
      console.error('Error:', error.error.message);
    } else {
      console.error('Error:', error.error);
    }
  }

  loadExamples(): Observable<Design[]> {
    console.log('Starting loadExamples() with known directories');
    
    const loadedDesignIds = new Set<string>();
    
    // Process directories in reverse order so they end up in correct order
    const designObservables = [...this.knownDirectories].reverse().map(dir => {
      console.log(`Creating observable for directory: ${dir}`);
      return this.loadDesign(dir).pipe(
        tap(design => {
          if (design && !loadedDesignIds.has(design.id)) {
            loadedDesignIds.add(design.id);
            // Add to end to maintain order of knownDirectories
            this.designService.addDesign(design, false);
            console.log(`Successfully loaded design from ${dir}`);
          } else {
            console.warn(`Skipped duplicate or failed design from ${dir}`);
          }
        })
      );
    });

    return forkJoin(designObservables).pipe(
      map(designs => designs.filter((design): design is Design => 
        design !== null && !loadedDesignIds.has(design.id)
      ))
    );
  }

  private loadDesign(dir: string): Observable<Design | null> {
    console.log(`Loading design from directory: ${dir}`);
    
    const fileMapping: FileMapping = {
      '1ff_no_rst_VTR': {
        verilog: 'FF1_norst_post_synthesis.v',
        sdf: 'FF1_norst_post_synthesis.sdf',
        readme: 'Readme.md',
        json: 'parse_result.json'
      },
      '1ff_VTR': {
        verilog: 'FF1_post_synthesis.v',
        sdf: 'FF1_post_synthesis.sdf',
        readme: 'Readme.md',
        json: 'parse_result.json'
      },
      '2ffs_no_rst_VTR': {
        verilog: 'FF2_norst_post_synthesis.v',
        sdf: 'FF2_norst_post_synthesis.sdf',
        readme: 'Readme.md',
        json: 'parse_result.json'
      },
      '2ffs_VTR': {
        verilog: 'FF2_post_synthesis.v',
        sdf: 'FF2_post_synthesis.sdf',
        readme: 'Readme.md',
        json: 'parse_result.json'
      },
      '5ffs_VTR': {
        verilog: 'RisingEdge_DFlipFlop_AsyncResetHigh_post_synthesis.v',
        sdf: 'RisingEdge_DFlipFlop_AsyncResetHigh_post_synthesis.sdf',
        readme: 'Readme.md',
        json: 'parse_result.json'
      },
      'FULLLUT_VTR': {
        verilog: 'FULLLUT_post_synthesis.v',
        sdf: 'FULLLUT_post_synthesis.sdf',
        readme: 'Readme.md',
        json: 'parse_result.json'
      },
      'LUT_VTR': {
        verilog: 'LUT_post_synthesis.v',
        sdf: 'LUT_post_synthesis.sdf',
        readme: 'Readme.md',
        json: 'parse_result.json'
      }
    };

    const defaultFiles = {
      verilog: 'post_synthesis.v',
      sdf: 'timing.sdf',
      readme: 'README.md',
      json: 'parse_result.json'
    };

    const files = fileMapping[dir] || defaultFiles;

    console.log(`Attempting to load files:`, files);

    const requests = {
      verilog: this.http.get(`${this.basePath}/${dir}/${files.verilog}`, { 
        responseType: 'text',
        headers: {'Content-Type': 'text/plain'}
      }),
      sdf: this.http.get(`${this.basePath}/${dir}/${files.sdf}`, { 
        responseType: 'text',
        headers: {'Content-Type': 'text/plain'}
      }),
      readme: this.http.get(`${this.basePath}/${dir}/${files.readme}`, { 
        responseType: 'text',
        headers: {'Content-Type': 'text/plain'}
      }).pipe(
        map(content => {
          // Configure marked options for proper line breaks
          marked.setOptions({
            breaks: true, // Convert line breaks to <br>
            gfm: true    // Enable GitHub Flavored Markdown
          });
          
          // Convert markdown to HTML synchronously
          return marked.parse(content);
        }),
        catchError(() => of('<p>No description available</p>'))
      )
    };

    return forkJoin(requests).pipe(
      map(({ verilog, sdf, readme }) => {
        const parser = new VerilogParser();
        parser.loadContent(verilog, sdf);
        const parsedContent = parser.parse();
        
        // Create metadata object
        const metadata: DesignMetadata = {
          name: this.formatName(dir),
          description: readme as string,
          visualizationState: {
            clockFrequency: 1000000
          }
        };

        // Create design object without metadata property
        const design: Design = {
          id: `example_${dir}`,
          name: metadata.name,
          description: metadata.description,
          files: [
            files.verilog,
            files.sdf,
            `${dir}_parsed.json`,
            'metadata.json'
          ],
          verilogContent: verilog,
          sdfContent: sdf,
          jsonContent: parsedContent,
          visualizationState: metadata.visualizationState
        };

        // Add the design to the service
        this.designService.addDesign(design);
        
        return design;
      }),
      tap(design => console.log(`Successfully loaded design: ${design.name}`)),
      catchError(error => {
        console.error(`Error loading design ${dir}:`, error);
        return of(null);
      })
    );
  }

  private formatName(dir: string): string {
    return dir
      .replace(/_/g, ' ')
      .replace(/VTR$/, '')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
}
