import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ExamplesLoaderService } from './examples-loader.service';

@Injectable({
  providedIn: 'root'
})
export class AppInitializerService {
  private isLoadingSubject = new BehaviorSubject<boolean>(false);
  isLoading$ = this.isLoadingSubject.asObservable();

  constructor(private examplesLoader: ExamplesLoaderService) {}

  initializeApp(): void {
    // Start loading examples in background
    this.isLoadingSubject.next(true);
    
    this.examplesLoader.loadExamples().subscribe({
      next: (examples) => {
        console.log('Examples loaded successfully:', examples.length);
        this.isLoadingSubject.next(false);
      },
      error: (error) => {
        console.error('Failed to load examples:', error);
        this.isLoadingSubject.next(false);
      }
    });
  }
}