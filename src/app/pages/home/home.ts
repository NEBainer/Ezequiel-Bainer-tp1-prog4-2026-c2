import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { Auth } from '../../services/auth.service';
import { aLaVenta, esProximamente, PeliculasService } from '../../services/peliculas.service';
import { promedio, ResenasService } from '../../services/resenas.service';
import { NotificacionesService } from '../../services/notificaciones.service';
import { Genero, Pelicula } from '../../interfaces/Pelicula';
import { TarjetaPelicula } from '../../components/tarjeta-pelicula/tarjeta-pelicula';
import { Poster } from '../../components/poster/poster';
import { TextoLargoPipe } from '../../pipes/texto-largo-pipe';
import { DuracionPipe } from '../../pipes/duracion-pipe';

@Component({
  selector: 'app-home',
  imports: [RouterLink, DatePipe, TarjetaPelicula, Poster, TextoLargoPipe, DuracionPipe],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit {
  authS = inject(Auth);
  private peliculasS = inject(PeliculasService);
  private resenasS = inject(ResenasService);
  private notificacionesS = inject(NotificacionesService);

  peliculas = signal<Pelicula[]>([]);
  generos = signal<Genero[]>([]);
  ventas = signal<Map<number, number>>(new Map());
  promedios = signal<Map<number, number>>(new Map());
  alertas = signal<number[]>([]);
  cargando = signal(true);
  mensajeAlerta = signal<string | null>(null);

  // Buscador
  texto = signal('');
  generosElegidos = signal<number[]>([]);

  // Lo que se puede comprar hoy (estrenadas o en preventa) y el admin dejó visible
  enCartelera = computed(() => this.peliculas().filter((p) => p.en_cartelera && aLaVenta(p)));

  // Las 3 más vendidas (por cantidad de entradas)
  masVendidas = computed(() =>
    [...this.enCartelera()]
      .sort((a, b) => (this.ventas().get(b.id) ?? 0) - (this.ventas().get(a.id) ?? 0))
      .slice(0, 3),
  );

  // Listado filtrado por nombre y por géneros (alcanza con que tenga uno de los elegidos)
  filtradas = computed(() => {
    const texto = this.texto().trim().toLowerCase();
    const elegidos = this.generosElegidos();
    return this.enCartelera().filter((p) => {
      const coincideTexto = p.nombre.toLowerCase().includes(texto);
      const coincideGenero =
        elegidos.length === 0 || (p.generos ?? []).some((g) => elegidos.includes(g.id));
      return coincideTexto && coincideGenero;
    });
  });

  proximamente = computed(() =>
    this.peliculas()
      .filter((p) => p.en_cartelera && esProximamente(p))
      .sort((a, b) => a.fecha_estreno.localeCompare(b.fecha_estreno)),
  );

  async ngOnInit() {
    const [peliculas, generos, ventas, puntajes] = await Promise.all([
      this.peliculasS.traerTodas(),
      this.peliculasS.traerGeneros(),
      this.peliculasS.ventasPorPelicula(),
      this.resenasS.traerPuntajes(),
    ]);

    const promedios = new Map<number, number>();
    for (const p of peliculas) {
      const valor = promedio(puntajes.filter((r) => r.pelicula_id === p.id));
      if (valor !== null) {
        promedios.set(p.id, valor);
      }
    }

    this.peliculas.set(peliculas);
    this.generos.set(generos);
    this.ventas.set(ventas);
    this.promedios.set(promedios);
    this.cargando.set(false);

    const usuario = this.authS.usuarioActual();
    if (usuario) {
      this.alertas.set(await this.notificacionesS.traerAlertas(usuario.id));
    }
  }

  buscar(evento: Event) {
    this.texto.set((evento.target as HTMLInputElement).value);
  }

  alternarGenero(id: number) {
    this.generosElegidos.update((lista) =>
      lista.includes(id) ? lista.filter((g) => g !== id) : [...lista, id],
    );
  }

  limpiarFiltros() {
    this.texto.set('');
    this.generosElegidos.set([]);
  }

  promedioDe(id: number) {
    return this.promedios().get(id) ?? null;
  }

  async alternarAlerta(pelicula: Pelicula) {
    const usuario = this.authS.usuarioActual();
    if (!usuario) {
      return;
    }
    this.mensajeAlerta.set(null);

    if (this.alertas().includes(pelicula.id)) {
      await this.notificacionesS.quitarAlerta(usuario.id, pelicula.id);
      this.alertas.update((lista) => lista.filter((id) => id !== pelicula.id));
      return;
    }

    const { error } = await this.notificacionesS.activarAlerta(usuario.id, pelicula.id);
    if (error) {
      this.mensajeAlerta.set(error);
    } else {
      this.alertas.update((lista) => [...lista, pelicula.id]);
      this.mensajeAlerta.set(`Te vamos a avisar cuando salgan las entradas de ${pelicula.nombre}.`);
    }
  }
}
