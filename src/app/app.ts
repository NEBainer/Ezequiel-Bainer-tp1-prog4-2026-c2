import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { Auth } from './services/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  authS = inject(Auth);
  routerS = inject(Router);

  async cerrarSesion() {
    await this.authS.cerrarSesion();
    this.routerS.navigateByUrl('/');
  }
}
