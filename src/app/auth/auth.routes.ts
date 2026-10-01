import { Routes } from '@angular/router';

const authRoutes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./login/login').then((m) => m.Login),
  },
  {
    path: 'registro',
    loadComponent: () => import('./registro/registro').then((m) => m.Registro),
  },
];

export default authRoutes;
