import { inject, Service } from '@angular/core';
import { SupabaseService } from './supabase';
import { ListaEspera, ListaEsperaPorCrear, MiEspera } from '../interfaces/ListaEspera';

// Lista de espera de funciones agotadas (R-46, R-47).
// Anotarse y salirse lo hace el usuario; los turnos los maneja la Edge Function "lista-espera".
@Service()
export class ListaEsperaService {
  private supS = inject(SupabaseService);

  // Todas las filas abiertas de una función, en orden de llegada (para la pantalla de compra)
  async traerDeFuncion(funcionId: number) {
    const { data } = await this.supS.Sup.from('lista_espera')
      .select('*')
      .eq('funcion_id', funcionId)
      .in('estado', ['esperando', 'avisado'])
      .order('created_at');
    return (data ?? []) as ListaEspera[];
  }

  async anotarse(espera: ListaEsperaPorCrear) {
    const { error } = await this.supS.Sup.from('lista_espera').insert(espera);
    // 23505 = UNIQUE (funcion_id, usuario_id): ya estaba anotado
    if (error?.code === '23505') {
      return { error: 'Ya estás en la lista de espera de esta función.' };
    }
    return { error: error ? 'No se pudo anotarte en la lista de espera.' : null };
  }

  async salirse(id: number) {
    const { error } = await this.supS.Sup.from('lista_espera').delete().eq('id', id);
    return { error };
  }

  /**
   * Las listas del usuario en funciones que todavía no empezaron, con su posición.
   * Posición = cuántos siguen esperando y se anotaron antes que él + 1.
   * (Se puede contar porque la tabla la pueden leer todos: solo tiene ids, estado y fechas.)
   */
  async traerMias(usuarioId: string) {
    const { data } = await this.supS.Sup.from('lista_espera')
      .select('*, funciones!inner(*, peliculas(*), salas(*))')
      .eq('usuario_id', usuarioId)
      .gt('funciones.inicio', new Date().toISOString())
      .order('created_at');
    const mias = (data ?? []) as ListaEspera[];

    const resultado: MiEspera[] = [];
    for (const espera of mias) {
      const { count } = await this.supS.Sup.from('lista_espera')
        .select('id', { count: 'exact', head: true })
        .eq('funcion_id', espera.funcion_id)
        .eq('estado', 'esperando')
        .lt('created_at', espera.created_at);
      resultado.push({ ...espera, posicion: (count ?? 0) + 1 });
    }
    return resultado;
  }

  // Para el admin: cuántos esperan (esperando + con turno) en cada función
  async cantidadPorFuncion() {
    const { data } = await this.supS.Sup.from('lista_espera')
      .select('funcion_id')
      .in('estado', ['esperando', 'avisado']);
    const cantidades = new Map<number, number>();
    for (const fila of data ?? []) {
      cantidades.set(fila.funcion_id, (cantidades.get(fila.funcion_id) ?? 0) + 1);
    }
    return cantidades;
  }

  // Le pide a la Edge Function que revise los turnos ya (sin esperar al cron). Se usa al cancelar.
  async procesar() {
    await this.supS.Sup.functions.invoke('lista-espera', { body: {} });
  }
}
