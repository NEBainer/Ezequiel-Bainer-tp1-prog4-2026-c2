import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ComprasService } from '../../services/compras.service';
import { ComprobanteService } from '../../services/comprobante.service';
import { Compra, CompraItem } from '../../interfaces/Compra';

interface FilaDia {
  dia: string; // 'AAAA-MM-DD'
  compras: number;
  entradas: number;
  facturado: number;
}

interface Barra {
  nombre: string;
  valor: number;
}

function claveDia(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Agrupa, suma y ordena de mayor a menor
function ranking(pares: [string, number][], limite = 6): Barra[] {
  const totales = new Map<string, number>();
  for (const [nombre, valor] of pares) {
    totales.set(nombre, (totales.get(nombre) ?? 0) + valor);
  }
  return [...totales.entries()]
    .map(([nombre, valor]) => ({ nombre, valor }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, limite);
}

@Component({
  selector: 'app-reportes',
  imports: [CurrencyPipe, DatePipe],
  templateUrl: './reportes.html',
  styleUrl: './reportes.css',
})
export class Reportes implements OnInit {
  private comprasS = inject(ComprasService);
  private comprobanteS = inject(ComprobanteService);

  periodos = [
    { dias: 7, nombre: 'Últimos 7 días' },
    { dias: 30, nombre: 'Últimos 30 días' },
    { dias: 90, nombre: 'Últimos 90 días' },
  ];
  periodo = signal(30);
  // Para el gráfico de películas: "por semana" o "por mes" (pedido del cliente)
  rangoPeliculas = signal<7 | 30>(7);

  // Se traen 90 días una sola vez y se filtra en memoria
  compras = signal<Compra[]>([]);
  items = signal<(CompraItem & { compras?: { created_at: string } })[]>([]);
  cargando = signal(true);

  private desde(dias: number) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (dias - 1));
    return d;
  }

  comprasPeriodo = computed(() => {
    const desde = this.desde(this.periodo()).toISOString();
    return this.compras().filter((c) => c.created_at >= desde);
  });

  totales = computed(() => {
    const compras = this.comprasPeriodo();
    const facturado = compras.reduce((t, c) => t + Number(c.total), 0);
    const entradas = compras.reduce((t, c) => t + c.cantidad_entradas, 0);
    return { facturado, entradas, compras: compras.length, promedio: compras.length ? facturado / compras.length : 0 };
  });

  // Facturación y entradas por día (más reciente primero)
  porDia = computed<FilaDia[]>(() => {
    const filas = new Map<string, FilaDia>();
    for (const c of this.comprasPeriodo()) {
      const dia = claveDia(c.created_at);
      const fila = filas.get(dia) ?? { dia, compras: 0, entradas: 0, facturado: 0 };
      fila.compras++;
      fila.entradas += c.cantidad_entradas;
      fila.facturado += Number(c.total);
      filas.set(dia, fila);
    }
    return [...filas.values()].sort((a, b) => b.dia.localeCompare(a.dia));
  });

  // Películas más vistas (entradas vendidas) en la última semana o el último mes
  peliculasMasVistas = computed(() => {
    const desde = this.desde(this.rangoPeliculas()).toISOString();
    return ranking(
      this.compras()
        .filter((c) => c.created_at >= desde)
        .map((c) => [c.peliculas?.nombre ?? '—', c.cantidad_entradas]),
    );
  });

  // Productos y combos más vendidos del período (unidades)
  productosMasVendidos = computed(() => {
    const desde = this.desde(this.periodo()).toISOString();
    return ranking(
      this.items()
        .filter((i) => (i.compras?.created_at ?? '') >= desde)
        .map((i) => [i.nombre, i.cantidad]),
    );
  });

  maximo(barras: Barra[]) {
    return Math.max(1, ...barras.map((b) => b.valor));
  }

  async ngOnInit() {
    const desde = this.desde(90);
    const [compras, items] = await Promise.all([
      this.comprasS.traerActivasDesde(desde),
      this.comprasS.traerItemsDesde(desde),
    ]);
    this.compras.set(compras);
    this.items.set(items);
    this.cargando.set(false);
  }

  // ---------- Exportar ----------

  private datosExportar() {
    const encabezados = ['Fecha', 'Compras', 'Entradas', 'Facturado ($)'];
    const filas = this.porDia().map((f) => {
      const [a, m, d] = f.dia.split('-');
      return [`${d}/${m}/${a}`, f.compras, f.entradas, f.facturado];
    });
    const t = this.totales();
    filas.push(['TOTAL', t.compras, t.entradas, t.facturado]);
    return { encabezados, filas };
  }

  exportarPdf() {
    const { encabezados, filas } = this.datosExportar();
    this.comprobanteS.descargarReportePdf(`Facturación ${this.nombrePeriodo()}`, encabezados, filas);
  }

  exportarExcel() {
    const { encabezados, filas } = this.datosExportar();
    this.comprobanteS.descargarCsv(`facturacion-${this.periodo()}-dias`, encabezados, filas);
  }

  nombrePeriodo() {
    return this.periodos.find((p) => p.dias === this.periodo())?.nombre.toLowerCase() ?? '';
  }

  fechaDia(dia: string) {
    return dia + 'T12:00';
  }
}
