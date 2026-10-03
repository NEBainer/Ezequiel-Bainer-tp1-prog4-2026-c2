import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FuncionesService } from '../../services/funciones.service';
import { LogService } from '../../services/log.service';
import { Sala } from '../../interfaces/Funcion';
import { MapaButacas } from '../../components/mapa-butacas/mapa-butacas';
import { TOTAL_BUTACAS } from '../../services/plano-sala';

// Salas del cine. La distribución de butacas es la misma en todas (la define la consigna),
// por eso acá se administran las salas y se muestra el plano común de solo lectura.
@Component({
  selector: 'app-admin-salas',
  imports: [ReactiveFormsModule, MapaButacas],
  template: `
    <header class="encabezado">
      <div>
        <h1>Salas</h1>
        <p class="suave">Todas las salas tienen la misma distribución: {{ totalButacas }} butacas.</p>
      </div>
    </header>

    @if (mensaje()) {
      <p class="aviso" role="status">{{ mensaje() }}</p>
    }

    <div class="disposicion">
      <section class="panel">
        <h2>Listado</h2>
        <form [formGroup]="formNueva" (ngSubmit)="crear()" class="en-linea">
          <input formControlName="nombre" placeholder="Ej: Sala 5" aria-label="Nombre de la nueva sala" />
          <button type="submit" class="btn-primario">Agregar</button>
        </form>

        @for (s of salas(); track s.id) {
          <div class="sala">
            @if (editando() === s.id) {
              <input #nombre [value]="s.nombre" aria-label="Nuevo nombre" (keydown.enter)="renombrar(s, nombre.value)" />
              <button class="btn-chico btn-primario" (click)="renombrar(s, nombre.value)">Guardar</button>
              <button class="btn-chico" (click)="editando.set(null)">Cancelar</button>
            } @else {
              <div>
                <strong>{{ s.nombre }}</strong><br />
                <span class="suave">{{ funcionesFuturas().get(s.id) ?? 0 }} funciones programadas</span>
              </div>
              <div class="acciones">
                <button class="btn-chico" (click)="editando.set(s.id)">Renombrar</button>
                <button class="btn-chico btn-peligro" (click)="borrar(s)">Borrar</button>
              </div>
            }
          </div>
        }
      </section>

      <section class="panel">
        <h2>Distribución de butacas</h2>
        <p class="suave">Filas A–T sin la K. Fila J accesible (2 + 10 + 2). Filas R, S y T VIP. Resto: 4 + 20 + 4.</p>
        <app-mapa-butacas [ocupadas]="sinOcupadas" [seleccionadas]="[]" />
      </section>
    </div>
  `,
  styles: `
    .disposicion {
      display: grid;
      grid-template-columns: minmax(280px, 1fr) 2fr;
      gap: 1.25rem;
      align-items: start;
    }
    .en-linea {
      flex-direction: row;
      margin-bottom: 0.75rem;
    }
    .sala {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem;
      padding: 0.65rem 0;
      border-bottom: 1px solid var(--borde);
    }
    .acciones {
      display: flex;
      gap: 0.4rem;
    }
    app-mapa-butacas {
      pointer-events: none;
    }
    @media (max-width: 980px) {
      .disposicion {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class AdminSalas implements OnInit {
  private funcionesS = inject(FuncionesService);
  private logS = inject(LogService);
  private fb = inject(FormBuilder);

  salas = signal<Sala[]>([]);
  funcionesFuturas = signal<Map<number, number>>(new Map());
  editando = signal<number | null>(null);
  mensaje = signal<string | null>(null);

  totalButacas = TOTAL_BUTACAS;
  sinOcupadas = new Set<string>();

  formNueva = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
  });

  async ngOnInit() {
    await this.cargar();
  }

  async cargar() {
    const [salas, cantidades] = await Promise.all([
      this.funcionesS.traerSalas(),
      this.funcionesS.funcionesFuturasPorSala(),
    ]);
    this.salas.set(salas);
    this.funcionesFuturas.set(cantidades);
  }

  async crear() {
    const nombre = this.formNueva.getRawValue().nombre.trim();
    if (!nombre) {
      return;
    }
    const { error } = await this.funcionesS.crearSala(nombre);
    if (error) {
      this.mensaje.set('No se pudo crear (¿ya existe una sala con ese nombre?).');
      return;
    }
    await this.logS.registrar('Creó una sala', nombre);
    this.formNueva.reset();
    this.mensaje.set(`${nombre} creada: ya se usa en la asignación automática de funciones.`);
    await this.cargar();
  }

  async renombrar(sala: Sala, nombre: string) {
    nombre = nombre.trim();
    if (!nombre || nombre === sala.nombre) {
      this.editando.set(null);
      return;
    }
    const { error } = await this.funcionesS.renombrarSala(sala.id, nombre);
    if (error) {
      this.mensaje.set('No se pudo renombrar (¿ya existe una sala con ese nombre?).');
      return;
    }
    await this.logS.registrar('Renombró una sala', `${sala.nombre} → ${nombre}`);
    this.editando.set(null);
    await this.cargar();
  }

  async borrar(sala: Sala) {
    const { error } = await this.funcionesS.borrarSala(sala.id);
    if (error) {
      this.mensaje.set(`${sala.nombre} tiene funciones: no se puede borrar.`);
      return;
    }
    await this.logS.registrar('Borró una sala', sala.nombre);
    await this.cargar();
  }
}
