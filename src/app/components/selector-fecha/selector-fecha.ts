import { Component, input, OnDestroy, OnInit, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { FormControl } from '@angular/forms';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/*
 * Ingreso de fechas con tres selects (día / mes / año) en vez del calendario desplegable
 * que el cliente pidió evitar. Recibe el FormControl del formulario padre por input()
 * (como se vio en la clase 4) y le escribe la fecha en formato 'AAAA-MM-DD'.
 */
@Component({
  selector: 'app-selector-fecha',
  template: `
    <div class="selector" role="group" [attr.aria-label]="etiqueta()">
      <select (change)="elegir('dia', $event)" aria-label="Día" (blur)="control().markAsTouched()">
        <option value="" disabled [selected]="!dia()">Día</option>
        @for (d of dias; track d) {
          <option [value]="d" [selected]="d + '' === dia()">{{ d }}</option>
        }
      </select>
      <select (change)="elegir('mes', $event)" aria-label="Mes" (blur)="control().markAsTouched()">
        <option value="" disabled [selected]="!mes()">Mes</option>
        @for (m of meses; track m; let i = $index) {
          <option [value]="i + 1" [selected]="i + 1 + '' === mes()">{{ m }}</option>
        }
      </select>
      <select (change)="elegir('anio', $event)" aria-label="Año" (blur)="control().markAsTouched()">
        <option value="" disabled [selected]="!anio()">Año</option>
        @for (a of anios; track a) {
          <option [value]="a" [selected]="a + '' === anio()">{{ a }}</option>
        }
      </select>
    </div>
  `,
  styles: `
    .selector {
      display: grid;
      grid-template-columns: 1fr 1.2fr 1.3fr;
      gap: 0.4rem;
    }
  `,
})
export class SelectorFecha implements OnInit, OnDestroy {
  control = input.required<FormControl<string | null>>();
  etiqueta = input<string>('Fecha');
  anioDesde = input<number>(1920);
  anioHasta = input<number>(new Date().getFullYear());

  dias = Array.from({ length: 31 }, (_, i) => i + 1);
  meses = MESES;
  anios: number[] = [];

  dia = signal<string>('');
  mes = signal<string>('');
  anio = signal<string>('');

  private suscripcion?: Subscription;

  ngOnInit() {
    // Años del más reciente al más viejo (para fecha de nacimiento conviene así)
    for (let a = this.anioHasta(); a >= this.anioDesde(); a--) {
      this.anios.push(a);
    }
    // Si el control ya tenía una fecha (al editar) se reparte en los tres selects,
    // y lo mismo cada vez que el formulario padre le cambia el valor (ej. reset)
    this.mostrar(this.control().value);
    this.suscripcion = this.control().valueChanges.subscribe((valor) => this.mostrar(valor));
  }

  ngOnDestroy() {
    this.suscripcion?.unsubscribe();
  }

  private mostrar(valor: string | null) {
    if (!valor) {
      this.dia.set('');
      this.mes.set('');
      this.anio.set('');
      return;
    }
    const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
    if (partes) {
      this.anio.set(String(Number(partes[1])));
      this.mes.set(String(Number(partes[2])));
      this.dia.set(String(Number(partes[3])));
    }
  }

  elegir(parte: 'dia' | 'mes' | 'anio', evento: Event) {
    const valor = (evento.target as HTMLSelectElement).value;
    this[parte].set(valor);

    if (this.dia() && this.mes() && this.anio()) {
      const fecha = new Date(Number(this.anio()), Number(this.mes()) - 1, Number(this.dia()));
      // 31 de febrero, etc.: la fecha "se pasa" al mes siguiente, entonces no es válida
      if (fecha.getDate() !== Number(this.dia())) {
        this.control().setValue('invalida');
      } else {
        this.control().setValue(`${this.anio()}-${this.mes().padStart(2, '0')}-${this.dia().padStart(2, '0')}`);
      }
      this.control().markAsTouched();
    }
  }
}
