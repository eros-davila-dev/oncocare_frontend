import { Component, input } from '@angular/core';
import { ICONOS, type NombreIcono } from './icon-data';

/**
 * Icono inline unico para toda la app, sin dependencia externa. Reemplaza a
 * @lucide/angular: esa libreria (v1.41.0) no anota sus componentes como
 * /* @__PURE__ *\/, asi que el bundler no puede eliminar los iconos no
 * usados y CUALQUIER import arrastraba los ~1800 iconos del paquete
 * completo (~14MB por ruta que tocara un icono). Los datos de path vienen
 * de Lucide (MIT/ISC) pero se usan como simples strings, sin el paquete.
 */
@Component({
  selector: 'ui-icon',
  template: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      [class]="clase()"
      aria-hidden="true"
    >
      @for (nodo of nodos(); track $index) {
        @switch (nodo[0]) {
          @case ('path') {
            <path [attr.d]="nodo[1]['d']" />
          }
          @case ('circle') {
            <circle [attr.cx]="nodo[1]['cx']" [attr.cy]="nodo[1]['cy']" [attr.r]="nodo[1]['r']" />
          }
          @case ('line') {
            <line [attr.x1]="nodo[1]['x1']" [attr.y1]="nodo[1]['y1']" [attr.x2]="nodo[1]['x2']" [attr.y2]="nodo[1]['y2']" />
          }
          @case ('rect') {
            <rect
              [attr.x]="nodo[1]['x']"
              [attr.y]="nodo[1]['y']"
              [attr.width]="nodo[1]['width']"
              [attr.height]="nodo[1]['height']"
              [attr.rx]="nodo[1]['rx']"
            />
          }
          @case ('polyline') {
            <polyline [attr.points]="nodo[1]['points']" />
          }
        }
      }
    </svg>
  `,
})
export class IconComponent {
  name = input.required<NombreIcono>();
  size = input<number>(20);
  clase = input<string>('');

  nodos() {
    return ICONOS[this.name()];
  }
}
