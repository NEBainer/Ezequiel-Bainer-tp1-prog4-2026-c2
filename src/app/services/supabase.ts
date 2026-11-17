import { Service } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Service()
export class SupabaseService {
  private sup: SupabaseClient;

  constructor() {
    this.sup = createClient(environment.SUPABASE_URL, environment.SUPABASE_KEY);
  }

  public get Sup() {              //Base de datos, Realtime, Edge Functions
    return this.sup;
  }

  public get Auth() {            // login / registro
    return this.sup.auth;
  }

  public get Stg() {             // archivos
    return this.sup.storage;     
  }
}
