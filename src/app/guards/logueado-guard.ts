import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from '../services/supabase';

// Perfil, Mis películas: hace falta una cuenta. Sin sesión, va al login.
export const logueadoGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const supabaseS = inject(SupabaseService);

  // getSession en vez del signal: al recargar, el guard corre antes que onAuthStateChange
  const { data } = await supabaseS.Auth.getSession();

  if (data.session !== null) {
    return true;
  }
  return router.parseUrl('/auth/login');
};
