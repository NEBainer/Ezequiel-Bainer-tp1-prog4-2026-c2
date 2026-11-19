import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from '../services/supabase';
import { RolesService } from '../services/roles.service';
import { Seccion } from '../interfaces/RolPersonalizado';

// Fábrica de guards por sección del panel: seccionGuard('reportes').
// Sin argumento, alcanza con tener alguna sección (es el guard de la entrada a /admin).
// El admin pasa siempre. Es solo UX: los datos los protegen las políticas RLS de 06_roles.sql.
export function seccionGuard(seccion?: Seccion): CanActivateFn {
  return async () => {
    const router = inject(Router);
    const supabaseS = inject(SupabaseService);
    const rolesS = inject(RolesService);

    const { data } = await supabaseS.Auth.getSession();
    const usuario = data.session?.user;
    if (!usuario) {
      return router.parseUrl('/auth/login');
    }
    if (usuario.app_metadata['rol'] === 'admin') {
      return true;
    }

    // Se consulta la base (en vez de leer misSecciones) porque al recargar la página
    // el guard corre antes de que se carguen las secciones del usuario.
    const secciones = await rolesS.traerSecciones(usuario.id);
    const permitido = seccion ? secciones.includes(seccion) : secciones.length > 0;

    if (permitido) {
      return true;
    }
    // Si tiene otras secciones, lo manda a la primera; si no tiene ninguna, al inicio
    return secciones.length > 0 ? router.parseUrl(`/admin/${secciones[0]}`) : router.parseUrl('/');
  };
}
