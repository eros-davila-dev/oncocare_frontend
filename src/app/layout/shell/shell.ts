import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { ChatbotWidgetComponent } from '../../features/chatbot/chatbot-widget/chatbot-widget';
import { BrandLogoComponent } from '../../shared/ui/brand-logo/brand-logo';
import { AvatarComponent } from '../../shared/ui/avatar/avatar';
import { IconComponent } from '../../shared/ui/icon/icon';
import type { NombreIcono } from '../../shared/ui/icon/icon-data';
import type { Rol } from '../../core/models/usuario.model';

type IconoNavegacion =
  | 'dashboard'
  | 'agenda'
  | 'consultas'
  | 'preguntas'
  | 'pacientes'
  | 'citas'
  | 'tratamientos'
  | 'auditoria'
  | 'usuarios'
  | 'dispositivos'
  | 'estudio'
  | 'mis-citas'
  | 'mi-perfil';

const ICONO_POR_SECCION: Record<IconoNavegacion, NombreIcono> = {
  dashboard: 'layout-dashboard',
  agenda: 'clock',
  consultas: 'inbox',
  preguntas: 'message-circle',
  pacientes: 'users',
  citas: 'calendar-days',
  tratamientos: 'stethoscope',
  auditoria: 'shield-check',
  usuarios: 'user-cog',
  dispositivos: 'cpu',
  estudio: 'flask-conical',
  'mis-citas': 'calendar-days',
  'mi-perfil': 'user-cog',
};

interface ItemDeNavegacion {
  ruta: string;
  etiqueta: string;
  icono: IconoNavegacion;
  /** Si se define, solo estos roles ven el item (el backend aplica la restriccion real). */
  roles?: Rol[];
}

interface GrupoDeNavegacion {
  titulo: string;
  items: ItemDeNavegacion[];
}

const GRUPOS_DE_NAVEGACION_STAFF: GrupoDeNavegacion[] = [
  {
    titulo: '',
    items: [{ ruta: '/dashboard', etiqueta: 'Dashboard', icono: 'dashboard' }],
  },
  {
    titulo: 'GESTIÓN',
    items: [
      { ruta: '/agenda', etiqueta: 'Agenda del día', icono: 'agenda', roles: ['ADMIN', 'MEDICO', 'RECEPCIONISTA'] },
      { ruta: '/consultas', etiqueta: 'Bandeja de consultas', icono: 'consultas', roles: ['ADMIN', 'MEDICO', 'RECEPCIONISTA'] },
      { ruta: '/pacientes', etiqueta: 'Pacientes', icono: 'pacientes', roles: ['ADMIN', 'MEDICO', 'RECEPCIONISTA'] },
      { ruta: '/citas', etiqueta: 'Citas', icono: 'citas', roles: ['ADMIN', 'MEDICO', 'RECEPCIONISTA'] },
      { ruta: '/tratamientos', etiqueta: 'Tratamientos', icono: 'tratamientos', roles: ['ADMIN', 'MEDICO', 'RECEPCIONISTA'] },
    ],
  },
  {
    titulo: 'INVESTIGACIÓN',
    items: [{ ruta: '/estudio', etiqueta: 'Estudio de tesis', icono: 'estudio', roles: ['ADMIN', 'INVESTIGADOR'] }],
  },
  {
    titulo: 'CONFIGURACIÓN',
    items: [
      { ruta: '/preguntas-frecuentes', etiqueta: 'Preguntas frecuentes', icono: 'preguntas', roles: ['ADMIN', 'RECEPCIONISTA'] },
      { ruta: '/auditoria', etiqueta: 'Auditoría', icono: 'auditoria', roles: ['ADMIN'] },
      { ruta: '/usuarios', etiqueta: 'Usuarios', icono: 'usuarios', roles: ['ADMIN'] },
      { ruta: '/dispositivos', etiqueta: 'Dispositivos', icono: 'dispositivos', roles: ['ADMIN'] },
    ],
  },
];

/** Navegacion del portal de autoservicio de pacientes (seccion 12). */
const GRUPOS_DE_NAVEGACION_PACIENTE: GrupoDeNavegacion[] = [
  {
    titulo: '',
    items: [
      { ruta: '/mis-citas', etiqueta: 'Mis citas', icono: 'mis-citas' },
      { ruta: '/mi-perfil', etiqueta: 'Mi perfil', icono: 'mi-perfil' },
    ],
  },
];

@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    ChatbotWidgetComponent,
    BrandLogoComponent,
    AvatarComponent,
    IconComponent,
  ],
  templateUrl: './shell.html',
})
export class ShellComponent {
  protected readonly authService = inject(AuthService);
  protected readonly themeService = inject(ThemeService);
  private readonly router = inject(Router);

  protected readonly grupos = computed<GrupoDeNavegacion[]>(() =>
    this.authService.tieneAlgunRol('PACIENTE') ? GRUPOS_DE_NAVEGACION_PACIENTE : GRUPOS_DE_NAVEGACION_STAFF,
  );
  protected readonly sidebarAbierto = signal(false);
  protected readonly sidebarColapsado = signal(false);
  protected readonly menuPerfilAbierto = signal(false);

  private readonly urlActual = toSignal(
    this.router.events.pipe(
      filter((evento): evento is NavigationEnd => evento instanceof NavigationEnd),
      map((evento) => evento.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  protected readonly seccionActiva = computed(() => {
    const url = this.urlActual();
    for (const grupo of this.grupos()) {
      const item = grupo.items.find((item) => url.startsWith(item.ruta));
      if (item) {
        return item.etiqueta;
      }
    }
    return 'Inicio';
  });

  protected grupoVisible(grupo: GrupoDeNavegacion): boolean {
    return grupo.items.some((item) => this.itemVisible(item));
  }

  protected itemVisible(item: ItemDeNavegacion): boolean {
    return !item.roles || this.authService.tieneAlgunRol(...item.roles);
  }

  protected esActivo(item: ItemDeNavegacion): boolean {
    return this.urlActual().startsWith(item.ruta);
  }

  protected iconoDe(item: ItemDeNavegacion): NombreIcono {
    return ICONO_POR_SECCION[item.icono];
  }

  protected cerrarSesion(): void {
    this.authService.logout();
  }

  protected alNavegarEnMobile(): void {
    this.sidebarAbierto.set(false);
  }

  protected alternarColapso(): void {
    this.sidebarColapsado.update((valor) => !valor);
  }

  protected alternarMenuPerfil(evento: MouseEvent): void {
    evento.stopPropagation();
    this.menuPerfilAbierto.update((valor) => !valor);
  }

  @HostListener('document:click')
  protected cerrarMenuPerfil(): void {
    this.menuPerfilAbierto.set(false);
  }
}
