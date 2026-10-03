import { Routes } from '@angular/router';
import { noLogueadoGuard } from './guards/no-logueado-guard';
import { logueadoGuard } from './guards/logueado-guard';
import { rolGuard } from './guards/rol-guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home').then((m) => m.Home),
  },
  {
    path: 'pelicula/:id',
    loadComponent: () => import('./pages/pelicula/pelicula').then((m) => m.PeliculaDetalle),
  },
  {
    // Sin guard: se puede comprar siendo anónimo (la elección se hace dentro de la compra)
    path: 'comprar/:funcionId',
    loadComponent: () => import('./pages/compra/compra').then((m) => m.Compra),
  },
  {
    path: 'perfil',
    loadComponent: () => import('./pages/perfil/perfil').then((m) => m.Perfil),
    canActivate: [logueadoGuard],
  },
  {
    path: 'mis-peliculas',
    loadComponent: () => import('./pages/mis-peliculas/mis-peliculas').then((m) => m.MisPeliculas),
    canActivate: [logueadoGuard],
  },
  {
    path: 'validar',
    loadComponent: () => import('./pages/validar/validar').then((m) => m.Validar),
    canActivate: [rolGuard('empleado', 'admin')],
  },
  {
    path: 'admin',
    loadChildren: () => import('./admin/admin.routes'),
    canActivate: [rolGuard('admin')],
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
