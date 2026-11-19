import { Routes } from '@angular/router';
import { seccionGuard } from '../guards/seccion-guard';
import { rolGuard } from '../guards/rol-guard';

// Rutas del panel de administración. Todas cuelgan del layout (menú lateral + router-outlet).
// Cada sección tiene su guard: el admin entra a todas; el resto, a las que le habiliten sus roles.
const adminRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layout/layout').then((m) => m.AdminLayout),
    children: [
      // Si no tiene "reportes", el guard lo manda a su primera sección
      { path: '', redirectTo: 'reportes', pathMatch: 'full' },
      {
        path: 'reportes',
        loadComponent: () => import('./reportes/reportes').then((m) => m.Reportes),
        canActivate: [seccionGuard('reportes')],
      },
      {
        path: 'peliculas',
        loadComponent: () => import('./peliculas/peliculas').then((m) => m.AdminPeliculas),
        canActivate: [seccionGuard('peliculas')],
      },
      {
        path: 'propuestas',
        loadComponent: () => import('./propuestas/propuestas').then((m) => m.AdminPropuestas),
        canActivate: [seccionGuard('propuestas')],
      },
      {
        path: 'funciones',
        loadComponent: () => import('./funciones/funciones').then((m) => m.AdminFunciones),
        canActivate: [seccionGuard('funciones')],
      },
      {
        path: 'salas',
        loadComponent: () => import('./salas/salas').then((m) => m.AdminSalas),
        canActivate: [seccionGuard('salas')],
      },
      {
        path: 'candy',
        loadComponent: () => import('./candy/candy').then((m) => m.AdminCandy),
        canActivate: [seccionGuard('candy')],
      },
      {
        path: 'precios',
        loadComponent: () => import('./precios/precios').then((m) => m.AdminPrecios),
        canActivate: [seccionGuard('precios')],
      },
      {
        path: 'log',
        loadComponent: () => import('./log/log').then((m) => m.AdminLog),
        canActivate: [seccionGuard('log')],
      },
      {
        // Configurar roles no se delega: es solo del admin
        path: 'roles',
        loadComponent: () => import('./roles/roles').then((m) => m.AdminRoles),
        canActivate: [rolGuard('admin')],
      },
    ],
  },
];

export default adminRoutes;
