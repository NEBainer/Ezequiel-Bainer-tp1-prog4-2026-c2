import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { RolesService } from '../../services/roles.service';
import { LogService } from '../../services/log.service';
import { Usuario } from '../../interfaces/Usuario';
import { AsignacionRol, RolPersonalizado, Seccion, SECCIONES } from '../../interfaces/RolPersonalizado';

// Roles configurables (R-45): el admin arma roles con las secciones del panel que habilitan
// y se los asigna a usuarios. Ej.: "Contador" -> solo Reportes.
@Component({
  selector: 'app-admin-roles',
  imports: [ReactiveFormsModule],
  template: `
    <header class="encabezado">
      <div>
        <h1>Roles</h1>
        <p class="suave">Cada rol habilita secciones del panel. Un usuario puede tener varios roles.</p>
      </div>
    </header>

    @if (mensaje()) {
      <p class="aviso" role="status">{{ mensaje() }}</p>
    }

    <div class="disposicion">
      <section class="panel">
        <h2>{{ editando() ? 'Modificar rol' : 'Nuevo rol' }}</h2>
        <form [formGroup]="form" (ngSubmit)="guardar()">
          <label for="nombre">Nombre</label>
          <input id="nombre" formControlName="nombre" placeholder="Ej: Contador" />
          @if (form.controls.nombre.touched && form.controls.nombre.invalid) {
            <small class="error">Poné un nombre (hasta 60 caracteres).</small>
          }

          <fieldset formGroupName="secciones">
            <legend>Secciones que habilita</legend>
            @for (s of secciones; track s.seccion) {
              <label class="check">
                <input type="checkbox" [formControlName]="s.seccion" />
                {{ s.titulo }}
              </label>
            }
            <small class="suave">Propuestas incluye Películas: al aceptar una, se abre el alta de película.</small>
          </fieldset>

          <div class="acciones">
            <button type="submit" class="btn-primario">{{ editando() ? 'Guardar cambios' : 'Crear rol' }}</button>
            @if (editando()) {
              <button type="button" (click)="cancelar()">Cancelar</button>
            }
          </div>
        </form>
      </section>

      <section class="panel">
        <h2>Roles creados</h2>
        @for (rol of roles(); track rol.id) {
          <article class="rol">
            <div class="cabecera">
              <strong>{{ rol.nombre }}</strong>
              <div class="acciones">
                <button class="btn-chico" (click)="editar(rol)">Modificar</button>
                <button class="btn-chico btn-peligro" (click)="borrar(rol)">Borrar</button>
              </div>
            </div>
            <p class="suave">{{ titulos(rol.secciones) }}</p>

            <ul class="usuarios">
              @for (a of asignacionesDe(rol.id); track a.usuario_id) {
                <li>
                  {{ nombreDe(a.usuario_id) }}
                  <button class="btn-chico" (click)="quitar(a, rol)">Quitar</button>
                </li>
              } @empty {
                <li class="suave">Nadie tiene este rol.</li>
              }
            </ul>

            <div class="asignar">
              <select #usuario aria-label="Usuario al que se le asigna el rol">
                <option value="">Elegí un usuario…</option>
                @for (u of usuarios(); track u.id) {
                  <option [value]="u.id">{{ u.apellido }}, {{ u.nombre }}</option>
                }
              </select>
              <button class="btn-chico btn-primario" (click)="asignar(usuario.value, rol)">Asignar</button>
            </div>
          </article>
        } @empty {
          <p class="suave">Todavía no hay roles.</p>
        }
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
    fieldset {
      border: 1px solid var(--borde);
      border-radius: var(--radio-chico);
      display: grid;
      gap: 0.35rem;
    }
    .check {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .acciones {
      display: flex;
      gap: 0.4rem;
    }
    .rol {
      padding: 0.75rem 0;
      border-bottom: 1px solid var(--borde);
    }
    .cabecera {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem;
    }
    .usuarios {
      list-style: none;
      padding: 0;
      display: grid;
      gap: 0.3rem;
    }
    .usuarios li {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .asignar {
      display: flex;
      gap: 0.4rem;
    }
    .asignar select {
      flex: 1;
    }
    @media (max-width: 980px) {
      .disposicion {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class AdminRoles implements OnInit, OnDestroy {
  private rolesS = inject(RolesService);
  private logS = inject(LogService);
  private fb = inject(FormBuilder);

  roles = signal<RolPersonalizado[]>([]);
  asignaciones = signal<AsignacionRol[]>([]);
  usuarios = signal<Usuario[]>([]);
  editando = signal<number | null>(null);
  mensaje = signal<string | null>(null);

  secciones = SECCIONES;

  // Un checkbox (true/false) por sección
  form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(60)]],
    secciones: this.fb.nonNullable.group({
      reportes: false,
      peliculas: false,
      propuestas: false,
      funciones: false,
      salas: false,
      candy: false,
      precios: false,
      log: false,
    }),
  });

  private suscripcion?: Subscription;

  async ngOnInit() {
    // Si tilda Propuestas, se tilda Películas: aceptar una propuesta abre el alta de película
    this.suscripcion = this.form.controls.secciones.controls.propuestas.valueChanges.subscribe((tildada) => {
      if (tildada) {
        this.form.controls.secciones.controls.peliculas.setValue(true);
      }
    });
    await this.cargar();
  }

  ngOnDestroy() {
    this.suscripcion?.unsubscribe();
  }

  async cargar() {
    const [roles, asignaciones, usuarios] = await Promise.all([
      this.rolesS.traerRoles(),
      this.rolesS.traerAsignaciones(),
      this.rolesS.traerUsuarios(),
    ]);
    this.roles.set(roles);
    this.asignaciones.set(asignaciones);
    this.usuarios.set(usuarios);
  }

  // Pasa los checkboxes a la lista que se guarda en la columna "secciones"
  private seccionesTildadas(): Seccion[] {
    const valores = this.form.getRawValue().secciones;
    return this.secciones.map((s) => s.seccion).filter((s) => valores[s]);
  }

  async guardar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const secciones = this.seccionesTildadas();
    if (secciones.length === 0) {
      this.mensaje.set('Elegí al menos una sección.');
      return;
    }
    const rol = { nombre: this.form.getRawValue().nombre.trim(), secciones };
    const id = this.editando();

    const { error } = id ? await this.rolesS.modificar(id, rol) : await this.rolesS.crear(rol);
    if (error) {
      this.mensaje.set('No se pudo guardar (¿ya existe un rol con ese nombre?).');
      return;
    }
    await this.logS.registrar(id ? 'Modificó un rol' : 'Creó un rol', `${rol.nombre}: ${secciones.join(', ')}`);
    this.mensaje.set(`Rol "${rol.nombre}" guardado.`);
    this.cancelar();
    await this.cargar();
  }

  editar(rol: RolPersonalizado) {
    this.editando.set(rol.id);
    this.form.controls.nombre.setValue(rol.nombre);
    for (const s of this.secciones) {
      this.form.controls.secciones.controls[s.seccion].setValue(rol.secciones.includes(s.seccion));
    }
  }

  cancelar() {
    this.editando.set(null);
    this.form.reset();
  }

  async borrar(rol: RolPersonalizado) {
    const { error } = await this.rolesS.borrar(rol.id);
    if (error) {
      this.mensaje.set('No se pudo borrar el rol.');
      return;
    }
    await this.logS.registrar('Borró un rol', rol.nombre);
    await this.cargar();
  }

  async asignar(usuarioId: string, rol: RolPersonalizado) {
    if (!usuarioId) {
      return;
    }
    const { error } = await this.rolesS.asignar({ usuario_id: usuarioId, rol_id: rol.id });
    if (error) {
      // 23505 = la clave primaria (usuario, rol) ya existe
      this.mensaje.set(error.code === '23505' ? 'Ese usuario ya tiene este rol.' : 'No se pudo asignar.');
      return;
    }
    await this.logS.registrar('Asignó un rol', `${rol.nombre} → ${this.nombreDe(usuarioId)}`);
    await this.cargar();
  }

  async quitar(asignacion: AsignacionRol, rol: RolPersonalizado) {
    const { error } = await this.rolesS.quitar(asignacion);
    if (error) {
      this.mensaje.set('No se pudo quitar el rol.');
      return;
    }
    await this.logS.registrar('Quitó un rol', `${rol.nombre} → ${this.nombreDe(asignacion.usuario_id)}`);
    await this.cargar();
  }

  // ---------- Ayudas para el template ----------

  asignacionesDe(rolId: number) {
    return this.asignaciones().filter((a) => a.rol_id === rolId);
  }

  nombreDe(usuarioId: string) {
    const u = this.usuarios().find((u) => u.id === usuarioId);
    return u ? `${u.nombre} ${u.apellido}` : 'Usuario sin perfil';
  }

  titulos(secciones: Seccion[]) {
    return this.secciones
      .filter((s) => secciones.includes(s.seccion))
      .map((s) => s.titulo)
      .join(' · ');
  }
}
