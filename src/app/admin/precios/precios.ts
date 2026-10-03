import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConfigService } from '../../services/config.service';
import { LogService } from '../../services/log.service';
import { Configuracion, Cupon } from '../../interfaces/Configuracion';

@Component({
  selector: 'app-admin-precios',
  imports: [ReactiveFormsModule],
  template: `
    <header class="encabezado">
      <div>
        <h1>Precios y cupones</h1>
        <p class="suave">Los cupones no se acumulan: en cada compra se aplica automáticamente el mejor disponible.</p>
      </div>
    </header>

    @if (mensaje()) {
      <p class="aviso" role="status">{{ mensaje() }}</p>
    }

    <div class="disposicion">
      <form [formGroup]="formConfig" (ngSubmit)="guardarConfig()" class="panel">
        <h2>Precios generales</h2>
        <div class="fila">
          <div class="campo">
            <label for="entrada">Entrada común / accesible ($)</label>
            <input id="entrada" type="number" formControlName="precio_entrada" />
          </div>
          <div class="campo">
            <label for="vip">Entrada VIP — filas R, S y T ($)</label>
            <input id="vip" type="number" formControlName="precio_vip" />
          </div>
        </div>
        <div class="fila">
          <div class="campo">
            <label for="primera">Cupón de primera compra (%)</label>
            <input id="primera" type="number" formControlName="porcentaje_primera_compra" />
            <span class="suave ayuda">Beneficio por registrarse. 0 = desactivado.</span>
          </div>
          <div class="campo">
            <label for="puntos">Entrada gratis (puntos)</label>
            <input id="puntos" type="number" formControlName="puntos_entrada" />
            <span class="suave ayuda">El costo en puntos de cada producto se configura en Candy.</span>
          </div>
        </div>
        @if (formConfig.invalid && formConfig.touched) {
          <small class="error">Revisá los valores (el VIP no puede ser más barato que la común, el % entre 0 y 100).</small>
        }
        <button type="submit" class="btn-primario">Guardar precios</button>
      </form>

      <section class="panel">
        <h2>Cupones</h2>
        <form [formGroup]="formCupon" (ngSubmit)="crearCupon()">
          <div class="fila">
            <div class="campo">
              <label for="c-nombre">Nombre</label>
              <input id="c-nombre" formControlName="nombre" placeholder="Ej: Jubilados" />
            </div>
            <div class="campo">
              <label for="c-porcentaje">Descuento (%)</label>
              <input id="c-porcentaje" type="number" formControlName="porcentaje" />
            </div>
          </div>
          <label class="check">
            <input type="checkbox" formControlName="solo_mayores_50" />
            <span>Solo para usuarios de más de 50 años</span>
          </label>
          <button type="submit">Crear cupón</button>
        </form>

        @for (c of cupones(); track c.id) {
          <div class="cupon" [class.inactivo]="!c.activo">
            <div>
              <strong>{{ c.nombre }}</strong> · {{ c.porcentaje }}%
              <br />
              <span class="suave">{{ c.solo_mayores_50 ? 'Más de 50 años' : 'Todos los registrados' }}</span>
            </div>
            <div class="acciones">
              <button class="btn-chico" (click)="alternarCupon(c)">{{ c.activo ? 'Pausar' : 'Activar' }}</button>
              <button class="btn-chico btn-peligro" (click)="borrarCupon(c)">✕</button>
            </div>
          </div>
        } @empty {
          <p class="suave">No hay cupones.</p>
        }
      </section>
    </div>
  `,
  styles: `
    .disposicion {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.25rem;
      align-items: start;
    }
    .ayuda {
      font-size: 0.8rem;
    }
    .cupon {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.75rem;
      padding: 0.7rem 0;
      border-bottom: 1px solid var(--borde);
    }
    .inactivo {
      opacity: 0.45;
    }
    .acciones {
      display: flex;
      gap: 0.4rem;
    }
    @media (max-width: 900px) {
      .disposicion {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class AdminPrecios implements OnInit {
  private configS = inject(ConfigService);
  private logS = inject(LogService);
  private fb = inject(FormBuilder);

  config = signal<Configuracion | null>(null);
  cupones = signal<Cupon[]>([]);
  mensaje = signal<string | null>(null);

  formConfig = this.fb.nonNullable.group({
    precio_entrada: [0, [Validators.required, Validators.min(0)]],
    precio_vip: [0, [Validators.required, Validators.min(0)]],
    porcentaje_primera_compra: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
    puntos_entrada: [0, [Validators.required, Validators.min(1)]],
  });

  formCupon = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    porcentaje: [10, [Validators.required, Validators.min(1), Validators.max(100)]],
    solo_mayores_50: [true],
  });

  async ngOnInit() {
    const [config, cupones] = await Promise.all([this.configS.traer(), this.configS.traerCupones()]);
    this.config.set(config);
    this.cupones.set(cupones);
    this.formConfig.setValue({
      precio_entrada: Number(config.precio_entrada),
      precio_vip: Number(config.precio_vip),
      porcentaje_primera_compra: config.porcentaje_primera_compra,
      puntos_entrada: config.puntos_entrada,
    });
  }

  async guardarConfig() {
    const v = this.formConfig.getRawValue();
    if (this.formConfig.invalid || v.precio_vip < v.precio_entrada) {
      this.formConfig.markAllAsTouched();
      this.mensaje.set('El precio VIP tiene que ser mayor o igual al de la entrada común.');
      return;
    }
    const anterior = this.config()!;
    const { error } = await this.configS.modificar(v);
    if (error) {
      this.mensaje.set('No se pudieron guardar los precios.');
      return;
    }

    // Una línea en el log por cada valor que cambió
    const etiquetas: Record<keyof typeof v, string> = {
      precio_entrada: 'Precio entrada',
      precio_vip: 'Precio VIP',
      porcentaje_primera_compra: 'Cupón primera compra (%)',
      puntos_entrada: 'Puntos por entrada gratis',
    };
    for (const clave of Object.keys(etiquetas) as (keyof typeof v)[]) {
      if (Number(anterior[clave]) !== v[clave]) {
        await this.logS.registrar('Modificó un precio', `${etiquetas[clave]}: ${anterior[clave]} → ${v[clave]}`);
      }
    }
    this.config.set({ ...anterior, ...v });
    this.mensaje.set('Precios guardados.');
  }

  async crearCupon() {
    if (this.formCupon.invalid) {
      this.formCupon.markAllAsTouched();
      return;
    }
    const cupon = { ...this.formCupon.getRawValue(), activo: true };
    const { error } = await this.configS.crearCupon(cupon);
    if (error) {
      this.mensaje.set('No se pudo crear el cupón.');
      return;
    }
    await this.logS.registrar('Creó un cupón', `${cupon.nombre} (${cupon.porcentaje}%)`);
    this.formCupon.reset();
    this.cupones.set(await this.configS.traerCupones());
  }

  async alternarCupon(c: Cupon) {
    await this.configS.cambiarEstadoCupon(c.id, !c.activo);
    await this.logS.registrar(c.activo ? 'Pausó un cupón' : 'Activó un cupón', c.nombre);
    this.cupones.set(await this.configS.traerCupones());
  }

  async borrarCupon(c: Cupon) {
    await this.configS.borrarCupon(c.id);
    await this.logS.registrar('Borró un cupón', c.nombre);
    this.cupones.set(await this.configS.traerCupones());
  }
}
