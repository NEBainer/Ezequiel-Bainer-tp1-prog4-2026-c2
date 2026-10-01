import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../services/auth.service';
import { Credenciales } from '../../interfaces/Usuario';

@Component({
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'app-login',
  styleUrl: './login.css',
  templateUrl: './login.html',
})
export class Login {
  authS = inject(Auth);
  routerS = inject(Router);

  error = signal<string | null>(null);

  formulario = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', Validators.required),
  });

  get email() {
    return this.formulario.get('email');
  }
  get password() {
    return this.formulario.get('password');
  }

  async accion() {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const { error } = await this.authS.loguear(this.formulario.value as Credenciales);

    if (error) {
      this.error.set('Email o contraseña incorrectos.');
    } else {
      this.routerS.navigateByUrl('/');
    }
  }
}
