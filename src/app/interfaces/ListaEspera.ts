import { Funcion } from './Funcion';

// esperando -> avisado (tiene el turno de 15 min) -> compro / vencido
export type EstadoEspera = 'esperando' | 'avisado' | 'compro' | 'vencido';

// Fila de "lista_espera"
export interface ListaEspera {
  id: number;
  funcion_id: number;
  usuario_id: string;
  estado: EstadoEspera;
  avisado_at: string | null;
  created_at: string;
  funciones?: Funcion;
}

// Al anotarse solo se manda quién y dónde: el estado lo pone la base ('esperando')
export type ListaEsperaPorCrear = Pick<ListaEspera, 'funcion_id' | 'usuario_id'>;

// Lo que se muestra en el perfil: la fila con su posición en la fila (1 = el próximo)
export interface MiEspera extends ListaEspera {
  posicion: number;
}

export const MINUTOS_TURNO = 15;

// Hasta cuándo dura el turno de alguien que fue avisado
export function venceTurno(espera: ListaEspera): Date | null {
  return espera.avisado_at ? new Date(new Date(espera.avisado_at).getTime() + MINUTOS_TURNO * 60 * 1000) : null;
}

// ¿Tiene el turno ahora? (avisado y dentro de los 15 minutos; lo mismo que pregunta la RLS de "entradas")
export function turnoVigente(espera: ListaEspera): boolean {
  const vence = venceTurno(espera);
  return espera.estado === 'avisado' && vence !== null && vence > new Date();
}
