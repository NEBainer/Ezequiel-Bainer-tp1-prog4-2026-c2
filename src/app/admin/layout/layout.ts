import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Auth } from '../../services/auth.service';
import { SECCIONES } from '../../interfaces/RolPersonalizado';

@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="contenedor admin">
      <nav class="menu" aria-label="Administración">
        <p class="titulo">Administración</p>
        <!-- Solo las secciones que el usuario puede ver (el admin, todas) -->
        @for (s of secciones; track s.seccion) {
          @if (authS.puedeVer(s.seccion)) {
            <a [routerLink]="s.seccion" routerLinkActive="activo">{{ s.titulo }}</a>
          }
        }
        @if (authS.rol() === 'admin') {
          <a routerLink="roles" routerLinkActive="activo">🔑 Roles</a>
        }
      </nav>
      <section class="contenido">
        <router-outlet />
      </section>
    </div>
  `,
  styles: `
    .admin {
      display: grid;
      grid-template-columns: 210px 1fr;
      gap: 1.5rem;
      align-items: start;
    }
    .menu {
      position: sticky;
      top: 5rem;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }
    .titulo {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      color: var(--texto-suave);
    }
    .menu a {
      padding: 0.55rem 0.8rem;
      border-radius: var(--radio-chico);
      color: var(--texto);
      text-decoration: none;
    }
    .menu a:hover {
      background: var(--superficie);
    }
    .menu a.activo {
      background: var(--superficie-2);
      box-shadow: inset 3px 0 0 var(--acento);
    }
    .contenido {
      min-width: 0;
    }
    @media (max-width: 800px) {
      .admin {
        grid-template-columns: 1fr;
      }
      .menu {
        position: static;
        flex-direction: row;
        flex-wrap: wrap;
      }
      .titulo {
        width: 100%;
        margin: 0;
      }
    }
  `,
})
export class AdminLayout {
  authS = inject(Auth);
  secciones = SECCIONES;
}
