import { Component, computed, inject, input, OnDestroy, OnInit, signal, WritableSignal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CurrencyPipe, DatePipe } from '@angular/common';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { RealtimeChannel } from '@supabase/supabase-js';
import { Auth } from '../../services/auth.service';
import { FuncionesService } from '../../services/funciones.service';
import { ComprasService, generarCodigo } from '../../services/compras.service';
import { ConfigService } from '../../services/config.service';
import { CandyService } from '../../services/candy.service';
import { CalculadoraPrecio, Cantidad } from '../../services/calculadora-precio';
import { Funcion } from '../../interfaces/Funcion';
import { Butaca, claveButaca } from '../../interfaces/Butaca';
import { Categoria, Combo, Producto } from '../../interfaces/Candy';
import { Configuracion, Cupon } from '../../interfaces/Configuracion';
import { Compra as CompraDatos, CompraItemPorCrear, CanjePorCrear, EntradaPorCrear } from '../../interfaces/Compra';
import { MapaButacas } from '../../components/mapa-butacas/mapa-butacas';
import { EntradaTicket } from '../../components/entrada-ticket/entrada-ticket';
import { DuracionPipe } from '../../pipes/duracion-pipe';

type Paso = 'modo' | 'butacas' | 'candy' | 'pago' | 'listo';

const MAXIMO_BUTACAS = 10;

// Vencimiento MM/AA que no esté vencido
function vencimientoValido(control: AbstractControl): ValidationErrors | null {
  const valor = String(control.value ?? '');
  const partes = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(valor);
  if (!partes) {
    return valor ? { formato: true } : null;
  }
  const ultimoDia = new Date(2000 + Number(partes[2]), Number(partes[1]), 0, 23, 59);
  return ultimoDia < new Date() ? { vencida: true } : null;
}

@Component({
  selector: 'app-compra',
  imports: [RouterLink, CurrencyPipe, DatePipe, ReactiveFormsModule, MapaButacas, EntradaTicket, DuracionPipe],
  templateUrl: './compra.html',
  styleUrl: './compra.css',
})
export class Compra implements OnInit, OnDestroy {
  authS = inject(Auth);
  private routerS = inject(Router);
  private funcionesS = inject(FuncionesService);
  private comprasS = inject(ComprasService);
  private configS = inject(ConfigService);
  private candyS = inject(CandyService);
  private calculadora = inject(CalculadoraPrecio);

  // Parámetro :funcionId de la ruta
  funcionId = input.required<string>();

  paso = signal<Paso>('modo');
  cargando = signal(true);
  error = signal<string | null>(null);
  aviso = signal<string | null>(null);
  procesando = signal(false);

  funcion = signal<Funcion | null>(null);
  config = signal<Configuracion | null>(null);
  cupones = signal<Cupon[]>([]);
  categorias = signal<Categoria[]>([]);
  productos = signal<Producto[]>([]);
  combos = signal<Combo[]>([]);

  // ---------- Paso 1: registrado o anónimo ----------
  modo = signal<'registrado' | 'anonimo' | null>(null);
  declaracionEdad = new FormControl(false, Validators.requiredTrue);

  // Datos del comprador registrado
  puntosDisponibles = signal(0);
  creditoDisponible = signal(0);
  esPrimeraCompra = signal(false);

  // ---------- Paso 2: butacas (en tiempo real) ----------
  ocupadas = signal<Set<string>>(new Set());
  seleccionadas = signal<Butaca[]>([]);
  clavesSeleccionadas = computed(() => this.seleccionadas().map(claveButaca));
  private canal?: RealtimeChannel;

  // ---------- Paso 3: candy, combos y canjes ----------
  cantidadesProductos = signal<Record<number, number>>({});
  cantidadesCombos = signal<Record<number, number>>({});
  canjesProductos = signal<Record<number, number>>({});
  entradasGratis = signal(0);

  // ---------- Paso 4: pago ----------
  usarCredito = signal(false);
  formPago = new FormGroup({
    titular: new FormControl('', Validators.required),
    numero: new FormControl('', [Validators.required, Validators.pattern(/^\d{16}$/)]),
    vencimiento: new FormControl('', [Validators.required, vencimientoValido]),
    cvv: new FormControl('', [Validators.required, Validators.pattern(/^\d{3,4}$/)]),
  });

  // ---------- Paso 5: entrada generada ----------
  compraHecha = signal<CompraDatos | null>(null);

  pelicula = computed(() => this.funcion()?.peliculas ?? null);
  registrado = computed(() => this.modo() === 'registrado');

  // Edad del usuario y si puede ver esta película
  bloqueoEdad = computed(() => {
    const edadMinima = this.pelicula()?.edad_minima;
    const edad = this.authS.edad();
    return edadMinima !== null && edadMinima !== undefined && edad !== null && edad < edadMinima;
  });

  // El detalle de precios se recalcula solo cada vez que cambia algo (computed)
  detalle = computed(() => {
    const config = this.config();
    const pelicula = this.pelicula();
    if (!config || !pelicula) {
      return null;
    }
    return this.calculadora.calcular(
      {
        butacas: this.seleccionadas(),
        pelicula,
        combos: this.elegidos(this.combos(), this.cantidadesCombos()),
        productos: this.elegidos(this.productos(), this.cantidadesProductos()),
        entradasGratis: this.entradasGratis(),
        productosCanjeados: this.elegidos(this.productos(), this.canjesProductos()),
        usarCredito: this.usarCredito(),
      },
      {
        registrado: this.registrado(),
        edad: this.authS.edad(),
        esPrimeraCompra: this.esPrimeraCompra(),
        creditoDisponible: this.creditoDisponible(),
      },
      config,
      this.cupones(),
    );
  });

  // Combos + entradas canjeadas no pueden superar la cantidad de butacas
  entradasCubiertas = computed(
    () => this.entradasGratis() + Object.values(this.cantidadesCombos()).reduce((t, c) => t + c, 0),
  );

  puntosRestantes = computed(() => this.puntosDisponibles() - (this.detalle()?.puntosUsados ?? 0));

  butacasVip = computed(() => this.seleccionadas().filter((b) => b.tipo === 'vip'));

  async ngOnInit() {
    const id = Number(this.funcionId());
    const [funcion, config, cupones, categorias, productos, combos, ocupadas] = await Promise.all([
      this.funcionesS.traerUna(id),
      this.configS.traer(),
      this.configS.traerCupones(),
      this.candyS.traerCategorias(),
      this.candyS.traerProductos(),
      this.candyS.traerCombos(),
      this.comprasS.traerOcupadas(id),
    ]);

    this.funcion.set(funcion);
    this.config.set(config);
    this.cupones.set(cupones);
    this.categorias.set(categorias);
    this.productos.set(productos.filter((p) => p.activo));
    this.combos.set(combos.filter((c) => c.activo));
    this.ocupadas.set(new Set(ocupadas.map(claveButaca)));
    this.cargando.set(false);

    // Realtime: cuando otra persona compra (INSERT) o cancela (DELETE) en esta función,
    // el mapa se actualiza al instante.
    this.canal = this.comprasS
      .canalEntradas(id)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'entradas' },
        (data: any) => {
          switch (data.eventType) {
            case 'INSERT':
              if (data.new.funcion_id === id) {
                this.marcarOcupada(data.new);
              }
              break;
            case 'DELETE':
              // En un DELETE Supabase solo manda el id (no la función ni la butaca):
              // se vuelven a pedir las ocupadas de esta función.
              this.recargarOcupadas(id);
              break;
          }
        },
      )
      .subscribe();
  }

  ngOnDestroy() {
    this.canal?.unsubscribe();
  }

  private marcarOcupada(entrada: { fila: string; numero: number }) {
    const clave = claveButaca(entrada);
    // Nuevo Set (nueva referencia) para que Angular detecte el cambio
    this.ocupadas.update((set) => new Set([...set, clave]));

    // Si alguien compró una butaca que yo tenía elegida, se la saco y aviso
    if (this.clavesSeleccionadas().includes(clave) && this.paso() !== 'listo' && !this.procesando()) {
      this.seleccionadas.update((lista) => lista.filter((b) => claveButaca(b) !== clave));
      this.aviso.set(`La butaca ${entrada.fila}${entrada.numero} la acaba de comprar otra persona.`);
    }
  }

  private async recargarOcupadas(funcionId: number) {
    const ocupadas = await this.comprasS.traerOcupadas(funcionId);
    this.ocupadas.set(new Set(ocupadas.map(claveButaca)));
  }

  private elegidos<T extends { id: number }>(lista: T[], cantidades: Record<number, number>): Cantidad<T>[] {
    return lista
      .filter((item) => (cantidades[item.id] ?? 0) > 0)
      .map((item) => ({ item, cantidad: cantidades[item.id] }));
  }

  // ---------- Paso 1 ----------

  async elegirRegistrado() {
    const usuario = this.authS.usuarioActual();
    if (!usuario) {
      return;
    }
    if (!this.authS.perfil()) {
      await this.authS.cargarPerfil();
    }
    if (this.bloqueoEdad()) {
      this.error.set(`Esta película es para mayores de ${this.pelicula()?.edad_minima} años.`);
      return;
    }

    const [saldos, cantidad] = await Promise.all([
      this.comprasS.traerSaldos(usuario.id),
      this.comprasS.cantidadDeCompras(usuario.id),
    ]);
    this.puntosDisponibles.set(saldos.puntos);
    this.creditoDisponible.set(saldos.credito);
    this.esPrimeraCompra.set(cantidad === 0);
    this.modo.set('registrado');
    this.error.set(null);
    this.paso.set('butacas');
  }

  elegirAnonimo() {
    // Sin fecha de nacimiento: si la película tiene restricción, se pide una declaración jurada
    if (this.pelicula()?.edad_minima && this.declaracionEdad.invalid) {
      this.declaracionEdad.markAsTouched();
      this.error.set('Tenés que confirmar la declaración de edad para continuar.');
      return;
    }
    this.modo.set('anonimo');
    this.puntosDisponibles.set(0);
    this.creditoDisponible.set(0);
    this.esPrimeraCompra.set(false);
    this.entradasGratis.set(0);
    this.canjesProductos.set({});
    this.usarCredito.set(false);
    this.error.set(null);
    this.paso.set('butacas');
  }

  // ---------- Paso 2 ----------

  alternarButaca(butaca: Butaca) {
    this.aviso.set(null);
    const clave = claveButaca(butaca);
    if (this.clavesSeleccionadas().includes(clave)) {
      this.seleccionadas.update((lista) => lista.filter((b) => claveButaca(b) !== clave));
      this.ajustarCubiertas();
      return;
    }
    if (this.seleccionadas().length >= MAXIMO_BUTACAS) {
      this.aviso.set(`Podés elegir hasta ${MAXIMO_BUTACAS} butacas por compra.`);
      return;
    }
    this.seleccionadas.update((lista) => [...lista, butaca]);
  }

  // Si saca butacas, no puede quedar con más combos/canjes que entradas
  private ajustarCubiertas() {
    while (this.entradasCubiertas() > this.seleccionadas().length) {
      if (this.entradasGratis() > 0) {
        this.entradasGratis.update((n) => n - 1);
      } else {
        const id = Object.keys(this.cantidadesCombos()).find((k) => this.cantidadesCombos()[+k] > 0);
        if (id === undefined) {
          break;
        }
        this.cambiar(this.cantidadesCombos, +id, -1);
      }
    }
  }

  // ---------- Paso 3 ----------

  productosDe(categoriaId: number) {
    return this.productos().filter((p) => p.categoria_id === categoriaId);
  }

  productosCanjeables = computed(() => this.productos().filter((p) => p.puntos !== null));

  cambiar(cantidades: WritableSignal<Record<number, number>>, id: number, delta: number) {
    cantidades.update((actual) => ({ ...actual, [id]: Math.max(0, (actual[id] ?? 0) + delta) }));
  }

  puedeSumarCombo() {
    return this.entradasCubiertas() < this.seleccionadas().length;
  }

  puedeCanjearEntrada() {
    return this.puedeSumarCombo() && this.puntosRestantes() >= (this.config()?.puntos_entrada ?? Infinity);
  }

  puedeCanjear(producto: Producto) {
    return this.puntosRestantes() >= (producto.puntos ?? Infinity);
  }

  // ---------- Navegación ----------

  irA(paso: Paso) {
    this.error.set(null);
    if ((paso === 'candy' || paso === 'pago') && this.seleccionadas().length === 0) {
      this.error.set('Elegí al menos una butaca.');
      return;
    }
    this.paso.set(paso);
  }

  // ---------- Paso 4: confirmar ----------

  get numero() {
    return this.formPago.get('numero');
  }
  get vencimiento() {
    return this.formPago.get('vencimiento');
  }
  get cvv() {
    return this.formPago.get('cvv');
  }
  get titular() {
    return this.formPago.get('titular');
  }

  async confirmar() {
    const detalle = this.detalle();
    const funcion = this.funcion();
    const pelicula = this.pelicula();
    if (!detalle || !funcion || !pelicula) {
      return;
    }

    // La tarjeta solo hace falta si queda algo por pagar después del crédito
    if (detalle.aPagarConTarjeta > 0 && this.formPago.invalid) {
      this.formPago.markAllAsTouched();
      return;
    }
    if (this.puntosRestantes() < 0) {
      this.error.set('No te alcanzan los puntos para esos canjes.');
      return;
    }

    this.procesando.set(true);
    this.error.set(null);

    const compraId = crypto.randomUUID();
    const usuarioId = this.registrado() ? this.authS.usuarioActual()!.id : null;

    const entradas: EntradaPorCrear[] = this.seleccionadas().map((b, i) => ({
      compra_id: compraId,
      funcion_id: funcion.id,
      pelicula_id: pelicula.id,
      fila: b.fila,
      numero: b.numero,
      tipo: b.tipo,
      precio: detalle.precioPorButaca[i],
    }));

    const items: CompraItemPorCrear[] = [
      ...this.elegidos(this.combos(), this.cantidadesCombos()).map((c) => ({
        compra_id: compraId,
        producto_id: null,
        combo_id: c.item.id,
        nombre: c.item.nombre,
        cantidad: c.cantidad,
        precio_unitario: c.item.precio,
        canjeado_puntos: false,
      })),
      ...this.elegidos(this.productos(), this.cantidadesProductos()).map((p) => ({
        compra_id: compraId,
        producto_id: p.item.id,
        combo_id: null,
        nombre: p.item.nombre,
        cantidad: p.cantidad,
        precio_unitario: p.item.precio,
        canjeado_puntos: false,
      })),
      ...this.elegidos(this.productos(), this.canjesProductos()).map((p) => ({
        compra_id: compraId,
        producto_id: p.item.id,
        combo_id: null,
        nombre: p.item.nombre,
        cantidad: p.cantidad,
        precio_unitario: 0,
        canjeado_puntos: true,
      })),
    ];

    const canjes: CanjePorCrear[] = [];
    if (usuarioId) {
      if (this.entradasGratis() > 0) {
        canjes.push({
          usuario_id: usuarioId,
          compra_id: compraId,
          descripcion: `${this.entradasGratis()} entrada(s) gratis · ${pelicula.nombre}`,
          puntos: this.entradasGratis() * this.config()!.puntos_entrada,
        });
      }
      for (const p of this.elegidos(this.productos(), this.canjesProductos())) {
        canjes.push({
          usuario_id: usuarioId,
          compra_id: compraId,
          descripcion: `${p.cantidad} × ${p.item.nombre}`,
          puntos: p.cantidad * (p.item.puntos ?? 0),
        });
      }
    }

    const compra = {
      id: compraId,
      codigo: generarCodigo(),
      usuario_id: usuarioId,
      funcion_id: funcion.id,
      pelicula_id: pelicula.id,
      cantidad_entradas: entradas.length,
      subtotal: detalle.subtotal,
      descuento: detalle.descuento,
      cupon: detalle.cupon?.nombre ?? null,
      total: detalle.total,
      pagado_credito: detalle.creditoUsado,
      pagado_puntos: detalle.puntosUsados,
      pagado_tarjeta: detalle.aPagarConTarjeta,
      puntos_ganados: detalle.puntosAGanar,
      candy_validado: items.length > 0 ? false : null,
      requiere_adulto: pelicula.edad_minima !== null,
    };

    const { error } = await this.comprasS.comprar(compra, entradas, items, canjes);
    this.procesando.set(false);

    if (error) {
      this.error.set(error);
      this.seleccionadas.set([]);
      await this.recargarOcupadas(funcion.id);
      this.paso.set('butacas');
      return;
    }

    // Con los datos locales se arma la entrada (un anónimo no podría volver a leerla de la base)
    this.compraHecha.set({
      ...compra,
      estado: 'activa',
      credito_otorgado: 0,
      entrada_validada: false,
      created_at: new Date().toISOString(),
      funciones: funcion,
      peliculas: pelicula,
      entradas: entradas.map((e, i) => ({ ...e, id: i })),
      compra_items: items.map((it, i) => ({ ...it, id: i })),
    });
    this.paso.set('listo');
  }

  irALogin() {
    this.routerS.navigate(['/auth/login'], { queryParams: { volver: `/comprar/${this.funcionId()}` } });
  }
}
