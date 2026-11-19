import { inject, Service, signal } from '@angular/core';
import { SupabaseService } from './supabase';
import { Usuario } from '../interfaces/Usuario';
import { AsignacionRol, RolPersonalizado, RolPersonalizadoPorCrear, Seccion } from '../interfaces/RolPersonalizado';

// Roles configurables (R-45). Crear, editar y asignar roles es solo del admin (lo controla la RLS).
@Service()
export class RolesService {
  private supS = inject(SupabaseService);

  // Secciones del panel que habilitan los roles del usuario logueado. Es para la UI (menú y links);
  // lo que de verdad protege los datos son las políticas de 06_roles.sql.
  public misSecciones = signal<Seccion[]>([]);

  // Junta las secciones de todos los roles del usuario (sin repetir).
  // La RLS de "usuario_roles" ya devuelve solo las filas del propio usuario.
  async traerSecciones(usuarioId: string) {
    const { data } = await this.supS.Sup.from('usuario_roles')
      .select('roles(secciones)')
      .eq('usuario_id', usuarioId);

    const secciones = new Set<Seccion>();
    for (const fila of (data ?? []) as unknown as { roles: { secciones: Seccion[] } }[]) {
      fila.roles.secciones.forEach((s) => secciones.add(s));
    }
    return [...secciones];
  }

  async cargarMisSecciones(usuarioId: string | undefined) {
    this.misSecciones.set(usuarioId ? await this.traerSecciones(usuarioId) : []);
  }

  // ---------- ABM de roles (admin) ----------

  async traerRoles() {
    const { data } = await this.supS.Sup.from('roles').select('*').order('nombre');
    return (data ?? []) as RolPersonalizado[];
  }

  async crear(rol: RolPersonalizadoPorCrear) {
    const { error } = await this.supS.Sup.from('roles').insert(rol);
    return { error };
  }

  async modificar(id: number, cambios: RolPersonalizadoPorCrear) {
    const { error } = await this.supS.Sup.from('roles').update(cambios).eq('id', id);
    return { error };
  }

  // Las asignaciones se borran solas (on delete cascade)
  async borrar(id: number) {
    const { error } = await this.supS.Sup.from('roles').delete().eq('id', id);
    return { error };
  }

  // ---------- Asignaciones (admin) ----------

  async traerAsignaciones() {
    const { data } = await this.supS.Sup.from('usuario_roles').select('*');
    return (data ?? []) as AsignacionRol[];
  }

  // Para elegir a quién darle el rol (la RLS de "usuarios" deja al admin leer todos)
  async traerUsuarios() {
    const { data } = await this.supS.Sup.from('usuarios').select('*').order('apellido');
    return (data ?? []) as Usuario[];
  }

  async asignar(asignacion: AsignacionRol) {
    const { error } = await this.supS.Sup.from('usuario_roles').insert(asignacion);
    return { error };
  }

  async quitar(asignacion: AsignacionRol) {
    const { error } = await this.supS.Sup.from('usuario_roles')
      .delete()
      .eq('usuario_id', asignacion.usuario_id)
      .eq('rol_id', asignacion.rol_id);
    return { error };
  }
}
