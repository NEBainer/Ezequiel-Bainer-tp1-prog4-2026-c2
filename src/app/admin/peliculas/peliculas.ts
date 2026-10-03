import { Component, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { aLaVenta, esProximamente, PeliculasService } from '../../services/peliculas.service';
import { StorageService } from '../../services/storage.service';
import { LogService } from '../../services/log.service';
import { NotificacionesService } from '../../services/notificaciones.service';
import { Genero, Pelicula, PeliculaPorCrear } from '../../interfaces/Pelicula';
import { SelectorFecha } from '../../components/selector-fecha/selector-fecha';
import { Poster } from '../../components/poster/poster';
import { DuracionPipe } from '../../pipes/duracion-pipe';

@Component({
  selector: 'app-admin-peliculas',
  imports: [ReactiveFormsModule, CurrencyPipe, DatePipe, SelectorFecha, Poster, DuracionPipe],
  templateUrl: './peliculas.html',
  styleUrl: './peliculas.css',
})
export class AdminPeliculas implements OnInit {
  private peliculasS = inject(PeliculasService);
  private storageS = inject(StorageService);
  private logS = inject(LogService);
  private notificacionesS = inject(NotificacionesService);

  peliculas = signal<Pelicula[]>([]);
  generos = signal<Genero[]>([]);
  editando = signal<Pelicula | null>(null);
  formularioAbierto = signal(false);
  mensaje = signal<string | null>(null);
  guardando = signal(false);
  anioActual = new Date().getFullYear();

  formulario = new FormGroup({
    nombre: new FormControl('', Validators.required),
    sinopsis: new FormControl('', [Validators.required, Validators.maxLength(600)]),
    duracion: new FormControl<number | null>(null, [Validators.required, Validators.min(30), Validators.max(400)]),
    edad_minima: new FormControl<'' | '13' | '18'>(''),
    fecha_estreno: new FormControl<string | null>('', Validators.required),
    precio_preventa: new FormControl<number | null>(null, Validators.min(0)),
    en_cartelera: new FormControl(true),
    generos: new FormControl<number[]>([]),
    imagen: new FormControl<File | null>(null),
  });

  async ngOnInit() {
    await this.cargar();
    this.generos.set(await this.peliculasS.traerGeneros());
  }

  async cargar() {
    this.peliculas.set(await this.peliculasS.traerTodas());
  }

  estado(p: Pelicula) {
    if (!p.en_cartelera) {
      return 'Oculta';
    }
    if (esProximamente(p)) {
      return aLaVenta(p) ? 'Preventa' : 'Próximamente';
    }
    return 'En cartelera';
  }

  nueva() {
    this.editando.set(null);
    this.formulario.reset({ en_cartelera: true, generos: [], edad_minima: '', fecha_estreno: '' });
    this.formularioAbierto.set(true);
  }

  editar(p: Pelicula) {
    this.editando.set(p);
    this.formulario.reset({
      nombre: p.nombre,
      sinopsis: p.sinopsis,
      duracion: p.duracion,
      edad_minima: p.edad_minima ? (String(p.edad_minima) as '13' | '18') : '',
      fecha_estreno: p.fecha_estreno,
      precio_preventa: p.precio_preventa,
      en_cartelera: p.en_cartelera,
      generos: (p.generos ?? []).map((g) => g.id),
      imagen: null,
    });
    this.formularioAbierto.set(true);
  }

  cerrar() {
    this.formularioAbierto.set(false);
    this.editando.set(null);
  }

  alternarGenero(id: number) {
    const actuales = this.formulario.controls.generos.value ?? [];
    this.formulario.controls.generos.setValue(
      actuales.includes(id) ? actuales.filter((g) => g !== id) : [...actuales, id],
    );
  }

  // input file: no funciona con formControlName, se setea a mano (clase 7)
  elegirImagen(evento: Event) {
    const input = evento.target as HTMLInputElement;
    this.formulario.controls.imagen.setValue(input.files?.[0] ?? null);
  }

  async guardar() {
    if (this.formulario.invalid || this.formulario.value.fecha_estreno === 'invalida') {
      this.formulario.markAllAsTouched();
      this.mensaje.set('Revisá los campos marcados.');
      return;
    }
    const valores = this.formulario.value;

    // "Toda película tiene una imagen": al crear, el póster es obligatorio (al editar se conserva el anterior)
    if (!this.editando() && !valores.imagen) {
      this.mensaje.set('Elegí el póster de la película.');
      return;
    }

    this.guardando.set(true);
    this.mensaje.set(null);

    // 1) Si eligió un póster nuevo, se sube primero y se guarda solo su ruta
    let imagen = this.editando()?.imagen ?? null;
    if (valores.imagen) {
      imagen = await this.storageS.subirPoster(valores.imagen);
      if (!imagen) {
        this.guardando.set(false);
        this.mensaje.set('No se pudo subir la imagen (PNG, JPG o WEBP de hasta 2 MB).');
        return;
      }
    }

    const pelicula: PeliculaPorCrear = {
      nombre: valores.nombre!.trim(),
      sinopsis: valores.sinopsis!.trim(),
      duracion: Number(valores.duracion),
      edad_minima: valores.edad_minima ? (Number(valores.edad_minima) as 13 | 18) : null,
      fecha_estreno: valores.fecha_estreno!,
      precio_preventa: valores.precio_preventa ? Number(valores.precio_preventa) : null,
      en_cartelera: !!valores.en_cartelera,
      imagen,
    };

    const editando = this.editando();
    const { error } = editando
      ? await this.peliculasS.modificar(editando.id, pelicula, valores.generos ?? [])
      : await this.peliculasS.crear(pelicula, valores.generos ?? []);

    this.guardando.set(false);
    if (error) {
      this.mensaje.set('No se pudo guardar la película.');
      return;
    }

    if (editando) {
      const cambioPrecio = editando.precio_preventa !== pelicula.precio_preventa;
      await this.logS.registrar(
        cambioPrecio ? 'Modificó un precio' : 'Modificó una película',
        cambioPrecio
          ? `${pelicula.nombre}: preventa de ${editando.precio_preventa ?? 'sin preventa'} a ${pelicula.precio_preventa ?? 'sin preventa'}`
          : pelicula.nombre,
      );
    } else {
      await this.logS.registrar('Creó una película', pelicula.nombre);
    }

    this.mensaje.set(`"${pelicula.nombre}" guardada.`);
    this.cerrar();
    await this.cargar();
  }

  async alternarCartelera(p: Pelicula) {
    await this.peliculasS.modificar(p.id, { en_cartelera: !p.en_cartelera }, (p.generos ?? []).map((g) => g.id));
    await this.logS.registrar(p.en_cartelera ? 'Ocultó una película' : 'Publicó una película', p.nombre);
    await this.cargar();
  }

  async borrar(p: Pelicula) {
    const { error } = await this.peliculasS.borrar(p.id);
    if (error) {
      // Si tiene compras, la FK no deja borrarla
      this.mensaje.set(`"${p.nombre}" tiene ventas: no se puede borrar, ocultala de la cartelera.`);
      return;
    }
    await this.logS.registrar('Borró una película', p.nombre);
    await this.cargar();
  }

  async avisar(p: Pelicula) {
    const { error, enviadas } = await this.notificacionesS.avisarVentaAbierta(p.id);
    if (error) {
      this.mensaje.set(error);
      return;
    }
    this.mensaje.set(`Aviso enviado: ${enviadas} notificación(es) de "${p.nombre}".`);
    await this.logS.registrar('Envió aviso de venta', `${p.nombre} (${enviadas} notificaciones)`);
  }

  aLaVenta(p: Pelicula) {
    return aLaVenta(p);
  }
}
