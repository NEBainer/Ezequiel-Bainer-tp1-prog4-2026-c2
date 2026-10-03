import { inject, Service } from '@angular/core';
import { SupabaseService } from './supabase';
import { Genero, Pelicula, PeliculaPorCrear, PeliculaPorModificar } from '../interfaces/Pelicula';

@Service()
export class PeliculasService {
  private supS = inject(SupabaseService);

  // generos(*) trae los géneros a través de la tabla intermedia pelicula_generos
  async traerTodas() {
    const { data } = await this.supS.Sup.from('peliculas').select('*, generos(*)').order('nombre');
    return (data ?? []) as Pelicula[];
  }

  async traerUna(id: number) {
    const { data } = await this.supS.Sup.from('peliculas')
      .select('*, generos(*)')
      .eq('id', id)
      .maybeSingle();
    return data as Pelicula | null;
  }

  async traerGeneros() {
    const { data } = await this.supS.Sup.from('generos').select('*').order('nombre');
    return (data ?? []) as Genero[];
  }

  async crear(pelicula: PeliculaPorCrear, generosIds: number[]) {
    const { data, error } = await this.supS.Sup.from('peliculas')
      .insert(pelicula)
      .select()
      .single();
    if (error) {
      return { error };
    }
    const creada = data as Pelicula;
    return { error: await this.guardarGeneros(creada.id, generosIds), id: creada.id };
  }

  async modificar(id: number, cambios: PeliculaPorModificar, generosIds: number[]) {
    const { error } = await this.supS.Sup.from('peliculas').update(cambios).eq('id', id);
    if (error) {
      return { error };
    }
    return { error: await this.guardarGeneros(id, generosIds) };
  }

  async borrar(id: number) {
    const { error } = await this.supS.Sup.from('peliculas').delete().eq('id', id);
    return { error };
  }

  // Reemplaza los géneros: borra los anteriores y vuelve a insertar los elegidos
  private async guardarGeneros(peliculaId: number, generosIds: number[]) {
    await this.supS.Sup.from('pelicula_generos').delete().eq('pelicula_id', peliculaId);
    if (generosIds.length === 0) {
      return null;
    }
    const { error } = await this.supS.Sup.from('pelicula_generos').insert(
      generosIds.map((genero_id) => ({ pelicula_id: peliculaId, genero_id })),
    );
    return error;
  }

  // Cuántas entradas vendidas (activas) tiene cada película. Sirve para "las 3 más vendidas".
  async ventasPorPelicula() {
    const { data } = await this.supS.Sup.from('entradas').select('pelicula_id');
    const ventas = new Map<number, number>();
    for (const e of (data ?? []) as { pelicula_id: number }[]) {
      ventas.set(e.pelicula_id, (ventas.get(e.pelicula_id) ?? 0) + 1);
    }
    return ventas;
  }
}

// ---------- Reglas de negocio de fechas de una película ----------

// Fecha local 'AAAA-MM-DD' de hoy
export function hoyISO() {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
}

function sumarDias(fechaISO: string, dias: number) {
  const [a, m, d] = fechaISO.split('-').map(Number);
  const fecha = new Date(a, m - 1, d + dias);
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
}

// Todavía no se estrenó
export function esProximamente(p: Pelicula) {
  return p.fecha_estreno > hoyISO();
}

// La preventa abre 7 días antes del estreno y solo si la película tiene precio de preventa
export function enPreventa(p: Pelicula) {
  const hoy = hoyISO();
  return p.precio_preventa !== null && hoy >= sumarDias(p.fecha_estreno, -7) && hoy < p.fecha_estreno;
}

// Se pueden comprar entradas: ya se estrenó o está en preventa
export function aLaVenta(p: Pelicula) {
  return !esProximamente(p) || enPreventa(p);
}
