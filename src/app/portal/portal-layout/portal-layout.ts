import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { BrandLogoComponent } from '../../shared/ui/brand-logo/brand-logo';
import { IconComponent } from '../../shared/ui/icon/icon';
import type { NombreIcono } from '../../shared/ui/icon/icon-data';
import { ChatbotWidgetComponent } from '../../features/chatbot/chatbot-widget/chatbot-widget';

/**
 * Marco del portal del paciente. Pensado para adultos mayores y para el
 * celular (la mayoria llega desde el enlace de Telegram): navegacion corta,
 * texto grande, botones amplios y el asistente virtual siempre a mano.
 */
@Component({
  selector: 'app-portal-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, BrandLogoComponent, IconComponent, ChatbotWidgetComponent],
  templateUrl: './portal-layout.html',
})
export class PortalLayoutComponent {
  protected readonly authService = inject(AuthService);
  protected readonly themeService = inject(ThemeService);
  private readonly router = inject(Router);

  protected readonly menuAbierto = signal(false);
  protected readonly anio = new Date().getFullYear();

  protected readonly enlaces = computed<{ ruta: string; etiqueta: string; icono: NombreIcono }[]>(() => [
    { ruta: '/', etiqueta: 'Inicio', icono: 'heart-pulse' },
    { ruta: '/preguntas-frecuentes', etiqueta: 'Preguntas frecuentes', icono: 'message-circle' },
    { ruta: '/recordatorios-telegram', etiqueta: 'Recordatorios', icono: 'bell' },
    ...(this.authService.estaAutenticado()
      ? [
          { ruta: '/mis-citas', etiqueta: 'Mis citas', icono: 'calendar-days' as NombreIcono },
          { ruta: '/mis-consultas', etiqueta: 'Mis consultas', icono: 'message-circle' as NombreIcono },
          { ruta: '/mi-perfil', etiqueta: 'Mi perfil', icono: 'user-cog' as NombreIcono },
        ]
      : []),
  ]);

  /** La portada ocupa todo el ancho (carrusel); el resto va en una columna centrada. */
  protected readonly esPortada = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects.split(/[?#]/)[0] === '/'),
    ),
    { initialValue: this.router.url.split(/[?#]/)[0] === '/' },
  );

  protected cerrarSesion(): void {
    this.authService.logout();
    this.menuAbierto.set(false);
    this.router.navigate(['/']);
  }
}
