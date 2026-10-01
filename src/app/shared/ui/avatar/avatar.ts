import { Component, computed, input } from '@angular/core';

export type TamanoAvatar = 'sm' | 'md' | 'lg';

/**
 * Avatar circular con iniciales. No hay campo de foto en el backend (Usuario
 * ni Paciente lo tienen), asi que esto es deliberadamente cosmetico: no
 * implementa carga de imagen real, solo iniciales sobre un fondo de marca.
 */
@Component({
  selector: 'ui-avatar',
  host: { class: 'inline-flex' },
  template: `
    <div [class]="clases()">
      {{ iniciales() }}
    </div>
  `,
})
export class AvatarComponent {
  nombre = input.required<string>();
  tamano = input<TamanoAvatar>('md');

  private readonly tamanos: Record<TamanoAvatar, string> = {
    sm: 'size-8 text-xs',
    md: 'size-10 text-sm',
    lg: 'size-16 text-lg',
  };

  iniciales = computed(() => {
    const partes = this.nombre().trim().split(/\s+/).filter(Boolean);
    const primeras = partes.slice(0, 2).map((parte) => parte[0]?.toUpperCase() ?? '');
    return primeras.join('') || '?';
  });

  clases(): string {
    return `flex shrink-0 items-center justify-center rounded-full bg-secondary font-bold text-secondary-foreground ${this.tamanos[this.tamano()]}`;
  }
}
