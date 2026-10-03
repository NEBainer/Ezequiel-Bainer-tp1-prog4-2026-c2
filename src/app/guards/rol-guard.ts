import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from '../services/supabase';
import { Rol } from '../interfaces/Usuario';

// Fábrica de guards por rol: rolGuard('admin'), rolGuard('admin', 'empleado').
// Es solo UX (esconde pantallas): lo que protege los datos son las políticas RLS.
export function rolGuard(...permitidos: Rol[]): CanActivateFn {
  return async () => {
    const router = inject(Router);
    const supabaseS = inject(SupabaseService);

    const { data } = await supabaseS.Auth.getSession();
    const rol = data.session?.user.app_metadata['rol'] as Rol | undefined;

    if (rol && permitidos.includes(rol)) {
      return true;
    }
    return router.parseUrl('/');
  };
}
