import { inject, Service } from '@angular/core';
import { SupabaseService } from './supabase';

@Service()
export class StorageService {
  private supS = inject(SupabaseService);

  /**
   * Sube un póster al bucket "imagenes".
   * @returns la RUTA del archivo (es lo que se guarda en la base) o null si falló
   */
  async subirPoster(file: File): Promise<string | null> {
    // crypto.randomUUID evita el problema de Date.now() (dos archivos con el mismo nombre)
    const ruta = `posters/${crypto.randomUUID()}.${file.type.split('/')[1]}`;
    const { error } = await this.supS.Stg.from('imagenes').upload(ruta, file);

    if (error) {
      return null;
    }
    return ruta;
  }

  // La URL se arma al mostrar; en la base solo está la ruta
  urlPublica(ruta: string) {
    return this.supS.Stg.from('imagenes').getPublicUrl(ruta).data.publicUrl;
  }
}
