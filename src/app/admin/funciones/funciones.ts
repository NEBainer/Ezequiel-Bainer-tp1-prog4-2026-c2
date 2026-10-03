import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PeliculasService } from '../../services/peliculas.service';
import { FuncionesService } from '../../services/funciones.service';
import { LogService } from '../../services/log.service';
import { Pelicula } from '../../interfaces/Pelicula';
import { Formato, Funcion, FuncionPedida, Idioma, ResultadoAsignacion, Sala } from '../../interfaces/Funcion';

const DIAS_SEMANA = [
  { valor: 1, nombre: 'Lun' },
  { valor: 2, nombre: 'Mar' },
  { valor: 3, nombre: 'Mié' },
  { valor: 4, nombre: 'Jue' },
  { valor: 5, nombre: 'Vie' },
  { valor: 6, nombre: 'Sáb' },
  { valor: 0, nombre: 'Dom' },
];

// Horarios cada 30 minutos de 10:00 a 23:30, para elegir con un click (sin escribir ni usar pickers)
const HORARIOS: string[] = [];
for (let h = 10; h <= 23; h++) {
  HORARIOS.push(`${String(h).padStart(2, '0')}:00`, `${String(h).padStart(2, '0')}:30`);
}

function inicioDelDia(fecha: Date) {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
}

@Component({
  selector: 'app-admin-funciones',
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './funciones.html',
  styleUrl: './funciones.css',
})
export class AdminFunciones implements OnInit {
  private peliculasS = inject(PeliculasService);
  private funcionesS = inject(FuncionesService);
  private logS = inject(LogService);

  diasSemana = DIAS_SEMANA;
  horarios = HORARIOS;
  formatos: Formato[] = ['2D', '3D', '4D', '5D'];
  idiomas: Idioma[] = ['Castellano', 'Subtitulada'];

  peliculas = signal<Pelicula[]>([]);
  salas = signal<Sala[]>([]);
  resultado = signal<ResultadoAsignacion | null>(null);
  mensaje = signal<string | null>(null);
  guardando = signal(false);

  // Próximos 21 días como chips (para "desde" y para la grilla del día)
  proximosDias = Array.from({ length: 21 }, (_, i) => {
    const hoy = inicioDelDia(new Date());
    return new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + i);
  });

  formulario = new FormGroup({
    pelicula_id: new FormControl<number | null>(null, Validators.required),
    formato: new FormControl<Formato>('2D', { nonNullable: true }),
    idioma: new FormControl<Idioma>('Castellano', { nonNullable: true }),
    dias: new FormControl<number[]>([], { nonNullable: true }),
    horas: new FormControl<string[]>([], { nonNullable: true }),
    desde: new FormControl<number>(0, { nonNullable: true }), // índice en proximosDias
    semanas: new FormControl<number>(2, { nonNullable: true }),
  });

  // Vista de un día
  diaVista = signal<Date>(this.proximosDias[0]);
  funcionesDelDia = signal<Funcion[]>([]);

  funcionesPorSala = computed(() =>
    this.salas().map((sala) => ({
      sala,
      funciones: this.funcionesDelDia().filter((f) => f.sala_id === sala.id),
    })),
  );

  async ngOnInit() {
    const [peliculas, salas] = await Promise.all([
      this.peliculasS.traerTodas(),
      this.funcionesS.traerSalas(),
    ]);
    this.peliculas.set(peliculas.filter((p) => p.en_cartelera));
    this.salas.set(salas);
    await this.verDia(this.diaVista());
  }

  alternar(control: 'dias' | 'horas', valor: number | string) {
    const c = this.formulario.controls[control] as FormControl<(number | string)[]>;
    const actuales = c.value;
    c.setValue(actuales.includes(valor) ? actuales.filter((v) => v !== valor) : [...actuales, valor]);
  }

  // Todas las fechas/horas que pidió el admin (todavía sin sala).
  // Ej: lunes y viernes a las 18:00 durante 2 semanas = 4 funciones pedidas.
  armarPedidas(): FuncionPedida[] {
    const { pelicula_id, dias, horas, desde, semanas } = this.formulario.getRawValue();
    const pelicula = this.peliculas().find((p) => p.id === pelicula_id);
    if (!pelicula) {
      return [];
    }

    const pedidas: FuncionPedida[] = [];
    const inicio = this.proximosDias[desde];
    const ahora = Date.now();
    const [ae, me, de] = pelicula.fecha_estreno.split('-').map(Number);
    const estreno = new Date(ae, me - 1, de);

    for (let i = 0; i < semanas * 7; i++) {
      const dia = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i);
      if (!dias.includes(dia.getDay()) || dia < estreno) {
        continue;
      }
      for (const hora of [...horas].sort()) {
        const [h, m] = hora.split(':').map(Number);
        const comienzo = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), h, m);
        if (comienzo.getTime() <= ahora) {
          continue;
        }
        pedidas.push({ inicio: comienzo, fin: new Date(comienzo.getTime() + pelicula.duracion * 60000) });
      }
    }
    return pedidas;
  }

  async programar() {
    const valores = this.formulario.getRawValue();
    if (!valores.pelicula_id || valores.dias.length === 0 || valores.horas.length === 0) {
      this.mensaje.set('Elegí película, al menos un día de la semana y un horario.');
      return;
    }
    const pedidas = this.armarPedidas();
    if (pedidas.length === 0) {
      this.mensaje.set('No hay fechas que cumplan (revisá que sean futuras y posteriores al estreno).');
      return;
    }

    this.guardando.set(true);
    this.mensaje.set(null);

    // Se traen todas las funciones del período (con un día de margen) para comparar
    const desde = new Date(pedidas[0].inicio.getTime() - 24 * 3600 * 1000);
    const hasta = new Date(pedidas[pedidas.length - 1].fin.getTime() + 24 * 3600 * 1000);
    const existentes = await this.funcionesS.traerEntre(desde, hasta);

    const resultado = this.funcionesS.asignarSalas(pedidas, this.salas(), existentes, {
      pelicula_id: valores.pelicula_id,
      formato: valores.formato,
      idioma: valores.idioma,
    });

    if (resultado.creadas.length > 0) {
      const { error } = await this.funcionesS.crearVarias(resultado.creadas);
      if (error) {
        this.guardando.set(false);
        this.mensaje.set('No se pudieron guardar las funciones.');
        return;
      }
      const pelicula = this.peliculas().find((p) => p.id === valores.pelicula_id);
      await this.logS.registrar(
        'Creó funciones',
        `${resultado.creadas.length} función(es) de ${pelicula?.nombre} (${valores.formato}, ${valores.idioma})`,
      );
    }

    this.resultado.set(resultado);
    this.guardando.set(false);
    await this.verDia(this.diaVista());
  }

  nombreSala(id: number) {
    return this.salas().find((s) => s.id === id)?.nombre;
  }

  async verDia(dia: Date) {
    this.diaVista.set(dia);
    const fin = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate() + 1);
    const funciones = await this.funcionesS.traerEntre(dia, fin);
    // Solo las que empiezan ese día
    this.funcionesDelDia.set(funciones.filter((f) => new Date(f.inicio) >= dia));
  }

  async borrar(f: Funcion) {
    const { error } = await this.funcionesS.borrar(f.id);
    if (error) {
      this.mensaje.set('Esa función ya tiene entradas vendidas: no se puede borrar.');
      return;
    }
    await this.logS.registrar(
      'Borró una función',
      `${f.peliculas?.nombre} · ${new Date(f.inicio).toLocaleString('es-AR')} · ${this.nombreSala(f.sala_id)}`,
    );
    await this.verDia(this.diaVista());
  }

  esMismoDia(a: Date, b: Date) {
    return a.toDateString() === b.toDateString();
  }
}
