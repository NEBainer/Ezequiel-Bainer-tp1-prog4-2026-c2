import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { LogService } from '../../services/log.service';
import { Log } from '../../interfaces/Log';

// Log de actividad: quién creó funciones, modificó precios, validó QRs, etc.
@Component({
  selector: 'app-admin-log',
  imports: [DatePipe],
  template: `
    <header class="encabezado">
      <div>
        <h1>Actividad</h1>
        <p class="suave">Registro de acciones de administradores y empleados, con fecha y hora.</p>
      </div>
      <input type="search" placeholder="Filtrar por persona o acción…" (input)="filtro.set($any($event.target).value)" aria-label="Filtrar actividad" />
    </header>

    <div class="tabla-scroll">
      <table>
        <thead>
          <tr><th>Fecha y hora</th><th>Quién</th><th>Acción</th><th>Detalle</th></tr>
        </thead>
        <tbody>
          @for (l of filtrados(); track l.id) {
            <tr>
              <td class="fecha">{{ l.created_at | date: 'd/M/yy HH:mm:ss' }}</td>
              <td>{{ l.email }}</td>
              <td><span class="etiqueta">{{ l.accion }}</span></td>
              <td>{{ l.detalle }}</td>
            </tr>
          } @empty {
            <tr><td colspan="4" class="suave">Sin actividad registrada.</td></tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: `
    .fecha {
      white-space: nowrap;
    }
    input {
      max-width: 18rem;
    }
  `,
})
export class AdminLog implements OnInit {
  private logS = inject(LogService);

  logs = signal<Log[]>([]);
  filtro = signal('');

  filtrados = computed(() => {
    const texto = this.filtro().toLowerCase();
    return this.logs().filter((l) =>
      `${l.email} ${l.accion} ${l.detalle}`.toLowerCase().includes(texto),
    );
  });

  async ngOnInit() {
    this.logs.set(await this.logS.traer());
  }
}
