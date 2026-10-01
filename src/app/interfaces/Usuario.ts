// Lo que se manda a Supabase Auth para loguearse
export interface Credenciales {
  email: string;
  password: string;
}

// Fila de la tabla "usuarios" (los nombres coinciden con las columnas)
export interface Usuario {
  id: string;
  nombre: string;
  apellido: string;
  fecha_nacimiento: string; // 'AAAA-MM-DD'
  tipo_sangre: string;
  color_ojos: string;
  dias_vacaciones: number;
}

// Lo que se inserta en "usuarios" después del signUp (created_at lo pone la base)
export type UsuarioPorCrear = Usuario;

// Todo lo que junta el formulario de registro
export interface RegistroUsuario extends Credenciales, Omit<Usuario, 'id'> {}

export type Rol = 'admin' | 'empleado' | 'cliente';
