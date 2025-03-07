import { Routes } from '@angular/router';

export const routes: Routes = [
  { 
    path: '', 
    loadComponent: () => import('./home/home.component').then(m => m.HomeComponent) 
  },
  { 
    path: 'fpga-visualization', 
    loadComponent: () => import('./fpga-visualization/fpga-visualization.component').then(m => m.FpgaVisualizationComponent) 
  },
  { 
    path: 'teacher', 
    loadComponent: () => import('./teacher-interface/teacher-interface.component').then(m => m.TeacherInterfaceComponent) 
  },
  { 
    path: '**', 
    redirectTo: '' 
  }
];
