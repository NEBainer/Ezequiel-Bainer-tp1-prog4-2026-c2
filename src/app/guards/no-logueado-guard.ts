import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from '../services/supabase';

// Si ya hay sesión, no tiene sentido entrar a login/registro: vuelve al inicio.
export const noLogueadoGuard: CanActivateFn = async (route, state) => {
  const router = inject(Router);
  const supabaseS = inject(SupabaseService);

  // Se consulta la sesión (en vez de leer usuarioActual) porque al recargar la página
  // el guard corre antes de que onAuthStateChange llegue a cargar el signal.
  const { data } = await supabaseS.Auth.getSession();

  if (data.session === null) {
    return true;
  }

  return router.parseUrl('/');
};
