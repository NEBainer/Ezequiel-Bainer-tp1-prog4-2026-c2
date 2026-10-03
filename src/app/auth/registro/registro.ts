import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../services/auth.service';
import { DbService } from '../../services/db.service';
import { RegistroUsuario } from '../../interfaces/Usuario';
import { SelectorFecha } from '../../components/selector-fecha/selector-fecha';

@Component({
  imports: [ReactiveFormsModule, RouterLink, SelectorFecha],
  selector: 'app-registro',
  styleUrl: './registro.css',
  templateUrl: './registro.html',
})
export class Registro {
  authS = inject(Auth);
  dbS = inject(DbService);
  routerS = inject(Router);

  error = signal<string | null>(null);
  enviando = signal(false);

  tiposSangre = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', '0+', '0-'];
  coloresOjos = ['Marrón', 'Negro', 'Verde', 'Azul', 'Gris', 'Miel', 'Otro'];

  formulario = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(6)]),
    nombre: new FormControl('', Validators.required),
    apellido: new FormControl('', Validators.required),
    fecha_nacimiento: new FormControl('', [Validators.required, this.fechaPasada()]),
    tipo_sangre: new FormControl('', Validators.required),
    color_ojos: new FormControl('', Validators.required),
    dias_vacaciones: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(0),
      Validators.max(365),
      Validators.pattern(/^[0-9]+$/),
    ]),
  });

  // Validador propio: la fecha de nacimiento no puede ser futura ni anterior a 1900
  fechaPasada(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null; // de "vacío" se encarga Validators.required
      }
      const fecha = new Date(control.value);
      // isNaN: el selector de fecha escribe 'invalida' si la fecha no existe (ej. 31/2)
      if (isNaN(fecha.getTime()) || fecha > new Date() || fecha.getFullYear() < 1900) {
        return { fechaPasada: true };
      }
      return null;
    };
  }

  // getters
  get email() {
    return this.formulario.get('email');
  }
  get password() {
    return this.formulario.get('password');
  }
  get nombre() {
    return this.formulario.get('nombre');
  }
  get apellido() {
    return this.formulario.get('apellido');
  }
  get fechaNacimiento() {
    return this.formulario.controls.fecha_nacimiento;
  }
  get tipoSangre() {
    return this.formulario.get('tipo_sangre');
  }
  get colorOjos() {
    return this.formulario.get('color_ojos');
  }
  get diasVacaciones() {
    return this.formulario.get('dias_vacaciones');
  }

  async accion() {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.error.set(null);
    this.enviando.set(true);
    const { email, password, ...perfil } = this.formulario.value as RegistroUsuario;

    // 1) Cuenta en Supabase Auth
    const { data, error } = await this.authS.registrar({ email, password });

    if (error || !data.user) {
      this.error.set('No se pudo crear la cuenta. ¿El email ya está registrado?');
      this.enviando.set(false);
      return;
    }

    // Sin sesión no se puede insertar el perfil (la política RLS pide auth.uid() = id).
    // Pasa si en Supabase está activada la confirmación de email.
    if (!data.session) {
      this.error.set('Revisá tu email para confirmar la cuenta.');
      this.enviando.set(false);
      return;
    }

    // 2) Perfil en la tabla "usuarios", con el mismo id que la cuenta.
    // Son dos operaciones separadas: Supabase no hace rollback si la segunda falla.
    const respuesta = await this.dbS.crearUsuario({ id: data.user.id, ...perfil });

    this.enviando.set(false);

    if (respuesta.error) {
      this.error.set('La cuenta se creó, pero no se pudieron guardar tus datos.');
      return;
    }

    this.routerS.navigateByUrl('/');
  }
}
