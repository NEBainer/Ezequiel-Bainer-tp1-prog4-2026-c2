import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { PropuestasService } from '../../services/propuestas.service';
import { LogService } from '../../services/log.service';
import { Propuesta } from '../../interfaces/Propuesta';

// Propuestas de los clientes: el admin las acepta (va al alta de película precargada) o las rechaza
@Component({
  selector: 'app-admin-propuestas',
  imports: [DatePipe],
  template: `
    <header class="encabezado">
      <div>
        <h1>Propuestas</h1>
        <p class="suave">Películas que piden los clientes. Al aceptar una, se abre el alta con sus datos.</p>
      </div>
    </header>

    @if (mensaje()) {
      <p class="error">{{ mensaje() }}</p>
    }

    <div class="tabla-scroll">
      <table>
        <thead>
          <tr><th>Fecha</th><th>Película</th><th>Por qué la quieren</th><th>Estado</th><th></th></tr>
        </thead>
        <tbody>
          @for (p of ordenadas(); track p.id) {
            <tr>
              <td class="fecha">{{ p.created_at | date: 'd/M/yy' }}</td>
              <td>
                <strong>{{ p.titulo }}</strong>
                <br /><small class="suave">{{ p.descripcion }}</small>
              </td>
              <td>{{ p.motivo }}</td>
              <td><span class="etiqueta">{{ p.estado }}</span></td>
              <td class="acciones-fila">
                @if (p.estado === 'pendiente') {
                  <button class="btn-chico btn-primario" (click)="aceptar(p)">Aceptar</button>
                  <button class="btn-chico btn-peligro" (click)="rechazar(p)">Rechazar</button>
                }
              </td>
            </tr>
          } @empty {
            <tr><td colspan="5" class="suave">No hay propuestas todavía.</td></tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: `
    .fecha {
      white-space: nowrap;
    }
    .acciones-fila {
      white-space: nowrap;
    }
  `,
})
export class AdminPropuestas implements OnInit {
  private propuestasS = inject(PropuestasService);
  private logS = inject(LogService);
  private router = inject(Router);

  propuestas = signal<Propuesta[]>([]);
  mensaje = signal<string | null>(null);

  // Primero las pendientes (las que hay que responder); el resto queda como historial
  ordenadas = computed(() => [
    ...this.propuestas().filter((p) => p.estado === 'pendiente'),
    ...this.propuestas().filter((p) => p.estado !== 'pendiente'),
  ]);

  async ngOnInit() {
    await this.cargar();
  }

  async cargar() {
    this.propuestas.set(await this.propuestasS.traerTodas());
  }

  async aceptar(p: Propuesta) {
    const { error } = await this.propuestasS.cambiarEstado(p.id, 'aceptada');
    if (error) {
      this.mensaje.set('No se pudo aceptar la propuesta.');
      return;
    }
    await this.logS.registrar('Aceptó una propuesta', p.titulo);
    // El id viaja como query param: Películas lo recibe como input() y abre el alta precargada
    await this.router.navigate(['/admin/peliculas'], { queryParams: { propuesta: p.id } });
  }

  async rechazar(p: Propuesta) {
    const { error } = await this.propuestasS.cambiarEstado(p.id, 'rechazada');
    if (error) {
      this.mensaje.set('No se pudo rechazar la propuesta.');
      return;
    }
    await this.logS.registrar('Rechazó una propuesta', p.titulo);
    await this.cargar();
  }
}
