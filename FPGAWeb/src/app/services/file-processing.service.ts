import { Injectable } from '@angular/core';
import { VerilogParser } from './parser';

@Injectable({
  providedIn: 'root'
})
export class FileProcessingService {
  
  async processFiles(verilogFile: File, sdfFile: File): Promise<string> {
    try {
      // Read files as text
      const verilogContent = await verilogFile.text();
      const sdfContent = await sdfFile.text();
      
      // Create parser instance with file contents directly
      const parser = new VerilogParser();
      await parser.loadContent(verilogContent, sdfContent);
      
      // Parse and get schematic
      const schematic = await parser.parse();
      return JSON.stringify(schematic, null, 2);
    } catch (error) {
      console.error('Error processing files:', error);
      throw error;
    }
  }

  downloadJson(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}