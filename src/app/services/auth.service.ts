import { inject, Service, signal, WritableSignal } from '@angular/core';
import { User } from '@supabase/supabase-js';
import { SupabaseService } from './supabase';
import { DbService } from './db.service';
import { Credenciales, Rol, Usuario } from '../interfaces/Usuario';

@Service()
export class Auth {
  private supabaseS = inject(SupabaseService);
  private dbS = inject(DbService);

  public usuarioActual: WritableSignal<User | null> = signal<User | null>(null);

  // Datos del registro (nombre, fecha de nacimiento, etc.). Se usan para la edad y para las reseñas.
  public perfil = signal<Usuario | null>(null);

  constructor() {
    // Se dispara al abrir la app (sesión guardada), al registrarse, loguearse y cerrar sesión.
    // No navega: un visitante sin sesión puede recorrer la cartelera y comprar como anónimo.
    this.supabaseS.Auth.onAuthStateChange((event, session) => {
      this.usuarioActual.set(session?.user ?? null);

      if (session?.user) {
        // setTimeout: Supabase recomienda no esperar otras llamadas dentro de este callback
        setTimeout(() => this.cargarPerfil(), 0);
      } else {
        this.perfil.set(null);
      }
    });
  }

  // Se puede pasar el id cuando el signal todavía no se cargó (al recargar la página)
  async cargarPerfil(id = this.usuarioActual()?.id) {
    if (id) {
      this.perfil.set(await this.dbS.traerPerfil(id));
    }
  }

  // El rol está en app_metadata: solo se asigna desde el dashboard, el usuario no lo puede cambiar.
  // Sin rol asignado = cliente. Esto es solo para la UI; la seguridad real está en las políticas RLS.
  public rol(): Rol | null {
    const usuario = this.usuarioActual();
    if (!usuario) {
      return null;
    }
    return (usuario.app_metadata['rol'] as Rol) ?? 'cliente';
  }

  // Edad en años cumplidos según la fecha de nacimiento del perfil
  public edad(): number | null {
    const perfil = this.perfil();
    if (!perfil) {
      return null;
    }
    const hoy = new Date();
    const [anio, mes, dia] = perfil.fecha_nacimiento.split('-').map(Number);
    let edad = hoy.getFullYear() - anio;
    if (hoy.getMonth() + 1 < mes || (hoy.getMonth() + 1 === mes && hoy.getDate() < dia)) {
      edad--;
    }
    return edad;
  }

  public async registrar(credenciales: Credenciales) {
    const { data, error } = await this.supabaseS.Auth.signUp({
      email: credenciales.email,
      password: credenciales.password,
    });

    return { data, error };
  }

  async loguear(credenciales: Credenciales) {
    const { error } = await this.supabaseS.Auth.signInWithPassword({
      email: credenciales.email,
      password: credenciales.password,
    });

    return { error };
  }

  async cerrarSesion() {
    await this.supabaseS.Auth.signOut();
  }
}
