import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { BrandLogoComponent } from '../../shared/ui/brand-logo/brand-logo';
import { IconComponent } from '../../shared/ui/icon/icon';
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

  protected cerrarSesion(): void {
    this.authService.logout();
    this.menuAbierto.set(false);
    this.router.navigate(['/']);
  }
}
