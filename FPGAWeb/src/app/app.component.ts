import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { AppInitializerService } from './services/app-initializer.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, HttpClientModule],
  template: `
    <div class="app-container">
      <router-outlet></router-outlet>
    </div>
  `
})
export class AppComponent implements OnInit {
  constructor(private appInitializer: AppInitializerService) {}

  ngOnInit() {
    // Start background loading of examples
    this.appInitializer.initializeApp();
  }
}