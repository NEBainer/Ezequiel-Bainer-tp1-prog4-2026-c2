import { Routes } from '@angular/router';
import { noLogueadoGuard } from './guards/no-logueado-guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home').then((m) => m.Home),
  },
  {
    path: 'auth',
    loadChildren: () => import('./auth/auth.routes'),
    canActivate: [noLogueadoGuard],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
