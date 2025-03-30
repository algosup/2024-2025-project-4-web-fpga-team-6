import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { AppInitializerService } from './services/app-initializer.service';
import { ThemeService } from './fpga-visualization/components/visualization/theme/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, HttpClientModule],
  template: `
    <div class="app-container">
      <router-outlet></router-outlet>
    </div>
  `,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  constructor(
    private appInitializer: AppInitializerService,
    private themeService: ThemeService
  ) {}

  ngOnInit() {
    // Start background loading of examples
    this.appInitializer.initializeApp();

    // Apply the theme to the entire application
    this.themeService.applyTheme();
  }
}