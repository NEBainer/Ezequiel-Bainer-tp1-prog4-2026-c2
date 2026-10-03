import { Directive, ElementRef, inject } from '@angular/core';

// Si una imagen no carga (póster borrado, sin conexión), la oculta para que se vea el fondo
// de respaldo del componente en vez del ícono de imagen rota.
@Directive({
  selector: 'img[appImagenRespaldo]',
  host: {
    '(error)': 'alFallar()',
  },
})
export class ImagenRespaldo {
  private el: ElementRef<HTMLImageElement> = inject(ElementRef);

  alFallar() {
    this.el.nativeElement.style.visibility = 'hidden';
  }
}
