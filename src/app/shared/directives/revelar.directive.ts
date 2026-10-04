import { Directive, ElementRef, OnDestroy, OnInit, inject, input } from '@angular/core';

/**
 * Aparicion suave al entrar en pantalla con el scroll: el elemento sube y se
 * hace visible una sola vez. Si el usuario pidio menos movimiento
 * (prefers-reduced-motion) o el navegador no soporta IntersectionObserver,
 * se muestra de inmediato (la clase base no oculta nada en ese caso, ver
 * styles.css).
 */
@Directive({
  selector: '[appRevelar]',
  host: { class: 'revelar' },
})
export class RevelarDirective implements OnInit, OnDestroy {
  /** Retraso en ms para escalonar tarjetas de una misma fila. */
  readonly appRevelar = input<number | ''>('');

  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);
  private observador?: IntersectionObserver;

  ngOnInit(): void {
    const el = this.elemento.nativeElement;
    const retraso = this.appRevelar();
    if (typeof retraso === 'number' && retraso > 0) {
      el.style.transitionDelay = `${retraso}ms`;
    }
    if (typeof IntersectionObserver === 'undefined') {
      el.classList.add('revelado');
      return;
    }
    this.observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (entrada.isIntersecting) {
            el.classList.add('revelado');
            this.observador?.disconnect();
          }
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
    );
    this.observador.observe(el);
  }

  ngOnDestroy(): void {
    this.observador?.disconnect();
  }
}
