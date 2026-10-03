import { inject, Service } from '@angular/core';
import { SupabaseService } from './supabase';
import {
  CanjePorCrear,
  Compra,
  CompraItem,
  CompraItemPorCrear,
  CompraPorCrear,
  Entrada,
  EntradaPorCrear,
} from '../interfaces/Compra';

// Código del QR: 8 caracteres fáciles de tipear (sin 0/O ni 1/I para no confundirlos)
export function generarCodigo() {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let codigo = '';
  for (let i = 0; i < 8; i++) {
    codigo += letras[Math.floor(Math.random() * letras.length)];
  }
  return codigo;
}

// Se puede cancelar hasta 2 horas antes de que empiece la función
export const HORAS_LIMITE_CANCELACION = 2;

export function sePuedeCancelar(compra: Compra) {
  if (compra.estado !== 'activa' || compra.entrada_validada || !compra.funciones) {
    return false;
  }
  const limite = new Date(compra.funciones.inicio).getTime() - HORAS_LIMITE_CANCELACION * 3600 * 1000;
  return Date.now() < limite;
}

@Service()
export class ComprasService {
  private supS = inject(SupabaseService);

  // ---------- Butacas ----------

  async traerOcupadas(funcionId: number) {
    const { data } = await this.supS.Sup.from('entradas')
      .select('fila, numero')
      .eq('funcion_id', funcionId);
    return (data ?? []) as Pick<Entrada, 'fila' | 'numero'>[];
  }

  // Un canal por función; el componente se suscribe a los cambios de "entradas" de esa función
  canalEntradas(funcionId: number) {
    return this.supS.Sup.channel(`entradas-funcion-${funcionId}`);
  }

  // ---------- Compra ----------

  /**
   * Guarda la compra. El orden importa:
   * 1) Primero las entradas: el UNIQUE (funcion_id, fila, numero) de la base hace que si otra
   *    persona compró alguna de esas butacas un instante antes, falle todo el insert
   *    (es una sola sentencia) y no se cobra nada.
   * 2) Después la compra, los productos y los canjes de puntos.
   */
  async comprar(
    compra: CompraPorCrear,
    entradas: EntradaPorCrear[],
    items: CompraItemPorCrear[],
    canjes: CanjePorCrear[],
  ) {
    const resEntradas = await this.supS.Sup.from('entradas').insert(entradas);
    if (resEntradas.error) {
      const ocupada = resEntradas.error.code === '23505'; // violación de UNIQUE
      return {
        error: ocupada
          ? 'Alguien acaba de comprar una de las butacas que elegiste. Elegí otras.'
          : 'No se pudieron reservar las butacas.',
      };
    }

    const resCompra = await this.supS.Sup.from('compras').insert(compra);
    if (resCompra.error) {
      return { error: 'No se pudo registrar la compra.' };
    }

    if (items.length > 0) {
      const { error } = await this.supS.Sup.from('compra_items').insert(items);
      if (error) {
        return { error: 'La entrada se compró, pero no se pudo registrar el candy. Acercate a la boletería.' };
      }
    }
    if (canjes.length > 0) {
      await this.supS.Sup.from('canjes').insert(canjes);
    }
    return { error: null };
  }

  // ---------- Compras del usuario ----------

  async traerDeUsuario(usuarioId: string) {
    const { data } = await this.supS.Sup.from('compras')
      .select('*, funciones(*, salas(*)), peliculas(*), compra_items(*)')
      .eq('usuario_id', usuarioId)
      .order('created_at', { ascending: false });
    const compras = (data ?? []) as Compra[];
    await this.agregarEntradas(compras);
    return compras;
  }

  async cantidadDeCompras(usuarioId: string) {
    const { count } = await this.supS.Sup.from('compras')
      .select('id', { count: 'exact', head: true })
      .eq('usuario_id', usuarioId);
    return count ?? 0;
  }

  // Puntos y crédito no se guardan como un número: se calculan con el historial,
  // así no hay un saldo que el usuario pueda modificar a mano.
  async traerSaldos(usuarioId: string) {
    const { data: compras } = await this.supS.Sup.from('compras')
      .select('estado, puntos_ganados, credito_otorgado, pagado_credito')
      .eq('usuario_id', usuarioId);
    const { data: canjes } = await this.supS.Sup.from('canjes')
      .select('*, compras(estado)')
      .eq('usuario_id', usuarioId)
      .order('created_at', { ascending: false });

    let puntos = 0;
    let credito = 0;
    for (const c of (compras ?? []) as Compra[]) {
      if (c.estado === 'activa') {
        puntos += c.puntos_ganados;
      }
      credito += Number(c.credito_otorgado) - Number(c.pagado_credito);
    }
    // Los canjes de una compra cancelada se devuelven
    const canjesActivos = (canjes ?? []).filter((c: any) => c.compras?.estado === 'activa');
    for (const c of canjesActivos) {
      puntos -= c.puntos;
    }

    return { puntos, credito, canjes: canjesActivos as any[] };
  }

  /**
   * Cancelación: no se devuelve dinero, se da crédito por lo pagado (tarjeta + crédito usado).
   * Se borran las entradas para liberar las butacas. Los puntos ganados se pierden y
   * los puntos canjeados vuelven (se calculan solo sobre compras activas).
   */
  async cancelar(compra: Compra) {
    const { error } = await this.supS.Sup.from('compras')
      .update({
        estado: 'cancelada',
        credito_otorgado: Number(compra.pagado_tarjeta) + Number(compra.pagado_credito),
      })
      .eq('id', compra.id)
      .eq('estado', 'activa');
    if (error) {
      return { error };
    }
    const res = await this.supS.Sup.from('entradas').delete().eq('compra_id', compra.id);
    return { error: res.error };
  }

  // ---------- Validación (empleados) ----------

  async buscarPorCodigo(codigo: string) {
    const { data } = await this.supS.Sup.from('compras')
      .select('*, funciones(*, salas(*)), peliculas(*), compra_items(*)')
      .eq('codigo', codigo.trim().toUpperCase())
      .maybeSingle();
    if (!data) {
      return null;
    }
    const compra = data as Compra;
    await this.agregarEntradas([compra]);
    return compra;
  }

  /**
   * QR de un solo uso. El update solo modifica la fila si TODAVÍA no estaba validada
   * (.eq('entrada_validada', false)). Si dos empleados escanean a la vez, la base procesa
   * un update después del otro: el primero modifica la fila y el segundo no encuentra
   * ninguna fila que cumpla la condición, así que recibe una lista vacía.
   */
  async validarEntrada(compraId: string) {
    const { data } = await this.supS.Sup.from('compras')
      .update({ entrada_validada: true })
      .eq('id', compraId)
      .eq('estado', 'activa')
      .eq('entrada_validada', false)
      .select();
    return (data ?? []).length === 1;
  }

  async validarCandy(compraId: string) {
    const { data } = await this.supS.Sup.from('compras')
      .update({ candy_validado: true })
      .eq('id', compraId)
      .eq('estado', 'activa')
      .eq('candy_validado', false)
      .select();
    return (data ?? []).length === 1;
  }

  // ---------- Reportes (admin) ----------

  async traerActivasDesde(desde: Date) {
    const { data } = await this.supS.Sup.from('compras')
      .select('*, peliculas(nombre)')
      .eq('estado', 'activa')
      .gte('created_at', desde.toISOString())
      .order('created_at');
    return (data ?? []) as Compra[];
  }

  async traerItemsDesde(desde: Date) {
    const { data } = await this.supS.Sup.from('compra_items')
      .select('*, compras!inner(estado, created_at)')
      .eq('compras.estado', 'activa')
      .gte('compras.created_at', desde.toISOString());
    return (data ?? []) as CompraItem[];
  }

  // Las entradas no tienen FK a compras (se insertan antes), por eso se traen aparte
  private async agregarEntradas(compras: Compra[]) {
    if (compras.length === 0) {
      return;
    }
    const { data } = await this.supS.Sup.from('entradas')
      .select('*')
      .in(
        'compra_id',
        compras.map((c) => c.id),
      );
    for (const compra of compras) {
      compra.entradas = ((data ?? []) as Entrada[])
        .filter((e) => e.compra_id === compra.id)
        .sort((a, b) => a.fila.localeCompare(b.fila) || a.numero - b.numero);
    }
  }
}
