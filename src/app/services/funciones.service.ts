import { inject, Service } from '@angular/core';
import { SupabaseService } from './supabase';
import {
  Formato,
  Funcion,
  FuncionPedida,
  FuncionPorCrear,
  Idioma,
  ResultadoAsignacion,
  Sala,
} from '../interfaces/Funcion';

// Tiempo mínimo entre que termina una función y empieza la siguiente en la misma sala
export const MINUTOS_LIMPIEZA = 30;

@Service()
export class FuncionesService {
  private supS = inject(SupabaseService);

  async traerSalas() {
    const { data } = await this.supS.Sup.from('salas').select('*').order('id');
    return (data ?? []) as Sala[];
  }

  async crearSala(nombre: string) {
    const { error } = await this.supS.Sup.from('salas').insert({ nombre });
    return { error };
  }

  async renombrarSala(id: number, nombre: string) {
    const { error } = await this.supS.Sup.from('salas').update({ nombre }).eq('id', id);
    return { error };
  }

  // Falla si la sala tiene funciones (FK de funciones.sala_id)
  async borrarSala(id: number) {
    const { error } = await this.supS.Sup.from('salas').delete().eq('id', id);
    return { error };
  }

  // Cantidad de funciones futuras por sala (para mostrar en el admin)
  async funcionesFuturasPorSala() {
    const { data } = await this.supS.Sup.from('funciones')
      .select('sala_id')
      .gt('inicio', new Date().toISOString());
    const cantidades = new Map<number, number>();
    for (const f of (data ?? []) as { sala_id: number }[]) {
      cantidades.set(f.sala_id, (cantidades.get(f.sala_id) ?? 0) + 1);
    }
    return cantidades;
  }

  // Funciones que todavía no empezaron, de una película
  async traerProximasDePelicula(peliculaId: number) {
    const { data } = await this.supS.Sup.from('funciones')
      .select('*, salas(*)')
      .eq('pelicula_id', peliculaId)
      .gt('inicio', new Date().toISOString())
      .order('inicio');
    return (data ?? []) as Funcion[];
  }

  async traerUna(id: number) {
    const { data } = await this.supS.Sup.from('funciones')
      .select('*, salas(*), peliculas(*, generos(*))')
      .eq('id', id)
      .maybeSingle();
    return data as Funcion | null;
  }

  // Todas las funciones que se cruzan con el rango [desde, hasta]
  async traerEntre(desde: Date, hasta: Date) {
    const { data } = await this.supS.Sup.from('funciones')
      .select('*, salas(*), peliculas(nombre)')
      .lt('inicio', hasta.toISOString())
      .gt('fin', desde.toISOString())
      .order('inicio');
    return (data ?? []) as Funcion[];
  }

  async crearVarias(funciones: FuncionPorCrear[]) {
    const { error } = await this.supS.Sup.from('funciones').insert(funciones);
    return { error };
  }

  async borrar(id: number) {
    const { error } = await this.supS.Sup.from('funciones').delete().eq('id', id);
    return { error };
  }

  /**
   * Asignación automática de sala.
   * Para cada horario pedido busca la primera sala en la que no haya ninguna función
   * (ya existente o recién asignada en esta misma tanda) que se pise, contando los
   * 30 minutos de limpieza antes y después.
   * Si no hay ninguna sala libre, ese horario queda en "sinSala" y no se crea.
   */
  asignarSalas(
    pedidas: FuncionPedida[],
    salas: Sala[],
    existentes: Funcion[],
    datos: { pelicula_id: number; formato: Formato; idioma: Idioma },
  ): ResultadoAsignacion {
    // Ocupación por sala: empieza con las funciones que ya están en la base
    const ocupacion = new Map<number, { inicio: Date; fin: Date }[]>();
    for (const sala of salas) {
      ocupacion.set(sala.id, []);
    }
    for (const f of existentes) {
      ocupacion.get(f.sala_id)?.push({ inicio: new Date(f.inicio), fin: new Date(f.fin) });
    }

    const resultado: ResultadoAsignacion = { creadas: [], sinSala: [] };

    for (const pedida of pedidas) {
      const salaLibre = salas.find((sala) =>
        ocupacion.get(sala.id)!.every((ocupada) => !sePisan(pedida, ocupada)),
      );

      if (!salaLibre) {
        resultado.sinSala.push(pedida.inicio);
        continue;
      }

      // La reservo para que el resto de esta tanda la tenga en cuenta
      ocupacion.get(salaLibre.id)!.push(pedida);
      resultado.creadas.push({
        ...datos,
        sala_id: salaLibre.id,
        inicio: pedida.inicio.toISOString(),
        fin: pedida.fin.toISOString(),
      });
    }

    return resultado;
  }
}

// Dos funciones se pisan si una empieza antes de que la otra termine + 30 min (y viceversa)
export function sePisan(a: { inicio: Date; fin: Date }, b: { inicio: Date; fin: Date }) {
  const margen = MINUTOS_LIMPIEZA * 60 * 1000;
  return a.inicio.getTime() < b.fin.getTime() + margen && b.inicio.getTime() < a.fin.getTime() + margen;
}
