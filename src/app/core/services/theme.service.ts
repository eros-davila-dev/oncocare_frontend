import { Injectable, effect, signal } from '@angular/core';

export type Tema = 'claro' | 'oscuro';

const THEME_KEY = 'oncologia_tema';

/**
 * Alterna y persiste el tema claro/oscuro (RF-17, seccion 7). Es una mejora
 * de usabilidad para el personal que trabaja en distintos turnos y niveles
 * de iluminacion (recepcion, consultorio), secundaria frente al registro de
 * pacientes, citas y tratamientos.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly temaActual = signal<Tema>(this.temaInicial());

  readonly tema = this.temaActual.asReadonly();

  constructor() {
    effect(() => {
      const esOscuro = this.temaActual() === 'oscuro';
      document.documentElement.classList.toggle('dark', esOscuro);
      localStorage.setItem(THEME_KEY, this.temaActual());
    });
  }

  alternar(): void {
    this.temaActual.set(this.temaActual() === 'oscuro' ? 'claro' : 'oscuro');
  }

  establecer(tema: Tema): void {
    this.temaActual.set(tema);
  }

  private temaInicial(): Tema {
    const guardado = localStorage.getItem(THEME_KEY) as Tema | null;
    if (guardado === 'claro' || guardado === 'oscuro') {
      return guardado;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro';
  }
}
