import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SupabaseService } from '../../services/supabase';
import { PropuestasService } from '../../services/propuestas.service';
import { Propuesta } from '../../interfaces/Propuesta';

// El cliente propone una película que no está en cartelera (una pendiente a la vez)
@Component({
  selector: 'app-proponer',
  imports: [ReactiveFormsModule, DatePipe],
  template: `
    <div class="contenedor">
      <h1>Proponer una película</h1>
      <p class="suave">¿Hay una película que te gustaría ver en Fotograma? Contanos cuál y por qué.</p>

      <div class="columnas">
        @if (tienePendiente()) {
          <div class="panel aviso-pendiente">
            <h2>Ya tenés una propuesta en revisión</h2>
            <p class="suave">Podés proponer una película a la vez. Cuando la respondamos, vas a poder enviar otra.</p>
          </div>
        } @else {
          <form [formGroup]="formulario" (ngSubmit)="enviar()" class="panel">
            <div class="campo">
              <label for="titulo">Título</label>
              <input id="titulo" formControlName="titulo" maxlength="120" />
              @if (titulo?.touched && titulo?.errors?.['required']) {
                <small>El título es requerido</small>
              }
            </div>

            <div class="campo">
              <label for="descripcion">Descripción</label>
              <textarea id="descripcion" formControlName="descripcion" rows="3" maxlength="600"
                placeholder="¿De qué se trata?"></textarea>
              @if (descripcion?.touched && descripcion?.errors?.['required']) {
                <small>La descripción es requerida</small>
              }
            </div>

            <div class="campo">
              <label for="motivo">¿Por qué la querés ver en el cine?</label>
              <textarea id="motivo" formControlName="motivo" rows="3" maxlength="600"></textarea>
              @if (motivo?.touched && motivo?.errors?.['required']) {
                <small>Contanos por qué</small>
              }
            </div>

            @if (error()) {
              <p class="error">{{ error() }}</p>
            }
            <button type="submit" class="btn-primario" [disabled]="enviando()">
              {{ enviando() ? 'Enviando…' : 'Enviar propuesta' }}
            </button>
          </form>
        }

        <section>
          <h2>Tus propuestas</h2>
          @if (exito()) {
            <p class="ok">{{ exito() }}</p>
          }
          @for (p of propuestas(); track p.id) {
            <article class="panel propuesta">
              <div class="cabecera">
                <strong>{{ p.titulo }}</strong>
                <span class="etiqueta" [class]="p.estado">{{ textoEstado[p.estado] }}</span>
              </div>
              <small class="suave">Enviada el {{ p.created_at | date: 'd/M/yy' }}</small>
            </article>
          } @empty {
            <p class="suave">Todavía no propusiste ninguna película.</p>
          }
        </section>
      </div>
    </div>
  `,
  styles: `
    .columnas {
      display: grid;
      grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
      gap: 1.5rem;
      align-items: start;
    }
    .propuesta {
      margin-bottom: 0.6rem;
      padding: 0.8rem 1rem;
    }
    .cabecera {
      display: flex;
      justify-content: space-between;
      gap: 0.5rem;
      align-items: center;
    }
    .etiqueta.aceptada {
      background: var(--acento);
      border-color: var(--acento);
      color: var(--acento-texto);
    }
    .etiqueta.rechazada {
      text-decoration: line-through;
    }
    @media (max-width: 800px) {
      .columnas {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class Proponer implements OnInit {
  private supabaseS = inject(SupabaseService);
  private propuestasS = inject(PropuestasService);

  propuestas = signal<Propuesta[]>([]);
  error = signal<string | null>(null);
  exito = signal<string | null>(null);
  enviando = signal(false);
  private usuarioId = '';

  textoEstado = { pendiente: 'En revisión', aceptada: 'Aceptada', rechazada: 'Rechazada' };

  // Solo UX: la regla real la asegura el índice único de la base
  tienePendiente = computed(() => this.propuestas().some((p) => p.estado === 'pendiente'));

  formulario = new FormGroup({
    titulo: new FormControl('', [Validators.required, Validators.maxLength(120)]),
    descripcion: new FormControl('', [Validators.required, Validators.maxLength(600)]),
    motivo: new FormControl('', [Validators.required, Validators.maxLength(600)]),
  });

  get titulo() {
    return this.formulario.get('titulo');
  }
  get descripcion() {
    return this.formulario.get('descripcion');
  }
  get motivo() {
    return this.formulario.get('motivo');
  }

  async ngOnInit() {
    // Al recargar la página el signal usuarioActual puede no estar cargado todavía
    const { data } = await this.supabaseS.Auth.getSession();
    this.usuarioId = data.session?.user.id ?? '';
    await this.cargar();
  }

  async cargar() {
    this.propuestas.set(await this.propuestasS.traerDeUsuario(this.usuarioId));
  }

  async enviar() {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    this.enviando.set(true);
    this.error.set(null);
    const valores = this.formulario.value;
    const { error } = await this.propuestasS.crear({
      usuario_id: this.usuarioId,
      titulo: valores.titulo!.trim(),
      descripcion: valores.descripcion!.trim(),
      motivo: valores.motivo!.trim(),
    });
    this.enviando.set(false);
    if (error) {
      this.error.set(error);
      return;
    }
    this.formulario.reset();
    this.exito.set('¡Gracias! Recibimos tu propuesta.');
    await this.cargar();
  }
}
