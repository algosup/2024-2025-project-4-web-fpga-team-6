import { Injectable } from '@angular/core';
import { VerilogParser } from './parser';

/**
 * Service responsible for processing Verilog and SDF files
 * and generating JSON schematics.
 */
@Injectable({
  providedIn: 'root'
})
export class FileProcessingService {
  /**
   * Process Verilog and SDF files to generate a JSON schematic.
   * @param verilogFile - The uploaded Verilog file
   * @param sdfFile - The uploaded SDF file
   * @returns A Promise resolving to the JSON string representation of the parsed schematic
   */
  async processFiles(verilogFile: File, sdfFile: File): Promise<string> {
    try {
      // Read files as text with proper encoding
      const verilogContent = await this.readFileAsText(verilogFile);
      const sdfContent = await this.readFileAsText(sdfFile);
      
      console.log('Verilog content preview:', verilogContent.substring(0, 100));
      console.log('SDF content preview:', sdfContent.substring(0, 100));
      
      // Create parser instance and parse the content
      const parser = new VerilogParser();
      parser.loadContent(verilogContent, sdfContent);
      
      // Parse the files
      const schematic = parser.parse();
      
      // Convert to JSON string
      return JSON.stringify(schematic, null, 2);
    } catch (error) {
      console.error('Error processing files:', error);
      throw new Error(`Failed to process files: ${error}`);
    }
  }

  /**
   * Reads a file as text with proper encoding handling
   * @param file - The file to read
   * @returns A Promise resolving to the file content as string
   */
  public async readFileAsText(file: File): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result === 'string') {
          resolve(result);
        } else {
          reject(new Error('File content is not a string'));
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  /**
   * Downloads a JSON file with the provided content and filename.
   * @param content - The JSON content string
   * @param filename - The name to be given to the downloaded file
   */
  downloadJson(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
}