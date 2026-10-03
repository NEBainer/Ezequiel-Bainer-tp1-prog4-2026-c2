export interface Log {
  id: number;
  usuario_id: string | null;
  email: string;
  accion: string;
  detalle: string;
  created_at: string;
}
