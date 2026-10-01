import { Component, computed, input } from '@angular/core';

export type TamanoBrandLogo = 'compacto' | 'normal' | 'grande' | 'hero';

const ALTO_POR_TAMANO: Record<TamanoBrandLogo, string> = {
  compacto: 'h-11',
  normal: 'h-14',
  grande: 'h-20',
  hero: 'h-[36rem]',
};

/**
 * Marca centralizada del producto: logo oficial de OncoCare (`public/logo-oncocare.png`).
 * El archivo ya incluye el icono, el nombre y el lema, asi que este componente
 * solo decide el tamaño segun el contexto; unico lugar a tocar si el logo
 * cambia (login.html, shell.html, etc. no referencian el archivo directamente).
 */
@Component({
  selector: 'ui-brand-logo',
  host: { class: 'inline-flex' },
  template: ` <img src="/logo-oncocare.png" alt="OncoCare" [class]="'w-auto object-contain ' + altoClase()" /> `,
})
export class BrandLogoComponent {
  tamano = input<TamanoBrandLogo>('normal');

  protected readonly altoClase = computed(() => ALTO_POR_TAMANO[this.tamano()]);
}
