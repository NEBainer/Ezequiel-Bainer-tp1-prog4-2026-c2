import { inject, Service, signal, WritableSignal } from '@angular/core';
import { User } from '@supabase/supabase-js';
import { SupabaseService } from './supabase';
import { Credenciales, Rol } from '../interfaces/Usuario';

@Service()
export class Auth {
  private supabaseS = inject(SupabaseService);

  public usuarioActual: WritableSignal<User | null> = signal<User | null>(null);

  constructor() {
    // Se dispara al abrir la app (sesión guardada), al registrarse, loguearse y cerrar sesión.
    // No navega: un visitante sin sesión puede recorrer la cartelera y comprar como anónimo.
    this.supabaseS.Auth.onAuthStateChange((event, session) => {
      this.usuarioActual.set(session?.user ?? null);
    });
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
