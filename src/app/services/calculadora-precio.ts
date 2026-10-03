import { Service } from '@angular/core';
import { Butaca } from '../interfaces/Butaca';
import { Combo, Producto } from '../interfaces/Candy';
import { Configuracion, Cupon } from '../interfaces/Configuracion';
import { Pelicula } from '../interfaces/Pelicula';
import { enPreventa } from './peliculas.service';

export interface Cantidad<T> {
  item: T;
  cantidad: number;
}

// Todo lo que el usuario eligió en el proceso de compra
export interface PedidoCompra {
  butacas: Butaca[];
  pelicula: Pelicula;
  combos: Cantidad<Combo>[];
  productos: Cantidad<Producto>[];
  // Canjes con puntos (solo registrados)
  entradasGratis: number;
  productosCanjeados: Cantidad<Producto>[];
  usarCredito: boolean;
}

// Datos del comprador que influyen en el precio
export interface DatosComprador {
  registrado: boolean;
  edad: number | null;
  esPrimeraCompra: boolean;
  creditoDisponible: number;
}

export interface LineaDetalle {
  descripcion: string;
  cantidad: number;
  unitario: number;
  total: number;
}

export interface DetallePrecio {
  lineas: LineaDetalle[];
  subtotal: number;
  cupon: { nombre: string; porcentaje: number } | null;
  descuento: number;
  total: number;
  creditoUsado: number;
  aPagarConTarjeta: number;
  puntosUsados: number;
  puntosAGanar: number;
  precioPorButaca: number[]; // lo que se cobra por cada butaca, en el mismo orden que pedido.butacas
}

/*
 * Cálculo del precio final (ver docs/decisiones.md):
 *  1. Precio de cada butaca: base normal o de preventa; las VIP suman el recargo VIP.
 *  2. Un combo reemplaza el precio base de una entrada por el precio fijo del combo.
 *     Las entradas y productos canjeados con puntos no se cobran.
 *  3. Sobre el subtotal se aplica el MEJOR cupón disponible (no se acumulan).
 *  4. Sobre el total, el crédito de la cuenta funciona como medio de pago.
 *  5. Puntos ganados = 1 por cada peso pagado con tarjeta (solo registrados).
 */
@Service()
export class CalculadoraPrecio {
  calcular(
    pedido: PedidoCompra,
    comprador: DatosComprador,
    config: Configuracion,
    cupones: Cupon[],
  ): DetallePrecio {
    const lineas: LineaDetalle[] = [];

    // 1) Precio base de la entrada
    const preventa = enPreventa(pedido.pelicula);
    const base = preventa ? pedido.pelicula.precio_preventa! : config.precio_entrada;
    const recargoVip = config.precio_vip - config.precio_entrada;

    // 2) Las primeras butacas se cubren con los canjes y después con los combos.
    //    En una butaca VIP el recargo se paga igual: lo que cubren es la parte "base".
    let gratisSinAsignar = pedido.entradasGratis;
    let combosSinAsignar = pedido.combos.reduce((t, c) => t + c.cantidad, 0);

    const precioPorButaca = pedido.butacas.map((b) => {
      const recargo = b.tipo === 'vip' ? recargoVip : 0;
      if (gratisSinAsignar > 0) {
        gratisSinAsignar--;
        return recargo;
      }
      if (combosSinAsignar > 0) {
        combosSinAsignar--;
        return recargo;
      }
      return base + recargo;
    });

    // Líneas del detalle (lo que ve el usuario antes de pagar)
    const comunes = pedido.butacas.filter((b) => b.tipo !== 'vip').length;
    const vips = pedido.butacas.filter((b) => b.tipo === 'vip').length;
    const etiqueta = preventa ? 'Entrada (preventa)' : 'Entrada';
    if (comunes > 0) {
      lineas.push(linea(etiqueta, comunes, base));
    }
    if (vips > 0) {
      lineas.push(linea(`${etiqueta} VIP`, vips, base + recargoVip));
    }
    if (pedido.entradasGratis > 0) {
      lineas.push(linea('Entrada canjeada con puntos', pedido.entradasGratis, -base));
    }
    for (const c of pedido.combos) {
      if (c.cantidad > 0) {
        // Se suma el precio del combo y se descuenta la entrada que incluye
        lineas.push(linea(`${c.item.nombre} (incluye la entrada)`, c.cantidad, c.item.precio - base));
      }
    }
    for (const p of pedido.productos) {
      if (p.cantidad > 0) {
        lineas.push(linea(p.item.nombre, p.cantidad, p.item.precio));
      }
    }
    for (const p of pedido.productosCanjeados) {
      if (p.cantidad > 0) {
        lineas.push(linea(`${p.item.nombre} (canje con puntos)`, p.cantidad, 0));
      }
    }

    const subtotal = Math.max(
      0,
      lineas.reduce((t, l) => t + l.total, 0),
    );

    // 3) Mejor cupón (los anónimos no tienen cupones)
    const cupon = comprador.registrado ? this.mejorCupon(comprador, config, cupones) : null;
    const descuento = cupon ? Math.round((subtotal * cupon.porcentaje) / 100) : 0;
    const total = subtotal - descuento;

    // 4) Crédito como medio de pago
    const creditoUsado = pedido.usarCredito ? Math.min(comprador.creditoDisponible, total) : 0;
    const aPagarConTarjeta = total - creditoUsado;

    // 5) Puntos
    const puntosUsados =
      pedido.entradasGratis * config.puntos_entrada +
      pedido.productosCanjeados.reduce((t, p) => t + p.cantidad * (p.item.puntos ?? 0), 0);
    const puntosAGanar = comprador.registrado ? Math.floor(aPagarConTarjeta) : 0;

    return {
      lineas,
      subtotal,
      cupon,
      descuento,
      total,
      creditoUsado,
      aPagarConTarjeta,
      puntosUsados,
      puntosAGanar,
      precioPorButaca,
    };
  }

  // Entre el cupón de primera compra y los cupones activos que le correspondan, el de mayor %
  mejorCupon(comprador: DatosComprador, config: Configuracion, cupones: Cupon[]) {
    const candidatos: { nombre: string; porcentaje: number }[] = [];

    if (comprador.esPrimeraCompra && config.porcentaje_primera_compra > 0) {
      candidatos.push({ nombre: 'Primera compra', porcentaje: config.porcentaje_primera_compra });
    }
    for (const c of cupones) {
      // "más de 50 años" = 51 o más
      const cumpleEdad = !c.solo_mayores_50 || (comprador.edad !== null && comprador.edad > 50);
      if (c.activo && cumpleEdad) {
        candidatos.push({ nombre: c.nombre, porcentaje: c.porcentaje });
      }
    }

    if (candidatos.length === 0) {
      return null;
    }
    return candidatos.reduce((mejor, c) => (c.porcentaje > mejor.porcentaje ? c : mejor));
  }
}

function linea(descripcion: string, cantidad: number, unitario: number): LineaDetalle {
  return { descripcion, cantidad, unitario, total: cantidad * unitario };
}
