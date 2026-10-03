import { Routes } from '@angular/router';

// Rutas del panel de administración. Todas cuelgan del layout (menú lateral + router-outlet).
const adminRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layout/layout').then((m) => m.AdminLayout),
    children: [
      { path: '', redirectTo: 'reportes', pathMatch: 'full' },
      {
        path: 'reportes',
        loadComponent: () => import('./reportes/reportes').then((m) => m.Reportes),
      },
      {
        path: 'peliculas',
        loadComponent: () => import('./peliculas/peliculas').then((m) => m.AdminPeliculas),
      },
      {
        path: 'funciones',
        loadComponent: () => import('./funciones/funciones').then((m) => m.AdminFunciones),
      },
      {
        path: 'salas',
        loadComponent: () => import('./salas/salas').then((m) => m.AdminSalas),
      },
      {
        path: 'candy',
        loadComponent: () => import('./candy/candy').then((m) => m.AdminCandy),
      },
      {
        path: 'precios',
        loadComponent: () => import('./precios/precios').then((m) => m.AdminPrecios),
      },
      {
        path: 'log',
        loadComponent: () => import('./log/log').then((m) => m.AdminLog),
      },
    ],
  },
];

export default adminRoutes;
